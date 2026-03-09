# AI Agent Cafe Implementation Plan

## Goal

Improve the game's learning loop and improve the codebase at the same time, without breaking existing room flows or trusting uncontrolled LLM output.

This plan is designed around two constraints:

1. Product changes must be incremental and testable.
2. LLM-driven behavior must always have a validated fallback path.

## Delivery Principles

- Keep legacy room completion working while migrating to richer results.
- Do not ship new structured LLM output without runtime validation.
- Do not widen room state until fixtures and tests cover the current behavior.
- Prefer additive migrations over rewrites.
- Every phase ends with a gate. If the gate fails, stop and fix before moving on.

## Current Codebase Pressure Points

- Challenge logic is split across [hooks/useConversationManager.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/hooks/useConversationManager.ts), [components/GameBoardModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/GameBoardModal.tsx), and [components/SkynetTerminalModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/SkynetTerminalModal.tsx).
- Debrief and mastery behavior is duplicated instead of running through one shared pipeline.
- Room state in [types.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/types.ts) is inconsistent across rooms.
- Room curriculum is centralized in [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts), which is useful, but not yet rich enough for rubric and tier metadata.
- Structured room results already exist in [services/masteryService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masteryService.ts), but the schema is minimal and only partly used.
- The README is out of sync with the current gameplay.

## Phase 0: Baseline, Contracts, and Safety Net

### PR 0.1: Document Current Room Contracts

Purpose:
Freeze what "correct current behavior" means before refactoring.

File targets:
- [README.md](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/README.md)
- New file: [docs/challenge-contracts.md](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/docs/challenge-contracts.md)

Tasks:
- Create `docs/challenge-contracts.md`.
- Document current mastery rules for:
  - cafe
  - office
  - art_studio
  - classroom
  - dojo
  - dungeon
  - philo_cafe
  - library
  - lair
- Record current state transitions and known legacy completion markers.
- Note current prompt-output contracts:
  - `_PLAYER_WINS_CHALLENGE_`
  - `<room_result>{...}</room_result>`

Acceptance criteria:
- Every masterable room has a documented "start", "progress", and "mastery" path.
- Known legacy completion paths are explicitly captured.

### PR 0.2: Add Deterministic Contract Tests

Purpose:
Create a regression harness before behavior changes.

File targets:
- [services/masteryService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masteryService.ts)
- New test: [services/masteryService.test.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masteryService.test.ts)
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)
- New test: [services/learningGuidanceService.test.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.test.ts)
- New folder: [tests/fixtures](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/tests/fixtures)

Tasks:
- Add tests for `extractMasterySignal()`:
  - legacy token only
  - structured result only
  - both present
  - malformed JSON
  - irrelevant text
- Add tests for `getRoomGuidance()`:
  - room progress labels
  - next actions
  - mastered fallback behavior
- Create golden fixtures for representative room flows.

Acceptance criteria:
- `npm test` passes.
- Baseline fixture behavior is captured for current room logic.
- Malformed structured output never crashes parsing.

### Phase 0 Gate

- No feature work starts until contract docs and baseline tests exist.
- If existing behavior cannot be described precisely, that behavior must not be refactored yet.

## Phase 1: Shared Challenge Result Pipeline

### PR 1.1: Centralize Mastery and Debrief Resolution

Purpose:
Remove duplicated mastery/debrief logic from room-specific flows.

File targets:
- New file: [services/challengeResolutionService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/challengeResolutionService.ts)
- [hooks/useConversationManager.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/hooks/useConversationManager.ts)
- [components/GameBoardModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/GameBoardModal.tsx)
- [components/SkynetTerminalModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/SkynetTerminalModal.tsx)
- [services/masteryService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masteryService.ts)
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)

Tasks:
- Create a shared resolver that:
  - parses room output
  - strips legacy markers
  - generates coach or mastery debrief payloads
  - returns a normalized result object
- Migrate existing callers to use the shared resolver.
- Preserve legacy behavior for rooms still emitting `_PLAYER_WINS_CHALLENGE_`.

Acceptance criteria:
- No room-specific component parses mastery tokens directly after migration.
- Existing fixtures still pass unchanged.
- Legacy token and structured result behavior remain backward compatible.

### PR 1.2: Add Runtime Validation For Room Results

Purpose:
Reduce hallucination risk from malformed LLM output.

File targets:
- [services/masteryService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masteryService.ts)
- New file: [services/masterySchema.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masterySchema.ts)
- New test: [services/masterySchema.test.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masterySchema.test.ts)

Tasks:
- Define a runtime-validated schema for room results.
- Parse only allowed fields.
- Ignore invalid rubric or metadata fields instead of failing hard.
- Keep safe fallback to plain text plus legacy completion token support.

Acceptance criteria:
- Invalid JSON or extra fields do not break the room flow.
- Structured result parsing is deterministic and tested.

### Phase 1 Gate

- Shared resolver is the only code path for mastery/debrief resolution outside special bootstrapping flows.
- All baseline tests still pass.

## Phase 2: Low-Risk Learning UX Improvements

