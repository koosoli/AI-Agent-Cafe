# Release Checklist

Use this checklist before merging challenge-related changes.

## Prompt And Contract Changes

- If a room prompt changed, update [challenge-contracts.md](/c:/Users/mail/Downloads/AI-Agent-Cafe-main/docs/challenge-contracts.md).
- If a structured `<room_result>` contract changed, confirm runtime validation still accepts the intended fields.
- If a room changed from binary to staged progression, verify the player-facing steps and next-action text still match the actual flow.

## Tests

- Run `npm run test:run`.
- If prompt or challenge behavior changed, update or add fixture-backed tests.
- If a UI surface changed for debriefs, tracker, or challenge progression, add or update component tests.

## Build

- Run `npm run build`.
- Confirm there are no new TypeScript errors.

## Manual Room QA

- Cafe: onboarding, Barry interaction, tutorial completion.
- Office: first draft, critique, revision, final evaluation.
- Art Studio: initial prompt, critique, revised prompt evaluation.
- Classroom: question issued, grounding search, synthesized answer.
- Dungeon: character creation, role-play loop, mastery path.
- Dojo: simulation, evaluation, belt progression.
- Philo Cafe: stage progression from claim to rebuttal to final defense.
- Library: stage progression from interpretation to evidence to final analysis.
- Skynet's Lair: stage progression from thesis to logic chain to final defense.

## Save And Hydration

- Verify new challenge state hydrates safely from existing saves.
- Verify new challenge state persists after reload.

## Docs

- README descriptions must match shipped behavior for touched rooms.
- New user-facing strings should be checked for encoding issues.
