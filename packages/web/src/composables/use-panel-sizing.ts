import { ref, computed, onMounted, onUnmounted } from "vue";

const TOOLBAR_MIN_H = 48;
const SIDEBAR_MIN_W = 240;

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

  // aspect > 1 (wide): sidebar grows, toolbar stays near min
  // aspect < 1 (tall): toolbar grows, sidebar stays near min
  const aspect = computed(() => viewportW.value / viewportH.value);

  const toolbarHeight = computed(() =>
    Math.max(
      TOOLBAR_MIN_H,
      Math.round(viewportH.value * 0.06 * Math.min(1, 1 / aspect.value)),
    ),
  );

  const sidebarWidth = computed(() =>
    Math.max(
      SIDEBAR_MIN_W,
      Math.round(viewportW.value * 0.12 * Math.min(1, aspect.value)),
    ),
  );

  const canvasWidth = computed(() =>
    Math.max(1, viewportW.value - sidebarWidth.value),
  );
  const canvasHeight = computed(() =>
    Math.max(1, viewportH.value - toolbarHeight.value),
  );

  return { toolbarHeight, sidebarWidth, canvasWidth, canvasHeight };
}
