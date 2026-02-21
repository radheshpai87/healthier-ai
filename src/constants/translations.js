/**
 * Translations for English (en) and Hindi (hi)
 * Used throughout the app for vernacular support
 */

export const translations = {
  en: {
    // App
    appName: 'AuraHealth',
    trackYourCycle: 'Track your cycle, nurture your health',
    
    // Navigation
    home: 'Home',
    aiAdvocate: 'AI Health Advocate',
    settings: 'Settings',
    calendar: 'Cycle Calendar',
    
    // Calendar
    whatToLog: 'What would you like to log?',
    logPeriod: 'Log Period Day',
    logMood: 'How are you feeling?',
    removePeriodLog: 'Remove period log',
    close: 'Close',
    save: 'Save',

    // Flow Intensity
    flowIntensity: 'Flow Intensity',
    flowLight: 'Light',
    flowMedium: 'Medium',
    flowHeavy: 'Heavy',
    flowSpotting: 'Spotting',
    selectFlow: 'How heavy is your flow?',
    noPeriod: 'No Period',

    // Calendar Symptoms
    calSymptoms: 'Symptoms',
    cramps: 'Cramps',
    headache: 'Headache',
    backPain: 'Back Pain',
    bloating: 'Bloating',
    breastTenderness: 'Breast Tenderness',
    acne: 'Acne',
    nausea: 'Nausea',
    calFatigue: 'Fatigue',
    insomnia: 'Insomnia',
    cravings: 'Cravings',

    // Cycle Phases
    phaseMenustrual: 'Period',
    phasePredicted: 'Predicted Period',
    phaseFertile: 'Fertile Window',
    phaseOvulation: 'Ovulation',
    phaseRegular: 'Regular',
    today: 'Today',

    // Legend & Summary
    legend: 'Color Guide',
    daySummary: 'Day Summary',
    noDataForDay: 'No data logged for this day',
    loggedData: 'Logged Data',
    flow: 'Flow',
    mood: 'Mood',
    tapToLog: 'Tap a date to log your day',
    predictedNextPeriod: 'Predicted Next Period',
    fertileWindow: 'Fertile Window',
    currentPhase: 'Current Phase',
    daysUntilPeriod: 'days until next period',
    periodDay: 'Period Day',
    ofCycle: 'of cycle',
    dayOfCycle: 'Day',
    
    // Prediction
    nextPeriod: 'Next Period Prediction',
    daysAway: 'days away',
    averageCycle: 'Average cycle',
    days: 'days',
    logMoreData: 'Log at least 2 periods to see predictions',
    
    // Mood
    moodTracker: 'Mood Tracker',
    happy: 'Happy',
    neutral: 'Okay',
    sad: 'Low',
    
    // Chat
    welcomeMessage: "Hello! I'm your AuraHealth companion. I'm here to provide supportive wellness information. How can I help you today? You can ask me about period symptoms, self-care tips, or general wellness advice.\n\nTip: Tap the speaker icon to hear responses read aloud!",
    typeSymptom: 'Describe your symptom or question...',
    thinking: 'Thinking...',
    errorMessage: "I'm having trouble connecting right now. Please try again in a moment.",
    
    // Settings
    language: 'Language',
    selectLanguage: 'App Language',
    privacy: 'Privacy',
    privacyInfo: 'Your data stays on your device. We never upload or share your personal health information. All data is stored securely using encryption.',
    clearAllData: 'Clear All Data',
    clearDataTitle: 'Clear All Data?',
    clearDataMessage: 'This will permanently delete all your period logs, mood data, and settings. This action cannot be undone.',
    cancel: 'Cancel',
    confirm: 'Delete',
    success: 'Success',
    dataCleared: 'All data has been cleared.',
    about: 'About',
    aboutInfo: 'A privacy-first menstrual wellness companion. Built for CodeSangram Hackathon with love for rural accessibility.',
    
    // Risk Assessment
    riskAssessment: 'Health Risk Assessment',
    riskLevel: 'Risk Level',
    confidence: 'Confidence',
    lowRisk: 'Low Risk',
    mediumRisk: 'Medium Risk', 
    highRisk: 'High Risk',
    unknownRisk: 'Unknown',
    checkRisk: 'Check Health Risk',
    lastAssessment: 'Last Assessment',
    
    // Risk Recommendations
    CONSULT_DOCTOR_CYCLE: 'Your cycle pattern shows significant irregularity. Please consult a healthcare provider for evaluation.',
    STRESS_SLEEP_URGENT: 'High stress combined with poor sleep can affect your menstrual health. Consider speaking with a doctor.',
    CONSULT_DOCTOR_BMI: 'Your BMI may be affecting your cycle. A healthcare provider can offer personalized guidance.',
    CONSULT_DOCTOR_GENERAL: 'Based on your health data, we recommend consulting a healthcare provider for a check-up.',
    MANAGE_STRESS: 'Try stress-reducing activities like deep breathing, meditation, or gentle yoga. Your body will thank you!',
    IMPROVE_SLEEP: 'Aim for 7-9 hours of quality sleep. Create a calming bedtime routine for better rest.',
    INCREASE_EXERCISE: 'Try to include at least 30 minutes of moderate exercise most days. Even walking helps!',
    MONITOR_CYCLE: 'Keep tracking your cycle. If irregularities persist for 3+ months, consult a doctor.',
    MAINTAIN_LIFESTYLE: 'You\'re doing well! Keep maintaining your healthy lifestyle habits.',
    EXCELLENT_HEALTH: 'Excellent! Your lifestyle habits are supporting great menstrual health. Keep it up!',
    CONTINUE_HEALTHY: 'Good job! Continue your healthy habits for optimal wellness.',
    COMPLETE_PROFILE: 'Please complete your health profile for personalized risk assessment.',
    TRY_AGAIN: 'Something went wrong. Please try again.',
    // ML API-specific recommendation keys
    EXCELLENT_HEALTH: 'Great job! Your health indicators look excellent.',
    REDUCE_STRESS: 'Focus on stress management techniques like breathing exercises and meditation.',
    MONITOR_CYCLES: 'Track your cycles closely for patterns. Note any changes.',
    STRESS_SLEEP_URGENT_ML: 'Prioritize sleep and stress reduction — both are critical for your health.',
    BMI_ATTENTION_NEEDED: 'Focus on nutrition and exercise balance for a healthier BMI.',
    
    // Health Score
    healthScoreLabel: 'Health Score',
    healthGrade: 'Grade',
    mlPowered: 'ML-Powered',
    offlineMode: 'Offline Analysis',
    confidenceLabel: 'Confidence',
    
    // Health Profile
    healthProfile: 'Health Profile',
    age: 'Age',
    height: 'Height (cm)',
    weight: 'Weight (kg)',
    bmi: 'BMI',
    saveProfile: 'Save Profile',
    profileSaved: 'Profile saved successfully!',
    
    // Lifestyle inputs
    lifestyleSection: 'Lifestyle Factors',
    lifestyleHint: 'Helps improve prediction accuracy',
    stressLevelLabel: 'Stress Level',
    stressLow: 'Low',
    stressMedium: 'Moderate',
    stressHigh: 'High',
    sleepHoursLabel: 'Avg. Sleep (hours)',
    exerciseFreqLabel: 'Exercise (days/week)',
    
    // Daily Log
    dailyLog: 'Daily Health Log',
    stressLevel: 'Stress Level',
    sleepHours: 'Sleep Hours',
    exerciseMinutes: 'Exercise (minutes)',
    symptoms: 'Symptoms',
    saveLog: 'Save Log',
    logSaved: 'Log saved!',
    
    // Health Score
    healthScore: 'Health Score',
    sleepScore: 'Sleep',
    stressScore: 'Stress Management',
    exerciseScore: 'Exercise',
    bmiScore: 'BMI',
    
    // Sync
    syncStatus: 'Sync Status',
    online: 'Online',
    offline: 'Offline',
    pendingSync: 'Pending sync',
    lastSync: 'Last sync',
    syncNow: 'Sync Now',
    
    // Voice Alerts
    highRiskAlert: 'High health risk detected! Please pay attention.',
    mediumRiskAlert: 'Moderate health risk detected.',
    lowRiskAlert: 'Your health risk is low.',
    speakAlert: 'Speak alert',
    stopAlert: 'Stop speaking',
    dismiss: 'Dismiss',
    urgentCareNote: 'Consider seeking medical advice soon.',
  },
  
  hi: {
    // App
    appName: 'ऑरा हेल्थ',
    trackYourCycle: 'अपने चक्र को ट्रैक करें, अपने स्वास्थ्य का ध्यान रखें',
    
    // Navigation
    home: 'होम',
    aiAdvocate: 'AI स्वास्थ्य सहायक',
    settings: 'सेटिंग्स',
    calendar: 'चक्र कैलेंडर',
    
    // Calendar
    whatToLog: 'आप क्या लॉग करना चाहेंगी?',
    logPeriod: 'पीरियड दिन लॉग करें',
    logMood: 'आप कैसा महसूस कर रही हैं?',
    removePeriodLog: 'पीरियड लॉग हटाएं',
    close: 'बंद करें',
    save: 'सहेजें',

    // Flow Intensity
    flowIntensity: 'रक्तस्राव की तीव्रता',
    flowLight: 'हल्का',
    flowMedium: 'मध्यम',
    flowHeavy: 'भारी',
    flowSpotting: 'स्पॉटिंग',
    selectFlow: 'आपका रक्तस्राव कितना है?',
    noPeriod: 'पीरियड नहीं',

    // Calendar Symptoms
    calSymptoms: 'लक्षण',
    cramps: 'ऐंठन',
    headache: 'सिरदर्द',
    backPain: 'पीठ दर्द',
    bloating: 'पेट फूलना',
    breastTenderness: 'स्तन दर्द',
    acne: 'मुंहासे',
    nausea: 'जी मिचलाना',
    calFatigue: 'थकान',
    insomnia: 'अनिद्रा',
    cravings: 'तीव्र इच्छा',

    // Cycle Phases
    phaseMenustrual: 'पीरियड',
    phasePredicted: 'अनुमानित पीरियड',
    phaseFertile: 'उपजाऊ समय',
    phaseOvulation: 'ओव्यूलेशन',
    phaseRegular: 'सामान्य',
    today: 'आज',

    // Legend & Summary
    legend: 'रंग गाइड',
    daySummary: 'दिन का सारांश',
    noDataForDay: 'इस दिन का कोई डेटा नहीं',
    loggedData: 'लॉग किया गया डेटा',
    flow: 'रक्तस्राव',
    mood: 'मूड',
    tapToLog: 'अपना दिन लॉग करने के लिए तारीख दबाएं',
    predictedNextPeriod: 'अनुमानित अगला पीरियड',
    fertileWindow: 'उपजाऊ समय',
    currentPhase: 'वर्तमान चरण',
    daysUntilPeriod: 'दिन बाकी अगले पीरियड में',
    periodDay: 'पीरियड दिन',
    ofCycle: 'चक्र का',
    dayOfCycle: 'दिन',
    
    // Prediction
    nextPeriod: 'अगला पीरियड अनुमान',
    daysAway: 'दिन बाकी',
    averageCycle: 'औसत चक्र',
    days: 'दिन',
    logMoreData: 'अनुमान देखने के लिए कम से कम 2 पीरियड लॉग करें',
    
    // Mood
    moodTracker: 'मूड ट्रैकर',
    happy: 'खुश',
    neutral: 'ठीक',
    sad: 'उदास',
    
    // Chat
    welcomeMessage: "नमस्ते! मैं आपकी ऑरा हेल्थ सहायक हूं। मैं आपको स्वास्थ्य संबंधी जानकारी देने के लिए यहां हूं। आज मैं आपकी कैसे मदद कर सकती हूं? आप पीरियड के लक्षण, सेल्फ-केयर टिप्स, या सामान्य स्वास्थ्य सलाह के बारे में पूछ सकती हैं।\n\nटिप: जवाब सुनने के लिए स्पीकर आइकन पर टैप करें!",
    typeSymptom: 'अपना लक्षण या सवाल बताएं...',
    thinking: 'सोच रही हूं...',
    errorMessage: 'अभी कनेक्ट करने में समस्या हो रही है। कृपया थोड़ी देर बाद फिर से कोशिश करें।',
    
    // Settings
    language: 'भाषा',
    selectLanguage: 'ऐप भाषा',
    privacy: 'गोपनीयता',
    privacyInfo: 'आपका डेटा आपके डिवाइस पर ही रहता है। हम कभी भी आपकी व्यक्तिगत स्वास्थ्य जानकारी अपलोड या साझा नहीं करते। सभी डेटा एन्क्रिप्शन के साथ सुरक्षित रूप से संग्रहीत है।',
    clearAllData: 'सभी डेटा मिटाएं',
    clearDataTitle: 'सभी डेटा मिटाएं?',
    clearDataMessage: 'यह आपके सभी पीरियड लॉग, मूड डेटा और सेटिंग्स को स्थायी रूप से हटा देगा। यह क्रिया पूर्ववत नहीं की जा सकती।',
    cancel: 'रद्द करें',
    confirm: 'हटाएं',
    success: 'सफल',
    dataCleared: 'सभी डेटा मिटा दिया गया है।',
    about: 'जानकारी',
    aboutInfo: 'एक गोपनीयता-प्रथम मासिक धर्म स्वास्थ्य सहायक। ग्रामीण पहुंच के लिए प्यार से CodeSangram हैकाथॉन के लिए बनाया गया।',
    
    // Risk Assessment
    riskAssessment: 'स्वास्थ्य जोखिम मूल्यांकन',
    riskLevel: 'जोखिम स्तर',
    confidence: 'विश्वास',
    lowRisk: 'कम जोखिम',
    mediumRisk: 'मध्यम जोखिम',
    highRisk: 'उच्च जोखिम',
    unknownRisk: 'अज्ञात',
    checkRisk: 'स्वास्थ्य जोखिम जांचें',
    lastAssessment: 'अंतिम मूल्यांकन',
    
    // Risk Recommendations
    CONSULT_DOCTOR_CYCLE: 'आपके चक्र में महत्वपूर्ण अनियमितता है। कृपया जांच के लिए डॉक्टर से मिलें।',
    STRESS_SLEEP_URGENT: 'अधिक तनाव और कम नींद आपके मासिक धर्म स्वास्थ्य को प्रभावित कर सकती है। डॉक्टर से बात करें।',
    CONSULT_DOCTOR_BMI: 'आपका BMI आपके चक्र को प्रभावित कर सकता है। डॉक्टर से व्यक्तिगत मार्गदर्शन लें।',
    CONSULT_DOCTOR_GENERAL: 'आपके स्वास्थ्य डेटा के आधार पर, हम चेक-अप के लिए डॉक्टर से मिलने की सलाह देते हैं।',
    MANAGE_STRESS: 'गहरी सांस, ध्यान, या योग जैसी तनाव कम करने वाली गतिविधियां करें। आपका शरीर धन्यवाद देगा!',
    IMPROVE_SLEEP: '7-9 घंटे की अच्छी नींद लें। बेहतर आराम के लिए सोने से पहले शांत दिनचर्या बनाएं।',
    INCREASE_EXERCISE: 'रोजाना कम से कम 30 मिनट व्यायाम करें। पैदल चलना भी मदद करता है!',
    MONITOR_CYCLE: 'अपना चक्र ट्रैक करती रहें। अगर 3+ महीने अनियमितता रहे, तो डॉक्टर से मिलें।',
    MAINTAIN_LIFESTYLE: 'आप अच्छा कर रही हैं! अपनी स्वस्थ जीवनशैली बनाए रखें।',
    EXCELLENT_HEALTH: 'उत्कृष्ट! आपकी जीवनशैली आपके मासिक स्वास्थ्य का समर्थन कर रही है। जारी रखें!',
    CONTINUE_HEALTHY: 'शाबाश! अपनी स्वस्थ आदतें जारी रखें।',
    COMPLETE_PROFILE: 'कृपया व्यक्तिगत जोखिम मूल्यांकन के लिए अपनी प्रोफ़ाइल पूरी करें।',
    TRY_AGAIN: 'कुछ गड़बड़ हुई। कृपया फिर से कोशिश करें।',
    EXCELLENT_HEALTH: 'बहुत बढ़िया! आपके स्वास्थ्य संकेतक उत्कृष्ट हैं।',
    REDUCE_STRESS: 'श्वास व्यायाम और ध्यान जैसी तनाव प्रबंधन तकनीकों पर ध्यान दें।',
    MONITOR_CYCLES: 'पैटर्न के लिए अपने चक्रों को बारीकी से ट्रैक करें।',
    STRESS_SLEEP_URGENT_ML: 'नींद और तनाव कम करने को प्राथमिकता दें — दोनों आपके स्वास्थ्य के लिए महत्वपूर्ण हैं।',
    BMI_ATTENTION_NEEDED: 'स्वस्थ BMI के लिए पोषण और व्यायाम के संतुलन पर ध्यान दें।',
    
    healthScoreLabel: 'स्वास्थ्य स्कोर',
    healthGrade: 'ग्रेड',
    mlPowered: 'ML-संचालित',
    offlineMode: 'ऑफलाइन विश्लेषण',
    confidenceLabel: 'विश्वास',
    
    // Health Profile
    healthProfile: 'स्वास्थ्य प्रोफ़ाइल',
    age: 'आयु',
    height: 'ऊंचाई (सेमी)',
    weight: 'वजन (किलो)',
    bmi: 'BMI',
    saveProfile: 'प्रोफ़ाइल सहेजें',
    profileSaved: 'प्रोफ़ाइल सफलतापूर्वक सहेजी गई!',
    
    lifestyleSection: 'जीवनशैली कारक',
    lifestyleHint: 'भविष्यवाणी सटीकता बेहतर करने में मदद करता है',
    stressLevelLabel: 'तनाव स्तर',
    stressLow: 'कम',
    stressMedium: 'मध्यम',
    stressHigh: 'अधिक',
    sleepHoursLabel: 'औसत नींद (घंटे)',
    exerciseFreqLabel: 'व्यायाम (दिन/सप्ताह)',
    
    // Daily Log
    dailyLog: 'दैनिक स्वास्थ्य लॉग',
    stressLevel: 'तनाव स्तर',
    sleepHours: 'नींद के घंटे',
    exerciseMinutes: 'व्यायाम (मिनट)',
    symptoms: 'लक्षण',
    saveLog: 'लॉग सहेजें',
    logSaved: 'लॉग सहेजा गया!',
    
    // Health Score
    healthScore: 'स्वास्थ्य स्कोर',
    sleepScore: 'नींद',
    stressScore: 'तनाव प्रबंधन',
    exerciseScore: 'व्यायाम',
    bmiScore: 'BMI',
    
    // Sync
    syncStatus: 'सिंक स्थिति',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    pendingSync: 'सिंक बाकी',
    lastSync: 'अंतिम सिंक',
    syncNow: 'अभी सिंक करें',
    
    // Voice Alerts
    highRiskAlert: 'उच्च स्वास्थ्य जोखिम! कृपया ध्यान दें।',
    mediumRiskAlert: 'मध्यम स्वास्थ्य जोखिम पाया गया।',
    lowRiskAlert: 'आपका स्वास्थ्य जोखिम कम है।',
    speakAlert: 'अलर्ट बोलें',
    stopAlert: 'बोलना बंद करें',
    dismiss: 'खारिज करें',
    urgentCareNote: 'जल्द ही चिकित्सा सलाह लेने पर विचार करें।',
  },
};
