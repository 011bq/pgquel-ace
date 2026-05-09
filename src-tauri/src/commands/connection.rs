use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: Option<String>,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: Option<String>,
    pub username: String,
    pub password: Option<String>,
    pub ssl: bool,
    pub group: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatus {
    pub connected: bool,
    pub version: Option<String>,
    pub latency_ms: Option<u64>,
}

fn build_connection_string(config: &ConnectionConfig, password: &str) -> String {
    let ssl_mode = if config.ssl { "require" } else { "disable" };
    let db = config.database.as_deref().unwrap_or(&config.username);
    format!(
        "postgresql://{}:{}@{}:{}/{}?sslmode={}",
        config.username,
        urlencoding::encode(password),
        config.host,
        config.port,
        db,
        ssl_mode
    )
}

fn keyring_service(connection_id: &str) -> String {
    format!("pgquel:{}", connection_id)
}

#[tauri::command]
pub async fn test_connection(
    config: ConnectionConfig,
) -> std::result::Result<ConnectionStatus, String> {
    let password = config.password.as_deref().unwrap_or("");
    let conn_str = build_connection_string(&config, password);
    let start = std::time::Instant::now();

    let pool = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        PgPoolOptions::new().max_connections(1).connect(&conn_str),
    )
    .await
    .map_err(|_| "Connection timed out after 10s".to_string())?
    .map_err(|e| format!("Connection failed: {}", e))?;

    let version: (String,) = sqlx::query_as("SELECT version()")
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;
    let latency = start.elapsed().as_millis() as u64;
    pool.close().await;

    Ok(ConnectionStatus {
        connected: true,
        version: Some(version.0),
        latency_ms: Some(latency),
    })
}

#[tauri::command]
pub async fn open_connection(
    state: State<'_, AppState>,
    config: ConnectionConfig,
) -> std::result::Result<String, String> {
    let connection_id = config.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());

    let password = match config.password.as_deref() {
        Some(pw) if !pw.is_empty() => pw.to_string(),
        _ => {
            keyring::Entry::new(&keyring_service(&connection_id), &config.username)
                .ok()
                .and_then(|e| e.get_password().ok())
                .unwrap_or_default()
        }
    };

    let conn_str = build_connection_string(&config, &password);
    let pool = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        PgPoolOptions::new().max_connections(10).connect(&conn_str),
    )
    .await
    .map_err(|_| "Connection timed out after 30s".to_string())?
    .map_err(|e| format!("Failed to connect: {}", e))?;

    let mut pools = state.pools.lock().await;
    pools.insert(connection_id.clone(), pool);

    Ok(connection_id)
}

#[tauri::command]
pub async fn close_connection(
    state: State<'_, AppState>,
    connection_id: String,
) -> std::result::Result<(), String> {
    let mut pools = state.pools.lock().await;
    if let Some(pool) = pools.remove(&connection_id) {
        pool.close().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn save_credentials(
    username: String,
    password: String,
    connection_id: String,
) -> std::result::Result<(), String> {
    let entry = keyring::Entry::new(&keyring_service(&connection_id), &username)
        .map_err(|e| e.to_string())?;
    entry.set_password(&password).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_credentials(
    username: String,
    connection_id: String,
) -> std::result::Result<(), String> {
    let entry = keyring::Entry::new(&keyring_service(&connection_id), &username)
        .map_err(|e| e.to_string())?;
    let _ = entry.delete_credential();
    Ok(())
}

#[tauri::command]
pub async fn get_active_connections(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<String>, String> {
    let pools = state.pools.lock().await;
    Ok(pools.keys().cloned().collect())
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        let mut encoded = String::new();
        for c in s.chars() {
            match c {
                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => encoded.push(c),
                _ => {
                    for byte in c.to_string().as_bytes() {
                        encoded.push_str(&format!("%{:02X}", byte));
                    }
                }
            }
        }
        encoded
    }
}
