<!-- client/src/components/NoteEditor.vue -->
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  AlertTriangle,
  AlignLeft,
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  Code,
  FileText,
  Headphones,
  Heading1,
  Heading2,
  Heading3,
  History,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Pin,
  Quote,
  Settings,
  Share2,
  Strikethrough,
  Tag,
  Terminal,
  Trash2,
  Underline,
  X
} from 'lucide-vue-next';
import { useDebounceFn } from '@vueuse/core';
import ShareModal from './ShareModal.vue';

const props = defineProps({
  note: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['save', 'delete']);

const title = ref('');
const body = ref(''); // HTML string
const color = ref('default');
const fontFamily = ref('serif');
const fontSize = ref('medium');
const lineHeight = ref('relaxed');
const pinned = ref(false);
const tags = ref([]);

const showSettingsModal = ref(false);
const showShareModal = ref(false);
const showDeleteConfirmModal = ref(false);
const tagInput = ref('');
const editorRef = ref(null);
const hydrated = ref(false);
const lastSnapshot = ref('');

// Focus and ID state for editor sync guards
const isTitleFocused = ref(false);
const isEditorFocused = ref(false);
const currentNoteId = ref(null);

// Custom features
const isFocusMode = ref(false);
const currentAmbientSound = ref('off');
const ambientDropdownOpen = ref(false);

const ambientSounds = [
  { id: 'off', name: 'Sound: Off' },
  { id: 'rain', name: 'Rain Synth' },
  { id: 'lofi', name: 'Lofi Focus' }
];

let audioCtx = null;
let rainNoiseSource = null;
let streamAudio = null;

const templates = [
  {
    id: 'journal',
    name: 'Daily Journal',
    description: 'Track daily progress, goals, and thoughts.',
    title: `Daily Journal - ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`,
    tags: ['journal', 'personal'],
    body: `<h2>Today's Focus</h2><ul><li>Focus item 1</li><li>Focus item 2</li></ul><h2>What Went Well</h2><p>Write here...</p><h2>Gratitude List</h2><ol><li>I am grateful for...</li></ol>`
  },
  {
    id: 'meeting',
    name: 'Meeting Minutes',
    description: 'Record agenda, discussions, and tasks.',
    title: 'Project Sync Meeting',
    tags: ['work', 'meeting'],
    body: `<h2>Meeting Details</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><p><strong>Attendees:</strong> Participant A, Participant B</p><h2>Agenda</h2><p>Brief summary of objectives...</p><h2>Discussion Points</h2><ul><li>Discussion topic 1</li><li>Discussion topic 2</li></ul><h2>Action Items</h2><ul><li><input type="checkbox" class="task-checkbox" style="margin-right: 8px; width: 14px; height: 14px; vertical-align: middle; cursor: pointer;" /> Action item 1 (Assignee)</li><li><input type="checkbox" class="task-checkbox" style="margin-right: 8px; width: 14px; height: 14px; vertical-align: middle; cursor: pointer;" /> Action item 2 (Assignee)</li></ul>`
  },
  {
    id: 'code',
    name: 'Code Snippet',
    description: 'Structure dev code blocks and explanations.',
    title: 'Algorithm Implementation',
    tags: ['code', 'dev'],
    body: `<h2>Problem Description</h2><p>Describe the coding problem...</p><h2>Solution</h2><pre><code>function solve() {\n  // Implementation here\n  console.log("Hello World");\n}</code></pre><h2>Key Takeaways</h2><ul><li>Time complexity: O(1)</li><li>Space complexity: O(1)</li></ul>`
  }
];

// Custom dropdown menu toggle states
const fontFamilyDropdownOpen = ref(false);
const fontSizeDropdownOpen = ref(false);
const lineHeightDropdownOpen = ref(false);

function toggleFontFamilyDropdown(e) {
  e.stopPropagation();
  fontFamilyDropdownOpen.value = !fontFamilyDropdownOpen.value;
  fontSizeDropdownOpen.value = false;
  lineHeightDropdownOpen.value = false;
}
function toggleFontSizeDropdown(e) {
  e.stopPropagation();
  fontSizeDropdownOpen.value = !fontSizeDropdownOpen.value;
  fontFamilyDropdownOpen.value = false;
  lineHeightDropdownOpen.value = false;
}
function toggleLineHeightDropdown(e) {
  e.stopPropagation();
  lineHeightDropdownOpen.value = !lineHeightDropdownOpen.value;
  fontFamilyDropdownOpen.value = false;
  fontSizeDropdownOpen.value = false;
}
function closeAllDropdowns() {
  fontFamilyDropdownOpen.value = false;
  fontSizeDropdownOpen.value = false;
  lineHeightDropdownOpen.value = false;
  ambientDropdownOpen.value = false;
}

function toggleAmbientDropdown(e) {
  e.stopPropagation();
  ambientDropdownOpen.value = !ambientDropdownOpen.value;
  fontFamilyDropdownOpen.value = false;
  fontSizeDropdownOpen.value = false;
  lineHeightDropdownOpen.value = false;
}

function selectAmbientSound(soundId) {
  playAmbient(soundId);
  ambientDropdownOpen.value = false;
}

function stopAmbient() {
  if (rainNoiseSource) {
    try { rainNoiseSource.stop(); } catch(e){}
    rainNoiseSource = null;
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch(e){}
    audioCtx = null;
  }
  if (streamAudio) {
    try {
      streamAudio.pause();
      streamAudio.src = '';
    } catch(e){}
    streamAudio = null;
  }
}

function playAmbient(soundId) {
  stopAmbient();
  currentAmbientSound.value = soundId;
  
  if (soundId === 'off') return;

  if (soundId === 'rain') {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      
      const bufferSize = 2 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
      
      const source = audioCtx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.18;
      
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      source.start();
      rainNoiseSource = source;
    } catch (e) {
      console.error('Failed to play synthesized rain', e);
      currentAmbientSound.value = 'off';
    }
  } else {
    let url = '';
    if (soundId === 'lofi') {
      url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    }

    if (url) {
      streamAudio = new Audio(url);
      streamAudio.loop = true;
      streamAudio.volume = 0.3;
      streamAudio.play().catch(err => {
        console.error('Audio play blocked/failed', err);
        currentAmbientSound.value = 'off';
      });
    }
  }
}

