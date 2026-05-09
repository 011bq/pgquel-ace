import { invoke } from '@tauri-apps/api/core';
import type {
  ConnectionConfig,
  ConnectionStatus,
  QueryResult,
  SavedConnection,
  SavedQuery,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ForeignKeyInfo,
  QueryHistoryEntry,
} from '@/types';

// ── Connection Commands ───────────────────────────────────────────────────────

export const testConnection = (config: ConnectionConfig): Promise<ConnectionStatus> =>
  invoke('test_connection', { config });

export const openConnection = (config: ConnectionConfig): Promise<string> =>
  invoke('open_connection', { config });

export const closeConnection = (connectionId: string): Promise<void> =>
  invoke('close_connection', { connectionId });

export const saveCredentials = (
  username: string,
  password: string,
  connectionId: string
): Promise<void> => invoke('save_credentials', { username, password, connectionId });

export const deleteCredentials = (username: string, connectionId: string): Promise<void> =>
  invoke('delete_credentials', { username, connectionId });

export const getActiveConnections = (): Promise<string[]> =>
  invoke('get_active_connections');

// ── Query Commands ────────────────────────────────────────────────────────────

export const executeQuery = (connectionId: string, query: string): Promise<QueryResult> =>
  invoke('execute_query', { connectionId, query });

export const executeMultipleQueries = (
  connectionId: string,
  queries: string[]
): Promise<QueryResult[]> => invoke('execute_multiple_queries', { connectionId, queries });

export const exportQueryCsv = (connectionId: string, query: string): Promise<string> =>
  invoke('export_query_csv', { connectionId, query });

// ── Schema Commands ───────────────────────────────────────────────────────────

export const getSchemas = (connectionId: string): Promise<SchemaInfo[]> =>
  invoke('get_schemas', { connectionId });

export const getTables = (connectionId: string, schema: string): Promise<TableInfo[]> =>
  invoke('get_tables', { connectionId, schema });

export const getColumns = (
  connectionId: string,
  schema: string,
  table: string
): Promise<ColumnInfo[]> => invoke('get_columns', { connectionId, schema, table });

export const getIndexes = (
  connectionId: string,
  schema: string,
  table: string
): Promise<IndexInfo[]> => invoke('get_indexes', { connectionId, schema, table });

export const getForeignKeys = (
  connectionId: string,
  schema: string,
  table: string
): Promise<ForeignKeyInfo[]> => invoke('get_foreign_keys', { connectionId, schema, table });

export const getTablePreview = (
  connectionId: string,
  schema: string,
  table: string,
  limit?: number
): Promise<QueryResult> => invoke('get_table_preview', { connectionId, schema, table, limit });

// ── Storage Commands ──────────────────────────────────────────────────────────

export const listSavedConnections = (): Promise<SavedConnection[]> =>
  invoke('list_saved_connections');

export const saveConnection = (connection: SavedConnection): Promise<void> =>
  invoke('save_connection', { connection });

export const deleteSavedConnection = (connectionId: string): Promise<void> =>
  invoke('delete_saved_connection', { connectionId });

export const toggleFavorite = (connectionId: string): Promise<boolean> =>
  invoke('toggle_favorite', { connectionId });

export const updateLastUsed = (connectionId: string): Promise<void> =>
  invoke('update_last_used', { connectionId });

export const listSavedQueries = (connectionId?: string): Promise<SavedQuery[]> =>
  invoke('list_saved_queries', { connectionId });

export const saveQuery = (query: SavedQuery): Promise<void> =>
  invoke('save_query', { query });

export const deleteSavedQuery = (queryId: string): Promise<void> =>
  invoke('delete_saved_query', { queryId });

export const addHistory = (entry: QueryHistoryEntry): Promise<void> =>
  invoke('add_history', { entry });

export const getHistory = (connectionId?: string, limit?: number): Promise<QueryHistoryEntry[]> =>
  invoke('get_history', { connectionId, limit });

export const getPreference = (key: string): Promise<string | null> =>
  invoke('get_preference', { key });

export const setPreference = (key: string, value: string): Promise<void> =>
  invoke('set_preference', { key, value });