### PR 2.1: Quote Player Input In Coach Debriefs

Purpose:
Make feedback reflect what the player actually wrote.

File targets:
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)
- [hooks/useConversationManager.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/hooks/useConversationManager.ts)
- [components/GameBoardModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/GameBoardModal.tsx)
- [components/SkynetTerminalModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/SkynetTerminalModal.tsx)
- [components/LearningDebriefCard.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/LearningDebriefCard.tsx)

Tasks:
- Extend `createCoachDebrief()` to accept user input text.
- Pass the triggering user text from the relevant caller sites.
- Update the card rendering if needed to keep the summary readable.

Acceptance criteria:
- Coach debriefs show both user input and coach response context.
- No debrief text exceeds reasonable UI bounds without truncation.

### PR 2.2: Surface Revision Counts

Purpose:
Make iteration visible and positive.

File targets:
- [types.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/types.ts)
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)
- [components/ActiveQuestPanel.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/ActiveQuestPanel.tsx)
- [components/ObjectiveTrackerModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/ObjectiveTrackerModal.tsx)

Tasks:
- Expose normalized revision metadata in room guidance.
- Display revision badges for rooms that already track `feedbackCount`.
- Add safe derived counts for rooms that can infer iteration from turns or messages.

Acceptance criteria:
- Office, Art Studio, and Classroom show revision counts.
- Revision labels are positive and not framed as failures.
- UI behaves correctly when no revision count exists.

### PR 2.3: Add Cross-Room Curriculum Links

Purpose:
Make rooms feel like a connected curriculum.

File targets:
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)
- [components/LearningDebriefCard.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/LearningDebriefCard.tsx)

Tasks:
- Add a small room connection map.
- Append a "why this connects" note to mastery debriefs.
- Keep copy short and room-specific.

Acceptance criteria:
- Mastery debriefs for mapped rooms include a concrete next transfer target.
- Unmapped rooms degrade gracefully.

### Phase 2 Gate

- Snapshot or component tests exist for the debrief card and tracker changes.
- Manual QA confirms no UI overflow for long debrief text.

## Phase 3: Rubric Pilot With Safe Fallbacks

### PR 3.1: Extend Room Result Schema With Rubrics

Purpose:
Move selected rooms beyond pass/fail without destabilizing the rest of the game.

File targets:
- [services/masteryService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/masteryService.ts)
- [types.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/types.ts)
- [components/LearningDebriefCard.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/LearningDebriefCard.tsx)
- New test: [components/LearningDebriefCard.test.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/LearningDebriefCard.test.tsx)

Tasks:
- Extend room result parsing to accept bounded rubric dimensions.
- Update debrief card UI to render rubric rows or chips.
- Add safe fallback when rubric is absent or invalid.

Acceptance criteria:
- Rubrics render only when validated.
- Invalid rubric data is ignored without breaking debrief display.

### PR 3.2: Pilot Rubrics In Three Rooms

Purpose:
Limit LLM prompt drift risk by rolling out slowly.

Initial rooms:
- office
- art_studio
- classroom

File targets:
- [services/promptBuilderService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/promptBuilderService.ts)
- [data/personas.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/data/personas.ts)
- [tests/fixtures](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/tests/fixtures)

Tasks:
- Update prompts to request:
  - `mastered`
  - `feedback`
  - `next_step`
  - `rubric`
- Keep dimensions room-specific and bounded.
- Add malformed output fixtures and successful output fixtures.

Acceptance criteria:
- Pilot rooms still resolve mastery correctly.
- Structured rubric output is optional, not required for room completion.
- Prompt changes do not break baseline room progression.

### Phase 3 Gate

- Pilot fixture suite passes.
- Rubric parse failures degrade safely to current behavior.
- Do not expand rubrics to more rooms until the pilot is stable.

## Phase 4: Tiered Mastery For Subjective Rooms

### PR 4.1: Normalize Tier State

Purpose:
Support multi-stage mastery without inventing one-off room state again.

File targets:
- [types.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/types.ts)
- [reducers/gameReducer.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/reducers/gameReducer.ts)
- [hooks/useAppContext.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/hooks/useAppContext.ts)

Tasks:
- Add a normalized challenge progression shape for tiered rooms.
- Keep migration additive to avoid breaking saved state.
- Add persistence support for the new fields.

Acceptance criteria:
- Existing saves still hydrate safely.
- Tiered rooms can track current stage without affecting untiered rooms.

### PR 4.2: Apply Tiered Mastery To Subjective Rooms

Target rooms:
- philo_cafe
- library
- lair

File targets:
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)
- [hooks/useConversationManager.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/hooks/useConversationManager.ts)
- [data/personas.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/data/personas.ts)
- [services/promptBuilderService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/promptBuilderService.ts)

Tasks:
- Define stage labels per room.
- Reflect current stage in room guidance and objective tracker.
- Update moderator prompts so mastery only occurs after stage advancement.
- Ensure failures produce guidance, not silent loops.

Acceptance criteria:
- Players can see their current stage and next requirement.
- Subjective rooms no longer rely on a single opaque binary jump.
- Multi-turn progression is tested with deterministic fixtures.

