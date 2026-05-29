<!-- client/src/components/BaseButton.vue -->
<script setup>
defineProps({
  type: {
    type: String,
    default: 'button',
  },
});
</script>

<template>
  <button
    :type="type"
    class="transition duration-150 active:scale-[0.97] focus-visible:outline-none"
  >
    <slot></slot>
  </button>
</template>
