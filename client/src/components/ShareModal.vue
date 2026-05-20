<!-- client/src/components/ShareModal.vue -->
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Check, Copy, Download, Eye, EyeOff, Globe, Lock, QrCode, Share2, X } from 'lucide-vue-next';
import QRCode from 'qrcode';
import { encryptNote } from '../utils/crypto';

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
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

async function generateShareData() {
  generating.value = true;
  qrError.value = '';
  
  try {
    let payloadStr = '';
    
    if (encryptToggle.value && password.value) {
      // Encrypted Mode
      const encrypted = await encryptNote(notePayload.value, password.value);
      payloadStr = `encrypted=1&data=${encrypted}`;
    } else {
      // Plain Mode
      const json = JSON.stringify(notePayload.value);
      const encoded = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      payloadStr = `data=${encoded}`;
    }
    
    // Set actual share link
    shareUrl.value = `${importBaseUrl.value}#${payloadStr}`;
    
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
    ? shareUrl.value 
    : getPlainBody(props.note.body) || 'Empty note content';
    
  // Check if size is within limits (~2000 chars for good scanning)
  if (textToEncode.length > 2500) {
    qrError.value = 'Note is too long. Switch to "Link & Preview" mode or shorten the note.';
    return;
  }
  
  try {
    await QRCode.toCanvas(canvasRef.value, textToEncode, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#000000', // Absolute black for maximum contrast
        light: '#ffffff', // Clean white background
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
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <!-- Click outside boundary wrapper -->
    <div 
      class="w-full max-w-md rounded-xl border border-quiet-outline/35 bg-ink-low text-quiet-text shadow-2xl overflow-hidden flex flex-col"
      @click.stop
    >
      <!-- Modal Header -->
      <header class="flex items-center justify-between border-b border-quiet-outline/20 px-6 py-4">
        <div class="flex items-center gap-2">
          <Share2 class="h-4 w-4" :style="{ color: accentColor }" />
          <h2 class="text-sm font-bold tracking-wider uppercase">Share Note</h2>
        </div>
        <button 
          class="rounded-full p-1 hover:bg-ink-surface text-quiet-muted hover:text-quiet-text transition"
          type="button"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </header>

      <!-- Tabs Navigation -->
      <div class="flex border-b border-quiet-outline/10 bg-ink-deep/20 px-6">
        <button
          class="flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition"
          :class="activeTab === 'link' ? 'border-b-2 text-quiet-text' : 'border-transparent text-quiet-muted hover:text-quiet-text'"
          :style="activeTab === 'link' ? { borderBottomColor: accentColor } : {}"
          type="button"
          @click="activeTab = 'link'"
        >
          Share Link
        </button>
        <button
          class="flex-1 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition"
          :class="activeTab === 'qrcode' ? 'border-b-2 text-quiet-text' : 'border-transparent text-quiet-muted hover:text-quiet-text'"
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
          <p class="text-xs text-quiet-muted leading-relaxed">
            Create an offline shareable link that encodes the entire note. Opening this link on any device running Quiet Scribe imports it instantly.
          </p>

          <!-- Password Protection Toggle -->
          <div class="rounded-lg border border-quiet-outline/20 bg-ink-surface/30 p-4">
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
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="h-9 w-full rounded border border-quiet-outline/35 bg-ink-surface px-3 pr-8 text-xs text-quiet-text outline-none placeholder:text-quiet-muted/50 focus:border-quiet-primary"
                  placeholder="Enter encryption password..."
                  :style="password ? {} : { borderColor: 'rgba(239, 68, 68, 0.4)' }"
                />
                <button
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-quiet-muted hover:text-quiet-text"
                  type="button"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-3.5 w-3.5" />
                  <Eye v-else class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p v-if="encryptToggle && !password" class="text-[10px] text-quiet-danger mt-1">
              * Password is required to encrypt the payload.
            </p>
          </div>

          <!-- URL / Action buttons -->
          <div class="flex flex-col gap-2.5 mt-2">
            <div class="flex items-center gap-2">
              <input
                readOnly
                :value="shareUrl"
                class="h-10 flex-1 truncate rounded border border-quiet-outline/30 bg-ink-deep px-3 text-xs text-quiet-muted outline-none select-all"
              />
              <button
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-quiet-outline/30 bg-ink-surface text-quiet-muted hover:text-quiet-text hover:border-quiet-primary transition"
                title="Copy share link"
                type="button"
                @click="copyLink"
              >
                <Check v-if="copied" class="h-4 w-4 text-quiet-primary" />
                <Copy v-else class="h-4 w-4" />
              </button>
            </div>
            <span v-if="copied" class="text-[10px] text-quiet-primary font-medium pl-1 -mt-1.5 flex items-center gap-1">
              <Check class="h-3 w-3" /> Shared link copied to clipboard!
            </span>

            <button
              v-if="isNativeShareSupported"
              class="w-full mt-2 h-10 inline-flex items-center justify-center gap-2 rounded text-xs font-semibold text-quiet-primaryDeep transition"
              :style="{ backgroundColor: accentColor }"
              type="button"
              @click="triggerNativeShare"
            >
              <Share2 class="h-3.5 w-3.5" /> Send to Other Apps
            </button>
          </div>
        </div>

        <!-- ================= QR CODE TAB ================= -->
        <div v-if="activeTab === 'qrcode'" class="flex flex-col gap-4 items-center">
          <p class="text-xs text-quiet-muted text-center leading-relaxed max-w-sm">
            Scan this QR code with another device to sync this note. Toggle Password Protection to encrypt the transfer.
          </p>

          <!-- QR Mode Toggle (Link vs Text) -->
          <div class="w-full grid grid-cols-2 rounded bg-ink-deep p-0.5 border border-quiet-outline/10 text-xs">
            <button
              class="py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
              :class="qrMode === 'preview' ? 'bg-ink-surface text-quiet-text shadow-sm' : 'text-quiet-muted hover:text-quiet-text'"
              type="button"
              @click="qrMode = 'preview'"
            >
              <Globe class="h-3.5 w-3.5" /> Link & Preview
            </button>
            <button
              class="py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
              :class="qrMode === 'text' ? 'bg-ink-surface text-quiet-text shadow-sm' : 'text-quiet-muted hover:text-quiet-text'"
              type="button"
              @click="qrMode = 'text'"
            >
              <QrCode class="h-3.5 w-3.5" /> Raw Plain Text
            </button>
          </div>

          <!-- Password Protection Toggle (Only for Link mode) -->
          <div v-if="qrMode === 'preview'" class="w-full rounded-lg border border-quiet-outline/25 bg-ink-surface/30 p-4">
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
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="h-9 w-full rounded border border-quiet-outline/35 bg-ink-surface px-3 pr-8 text-xs text-quiet-text outline-none placeholder:text-quiet-muted/50 focus:border-quiet-primary"
                  placeholder="Enter encryption password..."
                  :style="password ? {} : { borderColor: 'rgba(239, 68, 68, 0.4)' }"
                />
                <button
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-quiet-muted hover:text-quiet-text"
                  type="button"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-3.5 w-3.5" />
                  <Eye v-else class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p v-if="encryptToggle && !password" class="text-[10px] text-quiet-danger mt-1">
              * Password is required to encrypt the payload.
            </p>
          </div>

          <!-- QR Code Canvas Display -->
          <div class="relative flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg border border-quiet-outline/30 mt-2">
            <canvas ref="canvasRef" class="w-64 h-64 block"></canvas>
            
            <!-- Loading Indicator -->
            <div v-if="generating" class="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center gap-2">
              <div class="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              <span class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Generating...</span>
            </div>
          </div>

          <!-- QR Rendering Error message -->
          <p v-if="qrError" class="text-xs text-quiet-danger max-w-xs text-center font-medium leading-relaxed mt-1">
            ⚠️ {{ qrError }}
          </p>

          <!-- Download QR Button -->
          <button
            v-else
            class="mt-2 inline-flex items-center justify-center gap-2 rounded border border-quiet-outline/30 bg-ink-surface px-4 py-2 text-xs font-semibold text-quiet-muted hover:text-quiet-text hover:border-quiet-primary transition w-full"
            type="button"
            @click="downloadQrCode"
          >
            <Download class="h-3.5 w-3.5" /> Download QR Code Image
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
