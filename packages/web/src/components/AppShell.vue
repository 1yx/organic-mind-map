<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { usePanelSizing } from "../composables/use-panel-sizing.js";
import { useDocumentState } from "../composables/use-document-state.js";
import { useDraftStorage } from "../composables/use-draft-storage.js";
import { saveCurrentOmm } from "../api/client.js";
import type { SaveOmmResponse } from "../api/types.js";
import { useAdminVisibility } from "../composables/use-admin-visibility.js";
import AppToolbar from "./AppToolbar.vue";
import OutlineSidebar from "./OutlineSidebar.vue";
import CanvasViewport from "./CanvasViewport.vue";

const { toolbarHeight, sidebarWidth, canvasWidth, canvasHeight } =
  usePanelSizing();

const { document: doc, ommData, sourceKind, baseArtifactId, loading, error, load } = useDocumentState();
const { draft, hasLocalDraft, isDirty, init, markDirty, saveToLocal, clearLocal, restoreFromLocal, reset } = useDraftStorage();
const { showInternals, toggleInternals } = useAdminVisibility();

const saving = ref(false);
const saveError = ref<string | null>(null);

const canSave = computed(
  () => !!draft.value && !!doc.value && isDirty.value && !saving.value,
);

// For now, pick documentId from URL search params: ?doc=<id>
// When routing is added, this will come from the route instead.
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const documentId = params.get("doc");
  if (documentId) {
    void load(documentId);
  }
});

// When OMM data loads from the API, initialize draft storage.
// If a local draft exists, prefer it for draft recovery.
watch(ommData, (omm) => {
  if (!omm || !doc.value) return;
  if (!restoreFromLocal(doc.value.id)) {
    init(omm, doc.value.id);
  }
});

// Auto-save draft to localStorage on window unload.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (isDirty.value) saveToLocal();
  });
}

async function handleSave(): Promise<void> {
  if (!draft.value || !doc.value) return;
  saving.value = true;
  saveError.value = null;

  try {
    const res = await saveCurrentOmm(
      doc.value.id,
      draft.value as unknown as Record<string, unknown>,
      baseArtifactId.value ?? undefined,
    );
    if (!res.ok) {
      if (res.error.code === "stale_document") {
        saveError.value =
          "Document was modified elsewhere. Reload to see the latest version.";
      } else {
        saveError.value = res.error.message;
      }
      return;
    }

    const data: SaveOmmResponse = res.data;
    // Update baseArtifactId to the new one for future stale-save checks
    baseArtifactId.value = data.artifactId;
    isDirty.value = false;
    clearLocal();
  } catch (e) {
    saveError.value =
      e instanceof Error ? e.message : "Save failed unexpectedly.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col w-screen h-screen overflow-hidden">
    <AppToolbar
      :height="toolbarHeight"
      :can-save="canSave"
      :saving="saving"
      :is-admin="true"
      :show-internals="showInternals"
      @save="handleSave()"
      @toggle-internals="toggleInternals()"
    />
    <div class="flex flex-1 min-h-0">
      <OutlineSidebar :width="sidebarWidth" :height="canvasHeight" />
      <CanvasViewport
        :width="canvasWidth"
        :height="canvasHeight"
        :omm-data="draft ?? ommData"
        :source-kind="sourceKind ?? undefined"
        :loading="loading"
        :error="error ?? saveError"
        :is-dirty="isDirty"
        :has-local-draft="hasLocalDraft"
        :show-internals="showInternals"
        @mark-dirty="markDirty()"
      />
    </div>
  </div>
</template>
