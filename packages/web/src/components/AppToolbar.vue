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
  Eye,
  EyeOff,
  Save,
} from "lucide-vue-next";

defineProps<{
  height: number;
  canSave?: boolean;
  saving?: boolean;
  isAdmin?: boolean;
  showInternals?: boolean;
}>();

const emit = defineEmits<{
  save: [];
  toggleInternals: [];
}>();

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
    :style="{ height: `${height}px` }"
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

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Admin debug toggle -->
    <button
      v-if="isAdmin"
      :title="showInternals ? 'Hide internal fields' : 'Show internal fields'"
      class="flex items-center justify-center rounded p-1.5 text-purple-600 hover:bg-purple-50 transition-colors mr-1"
      :style="{ width: `${height - 12}px`, height: `${height - 12}px` }"
      @click="emit('toggleInternals')"
    >
      <EyeOff v-if="showInternals" :size="height - 16" />
      <Eye v-else :size="height - 16" />
    </button>

    <!-- Save button -->
    <button
      title="Save"
      :disabled="!canSave || saving"
      class="flex items-center gap-1 rounded px-2 py-1 text-sm font-medium transition-colors"
      :class="
        canSave && !saving
          ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      "
      @click="emit('save')"
    >
      <Save :size="14" />
      {{ saving ? "Saving…" : "Save" }}
    </button>
  </div>
</template>
