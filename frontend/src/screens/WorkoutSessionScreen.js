import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import ExerciseScreen from './ExerciseScreen';
import RestTimerScreen from './RestTimerScreen';
import ExerciseTransitionScreen from './ExerciseTransitionScreen';

export default function WorkoutSessionScreen({ route, navigation }) {
  const { routineId, exercises, warmupDuration } = route.params;
  
  const [workoutId, setWorkoutId] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [screenState, setScreenState] = useState('exercise'); // 'exercise' | 'rest' | 'transition'
  const [workoutStartTime] = useState(Date.now());
  const [completedSets, setCompletedSets] = useState([]);
  const [currentExerciseCompletedSets, setCurrentExerciseCompletedSets] = useState([]);

  useEffect(() => {
    createWorkout();
  }, []);

  const createWorkout = async () => {
    try {
      const result = await db.runAsync(
        'INSERT INTO workouts (date, type, warmup_duration, workout_duration, total_sets, total_volume, xp_gained) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [new Date().toISOString(), 'workout', warmupDuration, 0, 0, 0, 0]
      );
      
      const insertedId = result.lastInsertRowId;
      setWorkoutId(insertedId);
      console.log('✅ Séance créée avec ID:', insertedId);
    } catch (error) {
      console.error('❌ Erreur création séance:', error);
    }
  };

  const handleSetComplete = async (weight, reps) => {
    if (!workoutId) return;

    try {
      const currentExercise = exercises[currentExerciseIndex];

      // Enregistrer la série dans la BDD
      await db.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?)',
        [workoutId, currentExercise.id, currentSet, weight, reps]
      );

      // Ajouter aux séries complétées
      const newSet = { exercise: currentExercise, set: currentSet, weight, reps };
      setCompletedSets([...completedSets, newSet]);
      setCurrentExerciseCompletedSets([...currentExerciseCompletedSets, newSet]);

      console.log(`✅ Série ${currentSet} enregistrée: ${weight}kg × ${reps} reps`);

      // Vérifier s'il reste des séries pour cet exercice
      if (currentSet < currentExercise.sets) {
        // Passer au repos
        setScreenState('rest');
      } else {
        // Exercice terminé !
        if (currentExerciseIndex < exercises.length - 1) {
          // Il y a un prochain exercice - écran de transition
          setScreenState('transition');
        } else {
          // Tous les exercices terminés
          finishWorkout();
        }
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement série:', error);
    }
  };

  const handleRestComplete = () => {
    setCurrentSet(currentSet + 1);
    setScreenState('exercise');
  };

  const handleStartNextExercise = () => {
    // Passer à l'exercice suivant
    setCurrentExerciseIndex(currentExerciseIndex + 1);
    setCurrentSet(1);
    setCurrentExerciseCompletedSets([]);
    setScreenState('exercise');
  };

  const finishWorkout = async () => {
    const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
    
    const totalVolume = completedSets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
    const totalSets = completedSets.length;
    const xpGained = 25;

    await db.runAsync(
      'UPDATE workouts SET workout_duration = ?, total_sets = ?, total_volume = ?, xp_gained = ? WHERE id = ?',
      [workoutDuration, totalSets, totalVolume, xpGained, workoutId]
    );

    navigation.replace('WorkoutSummary', {
      workoutId,
      warmupDuration,
      workoutDuration,
      totalSets,
      totalVolume,
      xpGained
    });
  };

  if (!workoutId) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Préparation...</Text>
      </View>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];

  // ÉCRAN TRANSITION ENTRE EXERCICES
  if (screenState === 'transition') {
    const nextExercise = exercises[currentExerciseIndex + 1];
    
    return (
      <ExerciseTransitionScreen
        completedExercise={currentExercise}
        completedSets={currentExerciseCompletedSets}
        nextExercise={nextExercise}
        exerciseNumber={currentExerciseIndex + 1}
        totalExercises={exercises.length}
        workoutStartTime={workoutStartTime}
        warmupDuration={warmupDuration}
        onStartNext={handleStartNextExercise}
      />
    );
  }

  // ÉCRAN REPOS
  if (screenState === 'rest') {
    return (
      <RestTimerScreen
        exercise={currentExercise}
        setNumber={currentSet}
        totalSets={currentExercise.sets}
        restTime={currentExercise.rest_time}
        onComplete={handleRestComplete}
        workoutStartTime={workoutStartTime}
        warmupDuration={warmupDuration}
      />
    );
  }

  // ÉCRAN EXERCICE
  return (
    <ExerciseScreen
      exercise={currentExercise}
      setNumber={currentSet}
      totalSets={currentExercise.sets}
      onSetComplete={handleSetComplete}
      workoutStartTime={workoutStartTime}
      warmupDuration={warmupDuration}
      exerciseIndex={currentExerciseIndex}
      totalExercises={exercises.length}
    />
  );
}