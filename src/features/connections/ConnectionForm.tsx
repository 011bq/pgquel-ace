import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Label from '@radix-ui/react-label';
import * as Switch from '@radix-ui/react-switch';
import { X, Loader2, CheckCircle2, XCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useConnection } from '@/hooks/useConnection';
import type { ConnectionConfig } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ConnectionFormProps {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ConnectionConfig>;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#3b82f6', '#f59e0b'];

export function ConnectionForm({ open, onClose, initial }: ConnectionFormProps) {
  const [config, setConfig] = useState<ConnectionConfig>({
    name: initial?.name ?? '',
    host: initial?.host ?? 'localhost',
    port: initial?.port ?? 5432,
    database: initial?.database ?? '',
    username: initial?.username ?? 'postgres',
    password: '',
    ssl: initial?.ssl ?? false,
    group: initial?.group ?? '',
    color: initial?.color ?? COLORS[0],
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
    if (!config.name || !config.host || !config.database || !config.username) return;
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-0 shadow-2xl animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: config.color }}
            >
              <Database className="h-4 w-4 text-white" />
            </div>
            <Dialog.Title className="text-sm font-semibold text-foreground">
              {initial?.id ? 'Edit Connection' : 'New Connection'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="ml-auto rounded-md p-1 hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* Color + Name row */}
            <div className="flex gap-3">
              <div className="space-y-1">
                <Label.Root className="text-xs font-medium text-muted-foreground">Color</Label.Root>
                <div className="flex gap-1.5">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        'h-5 w-5 rounded-full ring-offset-1 transition-all',
                        config.color === color && 'ring-2 ring-white'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => update('color', color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Field label="Connection Name">
              <Input
                placeholder="My Database"
                value={config.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Host">
                  <Input
                    placeholder="localhost"
                    value={config.host}
                    onChange={(e) => update('host', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Port">
                <Input
                  type="number"
                  placeholder="5432"
                  value={config.port}
                  onChange={(e) => update('port', Number(e.target.value))}
                />
              </Field>
            </div>

            <Field label="Database">
              <Input
                placeholder="postgres"
                value={config.database}
                onChange={(e) => update('database', e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Username">
                <Input
                  placeholder="postgres"
                  value={config.username}
                  onChange={(e) => update('username', e.target.value)}
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={config.password ?? ''}
                  onChange={(e) => update('password', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Group (optional)">
                <Input
                  placeholder="Production"
                  value={config.group ?? ''}
                  onChange={(e) => update('group', e.target.value)}
                />
              </Field>
              <div className="flex items-end pb-0.5">
                <div className="flex w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-2.5">
                  <span className="text-sm text-foreground">SSL</span>
                  <Switch.Root
                    checked={config.ssl}
                    onCheckedChange={(v) => update('ssl', v)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors',
                      config.ssl ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4" />
                  </Switch.Root>
                </div>
              </div>
            </div>

            {/* Test result */}
            {testResult && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
                  testResult.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                )}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                {testResult.message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Test Connection
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !config.name}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label.Root className="text-xs font-medium text-muted-foreground">{label}</Label.Root>
      {children}
    </div>
  );
}
