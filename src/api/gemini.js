import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

// Read API key from app.json extra or fall back to env
const API_KEY =
  Constants.expoConfig?.extra?.geminiApiKey ||
  Constants.manifest?.extra?.geminiApiKey ||
  'REPLACE_WITH_YOUR_GEMINI_API_KEY';

const genAI = new GoogleGenerativeAI(API_KEY);

// Models in priority order — falls back if quota is hit or model unavailable
// Using current Gemini 2.5 family (2.0 is deprecated, 1.5 is removed)
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];

/**
 * Call Gemini with automatic model fallback and retry.
 * If one model's quota is exhausted or is unavailable, tries the next.
 *
 * @param {string} prompt
 * @param {number} maxRetries
 * @returns {Promise<string>}
 */
async function callWithFallback(prompt, maxRetries = 2) {
  let lastError = null;

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        lastError = error;
        const status = error?.status || error?.response?.status;
        const msg = error?.message || '';

        // 429 = rate limit / quota exhausted → try next model
        if (status === 429 || msg.includes('429') || msg.includes('quota')) {
          console.warn(`[Gemini] ${modelName} quota hit, trying next model...`);
          break; // skip retries, move to next model
        }

        // 404 = model not found / deprecated → try next model
        if (status === 404 || msg.includes('not found') || msg.includes('not supported')) {
          console.warn(`[Gemini] ${modelName} not available (404), trying next model...`);
          break; // skip retries, move to next model
        }

        // Transient error → retry after short delay
        if (attempt < maxRetries) {
          const delay = (attempt + 1) * 2000; // 2s, 4s
          console.warn(`[Gemini] ${modelName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
    }
  }

  // All models exhausted
  console.error('[Gemini] All models failed:', lastError);
  throw lastError;
}

/**
 * Get personalized health advice based on user's symptom and language
 * @param {string} symptom - User's symptom or health concern
 * @param {string} language - 'en' for English, 'hi' for Hindi
 * @returns {Promise<string>} - AI-generated health tip with disclaimer
 */
export async function getHealthAdvice(symptom, language = 'en') {
  const languageInstruction = language === 'hi' 
    ? 'Respond in Hindi (हिंदी) language only.'
    : 'Respond in English.';

  const prompt = `You are a supportive women's health companion AI called AuraHealth. 
A user has described the following symptom or concern related to menstrual health: "${symptom}"

${languageInstruction}

Please provide:
1. A warm, empathetic acknowledgment of their concern
2. General wellness tips that may help (like hydration, rest, gentle exercise, heat therapy)
3. When they should consider consulting a healthcare provider

Keep your response concise (under 150 words), supportive, and accessible for rural users.

IMPORTANT: End your response with a clear disclaimer that this is general wellness information, not medical advice, and they should consult a healthcare provider for persistent or severe symptoms.`;

  try {
    return await callWithFallback(prompt);
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Friendly fallback when all models are exhausted
    const fallbackMessages = {
      en: "I'm having trouble connecting right now — the AI service is busy. Please try again in a few minutes. In the meantime, stay hydrated and rest well. If your symptoms persist, please consult a healthcare provider.\n\n⚠️ Disclaimer: This is general wellness information, not medical advice.",
      hi: "अभी AI सेवा व्यस्त है — कृपया कुछ मिनट बाद पुनः प्रयास करें। इस बीच, खूब पानी पिएं और अच्छी तरह आराम करें। यदि लक्षण बने रहें, तो कृपया डॉक्टर से परामर्श लें।\n\n⚠️ अस्वीकरण: यह सामान्य स्वास्थ्य जानकारी है, चिकित्सा सलाह नहीं।"
    };
    
    return fallbackMessages[language] || fallbackMessages.en;
  }
}

/**
 * Analyze mood patterns and provide insights
 * @param {Array} moodData - Array of mood entries
 * @param {string} language - 'en' for English, 'hi' for Hindi
 * @returns {Promise<string>} - AI-generated mood analysis
 */
export async function analyzeMoodPatterns(moodData, language = 'en') {
  const languageInstruction = language === 'hi' 
    ? 'Respond in Hindi (हिंदी) language only.'
    : 'Respond in English.';

  const moodSummary = moodData.map(m => `${m.date}: ${m.mood}`).join(', ');

  const prompt = `You are AuraHealth, a supportive wellness companion.
Analyze this mood pattern from the past month: ${moodSummary}

${languageInstruction}

Provide a brief, supportive insight about any patterns you notice and one wellness tip. Keep it under 80 words.`;

  try {
    return await callWithFallback(prompt);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return language === 'hi' 
      ? 'मूड विश्लेषण अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।'
      : 'Mood analysis is not available right now. Please try again later.';
  }
}
