import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedDraftLetterStatus, isAllowedLockedLetterStatusChange, isLetterLocked } from "../lib/letter-lifecycle.ts";

test("locks letters once they are finalized", () => {
  assert.equal(isLetterLocked("brouillon"), false);
  assert.equal(isLetterLocked("finalisé"), true);
  assert.equal(isLetterLocked("envoyé"), true);
  assert.equal(isLetterLocked("archivé"), true);
});

test("limits statuses that can be saved with editable draft content", () => {
  assert.equal(isAllowedDraftLetterStatus("brouillon"), true);
  assert.equal(isAllowedDraftLetterStatus("finalisé"), true);
  assert.equal(isAllowedDraftLetterStatus("envoyé"), false);
  assert.equal(isAllowedDraftLetterStatus("archivé"), false);
});

test("allows only explicit transitions for locked letters", () => {
  assert.equal(isAllowedLockedLetterStatusChange("finalisé", "brouillon"), true);
  assert.equal(isAllowedLockedLetterStatusChange("finalisé", "envoyé"), true);
  assert.equal(isAllowedLockedLetterStatusChange("envoyé", "archivé"), true);
  assert.equal(isAllowedLockedLetterStatusChange("envoyé", "brouillon"), false);
  assert.equal(isAllowedLockedLetterStatusChange("archivé", "brouillon"), false);
});
