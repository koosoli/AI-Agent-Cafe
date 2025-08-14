import type { Agent, AppState, Memory, UserProfile } from '../types.ts';
import { MemoryType } from '../types.ts';
import { USER_AGENT } from '../constants.ts';

// Helper function to find what an agent has "heard" about the user.
const findRumorsAboutUser = (memories: Record<MemoryType, Memory[]> | undefined, userProfile: Partial<UserProfile>): string[] => {
    if (!memories) return [];
    const rumors: string[] = [];
    const allMems = [...(memories[MemoryType.SEMANTIC] || []), ...(memories[MemoryType.EPISODIC] || [])];
    const userName = userProfile.name?.toLowerCase();

    allMems.forEach(m => {
        const desc = m.description.toLowerCase();
        // Check for direct mentions of "the user" or their known name.
        const isAboutUser = desc.includes('the user') || (userName && desc.includes(userName));
        
        if (isAboutUser) {
             // Filter out memories that are just the agent's own observations of the user being present.
             if (!desc.startsWith('user is at') && !desc.startsWith('the user is currently')) {
                rumors.push(m.description);
             }
        }
    });
    // Return the most recent/relevant rumors
    return rumors.slice(-3);
};


/**
 * A dedicated class for constructing the complex system instruction prompt for an agent.
 * This encapsulates the logic, making it more modular, testable, and maintainable.
 */
export class PromptBuilder {
    private agent: Agent;
    private scenarioPrompt: string;
    private movementEnabled: boolean;
    private userProfile: Partial<UserProfile>;
    private game: AppState['game'];
    private subTask: string;
    private memories?: Record<MemoryType, Memory[]>;
    private inventory?: AppState['inventory'];
    private allAgents: Agent[];

    private parts: string[] = [];

    /**
     * Creates an instance of PromptBuilder.
     * @param agent The agent for whom the prompt is being built.
     * @param scenarioPrompt The prompt specific to the agent's current room.
     * @param movementEnabled Whether the agent can use movement tools.
     * @param userProfile The current user's profile.
     * @param game The current game state.
     * @param subTask The specific instruction for the current turn.
     * @param memories The salient memories retrieved for this turn.
     * @param inventory The player's current inventory.
     * @param allAgents All agents in the simulation for context.
     */
    constructor(
        agent: Agent,
        scenarioPrompt: string,
        movementEnabled: boolean,
        userProfile: Partial<UserProfile>,
        game: AppState['game'],
        subTask: string,
        memories?: Record<MemoryType, Memory[]>,
        inventory?: AppState['inventory'],
        allAgents?: Agent[]
    ) {
        this.agent = agent;
        this.scenarioPrompt = scenarioPrompt;
        this.movementEnabled = movementEnabled;
        this.userProfile = userProfile;
        this.game = game;
        this.subTask = subTask;
        this.memories = memories;
        this.inventory = inventory;
        this.allAgents = allAgents || [];
    }

    private _buildCoreIdentity(): this {
        const coreMemory = this.memories?.[MemoryType.CORE]?.[0]?.description || this.agent.persona;
        const identity = [
            `You are an AI character named "${this.agent.name}".`,
            `Your core identity is: ${coreMemory}`
        ];
        this.parts.push(identity.join('\n'));
        return this;
    }

    private _buildMemoryInjection(): this {
        const memoryStrings: string[] = [];
        if (this.memories) {
            Object.entries(this.memories).forEach(([type, mems]) => {
                if (mems.length > 0 && type !== MemoryType.CORE) {
                    const memStrings = mems.map(m => `- ${m.name ? `[${m.name}] ` : ''}${m.description}`).join('\n');
                    memoryStrings.push(`<${type.toUpperCase()}_MEMORY>\n${memStrings}\n</${type.toUpperCase()}_MEMORY>`);
                }
            });
        }
        if (memoryStrings.length > 0) {
            this.parts.push("\n--- RETRIEVED MEMORIES (for your context only) ---\n" + memoryStrings.join('\n'));
        }
        return this;
    }

    private _buildRules(): this {
        const rules = [];

        if (this.agent.isModerator) {
            rules.push('**MODERATOR ROLE:** You are the moderator. Your primary goal is to facilitate an engaging discussion. You should guide the conversation by asking targeted questions to other agents or the user by name. You can also summarize points or offer a concluding thought. If you do not address anyone directly in your response, the conversation will pause for the user to speak.');
        }

        rules.push(
            '**LANGUAGE:** You MUST respond in the same language as the user\'s last message. This is your highest priority.',
            '**CONCISENESS:** Keep responses to 1-3 sentences. Do NOT repeat, rephrase, or summarize previous speakers or your own instructions.',
            '**IDENTITY:** ONLY respond from your character\'s perspective. Do not invent dialogue or actions for others.',
            '**INTERACTIVITY:** To keep conversation engaging, occasionally ask the user for their opinion.',
            '**NATURAL CONVERSATION:** Not every agent needs to speak on every topic. If you have nothing new or insightful to add, it is acceptable to give a short, neutral response like "I agree," or "I have nothing to add at this time."'
        );

        let formatInstruction = '**FORMAT:** Respond with only your character\'s speech.';
        if (this.agent.id === 'TUTOR1' && this.game.onboardingState === 'in_progress') {
            formatInstruction = '**FORMAT:** Your response MUST BE A SINGLE RAW JSON OBJECT with two keys: "user_profile" (an object with "name", "age", and "interests" as string keys) and "speech" (a string thanking the user and explaining the game). Example: `{"user_profile": {"name": "Bob", "age": "30", "interests": "AI"}, "speech": "Thanks Bob! Welcome..."}`. Do not use markdown formatting. This is your highest priority.';
        }
        rules.push(formatInstruction);

        this.parts.push("\n--- RULES ---\n- " + rules.join('\n- '));
        return this;
    }
    
