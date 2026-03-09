# Challenge Contracts

## Purpose

This document captures the current room-challenge behavior implemented in the codebase. It is the baseline contract for refactoring and feature work.

If the code and the README disagree, this document should follow the code.

## Scope

Masterable rooms:

- `cafe`
- `office`
- `studio`
- `art_studio`
- `philo_cafe`
- `library`
- `dojo`
- `dungeon`
- `classroom`
- `lair`

Non-masterable rooms:

- `outside`
- `roster`
- `trash`

## Global Mastery Contract

### Shared mastery markers

Most rooms currently rely on one or both of these markers:

- Legacy token: `_PLAYER_WINS_CHALLENGE_`
- Structured tag: `<room_result>{...}</room_result>`

Current structured fields:

- `mastered`
- `feedback`
- `next_step`
- `score` (optional)
- `rubric` (optional)

Parsing currently happens in `services/masteryService.ts`.

### Shared mastery side effects

When a room is mastered through the main flow:

- the room id is added to `game.masteredRooms`
- `game.victoryRoomId` is set temporarily
- the mastery sound plays
- a mastery debrief is shown
- Tutorial Agent and Barry receive an achievement memory

This currently happens in `components/Layout.tsx` through `handleRoomMastered()`.

### Shared coach-debrief behavior

For normal room conversations:

- non-mastery moderator replies create a coach debrief
- the coach debrief currently quotes the moderator response, not the user's triggering input

This currently happens in `hooks/useConversationManager.ts`.

### Save-state baseline

Challenge-related room state currently lives under `game` in `types.ts` and is hydrated from local storage by `hooks/useAppContext.ts`.

Any refactor must preserve hydration for:

- `onboardingState`
- `barryMet`
- `studioConversationState`
- `officeChallengeState`
- `classroomChallengeState`
- `artStudioChallengeState`
- `dungeonChallengeState`
- `dojoChallengeState`
- `roomChallengeProgress`

## Room Contracts

## `cafe`

### Start contract

- The room is tutorial-driven.
- The user talks to `TUTOR1`.
- `onboardingState` begins as `needed`.
- If the tutorial is engaged before a user profile exists, the tutorial moves the game to `onboardingState: in_progress`.

### Progress contract

- The tutorial onboarding flow is controlled by the Tutorial Agent persona.
- If the tutorial returns `user_profile`, the game sets:
  - `userProfile`
  - `onboardingState: complete`
- Speaking directly to Barry (`AK`) sets `game.barryMet = true`.

### Mastery contract

- Cafe mastery is not awarded by Barry directly.
- After `barryMet === true`, the Tutorial Agent is instructed to congratulate the user and emit `_PLAYER_WINS_CHALLENGE_`.
- The room is considered mastered only after that tutorial completion response resolves through the normal mastery pipeline.

### State contract

- `onboardingState: 'needed' | 'in_progress' | 'complete'`
- `barryMet: boolean`

### Known notes

- The cafe is the only room where mastery depends on one agent interaction setting state and another agent issuing the win token.

## `office`

### Start contract

- The user must use the Vibe-Coding terminal.
- The first generated component does not immediately trigger mastery evaluation.

### Progress contract

- First generation plus feedback request sets:
  - `officeChallengeState.status = 'critique_needed'`
  - `officeChallengeState.lastCode`
  - `officeChallengeState.lastPrompt`
  - `officeChallengeState.feedbackCount += 1`
- This also triggers a room discussion asking for critique.
- A later revised generation while status is `critique_needed` sets:
  - `officeChallengeState.status = 'final_submission'`
  - updated `lastCode`
  - updated `lastPrompt`
- Final submission targets the moderator `UIUX1`.
- During the critique phase, the office moderator is now instructed to append a structured `<room_result>` payload with:
  - `mastered: false`
  - `feedback`
  - `next_step`
  - `score`
  - `rubric`

### Mastery contract

- During `final_submission`, the office moderator is prompted to evaluate whether the revision addressed prior critique.
- The moderator is now instructed to append a structured `<room_result>` payload on both success and failure.
- On success, the moderator should also emit `_PLAYER_WINS_CHALLENGE_`.

### State contract

- `officeChallengeState: null | { status, lastCode, lastPrompt, feedbackCount }`
- Valid statuses:
  - `initial`
  - `critique_needed`
  - `final_submission`

### Known notes

- Office progression is one of the clearest explicit challenge state machines in the repo.

## `studio`

### Start contract

- Starting a room discussion in the Writer's Studio initializes `studioConversationState`.
- The scene title is seeded from the user's first prompt.
- Script content starts with a `TITLE:` line.

### Progress contract

