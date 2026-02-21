import { useState, useEffect, useCallback } from 'react';
import { getPeriodData, getFlowData, getMoodData, getDailyLogs } from '../utils/storage';

/**
 * Phase constants
 */
export const CYCLE_PHASES = {
  MENSTRUAL: 'menstrual',
  FOLLICULAR: 'follicular',
  FERTILE: 'fertile',
  OVULATION: 'ovulation',
  LUTEAL: 'luteal',
  PREDICTED: 'predicted',
};

/**
 * Color constants for calendar phases
 */
export const PHASE_COLORS = {
  period:      '#E53935',  // Red – logged period day
  periodLight: '#EF9A9A',  // Light red – light flow
  periodMed:   '#E57373',  // Medium red
  periodHeavy: '#C62828',  // Dark red – heavy flow
  spotting:    '#FFCDD2',  // Very light pink – spotting
  predicted:   '#F48FB1',  // Pink – predicted period
  fertile:     '#81C784',  // Green – fertile window
  ovulation:   '#43A047',  // Dark green – ovulation day
  today:       '#7E57C2',  // Purple – today
  logged:      '#FFD54F',  // Yellow – day with logged data (no period)
};

/**
 * Custom hook for comprehensive cycle tracking
 * Calculates predictions, phases, fertile window, and provides calendar marking data
 */
