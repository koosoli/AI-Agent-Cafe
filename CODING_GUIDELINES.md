# AI Agent Cafe - Coding Guidelines

Welcome, developer! This document outlines the best practices and architectural patterns for contributing to the AI Agent Cafe project. Adhering to these guidelines will ensure the codebase remains clean, performant, and maintainable.

## Core Philosophy

1.  **State-Driven UI:** The entire user interface is a direct reflection of the central Zustand state. UI components should be "dumb" renderers of state, and all logic for state modification should be handled through actions in the store or dedicated hooks/services.
2.  **Immutability:** All state updates must be immutable. We use the `immer` middleware for Zustand, which makes this easy. Always modify state within the `set` function as if it were mutable; `immer` will handle the immutable updates behind the scenes.
3.  **Modularity and Separation of Concerns:**
    *   **Components (`/components`):** Handle rendering and user input.
    *   **Services (`/services`):** Contain pure, stateless business logic (e.g., API calls, collision detection).
    *   **Hooks (`/hooks`):** Encapsulate complex, stateful UI logic (e.g., managing conversations, player movement).
    *   **State (`/hooks/useAppContext.ts`):** The central Zustand store is the single source of truth.
    *   **Data (`/data`):** Static data like agent personas, room layouts, and game configuration.
4.  **Performance by Default:** Be mindful of re-renders. Use `React.memo` for components that receive complex props or are part of frequently-updated lists. Select the smallest possible state slices in components to avoid unnecessary updates.

---

## State Management (Zustand)

This is the most critical part of our architecture. The entire application state is managed in a single global store, defined in `/hooks/useAppContext.ts`.

### Why Zustand instead of Reducers?

You might notice that this project does not use a traditional `reducers` folder or a `useReducer` pattern. This is a deliberate architectural choice.

-   **Simplicity and Boilerplate Reduction:** Zustand provides a minimal, unopinionated API that significantly reduces the boilerplate associated with patterns like Redux. Actions are simply functions that call `set()`.
-   **Centralized & Co-located Logic:** All state and the actions that modify it are defined together in one file. This makes it easy to understand the entire state shape and how it can change.
-   **Performance:** Zustand's selector model is highly optimized. Components subscribe only to the state "slices" they need, preventing unnecessary re-renders automatically.

For the scale and reactivity of this application, Zustand provides a more direct and efficient way to manage state compared to the formal dispatch/action/reducer flow.

### Selecting State in Components

To prevent unnecessary re-renders, it is crucial to select state efficiently.

1.  **Atomic Selectors (Preferred Method):** Select the smallest, most primitive pieces of state you need. This is the most performant method as it relies on strict `===` comparison.

    ```tsx
    // EXCELLENT: This component will ONLY re-render if `isLoading` changes.
    const isLoading = useAppStore(s => s.isLoading);

    // GOOD: This component will ONLY re-render if `selectedAgentId` changes.
    const selectedAgentId = useAppStore(s => s.ui.selectedAgentId);
    ```

2.  **Shallow Comparison (For Multiple Values):** When you need to select multiple values that would create a new object reference on every render, you MUST use the `shallow` equality function to prevent re-rendering every time.

    ```tsx
    import { shallow } from 'zustand/shallow';

    // GOOD: Component ONLY re-renders if `isLoading` or `targetAgentId` changes.
    const { isLoading, targetAgentId } = useAppStore((s) => ({
      isLoading: s.isLoading,
      targetAgentId: s.ui.targetAgentId,
    }), shallow);

    // BAD: This will cause a re-render every time ANY state value changes,
    // because a new object `{...}` is created on every call.
    // const { isLoading, targetAgentId } = useAppStore((s) => ({
    //   isLoading: s.isLoading,
    //   targetAgentId: s.ui.targetAgentId,
    // }));
    ```

### Updating State

All state modifications must go through actions defined in the store. Use Immer's "mutative" syntax for clean and safe updates.

```typescript
// Correct: Immer handles immutability behind the scenes.
addMessage: (message) => set(state => {
    state.messages.push(message);
}),

// Incorrect: Direct mutation outside of the `set` call.
// This will NOT work because it bypasses Zustand's update mechanism and Immer's
// immutable wrapper, so React will not be notified of the change to re-render.
// const state = useAppStore.getState();
// state.messages.push(message); // This mutation will not trigger a re-render!
```

---

## Component Design

-   **Small & Focused:** Keep components small and dedicated to a single purpose.
-   **`React.memo`:** Wrap components in `React.memo` if they are likely to re-render with the same props. This is especially important for items in a list or complex, conditionally-rendered components.
-   **Separation of View and Logic:** UI components should primarily contain JSX. Complex logic should be extracted into custom hooks (`/hooks`).

---

## Services (`/services`)

-   **Stateless Functions:** Services should export pure, stateless functions. They take input, perform an operation, and return output without relying on or modifying their own internal state.
-   **Single Responsibility:** Each service file should have a clear purpose.
    -   `llmService.ts`: The ONLY place where we interact with external AI APIs.
    -   `collisionService.ts`: Handles game world geometry and movement validation.
    -   `audioService.ts`: Manages all sound effects and music.

---

## Styling

-   **Global Styles (`index.html`):** Core, app-wide styles that define our "pixel art" aesthetic (fonts, buttons, modals) are located in a `<style>` block in `index.html`. This is intentional for simplicity and performance in this prototype environment.
-   **Component-Level Styles (Tailwind CSS):** Use Tailwind CSS utility classes directly in your JSX for layout, color, spacing, and component-specific styling. Adhere to the existing `pixel-*` custom classes for consistency where applicable.

---

## Type Safety (TypeScript)

-   **Single Source of Truth (`types.ts`):** All major data structures for the application (e.g., `Agent`, `Message`, `AppState`) are defined in `types.ts`.
-   **Strong Typing:** Avoid using `any`. Be explicit with types for props, state, and function signatures.

Thank you for contributing to the AI Agent Cafe! By following these guidelines, you'll help us build a more robust, performant, and delightful application.