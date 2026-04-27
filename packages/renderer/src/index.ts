/**
 * @omm/renderer - SVG layout, rendering, and measurement.
 *
 * Consumes validated data from @omm/core and produces SVG render models.
 */

import type { OmmDocument } from "@omm/core";

export interface SvgRenderModel {
  svg: string;
  viewBox: string;
}

/**
 * Placeholder: renders an OmmDocument to an SVG render model.
 */
export function renderOmmToSvgModel(_doc: OmmDocument): SvgRenderModel {
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle">Placeholder Mind Map</text></svg>`,
    viewBox: "0 0 800 600",
  };
}
