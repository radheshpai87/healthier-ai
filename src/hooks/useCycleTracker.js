import { useState, useEffect } from 'react';
import { getPeriodData } from '../utils/storage';

/**
 * Custom hook for cycle prediction without backend
 * Uses local data to predict next period date
 */
export function useCycleTracker() {
  const [periodDates, setPeriodDates] = useState([]);
  const [nextPeriodDate, setNextPeriodDate] = useState(null);
  const [daysUntilNextPeriod, setDaysUntilNextPeriod] = useState(null);
  const [cycleLength, setCycleLength] = useState(28); // Default cycle length
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAndCalculate();
  }, []);

  const loadAndCalculate = async () => {
    setIsLoading(true);
    const dates = await getPeriodData();
    
    if (dates && dates.length >= 2) {
      // Sort dates in chronological order
      const sortedDates = dates
        .map(d => new Date(d))
        .sort((a, b) => a - b);
      
      setPeriodDates(sortedDates);
      
      // Calculate average cycle length
      const avgCycleLength = calculateAverageCycleLength(sortedDates);
      setCycleLength(avgCycleLength);
      
      // Predict next period
      const lastPeriodStart = findLastPeriodStart(sortedDates);
      const prediction = predictNextPeriod(lastPeriodStart, avgCycleLength);
      
      setNextPeriodDate(formatDate(prediction.date));
      setDaysUntilNextPeriod(prediction.daysUntil);
    }
    
    setIsLoading(false);
  };

  /**
   * Calculate average cycle length from historical data
   * A cycle is measured from the first day of one period to the first day of the next
   */
  const calculateAverageCycleLength = (sortedDates) => {
    if (sortedDates.length < 2) return 28;

    // Find period start dates (first day of each period)
    const periodStarts = findPeriodStarts(sortedDates);
    
    if (periodStarts.length < 2) return 28;

    // Calculate cycle lengths between consecutive period starts
    const cycleLengths = [];
    for (let i = 1; i < periodStarts.length; i++) {
      const diff = Math.round(
        (periodStarts[i] - periodStarts[i - 1]) / (1000 * 60 * 60 * 24)
      );
      // Only consider reasonable cycle lengths (21-45 days)
      if (diff >= 21 && diff <= 45) {
        cycleLengths.push(diff);
      }
    }

    if (cycleLengths.length === 0) return 28;

    // Calculate average
    const sum = cycleLengths.reduce((a, b) => a + b, 0);
    return Math.round(sum / cycleLengths.length);
  };

  /**
   * Find the start date of each period
   * Consecutive days are grouped as one period
   */
  const findPeriodStarts = (sortedDates) => {
    if (sortedDates.length === 0) return [];

    const periodStarts = [sortedDates[0]];
    
    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays = Math.round(
        (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24)
      );
      // If more than 7 days gap, it's a new period
      if (diffDays > 7) {
        periodStarts.push(sortedDates[i]);
      }
    }

    return periodStarts;
  };

  /**
   * Find the most recent period start date
   */
  const findLastPeriodStart = (sortedDates) => {
    const periodStarts = findPeriodStarts(sortedDates);
    return periodStarts[periodStarts.length - 1];
  };

  /**
   * Predict the next period date
   */
  const predictNextPeriod = (lastPeriodStart, avgCycleLength) => {
    const nextDate = new Date(lastPeriodStart);
    nextDate.setDate(nextDate.getDate() + avgCycleLength);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    // If predicted date is in the past, add another cycle
    while (nextDate <= today) {
      nextDate.setDate(nextDate.getDate() + avgCycleLength);
    }

    const daysUntil = Math.round((nextDate - today) / (1000 * 60 * 60 * 24));

    return {
      date: nextDate,
      daysUntil,
    };
  };

  /**
   * Format date for display
   */
  const formatDate = (date) => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return {
    periodDates,
    nextPeriodDate,
    daysUntilNextPeriod,
    cycleLength,
    isLoading,
    refresh: loadAndCalculate,
  };
}
