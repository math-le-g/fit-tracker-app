import { View, Text, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import ExerciseScreen from './ExerciseScreen';
import RestTimerScreen from './RestTimerScreen';
import ExerciseTransitionScreen from './ExerciseTransitionScreen';
import WorkoutSummaryScreen from './WorkoutSummaryScreen';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';

export default function WorkoutSessionScreen({ route, navigation }) {
  const { exercises: initialExercises, routineName, skipWarmup } = route.params;
  
  // État pour les exercices
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

  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const currentExercise = exercises[currentExerciseIndex];

  // ✅ CORRECTION: Initialisation si on passe l'échauffement
  useEffect(() => {
    if (skipWarmup && !workoutStartTime) {
      setWorkoutStartTime(Date.now());
      setWarmupDuration(0);
      initWorkout();
    }
  }, [skipWarmup]);

  // Fonction pour mettre à jour la liste des exercices
  const handleUpdateExercises = (newExercises) => {
    setExercises(newExercises);
  };

  // Gérer le bouton retour Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handlePause();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      // ✅ CORRECTION: Utilise subscription.remove()
      return () => subscription.remove();
    }, [])
  );

  const handlePause = () => {
    setModalConfig({
      title: '⏸️ Mettre en pause ?',
      message: 'Ta séance sera sauvegardée',
      icon: 'pause-circle',
      iconColor: '#ffc107',
      buttons: [
        { text: 'Continuer', onPress: () => {} },
        {
          text: 'Mettre en pause',
          style: 'destructive',
          onPress: () => {
            navigation.goBack();
          }
        }
      ]
    });
    setModalVisible(true);
  };

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
      // ✅ VÉRIFICATION: S'assurer que currentExercise existe
      if (!currentExercise) {
        console.error('❌ currentExercise est undefined!');
        console.log('currentExerciseIndex:', currentExerciseIndex);
        console.log('exercises:', exercises);
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
    const exerciseData = {
      exercise: currentExercise,
      sets: exerciseSets
    };
    
    setAllCompletedExercises([...allCompletedExercises, exerciseData]);
    
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
      const workoutDuration = Date.now() - workoutStartTime;
      const xpGained = Math.floor((totalSets * 10) + (totalVolume / 100));

      await db.runAsync(
        'UPDATE workouts SET workout_duration = ?, total_volume = ?, total_sets = ?, xp_gained = ? WHERE id = ?',
        [Math.floor(workoutDuration / 1000), totalVolume, totalSets, xpGained, workoutId]
      );

      const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      const newXp = user.xp + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

      await db.runAsync(
        'UPDATE user SET xp = ?, level = ?, last_workout_date = ? WHERE id = 1',
        [newXp, newLevel, new Date().toISOString()]
      );

      setCurrentPhase('summary');
    } catch (error) {
      console.error('Erreur fin workout:', error);
    }
  };

  // Fonction pour gérer les exercices
  const handleManageExercises = () => {
    navigation.navigate('ManageWorkoutExercises', {
      exercises: exercises,
      currentIndex: currentExerciseIndex,
      onReorder: (newExercises) => {
        setExercises(newExercises);
      }
    });
  };

  // ✅ VÉRIFICATION: Si pas d'exercice, afficher un message
  if (!currentExercise && currentPhase === 'exercise') {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center p-6">
        <Text className="text-white text-xl text-center">
          ⚠️ Problème avec l'exercice
        </Text>
        <Text className="text-gray-400 text-center mt-2">
          L'exercice n'a pas pu être chargé
        </Text>
        <TouchableOpacity
          className="bg-primary-navy rounded-xl p-4 mt-4"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Rendu selon la phase
  switch (currentPhase) {
    case 'warmup':
      return (
        <View className="flex-1 bg-primary-dark p-6">
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

    case 'warmup-timer':
      return (
        <RestTimerScreen
          duration={300}
          onComplete={completeWarmup}
          isWarmup={true}
          navigation={navigation}
        />
      );

    case 'exercise':
      return (
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
        />
      );

    case 'rest':
      return (
        <RestTimerScreen
          duration={currentExercise.rest_time}
          onComplete={finishRest}
          nextSet={currentSetIndex + 1}
          totalSets={currentExercise.sets}
          exerciseName={currentExercise.name}
          navigation={navigation}
        />
      );

    case 'transition':
      return (
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
        />
      );

    case 'summary':
      return (
        <WorkoutSummaryScreen
          navigation={navigation}
          workoutData={{
            duration: Math.floor((Date.now() - workoutStartTime) / 1000),
            totalVolume,
            totalSets,
            exercises: allCompletedExercises,
            xpGained: Math.floor((totalSets * 10) + (totalVolume / 100))
          }}
        />
      );

    default:
      return null;
  }
}