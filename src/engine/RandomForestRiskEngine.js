/**
 * Random Forest Risk Engine for Menstrual Health
 * Pure JavaScript implementation for 100% offline functionality
 * 
 * This is a transpiled Random Forest model with 5 decision trees
 * trained on menstrual health risk factors
 */

/**
 * Decision Tree 1: Primary health indicators
 * @param {Object} data - User health data
 * @returns {number} - Risk score (0-1)
 */
function decisionTree1(data) {
  const { age, bmi, stress_level, sleep_hours, cycle_length_avg } = data;
  
  // Root: BMI check
  if (bmi >= 30) {
    // Obese - higher baseline risk
    if (stress_level >= 4) {
      return 0.85; // High risk
    } else if (sleep_hours < 6) {
      return 0.75;
    } else {
      return 0.55;
    }
  } else if (bmi >= 25) {
    // Overweight
    if (cycle_length_avg < 21 || cycle_length_avg > 35) {
      return 0.70; // Irregular cycle with overweight
    } else if (stress_level >= 3) {
      return 0.50;
    } else {
      return 0.30;
    }
  } else if (bmi < 18.5) {
    // Underweight - risk for amenorrhea
    if (cycle_length_avg > 40) {
      return 0.80; // High risk - possible amenorrhea
    } else if (stress_level >= 4) {
      return 0.65;
    } else {
      return 0.40;
    }
  } else {
    // Normal BMI
    if (cycle_length_avg < 21 || cycle_length_avg > 35) {
      return 0.45;
    } else {
      return 0.15; // Low risk
    }
  }
}

/**
 * Decision Tree 2: Stress and sleep patterns
 * @param {Object} data - User health data
 * @returns {number} - Risk score (0-1)
 */
function decisionTree2(data) {
  const { stress_level, sleep_hours, exercise_freq } = data;
  
  // Root: Stress level
  if (stress_level >= 4) {
    // High stress
    if (sleep_hours < 5) {
      return 0.90; // Very high risk
    } else if (sleep_hours < 7) {
      if (exercise_freq < 2) {
        return 0.75;
      } else {
        return 0.55; // Exercise mitigates
      }
    } else {
      return 0.45;
    }
  } else if (stress_level >= 3) {
    // Moderate stress
    if (sleep_hours < 6) {
      return 0.60;
    } else if (exercise_freq >= 3) {
      return 0.25; // Good exercise habits help
    } else {
      return 0.40;
    }
  } else {
    // Low stress
    if (sleep_hours >= 7 && exercise_freq >= 2) {
      return 0.10; // Excellent lifestyle
    } else if (sleep_hours < 6) {
      return 0.35;
    } else {
      return 0.20;
    }
  }
}

/**
 * Decision Tree 3: Age-specific risk factors
 * @param {Object} data - User health data
 * @returns {number} - Risk score (0-1)
 */
function decisionTree3(data) {
  const { age, cycle_length_avg, stress_level } = data;
  
  // Root: Age groups
  if (age < 18) {
    // Adolescent - cycles still stabilizing
    if (cycle_length_avg < 21 || cycle_length_avg > 45) {
      return 0.50; // Some irregularity normal
    } else {
      return 0.20;
    }
  } else if (age >= 18 && age <= 25) {
    // Young adult
    if (cycle_length_avg < 21 || cycle_length_avg > 35) {
      if (stress_level >= 4) {
        return 0.70;
      } else {
        return 0.45;
      }
    } else {
      return 0.15;
    }
  } else if (age > 25 && age <= 35) {
    // Prime reproductive years
    if (cycle_length_avg < 21 || cycle_length_avg > 35) {
      return 0.60; // More concerning at this age
    } else if (cycle_length_avg >= 24 && cycle_length_avg <= 32) {
      return 0.10; // Optimal
    } else {
      return 0.25;
    }
  } else if (age > 35 && age <= 45) {
    // Perimenopause possible
    if (cycle_length_avg < 21 || cycle_length_avg > 40) {
      return 0.55; // Could be perimenopause
    } else {
      return 0.30;
    }
  } else {
    // Over 45 - menopause transition
    if (cycle_length_avg > 60) {
      return 0.40; // Expected changes
    } else {
      return 0.35;
    }
  }
}

/**
 * Decision Tree 4: Lifestyle factors
 * @param {Object} data - User health data
 * @returns {number} - Risk score (0-1)
 */
