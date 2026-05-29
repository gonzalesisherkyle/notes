<!-- client/src/App.vue -->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, LogOut, Menu, Plus, RefreshCw, Search, X, Feather } from 'lucide-vue-next';
import InstallPrompt from './components/InstallPrompt.vue';
import NoteCard from './components/NoteCard.vue';
import OfflineBanner from './components/OfflineBanner.vue';
import SyncStatus from './components/SyncStatus.vue';
import { useAuthStore } from './stores/auth';
import { useNotesStore } from './stores/notes';
import FieldInput from './components/FieldInput.vue';
import BaseButton from './components/BaseButton.vue';

const authStore = useAuthStore();
const notesStore = useNotesStore();
const route = useRoute();
const router = useRouter();

const search = ref('');
const notesBooted = ref(false);
const mobileSidebarOpen = ref(false);
const selectedTag = ref(null);
const showDeleteConfirmModal = ref(false);
const noteIdToDelete = ref(null);
const noteTitleToDelete = ref('');

const showShell = computed(() => authStore.isLoggedIn && !route.meta.public);
const activeNoteId = computed(() => route.params.id);

// Computes unique list of tags from notes with counts
const allTags = computed(() => {
  const counts = {};
  notesStore.notes.forEach((note) => {
    if (Array.isArray(note.tags)) {
      note.tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    }
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
});

// Normalizes HTML characters and spacing for accurate, reliable query matching
function normalizeText(htmlOrText) {
  if (!htmlOrText) return '';
  let text = htmlOrText.replace(/<[^>]*>/g, ' ');
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  text = text.replace(/\u00a0/g, ' ');
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

const filteredNotes = computed(() => {
  let list = notesStore.notes;

  if (selectedTag.value) {
    list = list.filter((note) => Array.isArray(note.tags) && note.tags.includes(selectedTag.value));
  }

  const query = normalizeText(search.value);
  if (!query) {
    return list;
  }

  return list.filter((note) => {
    const titleNorm = normalizeText(note.title);
    const bodyNorm = normalizeText(note.body);
    const tagsNorm = Array.isArray(note.tags) ? note.tags.join(' ').toLowerCase() : '';
    const indexContent = `${titleNorm} ${bodyNorm} ${tagsNorm}`;
    return indexContent.includes(query);
  });
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
  selectedTag.value = null;
  router.push('/notes/new');
}

function openNote(id) {
  mobileSidebarOpen.value = false;
  router.push(`/notes/${id}`);
}

function goHome() {
  mobileSidebarOpen.value = false;
  selectedTag.value = null;
  router.push('/');
}

function deleteNote(id) {
  const note = notesStore.notes.find((n) => n.id === id);
  if (!note) return;
  noteIdToDelete.value = id;
  noteTitleToDelete.value = note.title || 'Untitled';
  showDeleteConfirmModal.value = true;
}

async function confirmDeleteNote() {
  if (!noteIdToDelete.value) return;
  await notesStore.deleteNote(noteIdToDelete.value);

  if (activeNoteId.value === noteIdToDelete.value) {
    await router.push('/');
  }
  
  showDeleteConfirmModal.value = false;
  noteIdToDelete.value = null;
  noteTitleToDelete.value = '';
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
      notesStore.reset();
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

    <div v-else-if="showShell" class="h-screen overflow-hidden bg-ink-deep flex flex-col md:flex-row">
      <header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-quiet-outline bg-ink-low px-3 md:hidden">
        <BaseButton
          class="grid h-10 w-10 place-items-center rounded-xl border border-quiet-outline/25 bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text"
          title="Open notes"
          type="button"
          @click="mobileSidebarOpen = true"
        >
          <Menu class="h-5 w-5" aria-hidden="true" />
          <span class="sr-only">Open notes</span>
        </BaseButton>

        <BaseButton class="min-w-0 px-2 text-left flex items-center gap-2" type="button" @click="goHome">
          <Feather class="h-4.5 w-4.5 text-quiet-primary" />
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-quiet-primary">Quiet Scribe</p>
        </BaseButton>

        <SyncStatus />
      </header>

      <BaseButton
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
        title="Close notes"
        type="button"
        @click="mobileSidebarOpen = false"
      >
        <span class="sr-only">Close notes</span>
      </BaseButton>

      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-[min(320px,calc(100vw-48px))] shrink-0 flex-col border-r border-quiet-outline bg-ink-low transition-transform duration-200 md:static md:z-auto md:h-screen md:w-sidebar md:translate-x-0"
        :class="mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <header class="border-b border-quiet-outline/25 p-4 flex flex-col gap-3.5">
          <!-- Logo & Close Button (mobile only) -->
          <div class="flex items-center justify-between gap-3">
            <BaseButton
              class="min-w-0 text-left flex items-center gap-2.5 group"
              type="button"
              @click="goHome"
            >
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-quiet-primaryDeep to-quiet-primary text-quiet-primaryDeep shadow shadow-quiet-primaryDeep/10 transition-transform duration-200 group-hover:scale-105">
                <Feather class="h-4.5 w-4.5" />
              </div>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.2em] text-quiet-primary">Quiet Scribe</p>
                <h1 class="truncate text-xs font-semibold text-quiet-text">Notes Workspace</h1>
              </div>
            </BaseButton>

            <BaseButton
              class="grid h-8 w-8 place-items-center rounded-lg border border-quiet-outline/20 bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text md:hidden active:scale-[0.93]"
              title="Close sidebar"
              type="button"
              @click="mobileSidebarOpen = false"
            >
              <X class="h-4 w-4" aria-hidden="true" />
              <span class="sr-only">Close sidebar</span>
            </BaseButton>
          </div>

          <!-- Quick Actions Row -->
          <div class="flex items-center justify-between gap-2 border-t border-b border-quiet-outline/10 py-2 select-none">
            <span class="text-[10px] font-bold uppercase tracking-wider text-quiet-muted/60">Quick Actions</span>
            <div class="flex items-center gap-1.5">
              <BaseButton
                class="flex h-8 items-center gap-1.5 rounded-lg border border-quiet-outline/20 bg-ink-surface/40 px-2.5 text-xs text-quiet-muted hover:border-quiet-primary hover:text-quiet-text transition duration-150 active:scale-[0.95]"
                title="New note"
                type="button"
                @click="createNote"
              >
                <Plus class="h-3.5 w-3.5" aria-hidden="true" />
                <span>New</span>
              </BaseButton>
              <BaseButton
                class="grid h-8 w-8 place-items-center rounded-lg border border-quiet-outline/20 bg-ink-surface/40 text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text disabled:opacity-60 active:scale-[0.95]"
                :disabled="notesStore.syncing"
                title="Sync"
                type="button"
                @click="notesStore.syncNow"
              >
                <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': notesStore.syncing }" aria-hidden="true" />
                <span class="sr-only">Sync</span>
              </BaseButton>
              <BaseButton
                class="grid h-8 w-8 place-items-center rounded-lg border border-quiet-outline/20 bg-ink-surface/40 text-quiet-muted transition hover:border-quiet-danger hover:text-quiet-danger active:scale-[0.95]"
                title="Log out"
                type="button"
                @click="authStore.logout"
              >
                <LogOut class="h-3.5 w-3.5" aria-hidden="true" />
                <span class="sr-only">Log out</span>
              </BaseButton>
            </div>
          </div>

          <FieldInput
            id="search-sidebar"
            v-model="search"
            placeholder="Search workspace..."
            type="search"
          >
            <template #icon>
              <Search class="h-4 w-4" />
            </template>
            <template #right>
              <BaseButton
                v-if="search"
                type="button"
                class="text-quiet-muted/50 hover:text-quiet-text transition-colors p-1"
                @click="search = ''"
                title="Clear search"
              >
                <X class="h-4 w-4" />
              </BaseButton>
            </template>
          </FieldInput>
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

          <p v-if="!filteredNotes.length" class="px-3 py-8 text-center text-xs text-quiet-muted/65">
            No notes found
          </p>
        </div>

        <!-- Tags Filter Section in Sidebar -->
        <div v-if="allTags.length" class="border-t border-quiet-outline/15 px-4 py-3.5 max-h-[180px] overflow-y-auto select-none bg-ink-deep/10">
          <div class="mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-quiet-muted/70">
            <span class="text-[9px] font-bold tracking-wider opacity-75">Filter Tags</span>
            <BaseButton
              v-if="selectedTag"
              class="text-[9px] text-quiet-primary hover:underline lowercase font-medium"
              type="button"
              @click="selectedTag = null"
            >
              Clear
            </BaseButton>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <BaseButton
              v-for="tag in allTags"
              :key="tag.name"
              class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] border transition duration-150 active:scale-[0.96]"
              :class="selectedTag === tag.name 
                ? 'bg-quiet-primary border-quiet-primary text-quiet-primaryDeep font-semibold' 
                : 'bg-ink-surface/40 border-quiet-outline/10 text-quiet-muted hover:text-quiet-text hover:bg-ink-high'"
              type="button"
              @click="selectedTag = selectedTag === tag.name ? null : tag.name"
            >
              #{{ tag.name }}
              <span class="opacity-60 text-[9px] font-normal">({{ tag.count }})</span>
            </BaseButton>
          </div>
        </div>

        <footer class="flex items-center justify-between border-t border-quiet-outline/25 px-4 py-3 bg-ink-deep/10">
          <SyncStatus />
          <p class="text-xs text-quiet-muted/70 font-semibold">{{ notesStore.notes.length }} notes</p>
        </footer>
      </aside>

      <main class="min-w-0 flex-1 h-full overflow-hidden">
        <RouterView />
      </main>
    </div>

    <main v-else class="grid min-h-screen place-items-center bg-ink-deep px-6">
      <div class="flex flex-col items-center gap-4">
        <svg class="animate-spin h-6 w-6 text-quiet-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs font-semibold tracking-[0.1em] text-quiet-muted/80">Syncing Workspace...</p>
      </div>
    </main>

    <InstallPrompt />

    <!-- Delete Confirmation Modal (Sidebar) -->
    <Transition name="fade">
      <div v-if="showDeleteConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div class="relative w-full max-w-sm rounded-2xl border border-quiet-danger/20 bg-ink-low/95 p-6 shadow-2xl shadow-black/80 transition-all duration-300">
          <div class="mb-4 flex items-center gap-3 text-quiet-danger">
            <div class="grid h-10 w-10 place-items-center rounded-xl bg-quiet-danger/10">
              <AlertTriangle class="h-5 w-5" />
            </div>
            <h3 class="text-xs font-bold tracking-widest uppercase">Delete Note</h3>
          </div>

          <p class="text-xs leading-relaxed text-quiet-muted">
            Are you sure you want to delete <strong class="text-quiet-text font-semibold">"{{ noteTitleToDelete }}"</strong>? This will permanently delete it and cannot be undone.
          </p>

          <div class="mt-6 flex justify-end gap-3 border-t border-quiet-outline/10 pt-4">
            <BaseButton
              class="rounded-xl px-4 py-2 text-xs font-semibold bg-ink-surface/50 text-quiet-text hover:bg-ink-high border border-quiet-outline/30 transition duration-150 active:scale-[0.96]"
              type="button"
              @click="showDeleteConfirmModal = false"
            >
              Cancel
            </BaseButton>
            <BaseButton
              class="rounded-xl px-4 py-2 text-xs font-semibold bg-quiet-danger hover:bg-red-700 text-white transition duration-150 active:scale-[0.96] shadow-lg shadow-quiet-danger/10"
              type="button"
              @click="confirmDeleteNote"
            >
              Delete Note
            </BaseButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
