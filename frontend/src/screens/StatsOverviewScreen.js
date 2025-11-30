import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function StatsOverviewScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const [workoutStats, setWorkoutStats] = useState(null);
  const [runStats, setRunStats] = useState(null);
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutDates, setWorkoutDates] = useState([]);
  const [runDates, setRunDates] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [routinesStats, setRoutinesStats] = useState([]);
  const [expandedRoutine, setExpandedRoutine] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [period, currentMonth])
  );

  const loadAllData = async () => {
    await Promise.all([
      loadStats(),
      loadCalendarData(),
      loadProgressData(),
      loadRoutinesStats()
    ]);
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let previousStartDate = new Date();
    let previousEndDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
      previousEndDate = new Date(startDate);
      previousStartDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
      previousEndDate = new Date(startDate);
      previousStartDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
      previousEndDate = new Date(startDate);
      previousStartDate.setFullYear(startDate.getFullYear() - 1);
    }

    return { startDate, previousStartDate, previousEndDate };
  };

  const loadStats = async () => {
    try {
      const userData = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      setUser(userData);

      const { startDate } = getDateRange();

      const workouts = await db.getAllAsync(
        'SELECT * FROM workouts WHERE date > ?',
        [startDate.toISOString()]
      );

      const sets = await db.getAllAsync(
        'SELECT s.* FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE w.date > ?',
        [startDate.toISOString()]
      );

      const totalVolume = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
      const totalSets = sets.length;
      const totalWorkoutDuration = workouts.reduce((sum, w) => sum + (w.workout_duration || 0), 0);
      const avgDuration = workouts.length > 0 ? Math.round(totalWorkoutDuration / workouts.length) : 0;

      setWorkoutStats({
        count: workouts.length,
        sets: totalSets,
        volume: totalVolume,
        workoutTime: totalWorkoutDuration,
        avgDuration
      });

      const runs = await db.getAllAsync(
        'SELECT * FROM runs WHERE date > ?',
        [startDate.toISOString()]
      );

      const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
      const totalRunDuration = runs.reduce((sum, r) => sum + r.duration, 0);
      const avgPace = runs.length > 0 ? runs.reduce((sum, r) => sum + r.pace, 0) / runs.length : 0;

      setRunStats({
        count: runs.length,
        distance: totalDistance,
        duration: totalRunDuration,
        avgPace
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadCalendarData = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const workouts = await db.getAllAsync(
        'SELECT date FROM workouts WHERE date >= ? AND date <= ?',
        [startOfMonth.toISOString(), endOfMonth.toISOString()]
      );

      const runs = await db.getAllAsync(
        'SELECT date FROM runs WHERE date >= ? AND date <= ?',
        [startOfMonth.toISOString(), endOfMonth.toISOString()]
      );

      setWorkoutDates(workouts.map(w => new Date(w.date).toDateString()));
      setRunDates(runs.map(r => new Date(r.date).toDateString()));
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
    }
  };

  const loadProgressData = async () => {
    try {
      const exercises = await db.getAllAsync(`
        SELECT 
          e.id,
          e.name,
          MAX(s.weight) as max_weight,
          COUNT(DISTINCT w.id) as session_count
        FROM exercises e
        JOIN sets s ON e.id = s.exercise_id
        JOIN workouts w ON s.workout_id = w.id
        WHERE w.date >= datetime('now', '-30 days')
        GROUP BY e.id
        ORDER BY session_count DESC
        LIMIT 3
      `);

      setProgressData(exercises);
    } catch (error) {
      console.error('Erreur chargement progression:', error);
    }
  };

  const loadRoutinesStats = async () => {
    try {
      const { startDate, previousStartDate, previousEndDate } = getDateRange();

      // Charger toutes les routines
      const routines = await db.getAllAsync('SELECT * FROM routines ORDER BY name ASC');

      const routinesWithStats = await Promise.all(routines.map(async (routine) => {
        // Stats de la période actuelle
        const workouts = await db.getAllAsync(`
          SELECT w.*, 
            (SELECT SUM(weight * reps) FROM sets WHERE workout_id = w.id) as volume
          FROM workouts w
          WHERE w.routine_id = ? AND w.date > ?
          ORDER BY w.date DESC
        `, [routine.id, startDate.toISOString()]);

        const totalVolume = workouts.reduce((sum, w) => sum + (w.volume || 0), 0);
        const totalDuration = workouts.reduce((sum, w) => sum + (w.workout_duration || 0), 0);
        const avgDuration = workouts.length > 0 ? Math.round(totalDuration / workouts.length) : 0;

        // Dernier entraînement
        const lastWorkout = await db.getFirstAsync(`
          SELECT date FROM workouts WHERE routine_id = ? ORDER BY date DESC LIMIT 1
        `, [routine.id]);

        let daysAgo = null;
        if (lastWorkout) {
          const lastDate = new Date(lastWorkout.date);
          const today = new Date();
          daysAgo = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        }

        // Charger les exercices de la routine avec leurs records
        const exercisesRecords = await loadRoutineExercisesRecords(routine.id, startDate, previousStartDate, previousEndDate);

        return {
          ...routine,
          sessionCount: workouts.length,
          totalVolume,
          avgDuration,
          daysAgo,
          exercisesRecords
        };
      }));

      setRoutinesStats(routinesWithStats);
    } catch (error) {
      console.error('Erreur chargement routines stats:', error);
    }
  };

  const loadRoutineExercisesRecords = async (routineId, startDate, previousStartDate, previousEndDate) => {
    try {
      // Charger les exercices de la routine
      const routineExercises = await db.getAllAsync(`
        SELECT re.*, e.name, e.id as exercise_id, re.superset_data
        FROM routine_exercises re
        LEFT JOIN exercises e ON re.exercise_id = e.id
        WHERE re.routine_id = ?
        ORDER BY re.order_index ASC
      `, [routineId]);

      const records = [];

      for (const re of routineExercises) {
        // Si c'est un superset/dropset/timed (stocké dans superset_data)
        if (re.superset_data) {
          try {
            const data = JSON.parse(re.superset_data);
            
            if (data.type === 'superset') {
              // SUPERSET : charger les records de chaque exercice
              const supersetRecords = [];
              for (const ex of data.exercises) {
                const record = await getExerciseRecord(ex.id, routineId, startDate, previousStartDate, previousEndDate);
                if (record) {
                  supersetRecords.push({ ...record, name: ex.name });
                }
              }
              if (supersetRecords.length > 0) {
                records.push({
                  type: 'superset',
                  exercises: supersetRecords
                });
              }
            } else if (data.type === 'dropset') {
              // DROPSET : charger les records du drop set
              const dropsetRecord = await getDropsetRecord(data.exercise.id, routineId, startDate, previousStartDate, previousEndDate);
              if (dropsetRecord) {
                records.push({
                  type: 'dropset',
                  name: data.exercise.name,
                  ...dropsetRecord
                });
              }
            } else if (data.type === 'timed') {
              // TIMED : charger le record de durée
              const timedRecord = await getTimedRecord(data.exercise.id, routineId, startDate, previousStartDate, previousEndDate);
              if (timedRecord) {
                records.push({
                  type: 'timed',
                  name: data.exercise.name,
                  ...timedRecord
                });
              }
            }
          } catch (e) {
            console.error('Erreur parsing superset_data:', e);
          }
        } else if (re.exercise_id) {
          // Exercice normal
          const record = await getExerciseRecord(re.exercise_id, routineId, startDate, previousStartDate, previousEndDate);
          if (record) {
            records.push({
              type: 'normal',
              name: re.name,
              ...record
            });
          }
        }
      }

      return records;
    } catch (error) {
      console.error('Erreur chargement records routine:', error);
      return [];
    }
  };

  const getExerciseRecord = async (exerciseId, routineId, startDate, previousStartDate, previousEndDate) => {
    try {
      // Record période actuelle
      const currentRecord = await db.getFirstAsync(`
        SELECT s.weight, s.reps, w.date
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ? 
          AND w.routine_id = ?
          AND w.date > ?
          AND s.is_timed = 0
          AND s.dropset_id IS NULL
        ORDER BY s.weight DESC, s.reps DESC
        LIMIT 1
      `, [exerciseId, routineId, startDate.toISOString()]);

      if (!currentRecord) return null;

      // Record période précédente
      const previousRecord = await db.getFirstAsync(`
        SELECT MAX(s.weight) as weight
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
          AND w.routine_id = ?
          AND w.date > ?
          AND w.date <= ?
          AND s.is_timed = 0
          AND s.dropset_id IS NULL
      `, [exerciseId, routineId, previousStartDate.toISOString(), previousEndDate.toISOString()]);

      let progression = null;
      let progressionType = 'new';

      if (previousRecord && previousRecord.weight) {
        const diff = currentRecord.weight - previousRecord.weight;
        if (diff > 0) {
          progression = `+${diff} kg`;
          progressionType = 'up';
        } else if (diff < 0) {
          progression = `${diff} kg`;
          progressionType = 'down';
        } else {
          progression = '=';
          progressionType = 'same';
        }
      }

      return {
        weight: currentRecord.weight,
        reps: currentRecord.reps,
        date: currentRecord.date,
        progression,
        progressionType
      };
    } catch (error) {
      console.error('Erreur getExerciseRecord:', error);
      return null;
    }
  };

  const getDropsetRecord = async (exerciseId, routineId, startDate, previousStartDate, previousEndDate) => {
    try {
      // Trouver le meilleur dropset (par poids de départ)
      const dropsets = await db.getAllAsync(`
        SELECT s.dropset_id, s.weight, s.reps, s.set_number, w.date
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
          AND w.routine_id = ?
          AND w.date > ?
          AND s.dropset_id IS NOT NULL
        ORDER BY w.date DESC, s.set_number ASC
      `, [exerciseId, routineId, startDate.toISOString()]);

      if (dropsets.length === 0) return null;

      // Grouper par dropset_id
      const groupedDropsets = {};
      dropsets.forEach(d => {
        if (!groupedDropsets[d.dropset_id]) {
          groupedDropsets[d.dropset_id] = {
            sets: [],
            date: d.date,
            maxWeight: 0
          };
        }
        groupedDropsets[d.dropset_id].sets.push(d);
        if (d.weight > groupedDropsets[d.dropset_id].maxWeight) {
          groupedDropsets[d.dropset_id].maxWeight = d.weight;
        }
      });

      // Trouver le meilleur dropset (poids max le plus élevé)
      let bestDropset = null;
      let bestMaxWeight = 0;
      Object.values(groupedDropsets).forEach(ds => {
        if (ds.maxWeight > bestMaxWeight) {
          bestMaxWeight = ds.maxWeight;
          bestDropset = ds;
        }
      });

      if (!bestDropset) return null;

      // Trier les sets par set_number pour avoir l'ordre des drops
      bestDropset.sets.sort((a, b) => a.set_number - b.set_number);
      
      // Prendre uniquement les drops d'une série (les 2-4 premiers drops consécutifs)
      const dropsPerRound = Math.min(4, bestDropset.sets.length);
      const weights = bestDropset.sets.slice(0, dropsPerRound).map(s => s.weight);

      // Record période précédente
      const previousRecord = await db.getFirstAsync(`
        SELECT MAX(s.weight) as weight
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
          AND w.routine_id = ?
          AND w.date > ?
          AND w.date <= ?
          AND s.dropset_id IS NOT NULL
      `, [exerciseId, routineId, previousStartDate.toISOString(), previousEndDate.toISOString()]);

      let progression = null;
      let progressionType = 'new';

      if (previousRecord && previousRecord.weight) {
        const diff = bestMaxWeight - previousRecord.weight;
        if (diff > 0) {
          progression = `+${diff} kg`;
          progressionType = 'up';
        } else if (diff < 0) {
          progression = `${diff} kg`;
          progressionType = 'down';
        } else {
          progression = '=';
          progressionType = 'same';
        }
      }

      return {
        weights,
        date: bestDropset.date,
        progression,
        progressionType
      };
    } catch (error) {
      console.error('Erreur getDropsetRecord:', error);
      return null;
    }
  };

  const getTimedRecord = async (exerciseId, routineId, startDate, previousStartDate, previousEndDate) => {
    try {
      // Record période actuelle (reps = durée en secondes pour les timed)
      const currentRecord = await db.getFirstAsync(`
        SELECT s.reps as duration, w.date
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
          AND w.routine_id = ?
          AND w.date > ?
          AND s.is_timed = 1
        ORDER BY s.reps DESC
        LIMIT 1
      `, [exerciseId, routineId, startDate.toISOString()]);

      if (!currentRecord) return null;

      // Record période précédente
      const previousRecord = await db.getFirstAsync(`
        SELECT MAX(s.reps) as duration
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
          AND w.routine_id = ?
          AND w.date > ?
          AND w.date <= ?
          AND s.is_timed = 1
      `, [exerciseId, routineId, previousStartDate.toISOString(), previousEndDate.toISOString()]);

      let progression = null;
      let progressionType = 'new';

      if (previousRecord && previousRecord.duration) {
        const diff = currentRecord.duration - previousRecord.duration;
        if (diff > 0) {
          progression = `+${diff} sec`;
          progressionType = 'up';
        } else if (diff < 0) {
          progression = `${diff} sec`;
          progressionType = 'down';
        } else {
          progression = '=';
          progressionType = 'same';
        }
      }

      return {
        duration: currentRecord.duration,
        date: currentRecord.date,
        progression,
        progressionType
      };
    } catch (error) {
      console.error('Erreur getTimedRecord:', error);
      return null;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0min';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${mins}min`;
    }
    return `${mins}min`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} min ${secs > 0 ? secs + ' sec' : ''}`;
    }
    return `${secs} sec`;
  };

  const formatPace = (paceInSeconds) => {
    if (!paceInSeconds) return '--:--';
    const mins = Math.floor(paceInSeconds / 60);
    const secs = Math.round(paceInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    return `${day} ${months[date.getMonth()]}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'CETTE SEMAINE';
      case 'month': return 'CE MOIS';
      case 'year': return 'CETTE ANNÉE';
      default: return 'CE MOIS';
    }
  };

  const getPeriodLabelShort = () => {
    switch (period) {
      case 'week': return 'semaine dernière';
      case 'month': return 'mois dernier';
      case 'year': return 'année dernière';
      default: return 'mois dernier';
    }
  };

  // Calendrier
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const getDayActivity = (day) => {
    if (!day) return null;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateString = date.toDateString();
    const hasWorkout = workoutDates.includes(dateString);
    const hasRun = runDates.includes(dateString);
    if (hasWorkout && hasRun) return 'both';
    if (hasWorkout) return 'workout';
    if (hasRun) return 'run';
    return null;
  };

  const changeMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const toggleRoutine = (routineId) => {
    setExpandedRoutine(expandedRoutine === routineId ? null : routineId);
  };

  const getProgressionColor = (type) => {
    switch (type) {
      case 'up': return '#00ff88';
      case 'down': return '#ff4444';
      case 'same': return '#6b7280';
      case 'new': return '#00f5ff';
      default: return '#6b7280';
    }
  };

  const getProgressionIcon = (type) => {
    switch (type) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'same': return '';
      case 'new': return '🆕';
      default: return '';
    }
  };

  if (!workoutStats || !runStats || !user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white' }}>Chargement...</Text>
      </View>
    );
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  // Composant pour afficher un record d'exercice normal
  const renderNormalRecord = (record, index) => (
    <View key={index} style={{
      backgroundColor: 'rgba(0, 255, 136, 0.1)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#00ff88'
    }}>
      <Text style={{ color: '#f5f5f0', fontWeight: 'bold', marginBottom: 4 }}>
        💪 {record.name}
      </Text>
      <Text style={{ color: '#a8a8a0', fontSize: 14 }}>
        {record.weight} kg × {record.reps} reps
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: getProgressionColor(record.progressionType), fontSize: 12 }}>
          {getProgressionIcon(record.progressionType)} {record.progression || '🆕 Nouveau record'}
          {record.progression && record.progressionType !== 'same' && record.progressionType !== 'new' ? ` vs ${getPeriodLabelShort()}` : ''}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>
          • {formatDate(record.date)}
        </Text>
      </View>
    </View>
  );

  // Composant pour afficher un superset
  const renderSupersetRecord = (record, index) => (
    <View key={index} style={{
      backgroundColor: 'rgba(0, 245, 255, 0.1)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#00f5ff'
    }}>
      <Text style={{ color: '#00f5ff', fontWeight: 'bold', marginBottom: 8, fontSize: 12 }}>
        ⚡ SUPERSET
      </Text>
      {record.exercises.map((ex, exIndex) => (
        <View key={exIndex} style={{ 
          marginBottom: exIndex < record.exercises.length - 1 ? 8 : 0,
          paddingBottom: exIndex < record.exercises.length - 1 ? 8 : 0,
          borderBottomWidth: exIndex < record.exercises.length - 1 ? 1 : 0,
          borderBottomColor: 'rgba(0, 245, 255, 0.2)'
        }}>
          <Text style={{ color: '#f5f5f0', fontWeight: '600', marginBottom: 2 }}>
            {exIndex === 0 ? '①' : exIndex === 1 ? '②' : exIndex === 2 ? '③' : '④'} {ex.name}
          </Text>
          <Text style={{ color: '#a8a8a0', fontSize: 14, marginLeft: 20 }}>
            {ex.weight} kg × {ex.reps} reps
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginLeft: 20 }}>
            <Text style={{ color: getProgressionColor(ex.progressionType), fontSize: 12 }}>
              {getProgressionIcon(ex.progressionType)} {ex.progression || '🆕 Nouveau'}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>
              • {formatDate(ex.date)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  // Composant pour afficher un dropset
  const renderDropsetRecord = (record, index) => (
    <View key={index} style={{
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b'
    }}>
      <Text style={{ color: '#f5f5f0', fontWeight: 'bold', marginBottom: 4 }}>
        🔻 {record.name}
      </Text>
      <Text style={{ color: '#f59e0b', fontSize: 12, marginBottom: 4 }}>
        DROP SET
      </Text>
      <Text style={{ color: '#a8a8a0', fontSize: 14 }}>
        💪 {record.weights.join(' kg → ')} kg
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: getProgressionColor(record.progressionType), fontSize: 12 }}>
          {getProgressionIcon(record.progressionType)} {record.progression || '🆕 Nouveau record'}
          {record.progression && record.progressionType !== 'same' && record.progressionType !== 'new' ? ` vs ${getPeriodLabelShort()}` : ''}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>
          • {formatDate(record.date)}
        </Text>
      </View>
    </View>
  );

  // Composant pour afficher un exercice chronométré
  const renderTimedRecord = (record, index) => (
    <View key={index} style={{
      backgroundColor: 'rgba(168, 85, 247, 0.1)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#a855f7'
    }}>
      <Text style={{ color: '#f5f5f0', fontWeight: 'bold', marginBottom: 4 }}>
        ⏱️ {record.name}
      </Text>
      <Text style={{ color: '#a855f7', fontSize: 12, marginBottom: 4 }}>
        CHRONOMÉTRÉ
      </Text>
      <Text style={{ color: '#a8a8a0', fontSize: 14 }}>
        Record : {formatDuration(record.duration)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: getProgressionColor(record.progressionType), fontSize: 12 }}>
          {getProgressionIcon(record.progressionType)} {record.progression || '🆕 Nouveau record'}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 12, marginLeft: 8 }}>
          • {formatDate(record.date)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0a1628' }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Sous-titre */}
          <Text style={{ color: '#a8a8a0', fontSize: 16, marginBottom: 24 }}>
            Aperçu de tes performances
          </Text>

          {/* Filtres période */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            {['week', 'month', 'year'].map((p) => (
              <TouchableOpacity
                key={p}
                style={{
                  flex: 1,
                  backgroundColor: period === p ? 'rgba(0, 245, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: period === p ? 'rgba(0, 245, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'
                }}
                onPress={() => setPeriod(p)}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: period === p ? '#00f5ff' : '#a8a8a0'
                }}>
                  {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats rapides */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <Text style={{ color: '#a8a8a0', fontSize: 14, marginBottom: 12 }}>
              📅 {getPeriodLabel()}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Niveau</Text>
                <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold' }}>⭐ {user.level}</Text>
              </View>
              <View>
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Streak</Text>
                <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold' }}>🔥 {user.streak}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>XP</Text>
                <Text style={{ color: '#00f5ff', fontSize: 18, fontWeight: 'bold' }}>{user.xp}</Text>
              </View>
            </View>
          </View>

          {/* Calendrier d'activité */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={24} color="#00f5ff" />
              </TouchableOpacity>
              <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold' }}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={24} color="#00f5ff" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {dayNames.map((day, index) => (
                <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: 'bold' }}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {getDaysInMonth().map((day, index) => {
                const activity = getDayActivity(day);
                return (
                  <View
                    key={index}
                    style={{
                      width: `${100 / 7}%`,
                      aspectRatio: 1,
                      padding: 2,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {day ? (
                      <View style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 8,
                        backgroundColor: 
                          activity === 'both' ? '#d4af37' :
                          activity === 'workout' ? '#00f5ff' :
                          activity === 'run' ? '#b026ff' :
                          'rgba(255, 255, 255, 0.05)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{ 
                          color: activity ? '#0a0e27' : '#6b7280', 
                          fontSize: 12,
                          fontWeight: activity ? 'bold' : 'normal'
                        }}>
                          {day}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#00f5ff', marginRight: 4 }} />
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Muscu</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#b026ff', marginRight: 4 }} />
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Course</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#d4af37', marginRight: 4 }} />
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Les deux</Text>
              </View>
            </View>
          </View>

          {/* Progression récente */}
          <View style={{
            backgroundColor: 'rgba(0, 245, 255, 0.1)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(0, 245, 255, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="trending-up" size={24} color="#00f5ff" />
              <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold', marginLeft: 12 }}>
                📈 PROGRESSION (30 jours)
              </Text>
            </View>
            {progressData.length > 0 ? (
              progressData.map(ex => (
                <View key={ex.id} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#f5f5f0', fontWeight: '600' }}>{ex.name}</Text>
                    <Text style={{ color: '#00ff88', fontWeight: 'bold' }}>{ex.max_weight} kg</Text>
                  </View>
                  <Text style={{ color: '#a8a8a0', fontSize: 12 }}>
                    {ex.session_count} séances
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#a8a8a0' }}>Commence à t'entraîner pour voir ta progression !</Text>
            )}
          </View>

          {/* Stats Musculation */}
          <View style={{
            backgroundColor: 'rgba(0, 245, 255, 0.1)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(0, 245, 255, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="barbell" size={24} color="#00f5ff" />
              <Text style={{ color: '#f5f5f0', fontSize: 20, fontWeight: 'bold', marginLeft: 12 }}>
                💪 MUSCULATION
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Séances :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{workoutStats.count}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Séries totales :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{workoutStats.sets}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Volume total :</Text>
              <Text style={{ color: '#00ff88', fontWeight: 'bold' }}>{workoutStats.volume.toLocaleString()} kg</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Temps total :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{formatTime(workoutStats.workoutTime)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a8a8a0' }}>• Durée moyenne :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>~{formatTime(workoutStats.avgDuration)}</Text>
            </View>
          </View>

          {/* MES ROUTINES */}
          <View style={{
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="list" size={24} color="#d4af37" />
              <Text style={{ color: '#f5f5f0', fontSize: 20, fontWeight: 'bold', marginLeft: 12 }}>
                📋 MES ROUTINES
              </Text>
            </View>

            {routinesStats.length > 0 ? (
              routinesStats.map((routine) => (
                <View key={routine.id} style={{ marginBottom: 12 }}>
                  {/* En-tête routine (cliquable) */}
                  <TouchableOpacity
                    onPress={() => toggleRoutine(routine.id)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: expandedRoutine === routine.id ? 'rgba(212, 175, 55, 0.5)' : 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#f5f5f0', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                          💪 {routine.name}
                        </Text>
                        <Text style={{ color: '#a8a8a0', fontSize: 13 }}>
                          {routine.sessionCount} séances • 📦 {routine.totalVolume.toLocaleString()} kg
                        </Text>
                      </View>
                      <Ionicons 
                        name={expandedRoutine === routine.id ? 'chevron-up' : 'chevron-down'} 
                        size={24} 
                        color="#d4af37" 
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Contenu déplié */}
                  {expandedRoutine === routine.id && (
                    <View style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 16,
                      padding: 16,
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    }}>
                      {/* Stats routine */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View>
                          <Text style={{ color: '#a8a8a0', fontSize: 12 }}>⏱️ Durée moy</Text>
                          <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>
                            {routine.avgDuration > 0 ? `~${formatTime(routine.avgDuration)}` : '--'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#a8a8a0', fontSize: 12 }}>📅 Dernier</Text>
                          <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>
                            {routine.daysAgo !== null 
                              ? routine.daysAgo === 0 
                                ? "Aujourd'hui" 
                                : `Il y a ${routine.daysAgo}j`
                              : 'Jamais'}
                          </Text>
                        </View>
                      </View>

                      {/* Records */}
                      {routine.exercisesRecords && routine.exercisesRecords.length > 0 ? (
                        <View>
                          <Text style={{ color: '#d4af37', fontWeight: 'bold', marginBottom: 12, fontSize: 14 }}>
                            🏆 RECORDS ({getPeriodLabel()})
                          </Text>
                          {routine.exercisesRecords.map((record, index) => {
                            if (record.type === 'superset') {
                              return renderSupersetRecord(record, index);
                            } else if (record.type === 'dropset') {
                              return renderDropsetRecord(record, index);
                            } else if (record.type === 'timed') {
                              return renderTimedRecord(record, index);
                            } else {
                              return renderNormalRecord(record, index);
                            }
                          })}
                        </View>
                      ) : (
                        <Text style={{ color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>
                          Aucun record pour cette période
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={{ color: '#a8a8a0', textAlign: 'center' }}>
                Aucune routine créée
              </Text>
            )}
          </View>

          {/* Stats Course */}
          <View style={{
            backgroundColor: 'rgba(176, 38, 255, 0.1)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(176, 38, 255, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="walk" size={24} color="#b026ff" />
              <Text style={{ color: '#f5f5f0', fontSize: 20, fontWeight: 'bold', marginLeft: 12 }}>
                🏃 COURSE
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Sorties :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{runStats.count}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Distance totale :</Text>
              <Text style={{ color: '#00ff88', fontWeight: 'bold' }}>{runStats.distance.toFixed(1)} km</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Allure moyenne :</Text>
              <Text style={{ color: '#b026ff', fontWeight: 'bold' }}>
                {runStats.count > 0 ? formatPace(runStats.avgPace) : '--:--'} /km
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a8a8a0' }}>• Temps total :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{formatTime(runStats.duration)}</Text>
            </View>
          </View>

          {/* Bouton voir exercices */}
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(0, 245, 255, 0.15)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(0, 245, 255, 0.3)'
            }}
            onPress={async () => {
              try {
                const exercises = await db.getAllAsync(`
                  SELECT DISTINCT e.id, e.name, COUNT(s.id) as total_sets
                  FROM exercises e
                  JOIN sets s ON e.id = s.exercise_id
                  GROUP BY e.id
                  ORDER BY total_sets DESC
                  LIMIT 10
                `);
                if (exercises.length > 0) {
                  navigation.navigate('ExerciseList', { exercises });
                }
              } catch (error) {
                console.error('Erreur:', error);
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="fitness" size={24} color="#00f5ff" />
              <Text style={{ color: '#00f5ff', fontSize: 16, fontWeight: 'bold', marginLeft: 12 }}>
                📈 VOIR MES EXERCICES
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}