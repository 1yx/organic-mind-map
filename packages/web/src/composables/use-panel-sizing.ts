import { ref, computed, onMounted, onUnmounted } from "vue";

const TOOLBAR_MIN_H = 48;
const SIDEBAR_MIN_W = 240;
const TOOLBAR_SCALE = 0.06;
const SIDEBAR_SCALE = 0.12;

const getWindowSize = () => ({
  w: typeof window !== "undefined" ? window.innerWidth : 1280,
  h: typeof window !== "undefined" ? window.innerHeight : 800,
});

export function usePanelSizing() {
  const initial = getWindowSize();
  const viewportW = ref(initial.w);
  const viewportH = ref(initial.h);

  function onResize() {
    const size = getWindowSize();
    viewportW.value = size.w;
    viewportH.value = size.h;
  }

  onMounted(() => window.addEventListener("resize", onResize));
  onUnmounted(() => window.removeEventListener("resize", onResize));

  const toolbarHeight = computed(() =>
    Math.max(TOOLBAR_MIN_H, Math.round(viewportH.value * TOOLBAR_SCALE)),
  );

  const sidebarWidth = computed(() =>
    Math.max(SIDEBAR_MIN_W, Math.round(viewportW.value * SIDEBAR_SCALE)),
  );

  const canvasWidth = computed(() =>
    Math.max(1, viewportW.value - sidebarWidth.value),
  );
  const canvasHeight = computed(() =>
    Math.max(1, viewportH.value - toolbarHeight.value),
  );

  return { toolbarHeight, sidebarWidth, canvasWidth, canvasHeight };
}
