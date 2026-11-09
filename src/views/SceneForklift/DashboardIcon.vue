<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-if="name === 'eye'" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle v-if="name === 'eye'" cx="12" cy="12" r="3" />
    <template v-else-if="name === 'layers'">
      <path d="m2 8 10-6 10 6-10 6L2 8Zm0 5 10 6 10-6M2 18l10 5 10-5" />
    </template>
    <template v-else-if="name === 'cube'">
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7m9 5v10M7.5 4.5l9 5" />
    </template>
    <template v-else-if="name === 'video'">
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="m16 9 6-3v12l-6-3Z" />
    </template>
    <template v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v5m0 12v5M1 12h5m12 0h5" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 20V10h3v10M11 20V4h3v16M18 20V7h3v13" />
    </template>
    <template v-else-if="name === 'machine'">
      <path d="M3 20h18M6 19v-7h7v7M9 12V3h3v6l7 4v3h-3v-2l-4-2M4 20v2m16-2v2" />
    </template>
    <template v-else-if="name === 'bell'">
      <path d="M4 17h16l-2-3V9a6 6 0 0 0-12 0v5l-2 3Z" fill="currentColor" stroke="none" />
      <path d="M10 21h4M12 1v2" />
    </template>
    <template v-else-if="name === 'book'">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 2v20m4-15h5m-5 5h5m-5 5h5" />
    </template>
  </svg>
</template>
<script setup lang="ts">
defineProps<{
  name: 'eye' | 'layers' | 'cube' | 'video' | 'target' | 'chart' | 'machine' | 'bell' | 'book'
}>()
</script>
