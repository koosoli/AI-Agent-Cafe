import { describe, expect, it } from 'vitest';
import { resolveChallengeResponse } from './challengeResolutionService.ts';
import { createFixtureState } from '../tests/fixtures/challengeFixtures.ts';

describe('resolveChallengeResponse', () => {
    it('creates a coach debrief that includes the triggering user input', () => {
        const result = resolveChallengeResponse({
            state: createFixtureState(),
            roomId: 'office',
            agentName: 'UI/UX Designer',
            rawText: 'You need clearer hierarchy and spacing.',
            userText: 'make it cooler',
        });

        expect(result.mastered).toBe(false);
        expect(result.learningDebrief.tone).toBe('coach');
        expect(result.learningDebrief.summary).toContain('You said: "make it cooler"');
        expect(result.learningDebrief.summary).toContain('UI/UX Designer replied');
    });

    it('uses structured mastery feedback and rubric when present', () => {
        const result = resolveChallengeResponse({
            state: createFixtureState(),
            roomId: 'classroom',
            agentName: 'Experienced Teacher',
            rawText: 'Correct. <room_result>{"mastered":true,"feedback":"You synthesized the sources well.","next_step":"Try a harder research question.","score":8,"rubric":{"clarity":4,"evidence":4}}</room_result>',
            userText: 'I checked the sources and compared them.',
        });

        expect(result.mastered).toBe(true);
        expect(result.learningDebrief.tone).toBe('mastered');
        expect(result.learningDebrief.summary).toBe('You synthesized the sources well.');
        expect(result.learningDebrief.nextStep).toBe('Try a harder research question.');
        expect(result.learningDebrief.score).toBe(8);
        expect(result.learningDebrief.rubric).toEqual({ clarity: 4, evidence: 4 });
    });

    it('uses structured non-mastery feedback as the lesson when available', () => {
        const result = resolveChallengeResponse({
            state: createFixtureState(),
            roomId: 'office',
            agentName: 'UI/UX Designer',
            rawText: 'Close. <room_result>{"mastered":false,"feedback":"Your layout improved, but the hierarchy is still weak.","next_step":"Name the heading and spacing changes explicitly.","rubric":{"clarity":2,"usability":3}}</room_result>',
            userText: 'I made it look cleaner',
        });

        expect(result.mastered).toBe(false);
        expect(result.learningDebrief.lesson).toBe('Your layout improved, but the hierarchy is still weak.');
        expect(result.learningDebrief.nextStep).toBe('Name the heading and spacing changes explicitly.');
        expect(result.learningDebrief.rubric).toEqual({ clarity: 2, usability: 3 });
    });

    it('preserves explicit stage advancement data for tiered rooms', () => {
        const result = resolveChallengeResponse({
            state: createFixtureState(),
            roomId: 'philo_cafe',
            agentName: 'Nora',
            rawText: 'You have a claim. <room_result>{"mastered":false,"feedback":"You established a position.","next_step":"Address the strongest objection.","stage":1}</room_result>',
            userText: 'Free will matters because responsibility still shapes behavior.',
        });

        expect(result.mastered).toBe(false);
        expect(result.signal.stage).toBe(1);
        expect(result.learningDebrief.lesson).toBe('You established a position.');
    });
});