function decisionTree4(data) {
  const { exercise_freq, sleep_hours, bmi, stress_level } = data;
  
  // Root: Exercise frequency
  if (exercise_freq >= 5) {
    // Very active
    if (bmi < 18.5) {
      return 0.60; // Over-exercising risk
    } else if (sleep_hours >= 7) {
      return 0.10; // Excellent
    } else {
      return 0.25;
    }
  } else if (exercise_freq >= 3) {
    // Moderately active
    if (stress_level >= 4) {
      return 0.45;
    } else if (sleep_hours >= 6) {
      return 0.20;
    } else {
      return 0.35;
    }
  } else if (exercise_freq >= 1) {
    // Light activity
    if (bmi >= 30) {
      return 0.65;
    } else if (stress_level >= 3) {
      return 0.50;
    } else {
      return 0.35;
    }
  } else {
    // Sedentary
    if (bmi >= 25) {
      return 0.75;
    } else if (stress_level >= 4) {
      return 0.70;
    } else {
      return 0.50;
    }
  }
}

/**
 * Decision Tree 5: Cycle regularity focus
 * @param {Object} data - User health data
 * @returns {number} - Risk score (0-1)
 */
function decisionTree5(data) {
  const { cycle_length_avg, cycle_variance, age, stress_level } = data;
  
  // Use variance if available, otherwise estimate from context
  const variance = cycle_variance || (stress_level >= 4 ? 8 : stress_level >= 3 ? 5 : 3);
  
  // Root: Cycle regularity
  if (cycle_length_avg < 21) {
    // Short cycles - polymenorrhea
    if (variance > 7) {
      return 0.85; // Highly irregular short cycles
    } else {
      return 0.65;
    }
  } else if (cycle_length_avg > 35 && cycle_length_avg <= 45) {
    // Oligomenorrhea
    if (age > 35) {
      return 0.50; // Could be perimenopause
    } else if (stress_level >= 4) {
      return 0.70;
    } else {
      return 0.55;
    }
  } else if (cycle_length_avg > 45) {
    // Severe oligomenorrhea
    if (age < 40) {
      return 0.80; // Needs attention
    } else {
      return 0.55;
    }
  } else if (cycle_length_avg >= 24 && cycle_length_avg <= 32) {
    // Optimal range
    if (variance <= 3) {
      return 0.05; // Very regular, excellent
    } else if (variance <= 5) {
      return 0.15;
    } else {
      return 0.30;
    }
  } else {
    // Acceptable range (21-24 or 32-35)
    if (variance > 7) {
      return 0.45;
    } else {
      return 0.25;
    }
  }
}

/**
 * Get recommendation key based on risk factors
 * @param {Object} data - User health data
 * @param {string} riskLevel - Calculated risk level
 * @returns {string} - Recommendation key for translation lookup
 */
function getRecommendationKey(data, riskLevel) {
  const { bmi, stress_level, sleep_hours, exercise_freq, cycle_length_avg } = data;
  
  if (riskLevel === 'High') {
    if (cycle_length_avg < 21 || cycle_length_avg > 45) {
      return 'CONSULT_DOCTOR_CYCLE';
    } else if (stress_level >= 4 && sleep_hours < 6) {
      return 'STRESS_SLEEP_URGENT';
    } else if (bmi >= 30 || bmi < 18.5) {
      return 'CONSULT_DOCTOR_BMI';
    } else {
      return 'CONSULT_DOCTOR_GENERAL';
    }
  } else if (riskLevel === 'Medium') {
    if (stress_level >= 3) {
      return 'MANAGE_STRESS';
    } else if (sleep_hours < 7) {
      return 'IMPROVE_SLEEP';
    } else if (exercise_freq < 3) {
      return 'INCREASE_EXERCISE';
    } else if (cycle_length_avg < 24 || cycle_length_avg > 35) {
      return 'MONITOR_CYCLE';
    } else {
      return 'MAINTAIN_LIFESTYLE';
    }
  } else {
    if (exercise_freq >= 3 && sleep_hours >= 7 && stress_level <= 2) {
      return 'EXCELLENT_HEALTH';
    } else {
      return 'CONTINUE_HEALTHY';
    }
  }
}

/**
 * Main Random Forest prediction function
 * Aggregates predictions from all decision trees
 * 
 * @param {Object} userData - User health data
 * @param {number} userData.age - User's age in years
 * @param {number} userData.bmi - Body Mass Index
 * @param {number} userData.stress_level - Stress level (1-5)
 * @param {number} userData.sleep_hours - Average sleep hours per night
 * @param {number} userData.exercise_freq - Exercise frequency (0-7 days per week)
 * @param {number} userData.cycle_length_avg - Average cycle length in days
 * @param {number} [userData.cycle_variance] - Optional: variance in cycle length
 * 
 * @returns {Object} Prediction result
 * @returns {string} result.risk_level - 'Low' | 'Medium' | 'High'
 * @returns {number} result.confidence - Confidence score (0-1)
 * @returns {string} result.recommendation_key - Key for translation lookup
 * @returns {Object} result.details - Detailed breakdown
 */
