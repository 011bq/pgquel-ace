use crate::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{Column, Row, TypeInfo};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QueryColumn {
    pub name: String,
    pub type_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<QueryColumn>,
    pub rows: Vec<Vec<Value>>,
    pub row_count: usize,
    pub execution_time_ms: u64,
    pub affected_rows: Option<u64>,
    pub error: Option<String>,
    pub statement_type: String,
}

fn detect_statement_type(query: &str) -> String {
    let trimmed = query.trim().to_uppercase();
    if trimmed.starts_with("SELECT") || trimmed.starts_with("WITH") || trimmed.starts_with("TABLE") {
        "SELECT".to_string()
    } else if trimmed.starts_with("INSERT") {
        "INSERT".to_string()
    } else if trimmed.starts_with("UPDATE") {
        "UPDATE".to_string()
    } else if trimmed.starts_with("DELETE") {
        "DELETE".to_string()
    } else if trimmed.starts_with("CREATE") {
        "CREATE".to_string()
    } else if trimmed.starts_with("ALTER") {
        "ALTER".to_string()
    } else if trimmed.starts_with("DROP") {
        "DROP".to_string()
    } else if trimmed.starts_with("EXPLAIN") {
        "EXPLAIN".to_string()
    } else {
        "OTHER".to_string()
    }
}

fn pg_value_to_json(row: &sqlx::postgres::PgRow, idx: usize) -> Value {
    // Try common types in order
    if let Ok(v) = row.try_get::<Option<String>, _>(idx) {
        return v.map(Value::String).unwrap_or(Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<i64>, _>(idx) {
        return v.map(|n| Value::Number(n.into())).unwrap_or(Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<i32>, _>(idx) {
        return v.map(|n| Value::Number(n.into())).unwrap_or(Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<f64>, _>(idx) {
        return v
            .and_then(|n| serde_json::Number::from_f64(n).map(Value::Number))
            .unwrap_or(Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<bool>, _>(idx) {
        return v.map(Value::Bool).unwrap_or(Value::Null);
    }
    if let Ok(v) = row.try_get::<Option<Value>, _>(idx) {
        return v.unwrap_or(Value::Null);
    }
    // Fallback: raw string decode
    Value::String("<binary>".to_string())
}

#[tauri::command]
pub async fn execute_query(
    state: State<'_, AppState>,
    connection_id: String,
    query: String,
) -> std::result::Result<QueryResult, String> {
    let pools = state.pools.lock().await;
    let pool = pools
        .get(&connection_id)
        .ok_or_else(|| format!("Connection not found: {}", connection_id))?;

    let stmt_type = detect_statement_type(&query);
    let start = std::time::Instant::now();

    if stmt_type == "SELECT" || stmt_type == "EXPLAIN" {
        match sqlx::query(&query).fetch_all(pool).await {
            Ok(rows) => {
                let elapsed = start.elapsed().as_millis() as u64;
                let columns: Vec<QueryColumn> = if let Some(first) = rows.first() {
                    first
                        .columns()
                        .iter()
                        .map(|c| QueryColumn {
                            name: c.name().to_string(),
                            type_name: c.type_info().name().to_string(),
                        })
                        .collect()
                } else {
                    vec![]
                };

                let result_rows: Vec<Vec<Value>> = rows
                    .iter()
                    .map(|row| {
                        (0..row.len())
                            .map(|i| pg_value_to_json(row, i))
                            .collect()
                    })
                    .collect();

                let row_count = result_rows.len();
                Ok(QueryResult {
                    columns,
                    rows: result_rows,
                    row_count,
                    execution_time_ms: elapsed,
                    affected_rows: None,
                    error: None,
                    statement_type: stmt_type,
                })
            }
            Err(e) => {
                let elapsed = start.elapsed().as_millis() as u64;
                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    execution_time_ms: elapsed,
                    affected_rows: None,
                    error: Some(e.to_string()),
                    statement_type: stmt_type,
                })
            }
        }
    } else {
        match sqlx::query(&query).execute(pool).await {
            Ok(result) => {
                let elapsed = start.elapsed().as_millis() as u64;
                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    execution_time_ms: elapsed,
                    affected_rows: Some(result.rows_affected()),
                    error: None,
                    statement_type: stmt_type,
                })
            }
            Err(e) => {
                let elapsed = start.elapsed().as_millis() as u64;
                Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    execution_time_ms: elapsed,
                    affected_rows: None,
                    error: Some(e.to_string()),
                    statement_type: stmt_type,
                })
            }
        }
    }
}

#[tauri::command]
pub async fn execute_multiple_queries(
    state: State<'_, AppState>,
    connection_id: String,
    queries: Vec<String>,
) -> std::result::Result<Vec<QueryResult>, String> {
    let mut results = Vec::new();
    for query in queries {
        let result = execute_query(state.clone(), connection_id.clone(), query).await?;
        results.push(result);
    }
    Ok(results)
}

#[tauri::command]
pub async fn export_query_csv(
    state: State<'_, AppState>,
    connection_id: String,
    query: String,
) -> std::result::Result<String, String> {
    let result = execute_query(state, connection_id, query).await?;
    let mut csv = String::new();

    // Header
    let headers: Vec<String> = result.columns.iter().map(|c| c.name.clone()).collect();
    csv.push_str(&headers.join(","));
    csv.push('\n');

    // Rows
    for row in &result.rows {
        let values: Vec<String> = row
            .iter()
            .map(|v| match v {
                Value::String(s) => format!("\"{}\"", s.replace('"', "\"\"")),
                Value::Null => String::new(),
                other => other.to_string(),
            })
            .collect();
        csv.push_str(&values.join(","));
        csv.push('\n');
    }

    Ok(csv)
}
