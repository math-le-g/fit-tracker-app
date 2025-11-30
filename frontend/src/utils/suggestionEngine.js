/**
 * 🧠 MOTEUR DE SUGGESTIONS INTELLIGENT
 * Analyse les performances sur plusieurs séances pour suggérer la progression optimale
 */

// Nombre de séances à analyser
const SESSIONS_TO_ANALYZE = 5;

// Seuils de progression
const THRESHOLDS = {
  MIN_REPS_SUCCESS: 8,        // Minimum de reps pour considérer une série réussie
  TARGET_REPS: 12,            // Objectif de reps avant d'augmenter le poids
  WEIGHT_INCREMENT: 2.5,      // Incrément de poids standard (kg)
  WEIGHT_INCREMENT_HEAVY: 5,  // Incrément pour exercices lourds (kg)
  STAGNATION_SESSIONS: 3,     // Nb de séances similaires = stagnation
  DELOAD_PERCENTAGE: 0.9,     // 90% du poids pour deload
};

// Exercices considérés comme "lourds" (incréments de 5kg)
const HEAVY_EXERCISES = [
  'soulevé de terre',
  'squat',
  'développé couché',
  'rowing barre',
  'hip thrust',
  'presse à cuisses',
];

/**
 * Analyse l'historique des performances et génère une suggestion
 * @param {Array} sessions - Tableau des dernières séances [{date, sets: [{weight, reps}]}]
 * @param {number} currentSetNumber - Numéro de la série actuelle (1, 2, 3...)
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {Object} Suggestion avec type, poids, reps et message
 */
export function analyzeAndSuggest(sessions, currentSetNumber, exerciseName = '') {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  // Récupérer les données de la série correspondante pour chaque séance
  const setHistory = sessions.map(session => {
    const set = session.sets.find(s => s.set_number === currentSetNumber) || session.sets[0];
    return {
      date: session.date,
      weight: set?.weight || 0,
      reps: set?.reps || 0,
    };
  }).filter(s => s.weight > 0);

  if (setHistory.length === 0) {
    return null;
  }

  // Calculer les statistiques
  const stats = calculateStats(setHistory);
  
  // Détecter la tendance
  const trend = detectTrend(setHistory);
  
  // Déterminer l'incrément de poids approprié
  const isHeavyExercise = HEAVY_EXERCISES.some(ex => 
    exerciseName.toLowerCase().includes(ex.toLowerCase())
  );
  const weightIncrement = isHeavyExercise ? THRESHOLDS.WEIGHT_INCREMENT_HEAVY : THRESHOLDS.WEIGHT_INCREMENT;

  // Générer la suggestion basée sur la tendance
  return generateSuggestion(stats, trend, weightIncrement, setHistory);
}

/**
 * Calcule les statistiques sur l'historique
 */
function calculateStats(setHistory) {
  const weights = setHistory.map(s => s.weight);
  const reps = setHistory.map(s => s.reps);
  
  return {
    avgWeight: weights.reduce((a, b) => a + b, 0) / weights.length,
    avgReps: reps.reduce((a, b) => a + b, 0) / reps.length,
    maxWeight: Math.max(...weights),
    maxReps: Math.max(...reps),
    minReps: Math.min(...reps),
    lastWeight: weights[0],
    lastReps: reps[0],
    // Taux de réussite (séries >= 8 reps)
    successRate: reps.filter(r => r >= THRESHOLDS.MIN_REPS_SUCCESS).length / reps.length,
    // Variance des poids (pour détecter les changements)
    weightVariance: calculateVariance(weights),
    // Variance des reps
    repsVariance: calculateVariance(reps),
  };
}

/**
 * Calcule la variance d'un tableau de nombres
 */
function calculateVariance(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
}

/**
 * Détecte la tendance de progression
 * @returns {'progression' | 'stagnation' | 'regression' | 'new_weight' | 'inconsistent'}
 */