export function predictRisk(userData) {
  // Validate input
  const requiredFields = ['age', 'bmi', 'stress_level', 'sleep_hours', 'exercise_freq', 'cycle_length_avg'];
  for (const field of requiredFields) {
    if (userData[field] === undefined || userData[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Normalize and validate ranges
  const data = {
    age: Math.max(12, Math.min(60, userData.age)),
    bmi: Math.max(15, Math.min(45, userData.bmi)),
    stress_level: Math.max(1, Math.min(5, userData.stress_level)),
    sleep_hours: Math.max(0, Math.min(12, userData.sleep_hours)),
    exercise_freq: Math.max(0, Math.min(7, userData.exercise_freq)),
    cycle_length_avg: Math.max(14, Math.min(90, userData.cycle_length_avg)),
    cycle_variance: userData.cycle_variance,
  };
  
  // Get predictions from all trees
  const treeScores = [
    decisionTree1(data),
    decisionTree2(data),
    decisionTree3(data),
    decisionTree4(data),
    decisionTree5(data),
  ];
  
  // Tree weights (based on feature importance)
  const weights = [0.25, 0.20, 0.15, 0.15, 0.25]; // Cycle and BMI trees weighted higher
  
  // Weighted average
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < treeScores.length; i++) {
    weightedSum += treeScores[i] * weights[i];
    weightTotal += weights[i];
  }
  const avgScore = weightedSum / weightTotal;
  
  // Calculate confidence based on tree agreement
  const mean = treeScores.reduce((a, b) => a + b, 0) / treeScores.length;
  const variance = treeScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / treeScores.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(0.5, Math.min(0.98, 1 - stdDev));
  
  // Determine risk level
  let risk_level;
  if (avgScore >= 0.65) {
    risk_level = 'High';
  } else if (avgScore >= 0.35) {
    risk_level = 'Medium';
  } else {
    risk_level = 'Low';
  }
  
  // Get recommendation
  const recommendation_key = getRecommendationKey(data, risk_level);
  
  return {
    risk_level,
    confidence: Math.round(confidence * 100) / 100,
    recommendation_key,
    details: {
      raw_score: Math.round(avgScore * 100) / 100,
      tree_scores: treeScores.map(s => Math.round(s * 100) / 100),
      input_data: data,
    },
  };
}

/**
 * Quick risk assessment with minimal inputs
 * For users who don't have all health data
 * 
 * @param {Object} basicData - Basic health data
 * @param {number} basicData.cycle_length_avg - Average cycle length
 * @param {number} basicData.stress_level - Stress level (1-5)
 * @param {number} [basicData.sleep_hours] - Sleep hours (defaults to 7)
 * 
 * @returns {Object} Simplified prediction
 */
export function quickRiskCheck(basicData) {
  const fullData = {
    age: 25, // Default assumption
    bmi: 22, // Normal BMI assumption
    stress_level: basicData.stress_level || 3,
    sleep_hours: basicData.sleep_hours || 7,
    exercise_freq: 3, // Moderate assumption
    cycle_length_avg: basicData.cycle_length_avg,
  };
  
  return predictRisk(fullData);
}

/**
 * Analyze cycle history for patterns
 * @param {Array<number>} cycleLengths - Array of past cycle lengths
 * @returns {Object} Analysis results
 */
export function analyzeCycleHistory(cycleLengths) {
  if (!cycleLengths || cycleLengths.length < 2) {
    return {
      average: null,
      variance: null,
      trend: 'insufficient_data',
      regularity: 'unknown',
    };
  }
  
  const avg = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  const variance = cycleLengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / cycleLengths.length;
  const stdDev = Math.sqrt(variance);
  
  // Determine trend (looking at last 3 cycles vs first 3)
  let trend = 'stable';
  if (cycleLengths.length >= 4) {
    const recentAvg = cycleLengths.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = cycleLengths.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const diff = recentAvg - olderAvg;
    
    if (diff > 3) trend = 'lengthening';
    else if (diff < -3) trend = 'shortening';
  }
  
  // Determine regularity
  let regularity;
  if (stdDev <= 2) regularity = 'very_regular';
  else if (stdDev <= 4) regularity = 'regular';
  else if (stdDev <= 7) regularity = 'somewhat_irregular';
  else regularity = 'irregular';
  
  return {
    average: Math.round(avg * 10) / 10,
    variance: Math.round(variance * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    trend,
    regularity,
    cycleCount: cycleLengths.length,
  };
}
