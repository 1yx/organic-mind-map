/**
 * Center visual loading composable.
 *
 * Manages the lifecycle of loading a controlled SVG URL for the center visual:
 * 1. If svgUrl is present, asynchronously fetch and safety-check it
 * 2. If safe, render it inline as the center visual
 * 3. If absent, failed, rejected, or timed out, fall back to built-in visuals
 *
 * Phase 1 accepts single-color SVGs from controlled sources.
 */

import { ref, readonly, type Ref } from "vue";
import { loadControlledSvg } from "@omm/renderer";

export type CenterVisualState = {
  /** The loaded and safety-checked inline SVG string, or null. */
  inlineSvg: Readonly<Ref<string | null>>;
  /** Whether the SVG is currently being loaded. */
  loading: Readonly<Ref<boolean>>;
  /** Whether loading was attempted and failed (fell back). */
  fellBack: Readonly<Ref<boolean>>;
};

/**
 * Create a center visual state that loads a controlled SVG URL.
 *
 * @param svgUrl - The allowlisted SVG URL from PreviewPayload.centerVisual.svgUrl
 * @param options - Optional load options (timeout, max size)
 * @returns Reactive state for the center visual
 */
export function useCenterVisual(
  svgUrl: string | null | undefined,
  options?: { timeoutMs?: number; maxSizeBytes?: number },
): CenterVisualState {
  const inlineSvg = ref<string | null>(null);
  const loading = ref(false);
  const fellBack = ref(false);

  if (!svgUrl) {
    // No URL provided — use deterministic built-in fallback immediately
    fellBack.value = true;
    return { inlineSvg: readonly(inlineSvg), loading: readonly(loading), fellBack: readonly(fellBack) };
  }

  // Async load the controlled SVG
  loading.value = true;

  loadControlledSvg(svgUrl, {
    timeoutMs: options?.timeoutMs,
    maxSizeBytes: options?.maxSizeBytes,
  })
    .then((svg) => {
      if (svg) {
        inlineSvg.value = svg;
      } else {
        fellBack.value = true;
      }
    })
    .catch(() => {
      fellBack.value = true;
    })
    .finally(() => {
      loading.value = false;
    });

  return { inlineSvg: readonly(inlineSvg), loading: readonly(loading), fellBack: readonly(fellBack) };
}
