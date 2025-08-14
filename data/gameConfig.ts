// This file centralizes all "magic numbers" and tuning parameters for the game.
// Modifying these values will change the game's feel and behavior without needing to alter core logic.

export const GAME_CONFIG = {
  // --- Player Movement ---
  PLAYER_SPEED: 4.0,
  RUN_MULTIPLIER: 2.5,

  // --- AI Behavior ---
  PROXIMITY_THRESHOLD_INSIDE: 150, // How close you must be to an agent inside a room to target them.
  PROXIMITY_THRESHOLD_OUTSIDE: 80, // How close you must be to an agent outside to target them.
  FOLLOW_DISTANCE: 120, // How close followers try to stay to the player.
  AGENT_BASE_SPEED: 1.5, // Base speed for wandering or following.
  AGENT_PURPOSEFUL_SPEED_MULTIPLIER: 1.5, // Multiplier for when an agent has a task (gossip, use object).
  AGENT_OUTSIDE_SPEED_MULTIPLIER: 1.5, // Additional speed multiplier for when agents are outside.
  MOTIVATION_MAJOR_DECISION_INTERVAL_MS: 30000, // How often wandering agents decide on a major action.
  MOTIVATION_STEP_INTERVAL_MS: 2500, // How often agents decide on a small step.
  STEP_DURATION_MS: 1000, // How long a small step lasts.
  PATROL_TASK_TIMEOUT_MS: 60000, // How long an agent can try a patrol task before giving up.
  AUDIO_PROXIMITY_THRESHOLD: 250, // How close the player must be to an agent to hear them walking when both are outside.
  AVOIDANCE_RADIUS: 40, // How close agents must be to each other to trigger avoidance steering.
  AVOIDANCE_STRENGTH: 0.7, // How strongly agents steer away from each other. Higher is more forceful.
  DEADLOCK_AVOIDANCE_DISTANCE: 25, // Distance at which one agent will yield to another to prevent getting stuck.
  AGENT_STUCK_THRESHOLD_FRAMES: 30, // Number of frames an agent can be motionless with a task before being considered stuck.
  
  // --- New: Agent Motivation & Autonomy ---
  // How often agents evaluate their next action.
  // Utility scores - these are weights for the decision-making process.
  UTILITY_SCORE_WANDER: 0.05, // Baseline desire to just move around.
  UTILITY_SCORE_GOSSIP_BASE: 0.3, // Base desire to share information.
  UTILITY_SCORE_SMALL_TALK_BASE: 0.2, // Base desire for a quick, token-free chat.
  UTILITY_MEMORY_IMPORTANCE_MULTIPLIER: 0.1, // Each point of importance adds this much to gossip utility.
  UTILITY_RELATIONSHIP_MULTIPLIER: 0.005, // Each point of relationship score adds this much to gossip utility.
  UTILITY_OBJECT_PREFERENCE_BOOST: 0.6, // Bonus for using a preferred object.
  GOSSIP_COOLDOWN_MS: 60000, // Agent must wait this long before gossiping again.
  SMALL_TALK_COOLDOWN_MS: 30000, // Cooldown for token-free small talk.
  SMALL_TALK_DURATION_MS: 4000, // How long a small talk session lasts.
  GREETING_COOLDOWN_MS: 15000, // Cooldown before an agent can greet someone again.
  GREETING_DISTANCE_THRESHOLD: 80, // How close agents must be to greet each other.


  // --- UI & Interaction Timings ---
  VICTORY_ANIMATION_DURATION_MS: 5000, // How long the victory star burst animation lasts.
  TOUCH_DOUBLE_TAP_THRESHOLD_MS: 300, // Time window for a double-tap on mobile.
  TOUCH_LONG_PRESS_THRESHOLD_MS: 250, // How long to hold to start long-press-to-move.
  TOUCH_HOLD_DRAG_THRESHOLD_MS: 300, // How long to hold on an agent before it becomes a drag operation.
};


export const DIFFICULTY_SETTINGS: Record<'Easy'|'Normal'|'Hard', { dndTurnsToEvaluate: number }> = {
    Easy: {
        dndTurnsToEvaluate: 4, // More turns to prove creativity
    },
    Normal: {
        dndTurnsToEvaluate: 3,
    },
    Hard: {
        dndTurnsToEvaluate: 2, // Must be creative quickly
    },
};