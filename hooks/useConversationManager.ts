
import { useState, useCallback, useRef } from 'react';
import { getAgentResponse } from '../services/llmService';
import type { Agent, Message, Scenario, AgentMoveAction } from '../types';
import { USER_AGENT } from '../constants';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  // Split by sentences, keeping the delimiter.
  const chunks = text.match(/[^.!?]+[.!?]*|[^.!?]+$/g) || [];
  return chunks.map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
};

interface ConversationManagerOptions {
    agents: Agent[];
    scenario: Scenario;
    onAgentMove?: (agentId: string, action: AgentMoveAction) => void;
}


export const useConversationManager = ({ agents, scenario, onAgentMove }: ConversationManagerOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<Message | null>(null);
  const discussionCancelled = useRef(false);

  const cancelDiscussion = useCallback(() => {
    discussionCancelled.current = true;
  }, []);

  const playSubtitles = async (text: string, agentId: string, isConclusion: boolean = false) => {
    const chunks = splitIntoSentences(text);
    for (const chunk of chunks) {
      if (discussionCancelled.current) return;
      setCurrentSubtitle({
        id: `${Date.now()}-${Math.random()}`,
        agentId,
        text: chunk,
        timestamp: Date.now(),
        isConclusion,
      });
      // Wait for a bit, proportional to the length of the chunk
      await sleep(1000 + chunk.length * 40);
      if (discussionCancelled.current) return;
    }
    if (discussionCancelled.current) return;
    setCurrentSubtitle(null); // Clear bubble after last chunk
    await sleep(400); // Pause before next speaker
  };

  const startDiscussion = useCallback(async (task: string) => {
    discussionCancelled.current = false;
    setIsLoading(true);
    setCurrentSubtitle(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      agentId: USER_AGENT.id,
      text: task,
      timestamp: Date.now(),
    };
    // Append to history instead of replacing
    setMessages(prev => [...prev, userMessage]);
    await playSubtitles(task, USER_AGENT.id);
    if (discussionCancelled.current) { setIsLoading(false); return; }

    let currentHistory: Message[] = [...messages, userMessage];
    const participants = agents.filter(a => a.id !== USER_AGENT.id);

    const processAgentTurn = async (agent: Agent, subTask: string) => {
        const responsePayload = await getAgentResponse(agent, currentHistory, task, subTask, scenario, agents);
        if (discussionCancelled.current) return null;
        
        if (responsePayload.move && onAgentMove) {
            onAgentMove(agent.id, responsePayload.move);
        }

        const responseText = responsePayload.speech;
        const responseMsg: Message = { id: `${Date.now()}-${agent.id}`, agentId: agent.id, text: responseText, timestamp: Date.now() };
        currentHistory.push(responseMsg);
        setMessages(prev => [...prev, responseMsg]);
        await playSubtitles(responseText, agent.id);
        return responseText;
    };

    // Check for @mention
    const mentionRegex = /^@(\w+)\s*(.*)/s;
    const mentionMatch = task.match(mentionRegex);
    if (mentionMatch) {
        const agentName = mentionMatch[1];
        const directQuestion = mentionMatch[2];
        const targetAgent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
        if (targetAgent) {
            const subTask = `The user is asking you directly: "${directQuestion}". Respond to them based on your persona.`;
            await processAgentTurn(targetAgent, subTask);
        }
        setIsLoading(false);
        return;
    }

    const moderator = participants.find(a => a.isModerator);
    
    // Moderator-led flow
    if (moderator) {
      const nonModerators = participants.filter(a => a.id !== moderator.id);
      for (let i = 0; i < nonModerators.length; i++) {
          if (discussionCancelled.current) { setIsLoading(false); return; }
          const currentParticipant = nonModerators[i];
          const moderatorQuestionSubTask = `You are the moderator. Your task is to pose a question to ${currentParticipant.name} (${currentParticipant.persona}) to get their opinion on the main topic.`;
          
          const moderatorQuestionText = await processAgentTurn(moderator, moderatorQuestionSubTask);
          if (discussionCancelled.current || !moderatorQuestionText) { setIsLoading(false); return; }


          const participantAnswerSubTask = `The moderator has just asked you: "${moderatorQuestionText}". Provide your direct response based on your persona.`;
          await processAgentTurn(currentParticipant, participantAnswerSubTask);
          if (discussionCancelled.current) { setIsLoading(false); return; }
      }
    } else { // No moderator, round-robin flow
        for (let i = 0; i < participants.length; i++) {
            if (discussionCancelled.current) { setIsLoading(false); return; }
            const currentParticipant = participants[i];
            const prevMessage = currentHistory[currentHistory.length - 1];
            const prevAgent = agents.find(a => a.id === prevMessage.agentId);
            const subTask = i === 0 
                ? `Based on your persona, provide your opening thoughts on the topic.`
                : `The previous speaker (${prevAgent?.name}) said: "${prevMessage.text}". Respond to this, keeping the main topic and your persona in mind.`;
            
            await processAgentTurn(currentParticipant, subTask);
            if (discussionCancelled.current) { setIsLoading(false); return; }
        }
    }
    
    // Generate conclusion
    if (discussionCancelled.current) { setIsLoading(false); return; }
    await sleep(1000);
    const summarizer = moderator || participants[participants.length - 1];
    if (summarizer) {
        const conclusionSubTask = "The discussion has concluded. Your final task is to summarize the key points from all participants and present a concise final conclusion for the user.";
        const conclusionPayload = await getAgentResponse(summarizer, currentHistory, task, conclusionSubTask, scenario, agents);
        if (discussionCancelled.current) { setIsLoading(false); return; }
        
        if (conclusionPayload.move && onAgentMove) {
            onAgentMove(summarizer.id, conclusionPayload.move);
        }
        const conclusionText = conclusionPayload.speech;

        const conclusionMessage: Message = {
            id: `${Date.now()}-conclusion`,
            agentId: summarizer.id,
            text: conclusionText,
            timestamp: Date.now(),
            isConclusion: true,
        };
        setMessages(prev => [...prev, conclusionMessage]);
        await playSubtitles(conclusionText, summarizer.id, true);
    }

    setIsLoading(false);
  }, [agents, messages, scenario, onAgentMove]);

  return { messages, isLoading, currentSubtitle, startDiscussion, cancelDiscussion };
};