export function useCycleTracker() {
  const [periodDates, setPeriodDates] = useState([]);
  const [nextPeriodDate, setNextPeriodDate] = useState(null);
  const [nextPeriodDateStr, setNextPeriodDateStr] = useState(null);
  const [daysUntilNextPeriod, setDaysUntilNextPeriod] = useState(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [flowData, setFlowData] = useState({});
  const [moodData, setMoodData] = useState({});
  const [dailyLogs, setDailyLogs] = useState({});

  // Predicted date ranges (for marking on calendar)
  const [predictedPeriodDates, setPredictedPeriodDates] = useState([]);
  const [fertileDates, setFertileDates] = useState([]);
  const [ovulationDate, setOvulationDate] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [dayOfCycle, setDayOfCycle] = useState(null);

  const loadAndCalculate = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dates, flow, moods, logs] = await Promise.all([
        getPeriodData(),
        getFlowData(),
        getMoodData(),
        getDailyLogs(),
      ]);

      setFlowData(flow || {});
      setMoodData(moods || {});
      setDailyLogs(logs || {});

      if (dates && dates.length >= 2) {
        const sortedDates = dates
          .map(d => new Date(d))
          .sort((a, b) => a - b);

        setPeriodDates(sortedDates);

        const avgCycleLength = calculateAverageCycleLength(sortedDates);
        setCycleLength(avgCycleLength);

        const avgPeriodLen = calculateAveragePeriodLength(sortedDates);
        setPeriodLength(avgPeriodLen);

        const lastPeriodStart = findLastPeriodStart(sortedDates);
        const prediction = predictNextPeriod(lastPeriodStart, avgCycleLength);

        setNextPeriodDate(formatDate(prediction.date));
        setNextPeriodDateStr(toDateString(prediction.date));
        setDaysUntilNextPeriod(prediction.daysUntil);

        // Calculate predicted period range
        const predictedRange = [];
        for (let i = 0; i < avgPeriodLen; i++) {
          const d = new Date(prediction.date);
          d.setDate(d.getDate() + i);
          predictedRange.push(toDateString(d));
        }
        setPredictedPeriodDates(predictedRange);

        // Calculate fertile window (typically days 10-16 of cycle, ovulation ~day 14)
        // Fertile = ovulation - 5 to ovulation + 1
        const ovDay = avgCycleLength - 14; // days after last period start
        const fertileStart = ovDay - 5;
        const fertileEnd = ovDay + 1;
        const fertileRange = [];
        let ovDateStr = null;

        for (let i = fertileStart; i <= fertileEnd; i++) {
          const d = new Date(lastPeriodStart);
          d.setDate(d.getDate() + i);
          const ds = toDateString(d);
          fertileRange.push(ds);
          if (i === ovDay) ovDateStr = ds;
        }

        // If fertile dates are in the past for this cycle, calculate for next cycle
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastFertileDateObj = new Date(fertileRange[fertileRange.length - 1]);
        if (lastFertileDateObj < today) {
          // Calculate for next cycle based on prediction
          const nextFertileRange = [];
          let nextOvDateStr = null;
          for (let i = fertileStart; i <= fertileEnd; i++) {
            const d = new Date(prediction.date);
            d.setDate(d.getDate() + i);
            const ds = toDateString(d);
            nextFertileRange.push(ds);
            if (i === ovDay) nextOvDateStr = ds;
          }
          setFertileDates(nextFertileRange);
          setOvulationDate(nextOvDateStr);
        } else {
          setFertileDates(fertileRange);
          setOvulationDate(ovDateStr);
        }

        // Calculate current phase
        const todayStr = toDateString(today);
        const daysSinceLastPeriod = Math.round((today - lastPeriodStart) / (1000 * 60 * 60 * 24));
        setDayOfCycle(daysSinceLastPeriod + 1);

        if (daysSinceLastPeriod < avgPeriodLen) {
          setCurrentPhase(CYCLE_PHASES.MENSTRUAL);
        } else if (daysSinceLastPeriod >= fertileStart && daysSinceLastPeriod <= fertileEnd) {
          if (daysSinceLastPeriod === ovDay) {
            setCurrentPhase(CYCLE_PHASES.OVULATION);
          } else {
            setCurrentPhase(CYCLE_PHASES.FERTILE);
          }
        } else if (daysSinceLastPeriod < fertileStart) {
          setCurrentPhase(CYCLE_PHASES.FOLLICULAR);
        } else {
          setCurrentPhase(CYCLE_PHASES.LUTEAL);
        }
      } else if (dates && dates.length === 1) {
        const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);
        setPeriodDates(sortedDates);

        // With a single date, assume defaults and still generate predictions
        const defaultCycle = 28;
        const defaultPeriod = 5;
        setCycleLength(defaultCycle);
        setPeriodLength(defaultPeriod);

        const lastPeriodStart = sortedDates[0];
        const prediction = predictNextPeriod(lastPeriodStart, defaultCycle);

        setNextPeriodDate(formatDate(prediction.date));
        setNextPeriodDateStr(toDateString(prediction.date));
        setDaysUntilNextPeriod(prediction.daysUntil);

        // Predicted period range
        const predictedRange = [];
        for (let i = 0; i < defaultPeriod; i++) {
          const d = new Date(prediction.date);
          d.setDate(d.getDate() + i);
          predictedRange.push(toDateString(d));
        }
        setPredictedPeriodDates(predictedRange);

        // Fertile window + ovulation (default cycle)
        const ovDay = defaultCycle - 14;
        const fertileStart = ovDay - 5;
        const fertileEnd = ovDay + 1;
        const fertileRange = [];
        let ovDateStr = null;

        for (let i = fertileStart; i <= fertileEnd; i++) {
          const d = new Date(lastPeriodStart);
          d.setDate(d.getDate() + i);
          const ds = toDateString(d);
          fertileRange.push(ds);
          if (i === ovDay) ovDateStr = ds;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastFertileDateObj = new Date(fertileRange[fertileRange.length - 1]);
        if (lastFertileDateObj < today) {
          const nextFertileRange = [];
          let nextOvDateStr = null;
          for (let i = fertileStart; i <= fertileEnd; i++) {
            const d = new Date(prediction.date);
            d.setDate(d.getDate() + i);
            const ds = toDateString(d);
            nextFertileRange.push(ds);
            if (i === ovDay) nextOvDateStr = ds;
          }
          setFertileDates(nextFertileRange);
          setOvulationDate(nextOvDateStr);
        } else {
          setFertileDates(fertileRange);
          setOvulationDate(ovDateStr);
        }

        // Current phase
        const daysSince = Math.round((today - lastPeriodStart) / (1000 * 60 * 60 * 24));
        setDayOfCycle(daysSince + 1);

        if (daysSince < defaultPeriod) {
          setCurrentPhase(CYCLE_PHASES.MENSTRUAL);
        } else if (daysSince >= fertileStart && daysSince <= fertileEnd) {
          setCurrentPhase(daysSince === ovDay ? CYCLE_PHASES.OVULATION : CYCLE_PHASES.FERTILE);
        } else if (daysSince < fertileStart) {
          setCurrentPhase(CYCLE_PHASES.FOLLICULAR);
        } else {
          setCurrentPhase(CYCLE_PHASES.LUTEAL);
        }
      }
    } catch (e) {
      console.warn('[CycleTracker] Error:', e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAndCalculate();
  }, [loadAndCalculate]);

  const calculateAverageCycleLength = (sortedDates) => {
    if (sortedDates.length < 2) return 28;
    const periodStarts = findPeriodStarts(sortedDates);
    if (periodStarts.length < 2) return 28;
    const cycleLengths = [];
    for (let i = 1; i < periodStarts.length; i++) {
      const diff = Math.round(
        (periodStarts[i] - periodStarts[i - 1]) / (1000 * 60 * 60 * 24)
      );
      if (diff >= 21 && diff <= 45) {
        cycleLengths.push(diff);
      }
    }
    if (cycleLengths.length === 0) return 28;
    return Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);
  };

  const calculateAveragePeriodLength = (sortedDates) => {
    if (sortedDates.length === 0) return 5;
    const periods = findPeriodGroups(sortedDates);
    if (periods.length === 0) return 5;
    const lengths = periods.map(p => p.length);
    return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  };

  const findPeriodGroups = (sortedDates) => {
    if (sortedDates.length === 0) return [];
    const groups = [[sortedDates[0]]];
    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays = Math.round(
        (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 2) {
        groups[groups.length - 1].push(sortedDates[i]);
      } else {
        groups.push([sortedDates[i]]);
      }
    }
    return groups;
  };

  const findPeriodStarts = (sortedDates) => {
    if (sortedDates.length === 0) return [];
    const periodStarts = [sortedDates[0]];
    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays = Math.round(
        (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 7) {
        periodStarts.push(sortedDates[i]);
      }
    }
    return periodStarts;
  };

  const findLastPeriodStart = (sortedDates) => {
    const periodStarts = findPeriodStarts(sortedDates);
    return periodStarts[periodStarts.length - 1];
  };

  const predictNextPeriod = (lastPeriodStart, avgCycleLength) => {
    const nextDate = new Date(lastPeriodStart);
    nextDate.setDate(nextDate.getDate() + avgCycleLength);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    while (nextDate <= today) {
      nextDate.setDate(nextDate.getDate() + avgCycleLength);
    }
    const daysUntil = Math.round((nextDate - today) / (1000 * 60 * 60 * 24));
    return { date: nextDate, daysUntil };
  };

  const formatDate = (date) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const toDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    periodDates,
    nextPeriodDate,
    nextPeriodDateStr,
    daysUntilNextPeriod,
    cycleLength,
    periodLength,
    isLoading,
    flowData,
    moodData,
    dailyLogs,
    predictedPeriodDates,
    fertileDates,
    ovulationDate,
    currentPhase,
    dayOfCycle,
    refresh: loadAndCalculate,
  };
}
