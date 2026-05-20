<!-- client/src/views/HomeView.vue -->
<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Calendar,
  Cloud,
  FileText,
  Grid,
  List,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Tag
} from 'lucide-vue-next';
import { useNotesStore } from '../stores/notes';

const router = useRouter();
const notesStore = useNotesStore();

const viewLayout = ref(localStorage.getItem('dashboard-layout') || 'grid');
const searchDashboard = ref('');
const activeDashboardTag = ref(null);

watch(viewLayout, (newLayout) => {
  localStorage.setItem('dashboard-layout', newLayout);
});

// Helper: Strip HTML tags for card body snippet
function stripHtml(html) {
  if (!html) return '';
  // Redact secret text content before stripping tags
  const redacted = html.replace(/<span[^>]*class="[^"]*secret-text[^"]*"[^>]*>.*?<\/span>/gi, '•••');
  return redacted.replace(/<[^>]*>/g, '').trim();
}

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

// Helper: Format ISO date to user-friendly string
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Compute total unique tags count
const uniqueTagsCount = computed(() => {
  const tagsSet = new Set();
  notesStore.notes.forEach((note) => {
    if (Array.isArray(note.tags)) {
      note.tags.forEach((tag) => tagsSet.add(tag));
    }
  });
  return tagsSet.size;
});

// Compute list of tags to display on dashboard
const popularTags = computed(() => {
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
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10);
});

// Filter notes for the dashboard main display
const processedNotes = computed(() => {
  let list = notesStore.notes;

  // 1. Tag filtering
  if (activeDashboardTag.value) {
    list = list.filter((note) => Array.isArray(note.tags) && note.tags.includes(activeDashboardTag.value));
  }

  // 2. Query search
  const query = normalizeText(searchDashboard.value);
  if (query) {
    list = list.filter((note) => {
      const titleNorm = normalizeText(note.title);
      const bodyNorm = normalizeText(note.body);
      const tagsNorm = Array.isArray(note.tags) ? note.tags.join(' ').toLowerCase() : '';
      const indexContent = `${titleNorm} ${bodyNorm} ${tagsNorm}`;
      return indexContent.includes(query);
    });
  }

  return list;
});

// Pinned notes
const pinnedNotes = computed(() => {
  return processedNotes.value.filter((note) => note.pinned);
});

// Non-pinned notes
const recentNotes = computed(() => {
  return processedNotes.value.filter((note) => !note.pinned);
});

// Card theme color map matching the editor settings
function getCardColorClass(color) {
  const maps = {
    default: 'bg-ink-surface/50 border-quiet-outline/20 hover:border-quiet-primary text-quiet-text',
    lavender: 'bg-purple-950/15 hover:bg-purple-950/25 border-purple-800/30 text-purple-100',
    forest: 'bg-emerald-950/15 hover:bg-emerald-950/25 border-emerald-800/30 text-emerald-100',
    ocean: 'bg-cyan-950/15 hover:bg-cyan-950/25 border-cyan-800/30 text-cyan-100',
    sunset: 'bg-amber-950/15 hover:bg-amber-950/25 border-amber-800/30 text-amber-100',
    rose: 'bg-rose-950/15 hover:bg-rose-950/25 border-rose-800/30 text-rose-100',
    clay: 'bg-orange-950/15 hover:bg-orange-950/25 border-orange-800/30 text-orange-100',
    cyberpunk: 'bg-yellow-950/10 hover:bg-yellow-950/20 border-yellow-500/25 text-yellow-100',
  };
  return maps[color] || maps.default;
}

function createNote() {
  router.push('/notes/new');
}

function openNote(id) {
  router.push(`/notes/${id}`);
}

async function deleteNote(id) {
  await notesStore.deleteNote(id);
}
</script>