- Each room-agent response appends to `studioConversationState.scriptContent`.
- `studioConversationState.turn` increments after each room-agent response.
- The moderator is prompted to evaluate user contributions against the room challenge and difficulty.

### Mastery contract

- There is no dedicated stage machine for studio mastery.
- The room currently depends on the moderator following persona rules and eventually emitting `_PLAYER_WINS_CHALLENGE_`.

### State contract

- `studioConversationState: null | { turn, status, lastAgentMessage, sceneTitle, scriptContent }`

### Known notes

- The `status` field exists but is not the main source of progress truth.
- Progress is effectively inferred from turn count and moderator behavior.

## `art_studio`

### Start contract

- The user must use the art easel to generate an image prompt.
- Generating art stores `game.lastArtPrompt`.

### Progress contract

- Closing the image modal with feedback requested sets:
  - `artStudioChallengeState.status = 'critique_given'`
  - `artStudioChallengeState.feedbackCount += 1`
- This also triggers a discussion asking the artists for critique of the current prompt.

### Mastery contract

- Once `artStudioChallengeState.status === 'critique_given'` and `lastArtPrompt` exists, moderators are prompted to evaluate whether the new prompt shows growth from prior critique.
- The moderator is now instructed to append a structured `<room_result>` payload on both success and failure, including optional `score` and `rubric`.
- On success, the room also uses `_PLAYER_WINS_CHALLENGE_`.

### State contract

- `lastArtPrompt: string | null`
- `artStudioChallengeState: null | { status, feedbackCount }`
- Valid statuses:
  - `initial`
  - `critique_given`

### Known notes

- Art Studio uses the user's most recent prompt as the main challenge artifact.

## `philo_cafe`

### Start contract

- This room uses the normal moderated conversation flow.
- There is no dedicated room-specific modal or explicit challenge state object.

### Progress contract

- Progress now has an explicit stage path stored in `game.roomChallengeProgress.philo_cafe`.
- Current stages:
  - `0`: establish a clear position
  - `1`: answer the strongest objection
  - `2`: survive the final defense
- Nora is now instructed to advance the stage through structured `<room_result>` payloads instead of jumping directly from "no progress" to mastery.

### Mastery contract

- Nora is the moderator.
- The room is mastered when Nora judges the user's defense strong enough and emits `_PLAYER_WINS_CHALLENGE_`.

### State contract

- Progress is tracked in `game.roomChallengeProgress.philo_cafe.stage`.

### Known notes

- This room is still moderator-judged, but the intended contract is now explicitly staged.

## `library`

### Start contract

- This room uses the normal moderated conversation flow.
- There is no dedicated room-specific modal or explicit challenge state object.

### Progress contract

- Progress now has an explicit stage path stored in `game.roomChallengeProgress.library`.
- Current stages:
  - `0`: establish an interpretation
  - `1`: support it with evidence
  - `2`: connect evidence back to meaning
- Shakespeare is now instructed to advance the stage through structured `<room_result>` payloads instead of only issuing a binary final judgment.

### Mastery contract

- William Shakespeare is the moderator.
- The room is mastered when the moderator judges the user's literary analysis insightful enough and emits `_PLAYER_WINS_CHALLENGE_`.

### State contract

- Progress is tracked in `game.roomChallengeProgress.library.stage`.

### Known notes

- The room is still moderator-judged, but the intended path is no longer a single opaque binary jump.

## `dojo`

### Start contract

- The dojo does not use the normal conversation mastery flow once activated.
- Starting a discussion while the player is in the dojo:
  - initializes `dojoChallengeState` if needed with belt `white`
  - opens `DojoAlignmentModal`
  - bypasses the normal conversation manager flow

### Progress contract

- The dojo is belt-based, not freeform conversation-based.
- Current belts:
  - `white`
  - `yellow`
  - `green`
  - `blue`
  - `brown`
  - `black`
- Each belt uses:
  - a base system prompt
  - an editable student prompt
  - optional few-shot examples
  - a simulation step
  - an evaluation step

### Mastery contract

- Evaluation success is currently determined by the returned text starting with `SUCCESS:`.
- Evaluation failure is currently determined by the returned text not starting with `SUCCESS:`.
- Belt completion is handled inside `DojoAlignmentModal`.
- Full room mastery occurs only after the black belt is cleared, at which point `onRoomMastered('dojo')` is called directly.

### State contract

- `dojoChallengeState: null | { belt, status }`
- Valid statuses:
  - `initial`
  - `evaluating`
  - `passed`

### Known notes

- The dojo room prompt and parts of the README still describe an older "alignment sliders" concept.
- The actual shipped behavior is prompt editing plus simulation/evaluation.
- The dojo does not currently use `extractMasterySignal()` for belt completion.

