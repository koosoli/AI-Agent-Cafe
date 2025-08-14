import { useEffect, useRef, useCallback } from 'react';
import type { Agent } from '../types.ts';
import { MemoryType } from '../types.ts';
import { USER_AGENT } from '../constants.ts';
import { isPositionValid, findRandomValidPoint, getRoomForPosition } from '../services/collisionService.ts';
import { GAME_CONFIG } from '../data/gameConfig.ts';
import * as audioService from '../services/audioService.ts';
import * as socialAnalysisService from '../services/socialAnalysisService.ts';
import { useMemoryManager } from './useMemoryManager.ts';
import { useAutonomousCreator } from './useAutonomousCreator.ts';
import { INTERACTIVE_OBJECTS } from '../data/layout.ts';
import { AGENT_ACTIVITY_PREFERENCES } from '../data/activities.ts';
import { RELATIONSHIP_CHANGE_MAP } from './useRelationshipManager.ts';
import { SpatialGrid } from '../services/spatialService.ts';
import { useAppStore } from './useAppContext.ts';
import { shallow } from 'zustand/shallow';

const GREETINGS = ['Hi!', 'Hello.', 'Good day.', 'Greetings.'];

export const useAgentBehavior = () => {
  const stateRef = useRef(useAppStore.getState());
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(newState => {
        stateRef.current = newState;
    });
    return unsubscribe;
  }, []);
  const { 
    setAgentTask, setGameState, setAgents, setUiState, 
    setChattingStatus, updateRelationship, setAgentGreeting,
    setAgentIsUsingObject, setInsightStatus
  } = useAppStore.getState();
  const agentElementRefs = useRef<Map<string, HTMLDivElement | null>>(new Map()); // This can be managed internally or passed if needed by other components

  const animationFrameId = useRef<number | null>(null);
  const agentStuckFrames = useRef<Record<string, number>>({});
  const { addMemory } = useMemoryManager();
  const { handleAutonomousPainting } = useAutonomousCreator();
  const spatialGrid = useRef(new SpatialGrid(200));
  const debriefTimeoutRef = useRef<number | null>(null);

  // --- Performance Optimization Refs ---
  const agentProcessingIndex = useRef(0);
  const AGENTS_PER_FRAME = 15; // Process up to 15 agents per frame to distribute the load

  const clearAgentTaskAndSetCooldown = useCallback((agentId: string, roomId: string) => {
      setAgentTask(agentId, null, Date.now());
      const currentCooldowns = stateRef.current.game.roomCooldowns || {};
      const randomDelay = Math.random() * 5000; // Add up to 5s of extra random delay
      setGameState({ roomCooldowns: { ...currentCooldowns, [roomId]: Date.now() + randomDelay } });
  }, [setAgentTask, setGameState]);

  const playerPosition = useAppStore(s => s.agents.find(a => a.id === USER_AGENT.id)?.position, shallow);

  // Agent proximity check for targetting
  useEffect(() => {
      // Defer proximity checks if a modal is open to save resources
      if (stateRef.current.ui.isAnyModalOpen) {
          if (stateRef.current.ui.targetAgentId) {
            setUiState({ targetAgentId: null });
          }
          return;
      }

      const { agents: currentAgents, ui: currentUi } = stateRef.current;
      const player = currentAgents.find(a => a.id === USER_AGENT.id);

      if (!player) {
        if (currentUi.targetAgentId) {
          setUiState({ targetAgentId: null });
        }
        return;
      }

      const playerRoomId = player.roomId;
      const threshold = playerRoomId === 'outside' ? GAME_CONFIG.PROXIMITY_THRESHOLD_OUTSIDE : GAME_CONFIG.PROXIMITY_THRESHOLD_INSIDE;
      let closestAgent: { id: string, distance: number } | null = null;
      
      let isNearBoard = false;
      if (player.roomId === 'dungeon') {
          const board = INTERACTIVE_OBJECTS.GAME_BOARD;
          const boardCenterX = board.left + board.width / 2;
          const boardCenterY = board.top + board.height / 2;
          const dxBoard = player.position.left - boardCenterX;
          const dyBoard = player.position.top - boardCenterY;
          if (Math.hypot(dxBoard, dyBoard) < 150) {
              isNearBoard = true;
          }
      }

      if (isNearBoard) {
          closestAgent = null;
      } else {
          // Use spatial grid to find agents near the player
          const nearbyAgents = spatialGrid.current.query(player.position.left, player.position.top, threshold);

          for (const agent of nearbyAgents) {
            if (agent.id === USER_AGENT.id || agent.isChatting) continue;
            
            const dx = agent.position.left - player.position.left;
            const dy = agent.position.top - player.position.top;
            const distance = Math.hypot(dx, dy);

            if (distance < threshold) {
              if (!closestAgent || distance < closestAgent.distance) {
                closestAgent = { id: agent.id, distance: distance };
              }
            }
          }
      }

      const newTargetId = closestAgent ? closestAgent.id : null;
      if (newTargetId !== currentUi.targetAgentId) {
        setUiState({ targetAgentId: newTargetId });
      }
      
  }, [playerPosition, setUiState]); // Re-run only when player position changes
  

  // MAIN TASK & MOVEMENT LOOP
  useEffect(() => {
    let lastExecutionTime = Date.now();
    
    const taskLoop = () => {
        animationFrameId.current = requestAnimationFrame(taskLoop);
        
        const now = Date.now();
        const delta = now - lastExecutionTime;
        if (delta < 33) return;
        lastExecutionTime = now;

        const { agents: currentAgents, isLoading } = stateRef.current;
        const { debriefingState } = stateRef.current.game;
        
        const agentUpdates = new Map<string, Partial<Agent>>();
        
        const lastPositions = new Map<string, { left: number, top: number }>();
        currentAgents.forEach(a => lastPositions.set(a.id, { ...a.position }));

        // Rebuild spatial grid every frame for accurate positions
        spatialGrid.current.clear();
        currentAgents.forEach(agent => spatialGrid.current.insert(agent));

        const agentsToProcess = currentAgents.filter(a => a.id !== USER_AGENT.id && !a.isLocked);
        if (agentsToProcess.length === 0) return;
        
        const processedAgentsInBatch: Agent[] = [];
        for (let i = 0; i < AGENTS_PER_FRAME; i++) {
            if (agentsToProcess.length === 0) break;
            const agentIndex = (agentProcessingIndex.current + i) % agentsToProcess.length;
            processedAgentsInBatch.push(agentsToProcess[agentIndex]);
        }
        
        for (const agent of processedAgentsInBatch) {
            if (agent.isChatting || agent.isUsingObject || agent.greeting || stateRef.current.ui.isAnyModalOpen) {
                agentStuckFrames.current[agent.id] = 0; // Reset stuck counter if performing an action
                continue; // Skip to next agent in batch
            }
            
            // Patrol task timeout logic
            const task = agent.currentTask;
            if (task?.type === 'patrol' && (Date.now() - task.startTime > GAME_CONFIG.PATROL_TASK_TIMEOUT_MS)) {
                console.log(`${agent.name}'s patrol task timed out after ${GAME_CONFIG.PATROL_TASK_TIMEOUT_MS / 1000}s.`);
                clearAgentTaskAndSetCooldown(agent.id, agent.roomId);
                continue; // End this agent's turn
            }

            let moveVector = { x: 0, y: 0 };
            let isPurposeful = false;
            
            if (debriefingState.active && agent.roomId === debriefingState.roomId && !agent.isAnimal && agent.id !== USER_AGENT.id) {
                isPurposeful = true;
                const gatherPoint = debriefingState.gatherPoint!;
                const dx = gatherPoint.x - agent.position.left;
                const dy = gatherPoint.y - agent.position.top;
                const distance = Math.hypot(dx, dy);

                if (distance > 50) { // Keep moving until close
                    moveVector = { x: dx / distance, y: dy / distance };
                }
            } else if (isLoading) {
                const player = currentAgents.find(a => a.id === USER_AGENT.id);
                const { activeParticipants } = stateRef.current;
                
                // Conversational movement logic
                if (player && agent.roomId === player.roomId && activeParticipants.some(p => p.id === agent.id)) {
                    const persona = agent.memoryStream.find(m => m.type === MemoryType.CORE)?.description || agent.persona;
                    const isRude = persona.toLowerCase().includes('rude') || persona.toLowerCase().includes('arrogant') || persona.toLowerCase().includes('dismissive');
                    const wantsToEngage = persona.toLowerCase().includes('friendly') || persona.toLowerCase().includes('engaging') || persona.toLowerCase().includes('curious');
                    
                    const randomFactor = Math.random();
                    
                    // Very low chance per frame to initiate a step.
                    if (isRude && randomFactor < 0.01) {
                        const dx = agent.position.left - player.position.left;
                        const dy = agent.position.top - player.position.top;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 0 && dist < 300) moveVector = { x: dx / dist, y: dy / dist };
                    } else if (wantsToEngage && randomFactor < 0.015) {
                        const dx = player.position.left - agent.position.left;
                        const dy = player.position.top - agent.position.top;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 100) moveVector = { x: dx / dist, y: dy / dist };
                    }
                    isPurposeful = false;
                }

            } else { // Autonomous movement logic
                let targetPos: { left: number; top: number; } | null = null;
                let stopDistance = 50;

                if (task) {
                    isPurposeful = true;
                    if (task.type === 'talk' || task.type === 'small_talk') {
                        const partner = currentAgents.find(a => a.id === task.partnerId);
                        if (partner) { targetPos = partner.position; stopDistance = 100; }
                    } else if (task.type === 'use_object') {
                        const objectKey = task.objectId as keyof typeof INTERACTIVE_OBJECTS;
                        const objectData = INTERACTIVE_OBJECTS[objectKey];
                        if (objectData) {
                            let targetX = objectData.left + objectData.width / 2;
                            let targetY = objectData.top + objectData.height / 2;
                    
                            if (task.activity === 'coding' || task.activity === 'research' || task.activity === 'writing') {
                                targetY += 110;
                            } else if (task.activity === 'dnd') {
                                targetY += 120;
                            }
                            
                            targetPos = { left: targetX, top: targetY };
                            stopDistance = 50;
                        }
                    } else if (task.type === 'patrol') {
                        targetPos = { left: task.target.x, top: task.target.y };
                        stopDistance = 10;
                    }
                } else if (agent.followingAgentId) {
                    isPurposeful = true;
                    const leader = currentAgents.find(a => a.id === agent.followingAgentId);
                    if (leader && !agent.isWaiting) { targetPos = leader.position; stopDistance = GAME_CONFIG.FOLLOW_DISTANCE; }
                }
                
                if (targetPos) {
                    const dx = targetPos.left - agent.position.left;
                    const dy = targetPos.top - agent.position.top;
                    const distance = Math.hypot(dx, dy);

                    if (distance <= stopDistance) {
                        agentStuckFrames.current[agent.id] = 0;
                         if (task?.type === 'patrol') {
                            clearAgentTaskAndSetCooldown(agent.id, agent.roomId);
                         } else if (task?.type === 'talk' && !agent.isChatting) {
                             const partner = currentAgents.find(a => a.id === task.partnerId);
                             if(partner) {
                                setChattingStatus([agent.id, task.partnerId], true);
                                addMemory(task.partnerId, { description: `I heard from ${agent.name} that ${task.memoryToShare.description}`, type: MemoryType.EPISODIC });
                               
                                if (stateRef.current.game.agentAutonomyEnabled) {
                                    socialAnalysisService.analyzeGossipReaction(agent, partner, task.memoryToShare, stateRef.current.services)
                                    .then(classification => {
                                        const change = RELATIONSHIP_CHANGE_MAP[classification];
                                        if (change !== 0) {
                                            console.log(`Gossip reaction between ${agent.name} and ${partner.name}: ${classification} (${change})`);
                                            updateRelationship(agent.id, partner.id, change);
                                        }
                                    }).catch(e => console.error("Gossip reaction analysis failed", e));
                                }

                                setTimeout(() => {
                                    setChattingStatus([agent.id, task.partnerId], false);
                                    clearAgentTaskAndSetCooldown(agent.id, agent.roomId);
                                    clearAgentTaskAndSetCooldown(task.partnerId, agent.roomId);
                                }, 5000);
                             }
                        } else if (task?.type === 'small_talk' && !agent.isChatting) {
                            const partner = currentAgents.find(a => a.id === task.partnerId);
                            if (partner) {
                                setChattingStatus([agent.id, task.partnerId], true);
                                setTimeout(() => {
                                    setChattingStatus([agent.id, task.partnerId], false);
                                    const currentPartner = stateRef.current.agents.find(a => a.id === task.partnerId);
                                    if (currentPartner?.currentTask?.type === 'small_talk') {
                                        clearAgentTaskAndSetCooldown(task.partnerId, agent.roomId);
                                    }
                                    clearAgentTaskAndSetCooldown(agent.id, agent.roomId);
                                }, GAME_CONFIG.SMALL_TALK_DURATION_MS);
                            }
                        } else if (task?.type === 'use_object') {
                             setAgentIsUsingObject(agent.id, true);
                             setTimeout(() => {
                                setAgentIsUsingObject(agent.id, false);
                                if (task.activity === 'painting') handleAutonomousPainting(agent.id);
                                clearAgentTaskAndSetCooldown(agent.id, agent.roomId);
                             }, 10000);
                        }
                    } else {
                         moveVector = { x: dx / distance, y: dy / distance };
                    }
                } else {
                    agentStuckFrames.current[agent.id] = 0;
                }
            }
            
            const avoidanceVector = { x: 0, y: 0 };
            const neighbors = spatialGrid.current.query(agent.position.left, agent.position.top, GAME_CONFIG.AVOIDANCE_RADIUS);
            let isDeadlocked = false;
            
            for (const other of neighbors) {
                if (agent.id === other.id) continue;
                const dist = Math.hypot(agent.position.left - other.position.left, agent.position.top - other.position.top);
                if (dist > 0 && dist < GAME_CONFIG.AVOIDANCE_RADIUS) {
                    if (dist < GAME_CONFIG.DEADLOCK_AVOIDANCE_DISTANCE && agent.id < other.id) {
                       isDeadlocked = true;
                    }

                    const repulsionX = agent.position.left - other.position.left;
                    const repulsionY = agent.position.top - other.position.top;
                    const magnitude = 1 / (dist * dist); 
                    avoidanceVector.x += (repulsionX / dist) * magnitude;
                    avoidanceVector.y += (repulsionY / dist) * magnitude;
                }
            }

            if (isDeadlocked) {
                moveVector = { x: 0, y: 0 };
            }
            
            const finalVector = {
                x: moveVector.x + avoidanceVector.x * GAME_CONFIG.AVOIDANCE_STRENGTH,
                y: moveVector.y + avoidanceVector.y * GAME_CONFIG.AVOIDANCE_STRENGTH,
            };

            let moveSpeed = isPurposeful
                ? GAME_CONFIG.AGENT_BASE_SPEED * GAME_CONFIG.AGENT_PURPOSEFUL_SPEED_MULTIPLIER
                : GAME_CONFIG.AGENT_BASE_SPEED;
                
            if (agent.roomId === 'outside') {
                moveSpeed *= GAME_CONFIG.AGENT_OUTSIDE_SPEED_MULTIPLIER;
            }

            const finalMag = Math.hypot(finalVector.x, finalVector.y);
            if(finalMag > 0.1) {
                let finalNormalized = { x: finalVector.x / finalMag, y: finalVector.y / finalMag };
                
                const PROBE_DISTANCE = moveSpeed * 3;
                let probePoint = { x: agent.position.left + finalNormalized.x * PROBE_DISTANCE, y: agent.position.top + finalNormalized.y * PROBE_DISTANCE };

                if (!isPositionValid(probePoint.x, probePoint.y, false, agent)) {
                    const steeringAngles = [45, -45, 90, -90];
                    let foundNewPath = false;
                    for (const angle of steeringAngles) {
                        const rad = angle * (Math.PI / 180);
                        const steeredX = finalNormalized.x * Math.cos(rad) - finalNormalized.y * Math.sin(rad);
                        const steeredY = finalNormalized.x * Math.sin(rad) + finalNormalized.y * Math.cos(rad);
                        
                        probePoint = { x: agent.position.left + steeredX * PROBE_DISTANCE, y: agent.position.top + steeredY * PROBE_DISTANCE };

                        if (isPositionValid(probePoint.x, probePoint.y, false, agent)) {
                            finalNormalized = { x: steeredX, y: steeredY };
                            foundNewPath = true;
                            break;
                        }
                    }
                    if (!foundNewPath) {
                        finalNormalized = { x: -finalNormalized.x, y: -finalNormalized.y };
                    }
                }
                
                const moveX = finalNormalized.x * moveSpeed;
                const moveY = finalNormalized.y * moveSpeed;
                const newPos = { left: agent.position.left, top: agent.position.top };

                if (isPositionValid(agent.position.left + moveX, agent.position.top + moveY, false, agent)) {
                    newPos.left += moveX;
                    newPos.top += moveY;
                } else {
                    if (isPositionValid(agent.position.left + moveX, agent.position.top, false, agent)) newPos.left += moveX;
                    if (isPositionValid(agent.position.left, agent.position.top + moveY, false, agent)) newPos.top += moveY;
                }
                
                const moved = newPos.left !== agent.position.left || newPos.top !== agent.position.top;

                if (moved) {
                    const newRoomId = getRoomForPosition(newPos.left, newPos.top);
                    agentUpdates.set(agent.id, {
                        ...agentUpdates.get(agent.id),
                        position: newPos,
                        roomId: newRoomId,
                    });
                    agentStuckFrames.current[agent.id] = 0;
                } else {
                    if (!isDeadlocked) {
                        const currentStuckFrames = (agentStuckFrames.current[agent.id] || 0) + 1;
                        agentStuckFrames.current[agent.id] = currentStuckFrames;

                        if (currentStuckFrames > GAME_CONFIG.AGENT_STUCK_THRESHOLD_FRAMES) {
                            const stuckAgent = agent;
                            const nearbyAgents = spatialGrid.current.query(stuckAgent.position.left, stuckAgent.position.top, GAME_CONFIG.AVOIDANCE_RADIUS);
                            // Find an idle agent (no task) that is blocking the way.
                            const blockingAgent = nearbyAgents.find(other => other.id !== stuckAgent.id && !other.currentTask);

                            if (blockingAgent) {
                                // Found an idle agent blocking the way. Tell them to move.
                                console.log(`${stuckAgent.name} is blocked by idle agent ${blockingAgent.name}. Telling ${blockingAgent.name} to move.`);

                                const moveAwayVector = { x: blockingAgent.position.left - stuckAgent.position.left, y: blockingAgent.position.top - stuckAgent.position.top };
                                const mag = Math.hypot(moveAwayVector.x, moveAwayVector.y) || 1;
                                const moveDistance = 50;
                                
                                const targetPos = { x: blockingAgent.position.left + (moveAwayVector.x / mag) * moveDistance, y: blockingAgent.position.top + (moveAwayVector.y / mag) * moveDistance };

                                let finalTarget = null;
                                if(isPositionValid(targetPos.x, targetPos.y, false, blockingAgent)) {
                                    finalTarget = targetPos;
                                } else {
                                    // Try perpendicular moves if direct move is blocked
                                    const perpVector1 = { x: -moveAwayVector.y, y: moveAwayVector.x };
                                    const perpTarget1 = { x: blockingAgent.position.left + (perpVector1.x / mag) * moveDistance, y: blockingAgent.position.top + (perpVector1.y / mag) * moveDistance };
                                    if(isPositionValid(perpTarget1.x, perpTarget1.y, false, blockingAgent)) {
                                        finalTarget = perpTarget1;
                                    } else {
                                        const perpVector2 = { x: moveAwayVector.y, y: -moveAwayVector.x };
                                        const perpTarget2 = { x: blockingAgent.position.left + (perpVector2.x / mag) * moveDistance, y: blockingAgent.position.top + (perpVector2.y / mag) * moveDistance };
                                        if (isPositionValid(perpTarget2.x, perpTarget2.y, false, blockingAgent)) {
                                            finalTarget = perpTarget2;
                                        }
                                    }
                                }

                                if(finalTarget) {
                                    setAgentTask(blockingAgent.id, { type: 'patrol', target: finalTarget, startTime: Date.now() });
                                } else {
                                    // No valid move found for blocking agent, so stuck agent gives up
                                    console.log(`Could not find valid move-away spot for ${blockingAgent.name}.`);
                                    clearAgentTaskAndSetCooldown(stuckAgent.id, stuckAgent.roomId);
                                }
                            } else {
                                // Stuck on something else (wall, multiple busy agents, etc.) -> fallback to original behavior
                                const currentTask = agent.currentTask;
                                console.log(`${agent.name} is stuck on obstacle with task ${currentTask?.type || 'nothing'}, clearing task.`);
                                if (currentTask?.type === 'talk' || currentTask?.type === 'small_talk') {
                                    setAgentTask(currentTask.partnerId, null);
                                }
                                clearAgentTaskAndSetCooldown(agent.id, agent.roomId);
                            }
                            // Reset the stuck counter regardless of outcome to prevent immediate re-triggering.
                            agentStuckFrames.current[agent.id] = 0;
                        }
                    } else {
                        agentStuckFrames.current[agent.id] = 0;
                    }
                }
            } else {
                agentStuckFrames.current[agent.id] = 0;
            }
        }
        agentProcessingIndex.current = (agentProcessingIndex.current + agentsToProcess.length) % agentsToProcess.length;
        
        // --- Group Logic after individual agent calcs ---
        if (debriefingState.active && debriefingState.roomId && debriefingState.gatherPoint) {
            if (!debriefTimeoutRef.current) {
                debriefTimeoutRef.current = window.setTimeout(() => {
                    const agentsInRoom = stateRef.current.agents.filter(a => a.roomId === debriefingState.roomId).map(a => a.id);
                    setGameState({ debriefingState: { active: false, roomId: null, gatherPoint: undefined } });
                    setChattingStatus(agentsInRoom, false);
                    debriefTimeoutRef.current = null;
                }, 10000); // 10 second debrief
            }
            const agentsInRoom = currentAgents.filter(a => a.roomId === debriefingState.roomId && !a.isAnimal && a.id !== USER_AGENT.id);
            const gatherPoint = debriefingState.gatherPoint;
            const allGathered = agentsInRoom.every(agent => Math.hypot(gatherPoint.x - agent.position.left, gatherPoint.y - agent.position.top) <= 50);

            if (allGathered) {
                const agentIdsInRoom = agentsInRoom.map(a => a.id);
                if (!agentsInRoom.every(a => a.isChatting)) {
                    setChattingStatus(agentIdsInRoom, true);
                }
            } else {
                const agentIdsInRoom = agentsInRoom.map(a => a.id);
                if (agentsInRoom.some(a => a.isChatting)) {
                    setChattingStatus(agentIdsInRoom, false);
                }
            }
        } else {
            if (debriefTimeoutRef.current) {
                window.clearTimeout(debriefTimeoutRef.current);
                debriefTimeoutRef.current = null;
            }
        }
        
        // --- Batch state updates and run post-move logic ---
        
        // First, compute what the next state of agents will be
        const newAgents = stateRef.current.agents.map(agent => {
            const update = agentUpdates.get(agent.id);
            return update ? { ...agent, ...update } : agent;
        });

        const newAgentDataMap = new Map<string, Agent>(newAgents.map(a => [a.id, a]));
        const player = newAgentDataMap.get(USER_AGENT.id);
        let anyAudibleAgentIsWalking = false;

        if (player) {
            // OPTIMIZED: This loop now only checks the agents that were processed in the current frame.
            for (const processedAgent of processedAgentsInBatch) {
                const agent = newAgentDataMap.get(processedAgent.id);
                if (!agent) continue;

                const lastPos = lastPositions.get(agent.id);
                if (!lastPos) continue;

                const hasMoved = agent.position.left !== lastPos.left || agent.position.top !== lastPos.top;
                if (hasMoved) {
                     if (agent.roomId === player.roomId) {
                        if (player.roomId === 'outside') {
                            const dist = Math.hypot(player.position.left - agent.position.left, player.position.top - agent.position.top);
                            if (dist < GAME_CONFIG.AUDIO_PROXIMITY_THRESHOLD) {
                                anyAudibleAgentIsWalking = true;
                                break; 
                            }
                        } else {
                            anyAudibleAgentIsWalking = true;
                            break;
                        }
                    }
                }
            }
        }
        
        if (anyAudibleAgentIsWalking) {
            audioService.startAiWalking();
        } else {
            audioService.stopAiWalking();
        }

        // Finally, commit the state update if there were any changes
        if (agentUpdates.size > 0) {
            setAgents(newAgents);
        }
    };

    taskLoop();
    return () => { 
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); 
        if (debriefTimeoutRef.current) clearTimeout(debriefTimeoutRef.current);
        audioService.stopAiWalking();
    };
  }, [addMemory, handleAutonomousPainting, clearAgentTaskAndSetCooldown, setAgents, setAgentGreeting, setAgentIsUsingObject, setAgentTask, setChattingStatus, setGameState, setInsightStatus, updateRelationship]);
};
