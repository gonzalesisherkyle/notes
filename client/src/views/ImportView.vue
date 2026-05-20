<!-- client/src/views/ImportView.vue -->
<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Check, Download, Eye, EyeOff, Lock, LockOpen, QrCode, Tag, AlertTriangle } from 'lucide-vue-next';
import { useNotesStore } from '../stores/notes';
import { decryptNote } from '../utils/crypto';

const router = useRouter();
const notesStore = useNotesStore();

const step = ref('loading'); // 'loading' | 'decrypt' | 'preview' | 'error'
const errorMsg = ref('');
const isEncrypted = ref(false);
const encryptedData = ref('');
const password = ref('');
const showPassword = ref(false);
const importSuccess = ref(false);

const note = ref({
  title: '',
  body: '',
  tags: []
});

function decodePlainData(encodedData) {
  try {
    let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decodedStr = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(decodedStr);
  } catch (err) {
    console.error('Failed to parse decoded plain data', err);
    throw new Error('Note data payload is corrupted or invalid.');
  }
}

// Strip HTML tags for clean card description snippet
function getPlainBody(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function handleDecrypt() {
  if (!password.value) return;
  errorMsg.value = '';
  
  try {
    const decrypted = await decryptNote(encryptedData.value, password.value);
    note.value = {
      title: decrypted.title || 'Untitled Note',
      body: decrypted.body || '',
      tags: Array.isArray(decrypted.tags) ? decrypted.tags : []
    };
    step.value = 'preview';
  } catch (err) {
    errorMsg.value = 'Incorrect password or corrupted data. Please try again.';
  }
}

async function importNote() {
  try {
    const saved = await notesStore.saveNote({
      title: note.value.title,
      body: note.value.body,
      tags: note.value.tags
    });
    importSuccess.value = true;
    setTimeout(() => {
      router.push(`/notes/${saved.id}`);
    }, 1500);
  } catch (err) {
    console.error('Failed to import note', err);
    errorMsg.value = 'Failed to write note to the database.';
    step.value = 'error';
  }
}

function cancelImport() {
  router.push('/');
}

onMounted(() => {
  const hash = window.location.hash.substring(1);
  if (!hash) {
    errorMsg.value = 'No note data found in the URL. Please scan a valid sync QR code.';
    step.value = 'error';
    return;
  }
  
  const params = new URLSearchParams(hash);
  const encryptedParam = params.get('encrypted');
  const dataParam = params.get('data');
  
  if (!dataParam) {
    errorMsg.value = 'Note data parameter is missing. Please scan a valid sync QR code.';
    step.value = 'error';
    return;
  }
  
  encryptedData.value = dataParam;
  
  if (encryptedParam === '1') {
    isEncrypted.value = true;
    step.value = 'decrypt';
  } else {
    try {
      const parsed = decodePlainData(dataParam);
      note.value = {
        title: parsed.title || 'Untitled Note',
        body: parsed.body || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : []
      };
      step.value = 'preview';
    } catch (err) {
      errorMsg.value = err.message || 'Corrupted note link payload.';
      step.value = 'error';
    }
  }
});
</script>

<template>
  <main class="min-h-screen bg-ink-deep flex flex-col items-center justify-center p-6 text-quiet-text">
    <div class="w-full max-w-md rounded-xl border border-quiet-outline/35 bg-ink-low shadow-2xl overflow-hidden flex flex-col">
      
      <!-- ================= 1. LOADING STEP ================= -->
      <div v-if="step === 'loading'" class="p-8 flex flex-col items-center justify-center gap-4 text-center">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-quiet-primary border-t-transparent" />
        <h2 class="text-sm font-semibold uppercase tracking-wider text-quiet-muted">Analyzing note package...</h2>
      </div>

      <!-- ================= 2. DECRYPT STEP ================= -->
      <div v-else-if="step === 'decrypt'" class="p-6 flex flex-col gap-5">
        <div class="flex flex-col items-center text-center gap-2">
          <div class="h-12 w-12 rounded-full bg-quiet-danger/10 flex items-center justify-center text-quiet-danger">
            <Lock class="h-6 w-6" />
          </div>
          <h2 class="text-base font-bold text-quiet-text">Password Protected Note</h2>
          <p class="text-xs text-quiet-muted leading-relaxed">
            This note was encrypted client-side. Please enter the password provided by the sender to decrypt it.
          </p>
        </div>

        <form @submit.prevent="handleDecrypt" class="flex flex-col gap-4">
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="h-10 w-full rounded border border-quiet-outline/35 bg-ink-surface px-3 pr-10 text-sm text-quiet-text outline-none placeholder:text-quiet-muted/50 focus:border-quiet-primary"
              placeholder="Enter password..."
              required
              autoFocus
            />
            <button
              class="absolute right-3 top-1/2 -translate-y-1/2 text-quiet-muted hover:text-quiet-text"
              type="button"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>

          <p v-if="errorMsg" class="text-xs text-quiet-danger font-medium leading-relaxed">
            ⚠️ {{ errorMsg }}
          </p>

          <div class="grid grid-cols-2 gap-3 mt-2">
            <button
              class="h-10 rounded border border-quiet-outline/30 bg-ink-surface text-xs font-semibold text-quiet-muted hover:text-quiet-text hover:border-quiet-primary transition"
              type="button"
              @click="cancelImport"
            >
              Cancel
            </button>
            <button
              class="h-10 rounded bg-quiet-primary text-xs font-semibold text-quiet-primaryDeep hover:bg-[#c5ecd2] transition flex items-center justify-center gap-1.5"
              type="submit"
            >
              <LockOpen class="h-3.5 w-3.5" /> Decrypt Note
            </button>
          </div>
        </form>
      </div>

      <!-- ================= 3. PREVIEW & IMPORT STEP ================= -->
      <div v-else-if="step === 'preview'" class="flex flex-col h-full">
        <!-- Header -->
        <header class="border-b border-quiet-outline/20 px-6 py-4 flex items-center justify-between bg-ink-deep/20">
          <div class="flex items-center gap-2">
            <QrCode class="h-4 w-4 text-quiet-primary" />
            <h2 class="text-sm font-bold tracking-wider uppercase">Sync Preview</h2>
          </div>
          <span class="text-[10px] bg-quiet-primary/10 border border-quiet-primary/20 text-quiet-primary px-2 py-0.5 rounded-full font-semibold">
            Ready to import
          </span>
        </header>

        <!-- Preview Body -->
        <div class="p-6 flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-4">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-quiet-muted">Title</span>
            <h3 class="text-lg font-bold text-quiet-text mt-0.5">{{ note.title || 'Untitled Note' }}</h3>
          </div>

          <!-- Tags -->
          <div v-if="note.tags && note.tags.length">
            <span class="text-[10px] uppercase font-bold tracking-wider text-quiet-muted block mb-1">Tags</span>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="tag in note.tags" :key="tag" class="flex items-center gap-1 bg-ink-surface text-quiet-muted rounded px-2 py-0.5 text-xs">
                <Tag class="h-3 w-3" /> #{{ tag }}
              </span>
            </div>
          </div>

          <!-- Body Preview -->
          <div class="border border-quiet-outline/10 bg-ink-surface/10 rounded-lg p-4 mt-2">
            <span class="text-[10px] uppercase font-bold tracking-wider text-quiet-muted block mb-1">Content Preview</span>
            <div 
              class="text-sm leading-relaxed text-quiet-muted/90 max-h-40 overflow-y-auto pr-1 line-clamp-6 whitespace-pre-wrap font-light"
            >
              {{ getPlainBody(note.body) || 'No body text content.' }}
            </div>
          </div>
        </div>

        <!-- Success Toast Overlay -->
        <div v-if="importSuccess" class="bg-quiet-primary text-quiet-primaryDeep px-6 py-3 flex items-center justify-center gap-2 text-xs font-semibold">
          <Check class="h-4 w-4" /> Note imported successfully! Opening editor...
        </div>

        <!-- Action Buttons -->
        <footer v-else class="border-t border-quiet-outline/20 px-6 py-4 grid grid-cols-2 gap-3 bg-ink-deep/20">
          <button
            class="h-10 rounded border border-quiet-outline/30 bg-ink-surface text-xs font-semibold text-quiet-muted hover:text-quiet-text hover:border-quiet-primary transition"
            type="button"
            @click="cancelImport"
          >
            Cancel
          </button>
          <button
            class="h-10 rounded bg-quiet-primary text-xs font-semibold text-quiet-primaryDeep hover:bg-[#c5ecd2] transition flex items-center justify-center gap-1.5"
            type="button"
            @click="importNote"
          >
            <Download class="h-3.5 w-3.5" /> Import Note
          </button>
        </footer>
      </div>

      <!-- ================= 4. ERROR STEP ================= -->
      <div v-else-if="step === 'error'" class="p-6 flex flex-col gap-5 items-center text-center">
        <div class="h-12 w-12 rounded-full bg-quiet-danger/10 flex items-center justify-center text-quiet-danger">
          <AlertTriangle class="h-6 w-6" />
        </div>
        <h2 class="text-base font-bold text-quiet-text">Sync Failed</h2>
        <p class="text-xs text-quiet-muted leading-relaxed max-w-sm">
          {{ errorMsg }}
        </p>

        <button
          class="w-full h-10 mt-2 rounded bg-ink-surface border border-quiet-outline/30 text-xs font-semibold text-quiet-muted hover:text-quiet-text hover:border-quiet-primary transition flex items-center justify-center gap-2"
          type="button"
          @click="cancelImport"
        >
          <ArrowLeft class="h-4 w-4" /> Back to Dashboard
        </button>
      </div>

    </div>
  </main>
</template>
