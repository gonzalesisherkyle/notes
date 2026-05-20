// client/src/services/db.js
const DB_NAME = 'notes-db';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

let dbPromise = null;

function normalizeNote(note) {
  const now = new Date().toISOString();
  
  // Strip Vue reactive proxies by deep copying to a plain JS object
  const cleanNote = note ? JSON.parse(JSON.stringify(note)) : {};

  return {
    id: cleanNote.id,
    title: cleanNote.title ?? '',
    body: cleanNote.body ?? '',
    deleted: Boolean(cleanNote.deleted),
    synced: cleanNote.synced ?? false,
    color: cleanNote.color ?? 'default',
    fontFamily: cleanNote.fontFamily ?? 'serif',
    fontSize: cleanNote.fontSize ?? 'medium',
    lineHeight: cleanNote.lineHeight ?? 'relaxed',
    pinned: cleanNote.pinned ?? false,
    tags: Array.isArray(cleanNote.tags) ? cleanNote.tags : [],
    versions: Array.isArray(cleanNote.versions) ? cleanNote.versions : [],
    createdAt: cleanNote.createdAt ?? now,
    updatedAt: cleanNote.updatedAt ?? now,
  };
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

// Opens the IndexedDB database and creates the notes store plus indexes on first run.
export function openDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
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

  return dbPromise;
}

// Saves or replaces a note in IndexedDB.
export async function saveNote(note) {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(normalizeNote(note));
  await transactionDone(transaction);
  return normalizeNote(note);
}

// Reads every note from IndexedDB, sorted by most recently updated.
export async function getAllNotes() {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const notes = await readRequest(transaction.objectStore(STORE_NAME).getAll());
  await transactionDone(transaction);
  return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// Reads a single note by its client-generated id.
export async function getNoteById(id) {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const note = await readRequest(transaction.objectStore(STORE_NAME).get(id));
  await transactionDone(transaction);
  return note ?? null;
}

// Permanently removes a note from IndexedDB after its tombstone has synced.
export async function deleteNote(id) {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
}

// Reads notes that still need to be sent to the server.
export async function getUnsyncedNotes() {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const notes = await readRequest(transaction.objectStore(STORE_NAME).getAll());
  await transactionDone(transaction);
  return notes
    .filter((note) => note.synced === false)
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
}

// Marks a note as synced, removing synced tombstones from IndexedDB.
export async function markSynced(id) {
  const note = await getNoteById(id);

  if (!note) {
    return null;
  }

  if (note.deleted) {
    await deleteNote(id);
    return null;
  }

  const syncedNote = {
    ...note,
    synced: true,
  };

  await saveNote(syncedNote);
  return syncedNote;
}