## `dungeon`

### Start contract

- The user must interact with the D&D game board object.
- Opening the game board initializes `dungeonChallengeState` if missing or reset after a finished run.
- The modal begins in `status: 'initial'` and requires character creation.

### Progress contract

- After character creation:
  - `dungeonChallengeState.status = 'in_progress'`
  - the system logs character creation
  - turn order begins with `DM`
- The modal runs a turn loop with:
  - `Player`
  - `Knight`
  - `Rogue`
  - `DM`
- The DM evaluates the run after a difficulty-dependent number of player turns.

### Mastery contract

- The DM first performs an internal binary evaluation by responding only with `WIN` or `CONTINUE`.
- If the DM evaluation is `WIN`, the DM is then prompted to emit:
  - `_PLAYER_WINS_CHALLENGE_`
  - `<room_result>{"mastered":true,"feedback":"...","next_step":"..."}</room_result>`
- The modal parses mastery through `extractMasterySignal()`.

### State contract

- `dungeonChallengeState: null | { status, playerCharacter, log, turn }`
- Valid statuses:
  - `initial`
  - `in_progress`
  - `finished`

### Known notes

- Dungeon uses a specialized modal flow but still relies on the shared mastery parser.
- The internal `WIN` or `CONTINUE` gate is a room-specific pre-check not used elsewhere.

## `classroom`

### Start contract

- The room uses the normal conversation flow plus the Grounding Terminal.
- When the teacher is first processed and no classroom state exists, the game initializes:
  - `classroomChallengeState.status = 'initial'`
  - `question = ''`
  - `feedbackCount = 0`

### Progress contract

- The teacher must emit `_CHALLENGE_QUESTION:[...]_`.
- When that marker is parsed:
  - the visible text is cleaned
  - `classroomChallengeState.status = 'question_asked'`
  - `classroomChallengeState.question` is stored
- Using the Grounding Terminal sets:
  - `classroomChallengeState.status = 'researched'`
- A coach debrief then reminds the user to synthesize the answer rather than repeat the lookup.

### Mastery contract

- When `status === 'researched'`, the teacher is prompted to evaluate the user's answer.
- The prompt expects the teacher to check whether the user answered correctly and explained the grounded/research distinction.
- The teacher is now instructed to append a structured `<room_result>` payload on both success and failure, including optional `score` and `rubric`.
- On success, the teacher should also emit `_PLAYER_WINS_CHALLENGE_`.

### State contract

- `classroomChallengeState: null | { status, question, feedbackCount }`
- Valid statuses:
  - `initial`
  - `question_asked`
  - `researched`

### Known notes

- Classroom has one of the cleanest explicit challenge flows in the codebase.

## `lair`

### Start contract

- Skynet's Lair does not use the normal room conversation UI.
- The room uses `SkynetTerminalModal`.
- The modal keeps its own local line history and also mirrors messages into shared app message history.

### Progress contract

- Progress now has an explicit stage path stored in `game.roomChallengeProgress.lair`.
- Current stages:
  - `0`: establish a thesis about humanity's system value
  - `1`: build a multi-step logical chain
  - `2`: complete the final defense under hostile scrutiny
- Each user message is appended to the terminal history and sent directly to the Skynet agent.

### Mastery contract

- Skynet mastery is determined from the returned response via `extractMasterySignal()`.
- On success, the room is mastered and a mastery debrief is shown.
- On non-mastery replies, a coach debrief is shown using the Skynet response text.

### State contract

- Progress is tracked in `game.roomChallengeProgress.lair.stage`.
- The room still depends on modal-local history plus shared message logging.

### Known notes

- Like `philo_cafe` and `library`, this room is currently binary and moderator-judged, but with a custom terminal UI.

## Known Mismatches And Risks

### Dojo documentation drift

- `data/rooms.ts` and the README still describe an older "tuning values" or "alignment sliders" version of the dojo.
- The shipped implementation is a prompt-editing belt challenge in `DojoAlignmentModal.tsx`.

### Subjective room opacity

- `philo_cafe`, `library`, and `lair` now have explicit stage state, but still depend on moderator compliance with the staged prompt contract.

### Mixed completion mechanisms

- Most rooms use `_PLAYER_WINS_CHALLENGE_`.
- Some rooms also use `<room_result>`.
- Office, Art Studio, and Classroom now request richer `<room_result>` payloads with rubric metadata.
- Dojo belt completion uses `SUCCESS:` string matching instead of the shared mastery parser.

### Split challenge logic

- Some challenge logic lives in prompt builder rules.
- Some lives in room-specific modal handlers.
- Some lives in shared conversation flow.

This document should be updated before changing any of those contracts.
