// client/src/sw.js
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DB_NAME = 'notes-db';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  ({ request }) =>
    ['style', 'script', 'worker', 'font', 'image'].includes(request.destination),
  new CacheFirst({
    cacheName: 'quiet-scribe-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  ({ request, url }) => request.method === 'GET' && url.href.startsWith(`${API_URL}/api`),
  new NetworkFirst({
    cacheName: 'quiet-scribe-api',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  }),
);

registerRoute(
  new NavigationRoute(async ({ event }) => {
    try {
      return await fetch(event.request);
    } catch {
      return (await caches.match('/offline.html')) ?? Response.error();
    }
  }),
);

function openNotesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'id' });

      if (!store.indexNames.contains('updatedAt')) {
        store.createIndex('updatedAt', 'updatedAt');
      }

      if (!store.indexNames.contains('synced')) {
        store.createIndex('synced', 'synced');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function getUnsyncedNotes() {
  const db = await openNotesDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const notes = await readRequest(transaction.objectStore(STORE_NAME).getAll());
  await transactionDone(transaction);
  return notes.filter((note) => note.synced === false);
}

async function getNoteById(id) {
  const db = await openNotesDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const note = await readRequest(transaction.objectStore(STORE_NAME).get(id));
  await transactionDone(transaction);
  return note;
}

async function saveNote(note) {
  const db = await openNotesDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(note);
  await transactionDone(transaction);
}

async function deleteNote(id) {
  const db = await openNotesDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
}

async function markSynced(id) {
  const note = await getNoteById(id);

  if (!note) {
    return;
  }

  if (note.deleted) {
    await deleteNote(id);
    return;
  }

  await saveNote({
    ...note,
    synced: true,
  });
}

async function refreshAccessToken() {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to refresh access token for background sync');
  }

  const data = await response.json();

  if (!data.accessToken) {
    throw new Error('Refresh did not return an access token');
  }

  return data.accessToken;
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => client.postMessage(message));
}

async function syncUnsyncedNotes() {
  const notes = await getUnsyncedNotes();

  if (!notes.length) {
    return;
  }

  const accessToken = await refreshAccessToken();
  const response = await fetch(`${API_URL}/api/sync`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error('Background sync failed');
  }

  await Promise.all(notes.map((note) => markSynced(note.id)));
  await notifyClients({ type: 'notes:synced' });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncUnsyncedNotes());
  }
});