function applyTemplate(tpl) {
  title.value = tpl.title;
  body.value = tpl.body;
  tags.value = [...tpl.tags];
  if (editorRef.value) {
    editorRef.value.innerHTML = tpl.body;
  }
  saveImmediately();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
}

function restoreVersion(ver) {
  title.value = ver.title;
  body.value = ver.body;
  if (editorRef.value) {
    editorRef.value.innerHTML = ver.body;
  }
  saveImmediately(true);
  showSettingsModal.value = false;
}

// Toolbar formatting states
const activeFormats = ref({
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  h1: false,
  h2: false,
  h3: false,
  blockquote: false,
  pre: false
});

// Update active states of format buttons based on current selection
function updateToolbarStates() {
  if (!editorRef.value) return;
  activeFormats.value.bold = document.queryCommandState('bold');
  activeFormats.value.italic = document.queryCommandState('italic');
  activeFormats.value.underline = document.queryCommandState('underline');
  activeFormats.value.strikeThrough = document.queryCommandState('strikeThrough');
  activeFormats.value.insertUnorderedList = document.queryCommandState('insertUnorderedList');
  activeFormats.value.insertOrderedList = document.queryCommandState('insertOrderedList');
  
  const blockType = document.queryCommandValue('formatBlock');
  activeFormats.value.h1 = blockType === 'h1';
  activeFormats.value.h2 = blockType === 'h2';
  activeFormats.value.h3 = blockType === 'h3';
  activeFormats.value.blockquote = blockType === 'blockquote';
  activeFormats.value.pre = blockType === 'pre';
}

function execCommand(command, value = null) {
  if (!editorRef.value) return;
  editorRef.value.focus();
  document.execCommand(command, false, value);
  updateToolbarStates();
  handleEditorInput();
}

const snapshot = computed(() =>
  JSON.stringify({
    id: props.note?.id ?? null,
    title: title.value,
    body: body.value,
    color: color.value,
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    pinned: pinned.value,
    tags: tags.value,
  }),
);

function payload() {
  return {
    id: props.note?.id,
    title: title.value,
    body: body.value,
    color: color.value,
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    lineHeight: lineHeight.value,
    pinned: pinned.value,
    tags: tags.value,
    createdAt: props.note?.createdAt,
  };
}

// Immediate save for formatting / metadata adjustments
function saveImmediately(forceVersion = false) {
  if (!hydrated.value) return;
  lastSnapshot.value = snapshot.value;
  const data = payload();
  if (forceVersion) {
    data.forceVersion = true;
  }
  emit('save', data);
}

// Debounced save only for typing changes (title and body text)
const debouncedSave = useDebounceFn(() => {
  if (!hydrated.value) return;
  if (!props.note && !title.value.trim() && !body.value.trim()) return;
  lastSnapshot.value = snapshot.value;
  emit('save', payload());
}, 500);

// Helper for font size backward compatibility
function normalizeFontSize(size) {
  if (!size || size === 'medium') return '16px';
  if (size === 'small') return '14px';
  if (size === 'large') return '20px';
  return size;
}

// Initialize fields from props
watch(
  () => props.note,
  async (note) => {
    const idChanged = note?.id !== currentNoteId.value;
    
    if (idChanged || !hydrated.value) {
      currentNoteId.value = note?.id ?? null;
      hydrated.value = false;
      
      title.value = note?.title ?? '';
      body.value = note?.body ?? '';
      color.value = note?.color ?? 'default';
      fontFamily.value = note?.fontFamily ?? 'serif';
      fontSize.value = normalizeFontSize(note?.fontSize);
      lineHeight.value = note?.lineHeight ?? 'relaxed';
      pinned.value = note?.pinned ?? false;
      tags.value = Array.isArray(note?.tags) ? [...note.tags] : [];

      await nextTick();
      if (editorRef.value && editorRef.value.innerHTML !== body.value) {
        editorRef.value.innerHTML = body.value;
      }
      
      lastSnapshot.value = snapshot.value;
      hydrated.value = true;
    } else {
      if (note) {
        // Temporarily set hydrated to false to prevent setting assignments from triggering save loop
        hydrated.value = false;

        // Safe updates: only set title/body if not currently focused
        if (!isTitleFocused.value && title.value !== note.title) {
          title.value = note.title ?? '';
        }
        if (!isEditorFocused.value && body.value !== note.body) {
          body.value = note.body ?? '';
          await nextTick();
          if (editorRef.value && editorRef.value.innerHTML !== body.value) {
            editorRef.value.innerHTML = body.value;
          }
        }
        
        color.value = note.color ?? 'default';
        fontFamily.value = note.fontFamily ?? 'serif';
        fontSize.value = normalizeFontSize(note.fontSize);
        lineHeight.value = note.lineHeight ?? 'relaxed';
        pinned.value = note.pinned ?? false;

        // Only assign tags if they actually changed, to avoid array reference triggers
        const tagsChanged = JSON.stringify(tags.value) !== JSON.stringify(note.tags);
        if (tagsChanged) {
          tags.value = Array.isArray(note.tags) ? [...note.tags] : [];
        }

        await nextTick();
        hydrated.value = true;
      }
    }
  },
  { immediate: true },
);

// Save immediately when customization settings change
watch(
  [color, fontFamily, fontSize, lineHeight, pinned, tags],
  () => {
    if (hydrated.value) {
      saveImmediately();
    }
  },
  { deep: true }
);

// Save debounced when title or body content changes
watch(
  [title, body],
  () => {
    if (hydrated.value) {
      debouncedSave();
    }
  }
);

