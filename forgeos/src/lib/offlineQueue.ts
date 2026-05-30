import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isBackendLive, supabase } from './supabase';

interface ForgeDB extends DBSchema {
  queue: {
    key: number;
    value: QueuedOp;
    indexes: { 'by-status': string };
  };
}

export interface QueuedOp {
  id?: number;
  table: string;
  payload: unknown;
  status: 'pending' | 'synced' | 'error';
  createdAt: string;
}

let dbPromise: Promise<IDBPDatabase<ForgeDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ForgeDB>('forgeos', 1, {
      upgrade(db) {
        const store = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-status', 'status');
      },
    });
  }
  return dbPromise;
}

export async function enqueue(table: string, payload: unknown) {
  const db = await getDb();
  await db.add('queue', { table, payload, status: 'pending', createdAt: new Date().toISOString() });
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const all = await db.getAllFromIndex('queue', 'by-status', 'pending');
  return all.length;
}

// Flush the queue when back online. Without a live backend, we simply mark
// entries synced so the UI reflects a clean state in dev.
export async function syncQueue(): Promise<{ synced: number }> {
  const db = await getDb();
  const pending = await db.getAllFromIndex('queue', 'by-status', 'pending');
  let synced = 0;
  for (const op of pending) {
    if (isBackendLive && supabase) {
      // TODO: wire backend — push op.payload to op.table via supabase
      // await supabase.from(op.table).upsert(op.payload)
    }
    if (op.id != null) {
      await db.put('queue', { ...op, status: 'synced' });
      synced++;
    }
  }
  return { synced };
}

export function onReconnect(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', cb);
  return () => window.removeEventListener('online', cb);
}
