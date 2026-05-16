<script setup lang="ts">
import { ref } from "vue";
import { usePanelSizing } from "../composables/use-panel-sizing.js";
import AppToolbar from "./AppToolbar.vue";
import OutlineSidebar from "./OutlineSidebar.vue";
import CanvasViewport from "./CanvasViewport.vue";

// Default √2; updated when a document loads with its surface.aspectRatio.
const surfaceAspect = ref(Math.SQRT2);

const {
  toolbarHeight,
  sidebarWidth,
  sidebarHeight,
  canvasWidth,
  canvasHeight,
  contentMaxWidth,
  isPortrait,
} = usePanelSizing(surfaceAspect);
</script>

<template>
  <div class="flex justify-center w-screen h-screen overflow-hidden">
    <div
      class="flex flex-col h-full"
      :style="{ maxWidth: `${contentMaxWidth}px` }"
    >
      <AppToolbar :height="toolbarHeight" :width="contentMaxWidth" />
      <!-- Landscape: sidebar left, canvas right -->
      <div v-if="!isPortrait" class="flex flex-1 min-h-0">
        <OutlineSidebar :width="sidebarWidth" :height="canvasHeight" />
        <CanvasViewport :width="canvasWidth" :height="canvasHeight" />
      </div>
      <!-- Portrait: canvas top, sidebar bottom -->
      <div v-else class="flex flex-col flex-1 min-h-0">
        <CanvasViewport :width="canvasWidth" :height="canvasHeight" />
        <OutlineSidebar
          :width="canvasWidth"
          :height="sidebarHeight"
          :horizontal="true"
        />
      </div>
    </div>
  </div>
</template>
