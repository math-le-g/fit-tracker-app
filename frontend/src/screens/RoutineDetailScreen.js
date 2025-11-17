import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import { getSupersetInfo } from '../utils/supersetHelpers';

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [warmupDuration, setWarmupDuration] = useState(0);
  const [lastWorkout, setLastWorkout] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

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

      // 🆕 PARSER LES SUPERSETS ET DROP SETS
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

  const loadLastWorkoutSuggestions = async () => {
    try {
      // Récupérer le dernier workout
      const lastWorkoutData = await db.getFirstAsync(`
      SELECT w.*, 
        (SELECT COUNT(*) FROM sets WHERE workout_id = w.id) as total_sets,
        (SELECT SUM(weight * reps) FROM sets WHERE workout_id = w.id) as total_volume
      FROM workouts w
      ORDER BY w.date DESC
      LIMIT 1
    `);

      if (lastWorkoutData) {
        // Calculer il y a combien de jours
        const lastDate = new Date(lastWorkoutData.date);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // 🆕 CHARGER LES EXERCICES DE CETTE SÉANCE
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

        setLastWorkout({
          ...lastWorkoutData,
          daysAgo: diffDays,
          exercises: workoutExercises
        });
      }
    } catch (error) {
      console.error('❌ Erreur chargement dernière séance:', error);
    }
  };

  const getTotalSets = () => {
    return exercises.reduce((sum, ex) => {
      // Superset ou Dropset : compter les rounds
      if (ex.type === 'superset' || ex.type === 'dropset') {
        return sum + ex.rounds;
      }
      // Exercice chronométré : 1 série en mode simple, rounds en mode intervalle
      if (ex.type === 'timed') {
        return sum + (ex.mode === 'simple' ? 1 : ex.rounds);
      }
      // Exercice normal : compter les sets
      return sum + (ex.sets || 0);
    }, 0);
  };

  const getEstimatedDuration = () => {
    const workoutTime = exercises.reduce((sum, ex) => {
      // Superset ou Dropset : temps = (rounds * 45s) + repos entre rounds
      if (ex.type === 'superset' || ex.type === 'dropset') {
        return sum + (ex.rounds * 45) + ((ex.rounds - 1) * ex.rest_time);
      }
      // Exercice chronométré
      if (ex.type === 'timed') {
        if (ex.mode === 'simple') {
          // Mode simple : durée directe en secondes
          return sum + ex.duration;
        } else {
          // Mode intervalle : (travail + repos) * rounds
          return sum + ((ex.workDuration + ex.restDuration) * ex.rounds);
        }
      }
      // Exercice normal : temps = (sets * 45s) + repos entre sets
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
        lastWorkoutDuration: lastWorkout?.workout_duration || null
      });
    } else {
      // Passer directement à la séance
      navigation.navigate('WorkoutSession', {
        exercises: exercises,
        routineName: routine.name,
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
        {
          text: 'Annuler',
          onPress: () => { }
        },
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
              setModalConfig({
                title: 'Erreur',
                message: 'Impossible de supprimer la routine',
                icon: 'alert-circle',
                iconColor: '#ff4444',
                buttons: [
                  { text: 'OK', style: 'primary', onPress: () => { } }
                ]
              });
              setModalVisible(true);
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
            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 mr-2 ${warmupDuration === 5 ? 'bg-danger' : 'bg-primary-dark'
                }`}
              onPress={() => setWarmupDuration(5)}
            >
              <Text className={`text-center font-bold ${warmupDuration === 5 ? 'text-white' : 'text-gray-400'
                }`}>
                5 min
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 mx-1 ${warmupDuration === 10 ? 'bg-danger' : 'bg-primary-dark'
                }`}
              onPress={() => setWarmupDuration(10)}
            >
              <Text className={`text-center font-bold ${warmupDuration === 10 ? 'text-white' : 'text-gray-400'
                }`}>
                10 min
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 mx-1 ${warmupDuration === 15 ? 'bg-danger' : 'bg-primary-dark'
                }`}
              onPress={() => setWarmupDuration(15)}
            >
              <Text className={`text-center font-bold ${warmupDuration === 15 ? 'text-white' : 'text-gray-400'
                }`}>
                15 min
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 ml-2 ${warmupDuration === 0 ? 'bg-gray-700' : 'bg-primary-dark'
                }`}
              onPress={() => setWarmupDuration(0)}
            >
              <Text className={`text-center font-bold ${warmupDuration === 0 ? 'text-white' : 'text-gray-400'
                }`}>
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
              // ⏱️ AFFICHAGE EXERCICE CHRONOMÉTRÉ
              return (
                <View
                  key={item.id || index}
                  className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''}`}
                >
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

                    {/* Détails */}
                    <View className="bg-primary-dark rounded-xl p-3">
                      {item.mode === 'simple' ? (
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons name="time" size={16} color="#a855f7" />
                            <Text className="text-gray-400 text-sm ml-2">Durée :</Text>
                          </View>
                          <Text className="text-white font-bold">
                            {Math.floor(item.duration / 60)} min
                          </Text>
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
                              <Text className="text-gray-400 text-sm ml-2">Tours :</Text>
                            </View>
                            <Text className="text-white font-bold">{item.rounds}</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Note explicative */}
                    <View className="bg-purple-500/20 rounded-xl p-2 border border-purple-500/30 mt-3">
                      <Text className="text-purple-500 text-xs text-center font-semibold">
                        {item.mode === 'simple'
                          ? '⏱️ Timer libre'
                          : `🔥 ${item.rounds} intervalles (${item.workDuration}s / ${item.restDuration}s)`
                        }
                      </Text>
                    </View>
                  </View>
                </View>
              );
            } else if (isSuperset) {
              const supersetInfo = getSupersetInfo(item.exercises.length);
              return (
                <View
                  key={item.id || index}
                  className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''}`}
                >
                  <View className={`${supersetInfo.bgColor}/10 rounded-2xl p-4 border ${supersetInfo.borderColor}`}>
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

                    {/* Détails du superset */}
                    <View className="bg-primary-dark rounded-xl p-3 mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="layers" size={16} color="#00f5ff" />
                          <Text className="text-gray-400 text-sm ml-2">Tours :</Text>
                        </View>
                        <Text className="text-white font-bold">{item.rounds}</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="time" size={16} color="#00f5ff" />
                          <Text className="text-gray-400 text-sm ml-2">Repos :</Text>
                        </View>
                        <Text className="text-white font-bold">
                          {Math.floor(item.rest_time / 60)}:{(item.rest_time % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>
                    </View>

                    {/* Liste des exercices */}
                    <View className="bg-primary-dark rounded-xl p-3">
                      <Text className={`${supersetInfo.textColor} text-xs font-bold mb-2`}>
                        ⚡ ENCHAÎNEMENT SANS REPOS
                      </Text>
                      {item.exercises.map((ex, exIndex) => (
                        <View key={ex.id} className="flex-row items-center mb-2">
                          <View className={`${supersetInfo.bgColor} rounded-full w-6 h-6 items-center justify-center mr-2`}>
                            <Text className="text-primary-dark text-xs font-bold">
                              {exIndex + 1}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-white font-semibold text-sm">{ex.name}</Text>
                            <Text className="text-gray-400 text-xs">
                              {ex.muscle_group} • {ex.equipment}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            } else if (isDropset) {
              return (
                <View
                  key={item.id || index}
                  className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''}`}
                >
                  <View className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/30">
                    <View className="flex-row items-center mb-3">
                      <View className="bg-amber-500 rounded-full w-10 h-10 items-center justify-center mr-3">
                        <Ionicons name="trending-down" size={20} color="#0a0e27" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-amber-500 text-xs font-bold mb-1">
                          🔻 DROP SET {index + 1}
                        </Text>
                        <Text className="text-white font-bold text-lg">
                          {item.exercise.name}
                        </Text>
                      </View>
                    </View>

                    {/* Détails du drop set */}
                    <View className="bg-primary-dark rounded-xl p-3 mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="flash" size={16} color="#f59e0b" />
                          <Text className="text-gray-400 text-sm ml-2">Drops :</Text>
                        </View>
                        <Text className="text-white font-bold">{item.drops}</Text>
                      </View>
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name="layers" size={16} color="#f59e0b" />
                          <Text className="text-gray-400 text-sm ml-2">Tours :</Text>
                        </View>
                        <Text className="text-white font-bold">{item.rounds}</Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Ionicons name="time" size={16} color="#f59e0b" />
                          <Text className="text-gray-400 text-sm ml-2">Repos :</Text>
                        </View>
                        <Text className="text-white font-bold">
                          {Math.floor(item.rest_time / 60)}:{(item.rest_time % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>

                      {/* Info groupe musculaire */}
                      <View className="mt-2 pt-2 border-t border-primary-navy">
                        <Text className="text-gray-400 text-xs">
                          🎯 {item.exercise.muscle_group} • {item.exercise.equipment}
                        </Text>
                      </View>
                    </View>

                    {/* Note explicative */}
                    <View className="bg-amber-500/20 rounded-xl p-2 border border-amber-500/30">
                      <Text className="text-amber-500 text-xs text-center font-semibold">
                        ⚡ Poids dégressifs • Enchaînement sans repos
                      </Text>
                    </View>
                  </View>
                </View>
              );
            } else {
              // ✅ NOUVEAU CODE STYLÉ
              return (
                <View
                  key={item.id}
                  className={`py-3 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''
                    }`}
                >
                  <View className="bg-success/10 rounded-2xl p-4 border border-success/30">
                    <View className="flex-row items-center mb-3">
                      <View className="bg-success rounded-full w-10 h-10 items-center justify-center mr-3">
                        <Ionicons name="fitness" size={20} color="#0a0e27" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-success text-xs font-bold mb-1">
                          💪 EXERCICE {index + 1}
                        </Text>
                        <Text className="text-white font-bold text-lg">
                          {item.name}
                        </Text>
                      </View>
                    </View>

                    {/* Détails de l'exercice */}
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
                          {Math.floor(item.rest_time / 60)}:{(item.rest_time % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>

                      {/* Info groupe musculaire */}
                      {item.muscle_group && (
                        <View className="mt-2 pt-2 border-t border-primary-navy">
                          <Text className="text-gray-400 text-xs">
                            🎯 {item.muscle_group} • {item.equipment || 'Non défini'}
                          </Text>
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
                <Text className="text-blue-500 text-sm font-bold ml-2">
                  📊 DERNIÈRE SÉANCE
                </Text>
              </View>
              <Text className="text-gray-400 text-xs">
                Il y a {lastWorkout.daysAgo === 0 ? "aujourd'hui" : lastWorkout.daysAgo === 1 ? "1 jour" : `${lastWorkout.daysAgo} jours`}
              </Text>
            </View>

            {/* Stats globales */}
            <View className="flex-row items-center justify-between mb-3 bg-primary-dark rounded-xl p-3">
              <View className="flex-row items-center">
                <Text className="text-gray-400 text-sm">
                  💪 {lastWorkout.total_sets || 0} séries
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-400 text-sm">
                  📦 {Math.round(lastWorkout.total_volume || 0)}kg
                </Text>
              </View>
              {lastWorkout.duration && (
                <View className="flex-row items-center">
                  <Text className="text-gray-400 text-sm">
                    ⏱️ {Math.round(lastWorkout.duration / 60)}min
                  </Text>
                </View>
              )}
            </View>

            {/* Liste des exercices */}
            {lastWorkout.exercises && lastWorkout.exercises.length > 0 && (
              <View className="bg-primary-dark rounded-xl p-3">
                <Text className="text-blue-500 text-xs font-bold mb-2">
                  🏋️ EXERCICES RÉALISÉS
                </Text>
                {lastWorkout.exercises.map((ex, idx) => (
                  <View key={idx} className={`flex-row items-center justify-between ${idx < lastWorkout.exercises.length - 1 ? 'mb-2 pb-2 border-b border-primary-navy' : ''}`}>
                    <View className="flex-1">
                      <Text className="text-white text-sm font-semibold">
                        {ex.name}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {ex.sets_done} séries • Max: {ex.max_weight}kg
                      </Text>
                    </View>
                    <Text className="text-blue-500 text-xs font-bold">
                      {Math.round(ex.exercise_volume)}kg
                    </Text>
                  </View>
                ))}
                {lastWorkout.exercises.length === 3 && (
                  <TouchableOpacity
                    onPress={() => {
                      // TODO: Afficher modal avec tous les exercices
                      setModalConfig({
                        title: '📋 Tous les exercices',
                        message: 'Fonctionnalité à venir',
                        icon: 'list',
                        iconColor: '#3b82f6',
                        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
                      });
                      setModalVisible(true);
                    }}
                  >
                    <Text className="text-blue-500 text-xs text-center mt-2 font-semibold">
                      ... et plus →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          <View className="bg-gray-700/10 rounded-2xl p-4 mb-6 border border-gray-700/30">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={20} color="#6b7280" />
              <Text className="text-gray-400 text-sm ml-2">
                Première fois avec cette routine ! 🚀
              </Text>
            </View>
          </View>
        )}

        {/* Bouton commencer */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-4 items-center mb-3"
          onPress={startWorkout}
        >
          <View className="flex-row items-center">
            <Ionicons name="play" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-xl font-bold ml-2">
              COMMENCER LA SÉANCE
            </Text>
          </View>
          {warmupDuration > 0 && (
            <Text className="text-primary-dark/70 text-sm mt-1">
              Échauffement {warmupDuration} min inclus
            </Text>
          )}
        </TouchableOpacity>

        {/* Bouton modifier */}
        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-3 items-center mb-3"
          onPress={handleModifyRoutine}
        >
          <View className="flex-row items-center">
            <Ionicons name="create-outline" size={20} color="#00f5ff" />
            <Text className="text-accent-cyan font-semibold ml-2">
              ✏️ Modifier la séance
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bouton supprimer */}
        <TouchableOpacity
          className="bg-danger/10 rounded-2xl p-3 items-center border border-danger/30"
          onPress={handleDeleteRoutine}
        >
          <View className="flex-row items-center">
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
            <Text className="text-danger font-semibold ml-2">
              🗑️ Supprimer la routine
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </ScrollView>
  );
}