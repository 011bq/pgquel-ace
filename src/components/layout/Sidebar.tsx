import React from 'react';
import { Database, Layers, History, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { ConnectionList } from '@/features/connections/ConnectionList';
import { SchemaExplorer } from '@/features/schema/SchemaExplorer';
import type { PanelView } from '@/types';
import { QueryHistory } from './QueryHistory';

const NAV_ITEMS: { view: PanelView; icon: React.ReactNode; label: string }[] = [
  { view: 'connections', icon: <Database className="h-4 w-4" />, label: 'Connections' },
  { view: 'schema', icon: <Layers className="h-4 w-4" />, label: 'Schema' },
  { view: 'history', icon: <History className="h-4 w-4" />, label: 'History' },
  { view: 'saved', icon: <Bookmark className="h-4 w-4" />, label: 'Saved' },
];

export function Sidebar() {
  const { activeSidebarView, setActiveSidebarView } = useUIStore();

  return (
    <div className="flex h-full border-r border-border">
      {/* Icon rail */}
      <nav
        className="flex shrink-0 flex-col items-center gap-1 border-r border-border"
        style={{ width: 48, paddingTop: 10, paddingBottom: 10, background: 'var(--color-card)' }}
      >
        {NAV_ITEMS.map(({ view, icon, label }) => (
          <button
            key={view}
            title={label}
            onClick={() => setActiveSidebarView(view)}
            className={cn('icon-rail-btn', activeSidebarView === view && 'active')}
          >
            {icon}
          </button>
        ))}
      </nav>

      {/* Panel content */}
      <div className="min-w-0 flex-1 overflow-hidden" style={{ background: 'var(--color-background)' }}>
        {activeSidebarView === 'connections' && <ConnectionList />}
        {activeSidebarView === 'schema' && <SchemaExplorer />}
        {activeSidebarView === 'history' && <QueryHistory />}
        {activeSidebarView === 'saved' && <SavedQueries />}
      </div>
    </div>
  );
}

function SavedQueries() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-xs text-muted-foreground">Saved queries coming soon</p>
    </div>
  );
}
