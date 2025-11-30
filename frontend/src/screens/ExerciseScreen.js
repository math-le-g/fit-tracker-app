import { View, Text, TouchableOpacity, TextInput, ScrollView, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getSupersetInfo } from '../utils/supersetHelpers';
import { analyzeAndSuggest, loadPerformanceHistory, formatSuggestionMessage } from '../utils/suggestionEngine';

// Activer LayoutAnimation pour Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ExerciseScreen({
  exercise,
  setNumber,
  totalSets,
  onSetComplete,
  previousSets,
  exerciseNumber,
  totalExercises,
  onManageExercises,
  onQuitSession,
  navigation,
  routineId = null,
  // PROPS POUR LES SUPERSETS
  isSuperset = false,
  supersetRound = null,
  supersetTotalRounds = null,
  supersetExerciseIndex = null,
  supersetTotalExercises = null,
  supersetName = null,
  supersetExercises = null,
  allSupersetSets = null,
  // PROPS POUR LES DROP SETS
  isDropset = false,
  dropRound = null,
  dropTotalRounds = null,
  dropIndex = null,
  dropTotalDrops = null,
  allDropsetSets = null,
  dropsetExerciseName = null
}) {

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [lastPerformance, setLastPerformance] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [lastSessionExpanded, setLastSessionExpanded] = useState(false);
  
  // Animation pour le chevron
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // OBTENIR LES INFOS DU SUPERSET
  const supersetInfo = isSuperset && supersetTotalExercises
    ? getSupersetInfo(supersetTotalExercises)
    : null;

  // VÉRIFIER SI C'EST LE DERNIER EXERCICE DU SUPERSET
  const isLastExerciseInSuperset = isSuperset && (supersetExerciseIndex === supersetTotalExercises - 1);

  // VÉRIFIER SI C'EST LE DERNIER DROP
  const isLastDrop = isDropset && (dropIndex === dropTotalDrops - 1);

  useEffect(() => {
    // Reset les valeurs quand l'exercice change
    setWeight('');
    setReps('');
    setSuggestion(null);
    setLastPerformance(null);
    setLastSessionExpanded(false);
    
    // Puis charger les nouvelles données
    loadLastPerformance();
  }, [exercise.id, isSuperset ? supersetExerciseIndex : null, isDropset ? dropIndex : null]);

  const toggleLastSession = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLastSessionExpanded(!lastSessionExpanded);
    
    Animated.timing(rotateAnim, {
      toValue: lastSessionExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const loadLastPerformance = async () => {
    try {
      // ✅ D'abord trouver le workout_id de la DERNIÈRE séance (avant celle en cours)
      const lastWorkoutQuery = routineId
        ? `SELECT id, date FROM workouts WHERE routine_id = ? AND id != (SELECT MAX(id) FROM workouts WHERE routine_id = ?) ORDER BY date DESC LIMIT 1`
        : `SELECT id, date FROM workouts WHERE id != (SELECT MAX(id) FROM workouts) ORDER BY date DESC LIMIT 1`;
      
      const lastWorkout = await db.getFirstAsync(
        lastWorkoutQuery,
        routineId ? [routineId, routineId] : []
      );
      
      if (!lastWorkout) {
        setLastPerformance(null);
        return;
      }
      
      const lastWorkoutId = lastWorkout.id;
      const lastDate = lastWorkout.date;

      // SI DROP SET - Charger les performances par drop
      if (isDropset) {
        const lastDropSets = await db.getAllAsync(`
          SELECT s.weight, s.reps, s.set_number, s.dropset_id
          FROM sets s
          WHERE s.workout_id = ?
          AND s.exercise_id = ?
          AND s.dropset_id IS NOT NULL
          ORDER BY s.id ASC
        `, [lastWorkoutId, exercise.id]);

        if (lastDropSets.length === 0) {
          setLastPerformance(null);
          return;
        }

        // Grouper par dropset_id
        const dropsetGroups = {};
        lastDropSets.forEach(set => {
          if (!dropsetGroups[set.dropset_id]) {
            dropsetGroups[set.dropset_id] = [];
          }
          dropsetGroups[set.dropset_id].push(set);
        });

        // Prendre le premier (et normalement seul) drop set de cette séance
        const lastDropsetId = Object.keys(dropsetGroups)[0];
        const lastDropsetSets = lastDropsetId ? dropsetGroups[lastDropsetId] : [];

        // Calculer les records pour chaque drop (FILTRÉ PAR ROUTINE)
        const dropRecords = {};
        for (let i = 0; i < (dropTotalDrops || 2); i++) {
          const maxWeightQuery = routineId 
            ? `SELECT MAX(s.weight) as max_weight FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE s.exercise_id = ? AND s.dropset_id IS NOT NULL AND s.set_number = ? AND w.routine_id = ?`
            : `SELECT MAX(weight) as max_weight FROM sets WHERE exercise_id = ? AND dropset_id IS NOT NULL AND set_number = ?`;
          
          const maxWeight = await db.getFirstAsync(
            maxWeightQuery, 
            routineId ? [exercise.id, i + 1, routineId] : [exercise.id, i + 1]
          );

          const maxRepsQuery = routineId
            ? `SELECT MAX(s.reps) as max_reps, s.weight FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE s.exercise_id = ? AND s.dropset_id IS NOT NULL AND s.set_number = ? AND w.routine_id = ? GROUP BY s.weight ORDER BY max_reps DESC LIMIT 1`
            : `SELECT MAX(reps) as max_reps, weight FROM sets WHERE exercise_id = ? AND dropset_id IS NOT NULL AND set_number = ? GROUP BY weight ORDER BY max_reps DESC LIMIT 1`;

          const maxReps = await db.getFirstAsync(
            maxRepsQuery,
            routineId ? [exercise.id, i + 1, routineId] : [exercise.id, i + 1]
          );

          dropRecords[i] = {
            maxWeight: maxWeight?.max_weight || 0,
            maxReps: maxReps?.max_reps || 0,
            maxRepsWeight: maxReps?.weight || 0
          };
        }

        // Suggestion basée sur la dernière perf pour ce drop
        const lastSetForThisDrop = lastDropsetSets.find(s => s.set_number === (dropIndex + 1));
        if (lastSetForThisDrop) {
          // Pour les dropsets, on suggère de reproduire le même drop
          // mais on peut proposer une légère progression sur le premier drop
          let dropSuggestion = {
            weight: lastSetForThisDrop.weight,
            reps: lastSetForThisDrop.reps,
            type: 'repeat',
            message: `Drop ${dropIndex + 1} - Reproduis ta dernière perf`,
            emoji: '🔻'
          };

          // Si c'est le premier drop et qu'on a de l'historique, analyser
          if (dropIndex === 0) {
            const performanceHistory = await loadPerformanceHistory(db, exercise.id, routineId, 5);
            if (performanceHistory.length >= 2) {
              // Analyser la tendance du premier drop
              const smartSuggestion = analyzeAndSuggest(performanceHistory, 1, exercise.name);
              if (smartSuggestion && smartSuggestion.type !== 'repeat') {
                dropSuggestion = {
                  ...smartSuggestion,
                  message: `Drop 1 - ${smartSuggestion.message}`,
                  emoji: smartSuggestion.emoji
                };
              }
            }
          }

          setWeight(dropSuggestion.weight.toString());
          setReps(dropSuggestion.reps.toString());
          setSuggestion(dropSuggestion);
        }

        setLastPerformance({
          isDropset: true,
          lastDropSets: lastDropsetSets,
          dropRecords: dropRecords,
          lastDate: lastDate,
          exerciseName: exercise.name
        });

        return;
      }

      // ✅ SI SUPERSET - Charger les performances de TOUS les exercices du superset
      if (isSuperset && supersetExercises) {
        // Charger les données de tous les exercices du superset pour CE workout uniquement
        const allExercisesData = {};
        let hasAnyData = false;
        
        for (const ex of supersetExercises) {
          const lastSets = await db.getAllAsync(`
            SELECT s.weight, s.reps, s.set_number, s.superset_id
            FROM sets s
            WHERE s.workout_id = ?
            AND s.exercise_id = ?
            AND s.superset_id IS NOT NULL
            ORDER BY s.set_number ASC
          `, [lastWorkoutId, ex.id]);
          
          if (lastSets.length > 0) {
            hasAnyData = true;
            allExercisesData[ex.id] = {
              name: ex.name,
              sets: lastSets
            };
          }
        }
        
        if (!hasAnyData) {
          setLastPerformance(null);
          return;
        }
        
        // Records pour l'exercice actuel uniquement
        const maxWeightQuery = routineId
          ? `SELECT MAX(s.weight) as max_weight FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE s.exercise_id = ? AND w.routine_id = ?`
          : `SELECT MAX(weight) as max_weight FROM sets WHERE exercise_id = ?`;
        
        const maxWeight = await db.getFirstAsync(
          maxWeightQuery,
          routineId ? [exercise.id, routineId] : [exercise.id]
        );

        const maxRepsQuery = routineId
          ? `SELECT MAX(s.reps) as max_reps, s.weight FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE s.exercise_id = ? AND w.routine_id = ? GROUP BY s.weight ORDER BY max_reps DESC LIMIT 1`
          : `SELECT MAX(reps) as max_reps, weight FROM sets WHERE exercise_id = ? GROUP BY weight ORDER BY max_reps DESC LIMIT 1`;

        const maxReps = await db.getFirstAsync(
          maxRepsQuery,
          routineId ? [exercise.id, routineId] : [exercise.id]
        );

        // 🧠 Suggestion intelligente pour l'exercice actuel du superset
        const currentExerciseData = allExercisesData[exercise.id];
        if (currentExerciseData && currentExerciseData.sets.length > 0) {
          // Charger l'historique complet pour cet exercice
          const performanceHistory = await loadPerformanceHistory(db, exercise.id, routineId, 5);
          
          if (performanceHistory.length > 0) {
            const smartSuggestion = analyzeAndSuggest(performanceHistory, supersetRound || 1, exercise.name);
            
            if (smartSuggestion) {
              setSuggestion(smartSuggestion);
              setWeight(smartSuggestion.weight.toString());
              setReps(smartSuggestion.reps.toString());
              console.log(`🧠 Suggestion superset: ${smartSuggestion.emoji} ${smartSuggestion.weight}kg × ${smartSuggestion.reps} - ${smartSuggestion.message}`);
            } else {
              const lastSetForThisNumber = currentExerciseData.sets.find(s => s.set_number === supersetRound) || currentExerciseData.sets[0];
              setSuggestion({
                weight: lastSetForThisNumber.weight,
                reps: lastSetForThisNumber.reps,
                type: 'repeat',
                message: 'Reproduis ta dernière perf',
                emoji: '🔁'
              });
              setWeight(lastSetForThisNumber.weight.toString());
              setReps(lastSetForThisNumber.reps.toString());
            }
          } else {
            const lastSetForThisNumber = currentExerciseData.sets.find(s => s.set_number === supersetRound) || currentExerciseData.sets[0];
            setSuggestion({
              weight: lastSetForThisNumber.weight,
              reps: lastSetForThisNumber.reps,
              type: 'maintain',
              message: 'Maintiens cette charge',
              emoji: '🎯'
            });
            setWeight(lastSetForThisNumber.weight.toString());
            setReps(lastSetForThisNumber.reps.toString());
          }
        }

        setLastPerformance({
          isSuperset: true,
          allExercisesData: allExercisesData,
          supersetExercises: supersetExercises,
          maxWeight: maxWeight?.max_weight || 0,
          maxReps: maxReps?.max_reps || 0,
          maxRepsWeight: maxReps?.weight || 0,
          lastDate: lastDate,
          exerciseName: exercise.name
        });

        return;
      }

      // ✅ EXERCICE NORMAL - Charger uniquement depuis la dernière séance
      const lastSets = await db.getAllAsync(`
        SELECT s.weight, s.reps, s.set_number
        FROM sets s
        WHERE s.workout_id = ?
        AND s.exercise_id = ?
        ORDER BY s.set_number ASC
      `, [lastWorkoutId, exercise.id]);

      if (lastSets.length === 0) {
        setLastPerformance(null);
        return;
      }

      // Records (FILTRÉ PAR ROUTINE)
      const maxWeightQuery = routineId
        ? `SELECT MAX(s.weight) as max_weight FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE s.exercise_id = ? AND w.routine_id = ?`
        : `SELECT MAX(weight) as max_weight FROM sets WHERE exercise_id = ?`;
      
      const maxWeight = await db.getFirstAsync(
        maxWeightQuery,
        routineId ? [exercise.id, routineId] : [exercise.id]
      );

      const maxRepsQuery = routineId
        ? `SELECT MAX(s.reps) as max_reps, s.weight FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE s.exercise_id = ? AND w.routine_id = ? GROUP BY s.weight ORDER BY max_reps DESC LIMIT 1`
        : `SELECT MAX(reps) as max_reps, weight FROM sets WHERE exercise_id = ? GROUP BY weight ORDER BY max_reps DESC LIMIT 1`;

      const maxReps = await db.getFirstAsync(
        maxRepsQuery,
        routineId ? [exercise.id, routineId] : [exercise.id]
      );

      setLastPerformance({
        lastSets: lastSets,
        maxWeight: maxWeight?.max_weight || 0,
        maxReps: maxReps?.max_reps || 0,
        maxRepsWeight: maxReps?.weight || 0,
        lastDate: lastDate,
        exerciseName: exercise.name
      });

      // 🧠 NOUVEAU SYSTÈME DE SUGGESTION INTELLIGENT
      // Charger l'historique des 5 dernières séances
      const performanceHistory = await loadPerformanceHistory(db, exercise.id, routineId, 5);
      
      if (performanceHistory.length > 0) {
        // Analyser et générer la suggestion
        const smartSuggestion = analyzeAndSuggest(performanceHistory, setNumber, exercise.name);
        
        if (smartSuggestion) {
          setSuggestion(smartSuggestion);
          setWeight(smartSuggestion.weight.toString());
          setReps(smartSuggestion.reps.toString());
          
          console.log(`🧠 Suggestion intelligente: ${smartSuggestion.emoji} ${smartSuggestion.weight}kg × ${smartSuggestion.reps} (${smartSuggestion.type}) - ${smartSuggestion.message}`);
        } else {
          // Fallback sur la dernière perf
          const lastSetForThisNumber = lastSets.find(s => s.set_number === setNumber) || lastSets[0];
          setSuggestion({
            weight: lastSetForThisNumber.weight,
            reps: lastSetForThisNumber.reps,
            type: 'repeat',
            message: 'Reproduis ta dernière perf',
            emoji: '🔁'
          });
          setWeight(lastSetForThisNumber.weight.toString());
          setReps(lastSetForThisNumber.reps.toString());
        }
      } else {
        // Aucun historique - utiliser la dernière séance
        const lastSetForThisNumber = lastSets.find(s => s.set_number === setNumber) || lastSets[0];
        setSuggestion({
          weight: lastSetForThisNumber.weight,
          reps: lastSetForThisNumber.reps,
          type: 'repeat',
          message: 'Reproduis ta dernière perf',
          emoji: '🔁'
        });
        setWeight(lastSetForThisNumber.weight.toString());
        setReps(lastSetForThisNumber.reps.toString());
      }
    } catch (error) {
      console.error('Erreur chargement dernière perf:', error);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setWeight(suggestion.weight.toString());
    setReps(suggestion.reps.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const adjustValue = (field, delta) => {
    if (field === 'weight') {
      const current = parseFloat(weight) || 0;
      setWeight(Math.max(0, current + delta).toString());
    } else {
      const current = parseInt(reps) || 0;
      setReps(Math.max(0, current + delta).toString());
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleValidate = () => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;

    const isBodyweight = exercise.equipment === 'Poids du corps';
    const isValidWeight = isBodyweight ? (w >= 0) : (w > 0);

    if (isValidWeight && r > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSetComplete(w, r);
      setWeight('');
      setReps('');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
    return `${day} ${months[date.getMonth()]}`;
  };

  // Grouper les dropsets par série (pour l'affichage "dernière fois")
  const groupDropsetsBySeries = (sets) => {
    const seriesMap = {};
    let currentSeries = 1;
    let lastSetNumber = 0;
    
    sets.forEach((set) => {
      if (set.set_number <= lastSetNumber && lastSetNumber > 0) {
        currentSeries++;
      }
      lastSetNumber = set.set_number;
      
      if (!seriesMap[currentSeries]) {
        seriesMap[currentSeries] = [];
      }
      seriesMap[currentSeries].push({ ...set, dropNum: set.set_number });
    });
    
    return seriesMap;
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <TouchableOpacity
          className="absolute top-4 right-4 z-50 bg-danger/20 rounded-full p-2"
          onPress={onQuitSession}
        >
          <Ionicons name="close" size={20} color="#ff4444" />
        </TouchableOpacity>

        {/* 1. BADGE SUPERSET */}
        {isSuperset && supersetInfo && (
          <View className={`rounded-2xl p-4 mb-4 mt-12 border-2 ${supersetInfo.bgColor}/20 ${supersetInfo.borderColor}`}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className={`${supersetInfo.bgColor} rounded-full p-2 mr-3`}>
                  <Ionicons name={supersetInfo.icon} size={20} color="#0a0e27" />
                </View>
                <View>
                  <Text className={`${supersetInfo.textColor} text-lg font-bold`}>
                    {supersetInfo.emoji} {supersetInfo.name}
                  </Text>
                </View>
              </View>
            </View>
            <Text className="text-white font-bold text-lg ml-14">
              {exercise.name}
            </Text>
          </View>
        )}

        {/* 1. BADGE DROP SET */}
        {isDropset && (
          <View className="rounded-2xl p-4 mb-4 mt-12 border-2 bg-amber-500/20 border-amber-500">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="bg-amber-500 rounded-full p-2 mr-3">
                  <Ionicons name="trending-down" size={20} color="#0a0e27" />
                </View>
                <View>
                  <Text className="text-amber-500 text-lg font-bold">
                    🔻 DROP SET
                  </Text>
                </View>
              </View>
            </View>
            <Text className="text-white font-bold text-lg ml-14">
              {exercise.name}
            </Text>
          </View>
        )}

        {/* 2. En-tête - Série/Exercice */}
        <View className="mb-4">
          {/* Afficher le nom uniquement pour les exercices normaux */}
          {!isSuperset && !isDropset && (
            <Text className="text-white text-3xl font-bold mb-2">
              {exercise.name}
            </Text>
          )}

          <View className="flex-row items-center justify-between">
            <View>
              <Text className={`text-xl font-bold ${isSuperset ? 'text-accent-cyan' : isDropset ? 'text-amber-500' : 'text-accent-cyan'}`}>
                {isSuperset
                  ? `Série ${supersetRound || 0}/${supersetTotalRounds || 0}`
                  : isDropset
                    ? `Série ${dropRound || 0}/${dropTotalRounds || 0}`
                    : `Série ${setNumber || 0}/${totalSets || 0}`
                }
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                {isSuperset
                  ? `Exercice ${supersetExerciseIndex + 1}/${supersetTotalExercises} du superset`
                  : isDropset
                    ? `Drop ${dropIndex + 1}/${dropTotalDrops}`
                    : `Exercice ${exerciseNumber}/${totalExercises}`
                }
              </Text>
            </View>

            <TouchableOpacity
              className="bg-primary-navy rounded-full p-2"
              onPress={onManageExercises}
            >
              <Ionicons name="settings" size={24} color="#00f5ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. INFO ENCHAÎNEMENT / REPOS - COMPACT */}
        {isSuperset && !isLastExerciseInSuperset && (
          <View className="bg-accent-cyan/10 rounded-xl px-3 py-2 mb-3 border border-accent-cyan/20">
            <View className="flex-row items-center">
              <Ionicons name="flash" size={14} color="#00f5ff" />
              <Text className="text-accent-cyan text-xs ml-2">
                ⚡ Enchaîne directement sans repos
              </Text>
            </View>
          </View>
        )}

        {isSuperset && isLastExerciseInSuperset && supersetRound < supersetTotalRounds && (
          <View className="bg-accent-cyan/10 rounded-xl px-3 py-2 mb-3 border border-accent-cyan/20">
            <View className="flex-row items-center">
              <Ionicons name="time" size={14} color="#00f5ff" />
              <Text className="text-accent-cyan text-xs ml-2">
                💤 Repos après cette série
              </Text>
            </View>
          </View>
        )}

        {isDropset && !isLastDrop && (
          <View className="bg-amber-500/10 rounded-xl px-3 py-2 mb-3 border border-amber-500/20">
            <View className="flex-row items-center">
              <Ionicons name="trending-down" size={14} color="#f59e0b" />
              <Text className="text-amber-500 text-xs ml-2">
                🔻 Baisse le poids (-20%) et enchaîne
              </Text>
            </View>
          </View>
        )}

        {isDropset && isLastDrop && dropRound < dropTotalRounds && (
          <View className="bg-amber-500/10 rounded-xl px-3 py-2 mb-3 border border-amber-500/20">
            <View className="flex-row items-center">
              <Ionicons name="time" size={14} color="#f59e0b" />
              <Text className="text-amber-500 text-xs ml-2">
                💤 Repos avant série {dropRound + 1}
              </Text>
            </View>
          </View>
        )}

        {/* 4. SAISIE POIDS + REPS CÔTE À CÔTE */}
        <View className="flex-row mb-4">
          {/* Poids */}
          <View className={`flex-1 mr-2 rounded-2xl p-3 ${isSuperset ? 'bg-accent-cyan/10 border border-accent-cyan/30' : isDropset ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-primary-navy'}`}>
            <Text className="text-gray-400 text-xs mb-2 text-center">POIDS (kg)</Text>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="bg-primary-dark rounded-lg p-2"
                onPress={() => adjustValue('weight', -2.5)}
              >
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>

              <TextInput
                className="text-white text-2xl font-bold text-center flex-1 mx-2"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6b7280"
              />

              <TouchableOpacity
                className="bg-primary-dark rounded-lg p-2"
                onPress={() => adjustValue('weight', 2.5)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Reps */}
          <View className={`flex-1 ml-2 rounded-2xl p-3 ${isSuperset ? 'bg-accent-cyan/10 border border-accent-cyan/30' : isDropset ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-primary-navy'}`}>
            <Text className="text-gray-400 text-xs mb-2 text-center">REPS</Text>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="bg-primary-dark rounded-lg p-2"
                onPress={() => adjustValue('reps', -1)}
              >
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>

              <TextInput
                className="text-white text-2xl font-bold text-center flex-1 mx-2"
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#6b7280"
              />

              <TouchableOpacity
                className="bg-primary-dark rounded-lg p-2"
                onPress={() => adjustValue('reps', 1)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 5. BOUTON VALIDER / ENCHAÎNER */}
        <TouchableOpacity
          className={`rounded-2xl p-5 mb-4 ${isSuperset && !isLastExerciseInSuperset
            ? 'bg-accent-cyan'
            : isDropset && !isLastDrop
              ? 'bg-amber-500'
              : 'bg-success'
            }`}
          onPress={handleValidate}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons
              name={
                (isSuperset && !isLastExerciseInSuperset) || (isDropset && !isLastDrop)
                  ? "arrow-forward-circle"
                  : "checkmark-circle"
              }
              size={28}
              color="#0a0e27"
            />
            <Text className="text-primary-dark text-xl font-bold ml-2">
              {isSuperset && !isLastExerciseInSuperset
                ? '➡️ ENCHAÎNER'
                : isDropset && !isLastDrop
                  ? '🔻 DROP SUIVANT'
                  : '✓ VALIDER SÉRIE'
              }
            </Text>
          </View>
        </TouchableOpacity>

        {/* 6. SUGGESTION INTELLIGENTE */}
        {suggestion && (
          <TouchableOpacity
            className={`rounded-xl px-4 py-3 mb-4 ${isSuperset ? 'bg-accent-cyan/10 border border-accent-cyan/20' : isDropset ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-primary-navy'}`}
            onPress={applySuggestion}
          >
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center">
                <Text className="text-lg mr-2">{suggestion.emoji || '💡'}</Text>
                <Text className={`text-sm font-bold ${isSuperset ? 'text-accent-cyan' : isDropset ? 'text-amber-500' : 'text-accent-cyan'}`}>
                  Suggestion:
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-lg">
                  {suggestion.weight}kg × {suggestion.reps}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#6b7280" style={{ marginLeft: 8 }} />
              </View>
            </View>
            {suggestion.message && (
              <Text className="text-gray-400 text-xs mt-1">
                {suggestion.message}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* 7. RECORDS */}
        {lastPerformance && (
          <View className="bg-primary-navy rounded-2xl p-4 mb-4">
            <Text className="text-gray-400 text-xs font-bold mb-3">
              🏆 RECORDS {isDropset ? `- DROP ${dropIndex + 1}` : ''}
            </Text>

            <View className="flex-row gap-2">
              <View className="flex-1 bg-accent-cyan/10 border border-accent-cyan/30 rounded-xl p-3">
                <Text className="text-accent-cyan text-xs font-bold mb-1">
                  💪 POIDS
                </Text>
                <Text className="text-white font-bold text-xl">
                  {isDropset
                    ? `${lastPerformance.dropRecords?.[dropIndex]?.maxWeight || 0}kg`
                    : `${lastPerformance.maxWeight}kg`
                  }
                </Text>
              </View>

              <View className="flex-1 bg-success/10 border border-success/30 rounded-xl p-3">
                <Text className="text-success text-xs font-bold mb-1">
                  🔄 REPS
                </Text>
                <Text className="text-white font-bold text-xl">
                  {isDropset
                    ? `${lastPerformance.dropRecords?.[dropIndex]?.maxReps || 0}`
                    : `${lastPerformance.maxReps}`
                  }
                </Text>
                <Text className="text-gray-400 text-xs">
                  à {isDropset
                    ? `${lastPerformance.dropRecords?.[dropIndex]?.maxRepsWeight || 0}kg`
                    : `${lastPerformance.maxRepsWeight}kg`
                  }
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 8. SÉANCE EN COURS */}
        {(isSuperset ? (allSupersetSets && Object.keys(allSupersetSets).length > 0) : 
          isDropset ? (allDropsetSets && allDropsetSets.length > 0) : 
          previousSets.length > 0) && (
          <View className="bg-primary-navy rounded-2xl p-4 mb-4">
            <Text className="text-gray-400 text-xs font-bold mb-2">
              📈 SÉANCE EN COURS
            </Text>
            
            {isSuperset && allSupersetSets && supersetExercises ? (
              // ✅ AFFICHAGE SUPERSET - Groupé par série avec tous les exercices
              (() => {
                // Construire les séries complètes
                const seriesData = [];
                
                // Calculer combien de séries sont complètes
                for (let round = 1; round <= supersetTotalRounds; round++) {
                  const serieExercises = [];
                  let isSerieComplete = true;
                  let isSerieStarted = false;
                  
                  supersetExercises.forEach((ex, exIdx) => {
                    const exSets = allSupersetSets[ex.id] || [];
                    const setForThisRound = exSets[round - 1]; // round 1 = index 0
                    
                    if (setForThisRound) {
                      isSerieStarted = true;
                      serieExercises.push({
                        name: ex.name,
                        weight: setForThisRound.weight,
                        reps: setForThisRound.reps,
                        done: true
                      });
                    } else {
                      isSerieComplete = false;
                      // Ajouter comme "à faire" seulement si la série est en cours
                      if (round === supersetRound && exIdx >= supersetExerciseIndex) {
                        serieExercises.push({
                          name: ex.name,
                          done: false,
                          isCurrent: round === supersetRound && exIdx === supersetExerciseIndex
                        });
                      }
                    }
                  });
                  
                  if (isSerieStarted) {
                    seriesData.push({
                      round,
                      exercises: serieExercises,
                      isComplete: isSerieComplete,
                      isCurrent: round === supersetRound
                    });
                  }
                }
                
                return seriesData.map((serie) => (
                  <View key={serie.round} className="bg-primary-dark rounded-lg p-3 mb-2">
                    <Text className={`text-xs font-bold mb-2 ${serie.isComplete ? 'text-success' : 'text-accent-cyan'}`}>
                      {serie.isComplete ? '✓' : '→'} Série {serie.round}
                    </Text>
                    {serie.exercises.map((ex, idx) => (
                      <View key={idx} className="flex-row justify-between items-center py-1 ml-2">
                        <Text className={`text-sm ${ex.done ? 'text-white' : 'text-gray-500'}`}>
                          • {ex.name}
                        </Text>
                        <Text className={`font-semibold ${ex.done ? 'text-white' : ex.isCurrent ? 'text-accent-cyan' : 'text-gray-500'}`}>
                          {ex.done ? `${ex.weight}kg × ${ex.reps}` : ex.isCurrent ? '(en cours)' : '(à faire)'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ));
              })()
            ) : isDropset && allDropsetSets ? (
              // ✅ AFFICHAGE DROPSET - Groupé par série avec tous les drops
              (() => {
                const serieGroups = {};
                allDropsetSets.forEach(set => {
                  const serieNum = set.round || 1;
                  if (!serieGroups[serieNum]) {
                    serieGroups[serieNum] = [];
                  }
                  serieGroups[serieNum].push(set);
                });

                return Object.keys(serieGroups)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map(serieNum => {
                    const isCurrentSerie = parseInt(serieNum) === dropRound;
                    const isComplete = serieGroups[serieNum].length === dropTotalDrops;
                    
                    return (
                      <View key={serieNum} className="bg-primary-dark rounded-lg p-3 mb-2">
                        <Text className={`text-xs font-bold mb-2 ${isComplete ? 'text-success' : 'text-amber-500'}`}>
                          {isComplete ? '✓' : '→'} Série {serieNum} - {dropsetExerciseName}
                        </Text>
                        {serieGroups[serieNum]
                          .sort((a, b) => a.dropIndex - b.dropIndex)
                          .map((set, idx) => (
                            <Text key={idx} className="text-white text-sm ml-2 py-1">
                              • Drop {set.dropIndex + 1}: {set.weight}kg × {set.reps}
                            </Text>
                          ))}
                        {/* Afficher les drops restants si série en cours */}
                        {isCurrentSerie && !isComplete && (
                          Array.from({ length: dropTotalDrops - serieGroups[serieNum].length }, (_, i) => (
                            <Text key={`pending-${i}`} className="text-gray-500 text-sm ml-2 py-1">
                              • Drop {serieGroups[serieNum].length + i + 1}: {i === 0 ? '(en cours)' : '(à faire)'}
                            </Text>
                          ))
                        )}
                      </View>
                    );
                  });
              })()
            ) : (
              // ✅ AFFICHAGE NORMAL
              previousSets.map((set, idx) => (
                <View key={idx} className="flex-row justify-between items-center py-1">
                  <Text className="text-gray-400 text-sm">Série {idx + 1}</Text>
                  <Text className="text-white font-semibold">{set.weight}kg × {set.reps}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* 9. DERNIÈRE SÉANCE - DÉPLIABLE */}
        {lastPerformance && (lastPerformance.lastSets?.length > 0 || lastPerformance.lastDropSets?.length > 0 || lastPerformance.isSuperset) && (
          <View className="bg-primary-navy rounded-2xl overflow-hidden mb-4">
            {/* Bandeau cliquable */}
            <TouchableOpacity
              className="flex-row items-center justify-between p-4"
              onPress={toggleLastSession}
            >
              <View className="flex-row items-center">
                <Ionicons name="calendar" size={16} color="#6b7280" />
                <Text className="text-gray-400 text-sm ml-2">
                  📊 Dernière séance {lastPerformance.lastDate ? `(${formatDate(lastPerformance.lastDate)})` : ''}
                </Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </Animated.View>
            </TouchableOpacity>

            {/* Contenu dépliable */}
            {lastSessionExpanded && (
              <View className="px-4 pb-4 border-t border-primary-dark">
                
                {/* ✅ AFFICHAGE SUPERSET - Tous les exercices groupés par série */}
                {lastPerformance.isSuperset && lastPerformance.allExercisesData ? (
                  <View className="mt-2">
                    {/* Badge Superset */}
                    <View className="bg-accent-cyan/10 rounded-lg p-2 mb-3">
                      <Text className="text-accent-cyan text-xs font-bold text-center">
                        ⚡ SUPERSET
                      </Text>
                    </View>
                    
                    {/* Grouper par série */}
                    {Array.from({ length: supersetTotalRounds }, (_, roundIndex) => {
                      const round = roundIndex + 1;
                      const hasDataForRound = supersetExercises?.some(ex => {
                        const exData = lastPerformance.allExercisesData[ex.id];
                        return exData?.sets?.some(s => s.set_number === round);
                      });
                      
                      if (!hasDataForRound) return null;
                      
                      return (
                        <View key={round} className="bg-primary-dark rounded-lg p-3 mb-2">
                          <Text className="text-accent-cyan text-xs font-bold mb-2">
                            Série {round}
                          </Text>
                          {supersetExercises?.map((ex) => {
                            const exData = lastPerformance.allExercisesData[ex.id];
                            const setForRound = exData?.sets?.find(s => s.set_number === round);
                            
                            return (
                              <View key={ex.id} className="flex-row justify-between items-center py-1 ml-2">
                                <Text className="text-gray-400 text-sm" numberOfLines={1} style={{ flex: 1 }}>
                                  • {ex.name}
                                </Text>
                                <Text className="text-white font-semibold ml-2">
                                  {setForRound ? `${setForRound.weight}kg × ${setForRound.reps}` : '-'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                ) : isDropset && lastPerformance.lastDropSets ? (
                  // Affichage dropset détaillé
                  <>
                    <View className="bg-amber-500/10 rounded-lg p-2 mt-2 mb-2">
                      <Text className="text-amber-500 text-xs font-bold text-center">
                        🔻 DROP SET - {exercise.name}
                      </Text>
                    </View>
                    {(() => {
                      const seriesMap = groupDropsetsBySeries(lastPerformance.lastDropSets);
                      return Object.keys(seriesMap)
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map(serieNum => (
                          <View key={serieNum} className="bg-primary-dark rounded-lg p-3 mb-2">
                            <Text className="text-amber-400 text-xs font-bold mb-1">
                              Série {serieNum}
                            </Text>
                            {seriesMap[serieNum].map((set, idx) => (
                              <Text key={idx} className="text-white text-sm ml-2 py-1">
                                • Drop {set.dropNum}: {set.weight}kg × {set.reps}
                              </Text>
                            ))}
                          </View>
                        ));
                    })()}
                  </>
                ) : (
                  // Affichage normal
                  <>
                    <View className="bg-success/10 rounded-lg p-2 mt-2 mb-2">
                      <Text className="text-success text-xs font-bold">
                        💪 {exercise.name}
                      </Text>
                    </View>
                    {lastPerformance.lastSets?.map((set, idx) => (
                      <View key={idx} className="flex-row justify-between items-center py-1 mt-1">
                        <Text className="text-gray-400 text-sm">Série {set.set_number}</Text>
                        <Text className="text-white font-semibold">{set.weight}kg × {set.reps}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        )}

      </View>
    </ScrollView>
  );
}
