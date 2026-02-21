import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

// Read API key from app.json extra or fall back to env
const API_KEY =
  Constants.expoConfig?.extra?.geminiApiKey ||
  Constants.manifest?.extra?.geminiApiKey ||
  'REPLACE_WITH_YOUR_GEMINI_API_KEY';

const genAI = new GoogleGenerativeAI(API_KEY);

// Models in priority order — only gemini-2.0-flash is available
// Other models may return 404 on free/basic tiers
const MODELS = ['gemini-2.0-flash'];

/**
 * Strip common Markdown syntax so plain <Text> renders cleanly.
 */
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s*/g, '')        // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')      // italic
    .replace(/__(.+?)__/g, '$1')      // bold alt
    .replace(/_(.+?)_/g, '$1')        // italic alt
    .replace(/`{1,3}(.+?)`{1,3}/gs, '$1') // code
    .replace(/^\s*[-*]\s/gm, '• ')   // list markers → bullet
    .replace(/\n{3,}/g, '\n\n')      // collapse excess newlines
    .trim();
}

/**
 * Call Gemini with automatic model fallback and retry.
 * If one model's quota is exhausted or is unavailable, tries the next.
 *
 * @param {string} prompt
 * @param {number} maxRetries
 * @returns {Promise<string>}
 */
