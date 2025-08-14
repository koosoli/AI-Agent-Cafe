# AI Agent Cafe

Welcome to the AI Agent Cafe, a dynamic and interactive web application where you can create, configure, and observe AI agents as they discuss topics you provide. Set the stage by literally walking into different rooms, assign unique personas, and watch as these digital minds collaborate, debate, and create in a charming pixel-art world.

This entire project is **Vibe Coded** by Olivier Koos. The code, pixel art, sound effects, and music are all generated with the assistance AI tools, showcasing a modern and rapid approach to application development.

![AI Agent Cafe Screenshot](https://raw.githubusercontent.com/koosoli/AI-Agent-Cafe/main/public/screenshot.png)

## The Game: Mastering the Rooms

While the AI Agent Cafe is a powerful sandbox, it's also a game. Your primary objective is to **master every room in the game**.

Each room—from the Tech Office to the Philo Cafe—poses a unique intellectual challenge related to its theme. The AI agents who inhabit the room act as its guardians and judges. To master a room, you must engage the agents in a discussion and provide a prompt so insightful, a solution so elegant, or an argument so compelling that they are collectively impressed.

If you succeed, the agents themselves will acknowledge your intellectual victory in the conversation, and you will be rewarded with a **Mastery Star** for that room. Track your progress with the star display in the header or get details from the **Objective Tracker**, accessible from the main menu. Mastering all rooms will unlock the simulation's final secret and reveal its true purpose. Can you master them all and meet The Architect?

## Sandbox & World Features

To help you tackle the challenges and experiment freely, the world is equipped with a rich set of sandbox features:

-   **Dynamic AI Conversations:** Initiate real-time discussions. Watch agents build on each other's points as they explore topics.
-   **Voice-Enabled Interaction:**
    -   **Text-to-Speech (TTS):** Hear agents speak their responses aloud. This feature is disabled by default and can be enabled in the Settings menu. Each agent can be assigned a unique voice from your browser's available options or from **OpenAI**, **ElevenLabs**, and **Microsoft Azure** if you provide the appropriate API keys.
    -   **Speech-to-Text (STT):** Click the microphone icon or press the 'Y' / '△' button on a gamepad to dictate your prompts with your voice.
-   **Interactive Objects & Challenges:**
    -   **The Dojo of Alignment:** Learn the fundamentals of AI alignment in a zen garden setting. Instead of fighting, you must "tune" the AI Sensei's core values (like Helpfulness, Honesty, and Safety) using a set of interactive sliders. The Sensei will present you with various scenarios, and your goal is to adjust its neural weights to produce a wise and well-aligned response.
    -   **The D&D Game Board (Dungeon Room):** The ultimate role-playing challenge. Interact with the glowing game board to launch a mini D&D session. You'll create a character and play through a short, dynamic adventure narrated by the Dungeon Master agent. The Knight and Rogue agents join your party, reacting to your choices. To master this room, you must impress the DM with creative, in-character decisions that drive the story forward.
    -   **The Art Easel (Art Studio):** Collaborate with generative AI to create images. Use the large, glowing easel to enter a prompt. The resident master artists will then critique your prompt, offering feedback. To master this room, you must take their criticism and refine your prompt, demonstrating true human-AI collaboration.
    -   **The Grounding Terminal (Library):** The historical authors in the library don't know about recent events. Use this glowing terminal to perform Google Search-grounded lookups for factual, up-to-date information, complete with sources. This teaches the difference between creative generation and factual retrieval.
    -   **The Vibe-Coding Terminal (Tech Office):** Master the art of rapid prototyping by giving this terminal a high-level "vibe" for a UI component (e.g., "a cool retro button that glows"). It will generate the HTML, CSS, and JS, showing it in a live preview.
    -   **Iterative Screenwriting (Writer's Studio):** The challenge here is a multi-turn collaboration. The AI director sets a scene, you add a detail, the AI writers build on your idea, and the cycle continues. Master this room by successfully contributing to the creative process over several rounds.
-   **Consolidated Header Menu:** Access all major tools like the **Objective Tracker**, **Social Graph**, **Inventory**, **Chat Log**, and **Settings** from a single, clean menu in the top-right header.
-   **Interactive Social Graph:** Visualize the complex web of relationships in your simulation. Open the graph from the header to see a player-centric view of all agents. **Click on any agent (including yourself) to see their direct connections**—green for friendship, red for rivalry. Drag nodes around to untangle the view and better understand the social dynamics at play.
-   **Intelligent Moderation & Turn-Taking:** You have full control over the conversation. Mention an agent by name in your message to direct the next turn to them. The system is designed to intelligently parse your input, correctly identifying the first agent you address even in complex sentences with minor typos (e.g., in "Shakespear, what did Orwell say?", it will correctly identify Shakespeare as the next speaker). If you don't mention anyone, a designated `moderator` will facilitate a structured discussion. When a moderator speaks, the system intelligently identifies the *last* agent they mention as the one being addressed, allowing for natural, directed questions. The system uses a **reactive turn-taking** model; when an agent asks you a question, the conversation **pauses automatically**, waiting for your input.
-   **Physical Scenario Selection:** The context of your conversation is determined by your character's location. Walk into the **Tech Office** to discuss a coding project, the **Writer's Studio** to brainstorm a script, or **Skynet's Lair** to debate the future of humanity.
-   **Proximity Chat:** The world reacts to your position. Walk close to a single agent to target them for a direct, one-on-one chat. To start a group discussion with all agents in the current room, stand in an open area where no single agent is highlighted.
-   **Living World:** A detailed world map with interactive elements.
    -   Characters use doors to enter buildings and respect physical obstacles.
    -   Unassigned agents wander the streets, making the world feel alive.
    -   Move your character with **Arrow Keys** or **WASD**, and hold **Shift** to run.
    -   Atmospheric, room-specific background music that changes as you explore.
-   **Direct Agent Management:**
    -   **Add New Agents:** Click the pulsing `+` button inside any room to create and add a new custom agent on the spot.
    -   **Double-Click to Edit:** Instantly open the settings panel for any agent by double-clicking them.
    -   **Drag and Drop:** Click and drag agents to reposition them, even between different rooms. An agent's behavior and conversational context will change based on their new environment.
    -   **Delete by Trash:** Drag an agent to the trash can area to permanently remove them.
-   **Multiple LLM Providers:** Seamlessly integrates with Google Gemini, OpenAI, OpenRouter, and local or custom OpenAI-compatible servers (like Ollama or Groq).
-   **Centralized API Keys:** Enter your API keys for OpenAI, OpenRouter, ElevenLabs, and Microsoft Azure *once* in the main Settings panel. All agents can then use these models without individual configuration.
-   **Rich Audio Experience:** Immersive background music and sound effects with full volume controls.
-   **Import/Export:** Save your entire session (agents, chat log, and mastery progress) or just your agent list to a JSON file. Share your creations or load them back into the game later.

## 🚀 Installation and Setup

To run the AI Agent Cafe locally, you'll need to have Node.js and npm (or yarn) installed.

### 1. Clone the Repository

```bash
git clone https://github.com/koosoli/AI-Agent-Cafe.git
cd AI-Agent-Cafe
```

### 2. Install Dependencies

This command reads the `package.json` file and installs all necessary project dependencies, including the Vite development server and testing libraries.

```bash
npm install
# or
yarn install
```

### 3. Set Up API Keys

Create a .env.local file in the root directory of the project.
Add your Google Gemini API Key. You can get one from Google AI Studio. The application is configured to read the `API_KEY` environment variable.
```
# .env.local
API_KEY="YOUR_GEMINI_API_KEY_HERE"
```
For OpenAI, OpenRouter, ElevenLabs, and Microsoft Azure keys: These are configured directly within the application's **Settings modal**. You only need to enter them once. You do not need to put them in the .env.local file.

### 4. Alternative AI Endpoints

The AI Agent Cafe supports using alternative LLM providers that expose an OpenAI-compatible API endpoint.

#### Local AI Server (Key-less)
This is for servers running on your local machine, like [Ollama](https://ollama.com/) or [LM Studio](https://lmstudio.ai/).

1.  **Run Your Local Server:** Start your local LLM server and ensure you have downloaded the models you want to use (e.g., `ollama pull llama3`).

2.  **Configure in Settings:**
    *   Open the **Settings** modal in the AI Agent Cafe.
    *   Go to the **General** tab -> **Alternative AI Endpoints**.
    *   In the **Local AI Server** section, enter the base URL for your server's API. Common defaults are:
        *   **Ollama:** `http://localhost:11434/v1`
        *   **LM Studio:** `http://localhost:1234/v1`
    *   Use the "Test" button to verify the connection.

3.  **Assign to an Agent:**
    *   In the **Agents** tab of the Settings modal, edit an agent.
    *   Change the **AI Provider** to `Local AI Server`.
    *   In the **Model** field, type the exact name of the model as your local server knows it (e.g., `llama3:instruct`, `gemma:2b`).

#### Custom AI Server (With Key)
This is for cloud providers or self-hosted models that require an API key, like Groq, NVIDIA NIM, or a custom TGI instance.

1. **Configure in Settings:**
    * Go to the **General** tab -> **Alternative AI Endpoints**.
    * In the **Custom AI Server** section, enter the full **Server URL** (including `/v1`) and the required **API Key**.
    * You must also provide a valid **Test Model Name** to verify the connection.
2. **Assign to an Agent:**
    * In the agent editor, change the **AI Provider** to `Custom (OpenAI-compatible)`.
    * Enter the desired model name.

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

The application should now be running on `http://localhost:5173` (or another port if 5173 is busy).

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a new feature, or improving documentation, your help is appreciated.

Before you start, please take a moment to read our **[Coding Guidelines](./CODING_GUIDELINES.md)**. This document outlines the architectural patterns, state management principles (using Zustand), and best practices we follow to keep the codebase clean, performant, and maintainable. Adhering to these guidelines is crucial for a smooth contribution process.

## 🔧 Codebase Overview

The project is structured to separate concerns, making it easier to extend.

-   `src/components/`: Contains all the React components that make up the UI.
    -   `World.tsx`: Renders the main 2D environment, including the scenery, rooms, furniture, and agents.
    -   `Character.tsx`: Renders an individual agent's sprite and speech bubble.
    -   `SettingsModal.tsx`: The main configuration panel for agents, audio, and global API keys.
    -   `GroundingComputerModal.tsx`, `VibeCodingModal.tsx`, `DojoAlignmentModal.tsx`: Special UI windows for interactive objects and challenges.
-   `src/services/`: Core application logic decoupled from the UI.
    -   `llmService.ts`: Handles all interactions with the external LLM APIs (Gemini, OpenAI, OpenRouter, Local).
    -   `promptBuilderService.ts`: A dedicated class for constructing the complex system prompts sent to the LLM.
    -   `memoryService.ts`: Core logic for memory retrieval, importance rating, and reflection synthesis.
    -   `audioService.ts`: Manages all audio playback, including room-specific tracks.
    -   `speechService.ts`: Manages Text-to-Speech and Speech-to-Text functionality.
    -   `collisionService.ts`: Defines the geometry of the world's walls, doors, obstacles, and room zones.
    -   `spatialService.ts`: Implements a spatial grid to efficiently query for nearby agents, optimizing performance.
    -   `gamepadService.ts`: Centralizes gamepad interactions like haptic feedback (rumble).
-   `src/data/`: Centralized static data for the application.
    -   `agents.ts`: Default agent configurations.
    -   `personas.ts`: Pre-written persona templates and challenge data.
    -   `rooms.ts`: Definitions for all rooms, including their prompts and music.
    -   `gameConfig.ts`: Centralized tuning parameters for game mechanics (e.g., player speed, AI behavior).
    -   `layout.ts`: Defines the precise coordinates for all zones, obstacles, and interactive objects in the world.
    -   `activities.ts`: Maps agents to their preferred autonomous activities and the objects they use.
-   `src/hooks/`: Custom React hooks for managing complex state and logic.
    -   `useAppContext.ts`: The single Zustand store definition and all state actions. This is the heart of the application.
    -   `useConversationManager.ts`: Orchestrates the entire discussion flow, including turn-taking and subtitle playback.
    -   `useMemoryManager.ts`: A client-side "Meta-Manager" that handles adding, processing, and reflecting on agent memories.
    -   `useAgentMotivation.ts`: Manages the high-level decision-making for autonomous agents, including the "gossip" and "rumor" system.
    -   `useAgentBehavior.ts`: The main "game loop" for AI agents, handling movement, task execution (like walking to a target), and avoidance.
    -   `usePlayerMovement.ts`: Handles keyboard and gamepad input for moving the player character.
    -   `useInputManager.ts`: Centralizes all mouse, touch, and keyboard interactions with the main world view, including panning, dragging, and clicking.
    -   `useViewportManager.ts`: Manages the camera/viewport, handling automatic following, panning, and zoom-to-cursor logic.
    -   `useRelationshipManager.ts`: Analyzes conversations to dynamically update the social scores between agents.
    -   `useAutonomousCreator.ts`: Manages the logic for when an autonomous agent decides to create an artifact, like a painting.
-   `src/types.ts`: Contains all TypeScript type definitions.
-   `public/`: Contains all static assets, including sound files.
-   `index.html` & `index.tsx`: The entry point of the React application.

### How It Works: Cognitive & Social Architecture

When it is an agent's turn to speak, the system uses a sophisticated, multi-step process to generate a contextually-aware response. This architecture is heavily inspired by two seminal works in agent-based AI: **[Generative Agents](https://arxiv.org/abs/2304.03442)** by Park, et al. and **[MIRIX](https://arxiv.org/abs/2407.07957)** by Wang & Chen. It's composed of two main layers: the individual **Cognitive Layer** and a world-level **Social Layer**.

#### 1. The Cognitive Layer: An Agent's Private Mind (MIRIX-inspired)

Each agent possesses a private **Memory Stream** based on the MIRIX architecture, containing six distinct types of memories:
*   **Core:** The agent's fundamental identity and persona. Always in context.
*   **Episodic:** A log of events that happened (e.g., "Barry entered the room," or "I heard from Barry that...").
*   **Semantic:** Higher-level insights and learned facts (e.g., "The user is interested in philosophy"). These are automatically organized into a hierarchical knowledge graph.
*   **Procedural:** Step-by-step guides on how to do things.
*   **Resource:** The content of in-game "documents" or artifacts.
*   **Knowledge Vault:** Precise, verbatim information that must not be altered.

When an agent needs to think, it performs an **Active Retrieval Loop**:
1.  **Topic Generation:** It first generates a concise **search topic** based on the last message (e.g., "user's opinion on AI safety").
2.  **Salience-Based Retrieval:** It then queries its *entire* memory stream, scoring memories based on **Recency**, **Importance** (a 0-9 rating of how poignant the memory is), and **Relevance** (semantic similarity to the topic).
3.  **Context Injection:** The most salient memories are injected into the final prompt for the LLM, clearly marked with tags like `<semantic_memory>...</semantic_memory>`. This tells the LLM *why* a piece of information is relevant.
4.  **Social Awareness:** The prompt also includes a list of all participants in the current conversation, so the agent knows *who* it is talking to and can differentiate between user input and another agent's comments.

#### 2. The Social Layer: Reflection and Emergent Behavior (Generative Agents-inspired)

The world is made more dynamic through a social simulation inspired by the Generative Agents paper:

*   **Reflection and Synthesis:** Agents periodically "reflect" on recent memories to synthesize new, higher-level **Semantic** memories (insights), allowing them to learn and evolve. This is the core mechanism for abstract thought.
*   **Localized Knowledge:** Information you share with an agent is stored **only in that agent's private memory stream**. There is no global "user profile" that everyone can see.
*   **Gossip Simulation:** Periodically, agents who are in the same room will have a simulated background chat. During this "gossip," one agent may share an important memory with another. This creates a new `Episodic` memory for the receiving agent (e.g., "I heard from Barry that the user mastered the Dojo.").
*   **Dynamic Relationships:** Agent relationships aren't static. When one agent responds to another, the system performs a quick analysis to determine if the response indicates agreement or disagreement. This analysis then slightly increases or decreases the relationship score between them, allowing friendships and rivalries to emerge organically from conversation.

**Note on Agent Autonomy:** The most computationally intensive features of the social layer—**Reflection and Synthesis** and the LLM-based analysis for **Dynamic Relationships**—are part of an optional **Agent Autonomy** setting. This can be enabled in the *Settings > Agents* tab. By default, it is disabled to provide a more lightweight, token-efficient experience, with agents primarily reacting to direct user interaction.

## 📜 License

This project is licensed under the **GNU General Public License v3.0**.

The GPL is a copyleft license, which means that any derivative work must also be licensed under the GPL. You are free to use, modify, and distribute this software, but you must also share your changes under the same license. For more details, see the [LICENSE](https://www.gnu.org/licenses/gpl-3.0.en.html) file.