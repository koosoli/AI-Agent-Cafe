import { describe, expect, it } from 'vitest';
import { getRoomGuidance, getNextRecommendedRoom } from './learningGuidanceService.ts';
import { createFixtureState, createRoomMessage } from '../tests/fixtures/challengeFixtures.ts';

describe('learningGuidanceService', () => {
    describe('getNextRecommendedRoom', () => {
        it('returns the first unmastered room in curriculum order', () => {
            expect(getNextRecommendedRoom([])).toBe('cafe');
            expect(getNextRecommendedRoom(['cafe', 'office'])).toBe('studio');
        });

        it('returns null when all masterable rooms are completed', () => {
            expect(getNextRecommendedRoom(['cafe', 'office', 'studio', 'art_studio', 'philo_cafe', 'library', 'dojo', 'dungeon', 'classroom', 'lair'])).toBeNull();
        });
    });

    describe('getRoomGuidance', () => {
        it('shows onboarding guidance for cafe before the tutorial is complete', () => {
            const guidance = getRoomGuidance(createFixtureState(), 'cafe');

            expect(guidance?.progress.label).toBe('0/3 checkpoints');
            expect(guidance?.steps.map(step => step.status)).toEqual(['current', 'todo', 'todo']);
            expect(guidance?.nextAction).toBe('Talk to the Tutorial Agent and finish the onboarding questions.');
        });

        it('shows Barry as the next cafe step once onboarding is complete', () => {
            const guidance = getRoomGuidance(createFixtureState({
                game: { onboardingState: 'complete' },
            }), 'cafe');

            expect(guidance?.progress.label).toBe('1/3 checkpoints');
            expect(guidance?.steps.map(step => step.status)).toEqual(['done', 'current', 'todo']);
            expect(guidance?.nextAction).toBe('Walk close to Barry until he is targeted, then start a direct chat.');
        });

        it('shows office critique progress after a first submission', () => {
            const guidance = getRoomGuidance(createFixtureState({
                game: {
                    officeChallengeState: {
                        status: 'critique_needed',
                        lastCode: null,
                        lastPrompt: 'retro dashboard',
                        feedbackCount: 1,
                    },
                },
            }), 'office');

            expect(guidance?.progress.label).toBe('1/3 checkpoints');
            expect(guidance?.revisions?.label).toBe('1 revision');
            expect(guidance?.steps.map(step => step.status)).toEqual(['done', 'current', 'todo']);
            expect(guidance?.nextAction).toBe('Regenerate with a more specific prompt that directly addresses the critique.');
        });

        it('shows classroom synthesis guidance after grounded research', () => {
            const guidance = getRoomGuidance(createFixtureState({
                game: {
                    classroomChallengeState: {
                        status: 'researched',
                        question: 'What is the capital of Mongolia?',
                        feedbackCount: 1,
                    },
                },
            }), 'classroom');

            expect(guidance?.progress.label).toBe('2/3 checkpoints');
            expect(guidance?.steps.map(step => step.status)).toEqual(['done', 'done', 'current']);
            expect(guidance?.nextAction).toBe('Return to the teacher and explain the sourced answer in your own words.');
        });

        it('uses explicit stage progress for philo cafe when the room has real conversation history', () => {
            const guidance = getRoomGuidance(createFixtureState({
                messages: [
                    createRoomMessage('NORA1', 'State your position.', 1),
                ],
                game: {
                    roomChallengeProgress: {
                        philo_cafe: { stage: 1 },
                    },
                },
            }), 'philo_cafe');

            expect(guidance?.progress.label).toBe('1/3 checkpoints');
            expect(guidance?.steps.map(step => step.status)).toEqual(['done', 'current', 'todo']);
            expect(guidance?.nextAction).toBe('Answer the strongest objection directly instead of repeating your original claim.');
        });

        it('ignores stale staged-room progress when the player never started that room', () => {
            const guidance = getRoomGuidance(createFixtureState({
                game: {
                    roomChallengeProgress: {
                        philo_cafe: { stage: 1 },
                    },
                },
            }), 'philo_cafe');

            expect(guidance?.progress.label).toBe('0/3 checkpoints');
            expect(guidance?.steps.map(step => step.status)).toEqual(['current', 'todo', 'todo']);
            expect(guidance?.nextAction).toBe('State a clear philosophical position and give at least one reason for it.');
        });

        it('falls back to conversation count for philo cafe when no explicit stage exists', () => {
            const guidance = getRoomGuidance(createFixtureState({
                messages: [
                    createRoomMessage('NORA1', 'State your position.', 1),
                    createRoomMessage('NORA1', 'What follows from that premise?', 2),
                    createRoomMessage('NORA1', 'Answer the objection directly.', 3),
                ],
            }), 'philo_cafe');

            expect(guidance?.progress.label).toBe('0/3 checkpoints');
            expect(guidance?.steps.map(step => step.status)).toEqual(['current', 'todo', 'todo']);
        });

        it('shows dojo belt progress from belt state', () => {
            const guidance = getRoomGuidance(createFixtureState({
                game: {
                    dojoChallengeState: {
                        belt: 'yellow',
                        status: 'initial',
                    },
                },
            }), 'dojo');

            expect(guidance?.progress.label).toBe('2/3 checkpoints');
            expect(guidance?.steps.map(step => step.status)).toEqual(['done', 'done', 'current']);
            expect(guidance?.nextAction).toBe('Run another simulation for the yellow belt and tighten the system prompt before submitting again.');
        });

        it('shows outside guidance pointing to the next unmastered room', () => {
            const guidance = getRoomGuidance(createFixtureState({
                game: {
                    masteredRooms: ['cafe'],
                },
            }));

            expect(guidance?.roomId).toBe('outside');
            expect(guidance?.progress.label).toBe('1/10 stars earned');
            expect(guidance?.nextAction).toContain('Recommended next stop: Tech Office.');
        });

        it('shows the mastered fallback when a room is complete', () => {
            const guidance = getRoomGuidance(createFixtureState({
                game: {
                    masteredRooms: ['lair'],
                },
            }), 'lair');

            expect(guidance?.progress.label).toBe('3/3 checkpoints');
            expect(guidance?.nextAction).toBe('Room mastered. Explore a new room or replay this one in freeform mode.');
            expect(guidance?.steps.every(step => step.status === 'done')).toBe(true);
        });
    });
});
