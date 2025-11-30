import { View, Text, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import ExerciseScreen from './ExerciseScreen';
import RestTimerScreen from './RestTimerScreen';
import ExerciseTransitionScreen from './ExerciseTransitionScreen';
import TimedExerciseScreen from './TimedExerciseScreen';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';
import SessionTimer from '../components/SessionTimer';
import { useSession } from '../context/SessionContext';

export default function WorkoutSessionScreen({ route, navigation }) {
  const { exercises: initialExercises, routineName, routineId, skipWarmup, actualWarmupSeconds } = route.params;

  const [exercises, setExercises] = useState(initialExercises);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  // ÉTATS POUR LES SUPERSETS
  const [currentSupersetId, setCurrentSupersetId] = useState(null);
  const [currentSupersetRound, setCurrentSupersetRound] = useState(1);
  const [currentSupersetExerciseIndex, setCurrentSupersetExerciseIndex] = useState(0);
  const [supersetCompletedSets, setSupersetCompletedSets] = useState({});

  // ÉTATS POUR LES DROP SETS
  const [currentDropsetId, setCurrentDropsetId] = useState(null);
  const [currentDropRound, setCurrentDropRound] = useState(1);
  const [currentDropIndex, setCurrentDropIndex] = useState(0);
  const [dropsetCompletedSets, setDropsetCompletedSets] = useState([]);

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
  const { startSession, endSession } = useSession();

  // DÉTECTION DU TYPE D'EXERCICE ACTUEL
  const currentItem = exercises[currentExerciseIndex];
  const isSuperset = currentItem?.type === 'superset';
  const isDropset = currentItem?.type === 'dropset';
  const isTimed = currentItem?.type === 'timed';

  // RÉCUPÉRER L'EXERCICE ACTUEL
  const currentExercise = isSuperset
    ? currentItem.exercises[currentSupersetExerciseIndex]
    : isDropset
      ? currentItem.exercise
      : isTimed
        ? currentItem.exercise
        : currentItem;

  useEffect(() => {
    if (skipWarmup && !workoutStartTime) {
      setWorkoutStartTime(Date.now());
      const warmupTime = actualWarmupSeconds || 0;  // ✅ Utiliser le temps réel d'échauffement
      setWarmupDuration(warmupTime);
      startSession();
      initWorkout(warmupTime);  // ✅ Passer le temps réel
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
      endSession();
      const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
      const xpGained = Math.floor((totalSets * 10) + (totalVolume / 100));

      await db.runAsync(
        'UPDATE workouts SET workout_duration = ?, total_volume = ?, total_sets = ?, xp_gained = ?, notes = ? WHERE id = ?',
        [workoutDuration, totalVolume, totalSets, xpGained, 'Séance partielle (quittée)', workoutId]
      );

      const { newStreak, newBestStreak } = await updateStreak();

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
      endSession();
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

  const completeWarmup = async (duration) => {
    setWarmupDuration(duration);
    startSession();  // ✅ Démarrer la session
    if (!workoutId) {
      await initWorkout(duration);  // ✅ Attendre que le workout soit créé
    }
    setCurrentPhase('exercise');    // ✅ Changer la phase APRÈS
  };

  const initWorkout = async (warmupDur = 0) => {
    try {
      const result = await db.runAsync(
        'INSERT INTO workouts (date, type, warmup_duration, workout_duration, routine_id) VALUES (?, ?, ?, ?, ?)',
        [new Date().toISOString(), 'musculation', warmupDur, 0, routineId || null]  // ✅ Utiliser le paramètre
      );
      setWorkoutId(result.lastInsertRowId);
      console.log('✅ Workout initié avec ID:', result.lastInsertRowId, '- Routine ID:', routineId, '- Échauffement:', warmupDur, 's');
    } catch (error) {
      console.error('❌ Erreur init workout:', error);
    }
  };

  const updateStreak = async () => {
    try {
      const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let newStreak = 1;

      if (user.last_workout_date) {
        const lastWorkout = new Date(user.last_workout_date);
        lastWorkout.setHours(0, 0, 0, 0);

        const diffTime = now - lastWorkout;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          newStreak = user.streak;
        } else if (diffDays === 1) {
          newStreak = user.streak + 1;
        } else {
          newStreak = 1;
        }
      }

      const newBestStreak = Math.max(newStreak, user.best_streak);
      return { newStreak, newBestStreak };
    } catch (error) {
      console.error('❌ Erreur calcul streak:', error);
      return { newStreak: 1, newBestStreak: 1 };
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
        await initWorkout(warmupDuration);  // ✅ Passer la durée d'échauffement
        return;
      }

      let supersetId = null;
      let dropsetId = null;

      if (isSuperset) {
        if (!currentSupersetId) {
          supersetId = `superset_${workoutId}_${Date.now()}`;
          setCurrentSupersetId(supersetId);
        } else {
          supersetId = currentSupersetId;
        }
      } else if (isDropset) {
        if (!currentDropsetId) {
          dropsetId = `dropset_${workoutId}_${Date.now()}`;
          setCurrentDropsetId(dropsetId);
        } else {
          dropsetId = currentDropsetId;
        }
      }

      // 🆕 CORRECTION : set_number = numéro du drop (1, 2, 3), pas un compteur global
      // Pour les dropsets: currentDropIndex va de 0 à (drops-1), donc +1 pour avoir 1, 2, 3
      // Ça permet de grouper par série : quand set_number revient à 1 = nouvelle série
      let setNumber;
      if (isDropset) {
        setNumber = currentDropIndex + 1; // 🔥 Numéro du drop (1, 2, 3), pas compteur global
      } else if (isSuperset) {
        setNumber = (supersetCompletedSets[currentExercise.id] || []).length + 1;
      } else {
        setNumber = currentSetIndex + 1;
      }

      await db.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight, reps, superset_id, dropset_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [workoutId, currentExercise.id, setNumber, weight, reps, supersetId, dropsetId]
      );

      setTotalVolume(prev => prev + (weight * reps));
      setTotalSets(prev => prev + 1);

      // 🔻 LOGIQUE DROP SET
      if (isDropset) {
        const newDropSets = [...dropsetCompletedSets, {
          weight,
          reps,
          dropIndex: currentDropIndex,
          round: currentDropRound
        }];
        setDropsetCompletedSets(newDropSets);

        const isLastDrop = currentDropIndex === currentItem.drops - 1;

        if (isLastDrop) {
          const isLastRound = currentDropRound === currentItem.rounds;

          if (isLastRound) {
            console.log('🎉 Drop set terminé !');
            completeDropsetExercise(newDropSets);
          } else {
            console.log(`💤 Repos entre tours (${currentDropRound}/${currentItem.rounds})`);
            setCurrentPhase('rest');
          }
        } else {
          console.log(`🔻 Drop suivant (${currentDropIndex + 1}/${currentItem.drops})`);
          setCurrentDropIndex(currentDropIndex + 1);
        }
      }
      // 🔥 LOGIQUE SUPERSET
      else if (isSuperset) {
        const exerciseId = currentExercise.id;
        const newSupersetSets = {
          ...supersetCompletedSets,
          [exerciseId]: [...(supersetCompletedSets[exerciseId] || []), { weight, reps }]
        };
        setSupersetCompletedSets(newSupersetSets);

        const isLastExerciseInSuperset = currentSupersetExerciseIndex === currentItem.exercises.length - 1;

        if (isLastExerciseInSuperset) {
          const isLastRound = currentSupersetRound === currentItem.rounds;

          if (isLastRound) {
            console.log('🎉 Superset terminé !');
            completeSupersetExercise(newSupersetSets);
          } else {
            console.log(`💤 Repos entre tours (${currentSupersetRound}/${currentItem.rounds})`);
            setCurrentPhase('rest');
          }
        } else {
          console.log(`➡️ Exercice suivant dans le superset`);
          setCurrentSupersetExerciseIndex(currentSupersetExerciseIndex + 1);
          setCurrentSetIndex(0);
        }
      }
      // ✅ EXERCICE NORMAL
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

  const completeDropsetExercise = (dropSets) => {
    console.log('✅ Drop set complété:', dropSets);

    setAllCompletedExercises([...allCompletedExercises, {
      exercise: currentItem,
      sets: dropSets,
      isDropset: true
    }]);

    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentPhase('transition');
    } else {
      finishWorkout();
    }
  };

  const completeTimedExercise = async (durationCompleted) => {
    try {
      console.log(`✅ Exercice chronométré complété: ${durationCompleted}s`);

      await db.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, set_number, weight, reps, superset_id, dropset_id, is_timed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [workoutId, currentExercise.id, 1, 0, durationCompleted, null, null, 1]
      );

      setTotalSets(prev => prev + 1);
      setCompletedSets(durationCompleted);
      setAllCompletedExercises([...allCompletedExercises, {
        exercise: currentItem,
        durationCompleted: durationCompleted,
        isTimed: true
      }]);

      if (currentExerciseIndex < exercises.length - 1) {
        setCurrentPhase('transition');
      } else {
        finishWorkout();
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement exercice chronométré:', error);
    }
  };

  const completeSupersetExercise = (supersetSets) => {
    console.log('✅ Superset complété:', supersetSets);

    setAllCompletedExercises([...allCompletedExercises, {
      exercise: currentItem,
      sets: supersetSets,
      isSuperset: true
    }]);

    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentPhase('transition');
    } else {
      finishWorkout();
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

    setCurrentSupersetRound(1);
    setCurrentSupersetExerciseIndex(0);
    setSupersetCompletedSets({});
    setCurrentSupersetId(null);

    setCurrentDropRound(1);
    setCurrentDropIndex(0);
    setDropsetCompletedSets([]);
    setCurrentDropsetId(null);

    setCurrentPhase('exercise');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const finishRest = () => {
    if (isSuperset) {
      setCurrentSupersetRound(currentSupersetRound + 1);
      setCurrentSupersetExerciseIndex(0);
      setCurrentSetIndex(0);
      console.log(`🔁 Nouveau tour du superset: ${currentSupersetRound + 1}/${currentItem.rounds}`);
    } else if (isDropset) {
      setCurrentDropRound(currentDropRound + 1);
      setCurrentDropIndex(0);
      console.log(`🔁 Nouveau tour du drop set: ${currentDropRound + 1}/${currentItem.rounds}`);
    }
    setCurrentPhase('exercise');
  };

  const finishWorkout = async () => {
    try {
      endSession();
      const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
      const xpGained = Math.floor((totalSets * 10) + (totalVolume / 100));

      await db.runAsync(
        'UPDATE workouts SET workout_duration = ?, total_volume = ?, total_sets = ?, xp_gained = ? WHERE id = ?',
        [workoutDuration, totalVolume, totalSets, xpGained, workoutId]
      );

      const { newStreak, newBestStreak } = await updateStreak();

      const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      const newXp = user.xp + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

      await db.runAsync(
        'UPDATE user SET xp = ?, level = ?, last_workout_date = ?, streak = ?, best_streak = ? WHERE id = 1',
        [newXp, newLevel, new Date().toISOString(), newStreak, newBestStreak]
      );

      console.log(`✅ Séance terminée ! Streak: ${newStreak} jours`);

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
            <Ionicons name="close" size={20} color="#ff4444" />
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
      if (isTimed) {
        content = (
          <View className="flex-1 bg-primary-dark">
            <TouchableOpacity
              className="absolute top-4 right-4 z-10 bg-danger/20 rounded-full p-3"
              onPress={handleQuitSession}
            >
              <Ionicons name="close" size={20} color="#ff4444" />
            </TouchableOpacity>

            <TimedExerciseScreen
              exercise={currentExercise}
              mode={currentItem.mode}
              duration={currentItem.duration}
              workDuration={currentItem.workDuration}
              restDuration={currentItem.restDuration}
              rounds={currentItem.rounds}
              onComplete={(durationCompleted) => {
                completeTimedExercise(durationCompleted);
              }}
            />
          </View>
        );
      } else {
        content = (
          <ExerciseScreen
            exercise={currentExercise}
            setNumber={currentSetIndex + 1}
            totalSets={isSuperset ? currentItem.rounds : isDropset ? currentItem.rounds : currentExercise.sets}
            onSetComplete={completeSet}
            previousSets={isSuperset ? (supersetCompletedSets[currentExercise.id] || []) : isDropset ? dropsetCompletedSets : completedSets}
            exerciseNumber={currentExerciseIndex + 1}
            totalExercises={exercises.length}
            onManageExercises={handleManageExercises}
            navigation={navigation}
            onQuitSession={handleQuitSession}
            routineId={routineId}
            isSuperset={isSuperset}
            supersetRound={isSuperset ? currentSupersetRound : null}
            supersetTotalRounds={isSuperset ? currentItem.rounds : null}
            supersetExerciseIndex={isSuperset ? currentSupersetExerciseIndex : null}
            supersetTotalExercises={isSuperset ? currentItem.exercises.length : null}
            supersetName={isSuperset ? `Superset ${currentExerciseIndex + 1}` : null}
            supersetExercises={isSuperset ? currentItem.exercises : null}
            allSupersetSets={isSuperset ? supersetCompletedSets : null}
            isDropset={isDropset}
            dropRound={isDropset ? currentDropRound : null}
            dropTotalRounds={isDropset ? currentItem.rounds : null}
            dropIndex={isDropset ? currentDropIndex : null}
            dropTotalDrops={isDropset ? currentItem.drops : null}
            allDropsetSets={isDropset ? dropsetCompletedSets : null}
            dropsetExerciseName={isDropset ? currentItem.exercise.name : null}
          />
        );
      }
      break;

    case 'rest':
      content = (
        <RestTimerScreen
          duration={isSuperset ? currentItem.rest_time : isDropset ? currentItem.rest_time : currentExercise.rest_time}
          onComplete={finishRest}
          nextSet={isSuperset || isDropset ? null : currentSetIndex + 1}
          totalSets={isSuperset || isDropset ? null : currentExercise.sets}
          exerciseName={
            isSuperset
              ? `Superset - Série ${currentSupersetRound + 1}/${currentItem.rounds}`
              : isDropset
                ? `Drop Set - Série ${currentDropRound + 1}/${currentItem.rounds}`
                : currentExercise.name
          }
          navigation={navigation}
          onQuitSession={handleQuitSession}
          isSuperset={isSuperset}
          supersetRound={isSuperset ? currentSupersetRound : null}
          supersetTotalRounds={isSuperset ? currentItem.rounds : null}
          isDropset={isDropset}
          dropRound={isDropset ? currentDropRound : null}
          dropTotalRounds={isDropset ? currentItem.rounds : null}
        />
      );
      break;

    case 'transition':
      content = (
        <ExerciseTransitionScreen
          completedExercise={currentItem}
          completedSets={isSuperset ? supersetCompletedSets : isDropset ? dropsetCompletedSets : isTimed ? completedSets : completedSets}
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
          isDropset={currentItem?.type === 'dropset'}
          isTimed={currentItem?.type === 'timed'}
        />
      );
      break;

    default:
      content = null;
  }

  return (
    <View className="flex-1">
      <SessionTimer />
      {content}
      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </View>
  );
}



