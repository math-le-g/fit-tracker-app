import { View, Text, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import ExerciseScreen from './ExerciseScreen';
import RestTimerScreen from './RestTimerScreen';
import ExerciseTransitionScreen from './ExerciseTransitionScreen';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';

export default function WorkoutSessionScreen({ route, navigation }) {
  const { exercises: initialExercises, routineName, skipWarmup } = route.params;

  const [exercises, setExercises] = useState(initialExercises);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(skipWarmup ? 'exercise' : 'warmup');
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [warmupDuration, setWarmupDuration] = useState(0);
  const [workoutId, setWorkoutId] = useState(null);
  const [completedSets, setCompletedSets] = useState([]);
  const [allCompletedExercises, setAllCompletedExercises] = useState([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalSets, setTotalSets] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const currentExercise = exercises[currentExerciseIndex];

  useEffect(() => {
    if (skipWarmup && !workoutStartTime) {
      setWorkoutStartTime(Date.now());
      setWarmupDuration(0);
      initWorkout();
    }
  }, [skipWarmup]);

  const handleUpdateExercises = (newExercises) => {
    setExercises(newExercises);
  };

  // 🆕 FONCTION POUR QUITTER LA SÉANCE
  const handleQuitSession = () => {
    if (totalSets === 0) {
      setModalConfig({
        title: '🚪 Quitter la séance ?',
        message: 'Aucune série effectuée pour le moment.',
        icon: 'exit-outline',
        iconColor: '#ff6b35',
        buttons: [
          { text: 'Continuer', onPress: () => {} },
          {
            text: 'Annuler la séance',
            style: 'destructive',
            onPress: () => cancelWorkout()
          }
        ]
      });
    } else {
      setModalConfig({
        title: '🚪 Quitter la séance ?',
        message: `Tu as fait ${totalSets} série(s) pour un volume de ${totalVolume} kg.\n\nQue veux-tu faire ?`,
        icon: 'exit-outline',
        iconColor: '#ffc107',
        buttons: [
          { text: 'Continuer', onPress: () => {} },
          {
            text: '💾 Sauvegarder et quitter',
            style: 'primary',
            onPress: () => savePartialWorkout()
          },
          {
            text: '🗑️ Annuler la séance',
            style: 'destructive',
            onPress: () => cancelWorkout()
          }
        ]
      });
    }
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // 🆕 SAUVEGARDER PARTIELLEMENT
  const savePartialWorkout = async () => {
    try {
      const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
      const xpGained = Math.floor((totalSets * 10) + (totalVolume / 100));

      await db.runAsync(
        'UPDATE workouts SET workout_duration = ?, total_volume = ?, total_sets = ?, xp_gained = ?, notes = ? WHERE id = ?',
        [workoutDuration, totalVolume, totalSets, xpGained, 'Séance partielle (quittée)', workoutId]
      );

      await db.runAsync(
        'UPDATE user SET xp = xp + ?, last_workout_date = ? WHERE id = 1',
        [xpGained, new Date().toISOString()]
      );

      console.log('✅ Séance partielle sauvegardée');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      navigation.replace('WorkoutSummary', {
        workoutId: workoutId,
        warmupDuration: warmupDuration,
        workoutDuration: workoutDuration,
        totalSets: totalSets,
        totalVolume: totalVolume,
        xpGained: xpGained,
        isPartial: true
      });
    } catch (error) {
      console.error('❌ Erreur sauvegarde partielle:', error);
    }
  };

  // 🆕 ANNULER COMPLÈTEMENT
  const cancelWorkout = async () => {
    try {
      if (workoutId) {
        await db.runAsync('DELETE FROM sets WHERE workout_id = ?', [workoutId]);
        await db.runAsync('DELETE FROM workouts WHERE id = ?', [workoutId]);
        console.log('🗑️ Séance annulée complètement');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      navigation.reset({
        index: 0,
        routes: [{ name: 'TrainingHome' }],
      });
    } catch (error) {
      console.error('❌ Erreur annulation séance:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleQuitSession();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [totalSets, totalVolume, workoutId])
  );

  const startWarmup = () => {
    setWorkoutStartTime(Date.now());
    setCurrentPhase('warmup-timer');
  };

  const completeWarmup = (duration) => {
    setWarmupDuration(duration);
    setCurrentPhase('exercise');
    if (!workoutId) {
      initWorkout();
    }
  };

  const initWorkout = async () => {
    try {
      const result = await db.runAsync(
        'INSERT INTO workouts (date, type, warmup_duration, workout_duration) VALUES (?, ?, ?, ?)',
        [new Date().toISOString(), 'musculation', warmupDuration || 0, 0]
      );
      setWorkoutId(result.lastInsertRowId);
      console.log('✅ Workout initié avec ID:', result.lastInsertRowId);
    } catch (error) {
      console.error('❌ Erreur init workout:', error);
    }
  };

  const completeSet = async (weight, reps) => {
    try {
      if (!currentExercise) {
        console.error('❌ currentExercise est undefined!');
        return;
      }

      if (!workoutId) {
        console.log('⚠️ Workout pas encore initialisé, initialisation...');
        await initWorkout();
        return;
      }

      await db.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?)',
        [workoutId, currentExercise.id, currentSetIndex + 1, weight, reps]
      );

      const newCompletedSets = [...completedSets, { weight, reps }];
      setCompletedSets(newCompletedSets);
      setTotalVolume(prev => prev + (weight * reps));
      setTotalSets(prev => prev + 1);

      if (currentSetIndex < currentExercise.sets - 1) {
        setCurrentSetIndex(currentSetIndex + 1);
        setCurrentPhase('rest');
      } else {
        completeExercise(newCompletedSets);
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement série:', error);
    }
  };

  const completeExercise = (exerciseSets) => {
    setAllCompletedExercises([...allCompletedExercises, {
      exercise: currentExercise,
      sets: exerciseSets
    }]);

    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentPhase('transition');
    } else {
      finishWorkout();
    }
  };

  const startNextExercise = () => {
    setCurrentExerciseIndex(currentExerciseIndex + 1);
    setCurrentSetIndex(0);
    setCompletedSets([]);
    setCurrentPhase('exercise');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const finishRest = () => {
    setCurrentPhase('exercise');
  };

  const finishWorkout = async () => {
    try {
      const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
      const xpGained = Math.floor((totalSets * 10) + (totalVolume / 100));

      await db.runAsync(
        'UPDATE workouts SET workout_duration = ?, total_volume = ?, total_sets = ?, xp_gained = ? WHERE id = ?',
        [workoutDuration, totalVolume, totalSets, xpGained, workoutId]
      );

      const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      const newXp = user.xp + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

      await db.runAsync(
        'UPDATE user SET xp = ?, level = ?, last_workout_date = ? WHERE id = 1',
        [newXp, newLevel, new Date().toISOString()]
      );

      navigation.replace('WorkoutSummary', {
        workoutId: workoutId,
        warmupDuration: warmupDuration,
        workoutDuration: workoutDuration,
        totalSets: totalSets,
        totalVolume: totalVolume,
        xpGained: xpGained,
        isPartial: false
      });
    } catch (error) {
      console.error('Erreur fin workout:', error);
    }
  };

  const handleManageExercises = () => {
    navigation.navigate('ManageWorkoutExercises', {
      exercises: exercises,
      currentIndex: currentExerciseIndex,
      onReorder: (newExercises) => setExercises(newExercises)
    });
  };

  if (!currentExercise && currentPhase === 'exercise') {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center p-6">
        <Text className="text-white text-xl text-center">⚠️ Problème avec l'exercice</Text>
        <Text className="text-gray-400 text-center mt-2">L'exercice n'a pas pu être chargé</Text>
        <TouchableOpacity
          className="bg-primary-navy rounded-xl p-4 mt-4"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🆕 UTILISER UNE VARIABLE AU LIEU D'UN RETURN DIRECT
  let content;

  switch (currentPhase) {
    case 'warmup':
      content = (
        <View className="flex-1 bg-primary-dark p-6">
          <TouchableOpacity
            className="absolute top-4 right-4 z-10 bg-danger/20 rounded-full p-3"
            onPress={handleQuitSession}
          >
            <Ionicons name="close" size={24} color="#ff4444" />
          </TouchableOpacity>
          <View className="flex-1 justify-center items-center">
            <View className="bg-primary-navy rounded-3xl p-8 w-full">
              <Text className="text-white text-3xl font-bold text-center mb-2">
                🔥 ÉCHAUFFEMENT
              </Text>
              <Text className="text-gray-400 text-center mb-6">
                Prépare ton corps pour la séance
              </Text>

              <TouchableOpacity
                className="bg-accent-cyan rounded-2xl p-5 mb-3"
                onPress={startWarmup}
              >
                <Text className="text-primary-dark text-center text-xl font-bold">
                  DÉMARRER L'ÉCHAUFFEMENT
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-primary-dark rounded-2xl p-4"
                onPress={() => completeWarmup(0)}
              >
                <Text className="text-gray-400 text-center font-semibold">
                  Passer l'échauffement
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
      break;

    case 'warmup-timer':
      content = (
        <RestTimerScreen
          duration={300}
          onComplete={completeWarmup}
          isWarmup={true}
          navigation={navigation}
          onQuitSession={handleQuitSession}
        />
      );
      break;

    case 'exercise':
      content = (
        <ExerciseScreen
          exercise={currentExercise}
          setNumber={currentSetIndex + 1}
          totalSets={currentExercise.sets}
          onSetComplete={completeSet}
          previousSets={completedSets}
          exerciseNumber={currentExerciseIndex + 1}
          totalExercises={exercises.length}
          onManageExercises={handleManageExercises}
          navigation={navigation}
          onQuitSession={handleQuitSession}
        />
      );
      break;

    case 'rest':
      content = (
        <RestTimerScreen
          duration={currentExercise.rest_time}
          onComplete={finishRest}
          nextSet={currentSetIndex + 1}
          totalSets={currentExercise.sets}
          exerciseName={currentExercise.name}
          navigation={navigation}
          onQuitSession={handleQuitSession}
        />
      );
      break;

    case 'transition':
      content = (
        <ExerciseTransitionScreen
          completedExercise={currentExercise}
          completedSets={completedSets}
          nextExercise={exercises[currentExerciseIndex + 1]}
          exerciseNumber={currentExerciseIndex + 1}
          totalExercises={exercises.length}
          workoutStartTime={workoutStartTime}
          warmupDuration={warmupDuration}
          onStartNext={startNextExercise}
          navigation={navigation}
          exercisesList={exercises}
          onUpdateExercises={handleUpdateExercises}
          onQuitSession={handleQuitSession}
        />
      );
      break;

    default:
      content = null;
  }

  // 🆕 RETOURNER LE CONTENU + LE MODAL (toujours présent)
  return (
    <>
      {content}
      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </>
  );
}



