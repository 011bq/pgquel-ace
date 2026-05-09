import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Database, Plus, Layers, History, Play, Search } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useConnectionStore } from '@/store/connectionStore';
import { useEditorStore } from '@/store/editorStore';

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveSidebarView } = useUIStore();
  const { savedConnections } = useConnectionStore();
  const { addTab } = useEditorStore();
  const [value, setValue] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command value={value} onValueChange={setValue} className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Search commands, connections..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[380px] overflow-y-auto py-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found
            </Command.Empty>

            <CommandGroup heading="Actions">
              <CommandItem
                icon={<Plus className="h-4 w-4" />}
                label="New Query Tab"
                shortcut="⌘T"
                onSelect={() => {
                  addTab();
                  setCommandPaletteOpen(false);
                }}
              />
              <CommandItem
                icon={<Database className="h-4 w-4" />}
                label="New Connection"
                onSelect={() => {
                  setActiveSidebarView('connections');
                  setCommandPaletteOpen(false);
                }}
              />
              <CommandItem
                icon={<Layers className="h-4 w-4" />}
                label="Schema Explorer"
                onSelect={() => {
                  setActiveSidebarView('schema');
                  setCommandPaletteOpen(false);
                }}
              />
              <CommandItem
                icon={<History className="h-4 w-4" />}
                label="Query History"
                onSelect={() => {
                  setActiveSidebarView('history');
                  setCommandPaletteOpen(false);
                }}
              />
            </CommandGroup>

            {savedConnections.length > 0 && (
              <CommandGroup heading="Connections">
                {savedConnections.map((conn) => (
                  <CommandItem
                    key={conn.id}
                    icon={
                      <div
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: conn.color ?? '#6366f1' }}
                      />
                    }
                    label={conn.name}
                    description={`${conn.host}:${conn.port}/${conn.database}`}
                    onSelect={() => {
                      setCommandPaletteOpen(false);
                    }}
                  />
                ))}
              </CommandGroup>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&>[cmdk-group-heading]]:px-3 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-xs [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:text-muted-foreground"
    >
      {children}
    </Command.Group>
  );
}

function CommandItem({
  icon,
  label,
  description,
  shortcut,
  onSelect,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="mx-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
    >
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className="flex-1">{label}</span>
      {description && <span className="text-xs text-muted-foreground">{description}</span>}
      {shortcut && <kbd className="text-xs text-muted-foreground">{shortcut}</kbd>}
    </Command.Item>
  );
}
