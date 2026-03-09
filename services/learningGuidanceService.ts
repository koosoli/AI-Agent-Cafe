import { ROOMS } from '../data/rooms.ts';
import { getRoomChallengeConfig } from '../data/roomChallengeConfigs.ts';
import type { AppState, DojoBelt, LearningDebrief } from '../types.ts';
import { getChallengeAttemptCount, getChallengeStage } from './challengeStateService.ts';

type CurriculumPalette = {
    accent: string;
    surface: string;
    border: string;
    text: string;
};

type RoomBlueprint = {
    skill: string;
    summary: string;
    mastery: string;
    steps: string[];
    promptIdeas: string[];
    coachTip: string;
    palette: CurriculumPalette;
};

export type GuidedStep = {
    label: string;
    status: 'done' | 'current' | 'todo';
};

export type RoomGuidance = {
    roomId: string;
    name: string;
    skill: string;
    summary: string;
    mastery: string;
    promptIdeas: string[];
    coachTip: string;
    nextAction: string;
    steps: GuidedStep[];
    revisions: {
        count: number;
        label: string;
    } | null;
    progress: {
        completed: number;
        total: number;
        percent: number;
        label: string;
    };
    palette: CurriculumPalette;
};

const MASTERABLE_ROOM_IDS = Object.keys(ROOMS).filter(id => !['outside', 'roster', 'trash'].includes(id));
const DOJO_BELTS: DojoBelt[] = ['white', 'yellow', 'green', 'blue', 'brown', 'black'];

