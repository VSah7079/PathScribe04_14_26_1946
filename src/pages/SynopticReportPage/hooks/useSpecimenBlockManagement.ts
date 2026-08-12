// src/pages/SynopticReportPage/hooks/useSpecimenBlockManagement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Extracted from SynopticReportPage.tsx (originally lines ~391-476,
// ~2359-2415) as part of the same incremental cleanup that produced
// useLisIntegration.ts — see that file's header for the full rationale.
//
// PURE MOVE, not a rewrite — every function body is unchanged from its
// original implementation.
//
// Scope: focused-block navigation/state and the block-level edit
// operations (advance status, confirm triage, manual edit, add a new
// block). Deliberately does NOT include handleGrossComplete, even
// though its name also mentions grossing/specimens — that function is
// ~235 lines and genuinely depends on handleProtocolChangesDetected
// (part of the amendment/protocol-change domain), plus pool routing,
// AI-behavior config, and Stage 1 synoptic evaluation. It's cross-
// cutting enough that it deserves its own dedicated extraction pass
// rather than being bundled in here just because of its name.
//
// allBlocks, focusedBlockIndex, and handleAdvanceFocusedBlockStatus /
// handleConfirmTriage are also read directly by a large voice-command
// listener elsewhere in the main file (search for "openFlagManager,
// showTeamModal" in SynopticReportPage.tsx for the comment explaining
// why that listener couldn't live next to these). That listener is
// untouched by this extraction — it continues to reference these by
// name, now sourced from this hook's return value instead of being
// defined inline in the same scope.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback, useRef, type MutableRefObject } from 'react';
import { caseRouter } from '@/services/cases/CaseRouter';
import { ConcurrencyConflictError } from '@/services/cases/ConcurrencyConflictError';
import type { Case } from '@/types/case/Case';
import type { Specimen, HistologyBlock, BlockStatus, StainOrder } from '@/types/case/Specimen';
import { UNSTAINED_LABEL } from '@/types/case/Specimen';
import type { SigningUser, SetConcurrencyConflict } from './sharedHookTypes';
import { handleConcurrencyConflict } from './sharedHookTypes';

interface UseSpecimenBlockManagementParams {
  caseData: Case | null;
  setCaseData: React.Dispatch<React.SetStateAction<Case | null>>;
  signingUser: SigningUser;
  markDirty: (section: string) => void;
  knownVersionRef: MutableRefObject<number>;
  setConcurrencyConflict: SetConcurrencyConflict;
  sendMaterialOrderToLis: (order: { kind: 'block_recut' | 'stain' | 'cancel' | 'restain'; specimenId: string; label: string }) => Promise<{ ok: boolean }>;
  showToast: (message: string) => void;
}

