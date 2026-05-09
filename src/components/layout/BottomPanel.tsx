import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Trash2, ChevronDown } from 'lucide-react';
import { cn, truncate } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import type { LogEntry } from '@/types';

const LEVEL_STYLES: Record<LogEntry['level'], { icon: React.ReactNode; text: string }> = {
  success: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    text: 'text-emerald-400',
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5 text-red-400" />,
    text: 'text-red-400',
  },
  warning: {
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    text: 'text-amber-400',
  },
  info: {
    icon: <Info className="h-3.5 w-3.5 text-blue-400" />,
    text: 'text-muted-foreground',
  },
};

export function BottomPanel() {
  const { logs, clearLogs, bottomPanelCollapsed, toggleBottomPanel } = useUIStore();

  return (
    <div className="flex h-full flex-col border-t border-border bg-card/30">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Console
        </span>
        {logs.length > 0 && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {logs.length}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={clearLogs} title="Clear">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={toggleBottomPanel}>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', bottomPanelCollapsed && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {!bottomPanelCollapsed && (
        <div className="flex-1 overflow-y-auto px-3 py-2 font-mono">
          {logs.map((log) => {
            const style = LEVEL_STYLES[log.level];
            return (
              <div key={log.id} className="flex items-start gap-2 py-0.5 text-xs">
                <span className="mt-0.5 shrink-0">{style.icon}</span>
                <span className="shrink-0 text-muted-foreground/50">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn('flex-1', style.text)}>
                  {log.message}
                  {log.detail && (
                    <span className="ml-2 text-muted-foreground/70">— {truncate(log.detail, 200)}</span>
                  )}
                </span>
              </div>
            );
          })}
          {logs.length === 0 && (
            <p className="py-2 text-xs text-muted-foreground">No logs</p>
          )}
        </div>
      )}
    </div>
  );
}
