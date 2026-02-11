import { useEffect, useRef } from 'react';
import { useAppStore } from './useAppContext.ts';
import type { Agent } from '../types.ts';
import { MemoryType } from '../types.ts';
import { USER_AGENT } from '../constants.ts';
import { GAME_CONFIG } from '../data/gameConfig.ts';
import { AGENT_ACTIVITY_PREFERENCES } from '../data/activities.ts';
import { INTERACTIVE_OBJECTS } from '../data/layout.ts';
import { isPositionValid, findRandomValidPoint } from '../services/collisionService.ts';

const MAX_MEMORIES_TO_GOSSIP_ABOUT = 3;

// --- Helper to select a gossip partner based on relationships ---
const selectGossipPartner = (agent: Agent, potentialPartners: Agent[]): Agent | null => {
    if (potentialPartners.length === 0) return null;

    const relationships = agent.relationships || {};
    const weights = potentialPartners.map(p => {
        const score = relationships[p.id] || 0; // Default to neutral
        return Math.exp(score / 50);
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return potentialPartners[Math.floor(Math.random() * potentialPartners.length)];

    let random = Math.random() * totalWeight;
    for (let i = 0; i < potentialPartners.length; i++) {
        random -= weights[i];
        if (random <= 0) return potentialPartners[i];
    }
    return potentialPartners[potentialPartners.length - 1];
};


export const useAgentMotivation = () => {
    const { setAgentTask, setAgents } = useAppStore.getState();
    const stateRef = useRef(useAppStore.getState());
    useEffect(() => {
        const unsubscribe = useAppStore.subscribe(newState => {
            stateRef.current = newState;
        });
        return unsubscribe;
    }, []);

    const majorDecisionTimeout = useRef<number | null>(null);
    const stepTimeout = useRef<number | null>(null);

    const runMajorDecisionLoop = () => {
        const { agents, ui, game, isLoading } = stateRef.current;
        if (ui.isAnyModalOpen || isLoading) {
            majorDecisionTimeout.current = window.setTimeout(runMajorDecisionLoop, GAME_CONFIG.MOTIVATION_MAJOR_DECISION_INTERVAL_MS);
            return;
        };
        
        const player = agents.find(a => a.id === USER_AGENT.id);
        if (!player) return;

        const idleAgents = agents.filter(a => !a.isLocked && !a.currentTask && a.id !== USER_AGENT.id && !a.isWaiting);

        // Group idle agents by room
        const agentsByRoom = idleAgents.reduce((acc, agent) => {
            if (!acc[agent.roomId]) acc[agent.roomId] = [];
            acc[agent.roomId].push(agent);
            return acc;
        }, {} as Record<string, Agent[]>);
        
        for (const roomId in agentsByRoom) {
            // New check: is any agent in *this specific room* already busy with a major task?
            const isRoomActive = agents.some(a => a.roomId === roomId && a.currentTask && a.currentTask.type !== 'patrol');
            if(isRoomActive) continue; // Skip this room, move to the next.

            const now = Date.now();
            const roomCooldownEnd = game.roomCooldowns?.[roomId] || 0;
            const MIN_COOLDOWN_MS = 5000;
            if (now < roomCooldownEnd + MIN_COOLDOWN_MS) continue;

            const agentsInRoom = agentsByRoom[roomId];
            const playerIsInRoom = player.roomId === roomId;
            const isOutdoor = roomId === 'outside';

            if (!isOutdoor && !playerIsInRoom) continue;
            
            const WAKE_UP_CHANCE = isOutdoor ? 0.7 : 0.4;
            if (Math.random() > WAKE_UP_CHANCE) continue;

            // Pick one agent from the room to evaluate
            const agentToEvaluate = agentsInRoom[Math.floor(Math.random() * agentsInRoom.length)];
            
            const stationaryAgentIds = ['TUTOR1', 'AK', 'SKYNET1'];
            if (stationaryAgentIds.includes(agentToEvaluate.id) || agentToEvaluate.roomId === 'dungeon') {
                continue;
            }

            if (agentToEvaluate.isAnimal) {
                continue;
            }
            
            const potentialPartners = agents.filter(p =>
                !p.isAnimal &&
                p.id !== agentToEvaluate.id &&
                p.roomId === agentToEvaluate.roomId &&
                !p.currentTask
            );

            const preferredActivity = AGENT_ACTIVITY_PREFERENCES[agentToEvaluate.id];
            
            const canMove = (now - (agentToEvaluate.lastMovementFailureTimestamp || 0)) > 10000;

            let gossipUtility = 0;
            let objectUtility = 0;
            let smallTalkUtility = 0;
            let patrolUtility = 0;
            const wanderUtility = GAME_CONFIG.UTILITY_SCORE_WANDER;

            if (canMove) {
                // --- Autonomy-Gated Actions ---
                if (game.agentAutonomyEnabled) {
                    // Gossip
                    if (now - (agentToEvaluate.lastGossipTimestamp || 0) > GAME_CONFIG.GOSSIP_COOLDOWN_MS) {
                        const recentImportantMemory = agentToEvaluate.memoryStream.filter(m => m.type !== MemoryType.CORE).sort((a, b) => b.importance - a.importance)[0];
                        if (recentImportantMemory && recentImportantMemory.importance > 5) {
                            gossipUtility = GAME_CONFIG.UTILITY_SCORE_GOSSIP_BASE + (recentImportantMemory.importance * GAME_CONFIG.UTILITY_MEMORY_IMPORTANCE_MULTIPLIER);
                            const bestPartner = selectGossipPartner(agentToEvaluate, potentialPartners);
                            if (bestPartner) gossipUtility += (agentToEvaluate.relationships?.[bestPartner.id] || 0) * GAME_CONFIG.UTILITY_RELATIONSHIP_MULTIPLIER; else gossipUtility = 0;
                        }
                    }

                    // Small Talk
                    if (potentialPartners.length > 0 && now - (agentToEvaluate.lastSmallTalkTimestamp || 0) > GAME_CONFIG.SMALL_TALK_COOLDOWN_MS) {
                        smallTalkUtility = GAME_CONFIG.UTILITY_SCORE_SMALL_TALK_BASE;
                    }

                    // Use Object
                    if (preferredActivity && preferredActivity.objectId) {
                        objectUtility = GAME_CONFIG.UTILITY_OBJECT_PREFERENCE_BOOST;
                    }
                }

                // --- Non-Gated Actions (basic movement) ---
                const interactiveObjectsInRoom = Object.values(INTERACTIVE_OBJECTS).filter(obj => obj.roomId === agentToEvaluate.roomId);
                const patrolTargets = [...potentialPartners.map(p => ({ x: p.position.left, y: p.position.top })), ...interactiveObjectsInRoom.map(o => ({ x: o.left + o.width / 2, y: o.top + o.height / 2 }))];

                if (patrolTargets.length > 0) {
                    patrolUtility = 0.25;
                }
            }

            const utilities = { gossip: gossipUtility, useObject: objectUtility, patrol: patrolUtility, wander: wanderUtility, smallTalk: smallTalkUtility };
            const maxUtility = Math.max(...Object.values(utilities));
            const actionPriority: (keyof typeof utilities)[] = ['useObject', 'gossip', 'smallTalk', 'patrol', 'wander'];
            const bestAction = actionPriority.find(action => utilities[action] === maxUtility);

            if (bestAction === 'useObject' && preferredActivity) {
                const isObjectInUse = agents.some(a => a.currentTask?.type === 'use_object' && a.currentTask.objectId === preferredActivity.objectId);
                if (!isObjectInUse) setAgentTask(agentToEvaluate.id, { type: 'use_object', ...preferredActivity });
            } else if (bestAction === 'gossip') {
                const partner = selectGossipPartner(agentToEvaluate, potentialPartners);
                const memoryToShare = agentToEvaluate.memoryStream.filter(m => m.type !== MemoryType.CORE).sort((a,b) => b.importance - a.importance).slice(0, MAX_MEMORIES_TO_GOSSIP_ABOUT)[0];
                if (partner && memoryToShare && !partner.memoryStream.some(m => m.description === memoryToShare.description)) {
                    setAgentTask(agentToEvaluate.id, { type: 'talk', partnerId: partner.id, memoryToShare });
                    setAgentTask(partner.id, { type: 'talk', partnerId: agentToEvaluate.id, memoryToShare });
                    setAgents(agents.map(a => a.id === agentToEvaluate.id ? { ...a, lastGossipTimestamp: now } : a));
                }
            } else if (bestAction === 'smallTalk') {
                const partner = selectGossipPartner(agentToEvaluate, potentialPartners);
                if (partner) {
                    setAgentTask(agentToEvaluate.id, { type: 'small_talk', partnerId: partner.id });
                    setAgentTask(partner.id, { type: 'small_talk', partnerId: agentToEvaluate.id });
                    const updatedAgents = agents.map(a => (a.id === agentToEvaluate.id || a.id === partner.id) ? { ...a, lastSmallTalkTimestamp: now } : a);
                    setAgents(updatedAgents);
                }
            } else if (bestAction === 'patrol') {
                const interactiveObjectsInRoom = Object.values(INTERACTIVE_OBJECTS).filter(obj => obj.roomId === agentToEvaluate.roomId);
                const patrolTargets = [...potentialPartners.map(p => ({ x: p.position.left, y: p.position.top })), ...interactiveObjectsInRoom.map(o => ({ x: o.left + o.width/2, y: o.top + o.height/2 }))];
                const baseTarget = patrolTargets[Math.floor(Math.random() * patrolTargets.length)];
                
                let target = null;
                for (let i = 0; i < 5; i++) { // Try up to 5 times to find a valid jittered point
                    const jitteredTarget = {
                        x: baseTarget.x + (Math.random() - 0.5) * 40,
                        y: baseTarget.y + (Math.random() - 0.5) * 40
                    };
                    if (isPositionValid(jitteredTarget.x, jitteredTarget.y, false, agentToEvaluate)) {
                        target = jitteredTarget;
                        break;
                    }
                }
                
                if (!target) {
                    target = baseTarget;
                }

                setAgentTask(agentToEvaluate.id, { type: 'patrol', target, startTime: Date.now() });
            }
        }

        majorDecisionTimeout.current = window.setTimeout(runMajorDecisionLoop, GAME_CONFIG.MOTIVATION_MAJOR_DECISION_INTERVAL_MS);
    };

     const runStepLoop = () => {
        const { agents, ui, isLoading } = stateRef.current;
        if (ui.isAnyModalOpen || isLoading) {
            stepTimeout.current = window.setTimeout(runStepLoop, GAME_CONFIG.MOTIVATION_STEP_INTERVAL_MS);
            return;
        }

        const player = agents.find(a => a.id === USER_AGENT.id);
        if (!player) {
            stepTimeout.current = window.setTimeout(runStepLoop, GAME_CONFIG.MOTIVATION_STEP_INTERVAL_MS);
            return;
        }

        const idleAgents = agents.filter(a => !a.isLocked && !a.currentTask && a.id !== USER_AGENT.id && !a.isWaiting);
        if (idleAgents.length === 0) {
            stepTimeout.current = window.setTimeout(runStepLoop, GAME_CONFIG.MOTIVATION_STEP_INTERVAL_MS);
            return;
        }
        
        const shuffledIdleAgents = idleAgents.sort(() => 0.5 - Math.random());
        
        // This loop now iterates over all idle agents without breaking, allowing multiple
        // agents to start wandering in the same cycle. This makes the world more active.
        for (const agent of shuffledIdleAgents) {
            const stationaryAgentIds = ['TUTOR1', 'AK', 'SKYNET1'];
            if (stationaryAgentIds.includes(agent.id) || agent.roomId === 'dungeon') {
                continue;
            }
            
            const canMove = (Date.now() - (agent.lastMovementFailureTimestamp || 0)) > 10000;
            if (!canMove) continue;

            const shouldMove = (agent.roomId === 'outside' || agent.isAnimal) || 
                               (player.roomId === agent.roomId && Math.random() < 0.02);
            
            if (shouldMove) {
                const newTarget = findRandomValidPoint(agent);
                if (newTarget) {
                    setAgentTask(agent.id, { type: 'patrol', target: newTarget, startTime: Date.now() });
                }
            }
        }

        stepTimeout.current = window.setTimeout(runStepLoop, GAME_CONFIG.MOTIVATION_STEP_INTERVAL_MS);
    };

    useEffect(() => {
        // Stagger the loops
        majorDecisionTimeout.current = window.setTimeout(runMajorDecisionLoop, GAME_CONFIG.MOTIVATION_MAJOR_DECISION_INTERVAL_MS);
        stepTimeout.current = window.setTimeout(runStepLoop, GAME_CONFIG.MOTIVATION_STEP_INTERVAL_MS);

        return () => {
            if (majorDecisionTimeout.current) clearTimeout(majorDecisionTimeout.current);
            if (stepTimeout.current) clearTimeout(stepTimeout.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};