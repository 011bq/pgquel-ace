import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { useConnectionStore } from '@/store/connectionStore';
import { useEditorStore } from '@/store/editorStore';
import * as commands from '@/tauri/commands';
import type { QueryHistoryEntry } from '@/types';

export function QueryHistory() {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const { activeConnectionId } = useConnectionStore();
  const { addTab } = useEditorStore();

  useEffect(() => {
    void commands.getHistory(activeConnectionId ?? undefined, 100).then(setHistory);
  }, [activeConnectionId]);

  const handleClick = (entry: QueryHistoryEntry) => {
    addTab(entry.connectionId, entry.query);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Query History
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {history.map((entry) => (
          <button
            key={entry.id}
            className="w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/50 transition-colors"
            onClick={() => handleClick(entry)}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {entry.hadError ? (
                <XCircle className="h-3 w-3 shrink-0 text-red-400" />
              ) : (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDuration(entry.executionTimeMs)}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(entry.executedAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="truncate font-mono text-[11px] text-foreground/80">{entry.query}</p>
          </button>
        ))}
        {history.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No history yet
          </div>
        )}
      </div>
    </div>
  );
}
