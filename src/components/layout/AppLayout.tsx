import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { BottomPanel } from './BottomPanel';
import { EditorTabs } from '@/features/editor/EditorTabs';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useUIStore } from '@/store/uiStore';
import { Toaster } from 'sonner';
import { useEditorStore } from '@/store/editorStore';

export function AppLayout() {
  const { sidebarCollapsed, bottomPanelCollapsed } = useUIStore();
  const { tabs } = useEditorStore();

  // Initialize first tab as active
  React.useEffect(() => {
    const store = useEditorStore.getState();
    if (store.tabs.length > 0 && !store.activeTabId) {
      store.setActiveTab(store.tabs[0].id);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Titlebar (macOS overlay) */}
      <div
        data-tauri-drag-region
        style={{
          height: 40,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          background: 'var(--color-card)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* macOS traffic lights space */}
        <div style={{ width: 80, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="#6366f1"/>
            <rect x="13" y="2" width="9" height="9" rx="2" fill="#6366f1" opacity="0.6"/>
            <rect x="2" y="13" width="9" height="9" rx="2" fill="#6366f1" opacity="0.4"/>
            <rect x="13" y="13" width="9" height="9" rx="2" fill="#6366f1" opacity="0.2"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted-foreground)', letterSpacing: '0.05em' }}>
            PGQUEL
          </span>
        </div>
        <div style={{ width: 80, flexShrink: 0 }} />
      </div>

      {/* Main content */}
      <PanelGroup direction="vertical" className="min-h-0 flex-1">
        {/* Top: sidebar + editor */}
        <Panel defaultSize={bottomPanelCollapsed ? 100 : 75} minSize={40}>
          <PanelGroup direction="horizontal" className="h-full">
            {/* Sidebar */}
            {!sidebarCollapsed && (
              <>
                <Panel defaultSize={20} minSize={15} maxSize={35} className="h-full">
                  <Sidebar />
                </Panel>
                <PanelResizeHandle className="w-px bg-border hover:bg-primary/40 transition-colors" />
              </>
            )}

            {/* Editor */}
            <Panel className="h-full">
              <EditorTabs />
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Bottom panel */}
        {!bottomPanelCollapsed && (
          <>
            <PanelResizeHandle className="h-px bg-border hover:bg-primary/40 transition-colors" />
            <Panel defaultSize={25} minSize={10} maxSize={50}>
              <BottomPanel />
            </Panel>
          </>
        )}
      </PanelGroup>

      <CommandPalette />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
