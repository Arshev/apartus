<template>
  <div :style="{ paddingLeft: `${depth * 24}px` }" class="d-flex align-center py-1">
    <v-icon v-if="node.children.length" size="small" class="mr-1" @click="expanded = !expanded">
      {{ expanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
    </v-icon>
    <v-icon v-else size="small" class="mr-1">mdi-minus</v-icon>
    <v-icon size="small" class="mr-2">mdi-source-branch</v-icon>
    <span class="text-body-1">{{ node.name }}</span>
    <v-spacer />
    <v-btn icon="mdi-plus" variant="text" size="x-small" :title="$t('branches.addChildTitle')" @click="$emit('addChild', node.id)" />
    <v-btn icon="mdi-pencil" variant="text" size="x-small" @click="$emit('edit', node)" />
    <v-btn icon="mdi-delete" variant="text" size="x-small" color="error" @click="$emit('delete', node)" />
  </div>
  <div v-if="expanded && node.children.length">
    <branch-node
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

<script>
export default {
  name: 'BranchNode',
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, default: 0 },
  },
  emits: ['edit', 'delete', 'addChild'],
  data() {
    return { expanded: true }
  },
}
</script>
