import { ref, computed, onMounted, onUnmounted } from "vue";

const TOOLBAR_MIN_H = 48;
const SIDEBAR_MIN_W = 240;
const TOOLBAR_SCALE = 0.04;
const SIDEBAR_SCALE = 0.08;

export function usePanelSizing() {
  const viewportW = ref(window.innerWidth);
  const viewportH = ref(window.innerHeight);

  function onResize() {
    viewportW.value = window.innerWidth;
    viewportH.value = window.innerHeight;
  }

  onMounted(() => window.addEventListener("resize", onResize));
  onUnmounted(() => window.removeEventListener("resize", onResize));

  const toolbarHeight = computed(() =>
    Math.max(TOOLBAR_MIN_H, Math.round(viewportH.value * TOOLBAR_SCALE)),
  );

  const sidebarWidth = computed(() =>
    Math.max(SIDEBAR_MIN_W, Math.round(viewportW.value * SIDEBAR_SCALE)),
  );

  const canvasWidth = computed(() => viewportW.value - sidebarWidth.value);
  const canvasHeight = computed(() => viewportH.value - toolbarHeight.value);

  return { toolbarHeight, sidebarWidth, canvasWidth, canvasHeight };
}
