import { ref, computed, onMounted, onUnmounted, type Ref } from "vue";

const TOOLBAR_MIN_H = 48;
const TOOLBAR_MAX_H = 56;
const SIDEBAR_MIN_W = 240;
const SIDEBAR_MAX_W = 360;
const SIDEBAR_MIN_H = 200;
const SIDEBAR_MAX_H = 320;
const DEFAULT_SURFACE_ASPECT = Math.SQRT2;

const getWindowSize = () => ({
  w: typeof window !== "undefined" ? window.innerWidth : 1280,
  h: typeof window !== "undefined" ? window.innerHeight : 800,
});

type DimOpts = {
  toolbarH: number;
  sidebarW: number;
  sidebarH: number;
  canvasW: number;
  canvasH: number;
};

export function computeLandscape(
  vw: number,
  vh: number,
  sa: number,
): DimOpts & { contentMaxWidth: number } {
  let toolbarH = TOOLBAR_MIN_H;
  let idealSidebarW = vw - sa * (vh - toolbarH);
  if (idealSidebarW < SIDEBAR_MIN_W) {
    idealSidebarW = SIDEBAR_MIN_W;
    toolbarH = Math.min(
      TOOLBAR_MAX_H,
      Math.max(TOOLBAR_MIN_H, Math.round(vh - (vw - idealSidebarW) / sa)),
    );
  }
  const sidebarW = Math.min(
    SIDEBAR_MAX_W,
    Math.max(SIDEBAR_MIN_W, Math.round(idealSidebarW)),
  );
  const availableH = vh - toolbarH;
  const canvasH = Math.max(1, Math.min(availableH, (vw - sidebarW) / sa));
  const canvasW = Math.round(canvasH * sa);
  return {
    toolbarH,
    sidebarW,
    sidebarH: 0,
    canvasW,
    canvasH,
    contentMaxWidth: sidebarW + canvasW,
  };
}

export function computePortrait(
  vw: number,
  vh: number,
  sa: number,
): DimOpts & { contentMaxWidth: number } {
  let toolbarH = TOOLBAR_MIN_H;
  let idealSidebarH = vh - toolbarH - vw / sa;
  if (idealSidebarH < SIDEBAR_MIN_H) {
    idealSidebarH = SIDEBAR_MIN_H;
    toolbarH = Math.min(
      TOOLBAR_MAX_H,
      Math.max(TOOLBAR_MIN_H, Math.round(vh - idealSidebarH - vw / sa)),
    );
  }
  const sidebarH = Math.min(
    SIDEBAR_MAX_H,
    Math.max(SIDEBAR_MIN_H, Math.round(idealSidebarH)),
  );
  const canvasW = Math.max(1, vw);
  const canvasH = Math.max(1, Math.min(vh - toolbarH - sidebarH, vw / sa));
  return {
    toolbarH,
    sidebarW: 0,
    sidebarH,
    canvasW,
    canvasH,
    contentMaxWidth: vw,
  };
}

export function usePanelSizing(surfaceAspect?: Ref<number>) {
  const initial = getWindowSize();
  const vw = ref(initial.w);
  const vh = ref(initial.h);

  function onResize() {
    const size = getWindowSize();
    vw.value = size.w;
    vh.value = size.h;
  }

  onMounted(() => window.addEventListener("resize", onResize));
  onUnmounted(() => window.removeEventListener("resize", onResize));

  const sa = computed(() => surfaceAspect?.value ?? DEFAULT_SURFACE_ASPECT);
  const isPortrait = computed(() => vw.value < vh.value);

  const landscape = computed(() =>
    computeLandscape(vw.value, vh.value, sa.value),
  );
  const portrait = computed(() =>
    computePortrait(vw.value, vh.value, sa.value),
  );

  const dims = computed(() =>
    isPortrait.value ? portrait.value : landscape.value,
  );

  return {
    toolbarHeight: computed(() => dims.value.toolbarH),
    sidebarWidth: computed(() => dims.value.sidebarW),
    sidebarHeight: computed(() => dims.value.sidebarH),
    canvasWidth: computed(() => dims.value.canvasW),
    canvasHeight: computed(() => dims.value.canvasH),
    contentMaxWidth: computed(() => dims.value.contentMaxWidth),
    isPortrait,
  };
}
