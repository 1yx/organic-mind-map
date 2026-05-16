<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import paper from "paper";

const props = defineProps<{ width: number; height: number }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

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
</script>

<template>
  <div
    id="workspace"
    class="flex-shrink-0"
    :style="{ width: `${width}px`, height: `${height}px` }"
  >
    <canvas
      ref="canvasRef"
      :width="width"
      :height="height"
      class="block"
    />
  </div>
</template>