function detectTrend(setHistory) {
  if (setHistory.length < 2) {
    return 'insufficient_data';
  }

  const recent = setHistory.slice(0, 3); // 3 dernières séances
  
  // Vérifier si le poids a changé récemment
  const weights = recent.map(s => s.weight);
  const uniqueWeights = [...new Set(weights)];
  
  if (uniqueWeights.length > 1 && weights[0] > weights[1]) {
    // Le poids vient d'augmenter
    return 'new_weight';
  }

  // Vérifier la progression des reps
  const reps = recent.map(s => s.reps);
  
  // Progression : chaque séance mieux que la précédente
  let isProgressing = true;
  let isRegressing = true;
  let isStagnant = true;
  
  for (let i = 0; i < reps.length - 1; i++) {
    if (reps[i] <= reps[i + 1]) isProgressing = false;
    if (reps[i] >= reps[i + 1]) isRegressing = false;
    if (Math.abs(reps[i] - reps[i + 1]) > 1) isStagnant = false;
  }

  // Vérifier stagnation prolongée (3+ séances similaires)
  if (setHistory.length >= THRESHOLDS.STAGNATION_SESSIONS) {
    const recentSets = setHistory.slice(0, THRESHOLDS.STAGNATION_SESSIONS);
    const allSameWeight = recentSets.every(s => s.weight === recentSets[0].weight);
    const repsVariance = calculateVariance(recentSets.map(s => s.reps));
    
    if (allSameWeight && repsVariance < 1) {
      return 'stagnation';
    }
  }

  if (isProgressing) return 'progression';
  if (isRegressing) return 'regression';
  if (isStagnant) return 'stagnation';
  
  return 'inconsistent';
}

/**
 * Génère la suggestion finale
 */
function generateSuggestion(stats, trend, weightIncrement, setHistory) {
  const { lastWeight, lastReps, avgReps, successRate, maxReps } = stats;
  
  let suggestion = {
    weight: lastWeight,
    reps: lastReps,
    type: 'maintain',
    message: '',
    emoji: '💪',
    trend: trend,
    confidence: 'medium',
  };

  switch (trend) {
    case 'progression':
      // En progression - continuer à pousser
      if (lastReps >= THRESHOLDS.TARGET_REPS && successRate >= 0.8) {
        // Prêt pour augmenter le poids
        suggestion = {
          weight: lastWeight + weightIncrement,
          reps: THRESHOLDS.MIN_REPS_SUCCESS,
          type: 'increase_weight',
          message: `Tu progresses bien ! Prêt pour +${weightIncrement}kg`,
          emoji: '🚀',
          trend,
          confidence: 'high',
        };
      } else {
        // Continuer à augmenter les reps
        suggestion = {
          weight: lastWeight,
          reps: Math.min(lastReps + 1, 15),
          type: 'increase_reps',
          message: 'Continue ta progression, vise +1 rep',
          emoji: '📈',
          trend,
          confidence: 'high',
        };
      }
      break;

    case 'stagnation':
      // Stagnation détectée - proposer des options
      if (avgReps >= THRESHOLDS.TARGET_REPS - 1) {
        // Proche de l'objectif - micro-progression
        suggestion = {
          weight: lastWeight + weightIncrement,
          reps: THRESHOLDS.MIN_REPS_SUCCESS,
          type: 'break_plateau',
          message: 'Stagnation détectée - tente une micro-progression',
          emoji: '💡',
          trend,
          confidence: 'medium',
        };
      } else if (successRate < 0.7) {
        // Taux de réussite faible - deload
        suggestion = {
          weight: Math.round(lastWeight * THRESHOLDS.DELOAD_PERCENTAGE * 2) / 2,
          reps: 10,
          type: 'deload',
          message: 'Récupération recommandée - léger deload',
          emoji: '🔄',
          trend,
          confidence: 'medium',
        };
      } else {
        // Maintenir et pousser les reps
        suggestion = {
          weight: lastWeight,
          reps: lastReps + 1,
          type: 'push_reps',
          message: 'Stagnation - pousse les reps avant d\'augmenter',
          emoji: '💪',
          trend,
          confidence: 'medium',
        };
      }
      break;

    case 'regression':
      // Régression - analyser la cause
      if (successRate < 0.5) {
        // Gros problème - réduire
        suggestion = {
          weight: Math.round(lastWeight * 0.9 * 2) / 2,
          reps: 10,
          type: 'reduce',
          message: 'Performance en baisse - récupère avec moins',
          emoji: '⚠️',
          trend,
          confidence: 'high',
        };
      } else {
        // Maintenir pour récupérer
        suggestion = {
          weight: lastWeight,
          reps: lastReps,
          type: 'maintain',
          message: 'Maintiens pour consolider',
          emoji: '🎯',
          trend,
          confidence: 'medium',
        };
      }
      break;

    case 'new_weight':
      // Vient d'augmenter le poids - consolider
      suggestion = {
        weight: lastWeight,
        reps: lastReps,
        type: 'consolidate',
        message: 'Nouvelle charge - consolide avant de progresser',
        emoji: '🎯',
        trend,
        confidence: 'high',
      };
      break;

    case 'inconsistent':
      // Performances variables - suggérer stabilité
      suggestion = {
        weight: lastWeight,
        reps: Math.round(avgReps),
        type: 'stabilize',
        message: 'Performances variables - vise la régularité',
        emoji: '📊',
        trend,
        confidence: 'low',
      };
      break;

    default:
      // Données insuffisantes - reproduire
      suggestion = {
        weight: lastWeight,
        reps: lastReps,
        type: 'repeat',
        message: 'Reproduis ta dernière perf',
        emoji: '🔁',
        trend,
        confidence: 'low',
      };
  }

  return suggestion;
}

