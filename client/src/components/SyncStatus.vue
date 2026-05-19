<!-- client/src/components/SyncStatus.vue -->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useNotesStore } from '../stores/notes';

const notesStore = useNotesStore();
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

const status = computed(() => {
  if (!online.value) {
    return {
      label: 'Offline',
      dot: 'border border-quiet-outline bg-transparent',
      text: 'text-quiet-muted',
    };
  }

  if (notesStore.syncing || notesStore.hasUnsynced) {
    return {
      label: 'Unsynced',
      dot: 'bg-quiet-amber animate-pulse',
      text: 'text-quiet-amber',
    };
  }

  return {
    label: 'Synced',
    dot: 'bg-quiet-primary',
    text: 'text-quiet-primary',
  };
});

function updateOnlineStatus() {
  online.value = navigator.onLine;
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>

<template>
  <div class="flex items-center gap-2 text-xs font-semibold" :class="status.text">
    <span class="h-2.5 w-2.5 rounded-full" :class="status.dot" />
    <span>{{ status.label }}</span>
  </div>
</template>
