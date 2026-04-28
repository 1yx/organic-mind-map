<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useCenterVisual } from "./composables/center-visual.js";
import {
  renderFromPreview,
  createCanvasMeasurementAdapter,
  type PreviewPayload,
  type RenderResult,
} from "@omm/renderer";

// ─── State ──────────────────────────────────────────────────────────────

const documentData = ref<PreviewPayload | null>(null);
const error = ref<string | null>(null);
const loading = ref(true);
const renderResult = ref<RenderResult | null>(null);
const renderError = ref<string | null>(null);

// ─── Center Visual ──────────────────────────────────────────────────────

const centerSvgUrl = computed(
  () => documentData.value?.centerVisual?.svgUrl ?? null,
);
const { inlineSvg, loading: svgLoading, fellBack } = useCenterVisual(centerSvgUrl);

// ─── Paper aspect ratio ─────────────────────────────────────────────────

const PAPER_ASPECT: Record<string, number> = {
  "a3-landscape": 420 / 297,
  "a4-landscape": 297 / 210,
};

const paperAspect = computed(() => {
  const paper = documentData.value?.paper;
  return paper ? (PAPER_ASPECT[paper] ?? 420 / 297) : 420 / 297;
});

// ─── Fetch & Render ─────────────────────────────────────────────────────

onMounted(async () => {
  try {
    loading.value = true;
    const res = await fetch("/api/document");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();

    // Basic validation: must have version, source, tree
    if (!data || data.version !== 1 || !data.tree) {
      throw new Error("Invalid document format: missing version or tree");
    }

    documentData.value = data as PreviewPayload;
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Failed to load document from server.";
    loading.value = false;
    return;
  }

  // Render using the SVG renderer
  try {
    const measure = createCanvasMeasurementAdapter();
    if (!measure) {
      throw new Error("Browser does not support Canvas 2D text measurement.");
    }
    const result = renderFromPreview(documentData.value!, { measure });
    renderResult.value = result;
  } catch (e) {
    renderError.value =
      e instanceof Error ? e.message : "Renderer failed to produce SVG.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="preview">
    <!-- Error state -->
    <div v-if="error" class="error-state">
      <h2>Preview Error</h2>
      <p>{{ error }}</p>
      <p class="hint">Ensure the CLI preview server is running with a valid input file.</p>
    </div>

    <!-- Loading state -->
    <div v-else-if="loading" class="loading-state">
      <p>Loading document...</p>
    </div>

    <!-- Render error state -->
    <div v-else-if="renderError" class="error-state">
      <h2>Render Error</h2>
      <p>{{ renderError }}</p>
      <p class="hint">The mind map data loaded but the renderer encountered a failure.</p>
    </div>

    <!-- Success state: SVG preview -->
    <div v-else-if="renderResult" class="map-canvas">
      <!-- Paper-proportional viewport -->
      <div
        class="paper-surface"
        :style="{ aspectRatio: String(paperAspect) }"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="svg-container" v-html="renderResult.svg" />
      </div>

      <!-- Diagnostics -->
      <div v-if="renderResult.diagnostics.length > 0" class="diagnostics">
        <p class="diagnostics-title">Diagnostics ({{ renderResult.diagnostics.length }})</p>
        <ul>
          <li
            v-for="(d, i) in renderResult.diagnostics"
            :key="i"
            :class="['diagnostic', `diagnostic-${d.severity}`]"
          >
            [{{ d.severity.toUpperCase() }}] {{ d.kind }}: {{ d.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f0f0f0;
}

.preview {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;
}

/* ─── Error / Loading states ──────────────────────────────────────────── */

.error-state {
  max-width: 480px;
  background: #fff;
  border: 1px solid #e0c4c4;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
}

.error-state h2 {
  color: #c00;
  margin: 0 0 0.5rem;
}

.error-state .hint {
  color: #888;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.loading-state {
  color: #666;
  font-size: 1rem;
}

/* ─── Map canvas ──────────────────────────────────────────────────────── */

.map-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: 100%;
  max-height: 100%;
}

.paper-surface {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  max-width: 90vw;
  max-height: 85vh;
  width: auto;
  height: auto;
}

.svg-container {
  width: 100%;
  height: 100%;
}

.svg-container :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

/* ─── Diagnostics ─────────────────────────────────────────────────────── */

.diagnostics {
  max-width: 480px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
}

.diagnostics-title {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  color: #666;
}

.diagnostics ul {
  margin: 0;
  padding-left: 1rem;
}

.diagnostic {
  margin: 0.125rem 0;
}

.diagnostic-info {
  color: #888;
}

.diagnostic-warning {
  color: #b08000;
}

.diagnostic-error {
  color: #c00;
}
</style>
