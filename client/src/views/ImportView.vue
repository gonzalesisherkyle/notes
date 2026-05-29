<!-- client/src/views/ImportView.vue -->
<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Check, Download, Lock, LockOpen, QrCode, Tag, AlertTriangle, Feather } from 'lucide-vue-next';
import { useNotesStore } from '../stores/notes';
import { decryptNote } from '../utils/crypto';
import { decompressFromBase64Url } from '../utils/compress';
import FieldInput from '../components/FieldInput.vue';

const router = useRouter();
const notesStore = useNotesStore();

const step = ref('loading'); // 'loading' | 'decrypt' | 'preview' | 'error'
const errorMsg = ref('');
const isEncrypted = ref(false);
const encryptedData = ref('');
const password = ref('');
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
  const redacted = html.replace(/<span[^>]*class="[^"]*secret-text[^"]*"[^>]*>.*?<\/span>/gi, '•••');
  return redacted.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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
  const compressedParam = params.get('z');
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
      let parsed;
      if (compressedParam === '1') {
        // Compressed payload (from QR code)
        const json = decompressFromBase64Url(dataParam);
        parsed = JSON.parse(json);
      } else {
        // Uncompressed payload (from copy-paste link)
        parsed = decodePlainData(dataParam);
      }
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
  <main class="relative min-h-screen flex items-center justify-center overflow-hidden bg-ink-deep px-4 py-12 select-none">
    
    <!-- Premium Ambient Background -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <!-- Animated Glowing Orbs -->
      <div class="absolute -top-[30%] -left-[20%] h-[70vw] w-[70vw] max-w-[800px] rounded-full bg-quiet-primary/10 blur-[120px] animate-pulse" style="animation-duration: 8s" />
      <div class="absolute -bottom-[30%] -right-[20%] h-[70vw] w-[70vw] max-w-[800px] rounded-full bg-quiet-secondary/8 blur-[120px] animate-pulse" style="animation-duration: 12s" />
      
      <!-- Modern dot grid mesh overlay -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#0d0f0e_80%),linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] opacity-70" />
    </div>

    <!-- Auth Card -->
    <section class="relative z-10 w-full max-w-[440px] rounded-2xl border border-quiet-outline/30 bg-ink-low/60 backdrop-blur-xl shadow-2xl shadow-black/90 transition-all duration-300 hover:border-quiet-primary/20 overflow-hidden">
      
      <!-- ================= 1. LOADING STEP ================= -->
      <div v-if="step === 'loading'" class="p-8 flex flex-col items-center justify-center gap-5 text-center min-h-[250px]">
        <svg class="animate-spin h-8 w-8 text-quiet-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-quiet-primary">Analyzing Note Package</h2>
          <p class="text-xs text-quiet-muted/70 mt-1">Please wait while we extract note details...</p>
        </div>
      </div>

      <!-- ================= 2. DECRYPT STEP ================= -->
      <div v-else-if="step === 'decrypt'" class="p-8 flex flex-col gap-6">
        <div class="flex flex-col items-center text-center gap-2">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-quiet-danger/10 text-quiet-danger shadow-inner mb-2">
            <Lock class="h-6 w-6" />
          </div>
          <h2 class="font-outfit text-xl font-bold text-quiet-text">Secure Note Transfer</h2>
          <p class="text-xs text-quiet-muted/80 leading-relaxed max-w-xs font-light">
            This note was encrypted client-side. Please enter the password provided by the sender to decrypt it.
          </p>
        </div>

        <form @submit.prevent="handleDecrypt" class="flex flex-col gap-4">
          <FieldInput
            id="pwd"
            v-model="password"
            label="Decryption Password"
            placeholder="Enter password..."
            required
            type="password"
            autocomplete="current-password"
          >
            <template #icon>
              <Lock class="h-4 w-4" />
            </template>
          </FieldInput>

          <div v-if="errorMsg" class="flex items-start gap-2.5 rounded-xl border border-quiet-danger/30 bg-quiet-danger/5 px-4 py-3 text-xs text-quiet-danger leading-relaxed">
            <AlertTriangle class="h-4 w-4 shrink-0 mt-0.5" />
            <span>{{ errorMsg }}</span>
          </div>

          <div class="grid grid-cols-2 gap-3.5 mt-3">
            <button
              class="h-11 rounded-xl border border-quiet-outline/30 bg-ink-surface/50 text-xs font-semibold text-quiet-text hover:bg-ink-high hover:border-quiet-primary/40 transition duration-150 active:scale-[0.97]"
              type="button"
              @click="cancelImport"
            >
              Cancel
            </button>
            <button
              class="h-11 rounded-xl bg-quiet-primary text-xs font-semibold text-quiet-primaryDeep hover:bg-[#c5ecd2] transition duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-lg shadow-quiet-primaryDeep/5"
              type="submit"
            >
              <LockOpen class="h-4 w-4" /> Decrypt Note
            </button>
          </div>
        </form>
      </div>

      <!-- ================= 3. PREVIEW & IMPORT STEP ================= -->
      <div v-else-if="step === 'preview'" class="flex flex-col h-full">
        <!-- Header -->
        <header class="border-b border-quiet-outline/15 px-6 py-5 flex items-center justify-between bg-ink-deep/20">
          <div class="flex items-center gap-2.5">
            <div class="h-8 w-8 rounded-lg bg-quiet-primary/10 flex items-center justify-center text-quiet-primary">
              <QrCode class="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 class="text-xs font-bold tracking-widest uppercase text-quiet-muted/80">Sync Import</h2>
              <h1 class="text-sm font-semibold text-quiet-text mt-0.5">Note Preview</h1>
            </div>
          </div>
          <span class="text-[10px] bg-quiet-primary/10 border border-quiet-primary/20 text-quiet-primary px-2.5 py-0.5 rounded-full font-semibold">
            Ready to import
          </span>
        </header>

        <!-- Preview Body -->
        <div class="p-6 flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-4">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-quiet-muted/60">Title</span>
            <h3 class="text-lg font-bold text-quiet-text mt-0.5 font-outfit">{{ note.title || 'Untitled Note' }}</h3>
          </div>

          <!-- Tags -->
          <div v-if="note.tags && note.tags.length">
            <span class="text-[10px] uppercase font-bold tracking-wider text-quiet-muted/60 block mb-1.5">Tags</span>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="tag in note.tags" :key="tag" class="flex items-center gap-1.5 bg-ink-surface/50 border border-quiet-outline/10 text-quiet-muted rounded-lg px-2.5 py-1 text-xs">
                <Tag class="h-3.5 w-3.5 opacity-60" /> #{{ tag }}
              </span>
            </div>
          </div>

          <!-- Body Preview -->
          <div class="border border-quiet-outline/15 bg-ink-surface/20 rounded-xl p-4 mt-2">
            <span class="text-[10px] uppercase font-bold tracking-wider text-quiet-muted/60 block mb-2">Content Preview</span>
            <div 
              class="text-xs leading-relaxed text-quiet-muted/80 max-h-40 overflow-y-auto pr-1 line-clamp-6 whitespace-pre-wrap font-light"
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
        <footer v-else class="border-t border-quiet-outline/15 px-6 py-4 grid grid-cols-2 gap-3.5 bg-ink-deep/20">
          <button
            class="h-11 rounded-xl border border-quiet-outline/30 bg-ink-surface/50 text-xs font-semibold text-quiet-text hover:bg-ink-high hover:border-quiet-primary/40 transition duration-150 active:scale-[0.97]"
            type="button"
            @click="cancelImport"
          >
            Cancel
          </button>
          <button
            class="h-11 rounded-xl bg-quiet-primary text-xs font-semibold text-quiet-primaryDeep hover:bg-[#c5ecd2] transition duration-150 active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-lg shadow-quiet-primaryDeep/5"
            type="button"
            @click="importNote"
          >
            <Download class="h-4 w-4" /> Import Note
          </button>
        </footer>
      </div>

      <!-- ================= 4. ERROR STEP ================= -->
      <div v-else-if="step === 'error'" class="p-8 flex flex-col gap-6 items-center text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-quiet-danger/10 text-quiet-danger shadow-inner">
          <AlertTriangle class="h-6 w-6" />
        </div>
        <div>
          <h2 class="font-outfit text-xl font-bold text-quiet-text">Sync Failed</h2>
          <p class="text-xs text-quiet-muted/80 leading-relaxed max-w-sm font-light mt-1.5">
            {{ errorMsg }}
          </p>
        </div>

        <button
          class="w-full h-11 rounded-xl bg-ink-surface/50 border border-quiet-outline/35 text-xs font-semibold text-quiet-text hover:bg-ink-high hover:border-quiet-primary/40 transition duration-150 flex items-center justify-center gap-2 active:scale-[0.97]"
          type="button"
          @click="cancelImport"
        >
          <ArrowLeft class="h-4 w-4" /> Back to Dashboard
        </button>
      </div>

    </section>
  </main>
</template>