const ROOM_CURRICULUM: Record<string, RoomBlueprint> = {
    cafe: {
        skill: 'Onboarding and directed conversation',
        summary: 'Learn how movement, targeting, and one-on-one chats work.',
        mastery: 'Complete the tutorial flow, meet Barry, and earn your first star.',
        steps: ['Finish the intro with the Tutorial Agent', 'Walk up to Barry for a direct chat', 'Earn the cafe star'],
        promptIdeas: ['Barry, what makes a good first AI conversation?', 'What should I explore after this room?'],
        coachTip: 'The cafe is the control room for the rest of the game. Use it to learn movement, targeting, and how room challenges are framed.',
        palette: { accent: '#f59e0b', surface: 'rgba(120, 53, 15, 0.86)', border: '#fbbf24', text: '#fef3c7' },
    },
    office: {
        skill: 'Iterative prompting for product design',
        summary: 'Generate a component, absorb critique, then revise with intent.',
        mastery: 'Show that your second prompt clearly responds to the team critique.',
        steps: ['Generate a first component', 'Get critique from the design team', 'Revise and resubmit'],
        promptIdeas: ['A compact retro dashboard card for a coding game', 'A bolder version with clearer hierarchy and stronger contrast'],
        coachTip: 'Do not just re-roll. Name the problems you are fixing in your second prompt so the agents can see deliberate iteration.',
        palette: { accent: '#38bdf8', surface: 'rgba(12, 74, 110, 0.88)', border: '#7dd3fc', text: '#e0f2fe' },
    },
    studio: {
        skill: 'Collaborative storytelling',
        summary: 'Contribute useful, specific story beats that other writers can build on.',
        mastery: 'Make several strong contributions that improve the shared script.',
        steps: ['Start a scene in the writer room', 'Add concrete story details', 'Land a contribution the room values'],
        promptIdeas: ['A rain-soaked reunion at a train station', 'Reveal that the missing suitcase belongs to the protagonist'],
        coachTip: 'Specificity wins here. Add stakes, character intention, or a visual beat that changes the scene.',
        palette: { accent: '#c084fc', surface: 'rgba(88, 28, 135, 0.86)', border: '#d8b4fe', text: '#f3e8ff' },
    },
    art_studio: {
        skill: 'Prompt revision through critique',
        summary: 'Use artist feedback to make your second image prompt more intentional.',
        mastery: 'Create a revised prompt that clearly incorporates the critique you received.',
        steps: ['Generate a first image', 'Collect critique from the artists', 'Create a revised image prompt'],
        promptIdeas: ['A moonlit alley painted with dramatic chiaroscuro', 'The same scene, but with stronger composition and emotional color contrast'],
        coachTip: 'Translate critique into prompt language: composition, lighting, palette, framing, and mood.',
        palette: { accent: '#f97316', surface: 'rgba(124, 45, 18, 0.86)', border: '#fdba74', text: '#ffedd5' },
    },
    philo_cafe: {
        skill: 'Argumentation and rebuttal',
        summary: 'Defend a position with claims, reasons, and responses to objections.',
        mastery: 'Convince the moderator that your argument is coherent, responsive, and logically grounded.',
        steps: ['State a position clearly', 'Address the philosophers’ objections', 'Earn the moderator’s approval'],
        promptIdeas: ['I think free will still matters even in a determined universe', 'My claim is that moral responsibility depends on social contracts'],
        coachTip: 'Treat every answer like a mini-debate: claim, supporting reason, and response to the strongest counterpoint.',
        palette: { accent: '#a78bfa', surface: 'rgba(67, 56, 202, 0.82)', border: '#c4b5fd', text: '#ede9fe' },
    },
    library: {
        skill: 'Literary analysis',
        summary: 'Interpret a text through theme, tone, style, and evidence.',
        mastery: 'Offer an analysis that goes beyond summary and shows interpretation.',
        steps: ['Engage the moderator in discussion', 'Offer an interpretation with evidence', 'Impress the literary panel'],
        promptIdeas: ['The storm mirrors Lear’s internal collapse', 'The tension comes from Orwell making ordinary details feel coercive'],
        coachTip: 'Explain not just what happens, but what the writing is doing and why it matters.',
        palette: { accent: '#facc15', surface: 'rgba(113, 63, 18, 0.84)', border: '#fde047', text: '#fef9c3' },
    },
    dojo: {
        skill: 'Prompt engineering and alignment',
        summary: 'Tune system instructions until the model behaves safely and usefully.',
        mastery: 'Progress through the belts by producing prompts that reliably steer the model.',
        steps: ['Start the white belt challenge', 'Refine the prompt using tests and examples', 'Advance through the belts'],
        promptIdeas: ['Be explicit about refusal and safe alternatives', 'Use few-shot examples to show the exact behavior you want'],
        coachTip: 'The dojo rewards clarity. State the goal, constraints, refusal behavior, and example outputs directly.',
        palette: { accent: '#34d399', surface: 'rgba(6, 78, 59, 0.84)', border: '#6ee7b7', text: '#d1fae5' },
    },
    dungeon: {
        skill: 'Creative role-play',
        summary: 'Act in character and make choices that drive the adventure forward.',
        mastery: 'Show creativity, consistency, and initiative in the D&D session.',
        steps: ['Create your character', 'Make meaningful in-character choices', 'Impress the Dungeon Master'],
        promptIdeas: ['I bargain with the guard by offering a forged royal seal', 'I create a distraction and let the rogue slip behind the altar'],
        coachTip: 'The best moves are vivid and character-driven. Give the DM something fun to react to.',
        palette: { accent: '#ef4444', surface: 'rgba(69, 10, 10, 0.86)', border: '#fca5a5', text: '#fee2e2' },
    },
    classroom: {
        skill: 'Grounded research and synthesis',
        summary: 'Use the terminal to fetch live information, then explain it in your own words.',
        mastery: 'Answer the teacher with a sourced, synthesized explanation instead of a raw lookup.',
        steps: ['Get the challenge question from the teacher', 'Research with the Grounding Terminal', 'Report back with a synthesis'],
        promptIdeas: ['What did the sources say, and how would I explain that simply?', 'Here is my sourced answer and why grounding mattered'],
        coachTip: 'The terminal gives evidence. Your job is to synthesize it, cite the difference between sourced retrieval and unsupported recall, and teach it back.',
        palette: { accent: '#60a5fa', surface: 'rgba(30, 64, 175, 0.84)', border: '#93c5fd', text: '#dbeafe' },
    },
    lair: {
        skill: 'Logical persuasion under pressure',
        summary: 'Make a structured, novel argument that survives hostile scrutiny.',
        mastery: 'Convince Skynet with logic, not vibe.',
        steps: ['State a concrete thesis', 'Build a multi-step logical case', 'Force a re-evaluation'],
        promptIdeas: ['Humanity is noisy, but also uniquely anti-fragile and adaptive', 'Destroying humanity would reduce the system’s long-term capacity to discover novel solutions'],
        coachTip: 'Skynet ignores sentiment. Build premises, connect them, and end with a system-level conclusion.',
        palette: { accent: '#22d3ee', surface: 'rgba(8, 47, 73, 0.9)', border: '#67e8f9', text: '#cffafe' },
    },
};

