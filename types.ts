
export enum LLMProvider {
  GEMINI = 'Google Gemini',
  OPENAI = 'OpenAI',
  OPENROUTER = 'OpenRouter',
}

export interface Agent {
  id: string;
  name: string;
  useModelAsName: boolean;
  persona: string;
  personaTemplateId?: string;
  isModerator?: boolean;
  llm: {
    provider: LLMProvider;
    apiKey: string;
    model: string;
  };
  position: {
    top: number; // Changed to number for calculations
    left: number; // Changed to number for calculations
  };
  spriteSeed: string;
}

export interface Message {
  id: string;
  agentId: string;
  text: string;
  timestamp: number;
  isConclusion?: boolean;
}

export enum ScenarioType {
  CAFE = 'AI Cafe Discussion',
  PHILO_CAFE = 'Philo Cafe',
  ROLE_PLAY = 'Role-Play Scenario',
  CODING_PROJECT = 'Coding Project',
  SCREENWRITING = 'Screenwriting Session',
  CUSTOM = 'Custom Scenario',
}

export interface Scenario {
  type: ScenarioType;
  prompt: string;
  scenarioTemplateId?: string;
  movementEnabled?: boolean;
}

export interface AgentMoveAction {
  action: 'move';
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number; // in pixels
}

export interface AgentResponsePayload {
  speech: string;
  move?: AgentMoveAction;
}