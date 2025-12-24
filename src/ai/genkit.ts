'use server';
// IMPORTANT: This file should not be marked with 'use server'
// as it needs to be accessible by server-side flows without restrictions.
// It initializes a singleton AI instance.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit with the Google AI plugin.
// This `ai` instance is NOT exported. It's a singleton used by flows.
export const ai = genkit({
  plugins: [googleAI()],
});
