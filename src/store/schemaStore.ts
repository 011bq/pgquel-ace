import { create } from 'zustand';
import type { SchemaInfo, TableInfo, ColumnInfo } from '@/types';

interface SchemaNode {
  schema: SchemaInfo;
  tables?: TableInfo[];
  columns?: Record<string, ColumnInfo[]>;
  tablesLoaded: boolean;
  expanded: boolean;
}

interface SchemaStore {
  schemasByConnection: Record<string, SchemaNode[]>;
  expandedTables: Record<string, Set<string>>;
  loadingSchemas: Set<string>;

  setSchemas: (connectionId: string, schemas: SchemaInfo[]) => void;
  setTables: (connectionId: string, schema: string, tables: TableInfo[]) => void;
  setColumns: (connectionId: string, schema: string, table: string, columns: ColumnInfo[]) => void;
  toggleSchema: (connectionId: string, schema: string) => void;
  toggleTable: (connectionId: string, schema: string, table: string) => void;
  setLoading: (connectionId: string, loading: boolean) => void;
  clearConnection: (connectionId: string) => void;
}

export const useSchemaStore = create<SchemaStore>((set) => ({
  schemasByConnection: {},
  expandedTables: {},
  loadingSchemas: new Set(),

  setSchemas: (connectionId, schemas) =>
    set((state) => ({
      schemasByConnection: {
        ...state.schemasByConnection,
        [connectionId]: schemas.map((s) => ({
          schema: s,
          tablesLoaded: false,
          expanded: false,
        })),
      },
    })),

  setTables: (connectionId, schema, tables) =>
    set((state) => ({
      schemasByConnection: {
        ...state.schemasByConnection,
        [connectionId]: (state.schemasByConnection[connectionId] ?? []).map((node) =>
          node.schema.name === schema
            ? { ...node, tables, tablesLoaded: true }
            : node
        ),
      },
    })),

  setColumns: (connectionId, schema, table, columns) =>
    set((state) => {
      const nodes = state.schemasByConnection[connectionId] ?? [];
      return {
        schemasByConnection: {
          ...state.schemasByConnection,
          [connectionId]: nodes.map((node) =>
            node.schema.name === schema
              ? {
                  ...node,
                  columns: { ...(node.columns ?? {}), [table]: columns },
                }
              : node
          ),
        },
      };
    }),

  toggleSchema: (connectionId, schema) =>
    set((state) => ({
      schemasByConnection: {
        ...state.schemasByConnection,
        [connectionId]: (state.schemasByConnection[connectionId] ?? []).map((node) =>
          node.schema.name === schema ? { ...node, expanded: !node.expanded } : node
        ),
      },
    })),

  toggleTable: (connectionId, schema, table) =>
    set((state) => {
      const key = `${connectionId}:${schema}`;
      const current = state.expandedTables[key] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(table)) {
        next.delete(table);
      } else {
        next.add(table);
      }
      return { expandedTables: { ...state.expandedTables, [key]: next } };
    }),

  setLoading: (connectionId, loading) =>
    set((state) => {
      const next = new Set(state.loadingSchemas);
      loading ? next.add(connectionId) : next.delete(connectionId);
      return { loadingSchemas: next };
    }),

  clearConnection: (connectionId) =>
    set((state) => {
      const { [connectionId]: _, ...rest } = state.schemasByConnection;
      return { schemasByConnection: rest };
    }),
}));