/**
 * Formate la suggestion pour l'affichage
 */
export function formatSuggestionMessage(suggestion) {
  if (!suggestion) return null;
  
  const trendLabels = {
    'progression': '📈 En progression',
    'stagnation': '➡️ Stagnation',
    'regression': '📉 En baisse',
    'new_weight': '🆕 Nouvelle charge',
    'inconsistent': '📊 Variable',
    'insufficient_data': '🆕 Nouvelles données',
  };

  return {
    primary: `${suggestion.weight}kg × ${suggestion.reps}`,
    message: suggestion.message,
    emoji: suggestion.emoji,
    trendLabel: trendLabels[suggestion.trend] || '',
    type: suggestion.type,
  };
}

/**
 * Charge l'historique des séances pour un exercice
 * @param {Object} db - Instance de la base de données
 * @param {number} exerciseId - ID de l'exercice
 * @param {number} routineId - ID de la routine (optionnel)
 * @param {number} limit - Nombre de séances à charger
 */
export async function loadPerformanceHistory(db, exerciseId, routineId = null, limit = SESSIONS_TO_ANALYZE) {
  try {
    const routineFilter = routineId ? 'AND w.routine_id = ?' : '';
    const params = routineId ? [exerciseId, routineId, limit] : [exerciseId, limit];
    
    // Récupérer les derniers workouts
    const workouts = await db.getAllAsync(`
      SELECT DISTINCT w.id, w.date
      FROM workouts w
      JOIN sets s ON s.workout_id = w.id
      WHERE s.exercise_id = ?
      ${routineFilter}
      ORDER BY w.date DESC
      LIMIT ?
    `, params);

    if (workouts.length === 0) {
      return [];
    }

    // Pour chaque workout, récupérer les sets
    const sessions = [];
    for (const workout of workouts) {
      const sets = await db.getAllAsync(`
        SELECT set_number, weight, reps
        FROM sets
        WHERE workout_id = ? AND exercise_id = ?
        ORDER BY set_number ASC
      `, [workout.id, exerciseId]);

      sessions.push({
        date: workout.date,
        workoutId: workout.id,
        sets: sets,
      });
    }

    return sessions;
  } catch (error) {
    console.error('❌ Erreur chargement historique:', error);
    return [];
  }
}

export default {
  analyzeAndSuggest,
  formatSuggestionMessage,
  loadPerformanceHistory,
  THRESHOLDS,
};