export function useSpecimenBlockManagement({
  caseData, setCaseData, signingUser, markDirty, knownVersionRef,
  setConcurrencyConflict, sendMaterialOrderToLis, showToast,
}: UseSpecimenBlockManagementParams) {
  // ── Grossing: focused block navigation ──────────────────────────────────────
  // A voice command like "mark grossed" needs to know *which* block,
  // unambiguously — there was no such concept anywhere before this.
  // Flattened across every specimen so "next/previous block" moves
  // through the whole case in one sequence, not per-specimen.
  const allBlocks = useMemo(() => {
    const out: { specimenId: string; specimenLabel: string; specimenDescription: string; block: HistologyBlock }[] = [];
    (caseData?.specimens ?? []).forEach((sp: Specimen) => {
      (sp.blocks ?? []).forEach((block: HistologyBlock) => out.push({ specimenId: sp.id, specimenLabel: sp.label, specimenDescription: sp.description, block }));
    });
    return out;
  }, [caseData?.specimens]);
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(0);
  useEffect(() => {
    if (focusedBlockIndex >= allBlocks.length) setFocusedBlockIndex(Math.max(0, allBlocks.length - 1));
  }, [allBlocks.length, focusedBlockIndex]);
  const focusedBlockEntry = allBlocks[focusedBlockIndex];

  const handleAdvanceFocusedBlockStatus = useCallback(async () => {
    if (!caseData?.id || !focusedBlockEntry) return;
    const nextStatus: Record<string, BlockStatus> = { Pending: 'Grossed', Grossed: 'Embedded' };
    const newStatus = nextStatus[focusedBlockEntry.block.status];
    if (!newStatus) return; // Embedded/Exhausted are terminal or exception states — not voice-advanceable
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) =>
      sp.id !== focusedBlockEntry.specimenId ? sp : {
        ...sp,
        blocks: (sp.blocks ?? []).map((b: HistologyBlock) => b.id === focusedBlockEntry.block.id ? { ...b, status: newStatus } : b),
      }
    );
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('Block status');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to advance block status:', e);
    }
  }, [caseData, focusedBlockEntry, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict]);

  const handleConfirmTriage = useCallback(async () => {
    if (!caseData?.id || !focusedBlockEntry) return;
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) =>
      sp.id !== focusedBlockEntry.specimenId ? sp : {
        ...sp, triageConfirmedAt: new Date().toISOString(), triageConfirmedBy: signingUser?.id ?? 'unknown',
      }
    );
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('Triage confirmation');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to confirm triage:', e);
    }
  }, [caseData, focusedBlockEntry, signingUser, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict]);

  // ── Generic block update — the manual Block/Stain editor ────────────────────
  // Distinct from handleAdvanceFocusedBlockStatus above, which only ever
  // cycles the *focused* block one status forward for voice commands.
  // This applies any change (status, priority override, stains) to any
  // specific block by id, for the actual visual editor at the bench —
  // there was no way to hand-edit a block at all before this, only
  // auto-generation at accession time and one-step voice advancement.
  const handleUpdateBlock = useCallback(async (specimenId: string, blockId: string, changes: Partial<HistologyBlock>) => {
    if (!caseData?.id) return;
    const patchedSpecimens = (caseData.specimens ?? []).map((sp: Specimen) =>
      sp.id !== specimenId ? sp : {
        ...sp,
        blocks: (sp.blocks ?? []).map((b: HistologyBlock) => b.id === blockId ? { ...b, ...changes } : b),
      }
    );
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
      setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
      markDirty('Block edit');
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to update block:', e);
    }
  }, [caseData, markDirty, knownVersionRef, setCaseData, setConcurrencyConflict]);

  // Real feature, per direct confirmation: "what happens is when the
  // wrong piece gets into the wrong block" — corrects a genuine
  // mis-assignment error, not withdrawal of an unfulfilled order.
  // Grounded explicitly in CAP ANP.11600, CLIA 493.1105, and ISO
  // 15189:2012 5.8 per direct confirmation of the required workflow:
  // create → cancel with a required reason → automatically removed
  // from active workflow → audit trail retained permanently.
  //
  // Sets status to 'Cancelled' rather than deleting the record, so
  // the mistake and its correction stay visible as real history —
  // same "keep the record, change its state" posture as Biopsy
  // Array's own unlink behavior. Sends a real LIS order (unlike
  // handleUpdateBlock above, which has no LIS side-effect at all) —
  // cancelling tells the lab not to process this block, a genuine
  // physical-world action. Also clears any Biopsy Array membership —
  // a cancelled block no longer represents valid tissue at that
  // position, so it shouldn't still occupy a slot in the array
  // diagram.
  //
  // Cascade-cancels every stain order still in a non-terminal state
  // (anything short of Coverslipped/Ready for Review/QC Failed) —
  // this IS the concrete "what downstream actions were prevented"
  // record the spec calls for: each affected stain's own status
  // becoming 'Cancelled' documents exactly what processing this
  // stopped. A stain that already finished (coverslipped, reviewed,
  // or already failed QC) is real, completed lab work — cancelling
  // the block doesn't retroactively undo work that already happened.
  const handleCancelBlock = useCallback(async (specimenId: string, blockId: string, reason: string) => {
    if (!caseData?.id || !reason.trim()) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    const block = sp?.blocks?.find(b => b.id === blockId);
    if (!sp || !block) return;

    showToast('Sending block cancellation to LIS…');
    const result = await sendMaterialOrderToLis({ kind: 'cancel', specimenId, label: block.label });
    if (!result.ok) {
      showToast('LIS did not acknowledge the cancellation — nothing was recorded. Try again.');
      return;
    }

    const TERMINAL_STAIN_STATUSES = new Set(['Coverslipped', 'Ready for Review', 'QC Failed', 'Cancelled']);
    const nowIso = new Date().toISOString();
    const patchedSpecimens = specimens.map((s: Specimen) =>
      s.id !== specimenId ? s : {
        ...s,
        blocks: (s.blocks ?? []).map((b: HistologyBlock) =>
          b.id === blockId
            ? {
                ...b,
                status: 'Cancelled' as const,
                sharedCassetteId: undefined,
                positionInBlock: undefined,
                cancelReason: reason.trim(),
                cancelledBy: signingUser?.id ?? 'unknown',
                cancelledAt: nowIso,
                stains: b.stains.map(stain =>
                  TERMINAL_STAIN_STATUSES.has(stain.status) ? stain : { ...stain, status: 'Cancelled' as const }
                ),
              }
            : b
        ),
      }
    );
    setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        try {
          await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens });
          knownVersionRef.current = e.actualVersion + 1;
          showToast('Note: this case had unsaved changes elsewhere — the cancellation was saved, but double-check the rest of the case reflects what you expect.');
        } catch (retryErr) {
          console.error('[Grossing] Failed to save block cancellation after conflict retry:', retryErr);
        }
      } else {
        console.error(e);
      }
    }
    markDirty('Blocks');
    showToast(`Block ${sp.label}${block.label} cancelled`);
  }, [caseData, signingUser, sendMaterialOrderToLis, markDirty, showToast, knownVersionRef, setCaseData]);

  // Real feature, per direct confirmation: "Create Spare Slide —
  // Generates a new slide ID, links to block, no stain assigned
  // yet." Deliberately NO LIS call — a spare documents a slide that
  // was ALREADY physically cut (a tech, already at the microtome
  // for other reasons, opportunistically cuts an extra unstained
  // section "just in case," per direct confirmation: "They just
  // pickup the unstained slide and stain it"). Nothing new happens
  // in the physical world at creation time, so there is nothing for
  // the LIS to be told yet — that happens at handleOrderRestain
  // below, which is the real trigger.
  const handleCreateSpareSlide = useCallback(async (specimenId: string, blockId: string) => {
    if (!caseData?.id) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    const block = sp?.blocks?.find(b => b.id === blockId);
    if (!sp || !block) return;

    const newSpare: StainOrder = {
      id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stainName: UNSTAINED_LABEL,
      // Real feature, per direct confirmation: the physical cutting
      // already happened — that's the whole point of a spare (a
      // tech, already at the microtome, opportunistically cuts an
      // extra section "just in case"). 'Cut & Placed' is the
      // correct, honest status: cut and on a slide, just not yet
      // stained. Not 'Pending Cut', which would incorrectly say the
      // cutting itself hasn't happened.
      status: 'Cut & Placed',
    };
    const patchedSpecimens = specimens.map((s: Specimen) =>
      s.id !== specimenId ? s : {
        ...s,
        blocks: (s.blocks ?? []).map((b: HistologyBlock) =>
          b.id === blockId ? { ...b, stains: [...b.stains, newSpare] } : b
        ),
      }
    );
    setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (handleConcurrencyConflict(e, setConcurrencyConflict)) return;
      console.error('[Grossing] Failed to create spare slide:', e);
      return;
    }
    markDirty('Blocks');
    showToast(`Spare slide added to block ${sp.label}${block.label} — unstained, ready if needed`);
  }, [caseData, markDirty, showToast, knownVersionRef, setCaseData, setConcurrencyConflict]);

  // Real feature, per direct confirmation: "Order Restain — Converts
  // spare → staining workflow. Captures reason... Logs who ordered
  // it." "Never delete restains... not be merged with or overwrite
  // the original slide." THIS is the real physical-world trigger —
  // unlike handleCreateSpareSlide above, this sends a real LIS
  // order, since it's the moment the lab is actually told which
  // stain to apply.
  //
  // Real feature, per direct confirmation: "we need a stain order
  // called Unstained which is the only stain that can technically be
  // restained on the same label." Enforced here, in one place,
  // rather than relying on every caller to pass the right mode: the
  // target slide's OWN current stainName decides what happens —
  //   - UNSTAINED_LABEL: a real, physical spare, cut and never
  //     stained — converts in place (same slide id). This is the
  //     efficient path: "saves them from a recut later," per direct
  //     confirmation.
  //   - any real stain name: already went through real staining —
  //     converting it would overwrite completed lab work, which is
  //     exactly what must never happen. A genuinely new StainOrder is
  //     created instead, restainOfSlideId pointing back at the
  //     original — which is never touched.
  const handleOrderRestain = useCallback(async (
    specimenId: string,
    blockId: string,
    params: { targetSlideId: string; stainName: string; reason: string },
  ) => {
    if (!caseData?.id || !params.stainName.trim() || !params.reason.trim()) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    const block = sp?.blocks?.find(b => b.id === blockId);
    const targetSlide = block?.stains.find(st => st.id === params.targetSlideId);
    if (!sp || !block || !targetSlide) return;
    const isConvertingSpare = targetSlide.stainName === UNSTAINED_LABEL;

    showToast('Sending restain order to LIS…');
    const result = await sendMaterialOrderToLis({ kind: 'restain', specimenId, label: `${block.label}: ${params.stainName}` });
    if (!result.ok) {
      showToast('LIS did not acknowledge the restain order — nothing was recorded. Try again.');
      return;
    }

    const nowIso = new Date().toISOString();
    const orderedBy = signingUser?.id ?? 'unknown';
    const patchedSpecimens = specimens.map((s: Specimen) => {
      if (s.id !== specimenId) return s;
      let stains = s.blocks?.find(b => b.id === blockId)?.stains ?? [];

      if (isConvertingSpare) {
        // Convert the existing spare in place — same slide id, real
        // tissue that was already cut, now actually being stained.
        stains = stains.map(stain =>
          stain.id === params.targetSlideId
            ? {
                ...stain,
                stainName: params.stainName.trim(),
                // Real feature, per direct confirmation: the
                // physical slide is already cut and placed — this
                // moves it straight to 'Staining', not back to
                // 'Pending Cut' (which would incorrectly say the
                // cutting hasn't happened yet).
                status: 'Staining' as const,
                restainReason: params.reason.trim(),
                restainOrderedBy: orderedBy,
                restainOrderedAt: nowIso,
              }
            : stain
        );
      } else {
        // The target already has real stain on it — never overwritten.
        // A genuinely new slide, linked back to it, gets ordered instead.
        const newRestain: StainOrder = {
          id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          stainName: params.stainName.trim(),
          status: 'Pending Cut',
          restainReason: params.reason.trim(),
          restainOrderedBy: orderedBy,
          restainOrderedAt: nowIso,
          restainOfSlideId: params.targetSlideId,
        };
        stains = [...stains, newRestain];
      }

      return {
        ...s,
        blocks: (s.blocks ?? []).map((b: HistologyBlock) => b.id === blockId ? { ...b, stains } : b),
      };
    });

    setCaseData(prev => prev ? ({ ...prev, specimens: patchedSpecimens } as typeof prev) : prev);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        try {
          await caseRouter.updateCase(caseData.id, { specimens: patchedSpecimens });
          knownVersionRef.current = e.actualVersion + 1;
          showToast('Note: this case had unsaved changes elsewhere — the restain order was saved, but double-check the rest of the case reflects what you expect.');
        } catch (retryErr) {
          console.error('[Grossing] Failed to save restain order after conflict retry:', retryErr);
        }
      } else {
        console.error(e);
      }
    }
    markDirty('Blocks');
    showToast(
      isConvertingSpare
        ? `Restain ordered — reusing the spare, no recut needed`
        : `Restain ordered — new slide cut for ${params.stainName.trim()}`
    );
  }, [caseData, signingUser, sendMaterialOrderToLis, markDirty, showToast, knownVersionRef, setCaseData]);

  // Real replacement for Add Orders' old "Blocks/Recut" tab — appends
  // an actual HistologyBlock to specimen.blocks (what the Material tree
  // reads from), not the old cassette_key/total_cassettes free-text
  // fields on the grossing report, which the tree never read and would
  // have made a new block invisible in the tree that triggered adding it.
  const handleAddBlock = useCallback(async (specimenId: string) => {
    if (!caseData) return;
    const specimens = caseData.specimens ?? [];
    const sp = specimens.find((s: Specimen) => s.id === specimenId);
    if (!sp) return;

    const existingBlocks = sp.blocks ?? [];
    const nextNumber = existingBlocks.length + 1;
    const newBlock: HistologyBlock = {
      id: `blk-${specimenId}-${Date.now().toString(36)}`,
      label: String(nextNumber),
      status: 'Grossed',
      // Real feature, per direct confirmation: every new block
      // defaults to a real, pending H&E stain order — the universal,
      // standard first stain for any new tissue block in real
      // practice, not something a PA should have to add manually
      // every single time.
      stains: [{ id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stainName: 'H&E', status: 'Pending Cut' }],
    };

    showToast('Sending block/recut request to LIS…');
    const result = await sendMaterialOrderToLis({ kind: 'block_recut', specimenId, label: newBlock.label });
    if (!result.ok) {
      showToast('LIS did not acknowledge the request — nothing was recorded. Try again.');
      return;
    }

    const updatedSpecimens = specimens.map((s: Specimen) =>
      s.id === specimenId ? { ...s, blocks: [...existingBlocks, newBlock] } : s
    );
    const updated = { ...caseData, specimens: updatedSpecimens, updatedAt: new Date().toISOString() };
    setCaseData(updated);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        // Deliberately different handling from every other conflict in
        // this file — the block/recut order was already sent to and
        // acknowledged by the LIS above, before this write. There's no
        // safe "discard and reload" option here: the physical order
        // already happened, so losing the local record of it would leave
        // PathScribe's case data out of sync with what the LIS actually
        // did. Force the write through rather than presenting a choice
        // that has no good "no" answer, but stay transparent about it
        // rather than silently overwriting.
        try {
          await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens });
          knownVersionRef.current = e.actualVersion + 1;
          showToast('Note: this case had unsaved changes elsewhere — your new block request was saved, but double-check the rest of the case reflects what you expect.');
        } catch (retryErr) {
          console.error('[Grossing] Failed to save block request after conflict retry:', retryErr);
        }
      } else {
        console.error(e);
      }
    }
    markDirty('Blocks');
    showToast(`Block ${sp.label}${nextNumber} requested — sent to LIS`);

    // Real fix, item #28: adding a block never navigated the editor to
    // it - setFocusedBlockIndex already exists and is what the block
    // editor modal reads to know which block to show, it just wasn't
    // being called here. Same flatten order allBlocks itself uses
    // (specimen order, then block order within each specimen), so the
    // computed index is guaranteed to match what allBlocks recomputes
    // to once caseData updates above.
    let flatIndex = 0;
    for (const s of updatedSpecimens) {
      const idx = (s.blocks ?? []).findIndex((b: HistologyBlock) => b.id === newBlock.id);
      if (idx >= 0) { flatIndex += idx; break; }
      flatIndex += (s.blocks ?? []).length;
    }
    setFocusedBlockIndex(flatIndex);
  }, [caseData, sendMaterialOrderToLis, markDirty, showToast, knownVersionRef, setCaseData]);

  // Real feature, per direct confirmation: "I wanted to be able to
  // assign each core to a specific section of a single block... so
  // the Pathologist can always identify what section of the block
  // the core tissue was embedded into." A grossing activity — the PA
  // decides, while grossing, that several specimens' tissue is going
  // into one shared cassette rather than separate ones.
  //
  // Each specimen still gets its OWN HistologyBlock record (same
  // shape handleAddBlock above already creates) — this creates one
  // per selected specimen, all sharing the same new
  // sharedCassetteId, each with its own sequential positionInBlock.
  // Slides/stains keep working exactly as they already do, per
  // specimen — this only adds the shared-block linkage on top.
  const handleCreateBiopsyArray = useCallback(async (specimenIds: string[], cassetteLabel: string) => {
    if (!caseData || specimenIds.length < 2) return;
    const specimens = caseData.specimens ?? [];
    const targetSpecimens = specimenIds
      .map(id => specimens.find((s: Specimen) => s.id === id))
      .filter((s): s is Specimen => !!s);
    if (targetSpecimens.length < 2) return;

    const sharedCassetteId = cassetteLabel.trim();
    const newBlocksBySpecimenId = new Map<string, HistologyBlock>();
    targetSpecimens.forEach((sp, i) => {
      const existingBlocks = sp.blocks ?? [];
      const nextNumber = existingBlocks.length + 1;
      newBlocksBySpecimenId.set(sp.id, {
        id: `blk-${sp.id}-${Date.now().toString(36)}-${i}`,
        label: String(nextNumber),
        status: 'Grossed',
        // Real feature, per direct confirmation: same H&E default as
        // handleAddBlock above — every new block gets a real, pending
        // H&E stain order, not an empty one.
        stains: [{ id: `stain-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`, stainName: 'H&E', status: 'Pending Cut' }],
        sharedCassetteId,
        positionInBlock: i + 1,
      });
    });

    showToast('Sending Biopsy Array request to LIS…');
    // Same real-LIS-order posture as handleAddBlock — one order per
    // specimen, all referencing the same cassetteLabel so the LIS
    // side can see they're physically the same block.
    const results = await Promise.all(targetSpecimens.map(sp =>
      sendMaterialOrderToLis({ kind: 'block_recut', specimenId: sp.id, label: cassetteLabel })
    ));
    if (results.some(r => !r.ok)) {
      showToast('LIS did not acknowledge the Biopsy Array request — nothing was recorded. Try again.');
      return;
    }

    const updatedSpecimens = specimens.map((s: Specimen) => {
      const newBlock = newBlocksBySpecimenId.get(s.id);
      if (!newBlock) return s;
      return { ...s, blocks: [...(s.blocks ?? []), newBlock] };
    });
    const updated = { ...caseData, specimens: updatedSpecimens, updatedAt: new Date().toISOString() };
    setCaseData(updated);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        // Same reasoning as handleAddBlock's own conflict handling —
        // the LIS orders were already sent and acknowledged above,
        // before this write; there's no safe "discard" option.
        try {
          await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens });
          knownVersionRef.current = e.actualVersion + 1;
          showToast('Note: this case had unsaved changes elsewhere — your Biopsy Array was saved, but double-check the rest of the case reflects what you expect.');
        } catch (retryErr) {
          console.error('[Grossing] Failed to save Biopsy Array after conflict retry:', retryErr);
        }
      } else {
        console.error(e);
      }
    }
    markDirty('Blocks');
    showToast(`Biopsy Array ${cassetteLabel} created — ${targetSpecimens.length} specimens linked, sent to LIS`);
  }, [caseData, sendMaterialOrderToLis, markDirty, showToast, knownVersionRef, setCaseData]);

  // Real feature, per direct confirmation: completes the Biopsy Array
  // feature with the edit capability flagged as the one real gap
  // after create-only shipped — "allowing edits of the Biopsy array."
  // Given the FULL desired specimen list (in the order positions
  // should be), diffs it against whichever blocks currently carry
  // this cassetteId across every specimen:
  //   - specimens no longer selected → unlinked (sharedCassetteId/
  //     positionInBlock cleared). The block record itself is kept,
  //     not deleted — nothing about the physical tissue changed, it's
  //     just no longer tracked as part of this shared cassette. It
  //     becomes an ordinary, standalone block, same as any block that
  //     was never part of an array.
  //   - specimens newly selected → get a real new block, same shape
  //     handleCreateBiopsyArray already creates, with a real LIS
  //     order (this is new physical tissue actually going into this
  //     cassette, same posture as create).
  //   - specimens still selected → keep their existing block, just
  //     renumbered to the new position if the order changed.
  // Fewer than 2 specimens in the new selection dissolves the whole
  // array (see handleDissolveBiopsyArray) — an array of 0 or 1 isn't
  // a real array.
  const handleUpdateBiopsyArray = useCallback(async (cassetteId: string, specimenIds: string[]) => {
    if (!caseData) return;
    if (specimenIds.length < 2) {
      await handleDissolveBiopsyArrayRef.current?.(cassetteId);
      return;
    }
    const specimens = caseData.specimens ?? [];
    const currentlyLinkedIds = specimens
      .filter(s => (s.blocks ?? []).some(b => b.sharedCassetteId === cassetteId))
      .map(s => s.id);

    const toAdd = specimenIds.filter(id => !currentlyLinkedIds.includes(id));
    const toRemove = currentlyLinkedIds.filter(id => !specimenIds.includes(id));

    if (toAdd.length > 0) {
      showToast('Sending Biopsy Array update to LIS…');
      const targetSpecimens = toAdd.map(id => specimens.find(s => s.id === id)).filter((s): s is Specimen => !!s);
      const results = await Promise.all(targetSpecimens.map(sp =>
        sendMaterialOrderToLis({ kind: 'block_recut', specimenId: sp.id, label: cassetteId })
      ));
      if (results.some(r => !r.ok)) {
        showToast('LIS did not acknowledge the added specimens — nothing was recorded. Try again.');
        return;
      }
    }

    const updatedSpecimens = specimens.map((s: Specimen) => {
      const existingBlocks = s.blocks ?? [];
      const newPosition = specimenIds.indexOf(s.id) + 1; // 0 if not in new list

      if (toRemove.includes(s.id)) {
        return {
          ...s,
          blocks: existingBlocks.map(b =>
            b.sharedCassetteId === cassetteId
              ? { ...b, sharedCassetteId: undefined, positionInBlock: undefined }
              : b
          ),
        };
      }
      if (toAdd.includes(s.id)) {
        const nextNumber = existingBlocks.length + 1;
        const newBlock: HistologyBlock = {
          id: `blk-${s.id}-${Date.now().toString(36)}`,
          label: String(nextNumber),
          status: 'Grossed',
          // Real feature, per direct confirmation: same H&E default
          // as every other block-creation path in this file.
          stains: [{ id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stainName: 'H&E', status: 'Pending Cut' }],
          sharedCassetteId: cassetteId,
          positionInBlock: newPosition,
        };
        return { ...s, blocks: [...existingBlocks, newBlock] };
      }
      if (newPosition > 0) {
        // Still in the array — renumber in case the order changed.
        return {
          ...s,
          blocks: existingBlocks.map(b =>
            b.sharedCassetteId === cassetteId ? { ...b, positionInBlock: newPosition } : b
          ),
        };
      }
      return s;
    });

    const updated = { ...caseData, specimens: updatedSpecimens, updatedAt: new Date().toISOString() };
    setCaseData(updated);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        try {
          await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens });
          knownVersionRef.current = e.actualVersion + 1;
          showToast('Note: this case had unsaved changes elsewhere — your Biopsy Array update was saved, but double-check the rest of the case reflects what you expect.');
        } catch (retryErr) {
          console.error('[Grossing] Failed to save Biopsy Array update after conflict retry:', retryErr);
        }
      } else {
        console.error(e);
      }
    }
    markDirty('Blocks');
    showToast(`Biopsy Array ${cassetteId} updated — ${specimenIds.length} specimens linked`);
  }, [caseData, sendMaterialOrderToLis, markDirty, showToast, knownVersionRef, setCaseData]);

  // Real feature: a direct, explicit "undo the whole array" action —
  // clearer than editing a selection down to zero. Every specimen
  // currently carrying this cassetteId gets unlinked; each block
  // record itself is kept as an ordinary, standalone block, same
  // "nothing physical changed, just the tracking" posture as removing
  // one specimen in handleUpdateBiopsyArray above.
  const handleDissolveBiopsyArray = useCallback(async (cassetteId: string) => {
    if (!caseData) return;
    const specimens = caseData.specimens ?? [];
    const hasAnyLinked = specimens.some(s => (s.blocks ?? []).some(b => b.sharedCassetteId === cassetteId));
    if (!hasAnyLinked) return;

    const updatedSpecimens = specimens.map((s: Specimen) => ({
      ...s,
      blocks: (s.blocks ?? []).map(b =>
        b.sharedCassetteId === cassetteId
          ? { ...b, sharedCassetteId: undefined, positionInBlock: undefined }
          : b
      ),
    }));
    const updated = { ...caseData, specimens: updatedSpecimens, updatedAt: new Date().toISOString() };
    setCaseData(updated);
    try {
      await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens }, knownVersionRef.current);
      knownVersionRef.current = knownVersionRef.current + 1;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        try {
          await caseRouter.updateCase(caseData.id, { specimens: updatedSpecimens });
          knownVersionRef.current = e.actualVersion + 1;
          showToast('Note: this case had unsaved changes elsewhere — the Biopsy Array was dissolved, but double-check the rest of the case reflects what you expect.');
        } catch (retryErr) {
          console.error('[Grossing] Failed to save Biopsy Array dissolve after conflict retry:', retryErr);
        }
      } else {
        console.error(e);
      }
    }
    markDirty('Blocks');
    showToast(`Biopsy Array ${cassetteId} dissolved — specimens are now separate blocks again`);
  }, [caseData, markDirty, showToast, knownVersionRef, setCaseData]);

  // Real fix: handleUpdateBiopsyArray needs to call
  // handleDissolveBiopsyArray when the edited selection drops below 2
  // specimens, but both are useCallback-memoized in the same hook —
  // a direct reference would create a circular dependency between the
  // two useCallback declarations. A ref side-steps that cleanly:
  // always points at the latest handleDissolveBiopsyArray without
  // handleUpdateBiopsyArray needing it in its own dependency array.
  const handleDissolveBiopsyArrayRef = useRef(handleDissolveBiopsyArray);
  handleDissolveBiopsyArrayRef.current = handleDissolveBiopsyArray;

  return {
    allBlocks,
    focusedBlockIndex, setFocusedBlockIndex,
    focusedBlockEntry,
    handleAdvanceFocusedBlockStatus,
    handleConfirmTriage,
    handleUpdateBlock,
    handleCancelBlock,
    handleCreateSpareSlide,
    handleOrderRestain,
    handleAddBlock,
    handleCreateBiopsyArray,
    handleUpdateBiopsyArray,
    handleDissolveBiopsyArray,
  };
}