// Update the internal html body state
function handleEditorInput() {
  if (!editorRef.value) return;
  body.value = editorRef.value.innerHTML;
  updateToolbarStates();
}



function insertChecklist() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.style.marginRight = '8px';
  checkbox.style.width = '14px';
  checkbox.style.height = '14px';
  checkbox.style.verticalAlign = 'middle';
  checkbox.style.cursor = 'pointer';
  
  const space = document.createTextNode(' ');
  
  range.insertNode(space);
  range.insertNode(checkbox);
  
  range.setStartAfter(checkbox);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  
  updateToolbarStates();
  handleEditorInput();
}

function handleEditorClick(e) {
  closeAllDropdowns();
  
  if (e.target && e.target.type === 'checkbox') {
    if (e.target.checked) {
      e.target.setAttribute('checked', 'checked');
    } else {
      e.target.removeAttribute('checked');
    }
    handleEditorInput();
  }
}

// Markdown formatting shortcuts inside editor on typing Space
function handleEditorKeydown(e) {
  if (e.key === ' ') {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const offset = range.startOffset;
      const beforeCursor = text.slice(0, offset);
      
      let command = null;
      let arg = null;
      let charsToRemove = 0;
      
      if (beforeCursor === '#') {
        command = 'formatBlock';
        arg = 'h1';
        charsToRemove = 1;
      } else if (beforeCursor === '##') {
        command = 'formatBlock';
        arg = 'h2';
        charsToRemove = 2;
      } else if (beforeCursor === '###') {
        command = 'formatBlock';
        arg = 'h3';
        charsToRemove = 3;
      } else if (beforeCursor === '>') {
        command = 'formatBlock';
        arg = 'blockquote';
        charsToRemove = 1;
      } else if (beforeCursor === '-' || beforeCursor === '*') {
        command = 'insertUnorderedList';
        charsToRemove = 1;
      } else if (beforeCursor === '1.') {
        command = 'insertOrderedList';
        charsToRemove = 2;
      } else if (beforeCursor === '```') {
        command = 'formatBlock';
        arg = 'pre';
        charsToRemove = 3;
      } else if (beforeCursor === '[]') {
        e.preventDefault();
        const deleteRange = document.createRange();
        deleteRange.setStart(node, offset - 2);
        deleteRange.setEnd(node, offset);
        deleteRange.deleteContents();
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.style.marginRight = '8px';
        checkbox.style.width = '14px';
        checkbox.style.height = '14px';
        checkbox.style.verticalAlign = 'middle';
        checkbox.style.cursor = 'pointer';
        
        const space = document.createTextNode(' ');
        
        const sel = window.getSelection();
        const r = sel.getRangeAt(0);
        r.insertNode(space);
        r.insertNode(checkbox);
        
        r.setStartAfter(checkbox);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        
        updateToolbarStates();
        handleEditorInput();
        return;
      }
      
      if (command) {
        e.preventDefault();
        
        // Remove markdown shorthand indicator
        const deleteRange = document.createRange();
        deleteRange.setStart(node, offset - charsToRemove);
        deleteRange.setEnd(node, offset);
        deleteRange.deleteContents();
        
        // Apply styling command
        document.execCommand(command, false, arg);
        updateToolbarStates();
        handleEditorInput();
      }
    }
  }
}

// Global listener hooks
onMounted(() => {
  document.addEventListener('selectionchange', updateToolbarStates);
  document.addEventListener('click', closeAllDropdowns);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', updateToolbarStates);
  document.removeEventListener('click', closeAllDropdowns);
  stopAmbient();
});

// Settings operations
function togglePin() {
  pinned.value = !pinned.value;
}

// Custom theme setting modifier
function selectColor(c) {
  color.value = c;
}

function addTag() {
  const cleanTag = tagInput.value.trim().toLowerCase().replace(/#/g, '');
  if (cleanTag && !tags.value.includes(cleanTag)) {
    tags.value.push(cleanTag);
  }
  tagInput.value = '';
}

function removeTag(tagToRemove) {
  tags.value = tags.value.filter((t) => t !== tagToRemove);
}

function confirmDelete() {
  showDeleteConfirmModal.value = false;
  emit('delete');
}

// Custom theme mapping settings
const activeThemeAccentColor = computed(() => {
  const accents = {
    default: '#a9cfb7',   // Sage Green
    lavender: '#d8b4fe',  // Lavender Purple
    forest: '#34d399',    // Emerald Green
    ocean: '#22d3ee',     // Cyan Blue
    sunset: '#fbbf24',    // Sunset Amber
    rose: '#fda4af',      // Rose Pink
    clay: '#fb923c',      // Terracotta Orange
    cyberpunk: '#facc15', // Neon Yellow
  };
  return accents[color.value] || accents.default;
});

// Dropdown definitions & labeling
const fontFamilyOptions = [
  { value: 'serif', label: 'Serif (Classic)' },
  { value: 'sans', label: 'Sans-Serif (Clean)' },
  { value: 'mono', label: 'Monospace (Code)' },
  { value: 'fira', label: 'Fira Code (Developer)' },
  { value: 'cursive', label: 'Handwriting' },
  { value: 'slab', label: 'Slab-Serif' },
  { value: 'playfair', label: 'Playfair (Elegant)' },
  { value: 'garamond', label: 'Garamond (Editorial)' },
  { value: 'outfit', label: 'Outfit (Modern)' }
];

const fontSizeOptions = [
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '22px', label: '22px' },
  { value: '24px', label: '24px' },
  { value: '28px', label: '28px' },
  { value: '32px', label: '32px' }
];

const lineHeightOptions = [
  { value: 'tight', label: 'Tight Spacing' },
  { value: 'relaxed', label: 'Relaxed Spacing' },
  { value: 'loose', label: 'Loose Spacing' }
];

const currentFontFamilyLabel = computed(() => {
  return fontFamilyOptions.find(o => o.value === fontFamily.value)?.label || 'Serif (Classic)';
});

