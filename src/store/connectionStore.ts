import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SavedConnection } from '@/types';

interface ConnectionStore {
  savedConnections: SavedConnection[];
  activeConnectionId: string | null;
  openConnectionIds: string[];

  setSavedConnections: (connections: SavedConnection[]) => void;
  addConnection: (connection: SavedConnection) => void;
  updateConnection: (connection: SavedConnection) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  openConnection: (id: string) => void;
  closeConnection: (id: string) => void;
  toggleFavorite: (id: string) => void;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set) => ({
      savedConnections: [],
      activeConnectionId: null,
      openConnectionIds: [],

      setSavedConnections: (connections) => set({ savedConnections: connections }),

      addConnection: (connection) =>
        set((state) => ({
          savedConnections: [...state.savedConnections, connection],
        })),

      updateConnection: (connection) =>
        set((state) => ({
          savedConnections: state.savedConnections.map((c) =>
            c.id === connection.id ? connection : c
          ),
        })),

      removeConnection: (id) =>
        set((state) => ({
          savedConnections: state.savedConnections.filter((c) => c.id !== id),
          openConnectionIds: state.openConnectionIds.filter((cid) => cid !== id),
          activeConnectionId:
            state.activeConnectionId === id ? null : state.activeConnectionId,
        })),

      setActiveConnection: (id) => set({ activeConnectionId: id }),

      openConnection: (id) =>
        set((state) => ({
          openConnectionIds: state.openConnectionIds.includes(id)
            ? state.openConnectionIds
            : [...state.openConnectionIds, id],
          activeConnectionId: id,
        })),

      closeConnection: (id) =>
        set((state) => ({
          openConnectionIds: state.openConnectionIds.filter((cid) => cid !== id),
          activeConnectionId:
            state.activeConnectionId === id
              ? state.openConnectionIds.find((cid) => cid !== id) ?? null
              : state.activeConnectionId,
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          savedConnections: state.savedConnections.map((c) =>
            c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
          ),
        })),
    }),
    {
      name: 'pgquel-connections',
      partialize: (state) => ({
        savedConnections: state.savedConnections,
        activeConnectionId: state.activeConnectionId,
      }),
    }
  )
);
