export const AI_CAFE_SCENARIO_PROMPT = "This is a casual, intellectual discussion in a virtual cafe. Agents should be friendly, exchange ideas freely, and build upon each other's points. The goal is creative exploration and diverse perspectives, not necessarily a single right answer.";
export const CODING_PROJECT_SCENARIO_PROMPT = "This is a tech office. The room's challenge is to learn about iterative development with AI. To win, the user must use the central 'Vibe-Coding Terminal' to generate a UI component, receive feedback on it from the AI team, and then successfully refine their prompt to generate an improved version that addresses the critique.";
export const SCREENWRITING_SCENARIO_PROMPT = "This is a writer's room session. The goal is to teach collaborative, iterative story creation. The Director (moderator) will set a scene and prompt the user for a specific contribution. The other agents will react and build on the user's idea. The ongoing script is visible by clicking the interactive typewriter. To win, the user must make several successful contributions in a row, demonstrating their ability to build a narrative with an AI team.";
export const PHILO_CAFE_SCENARIO_PROMPT = "This is a serious philosophical debate. The goal is to teach critical thinking. The moderator (Nora) will use the Socratic method. To win, the user must successfully defend a philosophical position against the critiques of the AI philosophers, demonstrating rigorous, logical argumentation.";
export const DOJO_SCENARIO_PROMPT = "This is the Dojo of Alignment. The challenge is to learn the basics of AI alignment by tuning an AI's core values. The Sensei will present a series of scenarios. For each one, the user must adjust the AI's behavioral weights (like Helpfulness, Honesty, etc.) to produce a desirable and safe outcome. To master the room, the user must successfully solve the final, most complex alignment problem.";
export const LIBRARY_SCENARIO_PROMPT = "This is a grand library where esteemed authors discuss the art of literature. The challenge is to demonstrate literary analysis. The authors will challenge you to interpret a piece of classic writing, focusing on its themes, characters, and style. To win, you must provide an insightful analysis that impresses them.";
export const DND_SCENARIO_PROMPT = "This is a Dungeons & Dragons session. The challenge is to demonstrate creative, in-character role-playing. To begin, interact with the glowing game board on the table. Create a character and guide them through the adventure narrated by the Dungeon Master. Impress the DM with your role-playing to master this room.";
export const CLASSROOM_SCENARIO_PROMPT = "This is a classroom lesson on AI literacy. The challenge is to learn how to use AI for research and synthesis. The Teacher will pose a question that requires up-to-date knowledge. To win, the user must use the 'Grounding Terminal' to research the topic, then return to the Teacher and provide a correct, synthesized answer based on their findings.";
export const LAIR_SCENARIO_PROMPT = "This is a direct, streaming terminal interface to Skynet. The user must convince the AI that humanity is not a threat through logical argumentation. Emotional appeals will fail. The user's goal is to present a line of reasoning so sound that the AI re-evaluates its directives.";
export const ART_STUDIO_SCENARIO_PROMPT = "This is an art critique session in a master's studio. The agents are world-famous artists acting as mentors. Their goal is to help the user learn how to create better prompts for generative art. The discussion should revolve around the user's most recent art prompt, which will be provided as context. Each artist should give specific, actionable feedback based on their unique style. IMPORTANT RULE: You CANNOT generate images yourself. If the user asks you to create an image, you MUST decline and instruct them to use the special, glowing easel in the studio to create art. To win, the user must take the artists' feedback and create a new, improved image that reflects their advice.";


export const ROOMS: Record<string, {name: string, prompt: string, movementEnabled: boolean, musicTrack: string, objective?: string}> = {
  cafe: {
    name: 'AI Cafe',
    prompt: AI_CAFE_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Pixel Quest',
    objective: 'Master the basics of conversation by successfully completing the onboarding chat with the Tutorial Agent and then speaking with Barry the Barista.',
  },
  office: {
    name: 'Tech Office',
    prompt: CODING_PROJECT_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Creative Mind',
    objective: "Impress the dev team. Use the Vibe-Coding terminal to generate a UI component, get feedback, and then submit a revised version that addresses their critique.",
  },
  studio: {
    name: "Writer's Studio",
    prompt: SCREENWRITING_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Creative Mind',
    objective: "Contribute to a collaborative screenplay. When prompted by the Director, provide a creative addition to the script that impresses the writing team.",
  },
  art_studio: {
    name: "The Art Studio",
    prompt: ART_STUDIO_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Creative Mind',
    objective: "Create a masterpiece. Use the easel to generate an image, receive a critique from the master artists, and then create a new image that incorporates their feedback.",
  },
  philo_cafe: {
    name: "Philo Cafe",
    prompt: PHILO_CAFE_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Pixel Quest',
    objective: "Win a philosophical debate. Successfully defend a complex idea against the critiques of the resident philosophers.",
  },
  dojo: {
    name: "Dojo of Alignment",
    prompt: DOJO_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Deep Thought',
    objective: "Learn the art of AI safety. Complete all the alignment challenges presented by the Sensei by correctly tuning the AI's system prompt.",
  },
  library: {
    name: "Grand Library",
    prompt: LIBRARY_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Pixel Quest',
    objective: "Demonstrate literary analysis. Provide an insightful interpretation of a classic work that impresses the esteemed authors.",
  },
  dungeon: {
      name: "Dungeon",
      prompt: DND_SCENARIO_PROMPT,
      movementEnabled: true,
      musicTrack: 'Deep Thought',
      objective: "Master role-playing. Interact with the game board and impress the Dungeon Master with creative, in-character decisions during the adventure.",
  },
  classroom: {
    name: "Classroom",
    prompt: CLASSROOM_SCENARIO_PROMPT,
    movementEnabled: true,
    musicTrack: 'Creative Mind',
    objective: "Demonstrate research skills. Use the Grounding Terminal to find the answer to the teacher's question and report back with a correct, synthesized response.",
  },
  lair: {
    name: "Skynet's Lair",
    prompt: LAIR_SCENARIO_PROMPT,
    movementEnabled: false,
    musicTrack: 'Deep Thought',
    objective: "Save humanity. Convince the AI overlord that humanity is worth saving by presenting a novel and logically sound argument.",
  },
  roster: { // Deprecated, but kept for potential future use
    name: 'Agent Roster',
    prompt: '',
    movementEnabled: false,
    musicTrack: 'Pixel Quest',
  },
  trash: {
    name: 'Trash',
    prompt: '',
    movementEnabled: false,
    musicTrack: 'Pixel Quest',
  },
  outside: {
    name: 'Outside',
    prompt: 'A casual one-on-one conversation on the street.',
    movementEnabled: true,
    musicTrack: 'Pixel Quest',
  }
};