<template>
  <main class="h-full bg-ink-deep p-6 md:p-10 lg:p-12 overflow-y-auto">
    <!-- Dashboard Heading and Stats -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-quiet-primary">Quiet Scribe</p>
        <h1 class="font-editor text-3xl font-bold leading-10 text-quiet-text">Dashboard</h1>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-3">
        <button
          class="inline-flex h-10 items-center gap-2 rounded-app bg-quiet-primary px-4 text-sm font-semibold text-quiet-primaryDeep transition hover:bg-[#c5ecd2]"
          type="button"
          @click="createNote"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          New Note
        </button>
        <button
          class="grid h-10 w-10 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text"
          :class="{ 'animate-spin': notesStore.syncing }"
          :disabled="notesStore.syncing"
          title="Force Sync Now"
          type="button"
          @click="notesStore.syncNow"
        >
          <RefreshCw class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- Stats Cards Grid -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="rounded-app border border-quiet-outline/25 bg-ink-low/75 p-4 flex items-center gap-4">
        <div class="grid h-10 w-10 place-items-center rounded-full bg-quiet-primary/10 text-quiet-primary">
          <FileText class="h-5 w-5" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-quiet-muted">Total Notes</p>
          <h3 class="text-xl font-bold text-quiet-text mt-0.5">{{ notesStore.notes.length }}</h3>
        </div>
      </div>

      <div class="rounded-app border border-quiet-outline/25 bg-ink-low/75 p-4 flex items-center gap-4">
        <div class="grid h-10 w-10 place-items-center rounded-full bg-quiet-amber/10 text-quiet-amber">
          <Pin class="h-5 w-5 fill-current" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-quiet-muted">Pinned Notes</p>
          <h3 class="text-xl font-bold text-quiet-text mt-0.5">
            {{ notesStore.notes.filter(n => n.pinned).length }}
          </h3>
        </div>
      </div>

      <div class="rounded-app border border-quiet-outline/25 bg-ink-low/75 p-4 flex items-center gap-4">
        <div class="grid h-10 w-10 place-items-center rounded-full bg-quiet-secondary/10 text-quiet-secondary">
          <Tag class="h-5 w-5" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-quiet-muted">Unique Tags</p>
          <h3 class="text-xl font-bold text-quiet-text mt-0.5">{{ uniqueTagsCount }}</h3>
        </div>
      </div>

      <div class="rounded-app border border-quiet-outline/25 bg-ink-low/75 p-4 flex items-center gap-4">
        <div class="grid h-10 w-10 place-items-center rounded-full bg-quiet-primary/10 text-quiet-primary">
          <Cloud class="h-5 w-5" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-quiet-muted">Sync Status</p>
          <h3 class="text-sm font-bold text-quiet-text mt-1">
            {{ notesStore.hasUnsynced ? 'Pending Sync' : 'All Synced' }}
          </h3>
        </div>
      </div>
    </section>

    <!-- Search, Filters and Layout Selector Controls -->
    <section class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-quiet-outline/20 pb-5">
      <!-- Search Input -->
      <div class="relative w-full md:max-w-md">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet-muted" aria-hidden="true" />
        <input
          v-model="searchDashboard"
          class="h-10 w-full rounded-app border border-quiet-outline/35 bg-ink-low pl-9 pr-3 text-sm text-quiet-text outline-none transition placeholder:text-quiet-muted/40 focus:border-quiet-primary focus:bg-ink-surface"
          placeholder="Search dashboard notes..."
          type="search"
        />
      </div>

      <!-- Layout Toggles and Tag Reset -->
      <div class="flex items-center gap-3 self-end md:self-auto">
        <button
          v-if="activeDashboardTag"
          class="text-xs text-quiet-primary border border-quiet-primary/35 rounded px-2.5 py-1 bg-quiet-primaryDeep/20 hover:bg-quiet-primaryDeep/40 transition"
          type="button"
          @click="activeDashboardTag = null"
        >
          Tag: #{{ activeDashboardTag }} ×
        </button>

        <div class="flex rounded-app border border-quiet-outline/35 bg-ink-low p-1 select-none">
          <button
            class="grid h-7 w-7 place-items-center rounded-sm transition"
            :class="viewLayout === 'grid' ? 'bg-ink-high text-quiet-primary' : 'text-quiet-muted hover:text-quiet-text'"
            title="Grid Layout"
            type="button"
            @click="viewLayout = 'grid'"
          >
            <Grid class="h-4 w-4" />
          </button>
          <button
            class="grid h-7 w-7 place-items-center rounded-sm transition"
            :class="viewLayout === 'list' ? 'bg-ink-high text-quiet-primary' : 'text-quiet-muted hover:text-quiet-text'"
            title="List Layout"
            type="button"
            @click="viewLayout = 'list'"
          >
            <List class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- Popular Tags Toolbar -->
    <section v-if="popularTags.length" class="mb-8 select-none">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-quiet-muted mb-2.5">Filter by Tag</h4>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in popularTags"
          :key="tag.name"
          class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition duration-150"
          :class="activeDashboardTag === tag.name 
            ? 'bg-quiet-primary border-quiet-primary text-quiet-primaryDeep font-semibold' 
            : 'bg-ink-low hover:bg-ink-surface text-quiet-muted border-quiet-outline/25 hover:text-quiet-text'"
          type="button"
          @click="activeDashboardTag = activeDashboardTag === tag.name ? null : tag.name"
        >
          #{{ tag.name }}
          <span class="opacity-75 text-[10px]">({{ tag.count }})</span>
        </button>
      </div>
    </section>

    <!-- Empty State -->
    <div v-if="!processedNotes.length" class="text-center py-20 bg-ink-low/20 rounded-xl border border-dashed border-quiet-outline/20">
      <h3 class="font-editor text-xl font-bold text-quiet-text">No notes found</h3>
      <p class="text-sm text-quiet-muted mt-2 max-w-sm mx-auto">
        Adjust your search or filter tags, or create a brand new note to begin your journey.
      </p>
      <button
        class="mt-5 inline-flex h-9 items-center gap-2 rounded-app bg-quiet-primary px-4 text-xs font-semibold text-quiet-primaryDeep transition hover:bg-[#c5ecd2]"
        type="button"
        @click="createNote"
      >
        <Plus class="h-3.5 w-3.5" />
        New Note
      </button>
    </div>

    <!-- Pinned Notes Section -->
    <section v-if="pinnedNotes.length" class="mb-10">
      <div class="flex items-center gap-2 mb-4">
        <Pin class="h-4 w-4 text-quiet-amber fill-current" />
        <h2 class="text-xs font-semibold uppercase tracking-wider text-quiet-muted">Pinned Notes</h2>
      </div>
      
      <div
        :class="viewLayout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-3'"
      >
        <div
          v-for="note in pinnedNotes"
          :key="note.id"
          :class="[getCardColorClass(note.color), viewLayout === 'grid' ? 'flex-col h-[180px] p-5 justify-between' : 'flex-row items-center p-4 gap-4']"
          class="flex rounded-app border cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg shadow-black/40"
          @click="openNote(note.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="truncate text-base font-bold text-quiet-text">{{ note.title || 'Untitled' }}</h3>
              <Pin class="h-3.5 w-3.5 text-quiet-amber shrink-0 fill-current mt-1" />
            </div>
            <p class="text-sm leading-6 opacity-75 line-clamp-3 mt-1.5 font-light">
              {{ stripHtml(note.body) || 'No body text' }}
            </p>
          </div>
          
          <div class="flex items-center justify-between border-t border-quiet-outline/10 pt-3 mt-3 text-xs text-quiet-muted/70">
            <div class="flex items-center gap-1.5">
              <Calendar class="h-3 w-3" />
              <span>{{ formatDate(note.updatedAt) }}</span>
            </div>
            
            <div v-if="note.tags && note.tags.length" class="flex gap-1 overflow-hidden max-w-[50%]">
              <span v-for="tag in note.tags.slice(0, 2)" :key="tag" class="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Notes Section -->
    <section v-if="recentNotes.length">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-quiet-muted mb-4">Recent Notes</h2>
      
      <div
        :class="viewLayout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-3'"
      >
        <div
          v-for="note in recentNotes"
          :key="note.id"
          :class="[getCardColorClass(note.color), viewLayout === 'grid' ? 'flex-col h-[180px] p-5 justify-between' : 'flex-row items-center p-4 gap-4']"
          class="flex rounded-app border cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg shadow-black/40"
          @click="openNote(note.id)"
        >
          <div class="min-w-0 flex-1">
            <h3 class="truncate text-base font-bold text-quiet-text">{{ note.title || 'Untitled' }}</h3>
            <p class="text-sm leading-6 opacity-75 line-clamp-3 mt-1.5 font-light">
              {{ stripHtml(note.body) || 'No body text' }}
            </p>
          </div>
          
          <div class="flex items-center justify-between border-t border-quiet-outline/10 pt-3 mt-3 text-xs text-quiet-muted/70">
            <div class="flex items-center gap-1.5">
              <Calendar class="h-3 w-3" />
              <span>{{ formatDate(note.updatedAt) }}</span>
            </div>
            
            <div v-if="note.tags && note.tags.length" class="flex gap-1 overflow-hidden max-w-[50%]">
              <span v-for="tag in note.tags.slice(0, 2)" :key="tag" class="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