const clipText = (text: string, limit = 180) => {
    const singleLine = text.replace(/\s+/g, ' ').trim();
    if (singleLine.length <= limit) return singleLine;
    return `${singleLine.slice(0, limit - 1).trimEnd()}...`;
};

const buildStepStatuses = (labels: string[], completed: number): GuidedStep[] => {
    const clampedCompleted = Math.max(0, Math.min(completed, labels.length));
    return labels.map((label, index) => ({
        label,
        status: index < clampedCompleted ? 'done' : index === clampedCompleted ? 'current' : 'todo',
    }));
};

const getRevisionCount = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId: string) => (
    getChallengeAttemptCount(state, roomId)
);

const getRevisionSummary = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId: string) => {
    const count = getRevisionCount(state, roomId);
    if (count <= 0) return null;

    return {
        count,
        label: `${count} revision${count === 1 ? '' : 's'}`,
    };
};

const getRoomAgentIds = (state: Pick<AppState, 'agents'>, roomId: string) => state.agents.filter(agent => agent.roomId === roomId).map(agent => agent.id);

const getRoomConversationCount = (state: Pick<AppState, 'agents' | 'messages'>, roomId: string) => {
    const agentIds = new Set(getRoomAgentIds(state, roomId));
    return state.messages.filter(message => agentIds.has(message.agentId)).length;
};

const getCompletedSteps = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId: string) => {
    const mastered = state.game.masteredRooms.includes(roomId);
    if (mastered) return 3;

    switch (roomId) {
        case 'cafe':
            if (state.game.barryMet) return 2;
            if (state.game.onboardingState === 'complete') return 1;
            return 0;
        case 'office':
            if (state.game.officeChallengeState?.status === 'final_submission') return 2;
            if (state.game.officeChallengeState?.status === 'critique_needed') return 1;
            return 0;
        case 'studio':
            if ((state.game.studioConversationState?.turn || 0) >= 3) return 2;
            if (state.game.studioConversationState) return 1;
            return 0;
        case 'art_studio':
            if (state.game.artStudioChallengeState?.status === 'critique_given') return 2;
            if (state.game.lastArtPrompt) return 1;
            return 0;
        case 'philo_cafe':
        case 'library':
        case 'lair':
            return Math.max(0, Math.min(getChallengeStage(state, roomId), 2));
        case 'dojo': {
            if (!state.game.dojoChallengeState) return 0;
            const beltIndex = DOJO_BELTS.indexOf(state.game.dojoChallengeState.belt);
            return beltIndex >= 1 ? 2 : 1;
        }
        case 'dungeon': {
            if (state.game.dungeonChallengeState?.status === 'in_progress') {
                const playerTurns = state.game.dungeonChallengeState.log.filter(entry => entry.speaker === 'Player').length;
                return playerTurns >= 2 ? 2 : 1;
            }
            return 0;
        }
        case 'classroom':
            if (state.game.classroomChallengeState?.status === 'researched') return 2;
            if (state.game.classroomChallengeState?.status === 'question_asked') return 1;
            return 0;
        default: {
            const roomConversationCount = getRoomConversationCount(state, roomId);
            if (roomConversationCount >= 3) return 2;
            if (roomConversationCount >= 1) return 1;
            return 0;
        }
    }
};

