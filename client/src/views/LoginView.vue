<!-- client/src/views/LoginView.vue -->
<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn, UserPlus } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);

const isRegister = computed(() => route.path === '/register');

async function submit() {
  error.value = '';
  submitting.value = true;

  try {
    if (isRegister.value) {
      await authStore.register(email.value, password.value);
    } else {
      await authStore.login(email.value, password.value);
    }
  } catch (err) {
    error.value = err.response?.data?.error ?? err.message ?? 'Authentication failed';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-ink-deep px-5 py-10">
    <section class="w-full max-w-[420px] rounded-app border border-quiet-outline bg-ink-low p-6">
      <p class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-quiet-primary">Quiet Scribe</p>
      <h1 class="font-editor text-[32px] font-bold leading-10 tracking-normal text-quiet-text">
        {{ isRegister ? 'Create account' : 'Welcome back' }}
      </h1>

      <form class="mt-8 space-y-4" @submit.prevent="submit">
        <label class="block">
          <span class="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-quiet-muted">Email</span>
          <input
            v-model="email"
            autocomplete="email"
            class="h-11 w-full rounded-app border border-transparent bg-ink-surface px-3 text-sm text-quiet-text outline-none transition focus:border-quiet-primary"
            required
            type="email"
          />
        </label>

        <label class="block">
          <span class="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-quiet-muted">Password</span>
          <input
            v-model="password"
            autocomplete="current-password"
            class="h-11 w-full rounded-app border border-transparent bg-ink-surface px-3 text-sm text-quiet-text outline-none transition focus:border-quiet-primary"
            minlength="8"
            required
            type="password"
          />
        </label>

        <p v-if="error" class="rounded-app border border-quiet-danger/60 bg-[#3a1717] px-3 py-2 text-sm text-quiet-danger">
          {{ error }}
        </p>

        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-app bg-quiet-primary px-4 text-sm font-semibold text-quiet-primaryDeep transition hover:bg-[#c5ecd2] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
          type="submit"
        >
          <UserPlus v-if="isRegister" class="h-4 w-4" aria-hidden="true" />
          <LogIn v-else class="h-4 w-4" aria-hidden="true" />
          {{ submitting ? 'Working...' : isRegister ? 'Create account' : 'Log in' }}
        </button>
      </form>

      <button
        class="mt-5 text-sm font-semibold text-quiet-secondary transition hover:text-quiet-text"
        type="button"
        @click="router.push(isRegister ? '/login' : '/register')"
      >
        {{ isRegister ? 'Log in instead' : 'Create an account' }}
      </button>
    </section>
  </main>
</template>
