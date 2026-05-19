<!-- client/src/components/NoteEditor.vue -->
<script setup>
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { Check, Trash2 } from 'lucide-vue-next';
import { useDebounceFn } from '@vueuse/core';

const props = defineProps({
  note: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['save', 'delete']);

const title = ref('');
const body = ref('');
const hydrated = ref(false);
const lastSnapshot = ref('');

const snapshot = computed(() =>
  JSON.stringify({
    id: props.note?.id ?? null,
    title: title.value,
    body: body.value,
  }),
);

function payload() {
  return {
    id: props.note?.id,
    title: title.value,
    body: body.value,
    createdAt: props.note?.createdAt,
  };
}

const debouncedSave = useDebounceFn(() => {
  if (!hydrated.value) {
    return;
  }

  if (!props.note && !title.value.trim() && !body.value.trim()) {
    return;
  }

  lastSnapshot.value = snapshot.value;
  emit('save', payload());
}, 500);

watch(
  () => props.note,
  async (note) => {
    hydrated.value = false;
    title.value = note?.title ?? '';
    body.value = note?.body ?? '';
    await nextTick();
    lastSnapshot.value = snapshot.value;
    hydrated.value = true;
  },
  { immediate: true },
);

watchEffect(() => {
  const currentSnapshot = snapshot.value;

  if (hydrated.value && currentSnapshot !== lastSnapshot.value) {
    debouncedSave();
  }
});
</script>

<template>
  <section class="mx-auto flex min-h-screen w-full max-w-editor flex-col px-5 py-8 md:px-8 md:py-12">
    <header class="mb-8 flex items-center justify-end gap-2">
      <button
        class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text"
        title="Save now"
        type="button"
        @click="emit('save', payload())"
      >
        <Check class="h-4 w-4" aria-hidden="true" />
        <span class="sr-only">Save now</span>
      </button>

      <button
        v-if="note"
        class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-danger hover:text-quiet-danger"
        title="Delete note"
        type="button"
        @click="emit('delete')"
      >
        <Trash2 class="h-4 w-4" aria-hidden="true" />
        <span class="sr-only">Delete note</span>
      </button>
    </header>

    <input
      v-model="title"
      class="mb-6 w-full bg-transparent font-editor text-[32px] font-bold leading-10 tracking-normal text-quiet-text outline-none placeholder:text-quiet-muted/45"
      maxlength="160"
      placeholder="Untitled"
      type="text"
    />

    <textarea
      v-model="body"
      class="min-h-[60vh] w-full flex-1 resize-none bg-transparent font-editor text-lg leading-8 tracking-normal text-quiet-text outline-none placeholder:text-quiet-muted/45"
      placeholder="Start writing..."
    />
  </section>
</template>
