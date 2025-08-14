import { Tool, Type } from "@google/genai";

export const moveTool: Tool = {
  functionDeclarations: [
    {
      name: "move",
      description: "Moves the character in a specified direction for a certain distance.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          direction: {
            type: Type.STRING,
            description: "The direction to move in.",
            enum: ["up", "down", "left", "right"],
          },
          distance: {
            type: Type.NUMBER,
            description: "The distance to move, in pixels. A reasonable value is between 20 and 200.",
          },
        },
        required: ["direction", "distance"],
      },
    },
  ],
};
