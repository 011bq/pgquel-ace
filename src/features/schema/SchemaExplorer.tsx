import React, { useCallback } from 'react';
import {
  ChevronRight,
  Table2,
  Layers,
  Key,
  Columns,
  Loader2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionStore } from '@/store/connectionStore';
import { useSchemaStore } from '@/store/schemaStore';
import { useEditorStore } from '@/store/editorStore';
import { useUIStore } from '@/store/uiStore';
import * as commands from '@/tauri/commands';
import type { TableInfo, ColumnInfo } from '@/types';

export function SchemaExplorer() {
  const { activeConnectionId } = useConnectionStore();
  const { schemasByConnection, toggleSchema, setTables, setColumns, toggleTable, expandedTables, loadingSchemas, setLoading } =
    useSchemaStore();
  const { addLog } = useUIStore();
  const { addTab } = useEditorStore();

  const schemas = activeConnectionId ? (schemasByConnection[activeConnectionId] ?? []) : [];

  const handleSchemaClick = useCallback(
    async (schemaName: string) => {
      if (!activeConnectionId) return;
      const node = schemas.find((s) => s.schema.name === schemaName);
      toggleSchema(activeConnectionId, schemaName);
      if (!node?.tablesLoaded) {
        try {
          const tables = await commands.getTables(activeConnectionId, schemaName);
          setTables(activeConnectionId, schemaName, tables);
        } catch (err) {
          addLog('error', 'Failed to load tables', String(err));
        }
      }
    },
    [activeConnectionId, schemas, toggleSchema, setTables, addLog]
  );

  const handleTableClick = useCallback(
    async (schemaName: string, tableName: string) => {
      if (!activeConnectionId) return;
      const key = `${activeConnectionId}:${schemaName}`;
      const isExpanded = expandedTables[key]?.has(tableName);
      toggleTable(activeConnectionId, schemaName, tableName);

      if (!isExpanded) {
        const schemaNode = schemas.find((s) => s.schema.name === schemaName);
        if (!schemaNode?.columns?.[tableName]) {
          try {
            const cols = await commands.getColumns(activeConnectionId, schemaName, tableName);
            setColumns(activeConnectionId, schemaName, tableName, cols);
          } catch (err) {
            addLog('error', 'Failed to load columns', String(err));
          }
        }
      }
    },
    [activeConnectionId, schemas, expandedTables, toggleTable, setColumns, addLog]
  );

  const handlePreviewTable = useCallback(
    (schemaName: string, tableName: string) => {
      if (!activeConnectionId) return;
      const tabId = addTab(
        activeConnectionId,
        `SELECT * FROM "${schemaName}"."${tableName}" LIMIT 100;`
      );
      useEditorStore.getState().setTabTitle(tabId, `${tableName}`);
    },
    [activeConnectionId, addTab]
  );

  if (!activeConnectionId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-xs text-muted-foreground">Connect to a database to explore its schema</p>
      </div>
    );
  }

  if (loadingSchemas.has(activeConnectionId)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Schema Explorer
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {schemas.map((node) => {
          const key = `${activeConnectionId}:${node.schema.name}`;
          return (
            <div key={node.schema.name} className="mb-0.5">
              <button
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left hover:bg-accent/50"
                onClick={() => void handleSchemaClick(node.schema.name)}
              >
                <ChevronRight
                  className={cn(
                    'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                    node.expanded && 'rotate-90'
                  )}
                />
                <Layers className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <span className="truncate text-xs font-medium">{node.schema.name}</span>
              </button>

              {node.expanded && (
                <div className="ml-3 space-y-0.5">
                  {(node.tables ?? []).map((table) => {
                    const isTableExpanded = expandedTables[key]?.has(table.name);
                    return (
                      <div key={table.name}>
                        <div
                          className="group flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 hover:bg-accent/50"
                          onClick={() => void handleTableClick(node.schema.name, table.name)}
                        >
                          <ChevronRight
                            className={cn(
                              'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                              isTableExpanded && 'rotate-90'
                            )}
                          />
                          <TableIcon type={table.tableType} />
                          <span className="min-w-0 flex-1 truncate text-xs">{table.name}</span>
                          {table.rowEstimate !== undefined && table.rowEstimate >= 0 && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              ~{formatCount(table.rowEstimate)}
                            </span>
                          )}
                          <button
                            className="shrink-0 rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
                            title="Preview data"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTable(node.schema.name, table.name);
                            }}
                          >
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>

                        {isTableExpanded && (
                          <ColumnList
                            columns={node.columns?.[table.name] ?? []}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {schemas.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No schemas found
          </div>
        )}
      </div>
    </div>
  );
}

function TableIcon({ type }: { type: string }) {
  if (type === 'VIEW') {
    return <Eye className="h-3.5 w-3.5 shrink-0 text-purple-400" />;
  }
  return <Table2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />;
}

function ColumnList({ columns }: { columns: ColumnInfo[] }) {
  return (
    <div className="ml-5 space-y-0.5 py-0.5">
      {columns.map((col) => (
        <div key={col.name} className="flex items-center gap-1.5 px-2 py-0.5">
          {col.isPrimaryKey ? (
            <Key className="h-3 w-3 shrink-0 text-amber-400" />
          ) : (
            <Columns className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
          <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/80">{col.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{col.dataType}</span>
          {col.isNullable && (
            <span className="shrink-0 text-[9px] text-muted-foreground/60">null</span>
          )}
        </div>
      ))}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
