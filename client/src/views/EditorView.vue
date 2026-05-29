<!-- client/src/views/EditorView.vue -->
<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NoteEditor from '../components/NoteEditor.vue';
import { useNotesStore } from '../stores/notes';

const route = useRoute();
const router = useRouter();
const notesStore = useNotesStore();
const noteLoading = ref(false);
const loadedNote = ref(null);
const loadRequestId = ref(0);

const routeId = computed(() => route.params.id);
const currentNote = computed(() => {
  if (routeId.value === 'new') {
    return null;
  }

  return notesStore.notes.find((note) => note.id === routeId.value)
    ?? (loadedNote.value?.id === routeId.value ? loadedNote.value : null);
});

async function loadRouteNote(id) {
  loadRequestId.value += 1;
  const requestId = loadRequestId.value;
  loadedNote.value = null;

  if (id === 'new') {
    noteLoading.value = false;
    return;
  }

  noteLoading.value = true;

  try {
    if (!notesStore.initialized) {
      await notesStore.init();
    }

    const note = await notesStore.loadNoteById(id);

    if (requestId === loadRequestId.value) {
      loadedNote.value = note;
    }
  } finally {
    if (requestId === loadRequestId.value) {
      noteLoading.value = false;
    }
  }
}

async function saveNote(draft) {
  const saved = await notesStore.saveNote(draft);

  if (routeId.value === 'new') {
    await router.replace(`/notes/${saved.id}`);
  }
}

async function deleteCurrentNote() {
  if (routeId.value === 'new') {
    await router.push('/');
    return;
  }

  await notesStore.deleteNote(routeId.value);
  await router.push('/');
}

watch(routeId, (id) => {
  void loadRouteNote(id);
}, { immediate: true });
</script>

<template>
  <NoteEditor
    v-if="routeId === 'new' || currentNote"
    :note="currentNote"
    @delete="deleteCurrentNote"
    @save="saveNote"
  />

  <main v-else-if="noteLoading || notesStore.loading" class="grid h-full place-items-center px-6 text-center">
    <section class="max-w-sm">
      <div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-quiet-outline border-t-quiet-primary" />
      <p class="mt-4 text-xs font-semibold tracking-[0.1em] text-quiet-muted/80">Loading Note...</p>
    </section>
  </main>

  <main v-else class="grid h-full place-items-center px-6 text-center">
    <section class="max-w-sm">
      <h1 class="font-editor text-[28px] font-bold leading-9 tracking-normal text-quiet-text">Note unavailable</h1>
      <p class="mt-2 text-sm leading-6 text-quiet-muted">It may have been removed from this device.</p>
    </section>
  </main>
</template>
