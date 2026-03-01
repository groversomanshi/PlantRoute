/**
 * Type declaration for @google/genai so TypeScript resolves the module
 * when using moduleResolution: "bundler". The package is installed; this
 * ensures the types are found.
 */
declare module "@google/genai" {
  export interface GoogleGenAIOptions {
    apiKey: string;
  }

  /** Response shape for generateContent (Gemini API). */
  export interface GenerateContentCandidate {
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }

  export interface GenerateContentResponse {
    text?: string;
    candidates?: GenerateContentCandidate[];
  }

  /** Thinking level for search/grounding (matches package enum). */
  export enum ThinkingLevel {
    THINKING_LEVEL_UNSPECIFIED = "THINKING_LEVEL_UNSPECIFIED",
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    MINIMAL = "MINIMAL",
  }

  export class GoogleGenAI {
    constructor(options: GoogleGenAIOptions);
    models: {
      generateContent(options: unknown): Promise<GenerateContentResponse>;
      generateContentStream(options: unknown): AsyncGenerator<{ text?: string }>;
    };
  }
}
