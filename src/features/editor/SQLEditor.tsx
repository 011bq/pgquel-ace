import React, { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import { useEditorStore } from '@/store/editorStore';
import { useQuery } from '@/hooks/useQuery';
import type { editor } from 'monaco-editor';

interface SQLEditorProps {
  tabId: string;
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'JOIN',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'ON', 'AND', 'OR', 'NOT',
  'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN', 'EXISTS', 'HAVING', 'GROUP BY',
  'ORDER BY', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN',
  'MAX', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'UNION',
  'EXCEPT', 'INTERSECT', 'RETURNING', 'EXPLAIN', 'ANALYZE', 'BEGIN',
  'COMMIT', 'ROLLBACK', 'TRANSACTION', 'PRIMARY KEY', 'FOREIGN KEY',
  'REFERENCES', 'UNIQUE', 'NOT NULL', 'DEFAULT', 'CHECK', 'CONSTRAINT',
  'SERIAL', 'INTEGER', 'TEXT', 'VARCHAR', 'BOOLEAN', 'TIMESTAMP', 'DATE',
  'JSON', 'JSONB', 'UUID', 'BIGINT', 'FLOAT', 'NUMERIC', 'DECIMAL',
];

export function SQLEditor({ tabId }: SQLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { tabs, updateTabQuery } = useEditorStore();
  const { runQuery } = useQuery(tabId);

  const tab = tabs.find((t) => t.id === tabId);

  const handleEditorMount: OnMount = useCallback(
    (editorInstance, monaco) => {
      editorRef.current = editorInstance;
      monacoRef.current = monaco;

      // Register SQL completions
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: SQL_KEYWORDS.map((kw) => ({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              range,
            })),
          };
        },
      });

      // Cmd/Ctrl+Enter → run query
      editorInstance.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          const selection = editorInstance.getSelection();
          const model = editorInstance.getModel();
          if (!selection || !model) return;

          const selectedText = model.getValueInRange(selection);
          void runQuery(selectedText.trim() || editorInstance.getValue());
        }
      );

      // Cmd/Ctrl+S → save (prevent browser default)
      editorInstance.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          // TODO: save query to bookmarks
        }
      );
    },
    [runQuery]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      updateTabQuery(tabId, value ?? '');
    },
    [tabId, updateTabQuery]
  );

  // Focus editor when tab becomes active
  useEffect(() => {
    editorRef.current?.focus();
  }, [tabId]);

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      value={tab?.query ?? ''}
      onChange={handleChange}
      onMount={handleEditorMount}
      theme="pgquel-dark"
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
        fontLigatures: true,
        lineHeight: 1.6,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 12, bottom: 12 },
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        bracketPairColorization: { enabled: true },
        suggest: { showKeywords: true },
        quickSuggestions: { other: true, comments: false, strings: false },
        parameterHints: { enabled: true },
        formatOnPaste: false,
        tabSize: 2,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        renderLineHighlight: 'gutter',
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
      beforeMount={(monaco) => {
        monaco.editor.defineTheme('pgquel-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
            { token: 'string', foreground: '34d399' },
            { token: 'number', foreground: 'fb923c' },
            { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
            { token: 'operator', foreground: 'f472b6' },
          ],
          colors: {
            'editor.background': '#0f1117',
            'editor.foreground': '#e2e8f0',
            'editor.lineHighlightBackground': '#1e2332',
            'editor.selectionBackground': '#3730a380',
            'editorCursor.foreground': '#818cf8',
            'editorLineNumber.foreground': '#334155',
            'editorLineNumber.activeForeground': '#64748b',
            'editor.inactiveSelectionBackground': '#1e2d3d40',
          },
        });
      }}
    />
  );
}
