<!-- client/src/components/InstallPrompt.vue -->
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Download, X } from 'lucide-vue-next';
import BaseButton from './BaseButton.vue';

const deferredPrompt = ref(null);
const visible = ref(false);
let timer = null;

function handleBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredPrompt.value = event;
  timer = window.setTimeout(() => {
    visible.value = true;
  }, 3000);
}

async function installApp() {
  if (!deferredPrompt.value) {
    return;
  }

  visible.value = false;
  await deferredPrompt.value.prompt();
  deferredPrompt.value = null;
}

function dismiss() {
  visible.value = false;
  deferredPrompt.value = null;
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  if (timer) {
    window.clearTimeout(timer);
  }
});
</script>

<template>
  <aside
    v-if="visible"
    class="fixed bottom-4 right-4 z-30 w-[min(340px,calc(100vw-32px))] rounded-app border border-quiet-outline bg-ink-high p-4 text-quiet-text"
  >
    <div class="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 class="text-sm font-semibold">Install Quiet Scribe</h2>
        <p class="mt-1 text-xs leading-5 text-quiet-muted">Open it from your desktop and keep writing offline.</p>
      </div>
      <BaseButton
        class="grid h-8 w-8 place-items-center rounded-app text-quiet-muted transition hover:bg-ink-highest hover:text-quiet-text"
        title="Dismiss"
        type="button"
        @click="dismiss"
      >
        <X class="h-4 w-4" aria-hidden="true" />
        <span class="sr-only">Dismiss</span>
      </BaseButton>
    </div>

    <BaseButton
      class="inline-flex h-9 items-center gap-2 rounded-app bg-quiet-primary px-3 text-sm font-semibold text-quiet-primaryDeep transition hover:bg-[#c5ecd2]"
      type="button"
      @click="installApp"
    >
      <Download class="h-4 w-4" aria-hidden="true" />
      Install
    </BaseButton>
  </aside>
</template>
