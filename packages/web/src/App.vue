<script setup lang="ts">
import { ref, onMounted } from "vue";

const documentData = ref<unknown>(null);
const error = ref<string | null>(null);

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
</style>
