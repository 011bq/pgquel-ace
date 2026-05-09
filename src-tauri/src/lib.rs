mod commands;
mod error;

use commands::{connection::*, query::*, schema::*, storage::*};
use rusqlite::Connection;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

pub struct AppState {
    pub pools: Arc<Mutex<HashMap<String, PgPool>>>,
    pub db: Arc<Mutex<Connection>>,
}

fn get_db_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("Failed to get app data dir")
        .join("pgquel.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let db_path = get_db_path(app.handle());
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let conn = Connection::open(&db_path)
                .expect("Failed to open SQLite database");
            init_db(&conn).expect("Failed to initialize database schema");

            let state = AppState {
                pools: Arc::new(Mutex::new(HashMap::new())),
                db: Arc::new(Mutex::new(conn)),
            };
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Connection commands
            test_connection,
            open_connection,
            close_connection,
            save_credentials,
            delete_credentials,
            get_active_connections,
            // Query commands
            execute_query,
            execute_multiple_queries,
            export_query_csv,
            // Schema commands
            get_schemas,
            get_tables,
            get_columns,
            get_indexes,
            get_foreign_keys,
            get_table_preview,
            // Storage commands
            list_saved_connections,
            save_connection,
            delete_saved_connection,
            toggle_favorite,
            update_last_used,
            list_saved_queries,
            save_query,
            delete_saved_query,
            add_history,
            get_history,
            get_preference,
            set_preference,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
