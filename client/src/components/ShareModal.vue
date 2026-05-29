<!-- client/src/components/ShareModal.vue -->
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Check, Copy, Download, Eye, EyeOff, Globe, Lock, QrCode, Share2, X } from 'lucide-vue-next';
import QRCode from 'qrcode';
import { encryptNote } from '../utils/crypto';
import { compressToBase64Url } from '../utils/compress';

const props = defineProps({
  note: {
    type: Object,
    required: true,
  },
  accentColor: {
    type: String,
    default: '#4ade80',
  },
});

const emit = defineEmits(['close']);

const activeTab = ref('link'); // 'link' | 'qrcode'
const qrMode = ref('preview'); // 'preview' (URL import) | 'text' (Raw text content)
const encryptToggle = ref(false);
const password = ref('');
const showPassword = ref(false);

const copied = ref(false);
const generating = ref(false);
const qrError = ref('');
const canvasRef = ref(null);

// Plaintext body helper
function getPlainBody(html) {
  if (!html) return '';
  const redacted = html.replace(/<span[^>]*class="[^"]*secret-text[^"]*"[^>]*>.*?<\/span>/gi, '•••');
  return redacted.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Compute the base64 URL-safe payload of the note
const notePayload = computed(() => {
  return {
    title: props.note.title || 'Untitled Note',
    body: props.note.body || '',
    tags: props.note.tags || [],
  };
});

// Construct the base URL for importing
const importBaseUrl = computed(() => {
  return `${window.location.origin}/import`;
});

// Generate share link
const shareUrl = ref('');

// Computed indicator for native sharing support
const isNativeShareSupported = computed(() => {
  return !!navigator.share;
});

// Recompute the share payload and trigger QR code regeneration
watch(
  [qrMode, encryptToggle, password, notePayload],
  () => {
    generateShareData();
  },
  { deep: true }
);

// Separate QR-specific URL that uses compression
const qrShareUrl = ref('');

async function generateShareData() {
  generating.value = true;
  qrError.value = '';
  
  try {
    // --- Uncompressed share link (for copy/paste, works in browsers) ---
    let payloadStr = '';
    
    if (encryptToggle.value && password.value) {
      const encrypted = await encryptNote(notePayload.value, password.value);
      payloadStr = `encrypted=1&data=${encrypted}`;
    } else {
      const json = JSON.stringify(notePayload.value);
      const encoded = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      payloadStr = `data=${encoded}`;
    }
    
    shareUrl.value = `${importBaseUrl.value}#${payloadStr}`;
    
    // --- Compressed QR payload (much smaller, scannable) ---
    if (encryptToggle.value && password.value) {
      // Encrypted data is already compact binary, just use it directly
      qrShareUrl.value = shareUrl.value;
    } else {
      const json = JSON.stringify(notePayload.value);
      const compressed = compressToBase64Url(json);
      qrShareUrl.value = `${importBaseUrl.value}#z=1&data=${compressed}`;
    }
    
    if (activeTab.value === 'qrcode') {
      await renderQrCode();
    }
  } catch (err) {
    console.error('Failed to generate share payload', err);
    qrError.value = 'Failed to generate payload. Note might be too large or encryption failed.';
  } finally {
    generating.value = false;
  }
}

async function renderQrCode() {
  await nextTick();
  if (!canvasRef.value) return;
  
  const textToEncode = qrMode.value === 'preview' 
    ? qrShareUrl.value
    : getPlainBody(props.note.body) || 'Empty note content';
    
  // Compressed payloads are much smaller; 2953 is the alphanumeric max for QR version 40
  if (textToEncode.length > 2500) {
    qrError.value = qrMode.value === 'preview'
      ? 'Note is too large for QR even after compression. Try a shorter note or use the Share Link tab to copy the URL.'
      : 'Note text is too long for a QR code. Try shortening the note.';
    return;
  }
  
  try {
    await QRCode.toCanvas(canvasRef.value, textToEncode, {
      width: 320,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR rendering error', err);
    qrError.value = 'Failed to render QR Code. Payload is too large.';
  }
}

// Copy URL to clipboard
async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
}

// Trigger Web Share API
async function triggerNativeShare() {
  if (!isNativeShareSupported.value) return;
  
  try {
    await navigator.share({
      title: props.note.title || 'Shared Note',
      text: `Check out my note: "${props.note.title || 'Untitled'}"`,
      url: shareUrl.value,
    });
  } catch (err) {
    // Sharing cancelled by user is caught here, ignore
    if (err.name !== 'AbortError') {
      console.error('Sharing failed', err);
    }
  }
}

// Download QR Code PNG
function downloadQrCode() {
  if (!canvasRef.value) return;
  
  try {
    const link = document.createElement('a');
    link.download = `${props.note.title || 'note'}-qr.png`;
    link.href = canvasRef.value.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Failed to download QR code', err);
  }
}

onMounted(() => {
  generateShareData();
});

watch(activeTab, (newTab) => {
  if (newTab === 'qrcode') {
    nextTick(() => renderQrCode());
  }
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
    <!-- Click outside boundary wrapper -->
    <div 
      class="w-full max-w-md rounded-2xl border border-quiet-outline/30 bg-ink-low/95 text-quiet-text shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
      @click.stop
    >
      <!-- Modal Header -->
      <header class="flex items-center justify-between border-b border-quiet-outline/25 px-6 py-4.5 bg-ink-deep/20">
        <div class="flex items-center gap-2.5">
          <div class="h-8 w-8 rounded-lg bg-ink-surface border border-quiet-outline/10 flex items-center justify-center" :style="{ color: accentColor }">
            <Share2 class="h-4 w-4" />
          </div>
          <h2 class="text-xs font-bold tracking-widest uppercase">Share Note</h2>
        </div>
        <button 
          class="rounded-full p-1.5 hover:bg-ink-surface text-quiet-muted hover:text-quiet-text transition duration-150 active:scale-[0.9]"
          type="button"
          @click="emit('close')"
        >
          <X class="h-4.5 w-4.5" />
        </button>
      </header>

      <!-- Tabs Navigation -->
      <div class="flex border-b border-quiet-outline/10 bg-ink-deep/10 px-6">
        <button
          class="flex-1 py-3.5 text-xs font-semibold uppercase tracking-widest border-b-2 transition duration-200"
          :class="activeTab === 'link' ? 'text-quiet-text' : 'border-transparent text-quiet-muted hover:text-quiet-text'"
          :style="activeTab === 'link' ? { borderBottomColor: accentColor } : {}"
          type="button"
          @click="activeTab = 'link'"
        >
          Share Link
        </button>
        <button
          class="flex-1 py-3.5 text-xs font-semibold uppercase tracking-widest border-b-2 transition duration-200"
          :class="activeTab === 'qrcode' ? 'text-quiet-text' : 'border-transparent text-quiet-muted hover:text-quiet-text'"
          :style="activeTab === 'qrcode' ? { borderBottomColor: accentColor } : {}"
          type="button"
          @click="activeTab = 'qrcode'"
        >
          QR Code Sync
        </button>
      </div>

      <!-- Scrollable Modal Content -->
      <div class="p-6 flex-1 overflow-y-auto max-h-[70vh] flex flex-col gap-5">
        
        <!-- ================= SHARE LINK TAB ================= -->
        <div v-if="activeTab === 'link'" class="flex flex-col gap-4">
          <p class="text-xs text-quiet-muted/80 leading-relaxed font-light">
            Create an offline shareable link that encodes the entire note. Opening this link on any device running Quiet Scribe imports it instantly.
          </p>

          <!-- Password Protection Toggle -->
          <div class="rounded-xl border border-quiet-outline/25 bg-ink-surface/20 p-4">
            <label class="flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-2.5">
                <Lock class="h-4 w-4" :style="encryptToggle ? { color: accentColor } : { color: '#64748b' }" />
                <span class="text-xs font-semibold">Password Protection</span>
              </div>
              <input 
                v-model="encryptToggle" 
                type="checkbox"
                class="sr-only peer"
              />
              <div class="relative w-8 h-4 bg-ink-high rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-quiet-muted after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:bg-quiet-primary peer-checked:bg-ink-deep border border-quiet-outline/20"></div>
            </label>

            <!-- Password Input -->
            <div v-if="encryptToggle" class="mt-3.5 flex gap-2">
              <div class="relative flex-1">
                <input
                  id="pwd-input"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="h-10 w-full rounded-xl border border-quiet-outline/25 bg-ink-surface px-3.5 pr-9 text-xs text-quiet-text outline-none placeholder:text-quiet-muted/30 focus:border-quiet-primary focus:bg-ink-surface transition duration-200"
                  placeholder="Enter encryption password..."
                  :style="password ? {} : { borderColor: 'rgba(239, 68, 68, 0.4)' }"
                />
                <button
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-quiet-muted hover:text-quiet-text p-1"
                  type="button"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-3.5 w-3.5" />
                  <Eye v-else class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p v-if="encryptToggle && !password" class="text-[10px] text-quiet-danger mt-1.5 font-semibold">
              * Password is required to encrypt the payload.
            </p>
          </div>

          <!-- URL / Action buttons -->
          <div class="flex flex-col gap-2.5 mt-2">
            <div class="flex items-center gap-2">
              <input
                readOnly
                :value="shareUrl"
                class="h-10 flex-1 truncate rounded-xl border border-quiet-outline/25 bg-ink-deep/60 px-3.5 text-xs text-quiet-muted outline-none select-all"
              />
              <button
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-quiet-outline/25 bg-ink-surface text-quiet-muted hover:text-quiet-text hover:border-quiet-primary hover:bg-ink-high active:scale-[0.93] transition duration-150"
                title="Copy share link"
                type="button"
                @click="copyLink"
              >
                <Check v-if="copied" class="h-4.5 w-4.5 text-quiet-primary" />
                <Copy v-else class="h-4.5 w-4.5" />
              </button>
            </div>
            <span v-if="copied" class="text-[10px] text-quiet-primary font-semibold pl-1 -mt-1 flex items-center gap-1.5">
              <Check class="h-3.5 w-3.5" /> Shared link copied to clipboard!
            </span>

            <button
              v-if="isNativeShareSupported"
              class="w-full mt-2 h-11 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold text-quiet-primaryDeep transition duration-150 active:scale-[0.97]"
              :style="{ backgroundColor: accentColor }"
              type="button"
              @click="triggerNativeShare"
            >
              <Share2 class="h-4 w-4" /> Send to Other Apps
            </button>
          </div>
        </div>

        <!-- ================= QR CODE TAB ================= -->
        <div v-if="activeTab === 'qrcode'" class="flex flex-col gap-4 items-center">
          <p class="text-xs text-quiet-muted/80 text-center leading-relaxed max-w-sm font-light">
            Scan this QR code with another device to sync this note. Toggle Password Protection to encrypt the transfer.
          </p>

          <!-- QR Mode Toggle (Link vs Text) -->
          <div class="w-full grid grid-cols-2 rounded-xl bg-ink-deep p-0.5 border border-quiet-outline/15 text-xs">
            <button
              class="py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition duration-150 active:scale-[0.97]"
              :class="qrMode === 'preview' ? 'bg-ink-surface text-quiet-text shadow-sm' : 'text-quiet-muted hover:text-quiet-text'"
              type="button"
              @click="qrMode = 'preview'"
            >
              <Globe class="h-3.5 w-3.5" /> Link & Preview
            </button>
            <button
              class="py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition duration-150 active:scale-[0.97]"
              :class="qrMode === 'text' ? 'bg-ink-surface text-quiet-text shadow-sm' : 'text-quiet-muted hover:text-quiet-text'"
              type="button"
              @click="qrMode = 'text'"
            >
              <QrCode class="h-3.5 w-3.5" /> Raw Plain Text
            </button>
          </div>

          <!-- Password Protection Toggle (Only for Link mode) -->
          <div v-if="qrMode === 'preview'" class="w-full rounded-xl border border-quiet-outline/25 bg-ink-surface/20 p-4">
            <label class="flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-2.5">
                <Lock class="h-4 w-4" :style="encryptToggle ? { color: accentColor } : { color: '#64748b' }" />
                <span class="text-xs font-semibold">Password Protection</span>
              </div>
              <input 
                v-model="encryptToggle" 
                type="checkbox"
                class="sr-only peer"
              />
              <div class="relative w-8 h-4 bg-ink-high rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-quiet-muted after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:bg-quiet-primary peer-checked:bg-ink-deep border border-quiet-outline/20"></div>
            </label>

            <!-- Password Input -->
            <div v-if="encryptToggle" class="mt-3.5 flex gap-2">
              <div class="relative flex-1">
                <input
                  id="qr-pwd-input"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="h-10 w-full rounded-xl border border-quiet-outline/25 bg-ink-surface px-3.5 pr-9 text-xs text-quiet-text outline-none placeholder:text-quiet-muted/30 focus:border-quiet-primary focus:bg-ink-surface transition duration-200"
                  placeholder="Enter encryption password..."
                  :style="password ? {} : { borderColor: 'rgba(239, 68, 68, 0.4)' }"
                />
                <button
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-quiet-muted hover:text-quiet-text p-1"
                  type="button"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-3.5 w-3.5" />
                  <Eye v-else class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p v-if="encryptToggle && !password" class="text-[10px] text-quiet-danger mt-1.5 font-semibold">
              * Password is required to encrypt the payload.
            </p>
          </div>

          <!-- QR Code Canvas Display -->
          <div class="relative flex flex-col items-center justify-center p-5 bg-white rounded-xl shadow-lg border border-quiet-outline/30 mt-2">
            <canvas ref="canvasRef" style="width: 300px; height: 300px; display: block; image-rendering: pixelated;"></canvas>
            
            <!-- Loading Indicator -->
            <div v-if="generating" class="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center gap-2">
              <svg class="animate-spin h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Generating QR...</span>
            </div>
          </div>

          <!-- QR Rendering Error message -->
          <p v-if="qrError" class="text-xs text-quiet-danger max-w-xs text-center font-semibold leading-relaxed mt-1 flex items-start gap-1">
            <AlertTriangle class="h-4 w-4 shrink-0" /> {{ qrError }}
          </p>

          <!-- Download QR Button -->
          <button
            v-else
            class="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-quiet-outline/25 bg-ink-surface px-4 py-2.5 text-xs font-semibold text-quiet-text hover:text-quiet-text hover:border-quiet-primary hover:bg-ink-high transition duration-150 active:scale-[0.97] w-full"
            type="button"
            @click="downloadQrCode"
          >
            <Download class="h-4 w-4" /> Download QR Code Image
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
