<!-- client/src/components/NoteCard.vue -->
<script setup>
import { Trash2 } from 'lucide-vue-next';

defineProps({
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
</script>

<template>
  <article
    class="group grid min-h-[76px] cursor-pointer grid-cols-[1fr_auto] gap-3 rounded-app px-3 py-3 transition-colors"
    :class="active ? 'bg-ink-high text-quiet-text' : 'text-quiet-muted hover:bg-ink-surface hover:text-quiet-text'"
    @click="emit('open', note.id)"
  >
    <div class="min-w-0">
      <div class="mb-1 flex items-center gap-2">
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="note.synced ? 'bg-quiet-primary' : 'bg-quiet-amber'"
        />
        <h2 class="truncate text-sm font-semibold tracking-normal">
          {{ note.title || 'Untitled' }}
        </h2>
      </div>
      <p class="line-clamp-2 text-xs leading-5 text-quiet-muted">
        {{ note.body || 'No body text' }}
      </p>
    </div>

    <button
      class="grid h-8 w-8 place-items-center rounded-app text-quiet-muted opacity-0 transition hover:bg-ink-highest hover:text-quiet-danger group-hover:opacity-100"
      title="Delete note"
      type="button"
      @click.stop="emit('delete', note.id)"
    >
      <Trash2 class="h-4 w-4" aria-hidden="true" />
      <span class="sr-only">Delete note</span>
    </button>
  </article>
</template>
