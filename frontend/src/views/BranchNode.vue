<template>
  <div
    :style="{ paddingLeft: `${depth * 24}px` }"
    class="flex items-center gap-1 py-1"
  >
    <button
      v-if="node.children.length"
      type="button"
      class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
      :aria-label="expanded ? $t('common.close') : $t('common.add')"
      @click="expanded = !expanded"
    >
      <i :class="['pi', expanded ? 'pi-chevron-down' : 'pi-chevron-right', 'text-xs']" aria-hidden="true" />
    </button>
    <span v-else class="inline-block w-6" />
    <i class="pi pi-sitemap text-surface-500 mr-1" aria-hidden="true" />
    <span class="flex-1 text-surface-900 dark:text-surface-100">{{ node.name }}</span>
    <div class="flex gap-0.5">
      <button
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :title="$t('branches.addChildTitle')"
        @click="$emit('addChild', node.id)"
      >
        <i class="pi pi-plus text-xs" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :title="$t('common.edit')"
        @click="$emit('edit', node)"
      >
        <i class="pi pi-pencil text-xs" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        :title="$t('common.delete')"
        @click="$emit('delete', node)"
      >
        <i class="pi pi-trash text-xs" aria-hidden="true" />
      </button>
    </div>
  </div>
  <div v-if="expanded && node.children.length">
    <BranchNode
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @add-child="$emit('addChild', $event)"
    />
  </div>
</template>

<script setup>
// FT-036 P2: Vue 3.3+ auto-recursion via filename — component references
// itself as <BranchNode> without explicit import.
import { ref } from 'vue'

defineOptions({ name: 'BranchNode' })

defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

defineEmits(['edit', 'delete', 'addChild'])

const expanded = ref(true)

defineExpose({ expanded })
</script>
