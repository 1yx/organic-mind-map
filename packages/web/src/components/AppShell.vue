<script setup lang="ts">
import { usePanelSizing } from "../composables/use-panel-sizing.js";
import AppToolbar from "./AppToolbar.vue";
import OutlineSidebar from "./OutlineSidebar.vue";
import CanvasViewport from "./CanvasViewport.vue";

const {
  toolbarHeight,
  sidebarWidth,
  sidebarHeight,
  canvasWidth,
  canvasHeight,
  isPortrait,
} = usePanelSizing();
</script>

<template>
  <div class="flex flex-col w-screen h-screen overflow-hidden">
    <AppToolbar :height="toolbarHeight" />
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
</template>
