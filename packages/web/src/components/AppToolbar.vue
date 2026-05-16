<script setup lang="ts">
import {
  Menu,
  Hand,
  MousePointer2,
  Square,
  Diamond,
  Circle,
  MoveRight,
  Minus,
  Pencil,
  Type,
  Image,
  Eraser,
} from "lucide-vue-next";

defineProps<{ height: number; width?: number }>();

const tools = [
  { name: "Select", icon: MousePointer2 },
  { name: "Hand", icon: Hand },
  { name: "Rectangle", icon: Square },
  { name: "Diamond", icon: Diamond },
  { name: "Ellipse", icon: Circle },
  { name: "Arrow", icon: MoveRight },
  { name: "Line", icon: Minus },
  { name: "Freedraw", icon: Pencil },
  { name: "Text", icon: Type },
  { name: "Image", icon: Image },
  { name: "Eraser", icon: Eraser },
] as const;
</script>

<template>
  <div
    class="flex items-center bg-white border-b border-gray-200 px-1"
    :style="{
      height: `${height}px`,
      ...(width ? { width: `${width}px` } : {}),
    }"
  >
    <!-- Hamburger menu -->
    <button
      title="Menu"
      disabled
      class="flex items-center justify-center rounded p-1.5 text-gray-600 cursor-not-allowed hover:bg-gray-100 transition-colors"
      :style="{ width: `${height - 12}px`, height: `${height - 12}px` }"
    >
      <Menu :size="height - 16" />
    </button>

    <!-- Divider -->
    <div class="w-px self-stretch mx-1.5 bg-gray-200" />

    <!-- Tool buttons -->
    <div class="flex items-center gap-0.5">
      <button
        v-for="tool in tools"
        :key="tool.name"
        :title="tool.name"
        disabled
        class="flex items-center justify-center rounded p-1.5 text-gray-500 cursor-not-allowed hover:bg-gray-100 transition-colors"
        :style="{ width: `${height - 12}px`, height: `${height - 12}px` }"
      >
        <component :is="tool.icon" :size="height - 16" />
      </button>
    </div>
  </div>
</template>
