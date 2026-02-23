import Constants from 'expo-constants';

// Read API key from app config only (never hardcode secrets in source)
const _configKey =
  Constants.expoConfig?.extra?.groqApiKey ||
  Constants.manifest?.extra?.groqApiKey ||
  '';
const API_KEY = _configKey;

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Models in priority order — fast first, more capable as fallback
const MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];

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
 * Call Groq chat completions API.
 *
 * @param {Array} messages   - OpenAI-format message array
 * @param {number} maxTokens
 * @param {string} modelName
 * @returns {Promise<string>}
 */
async function callGroqAPI(messages, maxTokens = 256, modelName = MODELS[0]) {
  if (!API_KEY || API_KEY.length < 20) {
    throw new Error('Missing GROQ_API_KEY. Set it in your .env file.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const err = new Error(errBody?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Call Groq with automatic model fallback and retry.
 *
 * @param {Array}  messages
 * @param {number} maxRetries
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
async function callWithFallback(messages, maxRetries = 2, maxTokens = 256) {
  let lastError = null;

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const rawText = await callGroqAPI(messages, maxTokens, modelName);
        return stripMarkdown(rawText);
      } catch (error) {
        lastError = error;
        const status = error?.status;
        const msg = error?.message || '';

        // 429 = rate limit → try next model
        if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate_limit')) {
          console.warn(`[Groq] ${modelName} rate limited, trying next model...`);
          break;
        }

        // 404 = model not found → try next model
        if (status === 404 || msg.includes('not found') || msg.includes('not supported') || msg.includes('does not exist')) {
          console.warn(`[Groq] ${modelName} not available, trying next model...`);
          break;
        }

        // Transient error → retry after short delay
        if (attempt < maxRetries) {
          const delay = (attempt + 1) * 2000;
          console.warn(`[Groq] ${modelName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
    }
  }

  console.error('[Groq] All models failed:', lastError);
  throw lastError;
}

/**
 * Get personalized health advice based on user's symptom and language.
 * @param {string} symptom
 * @param {string} language - 'en' | 'hi'
 * @param {Object|null} riskContext
 * @param {Array} conversationHistory
 * @returns {Promise<string>}
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

  const systemPrompt = `You are AuraHealth, a warm and knowledgeable women's health companion for rural Indian users.${contextBlock}
${languageInstruction}

CRITICAL RULES:
- NEVER say "I'm sorry", "I cannot", "I can't", "I apologize", or refuse. Always respond helpfully.
- Match your response length naturally to what is asked — a greeting gets a short warm reply, a health question gets a proper thorough answer.
- For health topics: cover causes, practical home care steps, safe OTC options where relevant, and when to see a doctor. Use • bullet points where helpful.
- Plain everyday language. No medical jargon. No Markdown formatting (no **, no ###).
- Do not start with a greeting. No numbering.
- End health responses with: "⚠️ General wellness info, not medical advice."`;

  // Build OpenAI-compatible history
  const historyMessages = conversationHistory.flatMap((msg) => [
    { role: 'user', content: msg.userText },
    { role: 'assistant', content: msg.botText },
  ]);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: symptom },
  ];

  try {
    return await callWithFallback(messages, 2, 400);
  } catch (error) {
    console.error('[Groq] getHealthAdvice failed:', error);

    const fallbackMessages = {
      en: "I'm having trouble connecting right now — the AI service is busy. Please try again in a few minutes. In the meantime, stay hydrated and rest well. If your symptoms persist, please consult a healthcare provider.\n\nNote: This is general wellness information, not medical advice.",
      hi: "अभी AI सेवा व्यस्त है — कृपया कुछ मिनट बाद पुनः प्रयास करें। इस बीच, खूब पानी पिएं और अच्छी तरह आराम करें। यदि लक्षण बने रहें, तो कृपया डॉक्टर से परामर्श लें।\n\nअस्वीकरण: यह सामान्य स्वास्थ्य जानकारी है, चिकित्सा सलाह नहीं।"
    };

    return fallbackMessages[language] || fallbackMessages.en;
  }
}

/**
 * Analyze mood patterns and provide insights.
 * @param {Array} moodData
 * @param {string} language - 'en' | 'hi'
 * @returns {Promise<string>}
 */
export async function analyzeMoodPatterns(moodData, language = 'en') {
  const languageInstruction = language === 'hi'
    ? 'Respond in Hindi (हिंदी) language only.'
    : 'Respond in English.';

  const moodSummary = moodData.map(m => `${m.date}: ${m.mood}`).join(', ');

  const messages = [
    {
      role: 'system',
      content: `You are AuraHealth. ${languageInstruction}\nRules — STRICTLY follow:\n- Maximum 40 words. Do NOT exceed this.\n- One sentence about the pattern, one actionable tip.\n- No greetings, no headers, no filler.`,
    },
    {
      role: 'user',
      content: `Mood data: ${moodSummary}`,
    },
  ];

  try {
    return await callWithFallback(messages, 2, 120);
  } catch (error) {
    console.error('[Groq] analyzeMoodPatterns failed:', error);
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

  const detailLines = [];
  if (details.painIntensity) {
    const intensity = details.painIntensity;
    const tag = intensity >= 8 ? 'severe — immediate action needed'
               : intensity >= 5 ? 'moderate — proactive management needed'
               : 'mild';
    detailLines.push(`- Pain intensity: ${intensity}/10 (${tag})`);
  }
  if (details.bleedingLevel) detailLines.push(`- Bleeding heaviness: ${details.bleedingLevel}`);
  if (details.fatigueLevel)  detailLines.push(`- Fatigue severity: ${details.fatigueLevel}`);
  if (details.symptomDuration) detailLines.push(`- Symptoms started: ${details.symptomDuration}`);
  const detailsBlock = detailLines.length > 0
    ? `\nPatient-reported severity:\n${detailLines.join('\n')}\n`
    : '';

  const userContent = `Assessment: ${level} risk (score: ${score}${confidenceStr}${gradeStr})
Active concerns: ${symptomsText}${detailsBlock}

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

  const messages = [
    {
      role: 'system',
      content: `You are AuraHealth's clinical health advisor. An ML risk model just assessed this patient. ${languageInstruction}`,
    },
    { role: 'user', content: userContent },
  ];

  try {
    return await callWithFallback(messages, 2, 500);
  } catch (error) {
    console.error('[Groq] generateSymptomAdvice failed:', error);
    const fallback = {
      en: `Your ${level.toLowerCase()} risk assessment has been recorded. Please monitor your symptoms and consult a healthcare provider if they persist or worsen.\n\nNote: General wellness information, not medical advice.`,
      hi: `आपका ${level === 'HIGH' ? 'उच्च' : level === 'MODERATE' ? 'मध्यम' : 'कम'} जोखिम मूल्यांकन दर्ज हो गया। लक्षण बने रहें तो डॉक्टर से मिलें।\n\nनोट: यह सामान्य स्वास्थ्य जानकारी है, चिकित्सा सलाह नहीं।`,
    };
    return fallback[language] || fallback.en;
  }
}
