import React, { useState } from 'react';
import { X, Plus, Play, Loader2, Download, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { useConnectionStore } from '@/store/connectionStore';
import { useQuery } from '@/hooks/useQuery';
import { SQLEditor } from './SQLEditor';
import { ResultsTable } from '@/features/results/ResultsTable';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import type { EditorTab } from '@/types';

export function EditorTabs() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useEditorStore();
  const { activeConnectionId } = useConnectionStore();

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--color-background)' }}>
      {/* Tab bar */}
      <div
        className="flex shrink-0 items-center border-b border-border"
        style={{ background: 'var(--color-card)', height: 36 }}
      >
        <div className="flex min-w-0 flex-1 overflow-x-auto h-full">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === (activeTabId ?? tabs[0]?.id)}
              onSelect={() => setActiveTab(tab.id)}
              onClose={() => removeTab(tab.id)}
            />
          ))}
        </div>
        <button
          style={{
            flexShrink: 0, borderLeft: '1px solid var(--color-border)',
            padding: '0 10px', height: '100%', background: 'transparent',
            color: 'var(--color-muted-foreground)', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
          onClick={() => addTab(activeConnectionId ?? undefined)}
          title="New tab"
        >
          <Plus style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Editor + Results */}
      {activeTab && <EditorPane tab={activeTab} />}
    </div>
  );
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
}: {
  tab: EditorTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        minWidth: 110, maxWidth: 180, flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        padding: '0 10px', height: '100%', cursor: 'pointer',
        background: isActive ? 'var(--color-background)' : 'transparent',
        color: isActive ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
        fontSize: 12, fontWeight: isActive ? 500 : 400,
        borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
        transition: 'all 120ms',
        position: 'relative',
      }}
      className="group"
    >
      {tab.isRunning
        ? <Loader2 style={{ width: 10, height: 10, flexShrink: 0, color: '#818cf8', animation: 'spin 1s linear infinite' }} />
        : <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: tab.isDirty ? '#f59e0b' : 'transparent' }} />
      }
      <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {tab.title}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          flexShrink: 0, padding: 2, borderRadius: 3, border: 'none',
          background: 'transparent', cursor: 'pointer', color: 'inherit',
          opacity: 0, transition: 'opacity 120ms',
        }}
        className="group-hover:!opacity-60 hover:!opacity-100"
      >
        <X style={{ width: 10, height: 10 }} />
      </button>
    </button>
  );
}

function EditorPane({ tab }: { tab: EditorTab }) {
  const [editorHeight, setEditorHeight] = useState(50); // percent
  const { runQuery, exportCsv } = useQuery(tab.id);
  const { activeConnectionId, savedConnections } = useConnectionStore();

  const activeConn = savedConnections.find((c) => c.id === (tab.connectionId ?? activeConnectionId));

  const dragRef = React.useRef<{ startY: number; startH: number } | null>(null);

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startH: editorHeight };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const container = document.getElementById('editor-pane');
      if (!container) return;
      const totalH = container.clientHeight;
      const delta = me.clientY - dragRef.current.startY;
      const newH = Math.min(85, Math.max(20, dragRef.current.startH + (delta / totalH) * 100));
      setEditorHeight(newH);
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div id="editor-pane" className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3" style={{ height: 38 }}>
        {activeConn ? (
          <span
            className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 80%, transparent)',
              color: 'var(--color-muted-foreground)',
            }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: activeConn.color ?? '#6366f1', display: 'inline-block' }}
            />
            {activeConn.name}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            No connection
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {tab.result && !tab.result.error && (
            <button
              onClick={exportCsv}
              title="Export CSV"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 5, border: '1px solid var(--color-border)',
                background: 'transparent', color: 'var(--color-muted-foreground)',
                fontSize: 11, cursor: 'pointer',
              }}
            >
              <Download style={{ width: 12, height: 12 }} />
              CSV
            </button>
          )}

          <button
            className="btn-run"
            onClick={() => void runQuery()}
            disabled={tab.isRunning || !tab.connectionId}
          >
            {tab.isRunning
              ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
              : <Play style={{ width: 12, height: 12, fill: 'white' }} />
            }
            Run
            <span className="shortcut">⌘↵</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ height: `${editorHeight}%` }} className="min-h-0">
        <SQLEditor tabId={tab.id} />
      </div>

      {/* Drag divider */}
      <div
        className="h-1 shrink-0 cursor-row-resize bg-border hover:bg-primary/30 transition-colors"
        onMouseDown={handleDividerMouseDown}
      />

      {/* Results */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab.isRunning ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab.result ? (
          <ResultsPanel result={tab.result} />
        ) : (
          <EmptyResults />
        )}
      </div>
    </div>
  );
}

function ResultsPanel({ result }: { result: NonNullable<ReturnType<typeof useEditorStore>['tabs'][0]['result']> }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-4 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        {result.error ? (
          <span className="text-red-400">{result.error}</span>
        ) : (
          <>
            <span>{result.rowCount.toLocaleString()} rows</span>
            {result.affectedRows !== undefined && (
              <span>{result.affectedRows} affected</span>
            )}
            <span>{formatDuration(result.executionTimeMs)}</span>
            <span className="rounded bg-accent/50 px-1.5 py-0.5 font-mono">{result.statementType}</span>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {result.error ? null : <ResultsTable result={result} />}
      </div>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-xs text-muted-foreground">Run a query to see results</p>
    </div>
  );
}
