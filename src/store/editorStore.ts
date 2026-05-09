import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { EditorTab, QueryResult } from '@/types';

interface EditorStore {
  tabs: EditorTab[];
  activeTabId: string | null;

  addTab: (connectionId?: string, query?: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabQuery: (id: string, query: string) => void;
  updateTabResult: (id: string, result: QueryResult | undefined) => void;
  setTabRunning: (id: string, isRunning: boolean) => void;
  setTabTitle: (id: string, title: string) => void;
  setTabConnection: (id: string, connectionId: string) => void;
  duplicateTab: (id: string) => void;
  moveTab: (fromIdx: number, toIdx: number) => void;
}

const createTab = (connectionId?: string, query = ''): EditorTab => ({
  id: uuidv4(),
  title: 'Untitled',
  query,
  connectionId,
  result: undefined,
  isRunning: false,
  isDirty: false,
});

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [createTab()],
  activeTabId: null,

  addTab: (connectionId, query) => {
    const tab = createTab(connectionId, query);
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab.id;
  },

  removeTab: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      const remaining = state.tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const newTab = createTab();
        return { tabs: [newTab], activeTabId: newTab.id };
      }
      const nextActive =
        state.activeTabId === id
          ? (remaining[Math.max(0, idx - 1)]?.id ?? remaining[0]?.id ?? null)
          : state.activeTabId;
      return { tabs: remaining, activeTabId: nextActive };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabQuery: (id, query) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, query, isDirty: true } : t
      ),
    })),

  updateTabResult: (id, result) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, result } : t)),
    })),

  setTabRunning: (id, isRunning) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, isRunning } : t)),
    })),

  setTabTitle: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    })),

  setTabConnection: (id, connectionId) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, connectionId } : t)),
    })),

  duplicateTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    const newTab: EditorTab = {
      ...tab,
      id: uuidv4(),
      title: `${tab.title} (copy)`,
      result: undefined,
      isRunning: false,
    };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  moveTab: (fromIdx, toIdx) =>
    set((state) => {
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(fromIdx, 1);
      tabs.splice(toIdx, 0, moved);
      return { tabs };
    }),
}));
