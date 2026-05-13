<script setup lang="ts">
import { usePanelSizing } from "../composables/use-panel-sizing.js";
import AppToolbar from "./AppToolbar.vue";
import OutlineSidebar from "./OutlineSidebar.vue";
import CanvasViewport from "./CanvasViewport.vue";

const { toolbarHeight, sidebarWidth, canvasWidth, canvasHeight } =
  usePanelSizing();
</script>

<template>
  <div class="flex flex-col w-screen h-screen overflow-hidden">
    <AppToolbar :height="toolbarHeight" />
    <div class="flex flex-1 min-h-0">
      <OutlineSidebar :width="sidebarWidth" :height="canvasHeight" />
      <CanvasViewport :width="canvasWidth" :height="canvasHeight" />
    </div>
  </div>
</template>
