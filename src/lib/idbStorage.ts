// IndexedDB 版持久化后端（替代 localStorage）
// 原因：设计方案里含 base64 整张十指图 + 手部照片，localStorage 仅 ~5MB，
// 累积几张就会 QuotaExceededError。IndexedDB 配额通常为磁盘可用空间的一大部分（GB 级）。
// zustand persist 原生支持异步 storage，这里实现最小 key-value 封装，无需额外依赖。

import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'nail-ai-db';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// 服务端（SSR）没有 indexedDB，返回 no-op，避免构建/首屏报错。
const hasIDB = typeof indexedDB !== 'undefined';

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    if (!hasIDB) return null;
    try {
      const db = await getDB();
      return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(name);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    if (!hasIDB) return;
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  removeItem: async (name) => {
    if (!hasIDB) return;
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
