<script setup lang="ts">
import type { CardFields, EditedField } from '@/lib/persistence'
const props = defineProps<{ card: CardFields; label?: string; editable?: boolean }>()
const emit = defineEmits<{ edit: [field: EditedField, value: string] }>()
function update(field: EditedField, event: Event) {
  emit('edit', field, (event.target as HTMLInputElement).value)
}
</script>
<template>
  <article class="echo-card">
    <h2 class="card-h1">{{ label ? `${label}：` : '' }}{{ props.card.title }}</h2>
    <div class="echo-grid">
      <section class="echo-box">
        <h3>事件的發生</h3>
        <textarea
          v-if="editable"
          aria-label="事件的發生"
          :value="card.happen.join('\n')"
          rows="3"
          @input="update('happen', $event)"
        />
        <ul v-else>
          <li v-for="(item, index) in card.happen" :key="index">{{ item }}</li>
        </ul>
      </section>
      <section
        v-for="field in ['emotion', 'like', 'dislike', 'value', 'quote'] as const"
        :key="field"
        class="echo-box"
      >
        <h3>
          {{
            {
              emotion: '我的情緒',
              like: '我在意／適合／擅長',
              dislike: '我討厭／不適合／不在意',
              value: '我的價值主張',
              quote: '引證原話',
            }[field]
          }}
        </h3>
        <textarea
          v-if="editable"
          :aria-label="field"
          :value="card[field]"
          rows="2"
          @input="update(field, $event)"
        />
        <p v-else>{{ card[field] }}</p>
      </section>
    </div>
    <label v-if="editable" class="flex flex-col gap-1"
      >事件標題<input
        :value="card.title"
        aria-label="事件標題"
        class="rounded border border-input p-2"
        @input="update('title', $event)"
    /></label>
    <slot />
  </article>
</template>
