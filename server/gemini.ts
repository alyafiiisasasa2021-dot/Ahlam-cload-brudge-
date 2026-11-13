import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;
let lastUsedKey: string | null = null;

export function getResolvedApiKey(): string {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
  ];
  for (const key of candidates) {
    const trimmed = (key || '').trim();
    if (trimmed && trimmed !== 'MY_GEMINI_API_KEY' && trimmed !== 'YOUR_API_KEY') {
      return trimmed;
    }
  }
  return '';
}

export function hasValidGeminiApiKey(): boolean {
  return getResolvedApiKey().length > 0;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getResolvedApiKey();
  if (!apiInstanceOrKeyMatch(apiKey)) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || ' placeholder-key-for-offline-fallback ',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    lastUsedKey = apiKey;
  }
  return aiInstance!;
}

function apiInstanceOrKeyMatch(currentKey: string): boolean {
  return aiInstance !== null && lastUsedKey === currentKey;
}
