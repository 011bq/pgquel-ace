use crate::AppState;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub ssl: bool,
    pub group: Option<String>,
    pub color: Option<String>,
    pub is_favorite: bool,
    pub created_at: String,
    pub last_used_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub connection_id: Option<String>,
    pub name: String,
    pub query: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QueryHistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub query: String,
    pub execution_time_ms: i64,
    pub row_count: i64,
    pub had_error: bool,
    pub error_message: Option<String>,
    pub executed_at: String,
}

pub fn init_db(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA foreign_keys=ON;

         CREATE TABLE IF NOT EXISTS connections (
             id TEXT PRIMARY KEY,
             name TEXT NOT NULL,
             host TEXT NOT NULL,
             port INTEGER NOT NULL DEFAULT 5432,
             database TEXT NOT NULL,
             username TEXT NOT NULL,
             ssl INTEGER NOT NULL DEFAULT 0,
             conn_group TEXT,
             color TEXT,
             is_favorite INTEGER NOT NULL DEFAULT 0,
             created_at TEXT NOT NULL DEFAULT (datetime('now')),
             last_used_at TEXT
         );

         CREATE TABLE IF NOT EXISTS saved_queries (
             id TEXT PRIMARY KEY,
             connection_id TEXT,
             name TEXT NOT NULL,
             query TEXT NOT NULL,
             created_at TEXT NOT NULL DEFAULT (datetime('now')),
             updated_at TEXT NOT NULL DEFAULT (datetime('now'))
         );

         CREATE TABLE IF NOT EXISTS query_history (
             id TEXT PRIMARY KEY,
             connection_id TEXT NOT NULL,
             query TEXT NOT NULL,
             execution_time_ms INTEGER NOT NULL DEFAULT 0,
             row_count INTEGER NOT NULL DEFAULT 0,
             had_error INTEGER NOT NULL DEFAULT 0,
             error_message TEXT,
             executed_at TEXT NOT NULL DEFAULT (datetime('now'))
         );

         CREATE TABLE IF NOT EXISTS app_preferences (
             key TEXT PRIMARY KEY,
             value TEXT NOT NULL
         );

         CREATE INDEX IF NOT EXISTS idx_history_connection ON query_history(connection_id);
         CREATE INDEX IF NOT EXISTS idx_history_executed ON query_history(executed_at DESC);
        ",
    )
}

