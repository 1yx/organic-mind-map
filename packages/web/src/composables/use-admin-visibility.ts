import { ref } from "vue";

/**
 * Tracks whether admin/debug visibility is enabled in the canvas UI.
 * Normal users never see masks/debug evidence; admin users can toggle
 * this to inspect internal fields.
 */
export function useAdminVisibility() {
  const showInternals = ref(false);

  function toggleInternals(): void {
    showInternals.value = !showInternals.value;
  }

  return { showInternals, toggleInternals };
}
