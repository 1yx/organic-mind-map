<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useCenterVisual } from "./composables/center-visual.js";

type PreviewPayload = {
  version: number;
  source: string;
  paper: string;
  tree: {
    version: number;
    title: string;
    center: { concept: string; visualHint?: string; svgUrl?: string };
    branches: Array<Record<string, unknown>>;
  };
  centerVisual?: {
    svgUrl?: string;
    source?: string;
  };
  meta?: {
    sourceTitle?: string;
    sourceSummary?: string;
  };
};

const documentData = ref<PreviewPayload | null>(null);
const error = ref<string | null>(null);

const centerSvgUrl = computed(() => documentData.value?.centerVisual?.svgUrl ?? null);
const { inlineSvg, loading: svgLoading, fellBack } = useCenterVisual(centerSvgUrl.value);

onMounted(async () => {
  try {
    const res = await fetch("/api/document");
    documentData.value = await res.json();
  } catch (e) {
    error.value = "Failed to load document. Ensure the CLI preview server is running.";
  }
});
</script>

<template>
  <div class="preview">
    <h1>Organic Mind Map — Preview</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-else-if="documentData" class="map-canvas">
      <div class="center-visual-info">
        <span v-if="svgLoading">Loading center SVG...</span>
        <span v-else-if="inlineSvg">Center SVG loaded (controlled source)</span>
        <span v-else-if="fellBack">Using built-in center visual (fallback)</span>
        <span v-else>No center SVG URL provided</span>
      </div>
      <!-- Inline rendered SVG when successfully loaded -->
      <div v-if="inlineSvg" class="center-svg-container" v-html="inlineSvg" />
      <pre>{{ JSON.stringify(documentData, null, 2) }}</pre>
    </div>
    <div v-else class="loading">Loading document...</div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f8f8f8;
}
.preview {
  max-width: 960px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.error {
  color: #c00;
}
.map-canvas {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
}
.center-visual-info {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}
.center-svg-container {
  max-width: 120px;
  max-height: 120px;
  margin: 1rem auto;
}
.center-svg-container svg {
  width: 100%;
  height: 100%;
}
</style>
