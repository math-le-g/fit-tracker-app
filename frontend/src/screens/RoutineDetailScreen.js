import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import LastSessionModal from '../components/LastSessionModal';
import { getSupersetInfo } from '../utils/supersetHelpers';

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [warmupDuration, setWarmupDuration] = useState(0);
  const [lastWorkout, setLastWorkout] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  
  // STATE POUR LE MODAL DERNIÈRE SÉANCE
  const [lastSessionModalVisible, setLastSessionModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRoutineDetails();
    }, [])
  );

  const loadRoutineDetails = async () => {
    try {
      const routineData = await db.getFirstAsync(
        'SELECT * FROM routines WHERE id = ?',
        [routineId]
      );

      // CHARGER AVEC superset_data (qui contient aussi les drop sets)
      const rawExercises = await db.getAllAsync(`
        SELECT 
          re.id as routine_exercise_id,
          e.id,
          e.name,
          e.muscle_group,
          e.equipment,
          re.sets,
          re.rest_time,
          re.superset_data
        FROM routine_exercises re
        LEFT JOIN exercises e ON re.exercise_id = e.id
        WHERE re.routine_id = ?
        ORDER BY re.order_index ASC
      `, [routineId]);

      // PARSER LES SUPERSETS ET DROP SETS
      const parsedExercises = rawExercises.map((ex, index) => {
        if (ex.superset_data) {
          try {
            const data = JSON.parse(ex.superset_data);
            return {
              ...data,
              id: `${data.type}_${ex.routine_exercise_id}_${index}`
            };
          } catch (error) {
            console.error('❌ Erreur parsing:', error);
            return null;
          }
        } else {
          return ex;
        }
      }).filter(Boolean);

      console.log('📋 EXERCICES CHARGÉS:', parsedExercises);

      setRoutine(routineData);
      setExercises(parsedExercises);
      loadLastWorkoutSuggestions();
    } catch (error) {
      console.error('❌ Erreur chargement détails routine:', error);
    }
  };

  // 🆕 MODIFIÉ : Filtrer par routine_id
  const loadLastWorkoutSuggestions = async () => {
    try {
      // Récupérer le dernier workout DE CETTE ROUTINE uniquement
      const lastWorkoutData = await db.getFirstAsync(`
        SELECT w.*, 
          w.warmup_duration,
          (SELECT COUNT(*) FROM sets WHERE workout_id = w.id) as total_sets,
          (SELECT SUM(weight * reps) FROM sets WHERE workout_id = w.id) as total_volume
        FROM workouts w
        WHERE w.routine_id = ?
        ORDER BY w.date DESC
        LIMIT 1
      `, [routineId]);

      if (lastWorkoutData) {
        // Calculer il y a combien de jours
        const lastDate = new Date(lastWorkoutData.date);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Charger les exercices avec détails complets
        const workoutExercises = await db.getAllAsync(`
          SELECT 
            e.name,
            COUNT(DISTINCT s.set_number) as sets_done,
            MAX(s.weight) as max_weight,
            AVG(s.reps) as avg_reps,
            SUM(s.weight * s.reps) as exercise_volume
          FROM sets s
          JOIN exercises e ON s.exercise_id = e.id
          WHERE s.workout_id = ?
          GROUP BY s.exercise_id
          ORDER BY MIN(s.id)
          LIMIT 3
        `, [lastWorkoutData.id]);

        // Charger les détails complets pour la modal
        const allWorkoutDetails = await db.getAllAsync(`
          SELECT 
            e.id as exercise_id,
            e.name,
            s.id,
            s.set_number,
            s.weight,
            s.reps,
            s.superset_id,
            s.dropset_id,
            s.is_timed
          FROM sets s
          JOIN exercises e ON s.exercise_id = e.id
          WHERE s.workout_id = ?
          ORDER BY s.id ASC
        `, [lastWorkoutData.id]);

        setLastWorkout({
          ...lastWorkoutData,
          daysAgo: diffDays,
          exercises: workoutExercises,
          allDetails: allWorkoutDetails
        });
      } else {
        // Aucun workout pour cette routine = reset
        setLastWorkout(null);
      }
    } catch (error) {
      console.error('❌ Erreur chargement dernière séance:', error);
      setLastWorkout(null);
    }
  };

  const getTotalSets = () => {
    return exercises.reduce((sum, ex) => {
      if (ex.type === 'superset' || ex.type === 'dropset') {
        return sum + ex.rounds;
      }
      if (ex.type === 'timed') {
        return sum + (ex.mode === 'simple' ? 1 : ex.rounds);
      }
      return sum + (ex.sets || 0);
    }, 0);
  };

  const getEstimatedDuration = () => {
    const workoutTime = exercises.reduce((sum, ex) => {
      if (ex.type === 'superset') {
        // Superset: nb exercices × temps par exercice × nb séries + repos entre séries
        const exerciseTime = ex.exercises.length * 30; // 30s par exercice
        return sum + (ex.rounds * exerciseTime) + ((ex.rounds - 1) * ex.rest_time);
      }
      if (ex.type === 'dropset') {
        // Dropset: nb séries × nb drops × temps par drop + repos entre séries
        const dropTime = ex.drops * 15; // 15s par drop
        return sum + (ex.rounds * dropTime) + ((ex.rounds - 1) * ex.rest_time);
      }
      if (ex.type === 'timed') {
        if (ex.mode === 'simple') {
          return sum + ex.duration;
        } else {
          return sum + ((ex.workDuration + ex.restDuration) * ex.rounds);
        }
      }
      // Exercice normal: temps par série + repos entre séries
      return sum + ((ex.sets || 0) * 45) + (((ex.sets || 1) - 1) * (ex.rest_time || 90));
    }, 0);
    return Math.round(workoutTime / 60) + warmupDuration;
  };

  const startWorkout = () => {
    if (warmupDuration > 0) {
      navigation.navigate('Warmup', {
        warmupDuration: warmupDuration,
        exercises: exercises,
        routineName: routine.name,
        routineId: routineId, // 🆕 PASSER LE routineId
        lastWorkoutDuration: lastWorkout?.workout_duration || null
      });
    } else {
      navigation.navigate('WorkoutSession', {
        exercises: exercises,
        routineName: routine.name,
        routineId: routineId, // 🆕 PASSER LE routineId
        skipWarmup: true
      });
    }
  };

  const handleModifyRoutine = () => {
    navigation.navigate('EditRoutine', { routineId });
  };

  const handleDeleteRoutine = () => {
    setModalConfig({
      title: '🗑️ Supprimer cette routine ?',
      message: `Êtes-vous sûr de vouloir supprimer "${routine.name}" ?\n\nCette action est irréversible.`,
      icon: 'trash',
      iconColor: '#ff4444',
      buttons: [
        { text: 'Annuler', onPress: () => { } },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [routineId]);
              await db.runAsync('DELETE FROM routines WHERE id = ?', [routineId]);
              console.log('✅ Routine supprimée');
              navigation.goBack();
            } catch (error) {
              console.error('❌ Erreur suppression routine:', error);
            }
          }
        }
      ]
    });
    setModalVisible(true);
  };

  if (!routine) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Chargement...</Text>
      </View>
    );
  }

  const showFullWorkoutDetails = () => {
    setLastSessionModalVisible(true);
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* En-tête */}
        <Text className="text-white text-3xl font-bold mb-2">
          {routine.name}
        </Text>
        <View className="flex-row items-center mb-6">
          <View className="flex-row items-center mr-4">
            <Ionicons name="barbell-outline" size={18} color="#6b7280" />
            <Text className="text-gray-400 ml-1">
              {exercises.length} exercices
            </Text>
          </View>
          <View className="flex-row items-center mr-4">
            <Ionicons name="layers-outline" size={18} color="#6b7280" />
            <Text className="text-gray-400 ml-1">
              {getTotalSets()} séries
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name={lastWorkout && lastWorkout.workout_duration ? "checkmark-circle" : "time-outline"}
              size={18}
              color={lastWorkout && lastWorkout.workout_duration ? "#00ff88" : "#6b7280"}
            />
            <Text className={`ml-1 ${lastWorkout && lastWorkout.workout_duration ? 'text-success' : 'text-gray-400'}`}>
              {lastWorkout && lastWorkout.workout_duration
                ? `${Math.round(lastWorkout.workout_duration / 60)} min`
                : `~${getEstimatedDuration()} min`
              }
            </Text>
          </View>
        </View>

        {/* Échauffement */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6 border border-danger/20">
          <View className="flex-row items-center mb-3">
            <Ionicons name="flame" size={24} color="#ff6b35" />
            <Text className="text-white text-lg font-bold ml-2">
              ÉCHAUFFEMENT
            </Text>
          </View>

          <View className="flex-row justify-between">
            {[5, 10, 15].map((min) => (
              <TouchableOpacity
                key={min}
                className={`flex-1 rounded-xl p-3 mx-1 ${warmupDuration === min ? 'bg-danger' : 'bg-primary-dark'}`}
                onPress={() => setWarmupDuration(min)}
              >
                <Text className={`text-center font-bold ${warmupDuration === min ? 'text-white' : 'text-gray-400'}`}>
                  {min} min
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 ml-1 ${warmupDuration === 0 ? 'bg-gray-700' : 'bg-primary-dark'}`}
              onPress={() => setWarmupDuration(0)}
            >
              <Text className={`text-center font-bold ${warmupDuration === 0 ? 'text-white' : 'text-gray-400'}`}>
                Passer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Liste exercices */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-3">
            📋 Exercices de la séance
          </Text>

          {exercises.map((item, index) => {
            const isSuperset = item.type === 'superset';
            const isDropset = item.type === 'dropset';
            const isTimed = item.type === 'timed';

            if (isTimed) {
              return (
                <View key={item.id || index} className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''}`}>
                  <View className="bg-purple-500/10 rounded-2xl p-4 border border-purple-500/30">
                    <View className="flex-row items-center mb-3">
                      <View className="bg-purple-500 rounded-full w-10 h-10 items-center justify-center mr-3">
                        <Ionicons name="timer" size={20} color="#0a0e27" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-purple-500 text-xs font-bold mb-1">
                          ⏱️ EXERCICE CHRONOMÉTRÉ {index + 1}
                        </Text>
                        <Text className="text-white font-bold text-lg">
                          {item.exercise.name}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-primary-dark rounded-xl p-3">
                      {item.mode === 'simple' ? (
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons name="time" size={16} color="#a855f7" />
                            <Text className="text-gray-400 text-sm ml-2">Durée :</Text>
                          </View>
                          <Text className="text-white font-bold">{Math.floor(item.duration / 60)} min</Text>
                        </View>
                      ) : (
                        <>
                          <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                              <Ionicons name="flash" size={16} color="#a855f7" />
                              <Text className="text-gray-400 text-sm ml-2">Travail :</Text>
                            </View>
                            <Text className="text-white font-bold">{item.workDuration}s</Text>
                          </View>
                          <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center">
                              <Ionicons name="pause" size={16} color="#a855f7" />
                              <Text className="text-gray-400 text-sm ml-2">Repos :</Text>
                            </View>
                            <Text className="text-white font-bold">{item.restDuration}s</Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                              <Ionicons name="repeat" size={16} color="#a855f7" />
                              <Text className="text-gray-400 text-sm ml-2">Séries :</Text>
                            </View>
                            <Text className="text-white font-bold">{item.rounds}</Text>
                          </View>
                        </>
                      )}
                    </View>
                    <View className="bg-purple-500/20 rounded-xl p-2 border border-purple-500/30 mt-3">
                      <Text className="text-purple-500 text-xs text-center font-semibold">
                        {item.mode === 'simple' ? '⏱️ Timer libre' : `🔥 ${item.rounds} intervalles (${item.workDuration}s / ${item.restDuration}s)`}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            } else if (isSuperset) {
              const supersetInfo = getSupersetInfo(item.exercises.length);
              return (
                <View key={item.id || index} className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''}`}>
                  <View className={`${supersetInfo.bgColor}/10 rounded-2xl p-4 border border-accent-cyan/30`}>
                    <View className="flex-row items-center mb-3">
                      <View className={`${supersetInfo.bgColor} rounded-full w-10 h-10 items-center justify-center mr-3`}>
                        <Ionicons name={supersetInfo.icon} size={20} color="#0a0e27" />
                      </View>
                      <View className="flex-1">
                        <Text className={`${supersetInfo.textColor} text-xs font-bold mb-1`}>
                          {supersetInfo.emoji} {supersetInfo.name.toUpperCase()} {index + 1}
                        </Text>
                        <Text className="text-white font-bold text-lg">
                          {item.exercises.map(ex => ex.name).join(' + ')}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-primary-dark rounded-xl p-3 mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="layers" size={16} color="#00f5ff" />
                          <Text className="text-gray-400 text-sm ml-2">Séries :</Text>
                        </View>
                        <Text className="text-white font-bold">{item.rounds}</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="time" size={16} color="#00f5ff" />
                          <Text className="text-gray-400 text-sm ml-2">Repos :</Text>
                        </View>
                        <Text className="text-white font-bold">
                          {`${Math.floor(item.rest_time / 60)}:${(item.rest_time % 60).toString().padStart(2, '0')}`}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-primary-dark rounded-xl p-3">
                      <Text className={`${supersetInfo.textColor} text-xs font-bold mb-2`}>
                        ⚡ ENCHAÎNEMENT SANS REPOS
                      </Text>
                      {item.exercises.map((ex, exIndex) => (
                        <View key={ex.id} className="flex-row items-center mb-2">
                          <View className={`${supersetInfo.bgColor} rounded-full w-6 h-6 items-center justify-center mr-2`}>
                            <Text className="text-primary-dark text-xs font-bold">{exIndex + 1}</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-white font-semibold text-sm">{ex.name}</Text>
                            <Text className="text-gray-400 text-xs">{ex.muscle_group} • {ex.equipment}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            } else if (isDropset) {
              return (
                <View key={item.id || index} className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''}`}>
                  <View className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/30">
                    <View className="flex-row items-center mb-3">
                      <View className="bg-amber-500 rounded-full w-10 h-10 items-center justify-center mr-3">
                        <Ionicons name="trending-down" size={20} color="#0a0e27" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-amber-500 text-xs font-bold mb-1">🔻 DROP SET {index + 1}</Text>
                        <Text className="text-white font-bold text-lg">{item.exercise.name}</Text>
                      </View>
                    </View>
                    <View className="bg-primary-dark rounded-xl p-3 mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="layers" size={16} color="#f59e0b" />
                          <Text className="text-gray-400 text-sm ml-2">Séries :</Text>
                        </View>
                        <Text className="text-white font-bold">{item.rounds}</Text>
                      </View>
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="flash" size={16} color="#f59e0b" />
                          <Text className="text-gray-400 text-sm ml-2">Drops :</Text>
                        </View>
                        <Text className="text-white font-bold">{item.drops}</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="time" size={16} color="#f59e0b" />
                          <Text className="text-gray-400 text-sm ml-2">Repos :</Text>
                        </View>
                        <Text className="text-white font-bold">
                          {`${Math.floor(item.rest_time / 60)}:${(item.rest_time % 60).toString().padStart(2, '0')}`}
                        </Text>
                      </View>
                      <View className="mt-2 pt-2 border-t border-primary-navy">
                        <Text className="text-gray-400 text-xs">🎯 {item.exercise.muscle_group} • {item.exercise.equipment}</Text>
                      </View>
                    </View>
                    <View className="bg-amber-500/20 rounded-xl p-2 border border-amber-500/30">
                      <Text className="text-amber-500 text-xs text-center font-semibold">
                        ⚡ Poids dégressifs • Enchaînement sans repos
                      </Text>
                    </View>
                  </View>
                </View>
              );
            } else {
              return (
                <View key={item.id} className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''}`}>
                  <View className="bg-success/10 rounded-2xl p-4 border border-success/30">
                    <View className="flex-row items-center mb-3">
                      <View className="bg-success rounded-full w-10 h-10 items-center justify-center mr-3">
                        <Ionicons name="fitness" size={20} color="#0a0e27" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-success text-xs font-bold mb-1">💪 EXERCICE {index + 1}</Text>
                        <Text className="text-white font-bold text-lg">{item.name}</Text>
                      </View>
                    </View>
                    <View className="bg-primary-dark rounded-xl p-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="layers" size={16} color="#00ff88" />
                          <Text className="text-gray-400 text-sm ml-2">Séries :</Text>
                        </View>
                        <Text className="text-white font-bold">{item.sets}</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="time" size={16} color="#00ff88" />
                          <Text className="text-gray-400 text-sm ml-2">Repos :</Text>
                        </View>
                        <Text className="text-white font-bold">
                          {`${Math.floor(item.rest_time / 60)}:${(item.rest_time % 60).toString().padStart(2, '0')}`}
                        </Text>
                      </View>
                      {item.muscle_group && (
                        <View className="mt-2 pt-2 border-t border-primary-navy">
                          <Text className="text-gray-400 text-xs">🎯 {item.muscle_group} • {item.equipment || 'Non défini'}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }
          })}
        </View>

        {/* Suggestions dernière séance */}
        {lastWorkout ? (
          <View className="bg-blue-500/10 rounded-2xl p-4 mb-6 border border-blue-500/30">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={20} color="#3b82f6" />
                <Text className="text-blue-500 text-sm font-bold ml-2">📊 DERNIÈRE SÉANCE</Text>
              </View>
              <Text className="text-gray-400 text-xs">
                {lastWorkout.daysAgo === 0 ? "Aujourd'hui" : lastWorkout.daysAgo === 1 ? "Il y a 1 jour" : `Il y a ${lastWorkout.daysAgo} jours`}
              </Text>
            </View>

            <View className="flex-row items-center justify-between mb-3 bg-primary-dark rounded-xl p-3">
              <Text className="text-gray-400 text-sm">💪 {lastWorkout.total_sets || 0} séries</Text>
              <Text className="text-gray-400 text-sm">📦 {Math.round(lastWorkout.total_volume || 0)}kg</Text>
              <Text className="text-gray-400 text-sm">
                🔥 {lastWorkout.warmup_duration 
                  ? (lastWorkout.warmup_duration >= 60 
                      ? `${Math.floor(lastWorkout.warmup_duration / 60)}min` 
                      : `${lastWorkout.warmup_duration}s`)
                  : '0min'}
              </Text>
            </View>

            {lastWorkout.exercises && lastWorkout.exercises.length > 0 ? (
              <View className="bg-primary-dark rounded-xl p-3">
                <Text className="text-blue-500 text-xs font-bold mb-2">🏋️ EXERCICES RÉALISÉS</Text>
                {lastWorkout.exercises.map((ex, idx) => (
                  <View key={idx} className={`flex-row items-center justify-between ${idx < lastWorkout.exercises.length - 1 ? 'mb-2 pb-2 border-b border-primary-navy' : ''}`}>
                    <View className="flex-1">
                      <Text className="text-white text-sm font-semibold">{ex.name}</Text>
                      <Text className="text-gray-400 text-xs">{ex.sets_done} séries • Max: {ex.max_weight}kg</Text>
                    </View>
                    <Text className="text-blue-500 text-xs font-bold">{Math.round(ex.exercise_volume)}kg</Text>
                  </View>
                ))}
                {lastWorkout.exercises.length === 3 ? (
                  <TouchableOpacity onPress={showFullWorkoutDetails}>
                    <Text className="text-blue-500 text-xs text-center mt-2 font-semibold">Voir plus →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : (
          <View className="bg-gray-700/10 rounded-2xl p-4 mb-6 border border-gray-700/30">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={20} color="#6b7280" />
              <Text className="text-gray-400 text-sm ml-2">Première fois avec cette routine ! 🚀</Text>
            </View>
          </View>
        )}

        {/* Bouton commencer */}
        <TouchableOpacity className="bg-accent-cyan rounded-2xl p-4 items-center mb-3" onPress={startWorkout}>
          <View className="flex-row items-center">
            <Ionicons name="play" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-xl font-bold ml-2">COMMENCER LA SÉANCE</Text>
          </View>
          {warmupDuration > 0 ? (
            <Text className="text-primary-dark/70 text-sm mt-1">Échauffement {warmupDuration} min inclus</Text>
          ) : null}
        </TouchableOpacity>

        {/* Bouton modifier */}
        <TouchableOpacity className="bg-primary-navy rounded-2xl p-3 items-center mb-3" onPress={handleModifyRoutine}>
          <View className="flex-row items-center">
            <Ionicons name="create-outline" size={20} color="#00f5ff" />
            <Text className="text-accent-cyan font-semibold ml-2">✏️ Modifier la séance</Text>
          </View>
        </TouchableOpacity>

        {/* Bouton supprimer */}
        <TouchableOpacity className="bg-danger/10 rounded-2xl p-3 items-center border border-danger/30" onPress={handleDeleteRoutine}>
          <View className="flex-row items-center">
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
            <Text className="text-danger font-semibold ml-2">🗑️ Supprimer la routine</Text>
          </View>
        </TouchableOpacity>
      </View>

      <LastSessionModal visible={lastSessionModalVisible} onClose={() => setLastSessionModalVisible(false)} lastWorkout={lastWorkout} />
      <CustomModal visible={modalVisible} onClose={() => setModalVisible(false)} {...modalConfig} />
    </ScrollView>
  );
}