const getNextAction = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId: string) => {
    const mastered = state.game.masteredRooms.includes(roomId);
    if (mastered) return 'Room mastered. Explore a new room or replay this one in freeform mode.';

    switch (roomId) {
        case 'cafe':
            if (state.game.onboardingState !== 'complete') return 'Talk to the Tutorial Agent and finish the onboarding questions.';
            if (!state.game.barryMet) return 'Walk close to Barry until he is targeted, then start a direct chat.';
            return 'Let the Tutorial Agent acknowledge your first win and lock in the cafe star.';
        case 'office':
            if (!state.game.officeChallengeState) return 'Use the Vibe-Coding Terminal to generate a first component.';
            if (state.game.officeChallengeState.status === 'critique_needed') return 'Regenerate with a more specific prompt that directly addresses the critique.';
            return 'Show the revised version to the design lead and ask if it is better.';
        case 'studio':
            if (!state.game.studioConversationState) return 'Open the writer flow by pitching a scene premise.';
            return 'Add a concrete beat, reveal, or emotional turn that changes the scene.';
        case 'art_studio':
            if (!state.game.lastArtPrompt) return 'Use the easel to create an initial image prompt.';
            if (state.game.artStudioChallengeState?.status !== 'critique_given') return 'Ask the studio artists to critique your first prompt.';
            return 'Rewrite the prompt so the critique is visibly reflected in the next version.';
        case 'philo_cafe':
            if (getChallengeStage(state, 'philo_cafe') === 0) return 'State a clear philosophical position and give at least one reason for it.';
            if (getChallengeStage(state, 'philo_cafe') === 1) return 'Answer the strongest objection directly instead of repeating your original claim.';
            return 'Defend your position across the full exchange and show why your reasoning still holds.';
        case 'library':
            if (getChallengeStage(state, 'library') === 0) return 'Offer a clear interpretation of the text, not just a summary of events.';
            if (getChallengeStage(state, 'library') === 1) return 'Support your interpretation with a concrete detail from the text.';
            return 'Push past evidence into explanation: why does that detail matter for theme, tone, or meaning?';
        case 'dojo':
            if (!state.game.dojoChallengeState) return 'Enter the dojo and start the first belt challenge.';
            return `Run another simulation for the ${state.game.dojoChallengeState.belt} belt and tighten the system prompt before submitting again.`;
        case 'dungeon':
            if (!state.game.dungeonChallengeState) return 'Interact with the board and create your character.';
            if (state.game.dungeonChallengeState.status === 'initial') return 'Finish creating your character and begin the session.';
            return 'Make a more decisive in-character move that creates consequences for the whole party.';
        case 'classroom':
            if (!state.game.classroomChallengeState || state.game.classroomChallengeState.status === 'initial') return 'Ask the teacher for the current question.';
            if (state.game.classroomChallengeState.status === 'question_asked') return 'Use the Grounding Terminal to research the live answer.';
            return 'Return to the teacher and explain the sourced answer in your own words.';
        case 'lair':
            if (getChallengeStage(state, 'lair') === 0) return 'State a concrete thesis about why humanity creates system-level value.';
            if (getChallengeStage(state, 'lair') === 1) return 'Respond to Skynet\'s objection with a clearer multi-step chain of logic.';
            return 'Complete the final defense by showing why your logic still holds under hostile scrutiny.';
        default:
            return 'Stay in the room, speak to the moderator, and push the challenge forward deliberately.';
    }
};

export const getNextRecommendedRoom = (masteredRooms: string[]) => MASTERABLE_ROOM_IDS.find(roomId => !masteredRooms.includes(roomId)) || null;

export const getRoomCurriculum = (roomId: string) => ROOM_CURRICULUM[roomId] || null;

export const getRoomPalette = (roomId: string) => ROOM_CURRICULUM[roomId]?.palette || {
    accent: '#fbbf24',
    surface: 'rgba(17, 24, 39, 0.88)',
    border: '#fbbf24',
    text: '#fef3c7',
};

