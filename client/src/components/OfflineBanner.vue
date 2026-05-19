<!-- client/src/components/OfflineBanner.vue -->
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

function updateStatus() {
  online.value = navigator.onLine;
}

onMounted(() => {
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
});

onBeforeUnmount(() => {
  window.removeEventListener('online', updateStatus);
  window.removeEventListener('offline', updateStatus);
});
</script>

<template>
  <div
    v-if="!online"
    class="fixed inset-x-0 top-0 z-40 border-b border-quiet-outline bg-ink-high px-4 py-2 text-center text-xs font-semibold text-quiet-amber"
  >
    You're offline. Changes will sync when reconnected.
  </div>
</template>