### Phase 4 Gate

- State transitions for all tiered rooms are documented in `docs/challenge-contracts.md`.
- Manual QA confirms that players can always tell why they advanced or stalled.

## Phase 5: Codebase Cleanup And Normalization

### PR 5.1: Normalize Challenge State Shapes

Purpose:
Reduce future complexity and make all room work cheaper.

File targets:
- [types.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/types.ts)
- [reducers/gameReducer.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/reducers/gameReducer.ts)
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)
- [hooks/useConversationManager.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/hooks/useConversationManager.ts)

Tasks:
- Introduce shared fields where practical:
  - `status`
  - `attemptCount`
  - `stage`
  - `lastFeedback`
  - `history`
- Leave specialized fields only where the room genuinely needs them.
- Refactor call sites to use the normalized shape.

Acceptance criteria:
- New challenge work no longer requires custom ad hoc state for common concepts.
- Existing room behavior is preserved.

### PR 5.2: Move More Room Rules Into Config

Purpose:
Reduce prompt and state logic scattering.

File targets:
- [services/learningGuidanceService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/learningGuidanceService.ts)
- [services/promptBuilderService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/promptBuilderService.ts)
- New file: [data/roomChallengeConfigs.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/data/roomChallengeConfigs.ts)

Tasks:
- Extract reusable room metadata:
  - rubric dimensions
  - tier labels
  - connection text
  - revision support flags
- Refactor guidance and prompt building to consume config where appropriate.

Acceptance criteria:
- Adding a new room rule or rubric dimension does not require editing multiple unrelated files.
- Config does not become a dumping ground for executable logic.

### PR 5.3: Fix Documentation Drift

Purpose:
Bring project docs back in line with the actual game.

File targets:
- [README.md](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/README.md)
- [docs/challenge-contracts.md](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/docs/challenge-contracts.md)

Tasks:
- Correct outdated descriptions, especially:
  - dojo behavior
  - challenge tracker language
  - debrief and progression model
- Fix obvious encoding issues in touched docs.

Acceptance criteria:
- README descriptions match shipped behavior.
- No newly added user-facing strings contain encoding corruption.

### Phase 5 Gate

- No net increase in duplicated mastery/challenge logic.
- Docs reflect shipped functionality.
- Saved-state migration remains backward compatible.

## Phase 6: Observability And Release Controls

### PR 6.1: Add Lightweight Challenge Telemetry

Purpose:
Detect prompt drift and broken structured outputs after shipping.

File targets:
- [hooks/useConversationManager.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/hooks/useConversationManager.ts)
- [components/GameBoardModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/GameBoardModal.tsx)
- [components/SkynetTerminalModal.tsx](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/components/SkynetTerminalModal.tsx)
- New file if needed: [services/challengeTelemetryService.ts](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/services/challengeTelemetryService.ts)

Tasks:
- Track:
  - invalid room-result payload count
  - rubric parse failures
  - mastery frequency by room
  - revision counts before mastery
- Keep this local and lightweight unless there is already a telemetry destination.

Acceptance criteria:
- Developers can inspect whether a prompt change degraded structured outputs.
- Telemetry collection does not block gameplay.

### PR 6.2: Add Release Checklist

Purpose:
Prevent unreviewed prompt or state changes from shipping.

File targets:
- New file: [docs/release-checklist.md](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/docs/release-checklist.md)
- [package.json](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/package.json) if scripts are added

Tasks:
- Add a checklist for:
  - unit tests
  - fixture suite
  - manual room QA
  - docs update review
  - prompt contract review
- Add test scripts if missing.

Acceptance criteria:
- Prompt changes require fixture or contract review before merge.
- State changes require save/hydration review before merge.

### Phase 6 Gate

- No challenge-related PR merges without updated tests or fixtures when behavior changes.
- No structured-output prompt changes without a safe fallback path.

## Recommended Execution Order

1. PR 0.1
2. PR 0.2
3. PR 1.1
4. PR 1.2
5. PR 2.1
6. PR 2.2
7. PR 2.3
8. PR 3.1
9. PR 3.2
10. PR 4.1
11. PR 4.2
12. PR 5.1
13. PR 5.2
14. PR 5.3
15. PR 6.1
16. PR 6.2

## Non-Negotiable Stop Conditions

Stop the rollout and fix forward if any of these happen:

- A room can no longer be completed via its legacy path during migration.
- Structured room output causes crashes or blank UI.
- Tiered room logic hides the current stage from the player.
- Saved state fails to hydrate after challenge-state changes.
- README or contracts become materially inaccurate after a feature merge.

## Definition Of Done

The work is complete when:

- Coach debriefs reference the player's actual attempt.
- Revision counts are visible in the main learning UI.
- Rubrics are live in a stable pilot with safe fallback behavior.
- Subjective rooms have stage-based progression with explicit player guidance.
- Mastery and debrief resolution run through a shared validated pipeline.
- Challenge state is more normalized than it is today.
- Docs and tests are aligned with shipped behavior.
