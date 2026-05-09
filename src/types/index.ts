// ── Connection Types ──────────────────────────────────────────────────────────

export interface ConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  database?: string;
  username: string;
  password?: string;
  ssl: boolean;
  group?: string;
  color?: string;
}

export interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database?: string;
  username: string;
  ssl: boolean;
  group?: string;
  color?: string;
  isFavorite: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  version?: string;
  latencyMs?: number;
}

// ── Query Types ───────────────────────────────────────────────────────────────

export interface QueryColumn {
  name: string;
  typeName: string;
}

export type CellValue = string | number | boolean | null | object;

export interface QueryResult {
  columns: QueryColumn[];
  rows: CellValue[][];
  rowCount: number;
  executionTimeMs: number;
  affectedRows?: number;
  error?: string;
  statementType: string;
}

export interface QueryHistoryEntry {
  id: string;
  connectionId: string;
  query: string;
  executionTimeMs: number;
  rowCount: number;
  hadError: boolean;
  errorMessage?: string;
  executedAt: string;
}

export interface SavedQuery {
  id: string;
  connectionId?: string;
  name: string;
  query: string;
  createdAt: string;
  updatedAt: string;
}

// ── Schema Types ──────────────────────────────────────────────────────────────

export interface SchemaInfo {
  name: string;
  owner: string;
}

export interface TableInfo {
  schema: string;
  name: string;
  tableType: string;
  rowEstimate?: number;
  size?: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string;
  isPrimaryKey: boolean;
  ordinalPosition: number;
}

export interface IndexInfo {
  name: string;
  columns: string;
  isUnique: boolean;
  isPrimary: boolean;
}

export interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  foreignTable: string;
  foreignColumn: string;
}

export interface SchemaTreeNode {
  type: 'schema' | 'table' | 'view' | 'column';
  name: string;
  schema?: string;
  children?: SchemaTreeNode[];
  expanded?: boolean;
  loading?: boolean;
  metadata?: TableInfo | ColumnInfo;
}

// ── Editor Types ──────────────────────────────────────────────────────────────

export interface EditorTab {
  id: string;
  title: string;
  query: string;
  connectionId?: string;
  result?: QueryResult;
  isRunning: boolean;
  isDirty: boolean;
  savedQueryId?: string;
}

// ── UI Types ──────────────────────────────────────────────────────────────────

export type PanelView = 'connections' | 'schema' | 'history' | 'saved';

export interface LogEntry {
  id: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  detail?: string;
  timestamp: string;
}
