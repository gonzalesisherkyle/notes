<!-- client/src/components/FieldInput.vue -->
<script setup>
import { computed, ref } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import BaseButton from './BaseButton.vue';

defineOptions({
  inheritAttrs: false
});

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  minlength: {
    type: [String, Number],
    default: '',
  },
  maxlength: {
    type: [String, Number],
    default: '',
  },
  autocomplete: {
    type: String,
    default: '',
  },
  accentColor: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'default', // 'default' | 'editorial'
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'keydown']);

const isFocused = ref(false);
const showPassword = ref(false);

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password';
  }
  return props.type;
});

function handleInput(event) {
  emit('update:modelValue', event.target.value);
}

function handleFocus(event) {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event) {
  isFocused.value = false;
  emit('blur', event);
}

function handleKeydown(event) {
  emit('keydown', event);
}
</script>

<template>
  <input
    v-if="type === 'checkbox'"
    :id="id"
    type="checkbox"
    :checked="!!modelValue"
    v-bind="$attrs"
    @change="$emit('update:modelValue', $event.target.checked)"
  />
  <div v-else class="w-full text-left" :class="variant === 'default' ? 'space-y-1.5' : ''" v-bind="$attrs">
    <!-- Label -->
    <label 
      v-if="label && variant === 'default'" 
      :for="id" 
      class="block text-[11px] font-semibold uppercase tracking-[0.12em] text-quiet-muted/90"
    >
      {{ label }}
    </label>
    
    <div class="relative group">
      <!-- Left Icon Slot -->
      <span 
        v-if="$slots.icon && variant === 'default'" 
        class="absolute left-3.5 top-1/2 -translate-y-1/2 text-quiet-muted/50 transition-colors duration-150"
        :style="isFocused && accentColor ? { color: accentColor } : {}"
        :class="isFocused && !accentColor ? 'text-quiet-primary' : ''"
      >
        <slot name="icon"></slot>
      </span>
      
      <!-- Native Input Element (Default Box Style) -->
      <input
        v-if="variant === 'default'"
        :id="id"
        :value="modelValue"
        :type="inputType"
        :placeholder="placeholder"
        :required="required"
        :minlength="minlength"
        :maxlength="maxlength"
        :autocomplete="autocomplete"
        :readonly="readonly"
        class="h-11 w-full rounded-xl border bg-ink-surface/50 text-sm text-quiet-text outline-none transition duration-200 focus:bg-ink-surface placeholder:text-quiet-muted/30"
        :class="[
          $slots.icon ? 'pl-10' : 'px-3.5',
          (type === 'password' || $slots.right) ? 'pr-11' : 'pr-4',
          error ? 'border-quiet-danger/45 focus:border-quiet-danger focus:ring-quiet-danger/10' : 'border-quiet-outline/25'
        ]"
        :style="[
          isFocused && !error && accentColor ? { borderColor: accentColor, boxShadow: `0 0 0 1px ${accentColor}15` } : {},
          isFocused && !error && !accentColor ? { borderColor: '#a9cfb7', boxShadow: '0 0 0 1px rgba(169, 207, 183, 0.15)' } : {}
        ]"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />

      <!-- Editorial Input Element (Title Editor) -->
      <input
        v-else-if="variant === 'editorial'"
        :id="id"
        :value="modelValue"
        type="text"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :required="required"
        class="w-full bg-transparent font-editor text-[32px] font-bold leading-10 tracking-tight text-quiet-text outline-none border-b pb-2 transition-colors duration-250 placeholder:text-quiet-muted/30"
        :style="[
          isFocused && accentColor ? { borderBottomColor: accentColor + '40' } : { borderBottomColor: 'transparent' }
        ]"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
      
      <!-- Password toggle button -->
      <BaseButton
        v-if="type === 'password' && variant === 'default'"
        type="button"
        class="absolute right-3.5 top-1/2 -translate-y-1/2 text-quiet-muted/50 hover:text-quiet-text transition-colors p-1"
        @click="showPassword = !showPassword"
        title="Toggle password visibility"
      >
        <Eye v-if="showPassword" class="h-4 w-4" />
        <EyeOff v-else class="h-4 w-4" />
      </BaseButton>

      <!-- Right Action Slot -->
      <span 
        v-if="$slots.right && type !== 'password' && variant === 'default'"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center"
      >
        <slot name="right"></slot>
      </span>
    </div>
    
    <!-- Inline Error message -->
    <p v-if="error && variant === 'default'" class="text-[10px] text-quiet-danger leading-relaxed font-semibold pl-1">
      {{ error }}
    </p>
  </div>
</template>
