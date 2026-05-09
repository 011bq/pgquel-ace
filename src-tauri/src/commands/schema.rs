use crate::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SchemaInfo {
    pub name: String,
    pub owner: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableInfo {
    pub schema: String,
    pub name: String,
    pub table_type: String,
    pub row_estimate: Option<i64>,
    pub size: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub column_default: Option<String>,
    pub is_primary_key: bool,
    pub ordinal_position: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndexInfo {
    pub name: String,
    pub columns: String,
    pub is_unique: bool,
    pub is_primary: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ForeignKeyInfo {
    pub constraint_name: String,
    pub column_name: String,
    pub foreign_table: String,
    pub foreign_column: String,
}

#[tauri::command]
pub async fn get_schemas(
    state: State<'_, AppState>,
    connection_id: String,
) -> std::result::Result<Vec<SchemaInfo>, String> {
    let pools = state.pools.lock().await;
    let pool = pools
        .get(&connection_id)
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let rows = sqlx::query(
        "SELECT schema_name, schema_owner FROM information_schema.schemata
         WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
         ORDER BY schema_name",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| SchemaInfo {
            name: r.get::<String, _>("schema_name"),
            owner: r.get::<String, _>("schema_owner"),
        })
        .collect())
}

#[tauri::command]
pub async fn get_tables(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> std::result::Result<Vec<TableInfo>, String> {
    let pools = state.pools.lock().await;
    let pool = pools
        .get(&connection_id)
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let rows = sqlx::query(
        "SELECT
            t.table_schema,
            t.table_name,
            t.table_type,
            c.reltuples::bigint AS row_estimate,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS size
         FROM information_schema.tables t
         LEFT JOIN pg_class c ON c.relname = t.table_name
         LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
         WHERE t.table_schema = $1
         ORDER BY t.table_type, t.table_name",
    )
    .bind(&schema)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| TableInfo {
            schema: r.get::<String, _>("table_schema"),
            name: r.get::<String, _>("table_name"),
            table_type: r.get::<String, _>("table_type"),
            row_estimate: r.try_get("row_estimate").ok(),
            size: r.try_get("size").ok(),
        })
        .collect())
}

#[tauri::command]
pub async fn get_columns(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
) -> std::result::Result<Vec<ColumnInfo>, String> {
    let pools = state.pools.lock().await;
    let pool = pools
        .get(&connection_id)
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let rows = sqlx::query(
        "SELECT
            c.column_name,
            c.data_type,
            c.is_nullable = 'YES' AS is_nullable,
            c.column_default,
            c.ordinal_position,
            EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = c.table_schema
                    AND tc.table_name = c.table_name
                    AND kcu.column_name = c.column_name
            ) AS is_primary_key
         FROM information_schema.columns c
         WHERE c.table_schema = $1 AND c.table_name = $2
         ORDER BY c.ordinal_position",
    )
    .bind(&schema)
    .bind(&table)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| ColumnInfo {
            name: r.get::<String, _>("column_name"),
            data_type: r.get::<String, _>("data_type"),
            is_nullable: r.get::<bool, _>("is_nullable"),
            column_default: r.try_get("column_default").ok(),
            is_primary_key: r.get::<bool, _>("is_primary_key"),
            ordinal_position: r.get::<i32, _>("ordinal_position"),
        })
        .collect())
}

#[tauri::command]
pub async fn get_indexes(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
) -> std::result::Result<Vec<IndexInfo>, String> {
    let pools = state.pools.lock().await;
    let pool = pools
        .get(&connection_id)
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let rows = sqlx::query(
        "SELECT
            i.relname AS index_name,
            array_to_string(array_agg(a.attname ORDER BY k.n), ', ') AS columns,
            ix.indisunique AS is_unique,
            ix.indisprimary AS is_primary
         FROM pg_class t
         JOIN pg_index ix ON t.oid = ix.indrelid
         JOIN pg_class i ON i.oid = ix.indexrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
         JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n) ON true
         JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
         WHERE n.nspname = $1 AND t.relname = $2
         GROUP BY i.relname, ix.indisunique, ix.indisprimary
         ORDER BY i.relname",
    )
    .bind(&schema)
    .bind(&table)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| IndexInfo {
            name: r.get::<String, _>("index_name"),
            columns: r.get::<String, _>("columns"),
            is_unique: r.get::<bool, _>("is_unique"),
            is_primary: r.get::<bool, _>("is_primary"),
        })
        .collect())
}

#[tauri::command]
pub async fn get_foreign_keys(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
) -> std::result::Result<Vec<ForeignKeyInfo>, String> {
    let pools = state.pools.lock().await;
    let pool = pools
        .get(&connection_id)
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let rows = sqlx::query(
        "SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table,
            ccu.column_name AS foreign_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
             ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
             AND tc.table_schema = $1 AND tc.table_name = $2",
    )
    .bind(&schema)
    .bind(&table)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .iter()
        .map(|r| ForeignKeyInfo {
            constraint_name: r.get::<String, _>("constraint_name"),
            column_name: r.get::<String, _>("column_name"),
            foreign_table: r.get::<String, _>("foreign_table"),
            foreign_column: r.get::<String, _>("foreign_column"),
        })
        .collect())
}

#[tauri::command]
pub async fn get_table_preview(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
    limit: Option<i32>,
) -> std::result::Result<crate::commands::query::QueryResult, String> {
    let limit = limit.unwrap_or(100);
    let query = format!(
        "SELECT * FROM {}.{} LIMIT {}",
        quote_ident(&schema),
        quote_ident(&table),
        limit
    );
    crate::commands::query::execute_query(state, connection_id, query).await
}

fn quote_ident(s: &str) -> String {
    format!("\"{}\"", s.replace('"', "\"\""))
}
