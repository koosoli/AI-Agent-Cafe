import { Agent, LLMProvider } from './types';

export const USER_AGENT: Agent = {
  id: 'user',
  name: 'You',
  useModelAsName: false,
  persona: 'The user who provides the discussion topic.',
  llm: { provider: LLMProvider.GEMINI, model: '' },
  position: { top: 1060, left: 600 }, // Spawn centered in the cafe doorway
  spriteSeed: 'Izzy',
  isModerator: false,
  roomId: 'cafe',
  followingAgentId: null,
  memoryStream: [],
  relationships: {},
};

export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-light',
  'gemini-2-flash',
  'gemini-2-flash-light',
  'gemma-3-9b',
  'gemma-3-27b',
];

export const IMAGEN_MODELS = ['imagen-3.0-generate-002'];

export const OPENAI_IMAGE_MODELS = ['dall-e-3'];