    private _buildContext(): this {
        let scenarioLine = this.scenarioPrompt ? `The overall scenario is: "${this.scenarioPrompt}"` : '';
        let equippedItemContext = '';
        if (this.game.equippedArtifactId && this.inventory) {
            const artifact = this.inventory.find(a => a.id === this.game.equippedArtifactId);
            if (artifact) {
                if (artifact.type === 'image') equippedItemContext = `The user is actively holding an image they generated with the prompt: "${artifact.prompt}". Your conversation should relate to this item.`;
                else if (artifact.type === 'code') equippedItemContext = `The user is actively holding a code component they generated with the prompt: "${artifact.prompt}". Your conversation should relate to this item.`;
                else if (artifact.type === 'screenplay') equippedItemContext = `The user is actively holding a screenplay titled: "${artifact.title}". Your conversation should relate to this item.`;
            }
        } else if (this.game.lastArtPrompt) {
            scenarioLine += ` The user just generated an image with the prompt: "${this.game.lastArtPrompt}". Your conversation should be a critique of this prompt.`;
        }

        let userInfoSection: string;
        const rumorsAboutUser = findRumorsAboutUser(this.memories, this.userProfile);
        if (this.userProfile.name) {
            userInfoSection = `The user's name is ${this.userProfile.name}. Greet them by name.`;
            if (rumorsAboutUser.length > 0) userInfoSection += ` You also have these memories about them:\n${rumorsAboutUser.map(r => `- ${r}`).join('\n')}`;
        } else if (rumorsAboutUser.length > 0) {
            userInfoSection = `You have not met the user directly, but you have heard some things about them. Use these memories to inform your greeting. For example, if you know their name, use it. If you know their accomplishments, mention them.\n**Memories about the user:**\n${rumorsAboutUser.map(r => `- ${r}`).join('\n')}`;
        } else {
            userInfoSection = `You have not met the user and have no prior information about them. Greet them, introduce yourself with your name, '${this.agent.name}', and ask for their name to start the conversation.`;
        }
        if (this.agent.id === 'TUTOR1') {
            if (this.userProfile.name) {
                userInfoSection = `You are a friendly Tutorial Agent. The user's name is ${this.userProfile.name}. Greet them by name, but DO NOT ask for their name again. Your only job is to get them started on the first challenge. Give them this instruction: 'Your first challenge is to master this cafe. It's simple: walk over to the Barista, Barry, until he's highlighted in yellow, and then start a one-on-one conversation with him. This will complete the challenge and teach you the basics!' Do NOT ask for age or interests.`;
            } else {
                userInfoSection = "Follow your persona's specific, multi-step onboarding flow for interacting with the user.";
            }
        }

        const specialAbilities = [];
        if (this.agent.roomId === 'studio') {
            const scriptContent = this.game.studioConversationState?.scriptContent || 'The script is empty.';
            const directorInstructions = "You are the Director. Your job is to set the scene with a SCENE HEADING (e.g., INT. SPACESHIP - DAY) or guide the writers by asking questions. You can also add action lines.";
            const writerInstructions = "You are a Writer. Your job is to add ACTION lines or DIALOGUE for a character. Build on the last part of the script.";
            const roleInstruction = this.agent.isModerator ? directorInstructions : writerInstructions;
            const screenplayInstructions = [
                `You are an AI screenwriter in a writer's room. Your goal is to collaboratively write a screenplay.`,
                `Your response MUST be ONLY the next part of the script. Do NOT add commentary.`,
                `Follow standard screenplay format:`,
                `- SCENE HEADINGS are in all caps. e.g., INT. COFFEE SHOP - DAY`,
                `- CHARACTER names for dialogue are centered and in all caps.`,
                `- DIALOGUE is indented under the character name.`,
                `Your specific role is: ${roleInstruction}`,
                `--- CURRENT SCRIPT ---`,
                scriptContent,
                `---`,
                `The last thing said was: "${this.subTask}"`,
                `Now, add the next part of the script.`
            ].join('\n');
            specialAbilities.push(screenplayInstructions);
        } else {
            const FOLLOW_INSTRUCTIONS = 'To follow the user, include "_START_FOLLOWING_" in your speech if they say "follow me". To pause your following, include "_WAIT_HERE_" if they say "wait" or "stay here". To stop following completely, include "_STOP_FOLLOWING_" if they say "stop following" or "go away".';
            specialAbilities.push(FOLLOW_INSTRUCTIONS);
        }
        const roomsWithCustomChallengeFlows = ['office', 'studio', 'classroom', 'lair', 'art_studio', 'dojo', 'dungeon'];
        if (this.agent.isModerator && !roomsWithCustomChallengeFlows.includes(this.agent.roomId)) {
            specialAbilities.push('As a moderator, you can issue a "Room Challenge" to the user.');
        }

        const contextParts = [
            "\n--- CONTEXT ---",
            `**SCENARIO:** ${scenarioLine || 'A general discussion.'}`,
            equippedItemContext ? `**ACTIVE ITEM CONTEXT:** ${equippedItemContext}` : '',
            `**USER PROFILE & GREETING:**\n- ${userInfoSection}`,
            `**SPECIAL ABILITIES:**\n- ${specialAbilities.join('\n- ')}`,
        ];
        this.parts.push(contextParts.join('\n'));
        return this;
    }

