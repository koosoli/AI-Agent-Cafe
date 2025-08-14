// This service centralizes gamepad interactions, like haptic feedback (rumble).

const getGamepadWithVibration = (): Gamepad | null => {
    if (!navigator.getGamepads) return null;
    try {
        const gamepads = navigator.getGamepads();
        // Find the first connected gamepad that has a vibration actuator.
        return Array.from(gamepads).find(p => p && p.vibrationActuator) || null;
    } catch (e) {
        // Silently ignore errors, e.g., if the gamepad disconnects during access.
        return null;
    }
}

/**
 * Triggers the gamepad's rumble effect.
 * @param duration The duration of the rumble in milliseconds.
 * @param strongMagnitude The intensity of the high-frequency motor (0.0 to 1.0).
 * @param weakMagnitude The intensity of the low-frequency motor (0.0 to 1.0).
 */
export const rumble = (duration: number, strongMagnitude: number, weakMagnitude: number = strongMagnitude) => {
    const gamepad = getGamepadWithVibration();
    if (gamepad && gamepad.vibrationActuator) {
        gamepad.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: duration,
            weakMagnitude: weakMagnitude,
            strongMagnitude: strongMagnitude,
        }).catch(() => { /* Ignore errors if rumble fails */ });
    }
};

/** A short, sharp rumble for UI clicks. */
export const rumbleClick = () => {
    rumble(75, 0.6, 0.3);
};

/** A softer, brief rumble for notification events like a new message. */
export const rumbleSubtitle = () => {
    rumble(120, 0.25, 0.1);
};
