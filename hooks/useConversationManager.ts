import { useCallback, useRef, useEffect } from 'react';
import { getAgentResponse } from '../services/llmService.ts';
import type { Agent, Message, AppState, UserProfile } from '../types.ts';
import { MemoryType } from '../types.ts';
import { USER_AGENT } from '../constants.ts';
import { ROOMS } from '../data/rooms.ts';
import * as speechService from '../services/speechService.ts';
import * as audioService from '../services/audioService.ts';
import { rumbleSubtitle } from '../services/gamepadService.ts';
import { useMemoryManager } from './useMemoryManager.ts';
import { useRelationshipManager } from './useRelationshipManager.ts';
import { useAppStore } from './useAppContext.ts';
import { shallow } from 'zustand/shallow';
import { findAllMentionedAgents } from '../services/chatUtils.ts';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  const chunks = text.match(/[^.!?]+[.!?]*|[^.!?]+$/g) || [];
  return chunks.map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
};

interface ConversationManagerOptions {
    onAgentRelativeMove: (agentId: string, direction: 'up' | 'down' | 'left' | 'right', distance: number) => void;
    onRoomMastered?: (roomId: string) => void;
    onStartFollowing?: (agentId: string) => void;
    onStopFollowing?: (agentId: string) => void;
    onStartWaiting?: (agentId: string) => void;
}

