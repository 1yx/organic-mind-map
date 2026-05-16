<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import paper from "paper";
import type { OmmDocument } from "@omm/core";
import { filterInternalFields } from "../utils/canvas-filter.js";

const props = defineProps<{
  width: number;
  height: number;
  ommData?: OmmDocument | null;
  sourceKind?: "prediction_omm" | "user_saved_omm";
  loading?: boolean;
  error?: string | null;
  isDirty?: boolean;
  hasLocalDraft?: boolean;
  showInternals?: boolean;
}>();

const emit = defineEmits<{
  markDirty: [];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

/** OMM data filtered for normal canvas rendering. */
const displayData = computed(() => {
  if (!props.ommData) return null;
  // user_saved_omm is already clean (backend strips internals on save).
  // prediction_omm may contain masks/debug fields — filter unless admin.
  if (props.sourceKind === "user_saved_omm" || props.showInternals) {
    return props.ommData;
  }
  return filterInternalFields(
    props.ommData as unknown as Record<string, unknown>,
  ) as unknown as OmmDocument;
});

onMounted(() => {
  if (canvasRef.value) {
    paper.setup(canvasRef.value);
  }
});

watch(
  () => [props.width, props.height],
  () => {
    if (paper.view) {
      paper.view.viewSize = new paper.Size(props.width, props.height);
    }
  },
);

// Re-render when display-ready data changes.
watch(displayData, (omm) => {
  if (!omm || !paper.project) return;
  paper.project.clear();

  // TODO: Render OMM branches/nodes onto the Paper.js canvas.
});
</script>

<template>
  <div class="relative flex-1">
    <canvas ref="canvasRef" :width="width" :height="height" class="block" />

    <!-- Draft recovery hint -->
    <div
      v-if="hasLocalDraft && !loading"
      class="absolute top-2 right-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1"
    >
      Draft recovered from local storage
    </div>

    <!-- Unsaved indicator -->
    <div
      v-if="isDirty"
      class="absolute top-2 left-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1"
    >
      Unsaved changes
    </div>

    <!-- Admin internals badge -->
    <div
      v-if="showInternals"
      class="absolute bottom-2 right-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1"
    >
      Admin: showing internal fields
    </div>

    <!-- Loading overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-white/60"
    >
      <p class="text-sm text-gray-500">Loading document…</p>
    </div>

    <!-- Error overlay -->
    <div
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-white/60"
    >
      <p class="text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>
