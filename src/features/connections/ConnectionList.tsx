import React, { useState, useRef } from 'react';
import {
  Database,
  Star,
  Plus,
  ChevronRight,
  MoreHorizontal,
  Plug,
  Trash2,
  Edit2,
  KeyRound,
  X,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { useConnectionStore } from '@/store/connectionStore';
import { useConnection } from '@/hooks/useConnection';
import { ConnectionForm } from './ConnectionForm';
import type { SavedConnection } from '@/types';
import { Button } from '@/components/ui/Button';

export function ConnectionList() {
  const [formOpen, setFormOpen] = useState(false);
  const [editConn, setEditConn] = useState<SavedConnection | null>(null);
  const [pwPrompt, setPwPrompt] = useState<SavedConnection | null>(null);
  const [pwValue, setPwValue] = useState('');
  const pwInputRef = useRef<HTMLInputElement>(null);

  const { savedConnections, activeConnectionId, openConnectionIds } = useConnectionStore();
  const { connectTo, disconnectFrom, deleteConnection } = useConnection();

  const favorites = savedConnections.filter((c) => c.isFavorite);
  const groups = groupConnections(savedConnections);

  const doConnect = async (conn: SavedConnection, password?: string) => {
    await connectTo({
      id: conn.id,
      name: conn.name,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      ssl: conn.ssl,
      group: conn.group,
      color: conn.color,
    }, password);
  };

  const handleConnect = async (conn: SavedConnection) => {
    if (openConnectionIds.includes(conn.id)) {
      await disconnectFrom(conn.id);
    } else {
      try {
        await doConnect(conn);
      } catch (err) {
        const msg = String(err);
        if (msg.includes('password authentication') || msg.includes('authentication failed')) {
          setPwPrompt(conn);
          setPwValue('');
          setTimeout(() => pwInputRef.current?.focus(), 50);
        }
      }
    }
  };

  const handlePwSubmit = async () => {
    if (!pwPrompt) return;
    const conn = pwPrompt;
    setPwPrompt(null);
    await doConnect(conn, pwValue);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Connections
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setFormOpen(true)}
          title="New connection"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {favorites.length > 0 && (
          <Section title="Favorites">
            {favorites.map((conn) => (
              <ConnectionItem
                key={conn.id}
                conn={conn}
                isActive={activeConnectionId === conn.id}
                isOpen={openConnectionIds.includes(conn.id)}
                onConnect={() => void handleConnect(conn)}
                onEdit={() => setEditConn(conn)}
                onDelete={() => void deleteConnection(conn.id)}
              />
            ))}
          </Section>
        )}

        {Object.entries(groups).map(([group, conns]) => (
          <Section key={group} title={group}>
            {conns.map((conn) => (
              <ConnectionItem
                key={conn.id}
                conn={conn}
                isActive={activeConnectionId === conn.id}
                isOpen={openConnectionIds.includes(conn.id)}
                onConnect={() => void handleConnect(conn)}
                onEdit={() => setEditConn(conn)}
                onDelete={() => void deleteConnection(conn.id)}
              />
            ))}
          </Section>
        ))}

        {savedConnections.length === 0 && (
          <div className="px-3 py-8 text-center">
            <Database className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No connections yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Connection
            </Button>
          </div>
        )}
      </div>

      <ConnectionForm
        open={formOpen || !!editConn}
        onClose={() => {
          setFormOpen(false);
          setEditConn(null);
        }}
        initial={editConn ?? undefined}
      />

      {/* Password prompt */}
      <Dialog.Root open={!!pwPrompt} onOpenChange={(o) => !o && setPwPrompt(null)}>
        <Dialog.Portal>
          <Dialog.Overlay style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <Dialog.Content
            style={{
              position: 'fixed', left: '50%', top: '50%', zIndex: 50,
              width: 320, transform: 'translate(-50%, -50%)',
              borderRadius: 10, border: '1px solid #1f2b3e',
              background: '#141923', boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <KeyRound style={{ width: 14, height: 14, color: '#6366f1', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#cdd6e8' }}>Enter Password</span>
              <Dialog.Close asChild>
                <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#5a6b88', padding: 2 }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </Dialog.Close>
            </div>
            <p style={{ fontSize: 11, color: '#5a6b88', marginBottom: 12 }}>
              {pwPrompt?.name} · {pwPrompt?.username}
            </p>
            <input
              ref={pwInputRef}
              type="password"
              placeholder="Password"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handlePwSubmit()}
              style={{
                width: '100%', height: 34, borderRadius: 6,
                border: '1px solid #2a3a52', background: '#0e1117',
                color: '#cdd6e8', fontSize: 12, padding: '0 10px',
                outline: 'none', marginBottom: 12,
              }}
              autoComplete="current-password"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setPwPrompt(null)}
                style={{ height: 30, padding: '0 12px', borderRadius: 6, border: 'none', background: 'transparent', color: '#5a6b88', fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handlePwSubmit()}
                style={{ height: 30, padding: '0 16px', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Connect
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-1">
      <button
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-left hover:bg-accent/50"
        onClick={() => setCollapsed((c) => !c)}
      >
        <ChevronRight
          className={cn('h-3 w-3 text-muted-foreground transition-transform', !collapsed && 'rotate-90')}
        />
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </button>
      {!collapsed && <div className="ml-1 space-y-0.5">{children}</div>}
    </div>
  );
}

interface ConnectionItemProps {
  conn: SavedConnection;
  isActive: boolean;
  isOpen: boolean;
  onConnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ConnectionItem({ conn, isActive, isOpen, onConnect, onEdit, onDelete }: ConnectionItemProps) {
  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
      )}
      onClick={onConnect}
    >
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
        style={{ backgroundColor: conn.color ?? '#6366f1' }}
      >
        <Database className="h-3 w-3 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{conn.name}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          {conn.host}:{conn.port}/{conn.database}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
        {isOpen && <Plug className="h-3 w-3 text-emerald-500" />}
        {conn.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="rounded p-0.5 hover:bg-accent"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[140px] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg"
              sideOffset={4}
            >
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-accent"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                <Edit2 className="h-3 w-3" /> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}

function groupConnections(connections: SavedConnection[]): Record<string, SavedConnection[]> {
  const groups: Record<string, SavedConnection[]> = {};
  for (const conn of connections) {
    const group = conn.group || 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(conn);
  }
  return groups;
}
