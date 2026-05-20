// client/src/stores/notes.js
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import api from '../services/api';
import {
  deleteNote as deleteNoteFromDB,
  getAllNotes,
  getNoteById,
  getUnsyncedNotes,
  markSynced,
  saveNote as saveNoteToDB,
} from '../services/db';

function sortNotes(notes) {
  return [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

function visibleNotes(notes) {
  return sortNotes(notes).filter((note) => !note.deleted);
}

function noteTimestamp(note) {
  return new Date(note.updatedAt ?? 0).getTime();
}

function createDraft(partial = {}) {
  const now = new Date().toISOString();

  return {
    id: partial.id ?? crypto.randomUUID(),
    title: partial.title ?? '',
    body: partial.body ?? '',
    deleted: partial.deleted ?? false,
    synced: partial.synced ?? false,
    color: partial.color ?? 'default',
    fontFamily: partial.fontFamily ?? 'serif',
    fontSize: partial.fontSize ?? 'medium',
    lineHeight: partial.lineHeight ?? 'relaxed',
    pinned: partial.pinned ?? false,
    tags: Array.isArray(partial.tags) ? partial.tags : [],
    versions: Array.isArray(partial.versions) ? partial.versions : [],
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

async function registerBackgroundSync() {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    if ('sync' in registration) {
      await registration.sync.register('sync-notes');
    }
  } catch {
    // Background Sync is optional and may be disabled by the browser.
  }
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([]);
  const loading = ref(false);
  const syncing = ref(false);
  const syncError = ref(null);

  const hasUnsynced = computed(() => notes.value.some((note) => note.synced === false));

  async function refreshFromDB() {
    const localNotes = await getAllNotes();
    notes.value = visibleNotes(localNotes);
  }

  async function mergeServerNotes(serverNotes) {
    const localNotes = await getAllNotes();
    const byId = new Map(localNotes.map((note) => [note.id, note]));

    for (const serverNote of serverNotes) {
      const incoming = {
        id: serverNote.id ?? serverNote._id,
        title: serverNote.title ?? '',
        body: serverNote.body ?? '',
        deleted: Boolean(serverNote.deleted),
        synced: true,
        color: serverNote.color ?? 'default',
        fontFamily: serverNote.fontFamily ?? 'serif',
        fontSize: serverNote.fontSize ?? 'medium',
        lineHeight: serverNote.lineHeight ?? 'relaxed',
        pinned: serverNote.pinned ?? false,
        tags: Array.isArray(serverNote.tags) ? serverNote.tags : [],
        createdAt: serverNote.createdAt,
        updatedAt: serverNote.updatedAt,
      };

      const local = byId.get(incoming.id);
      const localIsNewer = local && noteTimestamp(local) > noteTimestamp(incoming);

      if (localIsNewer && local.synced === false) {
        continue;
      }

      if (incoming.deleted) {
        await deleteNoteFromDB(incoming.id);
        byId.delete(incoming.id);
      } else {
        await saveNoteToDB(incoming);
        byId.set(incoming.id, incoming);
      }
    }

    notes.value = visibleNotes([...byId.values()]);
  }

  // Loads local notes instantly, then merges server notes in the background.
  async function init() {
    loading.value = true;
    syncError.value = null;

    // Phase 1: Show cached notes from IndexedDB immediately
    try {
      await refreshFromDB();
    } catch (error) {
      syncError.value = error.message ?? 'Unable to load local notes';
    } finally {
      loading.value = false;
    }

    // Phase 2: Fetch and merge server notes in background (non-blocking)
    syncServerInBackground();
  }

  async function syncServerInBackground() {
    try {
      const response = await api.get('/notes');

      if (response.data?.offline) {
        return;
      }

      await mergeServerNotes(response.data?.notes ?? []);
      await syncNow();
    } catch (error) {
      syncError.value = error.message ?? 'Unable to sync with server';
    }
  }

  // Creates or updates a note optimistically in IndexedDB before trying server sync.
  async function saveNote(partial) {
    const existing = partial.id ? await getNoteById(partial.id) : null;
    let versions = existing && Array.isArray(existing.versions) ? [...existing.versions] : [];

    // Snapshottable content: only append snapshot if content has actually changed and is not blank
    if (existing && (existing.title !== partial.title || existing.body !== partial.body)) {
      const now = new Date().toISOString();
      const lastVersion = versions[versions.length - 1];

      // Throttling: save snapshots every 2 minutes OR if user forces it (e.g. clicking 'Save now' icon)
      const force = Boolean(partial.forceVersion);
      const timeThreshold = 2 * 60 * 1000;
      const timeDiff = lastVersion ? (new Date(now) - new Date(lastVersion.updatedAt)) : Infinity;

      if (force || timeDiff > timeThreshold) {
        // We save the PRIOR text state as the history snapshot!
        versions.push({
          title: existing.title || 'Untitled note',
          body: existing.body || '',
          updatedAt: existing.updatedAt || now,
        });

        if (versions.length > 15) {
          versions.shift();
        }
      }
    }

    // We delete forceVersion flag from partial before mixing
    const cleanPartial = { ...partial };
    delete cleanPartial.forceVersion;

    const note = createDraft({
      ...existing,
      ...cleanPartial,
      versions,
      synced: false,
      deleted: false,
      updatedAt: new Date().toISOString(),
    });

    await saveNoteToDB(note);
    notes.value = visibleNotes([...notes.value.filter((item) => item.id !== note.id), note]);
    void registerBackgroundSync();
    void syncNow();
    return note;
  }

  // Soft-deletes a note locally and queues the tombstone for sync.
  async function deleteNote(id) {
    const existing = await getNoteById(id);

    if (!existing) {
      return;
    }

    await saveNoteToDB({
      ...existing,
      deleted: true,
      synced: false,
      updatedAt: new Date().toISOString(),
    });

    notes.value = notes.value.filter((note) => note.id !== id);
    void registerBackgroundSync();
    void syncNow();
  }

  // Reads unsynced notes, posts them to the sync endpoint, then marks them synced locally.
  async function syncNow() {
    if (syncing.value) {
      return;
    }

    const unsyncedNotes = await getUnsyncedNotes();

    if (!unsyncedNotes.length) {
      syncError.value = null;
      return;
    }

    syncing.value = true;
    syncError.value = null;

    try {
      const response = await api.post('/sync', { notes: unsyncedNotes });

      if (response.data?.offline) {
        syncError.value = 'Offline';
        await registerBackgroundSync();
        return;
      }

      if (response.data?.success) {
        await Promise.all(unsyncedNotes.map((note) => markSynced(note.id)));
        await refreshFromDB();
        const latest = await api.get('/notes');

        if (!latest.data?.offline) {
          await mergeServerNotes(latest.data?.notes ?? []);
        }
      }
    } catch (error) {
      syncError.value = error.message ?? 'Sync failed';
    } finally {
      syncing.value = false;
    }
  }

  return {
    notes,
    loading,
    syncing,
    syncError,
    hasUnsynced,
    init,
    saveNote,
    deleteNote,
    syncNow,
  };
});