const currentFontSizeLabel = computed(() => {
  return fontSizeOptions.find(o => o.value === fontSize.value)?.label || '16px';
});

const currentLineHeightLabel = computed(() => {
  return lineHeightOptions.find(o => o.value === lineHeight.value)?.label || 'Relaxed Spacing';
});

// Theme color circles definitions
const themes = [
  { id: 'default', name: 'Ink default', colorClass: 'bg-[#121413] border-[#333534]' },
  { id: 'lavender', name: 'Lavender Mist', colorClass: 'bg-purple-950 border-purple-700/50' },
  { id: 'forest', name: 'Forest Grove', colorClass: 'bg-emerald-950 border-emerald-700/50' },
  { id: 'ocean', name: 'Ocean Breeze', colorClass: 'bg-cyan-950 border-cyan-700/50' },
  { id: 'sunset', name: 'Sunset Gold', colorClass: 'bg-amber-950 border-amber-700/50' },
  { id: 'rose', name: 'Rose Petal', colorClass: 'bg-rose-950 border-rose-700/50' },
  { id: 'clay', name: 'Clay Terracotta', colorClass: 'bg-orange-950 border-orange-700/50' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', colorClass: 'bg-yellow-950 border-yellow-500/50' },
];

// Rich background gradient and borders applied directly via inline styles to ensure perfect rendering
const containerStyle = computed(() => {
  const gradients = {
    default: 'linear-gradient(to bottom, #121413, #0d0f0e)',
    lavender: 'linear-gradient(to bottom, rgba(88, 28, 135, 0.35), #0d0f0e)',
    forest: 'linear-gradient(to bottom, rgba(6, 95, 70, 0.35), #0d0f0e)',
    ocean: 'linear-gradient(to bottom, rgba(21, 94, 117, 0.35), #0d0f0e)',
    sunset: 'linear-gradient(to bottom, rgba(146, 64, 14, 0.32), #0d0f0e)',
    rose: 'linear-gradient(to bottom, rgba(159, 18, 57, 0.35), #0d0f0e)',
    clay: 'linear-gradient(to bottom, rgba(154, 52, 18, 0.35), #0d0f0e)',
    cyberpunk: 'linear-gradient(to bottom, rgba(113, 63, 18, 0.22), #0d0f0e)',
  };
  
  const borders = {
    default: '1px solid transparent',
    lavender: '1px solid rgba(168, 85, 247, 0.35)',
    forest: '1px solid rgba(52, 211, 153, 0.35)',
    ocean: '1px solid rgba(34, 211, 238, 0.35)',
    sunset: '1px solid rgba(251, 191, 36, 0.35)',
    rose: '1px solid rgba(251, 113, 133, 0.35)',
    clay: '1px solid rgba(251, 146, 60, 0.35)',
    cyberpunk: '1px solid rgba(234, 179, 8, 0.45)',
  };

  return {
    background: gradients[color.value] || gradients.default,
    borderTop: borders[color.value] || borders.default,
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  };
});

const fontFamilyStyles = {
  serif: "'Source Serif 4', Georgia, serif",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fira: "'Fira Code', ui-monospace, monospace",
  cursive: "'Comic Sans MS', 'Playpen Sans', 'Bradley Hand', cursive, sans-serif",
  slab: "'Courier New', Courier, monospace",
  playfair: "'Playfair Display', Didot, Georgia, serif",
  garamond: "'EB Garamond', Garamond, Baskerville, serif",
  outfit: "Outfit, Roboto, 'Helvetica Neue', sans-serif"
};

// Line height inline styling properties
const inlineStyles = computed(() => {
  const lines = {
    tight: '1.45',
    relaxed: '1.75',
    loose: '2.15',
  };
  return {
    lineHeight: lines[lineHeight.value] || '1.75',
    fontFamily: fontFamilyStyles[fontFamily.value] || fontFamilyStyles.serif,
    fontSize: fontSize.value,
    paddingBottom: '40px',
  };
});
</script>

<template>
  <div 
    :style="containerStyle" 
    class="h-full flex flex-col"
    :class="isFocusMode ? 'fixed inset-0 z-40 bg-ink-base transition-all duration-300' : ''"
  >


    <!-- Editor Header Area -->
    <header v-if="!isFocusMode" class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-quiet-outline/35 bg-ink-deep/80 backdrop-blur-md px-5 md:px-8">
      <div class="flex items-center gap-3">
        <!-- Pinned indicator -->
        <button
          class="grid h-9 w-9 place-items-center rounded-app border transition-all duration-200"
          :style="pinned ? { borderColor: activeThemeAccentColor, color: activeThemeAccentColor, backgroundColor: activeThemeAccentColor + '1a' } : {}"
          :class="!pinned ? 'border-quiet-outline bg-ink-surface text-quiet-muted hover:border-quiet-primary hover:text-quiet-text' : ''"
          :title="pinned ? 'Unpin note' : 'Pin note'"
          type="button"
          @click="togglePin"
        >
          <Pin class="h-4 w-4" :class="{ 'fill-current': pinned }" aria-hidden="true" />
          <span class="sr-only">Pin note</span>
        </button>

        <span v-if="note" class="text-[10px] uppercase tracking-wider text-quiet-muted border border-quiet-outline/30 px-2 py-1 rounded bg-ink-low/50">
          {{ note.synced ? 'Synced' : 'Offline' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="note"
          class="grid h-9 w-9 place-items-center rounded-app border transition-colors duration-250"
          :style="showShareModal ? { borderColor: activeThemeAccentColor, color: activeThemeAccentColor, backgroundColor: activeThemeAccentColor + '10' } : {}"
          :class="!showShareModal ? 'border-quiet-outline bg-ink-surface text-quiet-muted hover:border-quiet-primary hover:text-quiet-text' : ''"
          title="Share Note"
          type="button"
          @click="showShareModal = true"
        >
          <Share2 class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Share Note</span>
        </button>

        <button
          class="grid h-9 w-9 place-items-center rounded-app border transition-colors duration-250"
          :style="showSettingsModal ? { borderColor: activeThemeAccentColor, color: activeThemeAccentColor, backgroundColor: activeThemeAccentColor + '10' } : {}"
          :class="!showSettingsModal ? 'border-quiet-outline bg-ink-surface text-quiet-muted hover:border-quiet-primary hover:text-quiet-text' : ''"
          title="Customization Options"
          type="button"
          @click="showSettingsModal = true"
        >
          <Settings class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Customize Note</span>
        </button>

        <button
          class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-primary hover:text-quiet-text"
          title="Save now"
          type="button"
          @click="saveImmediately(true)"
        >
          <Check class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Save now</span>
        </button>

        <button
          v-if="note"
          class="grid h-9 w-9 place-items-center rounded-app border border-quiet-outline bg-ink-surface text-quiet-muted transition hover:border-quiet-danger hover:text-quiet-danger"
          title="Delete note"
          type="button"
          @click="showDeleteConfirmModal = true"
        >
          <Trash2 class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Delete note</span>
        </button>
      </div>
    </header>



    <!-- WYSIWYG Formatting Toolbar -->
    <section 
      class="sticky z-10 border-b border-quiet-outline/20 bg-ink-base/80 backdrop-blur-md py-2 px-5 md:px-8"
      :class="isFocusMode ? 'top-0' : 'top-14'"
    >
      <div class="mx-auto max-w-editor flex flex-wrap items-center gap-1.5 text-quiet-muted">
        
        <!-- CUSTOM INPUT: Font Family Custom Dropdown -->
        <div class="relative">
          <button
            class="flex h-8 items-center justify-between gap-1.5 rounded border bg-ink-surface px-2.5 text-xs text-quiet-text transition-all duration-200"
            :style="{ borderColor: fontFamilyDropdownOpen ? activeThemeAccentColor : 'rgba(66, 72, 67, 0.45)' }"
            type="button"
            @click="toggleFontFamilyDropdown"
          >
            <span>{{ currentFontFamilyLabel }}</span>
            <ChevronDown class="h-3 w-3 opacity-60" />
          </button>
          
          <div
            v-if="fontFamilyDropdownOpen"
            class="absolute left-0 mt-1.5 z-30 min-w-[125px] rounded border border-quiet-outline bg-ink-surface p-1 shadow-xl backdrop-blur-md"
          >
            <button
              v-for="opt in fontFamilyOptions"
              :key="opt.value"
              class="w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors"
              :class="fontFamily === opt.value ? 'font-semibold' : 'text-quiet-muted hover:bg-ink-high hover:text-quiet-text'"
              :style="fontFamily === opt.value ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
              type="button"
              @click="fontFamily = opt.value; fontFamilyDropdownOpen = false"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- CUSTOM INPUT: Font Size Custom Dropdown -->
        <div class="relative">
          <button
            class="flex h-8 items-center justify-between gap-1.5 rounded border bg-ink-surface px-2.5 text-xs text-quiet-text transition-all duration-200"
            :style="{ borderColor: fontSizeDropdownOpen ? activeThemeAccentColor : 'rgba(66, 72, 67, 0.45)' }"
            type="button"
            @click="toggleFontSizeDropdown"
          >
            <span>{{ currentFontSizeLabel }}</span>
            <ChevronDown class="h-3 w-3 opacity-60" />
          </button>
          
          <div
            v-if="fontSizeDropdownOpen"
            class="absolute left-0 mt-1.5 z-30 min-w-[100px] rounded border border-quiet-outline bg-ink-surface p-1 shadow-xl backdrop-blur-md"
          >
            <button
              v-for="opt in fontSizeOptions"
              :key="opt.value"
              class="w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors"
              :class="fontSize === opt.value ? 'font-semibold' : 'text-quiet-muted hover:bg-ink-high hover:text-quiet-text'"
              :style="fontSize === opt.value ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
              type="button"
              @click="fontSize = opt.value; fontSizeDropdownOpen = false"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- CUSTOM INPUT: Line Height Spacing Custom Dropdown -->
        <div class="relative">
          <button
            class="flex h-8 items-center justify-between gap-1.5 rounded border bg-ink-surface px-2.5 text-xs text-quiet-text transition-all duration-200"
            :style="{ borderColor: lineHeightDropdownOpen ? activeThemeAccentColor : 'rgba(66, 72, 67, 0.45)' }"
            type="button"
            @click="toggleLineHeightDropdown"
          >
            <span>{{ currentLineHeightLabel }}</span>
            <ChevronDown class="h-3 w-3 opacity-60" />
          </button>
          
          <div
            v-if="lineHeightDropdownOpen"
            class="absolute left-0 mt-1.5 z-30 min-w-[130px] rounded border border-quiet-outline bg-ink-surface p-1 shadow-xl backdrop-blur-md"
          >
            <button
              v-for="opt in lineHeightOptions"
              :key="opt.value"
              class="w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors"
              :class="lineHeight === opt.value ? 'font-semibold' : 'text-quiet-muted hover:bg-ink-high hover:text-quiet-text'"
              :style="lineHeight === opt.value ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
              type="button"
              @click="lineHeight = opt.value; lineHeightDropdownOpen = false"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="h-4 w-[1px] bg-quiet-outline/30 mx-1" />

        <!-- Bold option with theme highlight -->
        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          :style="activeFormats.bold ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Bold (Ctrl+B)"
          type="button"
          @click="execCommand('bold')"
        >
          <Bold class="h-4 w-4" />
        </button>

        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          :style="activeFormats.italic ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Italic (Ctrl+I)"
          type="button"
          @click="execCommand('italic')"
        >
          <Italic class="h-4 w-4" />
        </button>

        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          :style="activeFormats.underline ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Underline (Ctrl+U)"
          type="button"
          @click="execCommand('underline')"
        >
          <Underline class="h-4 w-4" />
        </button>

        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          :style="activeFormats.strikeThrough ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Strikethrough"
          type="button"
          @click="execCommand('strikeThrough')"
        >
          <Strikethrough class="h-4 w-4" />
        </button>

        <div class="h-4 w-[1px] bg-quiet-outline/30 mx-1" />

        <button
          class="h-8 px-2 flex items-center gap-1 rounded hover:bg-ink-surface transition hover:text-quiet-text text-xs"
          :style="activeFormats.h1 ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Heading 1"
          type="button"
          @click="execCommand('formatBlock', 'h1')"
        >
          <Heading1 class="h-4 w-4" /> <span class="hidden sm:inline">H1</span>
        </button>

        <button
          class="h-8 px-2 flex items-center gap-1 rounded hover:bg-ink-surface transition hover:text-quiet-text text-xs"
          :style="activeFormats.h2 ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Heading 2"
          type="button"
          @click="execCommand('formatBlock', 'h2')"
        >
          <Heading2 class="h-4 w-4" /> <span class="hidden sm:inline">H2</span>
        </button>

        <button
          class="h-8 px-2 flex items-center gap-1 rounded hover:bg-ink-surface transition hover:text-quiet-text text-xs"
          :style="activeFormats.h3 ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Heading 3"
          type="button"
          @click="execCommand('formatBlock', 'h3')"
        >
          <Heading3 class="h-4 w-4" /> <span class="hidden sm:inline">H3</span>
        </button>

        <button
          class="h-8 px-2 flex items-center gap-1 rounded hover:bg-ink-surface transition hover:text-quiet-text text-xs"
          :style="activeFormats.blockquote ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Blockquote"
          type="button"
          @click="execCommand('formatBlock', 'blockquote')"
        >
          <Quote class="h-3.5 w-3.5" /> <span class="hidden sm:inline">Quote</span>
        </button>

        <button
          class="h-8 px-2 flex items-center gap-1 rounded hover:bg-ink-surface transition hover:text-quiet-text text-xs"
          :style="activeFormats.pre ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Code Block"
          type="button"
          @click="execCommand('formatBlock', 'pre')"
        >
          <Code class="h-4 w-4" /> <span class="hidden sm:inline">Code</span>
        </button>

        <div class="h-4 w-[1px] bg-quiet-outline/30 mx-1" />

        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          :style="activeFormats.insertUnorderedList ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Bullet List"
          type="button"
          @click="execCommand('insertUnorderedList')"
        >
          <List class="h-4 w-4" />
        </button>

        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          :style="activeFormats.insertOrderedList ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Numbered List"
          type="button"
          @click="execCommand('insertOrderedList')"
        >
          <ListOrdered class="h-4 w-4" />
        </button>

        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          title="Insert Horizontal Rule"
          type="button"
          @click="execCommand('insertHorizontalRule')"
        >
          <Minus class="h-4 w-4" />
        </button>

        <button
          class="h-8 w-8 grid place-items-center rounded hover:bg-ink-surface transition hover:text-quiet-text"
          title="Checklist"
          type="button"
          @click="insertChecklist"
        >
          <ListTodo class="h-4 w-4" />
        </button>

        <button
          class="h-8 px-2 flex items-center gap-1 rounded hover:bg-ink-surface transition hover:text-quiet-text text-xs"
          title="Clear Format"
          type="button"
          @click="execCommand('removeFormat')"
        >
          <AlignLeft class="h-4 w-4" /> <span class="hidden md:inline">Clear</span>
        </button>

        <div class="h-4 w-[1px] bg-quiet-outline/30 mx-1" />

        <!-- CUSTOM INPUT: Ambient soundscapes selector -->
        <div class="relative relative-ambient">
          <button
            class="flex h-8 items-center justify-between gap-1.5 rounded border bg-ink-surface px-2.5 text-xs text-quiet-text border-quiet-outline/40 hover:border-quiet-primary transition-all duration-200"
            type="button"
            @click="toggleAmbientDropdown"
          >
            <Headphones class="h-3.5 w-3.5 shrink-0" :class="currentAmbientSound !== 'off' ? 'animate-pulse' : ''" :style="currentAmbientSound !== 'off' ? { color: activeThemeAccentColor } : {}" />
            <span class="hidden xl:inline text-[10px]">{{ ambientSounds.find(s => s.id === currentAmbientSound)?.name }}</span>
          </button>
          
          <div
            v-if="ambientDropdownOpen"
            class="absolute left-0 mt-1 z-20 w-44 rounded-lg border border-quiet-outline/35 bg-ink-surface p-1 shadow-xl"
          >
            <button
              v-for="snd in ambientSounds"
              :key="snd.id"
              class="w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors text-quiet-muted hover:bg-ink-low hover:text-quiet-text flex items-center justify-between"
              :class="currentAmbientSound === snd.id ? 'text-quiet-text bg-ink-low/50' : ''"
              type="button"
              @click="selectAmbientSound(snd.id)"
            >
              <span>{{ snd.name }}</span>
              <span v-if="currentAmbientSound === snd.id" class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: activeThemeAccentColor }" />
            </button>
          </div>
        </div>

        <button
          class="h-8 px-2 flex items-center gap-1 rounded hover:bg-ink-surface transition text-xs"
          :style="isFocusMode ? { backgroundColor: activeThemeAccentColor + '15', color: activeThemeAccentColor } : {}"
          title="Focus Mode"
          type="button"
          @click="isFocusMode = !isFocusMode"
        >
          <Minimize2 v-if="isFocusMode" class="h-3.5 w-3.5" />
          <Maximize2 v-else class="h-3.5 w-3.5" />
          <span class="hidden md:inline">{{ isFocusMode ? 'Exit Focus' : 'Focus' }}</span>
        </button>
      </div>
    </section>

    <!-- Note Main Editing Canvas -->
    <section 
      class="flex-1 overflow-y-auto px-5 py-8 md:px-8 md:py-12"
      :class="isFocusMode ? 'pt-16 md:pt-20' : ''"
    >
      <div class="mx-auto max-w-editor flex flex-col">
        <!-- Blank Note Templates Quick Selector -->
        <div v-if="!title && (!body || body === '<br>' || body === '')" class="mb-10 p-6 rounded-xl border border-quiet-outline/25 bg-ink-surface/50 backdrop-blur-sm">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-quiet-muted mb-2">
            Start from a template
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              v-for="tpl in templates"
              :key="tpl.id"
              class="text-left rounded-lg border border-quiet-outline/35 bg-ink-low/50 hover:bg-ink-surface/85 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-quiet-primary group"
              type="button"
              @click="applyTemplate(tpl)"
            >
              <div class="mb-3 flex h-8 w-8 items-center justify-center rounded-app bg-white/5 text-quiet-muted group-hover:text-quiet-primary transition-colors">
                <BookOpen v-if="tpl.id === 'journal'" class="h-4.5 w-4.5" />
                <FileText v-else-if="tpl.id === 'meeting'" class="h-4.5 w-4.5" />
                <Terminal v-else class="h-4.5 w-4.5" />
              </div>
              <h4 class="text-xs font-semibold text-quiet-text mb-1">
                {{ tpl.name }}
              </h4>
              <p class="text-[10px] leading-4 text-quiet-muted">
                {{ tpl.description }}
              </p>
            </button>
          </div>
        </div>

        <!-- Title Input with Custom theme border -->
        <input
          v-model="title"
          :class="isFocusMode ? 'mb-12' : 'mb-6'"
          class="w-full bg-transparent font-editor text-[32px] font-bold leading-10 tracking-tight text-quiet-text outline-none border-b pb-2 transition-colors duration-250 placeholder:text-quiet-muted/30"
          :style="{ borderBottomColor: 'transparent' }"
          @focus="isTitleFocused = true; $event.target.style.borderBottomColor = activeThemeAccentColor + '40'"
          @blur="isTitleFocused = false; $event.target.style.borderBottomColor = 'transparent'"
          maxlength="160"
          placeholder="Untitled note..."
          type="text"
        />

        <!-- Rich Text WYSIWYG Editor Container -->
        <div
          ref="editorRef"
          contenteditable="true"
          class="editor-content w-full min-h-[60vh] outline-none text-quiet-text"
          :style="inlineStyles"
          placeholder="Start writing your masterpiece... (Shorthands: # Space for H1, > Space for Quote, - Space for list, [] Space for checklist)"
          @focus="isEditorFocused = true"
          @blur="isEditorFocused = false"
          @click="handleEditorClick"
          @input="handleEditorInput"
          @keydown="handleEditorKeydown"
        />
      </div>
    </section>

    <!-- Note Settings Modal -->
    <Transition name="fade">
      <div v-if="showSettingsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="relative w-full max-w-md rounded-xl border border-quiet-outline/35 bg-ink-surface/95 p-6 shadow-2xl transition-all duration-300">
          <div class="mb-5 flex items-center justify-between border-b border-quiet-outline/20 pb-3">
            <h3 class="text-base font-semibold tracking-normal text-quiet-text flex items-center gap-2">
              <Settings class="h-4 w-4" :style="{ color: activeThemeAccentColor }" /> Note Settings
            </h3>
            <button
              class="rounded-full p-1.5 text-quiet-muted hover:bg-white/10 hover:text-quiet-text transition-colors"
              @click="showSettingsModal = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-6 text-sm">
            <!-- Background Theme Selector -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-quiet-muted mb-3 flex items-center gap-1.5">
                <Palette class="h-3.5 w-3.5" /> Note Theme Background
              </label>
              <div class="grid grid-cols-4 gap-3">
                <button
                  v-for="theme in themes"
                  :key="theme.id"
                  :class="[
                    theme.colorClass,
                    color === theme.id ? 'ring-2 ring-offset-2 ring-offset-ink-surface scale-105' : 'hover:scale-105'
                  ]"
                  :style="color === theme.id ? { '--tw-ring-color': activeThemeAccentColor } : {}"
                  class="h-9 w-9 rounded-full border transition-all duration-200 mx-auto"
                  :title="theme.name"
                  type="button"
                  @click="selectColor(theme.id)"
                />
              </div>
            </div>

            <!-- Tags Manager Panel -->
            <div class="space-y-3">
              <label class="block text-xs font-semibold uppercase tracking-wider text-quiet-muted mb-1 flex items-center gap-1.5">
                <Tag class="h-3.5 w-3.5" /> Note Tags
              </label>
              <div class="flex flex-wrap gap-1.5 min-h-[36px] p-2 border border-quiet-outline/40 rounded bg-ink-base/40">
                <span
                  v-for="tag in tags"
                  :key="tag"
                  :style="{ backgroundColor: activeThemeAccentColor + '18', borderColor: activeThemeAccentColor + '40', color: activeThemeAccentColor }"
                  class="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs"
                >
                  #{{ tag }}
                  <button
                    class="hover:text-quiet-danger font-bold text-[10px]"
                    title="Remove tag"
                    type="button"
                    @click="removeTag(tag)"
                  >
                    ×
                  </button>
                </span>
                <span v-if="!tags.length" class="text-xs text-quiet-muted/50 italic self-center">
                  No tags added yet
                </span>
              </div>

              <!-- Custom Tag Input with Theme border -->
              <div class="relative flex items-center">
                <input
                  v-model="tagInput"
                  class="h-9 w-full rounded border bg-ink-base text-xs text-quiet-text pl-3 pr-16 outline-none transition-all duration-250 placeholder:text-quiet-muted/30"
                  :style="{ borderColor: 'rgba(66, 72, 67, 0.45)' }"
                  :onfocus="e => e.target.style.borderColor = activeThemeAccentColor"
                  :onblur="e => e.target.style.borderColor = 'rgba(66, 72, 67, 0.45)'"
                  placeholder="Type tag (e.g. Work, Study)"
                  type="text"
                  @keydown.enter="addTag"
                />
                <button
                  class="absolute right-1.5 h-6 rounded px-2.5 text-[10px] font-semibold transition-colors duration-200"
                  :style="{ backgroundColor: activeThemeAccentColor + '1e', color: activeThemeAccentColor, border: `1px solid ${activeThemeAccentColor}33` }"
                  :onmouseover="e => e.currentTarget.style.backgroundColor = activeThemeAccentColor + '30'"
                  :onmouseout="e => e.currentTarget.style.backgroundColor = activeThemeAccentColor + '1e'"
                  type="button"
                  @click="addTag"
                >
                  Add
                </button>
            </div>
          </div>

            <!-- Version History Panel -->
            <div v-if="props.note" class="space-y-3 border-t border-quiet-outline/25 pt-4">
              <label class="block text-xs font-semibold uppercase tracking-wider text-quiet-muted mb-1 flex items-center gap-1.5">
                <History class="h-3.5 w-3.5" /> Revision History
              </label>
              
              <div v-if="!props.note.versions || !props.note.versions.length" class="text-xs text-quiet-muted italic py-1">
                No revisions saved yet. (Auto-saves every 2 minutes of typing)
              </div>
              
              <div v-else class="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <div
                  v-for="(ver, idx) in [...props.note.versions].reverse()"
                  :key="idx"
                  class="flex items-center justify-between gap-2 rounded border border-quiet-outline/25 bg-ink-base/30 p-2 text-xs transition hover:bg-ink-base/60"
                >
                  <div class="min-w-0">
                    <p class="truncate font-medium text-quiet-text">{{ ver.title || 'Untitled' }}</p>
                    <p class="text-[10px] text-quiet-muted">{{ formatDate(ver.updatedAt) }}</p>
                  </div>
                  <button
                    class="shrink-0 rounded px-2 py-1 text-[10px] font-semibold transition hover:bg-white/10"
                    :style="{ color: activeThemeAccentColor }"
                    type="button"
                    @click="restoreVersion(ver)"
                  >
                    Restore
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end border-t border-quiet-outline/20 pt-4">
            <button
              class="rounded-app px-4 py-2 text-xs font-semibold bg-ink-low text-quiet-text hover:bg-ink-base border border-quiet-outline/40 transition-colors"
              @click="showSettingsModal = false"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete Warning Modal -->
    <Transition name="fade">
      <div v-if="showDeleteConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="relative w-full max-w-sm rounded-xl border border-quiet-danger/30 bg-ink-surface/95 p-6 shadow-2xl transition-all duration-300">
          <div class="mb-4 flex items-center gap-3 text-quiet-danger">
            <AlertTriangle class="h-6 w-6 shrink-0" />
            <h3 class="text-base font-semibold tracking-normal">
              Delete Note
            </h3>
          </div>

          <p class="text-xs leading-5 text-quiet-muted">
            Are you sure you want to delete <strong class="text-quiet-text">"{{ title || 'Untitled note' }}"</strong>? This will permanently delete it and cannot be undone.
          </p>

          <div class="mt-6 flex justify-end gap-3 border-t border-quiet-outline/10 pt-4">
            <button
              class="rounded-app px-4 py-2 text-xs font-semibold bg-ink-low text-quiet-text hover:bg-ink-base border border-quiet-outline/40 transition-colors"
              type="button"
              @click="showDeleteConfirmModal = false"
            >
              Cancel
            </button>
            <button
              class="rounded-app px-4 py-2 text-xs font-semibold bg-quiet-danger hover:bg-red-700 text-white transition-colors"
              type="button"
              @click="confirmDelete"
            >
              Delete Note
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Note Sharing Modal -->
    <Transition name="fade">
      <ShareModal
        v-if="showShareModal"
        :note="{ title, body, tags }"
        :accent-color="activeThemeAccentColor"
        @close="showShareModal = false"
      />
    </Transition>
  </div>
</template>

<style>
/* Rich WYSIWYG Editor styles targeting elements created inside contenteditable */
.editor-content:empty::before {
  content: attr(placeholder);
  color: rgba(193, 200, 193, 0.35);
  font-style: italic;
  pointer-events: none;
}

.editor-content h1 {
  font-size: 1.85em;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  line-height: 1.25;
  letter-spacing: -0.025em;
  color: #e2e3e1;
}

.editor-content h2 {
  font-size: 1.45em;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  line-height: 1.3;
  color: #e2e3e1;
}

.editor-content h3 {
  font-size: 1.2em;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #e2e3e1;
}

.editor-content p {
  margin-top: 0;
  margin-bottom: 1rem;
  line-height: inherit;
}

.editor-content blockquote {
  border-left: 4px solid rgba(169, 207, 183, 0.5);
  padding-left: 1rem;
  margin: 1.25rem 0;
  font-style: italic;
  color: #c1c8c1;
  opacity: 0.9;
}

.editor-content pre {
  background-color: rgba(0, 0, 0, 0.4);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875em;
  padding: 1rem;
  border-radius: 0.375rem;
  margin: 1.25rem 0;
  overflow-x: auto;
  color: #34d399;
  border: 1px solid rgba(66, 72, 67, 0.25);
}

.editor-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85em;
  background-color: rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.3rem;
  border-radius: 0.25rem;
  color: #b9c7e0;
}

.editor-content ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.editor-content ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.editor-content li {
  margin-bottom: 0.25rem;
}

.editor-content hr {
  border: 0;
  border-top: 1px solid rgba(66, 72, 67, 0.4);
  margin: 1.75rem 0;
}

/* Custom cursive font definition style */
.font-cursive {
  font-family: 'Comic Sans MS', 'Playpen Sans', 'Bradley Hand', 'Chalkboard SE', cursive, sans-serif !important;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease-out;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
