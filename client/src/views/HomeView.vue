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
  Tag,
  X,
  CheckSquare
} from 'lucide-vue-next';
import { useNotesStore } from '../stores/notes';
import FieldInput from '../components/FieldInput.vue';

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

// Helper: Calculate todo progress in body
function getTodoProgress(bodyHtml) {
  if (!bodyHtml) return null;
  try {
    const doc = new DOMParser().parseFromString(bodyHtml, 'text/html');
    const checkboxes = doc.querySelectorAll('input[type="checkbox"]');
    if (!checkboxes.length) return null;
    const checked = Array.from(checkboxes).filter(cb => cb.checked || cb.hasAttribute('checked')).length;
    return {
      completed: checked,
      total: checkboxes.length,
      percent: Math.round((checked / checkboxes.length) * 100),
    };
  } catch (e) {
    return null;
  }
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
      .slice(0, 12);
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

// Card theme color mappings matching the editor themes, now with visual polish and glassmorphism styling
function getCardColorClass(color) {
  const maps = {
    default: 'bg-ink-surface/40 hover:bg-ink-surface/60 border-quiet-outline/25 hover:border-quiet-primary/40 text-quiet-text',
    lavender: 'bg-purple-950/10 hover:bg-purple-950/20 border-purple-800/30 hover:border-purple-500/40 text-purple-100',
    forest: 'bg-emerald-950/10 hover:bg-emerald-950/20 border-emerald-800/30 hover:border-emerald-500/40 text-emerald-100',
    ocean: 'bg-cyan-950/10 hover:bg-cyan-950/20 border-cyan-800/30 hover:border-cyan-500/40 text-cyan-100',
    sunset: 'bg-amber-950/10 hover:bg-amber-950/20 border-amber-800/30 hover:border-amber-500/40 text-amber-100',
    rose: 'bg-rose-950/10 hover:bg-rose-950/20 border-rose-800/30 hover:border-rose-500/40 text-rose-100',
    clay: 'bg-orange-950/10 hover:bg-orange-950/20 border-orange-800/30 hover:border-orange-500/40 text-orange-100',
    cyberpunk: 'bg-yellow-950/10 hover:bg-yellow-950/20 border-yellow-500/30 hover:border-yellow-400/50 text-yellow-100',
  };
  return maps[color] || maps.default;
}

// Accent colors maps for custom bullet details
function getThemeAccentColor(color) {
  const accents = {
    default: '#a9cfb7',
    lavender: '#d8b4fe',
    forest: '#34d399',
    ocean: '#22d3ee',
    sunset: '#fbbf24',
    rose: '#fda4af',
    clay: '#fb923c',
    cyberpunk: '#facc15',
  };
  return accents[color] || accents.default;
}

function createNote() {
  router.push('/notes/new');
}

function openNote(id) {
  router.push(`/notes/${id}`);
}
</script>

<template>
  <main class="h-full bg-ink-deep p-6 md:p-10 lg:p-12 overflow-y-auto relative">
    
    <!-- Ambient Background Accents -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-[10%] -right-[10%] h-[30vw] w-[30vw] rounded-full bg-quiet-primary/5 blur-[80px]" />
      <div class="absolute top-[40%] -left-[10%] h-[25vw] w-[25vw] rounded-full bg-quiet-secondary/5 blur-[80px]" />
    </div>

    <div class="relative z-10">
      <!-- Dashboard Heading and Stats -->
      <header class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-quiet-primary">Quiet Scribe</p>
          <h1 class="font-outfit text-3xl font-bold tracking-tight text-quiet-text mt-1">Dashboard</h1>
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex items-center gap-3">
          <button
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-quiet-primary px-4 text-sm font-semibold text-quiet-primaryDeep transition-all duration-200 hover:bg-[#c5ecd2] hover:shadow-lg hover:shadow-quiet-primary/10 active:scale-[0.98]"
            type="button"
            @click="createNote"
          >
            <Plus class="h-4.5 w-4.5" aria-hidden="true" />
            New Note
          </button>
          <button
            class="grid h-10 w-10 place-items-center rounded-xl border border-quiet-outline/35 bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text disabled:opacity-60 active:scale-[0.95]"
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
        <div class="rounded-xl border border-quiet-outline/20 bg-ink-low/40 backdrop-blur-md p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-quiet-primary/20">
          <div class="grid h-10 w-10 place-items-center rounded-lg bg-quiet-primary/10 text-quiet-primary shadow-inner">
            <FileText class="h-5 w-5" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-quiet-muted/70">Total Notes</p>
            <h3 class="text-xl font-bold text-quiet-text mt-0.5 font-outfit">{{ notesStore.notes.length }}</h3>
          </div>
        </div>

        <div class="rounded-xl border border-quiet-outline/20 bg-ink-low/40 backdrop-blur-md p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-quiet-amber/20">
          <div class="grid h-10 w-10 place-items-center rounded-lg bg-quiet-amber/10 text-quiet-amber shadow-inner">
            <Pin class="h-5 w-5 fill-current" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-quiet-muted/70">Pinned</p>
            <h3 class="text-xl font-bold text-quiet-text mt-0.5 font-outfit">
              {{ notesStore.notes.filter(n => n.pinned).length }}
            </h3>
          </div>
        </div>

        <div class="rounded-xl border border-quiet-outline/20 bg-ink-low/40 backdrop-blur-md p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-quiet-secondary/20">
          <div class="grid h-10 w-10 place-items-center rounded-lg bg-quiet-secondary/10 text-quiet-secondary shadow-inner">
            <Tag class="h-5 w-5" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-quiet-muted/70">Unique Tags</p>
            <h3 class="text-xl font-bold text-quiet-text mt-0.5 font-outfit">{{ uniqueTagsCount }}</h3>
          </div>
        </div>

        <div class="rounded-xl border border-quiet-outline/20 bg-ink-low/40 backdrop-blur-md p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-quiet-primary/20">
          <div class="grid h-10 w-10 place-items-center rounded-lg bg-quiet-primary/10 text-quiet-primary shadow-inner">
            <Cloud class="h-5 w-5" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-quiet-muted/70">Sync Status</p>
            <h3 class="text-xs font-bold mt-1.5" :class="notesStore.hasUnsynced ? 'text-quiet-amber' : 'text-quiet-primary'">
              {{ notesStore.hasUnsynced ? 'Pending Sync' : 'Synced' }}
            </h3>
          </div>
        </div>
      </section>

      <!-- Search, Filters and Layout Selector Controls -->
      <section class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-quiet-outline/10 pb-5">
        <!-- Search Input -->
        <div class="w-full md:max-w-md">
          <FieldInput
            id="search-dashboard"
            v-model="searchDashboard"
            placeholder="Search notes..."
            type="search"
          >
            <template #icon>
              <Search class="h-4 w-4" />
            </template>
            <template #right>
              <button
                v-if="searchDashboard"
                type="button"
                class="text-quiet-muted/50 hover:text-quiet-text transition-colors p-1"
                @click="searchDashboard = ''"
                title="Clear search"
              >
                <X class="h-4 w-4" />
              </button>
            </template>
          </FieldInput>
        </div>

        <!-- Layout Toggles and Tag Reset -->
        <div class="flex items-center gap-3 self-end md:self-auto">
          <button
            v-if="activeDashboardTag"
            class="text-xs text-quiet-primary border border-quiet-primary/25 rounded-lg px-2.5 py-1 bg-quiet-primaryDeep/15 hover:bg-quiet-primaryDeep/30 transition duration-150 flex items-center gap-1.5"
            type="button"
            @click="activeDashboardTag = null"
          >
            <span>Tag: #{{ activeDashboardTag }}</span>
            <X class="h-3 w-3 opacity-60 hover:opacity-100" />
          </button>

          <div class="flex rounded-lg border border-quiet-outline/25 bg-ink-low/40 p-1 select-none">
            <button
              class="grid h-7 w-7 place-items-center rounded-md transition duration-150 active:scale-[0.9]"
              :class="viewLayout === 'grid' ? 'bg-ink-high text-quiet-primary shadow-sm' : 'text-quiet-muted hover:text-quiet-text'"
              title="Grid Layout"
              type="button"
              @click="viewLayout = 'grid'"
            >
              <Grid class="h-4 w-4" />
            </button>
            <button
              class="grid h-7 w-7 place-items-center rounded-md transition duration-150 active:scale-[0.9]"
              :class="viewLayout === 'list' ? 'bg-ink-high text-quiet-primary shadow-sm' : 'text-quiet-muted hover:text-quiet-text'"
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
        <h4 class="text-[10px] font-bold uppercase tracking-wider text-quiet-muted/65 mb-3 flex items-center gap-1.5">
          <Tag class="h-3 w-3" /> Filter by tag
        </h4>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in popularTags"
            :key="tag.name"
            class="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition duration-150 active:scale-[0.96]"
            :class="activeDashboardTag === tag.name 
              ? 'bg-quiet-primary border-quiet-primary text-quiet-primaryDeep font-semibold shadow-md shadow-quiet-primary/5' 
              : 'bg-ink-low/40 backdrop-blur bg-opacity-70 hover:bg-ink-surface text-quiet-muted border-quiet-outline/15 hover:border-quiet-outline/35 hover:text-quiet-text'"
            type="button"
            @click="activeDashboardTag = activeDashboardTag === tag.name ? null : tag.name"
          >
            #{{ tag.name }}
            <span class="opacity-60 text-[10px]" :class="activeDashboardTag === tag.name ? 'text-quiet-primaryDeep font-bold' : ''">({{ tag.count }})</span>
          </button>
        </div>
      </section>

      <!-- Empty State -->
      <div v-if="!processedNotes.length" class="text-center py-20 bg-ink-low/20 rounded-2xl border border-dashed border-quiet-outline/25 backdrop-blur-sm">
        <div class="h-12 w-12 rounded-full bg-quiet-outline/10 text-quiet-muted/60 mx-auto flex items-center justify-center mb-4">
          <FileText class="h-6 w-6" />
        </div>
        <h3 class="font-outfit text-xl font-bold text-quiet-text">No notes found</h3>
        <p class="text-xs text-quiet-muted/70 mt-2 max-w-sm mx-auto leading-relaxed">
          Adjust your search filters, reset selected tags, or create a brand new note to begin writing.
        </p>
        <button
          class="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-quiet-primary px-4 text-xs font-semibold text-quiet-primaryDeep transition hover:bg-[#c5ecd2] active:scale-[0.96]"
          type="button"
          @click="createNote"
        >
          <Plus class="h-4 w-4" />
          Create Note
        </button>
      </div>

      <!-- Pinned Notes Section -->
      <section v-if="pinnedNotes.length" class="mb-10">
        <div class="flex items-center gap-2 mb-4">
          <Pin class="h-4 w-4 text-quiet-amber fill-current" />
          <h2 class="text-[10px] font-bold uppercase tracking-widest text-quiet-muted/65">Pinned Notes</h2>
        </div>
        
        <div
          :class="viewLayout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-3'"
        >
          <div
            v-for="note in pinnedNotes"
            :key="note.id"
            :class="[getCardColorClass(note.color), viewLayout === 'grid' ? 'flex-col h-[190px] p-5 justify-between' : 'flex-col sm:flex-row sm:items-center p-4 justify-between gap-3 sm:gap-6']"
            class="flex rounded-2xl border cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
            @click="openNote(note.id)"
          >
            <!-- Card Body / Content -->
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2.5">
                <h3 class="truncate text-base font-semibold text-quiet-text">{{ note.title || 'Untitled' }}</h3>
                <Pin class="h-3.5 w-3.5 text-quiet-amber shrink-0 fill-current mt-1" />
              </div>
              <p class="text-xs leading-relaxed opacity-75 mt-2 font-light text-quiet-muted" :class="viewLayout === 'grid' ? 'line-clamp-3' : 'line-clamp-1'">
                {{ stripHtml(note.body) || 'No body text' }}
              </p>

              <!-- Checklist progress bar -->
              <div v-if="getTodoProgress(note.body)" class="mt-2.5 flex items-center gap-2">
                <div class="h-1.5 w-20 overflow-hidden rounded bg-black/40">
                  <div 
                    class="h-full rounded transition-all duration-300"
                    :style="{ width: `${getTodoProgress(note.body).percent}%`, backgroundColor: getThemeAccentColor(note.color) }"
                  />
                </div>
                <span class="text-[9px] tracking-wide text-quiet-muted/70 font-semibold">
                  {{ getTodoProgress(note.body).completed }}/{{ getTodoProgress(note.body).total }} tasks ({{ getTodoProgress(note.body).percent }}%)
                </span>
              </div>
            </div>
            
            <!-- Card Meta (Date & Tags) -->
            <div 
              :class="viewLayout === 'grid' ? 'border-t border-quiet-outline/10 pt-3 mt-3 w-full flex items-center justify-between text-[11px] text-quiet-muted/60' : 'sm:border-l sm:border-quiet-outline/10 sm:pl-5 sm:pt-0 pt-2 border-t border-quiet-outline/10 sm:border-t-0 flex flex-row sm:flex-col sm:items-end justify-between sm:justify-center shrink-0 min-w-[130px] gap-2 text-[11px] text-quiet-muted/60'"
            >
              <div class="flex items-center gap-1.5">
                <Calendar class="h-3.5 w-3.5 opacity-60" />
                <span>{{ formatDate(note.updatedAt) }}</span>
              </div>
              
              <div v-if="note.tags && note.tags.length" class="flex gap-1.5 overflow-hidden max-w-[60%] sm:max-w-none">
                <span v-for="tag in note.tags.slice(0, 2)" :key="tag" class="text-[9px] bg-black/20 border border-quiet-outline/10 px-1.5 py-0.5 rounded-md text-quiet-muted/80">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent Notes Section -->
      <section v-if="recentNotes.length">
        <div class="flex items-center gap-2 mb-4">
          <FileText class="h-4 w-4 text-quiet-muted/60" />
          <h2 class="text-[10px] font-bold uppercase tracking-widest text-quiet-muted/65">Recent Notes</h2>
        </div>
        
        <div
          :class="viewLayout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'flex flex-col gap-3'"
        >
          <div
            v-for="note in recentNotes"
            :key="note.id"
            :class="[getCardColorClass(note.color), viewLayout === 'grid' ? 'flex-col h-[190px] p-5 justify-between' : 'flex-col sm:flex-row sm:items-center p-4 justify-between gap-3 sm:gap-6']"
            class="flex rounded-2xl border cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
            @click="openNote(note.id)"
          >
            <!-- Card Body / Content -->
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-semibold text-quiet-text">{{ note.title || 'Untitled' }}</h3>
              <p class="text-xs leading-relaxed opacity-75 mt-2 font-light text-quiet-muted" :class="viewLayout === 'grid' ? 'line-clamp-3' : 'line-clamp-1'">
                {{ stripHtml(note.body) || 'No body text' }}
              </p>

              <!-- Checklist progress bar -->
              <div v-if="getTodoProgress(note.body)" class="mt-2.5 flex items-center gap-2">
                <div class="h-1.5 w-20 overflow-hidden rounded bg-black/40">
                  <div 
                    class="h-full rounded transition-all duration-300"
                    :style="{ width: `${getTodoProgress(note.body).percent}%`, backgroundColor: getThemeAccentColor(note.color) }"
                  />
                </div>
                <span class="text-[9px] tracking-wide text-quiet-muted/70 font-semibold">
                  {{ getTodoProgress(note.body).completed }}/{{ getTodoProgress(note.body).total }} tasks ({{ getTodoProgress(note.body).percent }}%)
                </span>
              </div>
            </div>
            
            <!-- Card Meta (Date & Tags) -->
            <div 
              :class="viewLayout === 'grid' ? 'border-t border-quiet-outline/10 pt-3 mt-3 w-full flex items-center justify-between text-[11px] text-quiet-muted/60' : 'sm:border-l sm:border-quiet-outline/10 sm:pl-5 sm:pt-0 pt-2 border-t border-quiet-outline/10 sm:border-t-0 flex flex-row sm:flex-col sm:items-end justify-between sm:justify-center shrink-0 min-w-[130px] gap-2 text-[11px] text-quiet-muted/60'"
            >
              <div class="flex items-center gap-1.5">
                <Calendar class="h-3.5 w-3.5 opacity-60" />
                <span>{{ formatDate(note.updatedAt) }}</span>
              </div>
              
              <div v-if="note.tags && note.tags.length" class="flex gap-1.5 overflow-hidden max-w-[60%] sm:max-w-none">
                <span v-for="tag in note.tags.slice(0, 2)" :key="tag" class="text-[9px] bg-black/20 border border-quiet-outline/10 px-1.5 py-0.5 rounded-md text-quiet-muted/80">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
