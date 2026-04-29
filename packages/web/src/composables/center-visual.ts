/**
 * Center visual loading composable.
 *
 * Manages the lifecycle of loading an SVG URL for the center visual:
 * 1. URL gate: check svgUrl against HTTPS + host + path allowlist
 * 2. If allowed, asynchronously fetch and safety-check it
 * 3. If safe, render it inline as the center visual
 * 4. If absent, gate-rejected, fetch-failed, or content-rejected, fall back
 *
 * center.svgUrl is an untrusted optional visual hint from Agent output.
 * The URL gate and content safety check happen entirely in the browser.
 */

import {
  ref,
  readonly,
  watch,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";
import { loadControlledSvg, isAllowedSvgUrl } from "@omm/renderer";

export type CenterVisualState = {
  /** The loaded and safety-checked inline SVG string, or null. */
  inlineSvg: Readonly<Ref<string | null>>;
  /** Whether the SVG is currently being loaded. */
  loading: Readonly<Ref<boolean>>;
  /** Whether loading was attempted and failed (fell back). */
  fellBack: Readonly<Ref<boolean>>;
};

/**
 * Create a center visual state that reactively loads a controlled SVG URL.
 *
 * @param svgUrl - Reactive or static SVG URL (e.g. a computed ref)
 * @param options - Optional load options (timeout, max size)
 * @returns Reactive state for the center visual
 */
export function useCenterVisual(
  svgUrl: MaybeRefOrGetter<string | null | undefined>,
  options?: { timeoutMs?: number; maxSizeBytes?: number },
): CenterVisualState {
  const inlineSvg = ref<string | null>(null);
  const loading = ref(false);
  const fellBack = ref(false);

  watch(
    () => toValue(svgUrl),
    (url) => {
      inlineSvg.value = null;
      fellBack.value = false;

      if (!url) {
        fellBack.value = true;
        return;
      }

      // URL gate: reject before any network request
      const allowedUrl = isAllowedSvgUrl(url);
      if (!allowedUrl) {
        fellBack.value = true;
        return;
      }

      loading.value = true;

      loadControlledSvg(allowedUrl, {
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
    },
    { immediate: true },
  );

  return {
    inlineSvg: readonly(inlineSvg),
    loading: readonly(loading),
    fellBack: readonly(fellBack),
  };
}