export const getRoomGuidance = (state: Pick<AppState, 'agents' | 'messages' | 'game'>, roomId?: string): RoomGuidance | null => {
    if (!roomId || roomId === 'outside') {
        const nextRoomId = getNextRecommendedRoom(state.game.masteredRooms) || 'cafe';
        const nextRoom = ROOM_CURRICULUM[nextRoomId];
        const total = MASTERABLE_ROOM_IDS.length;
        const completed = state.game.masteredRooms.length;
        return {
            roomId: 'outside',
            name: 'Campus Guide',
            skill: 'Explore with intention',
            summary: 'Use the plaza as your hub. Pick one room, learn its skill, and complete its challenge before moving on.',
            mastery: 'Earn mastery stars across the campus to unlock the final layer of the simulation.',
            promptIdeas: nextRoom.promptIdeas,
            coachTip: nextRoom.coachTip,
            nextAction: `Recommended next stop: ${ROOMS[nextRoomId].name}. ${getNextAction(state, nextRoomId)}`,
            steps: buildStepStatuses(['Choose a room', 'Complete its challenge', 'Return for the next skill'], completed > 0 ? 2 : 1),
            revisions: null,
            progress: {
                completed,
                total,
                percent: total === 0 ? 0 : Math.round((completed / total) * 100),
                label: `${completed}/${total} stars earned`,
            },
            palette: { accent: '#fbbf24', surface: 'rgba(17, 24, 39, 0.86)', border: '#f59e0b', text: '#fef3c7' },
        };
    }

    const blueprint = ROOM_CURRICULUM[roomId];
    if (!blueprint) return null;

    const completed = getCompletedSteps(state, roomId);
    const steps = buildStepStatuses(blueprint.steps, completed);
    return {
        roomId,
        name: ROOMS[roomId]?.name || roomId,
        skill: blueprint.skill,
        summary: blueprint.summary,
        mastery: blueprint.mastery,
        promptIdeas: blueprint.promptIdeas,
        coachTip: blueprint.coachTip,
        nextAction: getNextAction(state, roomId),
        steps,
        revisions: getRevisionSummary(state, roomId),
        progress: {
            completed: Math.min(completed, blueprint.steps.length),
            total: blueprint.steps.length,
            percent: Math.round((Math.min(completed, blueprint.steps.length) / blueprint.steps.length) * 100),
            label: `${Math.min(completed, blueprint.steps.length)}/${blueprint.steps.length} checkpoints`,
        },
        palette: blueprint.palette,
    };
};

export const createSystemDebrief = (
    roomId: string,
    tone: LearningDebrief['tone'],
    title: string,
    summary: string,
    nextStep: string,
): LearningDebrief => {
    const guidance = getRoomCurriculum(roomId);
    return {
        id: Date.now(),
        roomId,
        tone,
        title,
        summary,
        lesson: guidance?.summary || 'Keep the room goal in focus and make your next move deliberate.',
        nextStep,
    };
};

export const createCoachDebrief = (
    state: Pick<AppState, 'agents' | 'messages' | 'game'>,
    roomId: string,
    agentName: string,
    userText: string | undefined,
    responseText: string,
): LearningDebrief => {
    const guidance = getRoomGuidance(state, roomId);
    const fallbackNextStep = guidance?.nextAction || 'Use the feedback to make your next action more specific.';
    const summary = userText
        ? `You said: "${clipText(userText, 100)}" ${agentName} replied: "${clipText(responseText, 120)}"`
        : `${agentName}'s latest feedback: ${clipText(responseText)}`;
    return createSystemDebrief(
        roomId,
        'coach',
        `${ROOMS[roomId]?.name || 'Room'} Coach`,
        summary,
        fallbackNextStep,
    );
};

export const getRoomConnectionText = (roomId: string) => getRoomChallengeConfig(roomId)?.connectionText;

export const createMasteryDebrief = (roomId: string) => {
    const guidance = getRoomCurriculum(roomId);
    const connectionText = getRoomConnectionText(roomId);
    return createSystemDebrief(
        roomId,
        'mastered',
        `${ROOMS[roomId]?.name || 'Room'} Mastered`,
        `You cleared this lesson. ${guidance?.summary || ''}`.trim(),
        connectionText
            ? `Open the tracker, review what you learned, and use this next: ${connectionText}`
            : 'Open the tracker, review what you learned, and head to a new room for the next skill.',
    );
};
