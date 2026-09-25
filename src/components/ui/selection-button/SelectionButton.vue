<script setup lang="ts">
withDefaults(
  defineProps<{
    selected?: boolean
    meta?: string
    badge?: string
    stretch?: boolean
  }>(),
  {
    selected: false,
    meta: undefined,
    badge: undefined,
    stretch: false,
  },
)
</script>

<template>
  <button
    type="button"
    data-slot="selection-button"
    class="selection-button"
    :class="{ selected, stretch }"
    :aria-pressed="selected"
  >
    <span class="selection-indicator" aria-hidden="true"></span>
    <span class="selection-label"><slot /></span>
    <span v-if="meta" class="selection-meta">{{ meta }}</span>
    <span v-if="badge" class="selection-badge">{{ badge }}</span>
  </button>
</template>

<style scoped>
.selection-button {
  position: relative;
  flex: 0 0 auto;
  min-width: 150px;
  padding: 12px 16px;
  border: 1px solid #e5e0d5;
  border-radius: 12px;
  background: #fff;
  color: #2c2c2c;
  font: inherit;
  font-size: 12.5px;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    background-color 150ms ease;
}

.selection-button:hover {
  border-color: #b9c9d9;
  background: #f8fafc;
}

.selection-button:focus-visible {
  outline: 2px solid #3a6ea5;
  outline-offset: 4px;
}

.selection-button.selected {
  border-color: #e0954a;
  box-shadow: 0 0 0 2px rgba(224, 149, 74, 0.3);
}

.selection-button.stretch {
  width: 100%;
  min-width: 0;
}

.selection-indicator {
  display: block;
  width: 12px;
  height: 12px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: #3a6ea5;
}

.selected .selection-indicator {
  background: #e0954a;
}

.selection-label {
  display: block;
}

.selection-meta {
  display: block;
  margin-top: 2px;
  color: #999;
}

.selection-badge {
  position: absolute;
  top: -9px;
  right: -8px;
  padding: 3px 7px;
  border-radius: 999px;
  background: #45a568;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}
</style>