export const useConversationManager = ({ onAgentRelativeMove, onRoomMastered, onStartFollowing, onStopFollowing, onStartWaiting }: ConversationManagerOptions) => {
  const isProcessingTurn = useRef(false);
  const skipSignal = useRef<{ resolve: (() => void) | null; isSkipping: boolean }>({ resolve: null, isSkipping: false });
  const justSkipped = useRef(false);

  const stateRef = useRef(useAppStore.getState());
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(newState => {
        stateRef.current = newState;
    });
    return unsubscribe;
  }, []);
  
  const { conversationQueue, isLoading, triggerDiscussion } = useAppStore(s => ({
    conversationQueue: s.game.conversationQueue,
    isLoading: s.isLoading,
    triggerDiscussion: s.game.triggerDiscussion,
  }), shallow);

  const {
      setCurrentSubtitle, logApiUsage, setUiState, setGameState, 
      addMessage, setUserProfile, setActiveParticipants, setIsLoading, setEquippedArtifact
  } = useAppStore.getState();

  const { addMemory } = useMemoryManager();
  const { updateRelationship } = useRelationshipManager();

  const interruptibleSleep = useCallback((duration: number) => {
    return new Promise<void>(resolve => {
      if (!isProcessingTurn.current) {
          resolve();
          return;
      }
      const timeoutId = setTimeout(() => {
        if (skipSignal.current) skipSignal.current.resolve = null;
        resolve();
      }, duration);
      
      skipSignal.current.resolve = () => {
        clearTimeout(timeoutId);
        if (skipSignal.current) skipSignal.current.resolve = null;
        resolve();
      };
    });
  }, []);
  
  const playSubtitles = useCallback(async (message: Message) => {
    if (!isProcessingTurn.current) return;

    const { text, agentId } = message;
    const chunks = splitIntoSentences(text);
    const { subtitleDurationMultiplier, manualSubtitleAdvance } = stateRef.current.game;
    const { ttsEnabled, agentVoices, ttsVolume } = stateRef.current.audio;
    const { elevenLabsApiKey, openAiApiKey, microsoftApiKey, microsoftApiRegion } = stateRef.current.services;
    const isVoiced = ttsEnabled && agentId !== USER_AGENT.id;

    for (let i = 0; i < chunks.length; i++) {
        if (!isProcessingTurn.current) {
            setCurrentSubtitle(null);
            return;
        }

        const subtitleMessage: Message = {
            ...message,
            id: `${message.id}-chunk-${i}`,
            text: chunks[i],
            groundingChunks: i === 0 ? message.groundingChunks : undefined
        };

        setCurrentSubtitle(subtitleMessage);

        rumbleSubtitle();
        audioService.playMessageSound();
        
        const voiceURI = agentVoices[agentId] || null;
        if (isVoiced && voiceURI) {
            if (voiceURI.startsWith('openai:')) logApiUsage({ type: 'tts', provider: 'OpenAI', characters: chunks[i].length });
            else if (voiceURI.startsWith('elevenlabs:')) logApiUsage({ type: 'tts', provider: 'ElevenLabs', characters: chunks[i].length });
            else if (voiceURI.startsWith('microsoft:')) logApiUsage({ type: 'tts', provider: 'Microsoft', characters: chunks[i].length });
        }
        
        if (manualSubtitleAdvance) {
            if (isVoiced) {
                // Play audio but don't await it. The user will advance when ready.
                speechService.speak(chunks[i], voiceURI, ttsVolume, openAiApiKey, elevenLabsApiKey, microsoftApiKey, microsoftApiRegion);
            }
            // Wait for user to skip.
            await new Promise<void>(resolve => {
                skipSignal.current.resolve = () => {
                    speechService.cancel();
                    resolve();
                };
            });
            continue; // Move to the next chunk immediately after user skips.
        }
        
        // --- Automatic Advancement ---
        justSkipped.current = false;
        if (isVoiced) {
            await speechService.speak(chunks[i], voiceURI, ttsVolume, openAiApiKey, elevenLabsApiKey, microsoftApiKey, microsoftApiRegion);
            if (justSkipped.current) continue; // If speech was skipped, move to next chunk immediately.
            
            // Add a short, natural pause between voiced sentences to prevent them from running together.
            if (i < chunks.length - 1) { // Don't pause after the last sentence of a turn.
                 await interruptibleSleep(300);
            }
        } else {
            const duration = (2000 + chunks[i].length * 100) * subtitleDurationMultiplier;
            await interruptibleSleep(duration);
        }

        if (!isProcessingTurn.current) return;
    }

    if (isProcessingTurn.current) {
      setCurrentSubtitle(null);
      await interruptibleSleep(400);
    }
  }, [interruptibleSleep, setCurrentSubtitle, logApiUsage]);

  const cancelCurrentTurn = useCallback(() => {
    isProcessingTurn.current = false;
    speechService.cancel();
    if (skipSignal.current?.resolve) {
      skipSignal.current.resolve();
    }
    setUiState({ thinkingAgentId: null });
    setCurrentSubtitle(null);
  }, [setUiState, setCurrentSubtitle]);
  
  const cancelDiscussion = useCallback(() => {
    cancelCurrentTurn();
    setGameState({ conversationQueue: [], debriefingState: { active: false, roomId: null } });
    setActiveParticipants([]);
    setIsLoading(false);
  }, [cancelCurrentTurn, setGameState, setActiveParticipants, setIsLoading]);

  const skip = useCallback(() => {
    if (skipSignal.current.isSkipping) return;
    skipSignal.current.isSkipping = true;
    setTimeout(() => { if (skipSignal.current) skipSignal.current.isSkipping = false; }, 200); // Debounce
    
    justSkipped.current = true;
    speechService.cancel(); // This will resolve the promise in speak()
    if (skipSignal.current.resolve) {
      skipSignal.current.resolve(); // This resolves promises from interruptibleSleep
    }
  }, []);

  const determineNextSpeakerQueue = useCallback((userText: string, isInitialMessage: boolean): string[] => {
    const { agents: currentAgents } = stateRef.current;
    const player = currentAgents.find(a => a.id === USER_AGENT.id);
    if (!player) return [];

    const participantsInRoom = currentAgents.filter(a => a.roomId === player.roomId && !a.isAnimal && a.id !== USER_AGENT.id);
    
    // --- Turn-taking Logic ---
    // This function determines who speaks next after the user provides input.
    // The logic is prioritized to give the user as much control as possible while
    // maintaining a natural conversation flow.

    // Priority 1: Direct mention. If the user says an agent's name (e.g., "Orwell, what do you think?"),
    // that agent is explicitly chosen to speak next. The user is assumed to be addressing the FIRST agent they name.
    const mentionedAgents = findAllMentionedAgents(userText, participantsInRoom);
    if (mentionedAgents.length > 0) {
        return [mentionedAgents[0].agent.id];
    }
    
    // Priority 2: Moderator. If no one is mentioned, the moderator (if one exists) takes the turn.
    // This creates a structured, interview-style discussion where the moderator guides the conversation.
    const moderator = participantsInRoom.find(a => a.isModerator);
    if (moderator) {
        return [moderator.id];
    }

    // Priority 3: Fallback behaviors based on conversation context.
    if (!isInitialMessage) {
        // If the user interjects in an ongoing, un-moderated chat, the system pauses.
        // This is a key design choice: without a moderator, the user is in charge. We wait
        // for them to direct the conversation to the next speaker.
        return []; 
    } else {
        // For the very first message in a room that has no moderator, we need someone to start.
        // To make it more dynamic, we pick a random agent from the room to kick things off.
        if (participantsInRoom.length > 0) {
            const randomAgent = participantsInRoom[Math.floor(Math.random() * participantsInRoom.length)];
            return [randomAgent.id];
        }
        return [];
    }
  }, []);


  const startDiscussion = useCallback(async (task: string, targetAgentId: string | null, options?: { isItemInteraction?: boolean }) => {
    cancelDiscussion();
    
    if (targetAgentId === 'AK') { // Barry the Barista
        setGameState({ barryMet: true });
    }

    const userMessage: Message = { id: Date.now().toString(), agentId: USER_AGENT.id, text: task, timestamp: Date.now(), isItemInteraction: options?.isItemInteraction };
    
    if (!options?.isItemInteraction) {
      addMessage(userMessage);
    }
    
    const player = stateRef.current.agents.find(a => a.id === USER_AGENT.id);
    if (player?.roomId === 'dojo') {
      if (!stateRef.current.game.dojoChallengeState) {
          setGameState({ 
              dojoChallengeState: { belt: 'white', status: 'initial' }
          });
      }
      setUiState({ isDojoModalOpen: true });
      return; // Dojo has its own modal flow, bypass conversation manager
    }
    
    if (player?.roomId === 'studio') {
        setGameState({
            studioConversationState: {
                turn: 0,
                status: 'agent_turn',
                lastAgentMessage: '',
                sceneTitle: task,
                scriptContent: `TITLE: ${task.toUpperCase()}\n\n`,
            }
        });
    }

    isProcessingTurn.current = true;
    if (!options?.isItemInteraction) {
      await playSubtitles(userMessage);
    }
    isProcessingTurn.current = false;
    
    let turnQueue: string[];
    if (targetAgentId) { // Direct chat always takes precedence
        turnQueue = [targetAgentId];
    } else {
        turnQueue = determineNextSpeakerQueue(task, true);
    }
    
    if (turnQueue.length > 0) {
      setIsLoading(true);
      setGameState({ conversationQueue: turnQueue });
    }
  }, [cancelDiscussion, setGameState, addMessage, setUiState, playSubtitles, determineNextSpeakerQueue, setIsLoading]);

  const interjectInDiscussion = useCallback(async (text: string) => {
    cancelCurrentTurn();
    await sleep(100);

    const userMessage: Message = { id: Date.now().toString(), agentId: USER_AGENT.id, text: text, timestamp: Date.now() };
    addMessage(userMessage);
    
    isProcessingTurn.current = true;
    await playSubtitles(userMessage);
    isProcessingTurn.current = false;

    const turnQueue = determineNextSpeakerQueue(text, false);
    
    setGameState({ conversationQueue: turnQueue });
    if (turnQueue.length > 0) {
        setIsLoading(true);
    } else {
        // If queue is empty, we are pausing, so set loading to false.
        setIsLoading(false);
        setActiveParticipants([]);
    }
  }, [cancelCurrentTurn, addMessage, playSubtitles, determineNextSpeakerQueue, setGameState, setIsLoading, setActiveParticipants]);

  useEffect(() => {
    if (triggerDiscussion) {
        startDiscussion(triggerDiscussion.prompt, triggerDiscussion.targetAgentId);
        setGameState({ triggerDiscussion: null }); // Reset the trigger
    }
  }, [triggerDiscussion, startDiscussion, setGameState]);


  useEffect(() => {
    const processTurn = async () => {
      if (isProcessingTurn.current) return;
      
      const { debriefingState } = stateRef.current.game;
      if (conversationQueue.length === 0 || debriefingState.active) {
        if(isLoading) {
            setIsLoading(false);
            setActiveParticipants([]);
        }
        return;
      }

      isProcessingTurn.current = true;
      const agentId = conversationQueue[0];
      const agent = stateRef.current.agents.find(a => a.id === agentId);
      if (!agent) {
        setGameState({ conversationQueue: conversationQueue.slice(1) });
        isProcessingTurn.current = false;
        return;
      }
      
      if (agent.id === 'TEACH1' && !stateRef.current.game.classroomChallengeState) {
        setGameState({ classroomChallengeState: { status: 'initial', question: '', feedbackCount: 0 } });
      }

      const { messages: currentHistory, agents: currentAgents, game, userProfile } = stateRef.current;
      const player = currentAgents.find(a => a.id === USER_AGENT.id);
      const playerRoomId = player?.roomId;
      const roomConfig = playerRoomId ? ROOMS[playerRoomId] : null;

      if (!roomConfig) {
        isProcessingTurn.current = false;
        cancelDiscussion();
        return;
      }
      
      const { targetAgentId } = stateRef.current.ui;
      const isDirectChat = !!targetAgentId;
      const scenarioPrompt = roomConfig.prompt;
      const movementEnabled = roomConfig.movementEnabled;
      
      const lastMessage = currentHistory[currentHistory.length - 1];
      let subTask = "Start the discussion.";
      if (lastMessage) {
        const lastSpeaker = currentAgents.find(a => a.id === lastMessage.agentId) || { name: 'You' };
        subTask = `${lastSpeaker.name} said: "${lastMessage.text}"`;
      }
      
      setUiState({ thinkingAgentId: agent.id });
      setActiveParticipants([agent]);
      let responseMsg: Message;

      try {
        const { payload: responsePayload, prompt: generatedPrompt, functionCalls } = await getAgentResponse(
            agent, currentHistory, 'ongoing discussion', subTask, scenarioPrompt, movementEnabled, 
            currentAgents, stateRef.current, isDirectChat
        );
        if (!isProcessingTurn.current) return;
        
        if (responsePayload.usage) {
            logApiUsage({ 
                type: 'llm',
                provider: responsePayload.usage.provider,
                model: responsePayload.usage.model,
                promptTokens: responsePayload.usage.promptTokens,
                completionTokens: responsePayload.usage.completionTokens,
            });
        }
        
        if (agent.id === 'TUTOR1' && game.onboardingState === 'needed' && !responsePayload.user_profile) {
            setGameState({ onboardingState: 'in_progress' });
        }
        if (responsePayload.user_profile) {
            setUserProfile(responsePayload.user_profile);
            setGameState({ onboardingState: 'complete' });
            const { name, interests, age } = responsePayload.user_profile;
            if (name) addMemory(agent.id, { description: `The user's name is ${name}.`, type: MemoryType.SEMANTIC, fixedImportance: 8 });
            if (age) addMemory(agent.id, { description: `The user's age is ${age}.`, type: MemoryType.SEMANTIC, fixedImportance: 5 });
            if (interests) addMemory(agent.id, { description: `The user is interested in ${interests}.`, type: MemoryType.SEMANTIC, fixedImportance: 7 });
        }

        const messageId = `${Date.now()}-${agent.id}`;
        setGameState({ agentPromptHistory: { ...game.agentPromptHistory, [agent.id]: [...(game.agentPromptHistory[agent.id] || []), { ...generatedPrompt, messageId, usage: responsePayload.usage }] } });
        
        if (functionCalls && onAgentRelativeMove) {
          functionCalls.forEach(call => {
            if (call.name === 'move' && call.args) {
              const { direction, distance } = call.args;
              if (typeof direction === 'string' && ['up', 'down', 'left', 'right'].includes(direction) && typeof distance === 'number') {
                onAgentRelativeMove(agent.id, direction as 'up' | 'down' | 'left' | 'right', distance);
              }
            }
          });
        }

        let responseText = responsePayload.speech;
        if (responseText.includes('_START_FOLLOWING_')) { responseText = responseText.replace('_START_FOLLOWING_', '').trim(); if (onStartFollowing) onStartFollowing(agent.id); }
        if (responseText.includes('_STOP_FOLLOWING_')) { responseText = responseText.replace('_STOP_FOLLOWING_', '').trim(); if (onStopFollowing) onStopFollowing(agent.id); }
        if (responseText.includes('_WAIT_HERE_')) { responseText = responseText.replace('_WAIT_HERE_', '').trim(); if (onStartWaiting) onStartWaiting(agent.id); }

        if (agent.roomId === 'studio' && game.studioConversationState) {
          const currentScript = game.studioConversationState.scriptContent;
          const separator = (currentScript.endsWith('\n\n') || currentScript.endsWith('\n')) ? '' : '\n\n';
          setGameState({ studioConversationState: { ...game.studioConversationState, scriptContent: currentScript + separator + responseText, turn: game.studioConversationState.turn + 1 } });
        }

        if (agent.id === 'TEACH1' && game.classroomChallengeState?.status === 'initial') {
            const match = responseText.match(/_CHALLENGE_QUESTION:\[(.*?)\]_/);
            if (match && match[1]) {
                responseText = responseText.replace(match[0], match[1]).trim();
                setGameState({ classroomChallengeState: { status: 'question_asked', question: match[1], feedbackCount: 0 } });
            }
        }
        
        if (responseText.includes('_PLAYER_WINS_CHALLENGE_')) {
            responseText = responseText.replace('_PLAYER_WINS_CHALLENGE_', '').trim();
            if (player && player.roomId !== 'outside') onRoomMastered?.(player.roomId);
        }
        
        responseMsg = { id: messageId, agentId: agent.id, text: responseText, timestamp: Date.now(), groundingChunks: responsePayload.groundingChunks, usage: responsePayload.usage };
        addMessage(responseMsg);
        
        if (lastMessage && game.agentAutonomyEnabled) updateRelationship(lastMessage.agentId, agent.id, lastMessage, responseMsg);

        const agentsInRoom = currentAgents.filter(a => a.roomId === playerRoomId && a.id !== agent.id && a.id !== USER_AGENT.id);
        agentsInRoom.forEach(observer => addMemory(observer.id, { description: `${agent.name} said: "${responseText}"`, type: MemoryType.EPISODIC }));

        await playSubtitles(responseMsg);
      } catch (error) {
        console.error(`Error getting response for ${agent.name}:`, error);
        responseMsg = { id: `${Date.now()}-error`, agentId: agent.id, text: `(I'm having trouble thinking right now.)`, timestamp: Date.now() };
        addMessage(responseMsg);
        await playSubtitles(responseMsg);
      } finally {
        if(isProcessingTurn.current) {
            setUiState({ thinkingAgentId: null });

            const lastUserMessage = currentHistory.slice().reverse().find(m => m.agentId === USER_AGENT.id);
            if (isDirectChat && lastUserMessage?.isItemInteraction) {
                setEquippedArtifact(null);
            }
            
            if (isDirectChat) {
                setGameState({ conversationQueue: [] });
            } else {
                const participantsInRoom = currentAgents.filter(a => a.roomId === player?.roomId && !a.isAnimal);
                const moderator = participantsInRoom.find(a => a.isModerator);
                let nextSpeakerId: string | null = null;

                if (moderator && responseMsg.agentId === moderator.id) { // The moderator just spoke
                    const text = responseMsg.text.toLowerCase();
                    const userName = userProfile.name?.toLowerCase() || 'you';
                    
                    if (text.includes(userName) || text.includes(` ${userName}?`)) { // Moderator addressed the user
                        nextSpeakerId = null; // Pause for user input
                    } else { // Moderator addressed another agent
                        const otherAgents = participantsInRoom.filter(a => a.id !== moderator.id && a.id !== USER_AGENT.id);
                        const mentionedAgents = findAllMentionedAgents(responseMsg.text, otherAgents);
                        
                        if (mentionedAgents.length > 0) {
                            // A moderator directs the conversation to the LAST agent mentioned.
                            nextSpeakerId = mentionedAgents[mentionedAgents.length - 1].agent.id;
                        } else {
                            // Moderator asked a general question, so pick another agent to respond.
                            const lastNonModSpeakerId = currentHistory.slice(-5).reverse().find(m => m.agentId !== USER_AGENT.id && m.agentId !== moderator.id)?.agentId;
                            const potentialResponders = otherAgents.filter(a => a.id !== lastNonModSpeakerId);
                            if (potentialResponders.length > 0) {
                                nextSpeakerId = potentialResponders[Math.floor(Math.random() * potentialResponders.length)].id;
                            } else if (otherAgents.length > 0) {
                                nextSpeakerId = otherAgents[0].id;
                            }
                        }
                    }
                } else if (moderator) { // A non-moderator just spoke, so pass turn to the moderator
                    nextSpeakerId = moderator.id;
                } else { // No moderator, so pause for the user after every agent's turn
                    nextSpeakerId = null;
                }
                
                if (nextSpeakerId) {
                    setGameState({ conversationQueue: [nextSpeakerId] });
                } else {
                    setGameState({ conversationQueue: [] });
                }
            }

            if (stateRef.current.game.conversationQueue.length === 0) {
                setIsLoading(false);
                setActiveParticipants([]);
            }
            isProcessingTurn.current = false;
        }
      }
    };
    
    processTurn();

  }, [conversationQueue, isLoading, playSubtitles, onAgentRelativeMove, onRoomMastered, onStartFollowing, onStopFollowing, onStartWaiting, addMemory, updateRelationship, setIsLoading, setActiveParticipants, setGameState, setUiState, cancelDiscussion, addMessage, logApiUsage, setUserProfile, setEquippedArtifact]);
  

  return { startDiscussion, interjectInDiscussion, cancelDiscussion, skip };
};