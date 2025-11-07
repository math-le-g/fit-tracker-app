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

  // 🆕 ÉTATS POUR LES SUPERSETS
  const [currentSupersetId, setCurrentSupersetId] = useState(null);
  const [currentSupersetRound, setCurrentSupersetRound] = useState(1);
  const [currentSupersetExerciseIndex, setCurrentSupersetExerciseIndex] = useState(0);
  const [supersetCompletedSets, setSupersetCompletedSets] = useState({}); // { exerciseId: [sets...] }

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

  // 🆕 DÉTECTION SI L'EXERCICE ACTUEL EST UN SUPERSET
  const currentItem = exercises[currentExerciseIndex];
  const isSuperset = currentItem?.type === 'superset';

  // 🆕 SI SUPERSET, RÉCUPÉRER L'EXERCICE ACTUEL DANS LE SUPERSET
  const currentExercise = isSuperset
    ? currentItem.exercises[currentSupersetExerciseIndex]
    : currentItem;

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

  const handleQuitSession = () => {
    if (totalSets === 0) {
      setModalConfig({
        title: '🚪 Quitter la séance ?',
        message: 'Aucune série effectuée pour le moment.',
        icon: 'exit-outline',
        iconColor: '#ff6b35',
        buttons: [
          { text: 'Continuer', onPress: () => { } },
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
          { text: 'Continuer', onPress: () => { } },
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

  const savePartialWorkout = async () => {
    try {
      const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
      const xpGained = Math.floor((totalSets * 10) + (totalVolume / 100));

      await db.runAsync(
        'UPDATE workouts SET workout_duration = ?, total_volume = ?, total_sets = ?, xp_gained = ?, notes = ? WHERE id = ?',
        [workoutDuration, totalVolume, totalSets, xpGained, 'Séance partielle (quittée)', workoutId]
      );

      // 🆕 CALCULER LE STREAK (même pour séance partielle)
      const { newStreak, newBestStreak } = await updateStreak();

      // 🆕 INCLURE LE STREAK DANS LA MISE À JOUR
      await db.runAsync(
        'UPDATE user SET xp = xp + ?, last_workout_date = ?, streak = ?, best_streak = ? WHERE id = 1',
        [xpGained, new Date().toISOString(), newStreak, newBestStreak]
      );

      console.log(`✅ Séance partielle sauvegardée ! Streak: ${newStreak} jours`);
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

  // 🆕 FONCTION DE CALCUL DU STREAK
  const updateStreak = async () => {
    try {
      const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');

      const now = new Date();
      now.setHours(0, 0, 0, 0); // Début de la journée actuelle

      let newStreak = 1;

      if (user.last_workout_date) {
        const lastWorkout = new Date(user.last_workout_date);
        lastWorkout.setHours(0, 0, 0, 0); // Début de la journée de la dernière séance

        const diffTime = now - lastWorkout;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        console.log(`📅 Dernière séance: ${lastWorkout.toLocaleDateString()}`);
        console.log(`📅 Aujourd'hui: ${now.toLocaleDateString()}`);
        console.log(`📅 Différence: ${diffDays} jours`);

        if (diffDays === 0) {
          // ✅ Même jour → streak reste identique
          newStreak = user.streak;
          console.log('✅ Même jour, streak reste à:', newStreak);
        } else if (diffDays === 1) {
          // 🔥 Jour suivant → streak + 1
          newStreak = user.streak + 1;
          console.log('🔥 Jour consécutif ! Nouveau streak:', newStreak);
        } else {
          // 💔 Gap de 2+ jours → reset à 1
          newStreak = 1;
          console.log('💔 Streak perdu ! Reset à 1');
        }
      } else {
        // 🎉 Première séance ever
        newStreak = 1;
        console.log('🎉 Première séance ! Streak = 1');
      }

      // 🏆 Mettre à jour le best_streak si record battu
      const newBestStreak = Math.max(newStreak, user.best_streak);

      return { newStreak, newBestStreak };
    } catch (error) {
      console.error('❌ Erreur calcul streak:', error);
      return { newStreak: 1, newBestStreak: 1 };
    }
  };

  // 🆕 FONCTION MODIFIÉE POUR GÉRER LES SUPERSETS
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

      // 🆕 GÉNÉRER UN SUPERSET_ID SI C'EST LE PREMIER EXERCICE D'UN SUPERSET
      let supersetId = null;
      if (isSuperset) {
        if (!currentSupersetId) {
          // Premier exercice du superset : créer un nouvel ID
          supersetId = `superset_${workoutId}_${Date.now()}`;
          setCurrentSupersetId(supersetId);
        } else {
          // Utiliser l'ID existant
          supersetId = currentSupersetId;
        }
      }

      // Enregistrer la série en BDD
      await db.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight, reps, superset_id) VALUES (?, ?, ?, ?, ?, ?)',
        [workoutId, currentExercise.id, currentSetIndex + 1, weight, reps, supersetId]
      );

      // Mettre à jour les stats
      setTotalVolume(prev => prev + (weight * reps));
      setTotalSets(prev => prev + 1);

      // 🆕 SI SUPERSET
      if (isSuperset) {
        // Ajouter la série aux completedSets du superset
        const exerciseId = currentExercise.id;
        const newSupersetSets = {
          ...supersetCompletedSets,
          [exerciseId]: [...(supersetCompletedSets[exerciseId] || []), { weight, reps }]
        };
        setSupersetCompletedSets(newSupersetSets);

        // Vérifier si on est au dernier exercice du superset
        const isLastExerciseInSuperset = currentSupersetExerciseIndex === currentItem.exercises.length - 1;

        if (isLastExerciseInSuperset) {
          // Fin d'un tour du superset
          const isLastRound = currentSupersetRound === currentItem.rounds;

          if (isLastRound) {
            // 🎉 SUPERSET TERMINÉ
            console.log('🎉 Superset terminé !');
            completeSupersetExercise(newSupersetSets);
          } else {
            // 🔁 REPOS entre les tours
            console.log(`💤 Repos entre tours (${currentSupersetRound}/${currentItem.rounds})`);
            setCurrentPhase('rest');
          }
        } else {
          // ➡️ PASSER AU PROCHAIN EXERCICE DU SUPERSET (SANS REPOS)
          console.log(`➡️ Exercice suivant dans le superset (${currentSupersetExerciseIndex + 1}/${currentItem.exercises.length})`);
          setCurrentSupersetExerciseIndex(currentSupersetExerciseIndex + 1);
          setCurrentSetIndex(0);
          // Rester en phase 'exercise' pour enchaîner directement
        }
      }
      // ✅ EXERCICE NORMAL (logique existante)
      else {
        const newCompletedSets = [...completedSets, { weight, reps }];
        setCompletedSets(newCompletedSets);

        if (currentSetIndex < currentExercise.sets - 1) {
          setCurrentSetIndex(currentSetIndex + 1);
          setCurrentPhase('rest');
        } else {
          completeExercise(newCompletedSets);
        }
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement série:', error);
    }
  };

  // 🆕 FONCTION POUR TERMINER UN SUPERSET
  const completeSupersetExercise = (supersetSets) => {
    console.log('✅ Superset complété avec toutes les séries:', supersetSets);

    // Enregistrer le superset comme exercice complété
    setAllCompletedExercises([...allCompletedExercises, {
      exercise: currentItem,
      sets: supersetSets,
      isSuperset: true
    }]);

    // Reset des états du superset
    setSupersetCompletedSets({});
    setCurrentSupersetRound(1);
    setCurrentSupersetExerciseIndex(0);
    setCurrentSetIndex(0);
    setCurrentSupersetId(null); // 🆕 RESET du superset_id

    // Passer à l'exercice suivant ou terminer
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentPhase('transition');
    } else {
      finishWorkout();
    }
  };

  // ✅ FONCTION EXISTANTE POUR LES EXERCICES NORMAUX
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

    // 🆕 Reset des états du superset pour le prochain exercice
    setCurrentSupersetRound(1);
    setCurrentSupersetExerciseIndex(0);
    setSupersetCompletedSets({});
    setCurrentSupersetId(null); // 🆕 RESET du superset_id

    setCurrentPhase('exercise');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // 🆕 FONCTION MODIFIÉE POUR GÉRER LE REPOS DANS LES SUPERSETS
  const finishRest = () => {
    if (isSuperset) {
      // Après le repos entre les tours du superset
      setCurrentSupersetRound(currentSupersetRound + 1);
      setCurrentSupersetExerciseIndex(0); // Recommencer au premier exercice
      setCurrentSetIndex(0);
      console.log(`🔁 Nouveau tour du superset: ${currentSupersetRound + 1}/${currentItem.rounds}`);
    }
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

      // 🆕 CALCULER LE STREAK
      const { newStreak, newBestStreak } = await updateStreak();

      const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      const newXp = user.xp + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

      // 🆕 INCLURE LE STREAK DANS LA MISE À JOUR
      await db.runAsync(
        'UPDATE user SET xp = ?, level = ?, last_workout_date = ?, streak = ?, best_streak = ? WHERE id = 1',
        [newXp, newLevel, new Date().toISOString(), newStreak, newBestStreak]
      );

      console.log(`✅ Séance terminée ! Streak: ${newStreak} jours (Record: ${newBestStreak})`);

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
          totalSets={isSuperset ? currentItem.rounds : currentExercise.sets}
          onSetComplete={completeSet}
          previousSets={isSuperset ? (supersetCompletedSets[currentExercise.id] || []) : completedSets}
          exerciseNumber={currentExerciseIndex + 1}
          totalExercises={exercises.length}
          onManageExercises={handleManageExercises}
          navigation={navigation}
          onQuitSession={handleQuitSession}
          // 🆕 PROPS SPÉCIFIQUES AUX SUPERSETS
          isSuperset={isSuperset}
          supersetRound={isSuperset ? currentSupersetRound : null}
          supersetTotalRounds={isSuperset ? currentItem.rounds : null}
          supersetExerciseIndex={isSuperset ? currentSupersetExerciseIndex : null}
          supersetTotalExercises={isSuperset ? currentItem.exercises.length : null}
          supersetName={isSuperset ? `Superset ${currentExerciseIndex + 1}` : null}
        />
      );
      break;

    case 'rest':
      content = (
        <RestTimerScreen
          duration={isSuperset ? currentItem.rest_time : currentExercise.rest_time}
          onComplete={finishRest}
          nextSet={isSuperset ? null : currentSetIndex + 1}
          totalSets={isSuperset ? null : currentExercise.sets}
          exerciseName={isSuperset ? `Superset - Tour ${currentSupersetRound + 1}/${currentItem.rounds}` : currentExercise.name}
          navigation={navigation}
          onQuitSession={handleQuitSession}
          // 🆕 INFO SUPERSET
          isSuperset={isSuperset}
          supersetRound={isSuperset ? currentSupersetRound : null}
          supersetTotalRounds={isSuperset ? currentItem.rounds : null}
        />
      );
      break;

    case 'transition':
      content = (
        <ExerciseTransitionScreen
          completedExercise={currentItem}
          completedSets={isSuperset ? supersetCompletedSets : completedSets}
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
          isSuperset={currentItem?.type === 'superset'}
        />
      );
      break;

    default:
      content = null;
  }

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



