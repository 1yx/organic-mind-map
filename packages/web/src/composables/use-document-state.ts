import { ref, type Ref } from "vue";
import { getDocument, getArtifactContent } from "../api/client.js";
import type {
  DocumentResponse,
  EditableSource,
  ApiResponse,
} from "../api/types.js";
import type { OmmDocument } from "@omm/core";

export type DocumentState = {
  /** The loaded document record from the API. */
  document: Ref<DocumentResponse | null>;
  /** The OMM content from currentEditableSource, ready for canvas init. */
  ommData: Ref<OmmDocument | null>;
  /** Which source kind is active. */
  sourceKind: Ref<"prediction_omm" | "user_saved_omm" | null>;
  /** The artifact ID of the current editable source (used for stale-save checks). */
  baseArtifactId: Ref<string | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  /** Load a document by ID. Idempotent if already loaded with the same ID. */
  load: (documentId: string) => Promise<void>;
};

export function useDocumentState(): DocumentState {
  const document = ref<DocumentResponse | null>(null);
  const ommData = ref<OmmDocument | null>(null);
  const sourceKind = ref<"prediction_omm" | "user_saved_omm" | null>(null);
  const baseArtifactId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(documentId: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const docRes: ApiResponse<DocumentResponse> =
        await getDocument(documentId);
      if (!docRes.ok) {
        error.value = docRes.error.message;
        return;
      }

      const doc = docRes.data;
      document.value = doc;

      const source: EditableSource | undefined = doc.currentEditableSource;
      if (!source) {
        error.value = "Document has no editable source.";
        return;
      }

      sourceKind.value = source.kind;
      baseArtifactId.value = source.artifactId;

      const contentRes = await getArtifactContent(source.artifactId);
      if (!contentRes.ok) {
        error.value = `Failed to load artifact content: ${contentRes.status}`;
        return;
      }

      ommData.value = (await contentRes.json()) as OmmDocument;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load document.";
    } finally {
      loading.value = false;
    }
  }

  return {
    document,
    ommData,
    sourceKind,
    baseArtifactId,
    loading,
    error,
    load,
  };
}