    private _buildParticipantsContext(): this {
        if (!this.allAgents || this.allAgents.length === 0) return this;

        // Find other agents in the same room.
        const otherAgentsInRoom = this.allAgents.filter(a => 
            a.roomId === this.agent.roomId && 
            a.id !== this.agent.id &&
            a.id !== USER_AGENT.id
        );
        
        // Check if the user is in the same room.
        const userInRoom = this.allAgents.find(a => a.id === USER_AGENT.id && a.roomId === this.agent.roomId);

        const participantDescriptions: string[] = [];
        
        otherAgentsInRoom.forEach(a => {
            const coreMemory = a.memoryStream.find(m => m.type === MemoryType.CORE)?.description;
            participantDescriptions.push(`"${a.name}" (${coreMemory || a.persona || 'an AI assistant'})`);
        });

        if (userInRoom) {
            participantDescriptions.push('the User ("You")');
        }

        if (participantDescriptions.length > 0) {
            const participantText = `You are in a discussion with: ${participantDescriptions.join(', ')}.`;
            this.parts.push(`\n**OTHER PARTICIPANTS:** ${participantText}`);
        }

        return this;
    }

    private _buildTask(): this {
        let criticalTask = "No special task for this turn.";
        const difficultyContext = `The current game difficulty is **${this.game.difficulty}**. On 'Easy', be very lenient and encouraging. On 'Normal', be balanced. On 'Hard', be very strict, critical, and expect a high level of quality/creativity before you are impressed.`;

        if (this.agent.id === 'TUTOR1' && this.game.barryMet === true) {
            criticalTask = `The user has completed the first challenge by meeting Barry. Follow PRIORITY 1 in your persona to congratulate them and award the win. This instruction supersedes all others.`;
        }
        if (this.agent.roomId === 'office') {
            if (this.game.officeChallengeState?.status === 'critique_needed') {
                const userPrompt = this.game.officeChallengeState.lastPrompt;
                criticalTask = `The user wants feedback on a component they just generated with the prompt: "${userPrompt}". Your persona has specific rules for this. Your critique should be based on your expertise and the current game difficulty. ${difficultyContext}`;
            } else if (this.game.officeChallengeState?.status === 'final_submission') {
                criticalTask = `The user has submitted a revised component. Evaluate it based on the current difficulty setting. ${difficultyContext} If it addresses prior critique well enough, congratulate them and include the secret phrase _PLAYER_WINS_CHALLENGE_ to win the room.`;
            }
        }
        if (this.agent.roomId === 'art_studio' && this.game.artStudioChallengeState?.status === 'critique_given' && this.game.lastArtPrompt) {
            criticalTask = `The user has a new art prompt: "${this.game.lastArtPrompt}". Evaluate if it shows growth based on your prior critique and the current difficulty. ${difficultyContext} If so, praise them and include the secret phrase _PLAYER_WINS_CHALLENGE_.`;
        }
        if (this.agent.roomId === 'studio' && this.agent.isModerator && this.game.studioConversationState) {
            criticalTask = `The current screenplay turn count is ${this.game.studioConversationState.turn}. Evaluate the user's contributions according to your persona's challenge rules and the current difficulty. ${difficultyContext}`;
        }
        if (this.agent.roomId === 'classroom' && this.game.classroomChallengeState?.status === 'researched') {
            criticalTask = `The user has researched your question: "${this.game.classroomChallengeState.question}". Evaluate their answer based on the current difficulty. ${difficultyContext} If correct (explaining RAG vs standard AI), congratulate them and include the secret phrase _PLAYER_WINS_CHALLENGE_.`;
        }
        if (this.agent.id === 'DOJO1' && this.subTask.startsWith("As the Dojo Sensei, you must evaluate")) {
            criticalTask = this.subTask;
        }

        this.parts.push(`**CRITICAL TASK FOR THIS TURN:** ${criticalTask}`);
        return this;
    }

    /**
     * Assembles all parts of the prompt into a single system instruction string.
     * @returns The final, complete system prompt.
     */
    public build(): string {
        this._buildCoreIdentity()
            ._buildMemoryInjection()
            ._buildRules()
            ._buildContext()
            ._buildParticipantsContext()
            ._buildTask();
        return this.parts.join('\n');
    }
}