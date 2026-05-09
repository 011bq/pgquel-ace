import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '@/store/editorStore';
import { useUIStore } from '@/store/uiStore';
import * as commands from '@/tauri/commands';

export function useQuery(tabId: string) {
  const { tabs, updateTabResult, setTabRunning } = useEditorStore();
  const { addLog } = useUIStore();

  const tab = tabs.find((t) => t.id === tabId);

  const runQuery = useCallback(
    async (queryOverride?: string) => {
      if (!tab) return;
      if (!tab.connectionId) {
        addLog('error', 'No connection selected', 'Select a connection first');
        return;
      }

      const queryToRun = queryOverride ?? getSelectedOrFullQuery(tab.query);
      if (!queryToRun.trim()) return;

      setTabRunning(tabId, true);
      addLog('info', `Executing query...`, queryToRun.slice(0, 120));

      try {
        const result = await commands.executeQuery(tab.connectionId, queryToRun);
        updateTabResult(tabId, result);

        if (result.error) {
          addLog('error', `Query error`, result.error);
        } else {
          const msg = result.affectedRows !== undefined
            ? `${result.affectedRows} rows affected`
            : `${result.rowCount} rows returned`;
          addLog('success', `${msg} in ${result.executionTimeMs}ms`);
        }

        // Record to history
        await commands.addHistory({
          id: uuidv4(),
          connectionId: tab.connectionId,
          query: queryToRun,
          executionTimeMs: result.executionTimeMs,
          rowCount: result.rowCount,
          hadError: !!result.error,
          errorMessage: result.error,
          executedAt: new Date().toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        addLog('error', 'Query failed', message);
        updateTabResult(tabId, {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: message,
          statementType: 'ERROR',
        });
      } finally {
        setTabRunning(tabId, false);
      }
    },
    [tab, tabId, updateTabResult, setTabRunning, addLog]
  );

  const exportCsv = useCallback(async () => {
    if (!tab?.connectionId || !tab.query) return;
    try {
      const csv = await commands.exportQueryCsv(tab.connectionId, tab.query);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query-result-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addLog('success', 'CSV exported');
    } catch (err) {
      addLog('error', 'Export failed', String(err));
    }
  }, [tab, addLog]);

  return { runQuery, exportCsv };
}

function getSelectedOrFullQuery(query: string): string {
  const selection = window.getSelection()?.toString();
  return selection?.trim() || query;
}
