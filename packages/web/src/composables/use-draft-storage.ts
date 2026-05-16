import { ref, type Ref } from "vue";
import type { OmmDocument } from "@omm/core";

const STORAGE_PREFIX = "omm_draft_";

export type DraftState = {
  draft: Ref<OmmDocument | null>;
  hasLocalDraft: Ref<boolean>;
  isDirty: Ref<boolean>;
  init: (omm: OmmDocument, documentId: string) => void;
  markDirty: () => void;
  saveToLocal: () => void;
  clearLocal: () => void;
  restoreFromLocal: (documentId: string) => boolean;
  reset: () => void;
};

function localKey(docId: string): string {
  return STORAGE_PREFIX + docId;
}

function readLocal(docId: string): string | null {
  try {
    return localStorage.getItem(localKey(docId));
  } catch {
    return null;
  }
}

function writeLocal(docId: string, data: string): boolean {
  try {
    localStorage.setItem(localKey(docId), data);
    return true;
  } catch {
    return false;
  }
}

function removeLocal(docId: string): void {
  try {
    localStorage.removeItem(localKey(docId));
  } catch {
    // ignore
  }
}

function parseOmm(raw: string): OmmDocument | null {
  try {
    return JSON.parse(raw) as OmmDocument;
  } catch {
    return null;
  }
}

type InternalState = {
  draft: Ref<OmmDocument | null>;
  hasLocalDraft: Ref<boolean>;
  isDirty: Ref<boolean>;
  currentDocId: string | null;
};

function doInit(s: InternalState, omm: OmmDocument, documentId: string): void {
  s.draft.value = structuredClone(omm);
  s.currentDocId = documentId;
  s.isDirty.value = false;
  s.hasLocalDraft.value = readLocal(documentId) !== null;
}

function doSaveToLocal(s: InternalState): void {
  if (!s.currentDocId || !s.draft.value) return;
  if (writeLocal(s.currentDocId, JSON.stringify(s.draft.value))) {
    s.hasLocalDraft.value = true;
  }
}

function doClearLocal(s: InternalState): void {
  if (!s.currentDocId) return;
  removeLocal(s.currentDocId);
  s.hasLocalDraft.value = false;
}

function doRestore(s: InternalState, documentId: string): boolean {
  const raw = readLocal(documentId);
  if (!raw) return false;
  const parsed = parseOmm(raw);
  if (!parsed) return false;
  s.draft.value = parsed;
  s.currentDocId = documentId;
  s.isDirty.value = false;
  s.hasLocalDraft.value = true;
  return true;
}

export function useDraftStorage(): DraftState {
  const s: InternalState = {
    draft: ref<OmmDocument | null>(null),
    hasLocalDraft: ref(false),
    isDirty: ref(false),
    currentDocId: null,
  };

  return {
    draft: s.draft,
    hasLocalDraft: s.hasLocalDraft,
    isDirty: s.isDirty,
    init: (omm, docId) => doInit(s, omm, docId),
    markDirty: () => {
      s.isDirty.value = true;
    },
    saveToLocal: () => doSaveToLocal(s),
    clearLocal: () => doClearLocal(s),
    restoreFromLocal: (docId) => doRestore(s, docId),
    reset: () => {
      s.draft.value = null;
      s.currentDocId = null;
      s.isDirty.value = false;
      s.hasLocalDraft.value = false;
    },
  };
}
