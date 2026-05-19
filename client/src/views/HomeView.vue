<!-- client/src/views/HomeView.vue -->
<script setup>
import { Plus } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <main class="grid min-h-screen place-items-center px-6 text-center">
    <section class="max-w-md">
      <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-quiet-primary">Quiet Scribe</p>
      <h1 class="font-editor text-[32px] font-bold leading-10 tracking-normal text-quiet-text">
        Select a note
      </h1>
      <p class="mt-3 text-sm leading-6 text-quiet-muted">
        Your workspace is ready.
      </p>
      <button
        class="mx-auto mt-6 inline-flex h-10 items-center gap-2 rounded-app bg-quiet-primary px-4 text-sm font-semibold text-quiet-primaryDeep transition hover:bg-[#c5ecd2]"
        type="button"
        @click="router.push('/notes/new')"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        New note
      </button>
    </section>
  </main>
</template>
