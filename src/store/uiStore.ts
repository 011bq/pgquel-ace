import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LogEntry, PanelView } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface UIStore {
  sidebarWidth: number;
  bottomPanelHeight: number;
  sidebarCollapsed: boolean;
  bottomPanelCollapsed: boolean;
  activeSidebarView: PanelView;
  commandPaletteOpen: boolean;
  logs: LogEntry[];

  setSidebarWidth: (w: number) => void;
  setBottomPanelHeight: (h: number) => void;
  toggleSidebar: () => void;
  toggleBottomPanel: () => void;
  setActiveSidebarView: (view: PanelView) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  addLog: (level: LogEntry['level'], message: string, detail?: string) => void;
  clearLogs: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarWidth: 260,
      bottomPanelHeight: 180,
      sidebarCollapsed: false,
      bottomPanelCollapsed: false,
      activeSidebarView: 'connections',
      commandPaletteOpen: false,
      logs: [],

      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setBottomPanelHeight: (h) => set({ bottomPanelHeight: h }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleBottomPanel: () => set((s) => ({ bottomPanelCollapsed: !s.bottomPanelCollapsed })),
      setActiveSidebarView: (view) => set({ activeSidebarView: view }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      addLog: (level, message, detail) =>
        set((state) => ({
          logs: [
            {
              id: uuidv4(),
              level,
              message,
              detail,
              timestamp: new Date().toISOString(),
            },
            ...state.logs.slice(0, 499),
          ],
        })),

      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'pgquel-ui',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        bottomPanelHeight: state.bottomPanelHeight,
        sidebarCollapsed: state.sidebarCollapsed,
        activeSidebarView: state.activeSidebarView,
      }),
    }
  )
);
