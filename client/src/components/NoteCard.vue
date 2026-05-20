<!-- client/src/components/NoteCard.vue -->
<script setup>
import { computed } from 'vue';
import { Pin, Trash2 } from 'lucide-vue-next';

const props = defineProps({
  note: {
    type: Object,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['open', 'delete']);

// Strip HTML tags for note card content preview
const cleanBodyPreview = computed(() => {
  if (!props.note.body) return 'No body text';
  const html = props.note.body;
  // Use a DOM parser to clean out tags safely
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent || doc.body.innerText || '';
    return text.trim() || 'No body text';
  } catch (e) {
    // Fallback simple regex
    return html.replace(/<[^>]*>/g, '').trim() || 'No body text';
  }
});

// Compute checklist progress
const todoProgress = computed(() => {
  if (!props.note.body) return null;
  try {
    const doc = new DOMParser().parseFromString(props.note.body, 'text/html');
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
});

// Dynamic border and background classes based on selected note color
const cardClasses = computed(() => {
  const activeColorMap = {
    default: 'bg-ink-high border-transparent text-quiet-text',
    lavender: 'bg-purple-950/40 border-purple-800/40 text-purple-100',
    forest: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-100',
    ocean: 'bg-cyan-950/40 border-cyan-800/40 text-cyan-100',
    sunset: 'bg-amber-950/40 border-amber-800/40 text-amber-100',
    rose: 'bg-rose-950/40 border-rose-800/40 text-rose-100',
    clay: 'bg-orange-950/40 border-orange-800/40 text-orange-100',
    cyberpunk: 'bg-yellow-950/30 border-yellow-500/50 text-yellow-100',
  };

  const inactiveColorMap = {
    default: 'text-quiet-muted hover:bg-ink-surface hover:text-quiet-text border-transparent',
    lavender: 'bg-purple-950/20 hover:bg-purple-950/30 border-purple-900/20 text-purple-200/90',
    forest: 'bg-emerald-950/20 hover:bg-emerald-950/30 border-emerald-900/20 text-emerald-200/90',
    ocean: 'bg-cyan-950/20 hover:bg-cyan-950/30 border-cyan-900/20 text-cyan-200/90',
    sunset: 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-900/20 text-amber-200/90',
    rose: 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/20 text-rose-200/90',
    clay: 'bg-orange-950/20 hover:bg-orange-950/30 border-orange-900/20 text-orange-200/90',
    cyberpunk: 'bg-yellow-950/10 hover:bg-yellow-950/20 border-yellow-500/20 text-yellow-200/90',
  };

  const color = props.note.color || 'default';
  const mapping = props.active ? activeColorMap : inactiveColorMap;
  return `${mapping[color] || mapping.default} border`;
});
</script>

<template>
  <article
    class="group grid min-h-[82px] cursor-pointer grid-cols-[1fr_auto] gap-3 rounded-app px-3 py-3 transition-all duration-200 my-1.5"
    :class="cardClasses"
    @click="emit('open', note.id)"
  >
    <div class="min-w-0 flex flex-col justify-between">
      <div>
        <div class="mb-1 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="note.synced ? 'bg-quiet-primary' : 'bg-quiet-amber'"
              :title="note.synced ? 'Synced' : 'Syncing / Pending Sync'"
            />
            <h2 class="truncate text-sm font-semibold tracking-normal">
              {{ note.title || 'Untitled' }}
            </h2>
          </div>
          <Pin
            v-if="note.pinned"
            class="h-3 w-3 shrink-0 text-quiet-amber"
            aria-hidden="true"
          />
        </div>
        <p class="line-clamp-2 text-xs leading-5 opacity-80">
          {{ cleanBodyPreview }}
        </p>

        <!-- Checklist progress bar -->
        <div v-if="todoProgress" class="mt-2 flex items-center gap-2">
          <div class="h-1.5 w-20 overflow-hidden rounded bg-black/35">
            <div 
              class="h-full rounded transition-all duration-300"
              :style="{ width: `${todoProgress.percent}%`, backgroundColor: note.color === 'default' ? '#a9cfb7' : 'currentColor' }"
            />
          </div>
          <span class="text-[9px] tracking-wide text-quiet-muted opacity-80">
            {{ todoProgress.completed }}/{{ todoProgress.total }} tasks ({{ todoProgress.percent }}%)
          </span>
        </div>
      </div>

      <!-- Tag list inside note card -->
      <div v-if="note.tags && note.tags.length" class="mt-2 flex flex-wrap gap-1">
        <span
          v-for="tag in note.tags"
          :key="tag"
          class="rounded bg-black/30 px-1.5 py-0.5 text-[10px] tracking-wide text-quiet-muted/90"
        >
          #{{ tag }}
        </span>
      </div>
    </div>

    <div class="flex items-center">
      <button
        class="grid h-8 w-8 place-items-center rounded-app text-quiet-muted opacity-0 transition-opacity hover:bg-black/20 hover:text-quiet-danger group-hover:opacity-100"
        title="Delete note"
        type="button"
        @click.stop="emit('delete', note.id)"
      >
        <Trash2 class="h-4 w-4" aria-hidden="true" />
        <span class="sr-only">Delete note</span>
      </button>
    </div>
  </article>
</template>
