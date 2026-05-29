<!-- client/src/views/LoginView.vue -->
<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Feather } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);
const showPassword = ref(false);

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
  <main class="relative min-h-screen flex items-center justify-center overflow-hidden bg-ink-deep px-4 py-12 select-none">
    
    <!-- Premium Ambient Background -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <!-- Animated Glowing Orbs (CSS-only smooth drift) -->
      <div class="absolute -top-[30%] -left-[20%] h-[70vw] w-[70vw] max-w-[800px] rounded-full bg-quiet-primary/10 blur-[120px] animate-pulse" style="animation-duration: 8s" />
      <div class="absolute -bottom-[30%] -right-[20%] h-[70vw] w-[70vw] max-w-[800px] rounded-full bg-quiet-secondary/8 blur-[120px] animate-pulse" style="animation-duration: 12s" />
      
      <!-- Modern dot grid mesh overlay -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#0d0f0e_80%),linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] opacity-70" />
    </div>

    <!-- Auth Card -->
    <section class="relative z-10 w-full max-w-[440px] rounded-2xl border border-quiet-outline/30 bg-ink-low/60 backdrop-blur-xl p-8 md:p-10 shadow-2xl shadow-black/90 transition-all duration-300 hover:border-quiet-primary/20">
      
      <!-- Branding Logo -->
      <div class="flex flex-col items-center text-center mb-8">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-quiet-primaryDeep to-quiet-primary text-quiet-primaryDeep shadow-lg shadow-quiet-primaryDeep/20 mb-4 transition-transform duration-300 hover:rotate-12">
          <Feather class="h-6 w-6" aria-hidden="true" />
        </div>
        <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-quiet-primary">Quiet Scribe</p>
        <h1 class="font-outfit text-3xl font-bold tracking-tight text-quiet-text mt-2">
          {{ isRegister ? 'Create account' : 'Welcome back' }}
        </h1>
        <p class="text-xs text-quiet-muted/80 mt-1.5 font-light">
          {{ isRegister ? 'Start writing in a minimalist distraction-free environment' : 'Sign in to access your synchronized notes' }}
        </p>
      </div>

      <form class="space-y-5" @submit.prevent="submit">
        <!-- Email Field -->
        <div class="space-y-1.5">
          <label for="email" class="block text-[11px] font-semibold uppercase tracking-[0.12em] text-quiet-muted/90">Email Address</label>
          <div class="relative group">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-quiet-muted/50 group-focus-within:text-quiet-primary transition-colors">
              <Mail class="h-4 w-4" />
            </span>
            <input
              id="email"
              v-model="email"
              autocomplete="email"
              class="h-11 w-full rounded-xl border border-quiet-outline/25 bg-ink-surface/50 pl-10 pr-4 text-sm text-quiet-text outline-none transition duration-200 focus:border-quiet-primary focus:bg-ink-surface focus:ring-1 focus:ring-quiet-primary/20 placeholder:text-quiet-muted/30"
              placeholder="name@example.com"
              required
              type="email"
            />
          </div>
        </div>

        <!-- Password Field -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="password" class="block text-[11px] font-semibold uppercase tracking-[0.12em] text-quiet-muted/90">Password</label>
          </div>
          <div class="relative group">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-quiet-muted/50 group-focus-within:text-quiet-primary transition-colors">
              <Lock class="h-4 w-4" />
            </span>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              class="h-11 w-full rounded-xl border border-quiet-outline/25 bg-ink-surface/50 pl-10 pr-11 text-sm text-quiet-text outline-none transition duration-200 focus:border-quiet-primary focus:bg-ink-surface focus:ring-1 focus:ring-quiet-primary/20 placeholder:text-quiet-muted/30"
              placeholder="••••••••"
              minlength="8"
              required
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-quiet-muted/50 hover:text-quiet-text transition-colors p-1"
              @click="showPassword = !showPassword"
              title="Toggle password visibility"
            >
              <Eye v-if="showPassword" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Error Banner -->
        <Transition name="fade">
          <div v-if="error" class="flex items-start gap-2.5 rounded-xl border border-quiet-danger/30 bg-quiet-danger/5 px-4 py-3 text-xs text-quiet-danger leading-relaxed">
            <AlertTriangle class="h-4 w-4 shrink-0 mt-0.5" />
            <span>{{ error }}</span>
          </div>
        </Transition>

        <!-- Submit Button -->
        <button
          class="relative overflow-hidden inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-quiet-primary px-4 text-sm font-semibold text-quiet-primaryDeep transition duration-200 hover:bg-[#c5ecd2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-quiet-primaryDeep/5"
          :disabled="submitting"
          type="submit"
        >
          <!-- Loading Spinner -->
          <svg v-if="submitting" class="animate-spin h-4 w-4 text-quiet-primaryDeep" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="submitting">Authenticating...</span>
          <span v-else class="flex items-center gap-2">
            <UserPlus v-if="isRegister" class="h-4 w-4" aria-hidden="true" />
            <LogIn v-else class="h-4 w-4" aria-hidden="true" />
            {{ isRegister ? 'Create Account' : 'Log In' }}
          </span>
        </button>
      </form>

      <!-- Toggle Mode link -->
      <div class="mt-8 border-t border-quiet-outline/10 pt-5 text-center">
        <button
          class="text-xs font-semibold text-quiet-secondary transition duration-150 hover:text-quiet-text"
          type="button"
          @click="error = ''; router.push(isRegister ? '/login' : '/register')"
        >
          {{ isRegister ? 'Already have an account? Log in' : "Don't have an account? Sign up" }}
        </button>
      </div>
    </section>
  </main>
</template>
