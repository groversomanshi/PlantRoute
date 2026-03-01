/**
 * Type declaration for @google/genai so TypeScript resolves the module
 * when using moduleResolution: "bundler". The package is installed; this
 * ensures the types are found.
 */
declare module "@google/genai" {
  export interface GoogleGenAIOptions {
    apiKey: string;
  }

  export class GoogleGenAI {
    constructor(options: GoogleGenAIOptions);
    models: {
      generateContent(options: unknown): Promise<{ text?: string; candidates?: unknown[] }>;
      generateContentStream(options: unknown): AsyncGenerator<{ text?: string }>;
    };
  }
}