// ── Connections ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_saved_connections(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<SavedConnection>, String> {
    let db = state.db.lock().await;
    let mut stmt = db
        .prepare(
            "SELECT id, name, host, port, database, username, ssl, conn_group, color,
                    is_favorite, created_at, last_used_at
             FROM connections ORDER BY is_favorite DESC, last_used_at DESC NULLS LAST, name",
        )
        .map_err(|e| e.to_string())?;

    let conns = stmt
        .query_map([], |row| {
            Ok(SavedConnection {
                id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                port: row.get::<_, i32>(3)? as u16,
                database: row.get(4)?,
                username: row.get(5)?,
                ssl: row.get::<_, bool>(6)?,
                group: row.get(7)?,
                color: row.get(8)?,
                is_favorite: row.get::<_, bool>(9)?,
                created_at: row.get(10)?,
                last_used_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    Ok(conns)
}

#[tauri::command]
pub async fn save_connection(
    state: State<'_, AppState>,
    connection: SavedConnection,
) -> std::result::Result<(), String> {
    let db = state.db.lock().await;
    db.execute(
        "INSERT OR REPLACE INTO connections
         (id, name, host, port, database, username, ssl, conn_group, color, is_favorite, created_at, last_used_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            connection.id,
            connection.name,
            connection.host,
            connection.port as i32,
            connection.database,
            connection.username,
            connection.ssl,
            connection.group,
            connection.color,
            connection.is_favorite,
            connection.created_at,
            connection.last_used_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_saved_connection(
    state: State<'_, AppState>,
    connection_id: String,
) -> std::result::Result<(), String> {
    let db = state.db.lock().await;
    db.execute(
        "DELETE FROM connections WHERE id = ?1",
        params![connection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_favorite(
    state: State<'_, AppState>,
    connection_id: String,
) -> std::result::Result<bool, String> {
    let db = state.db.lock().await;
    db.execute(
        "UPDATE connections SET is_favorite = NOT is_favorite WHERE id = ?1",
        params![connection_id],
    )
    .map_err(|e| e.to_string())?;
    let new_val: bool = db
        .query_row(
            "SELECT is_favorite FROM connections WHERE id = ?1",
            params![connection_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(new_val)
}

#[tauri::command]
pub async fn update_last_used(
    state: State<'_, AppState>,
    connection_id: String,
) -> std::result::Result<(), String> {
    let db = state.db.lock().await;
    db.execute(
        "UPDATE connections SET last_used_at = datetime('now') WHERE id = ?1",
        params![connection_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Saved Queries ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_saved_queries(
    state: State<'_, AppState>,
    connection_id: Option<String>,
) -> std::result::Result<Vec<SavedQuery>, String> {
    let db = state.db.lock().await;
    let mut results: Vec<SavedQuery> = Vec::new();

    if let Some(conn_id) = connection_id {
        let mut stmt = db
            .prepare(
                "SELECT id, connection_id, name, query, created_at, updated_at
                 FROM saved_queries WHERE connection_id = ?1 ORDER BY name",
            )
            .map_err(|e| e.to_string())?;
        for row in stmt.query_map(params![conn_id], |r| Ok(SavedQuery {
            id: r.get(0)?,
            connection_id: r.get(1)?,
            name: r.get(2)?,
            query: r.get(3)?,
            created_at: r.get(4)?,
            updated_at: r.get(5)?,
        })).map_err(|e| e.to_string())? {
            results.push(row.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = db
            .prepare(
                "SELECT id, connection_id, name, query, created_at, updated_at
                 FROM saved_queries ORDER BY updated_at DESC",
            )
            .map_err(|e| e.to_string())?;
        for row in stmt.query_map([], |r| Ok(SavedQuery {
            id: r.get(0)?,
            connection_id: r.get(1)?,
            name: r.get(2)?,
            query: r.get(3)?,
            created_at: r.get(4)?,
            updated_at: r.get(5)?,
        })).map_err(|e| e.to_string())? {
            results.push(row.map_err(|e| e.to_string())?);
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn save_query(
    state: State<'_, AppState>,
    query: SavedQuery,
) -> std::result::Result<(), String> {
    let db = state.db.lock().await;
    db.execute(
        "INSERT OR REPLACE INTO saved_queries (id, connection_id, name, query, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))",
        params![query.id, query.connection_id, query.name, query.query, query.created_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_saved_query(
    state: State<'_, AppState>,
    query_id: String,
) -> std::result::Result<(), String> {
    let db = state.db.lock().await;
    db.execute("DELETE FROM saved_queries WHERE id = ?1", params![query_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Query History ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn add_history(
    state: State<'_, AppState>,
    entry: QueryHistoryEntry,
) -> std::result::Result<(), String> {
    let db = state.db.lock().await;
    db.execute(
        "INSERT INTO query_history
         (id, connection_id, query, execution_time_ms, row_count, had_error, error_message, executed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))",
        params![
            entry.id,
            entry.connection_id,
            entry.query,
            entry.execution_time_ms,
            entry.row_count,
            entry.had_error,
            entry.error_message,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Keep history to last 1000 entries
    db.execute(
        "DELETE FROM query_history WHERE id NOT IN (
             SELECT id FROM query_history ORDER BY executed_at DESC LIMIT 1000
         )",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_history(
    state: State<'_, AppState>,
    connection_id: Option<String>,
    limit: Option<i32>,
) -> std::result::Result<Vec<QueryHistoryEntry>, String> {
    let db = state.db.lock().await;
    let limit = limit.unwrap_or(100);
    let mut results: Vec<QueryHistoryEntry> = Vec::new();

    let row_mapper = |r: &rusqlite::Row| {
        Ok(QueryHistoryEntry {
            id: r.get(0)?,
            connection_id: r.get(1)?,
            query: r.get(2)?,
            execution_time_ms: r.get(3)?,
            row_count: r.get(4)?,
            had_error: r.get::<_, bool>(5)?,
            error_message: r.get(6)?,
            executed_at: r.get(7)?,
        })
    };

    if let Some(conn_id) = connection_id {
        let mut stmt = db
            .prepare(
                "SELECT id, connection_id, query, execution_time_ms, row_count, had_error, error_message, executed_at
                 FROM query_history WHERE connection_id = ?1
                 ORDER BY executed_at DESC LIMIT ?2",
            )
            .map_err(|e| e.to_string())?;
        for row in stmt.query_map(params![conn_id, limit], row_mapper).map_err(|e| e.to_string())? {
            results.push(row.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = db
            .prepare(
                "SELECT id, connection_id, query, execution_time_ms, row_count, had_error, error_message, executed_at
                 FROM query_history ORDER BY executed_at DESC LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;
        for row in stmt.query_map(params![limit], row_mapper).map_err(|e| e.to_string())? {
            results.push(row.map_err(|e| e.to_string())?);
        }
    }

    Ok(results)
}

// ── Preferences ───────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_preference(
    state: State<'_, AppState>,
    key: String,
) -> std::result::Result<Option<String>, String> {
    let db = state.db.lock().await;
    let result: Option<String> = db
        .query_row(
            "SELECT value FROM app_preferences WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub async fn set_preference(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> std::result::Result<(), String> {
    let db = state.db.lock().await;
    db.execute(
        "INSERT OR REPLACE INTO app_preferences (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
