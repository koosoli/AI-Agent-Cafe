import type { Agent } from '../types.ts';

/**
 * Calculates the Levenshtein distance between two strings (a measure of their difference).
 * This is used to add typo tolerance when detecting agent names in user prompts.
 * @param s1 The first string.
 * @param s2 The second string.
 * @returns The Levenshtein distance.
 */
const levenshtein = (s1: string, s2: string): number => {
    if (s1.length < s2.length) return levenshtein(s2, s1);
    if (s2.length === 0) return s1.length;
    let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
        let currentRow = [i + 1];
        for (let j = 0; j < s2.length; j++) {
            let insertions = previousRow[j + 1] + 1;
            let deletions = currentRow[j] + 1;
            let substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
            currentRow.push(Math.min(insertions, deletions, substitutions));
        }
        previousRow = currentRow;
    }
    return previousRow[previousRow.length - 1];
};

/**
 * Finds all agents mentioned in a given text, with typo tolerance.
 * @param text The text to search within.
 * @param agents The list of all available agents.
 * @returns An array of found agents, sorted by their first appearance in the text.
 */
export const findAllMentionedAgents = (text: string, agents: Agent[]): { agent: Agent, index: number }[] => {
    const mentioned: { agent: Agent, index: number }[] = [];
    const lowerText = text.toLowerCase();
    
    agents.forEach(agent => {
        const lowerName = agent.name.toLowerCase();
        // Allow for a simple typo (e.g., Levenshtein distance of 1 or 2)
        const typoThreshold = Math.floor(lowerName.length / 4); // ~25% of the name length
        
        // Split text into words to check for typos on individual words
        const words = lowerText.split(/[\s,.;!?]+/);
        let bestMatchIndex = -1;

        words.forEach(word => {
            if (levenshtein(word, lowerName) <= typoThreshold) {
                const index = lowerText.indexOf(word);
                if (index !== -1 && (bestMatchIndex === -1 || index < bestMatchIndex)) {
                    bestMatchIndex = index;
                }
            }
        });
        
        if (bestMatchIndex !== -1) {
            mentioned.push({ agent, index: bestMatchIndex });
        }
    });

    // Sort by first appearance in the text
    return mentioned.sort((a, b) => a.index - b.index);
};
