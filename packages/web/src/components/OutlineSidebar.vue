<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  width: number;
  height: number;
  horizontal?: boolean;
}>();

const outlineText = ref(`Anthropic 产品之道
  极速交付
    研究预览
    跨职能
  PM 角色
    产品品味
    角色融合`);
</script>

<template>
  <!-- Portrait (bottom bar): horizontal layout, border on top -->
  <div
    v-if="horizontal"
    class="flex border-t border-gray-700"
    :style="{ width: `${width}px`, height: `${height}px`, background: '#1e1e1e' }"
  >
    <!-- Collapsed tool options label -->
    <div class="flex items-center px-3 border-r border-gray-700">
      <span class="text-xs text-gray-500 select-none whitespace-nowrap"
        >Tools</span
      >
    </div>
    <!-- Outline textarea fills remaining width -->
    <textarea
      class="flex-1 resize-none bg-transparent text-gray-200 p-3 text-sm leading-relaxed focus:outline-none"
      style="font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace"
      spellcheck="false"
      v-model="outlineText"
    />
  </div>
  <!-- Landscape (left sidebar): vertical layout, border on right -->
  <div
    v-else
    class="flex flex-col border-r border-gray-700"
    :style="{ width: `${width}px`, height: `${height}px`, background: '#1e1e1e' }"
  >
    <!-- Tool options panel (top section) -->
    <div class="border-b border-gray-700">
      <div class="px-3 py-2 text-xs text-gray-500 select-none">Tool Options</div>
      <div class="px-3 pb-3">
        <div class="text-xs text-gray-600 select-none">No tool selected</div>
      </div>
    </div>
    <!-- Content outline editor (bottom, fills remaining space) -->
    <div class="flex flex-col flex-1 min-h-0">
      <div
        class="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-700 select-none"
      >
        Content Outline
      </div>
      <textarea
        class="flex-1 resize-none bg-transparent text-gray-200 p-3 text-sm leading-relaxed focus:outline-none min-h-0"
        style="font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace"
        spellcheck="false"
        v-model="outlineText"
      />
    </div>
  </div>
</template>
