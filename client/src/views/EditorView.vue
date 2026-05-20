<!-- client/src/views/EditorView.vue -->
<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NoteEditor from '../components/NoteEditor.vue';
import { useNotesStore } from '../stores/notes';

const route = useRoute();
const router = useRouter();
const notesStore = useNotesStore();

const routeId = computed(() => route.params.id);
const currentNote = computed(() => {
  if (routeId.value === 'new') {
    return null;
  }

  return notesStore.notes.find((note) => note.id === routeId.value) ?? null;
});

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
</script>

<template>
  <NoteEditor
    v-if="routeId === 'new' || currentNote"
    :note="currentNote"
    @delete="deleteCurrentNote"
    @save="saveNote"
  />

  <main v-else class="grid h-full place-items-center px-6 text-center">
    <section class="max-w-sm">
      <h1 class="font-editor text-[28px] font-bold leading-9 tracking-normal text-quiet-text">Note unavailable</h1>
      <p class="mt-2 text-sm leading-6 text-quiet-muted">It may have been removed from this device.</p>
    </section>
  </main>
</template>
