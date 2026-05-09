import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import type { QueryResult, CellValue } from '@/types';

interface ResultsTableProps {
  result: QueryResult;
}

const NULL_DISPLAY = (
  <span className="italic text-muted-foreground/50">null</span>
);

function formatCell(value: CellValue): React.ReactNode {
  if (value === null || value === undefined) return NULL_DISPLAY;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ResultsTable({ result }: ResultsTableProps) {
  const columns = useMemo<ColumnDef<CellValue[]>[]>(
    () =>
      result.columns.map((col, idx) => ({
        id: col.name,
        header: () => (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">{col.name}</span>
            <span className="text-[10px] text-muted-foreground/60">{col.typeName.split('(')[0]}</span>
          </div>
        ),
        accessorFn: (row) => row[idx],
        cell: ({ getValue }) => {
          const v = getValue() as CellValue;
          return (
            <div className="max-w-[400px] truncate px-3 py-1.5 text-xs" title={v !== null && v !== undefined ? String(v) : ''}>
              {formatCell(v)}
            </div>
          );
        },
        size: estimateColumnWidth(col.name, result.rows.slice(0, 20).map((r) => r[idx])),
        minSize: 80,
        maxSize: 400,
      })),
    [result.columns, result.rows]
  );

  const table = useReactTable({
    data: result.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
  });

  const { rows } = table.getRowModel();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <table className="w-max border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-10 bg-card shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {/* Row number column */}
              <th className="w-12 border-b border-r border-border bg-card px-2 py-1.5 text-right font-mono text-[10px] text-muted-foreground/60">
                #
              </th>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="relative border-b border-r border-border bg-card px-3 py-1.5 text-left"
                  style={{ width: header.getSize() }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {/* Resize handle */}
                  <div
                    onMouseDown={header.getResizeHandler()}
                    className={cn(
                      'absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent hover:bg-primary/40',
                      header.column.getIsResizing() && 'bg-primary'
                    )}
                  />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          <tr style={{ height: `${virtualizer.getVirtualItems()[0]?.start ?? 0}px` }} />
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={cn(
                  'border-b border-border transition-colors hover:bg-accent/30',
                  virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-card/20'
                )}
              >
                <td className="w-12 border-r border-border px-2 text-right font-mono text-[10px] text-muted-foreground/50">
                  {virtualRow.index + 1}
                </td>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="border-r border-border" style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr style={{ height: `${virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0)}px` }} />
        </tbody>
      </table>
    </div>
  );
}

function estimateColumnWidth(name: string, samples: CellValue[]): number {
  const headerWidth = name.length * 8 + 40;
  const maxSampleWidth = Math.max(
    ...samples.map((v) => {
      if (v === null) return 40;
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return Math.min(s.length * 7 + 24, 400);
    })
  );
  return Math.max(headerWidth, maxSampleWidth, 80);
}
