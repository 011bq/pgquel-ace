import { useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useConnectionStore } from '@/store/connectionStore';
import { useSchemaStore } from '@/store/schemaStore';
import { useUIStore } from '@/store/uiStore';
import type { ConnectionConfig, SavedConnection } from '@/types';
import * as commands from '@/tauri/commands';

// Session-only password cache — never persisted
const _pwCache = new Map<string, string>();

export function useConnection() {
  const { savedConnections, setSavedConnections, addConnection, updateConnection, removeConnection,
    setActiveConnection, openConnection: openInStore, closeConnection: closeInStore } = useConnectionStore();
  const { setSchemas, clearConnection } = useSchemaStore();
  const { addLog } = useUIStore();

  const loadConnections = useCallback(async () => {
    try {
      const conns = await commands.listSavedConnections();
      setSavedConnections(conns as SavedConnection[]);
    } catch (err) {
      addLog('error', 'Failed to load connections', String(err));
    }
  }, [setSavedConnections, addLog]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const createConnection = useCallback(
    async (config: ConnectionConfig, password: string) => {
      const id = config.id ?? uuidv4();
      const conn: SavedConnection = {
        id,
        name: config.name,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        ssl: config.ssl,
        group: config.group,
        color: config.color,
        isFavorite: false,
        createdAt: new Date().toISOString(),
      };

      await commands.saveConnection(conn);

      if (password) {
        _pwCache.set(id, password);
        try {
          await commands.saveCredentials(config.username, password, id);
        } catch {
          // keychain optional — in-memory cache is fallback
        }
      }

      addConnection(conn);
      addLog('success', `Connection "${config.name}" saved`);
      return id;
    },
    [addConnection, addLog]
  );

  const connectTo = useCallback(
    async (config: ConnectionConfig, password?: string) => {
      if (!config.id) return;
      try {
        addLog('info', `Connecting to "${config.name}"...`);
        const pw = password ?? _pwCache.get(config.id);
        const connectionId = await commands.openConnection({ ...config, password: pw });
        openInStore(connectionId);
        setActiveConnection(connectionId);
        await commands.updateLastUsed(connectionId);

        // Load schemas
        const schemas = await commands.getSchemas(connectionId);
        setSchemas(connectionId, schemas);

        addLog('success', `Connected to "${config.name}"`);
        return connectionId;
      } catch (err) {
        addLog('error', `Connection failed: "${config.name}"`, String(err));
        throw err;
      }
    },
    [openInStore, setActiveConnection, setSchemas, addLog]
  );

  const disconnectFrom = useCallback(
    async (connectionId: string) => {
      try {
        await commands.closeConnection(connectionId);
        closeInStore(connectionId);
        clearConnection(connectionId);
        addLog('info', 'Disconnected');
      } catch (err) {
        addLog('error', 'Disconnect failed', String(err));
      }
    },
    [closeInStore, clearConnection, addLog]
  );

  const deleteConnection = useCallback(
    async (id: string) => {
      await commands.deleteSavedConnection(id);
      removeConnection(id);
      addLog('info', 'Connection deleted');
    },
    [removeConnection, addLog]
  );

  const testConn = useCallback(async (config: ConnectionConfig) => {
    return commands.testConnection(config);
  }, []);

  return {
    savedConnections,
    loadConnections,
    createConnection,
    connectTo,
    disconnectFrom,
    deleteConnection,
    testConn,
    updateConnection,
  };
}