async function callWithFallback(prompt, maxRetries = 2, maxTokens = 256, history = []) {
  let lastError = null;

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.7,
            },
          },
          { apiVersion: 'v1' }
        );
        let rawText;
        if (history.length > 0) {
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(prompt);
          rawText = result.response.text();
        } else {
          const result = await model.generateContent(prompt);
          rawText = result.response.text();
        }
        return stripMarkdown(rawText);
      } catch (error) {
        lastError = error;
        const status = error?.status || error?.response?.status;
        const msg = error?.message || '';

        // 429 = rate limit / quota exhausted → retry with longer delay
        if (status === 429 || msg.includes('429') || msg.includes('quota')) {
          if (attempt < maxRetries) {
            const delay = 10000; // 10 seconds for quota
            console.warn(`[Gemini] ${modelName} quota hit, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue; // retry same model after delay
          } else {
            console.warn(`[Gemini] ${modelName} quota exhausted after retries, trying next model...`);
            break; // move to next model after max retries
          }
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
export async function getHealthAdvice(symptom, language = 'en', riskContext = null, conversationHistory = []) {
  const languageInstruction = language === 'hi' 
    ? 'Respond in Hindi (हिंदी) language only.'
    : 'Respond in English.';

  const contextBlock = riskContext
    ? `\nPatient context: Recent ML assessment shows ${riskContext.level} risk` +
      (riskContext.mlConfidence ? ` (${Math.round(riskContext.mlConfidence * 100)}% confidence)` : '') +
      (riskContext.healthGrade ? `, health grade ${riskContext.healthGrade}` : '') +
      '. Tailor your advice with this in mind.\n'
    : '';

  // Build Gemini-format history from prior messages (skip system/welcome)
  const geminiHistory = conversationHistory.flatMap((msg) => [
    { role: 'user', parts: [{ text: msg.userText }] },
    { role: 'model', parts: [{ text: msg.botText }] },
  ]);

  const systemPrompt = `You are AuraHealth, a warm and knowledgeable women's health companion for rural Indian users.${contextBlock}
${languageInstruction}

CRITICAL RULES:
- NEVER say "I'm sorry", "I cannot", "I can't", "I apologize", or refuse. Always respond helpfully.
- Match your response length naturally to what is asked — a greeting gets a short warm reply, a health question gets a proper thorough answer.
- For health topics: cover causes, practical home care steps, safe OTC options where relevant, and when to see a doctor. Use • bullet points where helpful.
- Plain everyday language. No medical jargon. No Markdown formatting (no **, no ###).
- Do not start with a greeting. No numbering.
- End health responses with: "⚠️ General wellness info, not medical advice."`;

  // First turn carries the system prompt; subsequent turns are plain user messages
  const isFirstTurn = geminiHistory.length === 0;
  const prompt = isFirstTurn ? `${systemPrompt}\n\nUser: ${symptom}` : symptom;

  try {
    return await callWithFallback(prompt, 2, 400, geminiHistory);
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Friendly fallback when all models are exhausted
    const fallbackMessages = {
      en: "I'm having trouble connecting right now — the AI service is busy. Please try again in a few minutes. In the meantime, stay hydrated and rest well. If your symptoms persist, please consult a healthcare provider.\n\nNote: This is general wellness information, not medical advice.",
      hi: "अभी AI सेवा व्यस्त है — कृपया कुछ मिनट बाद पुनः प्रयास करें। इस बीच, खूब पानी पिएं और अच्छी तरह आराम करें। यदि लक्षण बने रहें, तो कृपया डॉक्टर से परामर्श लें।\n\nअस्वीकरण: यह सामान्य स्वास्थ्य जानकारी है, चिकित्सा सलाह नहीं।"
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

  const prompt = `You are AuraHealth. Mood data: ${moodSummary}

${languageInstruction}

Rules — STRICTLY follow:
- Maximum 40 words. Do NOT exceed this.
- One sentence about the pattern, one actionable tip.
- No greetings, no headers, no filler.`;

  try {
    return await callWithFallback(prompt, 2, 120);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return language === 'hi' 
      ? 'मूड विश्लेषण अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।'
      : 'Mood analysis is not available right now. Please try again later.';
  }
}

const SYMPTOM_LABELS = {
  heavyBleeding: 'heavy bleeding',
  fatigue: 'fatigue or tiredness',
  dizziness: 'dizziness',
  lowHb: 'low hemoglobin (anaemia)',
  irregularCycles: 'irregular menstrual cycles',
  pain: 'pelvic or abdominal pain',
  pregnancyIssue: 'pregnancy-related concerns',
  fainted: 'fainting episode',
  severePain: 'severe acute pain',
  vomiting: 'persistent vomiting',
};

/**
 * Generate personalised health advice grounded in the ML risk assessment output.
 * @param {Object} riskData  - { level, score, mlConfidence, healthGrade, symptoms, emergency, details }
 * @param {string} language  - 'en' | 'hi'
 * @returns {Promise<string>}
 */
export async function generateSymptomAdvice(riskData, language = 'en') {
  const { level, score, mlConfidence, healthGrade, symptoms = {}, emergency = {}, details = {} } = riskData;

  const allFlags = { ...symptoms, ...emergency };
  const activeList = Object.entries(allFlags)
    .filter(([, v]) => v)
    .map(([k]) => SYMPTOM_LABELS[k] || k);

  const symptomsText = activeList.length > 0
    ? activeList.join(', ')
    : 'no specific symptoms flagged';

  const confidenceStr = mlConfidence ? `, ${Math.round(mlConfidence * 100)}% confidence` : '';
  const gradeStr = healthGrade ? `, health grade ${healthGrade}` : '';
  const languageInstruction = language === 'hi'
    ? 'Respond in Hindi (हिंदी) only.'
    : 'Respond in English.';

  // Build a detail block so the LLM has quantified severity
  const detailLines = [];
  if (details.painIntensity) {
    const intensity = details.painIntensity;
    const tag = intensity >= 8 ? 'severe — immediate action needed'
               : intensity >= 5 ? 'moderate — proactive management needed'
               : 'mild';
    detailLines.push(`- Pain intensity: ${intensity}/10 (${tag})`);
  }
  if (details.bleedingLevel) detailLines.push(`- Bleeding heaviness: ${details.bleedingLevel}`);
  if (details.fatigueLevel)   detailLines.push(`- Fatigue severity: ${details.fatigueLevel}`);
  if (details.symptomDuration) detailLines.push(`- Symptoms started: ${details.symptomDuration}`);
  const detailsBlock = detailLines.length > 0
    ? `\nPatient-reported severity:\n${detailLines.join('\n')}\n`
    : '';

  const prompt = `You are AuraHealth's clinical health advisor. An ML risk model just assessed this patient.

Assessment: ${level} risk (score: ${score}${confidenceStr}${gradeStr})
Active concerns: ${symptomsText}${detailsBlock}

${languageInstruction}
Structure your response EXACTLY as these sections (use bullet • for each point):

1. Risk summary: What this ${level} risk level means in 1 sentence.

2. Per-symptom guidance: For each active concern —
   • Brief plain explanation
   • "To reduce intensity:" 1-2 specific steps the patient can do at home right now

3. OTC remedies: Safe over-the-counter options for each symptom (use generic names accessible in India — e.g. paracetamol, ibuprofen, ORS, iron tablets, antacids). State dose guidance briefly.

4. Next steps: 2 actions (visit ASHA worker / health centre)${level === 'HIGH' ? '\n   • HIGH RISK: advise immediate doctor visit' : ''}

Rules: Max 250 words. Bullet points only. No greetings. Simple language for rural users with low literacy.
OTC suggestions must be safe and available without prescription in India.
End with: "Note: General wellness information, not medical advice."`;

  try {
    return await callWithFallback(prompt, 2, 500);
  } catch (error) {
    console.error('[Gemini] generateSymptomAdvice failed:', error);
    const fallback = {
      en: `Your ${level.toLowerCase()} risk assessment has been recorded. Please monitor your symptoms and consult a healthcare provider if they persist or worsen.\n\nNote: General wellness information, not medical advice.`,
      hi: `आपका ${level === 'HIGH' ? 'उच्च' : level === 'MODERATE' ? 'मध्यम' : 'कम'} जोखिम मूल्यांकन दर्ज हो गया। लक्षण बने रहें तो डॉक्टर से मिलें।\n\nनोट: यह सामान्य स्वास्थ्य जानकारी है, चिकित्सा सलाह नहीं।`,
    };
    return fallback[language] || fallback.en;
  }
}
