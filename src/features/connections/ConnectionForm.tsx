import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import { X, Loader2, CheckCircle2, XCircle, Database } from 'lucide-react';
import { useConnection } from '@/hooks/useConnection';
import type { ConnectionConfig } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ConnectionFormProps {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ConnectionConfig>;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#3b82f6', '#f59e0b'];

const S = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 50,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
  },
  dialog: {
    position: 'fixed' as const,
    left: '50%',
    top: '50%',
    zIndex: 50,
    width: '100%',
    maxWidth: 480,
    transform: 'translate(-50%, -50%)',
    borderRadius: 12,
    border: '1px solid #1f2b3e',
    background: '#141923',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderBottom: '1px solid #1f2b3e',
    padding: '14px 20px',
  },
  iconBox: (color: string) => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#cdd6e8',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    color: '#5a6b88',
    display: 'flex',
    alignItems: 'center',
  },
  body: {
    padding: '20px 20px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: '#8899bb',
    marginBottom: 5,
    letterSpacing: '0.03em',
  },
  input: {
    width: '100%',
    height: 34,
    borderRadius: 6,
    border: '1px solid #2a3a52',
    background: '#0e1117',
    color: '#cdd6e8',
    fontSize: 12,
    padding: '0 10px',
    outline: 'none',
    transition: 'border-color 120ms',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid #1f2b3e',
    padding: '12px 20px',
    gap: 8,
  },
  btnOutline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    padding: '0 12px',
    borderRadius: 6,
    border: '1px solid #2a3a52',
    background: 'transparent',
    color: '#8899bb',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    padding: '0 12px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#5a6b88',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 30,
    padding: '0 16px',
    borderRadius: 6,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export function ConnectionForm({ open, onClose, initial }: ConnectionFormProps) {
  const [config, setConfig] = useState<ConnectionConfig>({
    name: '',
    host: 'localhost',
    port: 5432,
    database: undefined,
    username: 'postgres',
    password: '',
    ssl: false,
    group: '',
    color: COLORS[0],
    ...initial,
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { createConnection, testConn } = useConnection();

  const update = (key: keyof ConnectionConfig, value: unknown) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConn(config);
      setTestResult({
        ok: result.connected,
        message: result.connected
          ? `Connected in ${result.latencyMs}ms · ${result.version?.split(' ').slice(0, 2).join(' ')}`
          : 'Connection failed',
      });
    } catch (err) {
      setTestResult({ ok: false, message: String(err) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.name || !config.host || !config.username) return;
    setSaving(true);
    try {
      await createConnection({ ...config, id: config.id ?? uuidv4() }, config.password ?? '');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={S.overlay} />
        <Dialog.Content style={S.dialog}>
          {/* Header */}
          <div style={S.header}>
            <div style={S.iconBox(config.color)}>
              <Database style={{ width: 15, height: 15, color: '#fff' }} />
            </div>
            <Dialog.Title style={S.title}>
              {initial?.id ? 'Edit Connection' : 'New Connection'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button style={S.closeBtn}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div style={S.body}>
            {/* Color picker */}
            <div>
              <span style={S.label}>Color</span>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => update('color', color)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: color,
                      border: config.color === color ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: config.color === color ? `0 0 0 2px ${color}` : 'none',
                      cursor: 'pointer',
                      padding: 0,
                      flexShrink: 0,
                      transition: 'box-shadow 100ms',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Name */}
            <Field label="Connection Name">
              <input
                style={S.input}
                placeholder="My Database"
                value={config.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </Field>

            {/* Host + Port */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <Field label="Host">
                  <input
                    style={S.input}
                    placeholder="localhost"
                    value={config.host}
                    onChange={(e) => update('host', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Port">
                <input
                  style={S.input}
                  type="number"
                  placeholder="5432"
                  value={config.port}
                  onChange={(e) => update('port', Number(e.target.value))}
                />
              </Field>
            </div>

            {/* Database */}
            <Field label="Database (optional)">
              <input
                style={S.input}
                placeholder="Leave blank to pick after connecting"
                value={config.database ?? ''}
                onChange={(e) => update('database', e.target.value || undefined)}
              />
            </Field>

            {/* Username + Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Username">
                <input
                  style={S.input}
                  placeholder="postgres"
                  value={config.username}
                  onChange={(e) => update('username', e.target.value)}
                />
              </Field>
              <Field label="Password">
                <input
                  style={S.input}
                  type="password"
                  placeholder="••••••••"
                  value={config.password ?? ''}
                  onChange={(e) => update('password', e.target.value)}
                />
              </Field>
            </div>

            {/* Group */}
            <Field label="Group (optional)">
              <input
                style={S.input}
                placeholder="Production"
                value={config.group ?? ''}
                onChange={(e) => update('group', e.target.value)}
              />
            </Field>

            {/* SSL */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 6,
                border: '1px solid #2a3a52',
                background: '#0e1117',
                padding: '8px 10px',
              }}
            >
              <span style={{ fontSize: 12, color: '#8899bb', fontWeight: 500 }}>SSL / TLS</span>
              <Switch.Root
                checked={config.ssl}
                onCheckedChange={(v) => update('ssl', v)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  border: 'none',
                  background: config.ssl ? '#6366f1' : '#2a3a52',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 150ms',
                }}
              >
                <Switch.Thumb
                  style={{
                    display: 'block',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    position: 'absolute',
                    top: 2,
                    left: config.ssl ? 18 : 2,
                    transition: 'left 150ms',
                  }}
                />
              </Switch.Root>
            </div>

            {/* Test result */}
            {testResult && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 11,
                  background: testResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                  color: testResult.ok ? '#10b981' : '#f43f5e',
                }}
              >
                {testResult.ok
                  ? <CheckCircle2 style={{ width: 13, height: 13, flexShrink: 0 }} />
                  : <XCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
                }
                {testResult.message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={S.footer}>
            <button
              style={{ ...S.btnOutline, opacity: testing ? 0.5 : 1 }}
              onClick={handleTest}
              disabled={testing}
            >
              {testing && <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />}
              Test Connection
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={S.btnGhost} onClick={onClose}>
                Cancel
              </button>
              <button
                style={{ ...S.btnPrimary, opacity: saving || !config.name ? 0.4 : 1 }}
                onClick={handleSave}
                disabled={saving || !config.name}
              >
                {saving && <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />}
                Save
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={S.label}>{label}</span>
      {children}
    </div>
  );
}
