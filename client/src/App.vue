<!-- client/src/App.vue -->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogOut, Menu, Plus, RefreshCw, Search, X } from 'lucide-vue-next';
import InstallPrompt from './components/InstallPrompt.vue';
import NoteCard from './components/NoteCard.vue';
import OfflineBanner from './components/OfflineBanner.vue';
import SyncStatus from './components/SyncStatus.vue';
import { useAuthStore } from './stores/auth';
import { useNotesStore } from './stores/notes';

const authStore = useAuthStore();
const notesStore = useNotesStore();
const route = useRoute();
const router = useRouter();

const search = ref('');
const notesBooted = ref(false);
const mobileSidebarOpen = ref(false);

const showShell = computed(() => authStore.isLoggedIn && !route.meta.public);
const activeNoteId = computed(() => route.params.id);
const filteredNotes = computed(() => {
  const query = search.value.trim().toLowerCase();

  if (!query) {
    return notesStore.notes;
  }

  return notesStore.notes.filter((note) =>
    `${note.title} ${note.body}`.toLowerCase().includes(query),
  );
});

async function bootNotes() {
  if (notesBooted.value || !authStore.isLoggedIn) {
    return;
  }

  notesBooted.value = true;
  await notesStore.init();
}

function createNote() {
  mobileSidebarOpen.value = false;
  router.push('/notes/new');
}

function openNote(id) {
  mobileSidebarOpen.value = false;
  router.push(`/notes/${id}`);
}

function goHome() {
  mobileSidebarOpen.value = false;
  router.push('/');
}

async function deleteNote(id) {
  await notesStore.deleteNote(id);

  if (activeNoteId.value === id) {
    await router.push('/');
  }
}

async function handleOnline() {
  if (authStore.offlineOnly) {
    await authStore.restoreSession();
  }

  void notesStore.syncNow();
}

onMounted(async () => {
  await authStore.init();
  await bootNotes();
  window.addEventListener('online', handleOnline);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', handleOnline);
});

watch(
  () => authStore.isLoggedIn,
  async (isLoggedIn) => {
    if (isLoggedIn) {
      await bootNotes();
    } else {
      notesBooted.value = false;
    }
  },
);

watch(
  () => route.fullPath,
  () => {
    mobileSidebarOpen.value = false;
  },
);
</script>

<template>
  <div class="min-h-screen bg-ink-base text-quiet-text">
    <OfflineBanner />

    <RouterView v-if="route.meta.public" />

    <div v-else-if="showShell" class="min-h-screen bg-ink-deep md:flex">
      <header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-quiet-outline bg-ink-low px-3 md:hidden">
        <button
          class="grid h-10 w-10 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text"
          title="Open notes"
          type="button"
          @click="mobileSidebarOpen = true"
        >
          <Menu class="h-5 w-5" aria-hidden="true" />
          <span class="sr-only">Open notes</span>
        </button>

        <button class="min-w-0 px-2 text-left" type="button" @click="goHome">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-quiet-primary">Quiet Scribe</p>
        </button>

        <SyncStatus />
      </header>

      <button
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 md:hidden"
        title="Close notes"
        type="button"
        @click="mobileSidebarOpen = false"
      >
        <span class="sr-only">Close notes</span>
      </button>

      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-[min(320px,calc(100vw-48px))] shrink-0 flex-col border-r border-quiet-outline bg-ink-low transition-transform duration-200 md:static md:z-auto md:h-screen md:w-sidebar md:translate-x-0"
        :class="mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <header class="border-b border-quiet-outline p-4">
          <div class="mb-4 flex items-center justify-between gap-3">
            <button
              class="min-w-0 text-left"
              type="button"
              @click="goHome"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-quiet-primary">Quiet Scribe</p>
              <h1 class="truncate text-sm font-semibold text-quiet-text">Notes</h1>
            </button>

            <div class="flex items-center gap-1">
              <button
                class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text md:hidden"
                title="Close notes"
                type="button"
                @click="mobileSidebarOpen = false"
              >
                <X class="h-4 w-4" aria-hidden="true" />
                <span class="sr-only">Close notes</span>
              </button>
              <button
                class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text"
                title="New note"
                type="button"
                @click="createNote"
              >
                <Plus class="h-4 w-4" aria-hidden="true" />
                <span class="sr-only">New note</span>
              </button>
              <button
                class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text disabled:opacity-60"
                :disabled="notesStore.syncing"
                title="Sync"
                type="button"
                @click="notesStore.syncNow"
              >
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': notesStore.syncing }" aria-hidden="true" />
                <span class="sr-only">Sync</span>
              </button>
              <button
                class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-danger hover:text-quiet-danger"
                title="Log out"
                type="button"
                @click="authStore.logout"
              >
                <LogOut class="h-4 w-4" aria-hidden="true" />
                <span class="sr-only">Log out</span>
              </button>
            </div>
          </div>

          <label class="relative block">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet-muted" aria-hidden="true" />
            <input
              v-model="search"
              class="h-10 w-full rounded-app border border-transparent bg-ink-surface pl-9 pr-3 text-sm text-quiet-text outline-none transition placeholder:text-quiet-muted/60 focus:border-quiet-primary"
              placeholder="Search"
              type="search"
            />
          </label>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <NoteCard
            v-for="note in filteredNotes"
            :key="note.id"
            :active="activeNoteId === note.id"
            :note="note"
            @delete="deleteNote"
            @open="openNote"
          />

          <p v-if="!filteredNotes.length" class="px-3 py-8 text-center text-sm text-quiet-muted">
            No notes yet
          </p>
        </div>

        <footer class="flex items-center justify-between border-t border-quiet-outline px-4 py-3">
          <SyncStatus />
          <p class="text-xs text-quiet-muted">{{ notesStore.notes.length }} notes</p>
        </footer>
      </aside>

      <main class="min-w-0 flex-1">
        <RouterView />
      </main>
    </div>

    <main v-else class="grid min-h-screen place-items-center bg-ink-deep px-6">
      <p class="text-sm font-semibold text-quiet-muted">Loading...</p>
    </main>

    <InstallPrompt />
  </div>
</template>
