import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getSupersetInfo } from '../utils/supersetHelpers';

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
  // PROPS POUR LES SUPERSETS
  isSuperset = false,
  supersetRound = null,
  supersetTotalRounds = null,
  supersetExerciseIndex = null,
  supersetTotalExercises = null,
  supersetName = null,
  // 🆕 PROPS POUR LES DROP SETS
  isDropset = false,
  dropRound = null,
  dropTotalRounds = null,
  dropIndex = null,
  dropTotalDrops = null
}) {



  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [lastPerformance, setLastPerformance] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  // OBTENIR LES INFOS DU SUPERSET
  const supersetInfo = isSuperset && supersetTotalExercises
    ? getSupersetInfo(supersetTotalExercises)
    : null;

  // VÉRIFIER SI C'EST LE DERNIER EXERCICE DU SUPERSET
  const isLastExerciseInSuperset = isSuperset && (supersetExerciseIndex === supersetTotalExercises - 1);

  // 🆕 VÉRIFIER SI C'EST LE DERNIER DROP
  const isLastDrop = isDropset && (dropIndex === dropTotalDrops - 1);

  useEffect(() => {
    loadLastPerformance();
  }, [exercise.id]);

  const loadLastPerformance = async () => {
    try {
      // 🆕 SI DROP SET - Charger les performances par drop
      if (isDropset) {
        const lastDropSets = await db.getAllAsync(`
        SELECT s.weight, s.reps, s.set_number, w.date, s.dropset_id
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
        AND s.dropset_id IS NOT NULL
        AND w.id != (SELECT MAX(id) FROM workouts WHERE id IN (SELECT DISTINCT workout_id FROM sets WHERE dropset_id IS NOT NULL))
        ORDER BY w.date DESC, s.set_number ASC
        LIMIT 20
      `, [exercise.id]);

        // Grouper par dropset_id et calculer les records par drop
        const dropsetGroups = {};
        lastDropSets.forEach(set => {
          if (!dropsetGroups[set.dropset_id]) {
            dropsetGroups[set.dropset_id] = [];
          }
          dropsetGroups[set.dropset_id].push(set);
        });

        // Prendre le dernier drop set
        const lastDropsetId = Object.keys(dropsetGroups)[0];
        const lastDropsetSets = lastDropsetId ? dropsetGroups[lastDropsetId] : [];

        // Calculer les records pour chaque drop
        const dropRecords = {};
        for (let i = 0; i < (dropTotalDrops || 2); i++) {
          const maxWeight = await db.getFirstAsync(`
          SELECT MAX(weight) as max_weight
          FROM sets
          WHERE exercise_id = ?
          AND dropset_id IS NOT NULL
          AND set_number = ?
        `, [exercise.id, i + 1]);

          const maxReps = await db.getFirstAsync(`
          SELECT MAX(reps) as max_reps, weight
          FROM sets
          WHERE exercise_id = ?
          AND dropset_id IS NOT NULL
          AND set_number = ?
          GROUP BY weight
          ORDER BY max_reps DESC
          LIMIT 1
        `, [exercise.id, i + 1]);

          dropRecords[i] = {
            maxWeight: maxWeight?.max_weight || 0,
            maxReps: maxReps?.max_reps || 0,
            maxRepsWeight: maxReps?.weight || 0
          };
        }

        setLastPerformance({
          isDropset: true,
          lastDropSets: lastDropsetSets,
          dropRecords: dropRecords
        });

        return; // Sortir de la fonction pour les drop sets
      }

      // ✅ EXERCICE NORMAL OU SUPERSET
      const lastSets = await db.getAllAsync(`
      SELECT s.weight, s.reps, s.set_number, w.date
      FROM sets s
      JOIN workouts w ON s.workout_id = w.id
      WHERE s.exercise_id = ?
      AND w.id != (SELECT MAX(id) FROM workouts)
      ORDER BY w.date DESC, s.set_number ASC
      LIMIT 10
    `, [exercise.id]);

      const maxWeight = await db.getFirstAsync(`
      SELECT MAX(weight) as max_weight
      FROM sets
      WHERE exercise_id = ?
    `, [exercise.id]);

      const maxReps = await db.getFirstAsync(`
      SELECT MAX(reps) as max_reps, weight
      FROM sets
      WHERE exercise_id = ?
      GROUP BY weight
      ORDER BY max_reps DESC
      LIMIT 1
    `, [exercise.id]);

      if (lastSets.length > 0) {
        setLastPerformance({
          lastSets: lastSets,
          maxWeight: maxWeight?.max_weight || 0,
          maxReps: maxReps?.max_reps || 0,
          maxRepsWeight: maxReps?.weight || 0
        });

        const lastSetForThisNumber = lastSets.find(s => s.set_number === setNumber) || lastSets[0];
        const allSetsSuccessful = lastSets.every(s => s.reps >= 8);

        if (allSetsSuccessful && lastSetForThisNumber.reps >= 10) {
          setSuggestion({
            weight: lastSetForThisNumber.weight,
            reps: lastSetForThisNumber.reps + 1,
            type: 'reps'
          });
        } else if (allSetsSuccessful && lastSetForThisNumber.reps >= 12) {
          setSuggestion({
            weight: lastSetForThisNumber.weight + 5,
            reps: 8,
            type: 'weight'
          });
        } else {
          setSuggestion({
            weight: lastSetForThisNumber.weight,
            reps: lastSetForThisNumber.reps,
            type: 'maintain'
          });
        }

        setWeight(lastSetForThisNumber.weight.toString());
        setReps(lastSetForThisNumber.reps.toString());
      }
    } catch (error) {
      console.error('Erreur chargement dernière perf:', error);
    }
  };

  const applySuggestion = (suggestionType) => {
    if (!suggestion) return;

    if (suggestionType === 'suggested' || suggestionType === 'repeat') {
      setWeight(suggestion.weight.toString());
      setReps(suggestion.reps.toString());
    }

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

    // 🆕 Accepter poids = 0 si équipement = "Poids du corps"
    const isBodyweight = exercise.equipment === 'Poids du corps';
    const isValidWeight = isBodyweight ? (w >= 0) : (w > 0);

    if (isValidWeight && r > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSetComplete(w, r);
      setWeight('');
      setReps('');
    }
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
        {/* 🔥 BADGE SUPERSET */}
        {isSuperset && supersetInfo && (
          <View className={`rounded-2xl p-4 mb-4 mt-12 border-2 ${supersetInfo.bgColor}/20 ${supersetInfo.borderColor}`}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className={`${supersetInfo.bgColor} rounded-full p-2 mr-3`}>
                  <Ionicons name={supersetInfo.icon} size={20} color="#0a0e27" />
                </View>
                <View>
                  <Text className={`${supersetInfo.textColor} text-lg font-bold`}>
                    {supersetInfo.emoji} {supersetInfo.name}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    Tour {supersetRound || 0}/{supersetTotalRounds || 0}
                  </Text>
                </View>
              </View>
              <View className={`${supersetInfo.bgColor} rounded-full px-3 py-1`}>
                <Text className="text-primary-dark font-bold">
                  {supersetExerciseIndex + 1}/{supersetTotalExercises}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🆕 BADGE DROP SET */}
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
                  <Text className="text-gray-400 text-sm">
                    Tour {dropRound || 0}/{dropTotalRounds || 0}
                  </Text>
                </View>
              </View>
              <View className="bg-amber-500 rounded-full px-3 py-1">
                <Text className="text-primary-dark font-bold">
                  Drop {(dropIndex || 0) + 1}/{dropTotalDrops || 0}
                </Text>
              </View>
            </View>
            {/* 🆕 NOM DE L'EXERCICE */}
            <Text className="text-white font-bold text-lg ml-14">
              {exercise.name}
            </Text>
          </View>
        )}

        {/* En-tête */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm mb-1">
            {isSuperset
              ? `Exercice ${supersetExerciseIndex + 1}/${supersetTotalExercises} du superset`
              : isDropset
                ? `Drop ${dropIndex + 1}/${dropTotalDrops}`
                : `Exercice ${exerciseNumber}/${totalExercises}`
            }
          </Text>
          <Text className="text-white text-3xl font-bold mb-2">
            {exercise.name}
          </Text>

          {/* Ligne avec Série et Bouton Gérer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className={`text-xl font-bold ${isSuperset ? 'text-accent-cyan' : isDropset ? 'text-amber-500' : 'text-accent-cyan'}`}>
                {isSuperset
                  ? `Tour ${supersetRound || 0}/${supersetTotalRounds || 0}`
                  : isDropset
                    ? `Tour ${dropRound || 0}/${dropTotalRounds || 0}`
                    : `Série ${setNumber || 0}/${totalSets || 0}`
                }
              </Text>
            </View>

            {/* Bouton Gérer exercices */}
            <TouchableOpacity
              className="bg-primary-navy rounded-full p-2"
              onPress={onManageExercises}
            >
              <Ionicons name="settings" size={24} color="#00f5ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔥 INFO SUPERSET - ENCHAÎNEMENT */}
        {isSuperset && !isLastExerciseInSuperset && (
          <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-4 border border-accent-cyan/30">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#00f5ff" />
              <View className="flex-1 ml-3">
                <Text className="text-accent-cyan font-bold mb-1">
                  ⚡ ENCHAÎNEMENT DIRECT
                </Text>
                <Text className="text-gray-400 text-sm">
                  Pas de repos après cette série - enchaîne directement sur l'exercice suivant !
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🔥 INFO SUPERSET - REPOS */}
        {isSuperset && isLastExerciseInSuperset && supersetRound < supersetTotalRounds && (
          <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-4 border border-accent-cyan/30">
            <View className="flex-row items-start">
              <Ionicons name="time" size={20} color="#00f5ff" />
              <View className="flex-1 ml-3">
                <Text className="text-accent-cyan font-bold mb-1">
                  💤 REPOS APRÈS CETTE SÉRIE
                </Text>
                <Text className="text-gray-400 text-sm">
                  Repos avant le tour {supersetRound + 1}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🆕 INFO DROP SET - ENCHAÎNEMENT */}
        {isDropset && !isLastDrop && (
          <View className="bg-amber-500/10 rounded-2xl p-4 mb-4 border border-amber-500/30">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#f59e0b" />
              <View className="flex-1 ml-3">
                <Text className="text-amber-500 font-bold mb-1">
                  🔻 BAISSE LE POIDS ET ENCHAÎNE !
                </Text>
                <Text className="text-gray-400 text-sm">
                  Réduis le poids (environ -20%) et enchaîne immédiatement sans repos !
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🆕 INFO DROP SET - REPOS */}
        {isDropset && isLastDrop && dropRound < dropTotalRounds && (
          <View className="bg-amber-500/10 rounded-2xl p-4 mb-4 border border-amber-500/30">
            <View className="flex-row items-start">
              <Ionicons name="time" size={20} color="#f59e0b" />
              <View className="flex-1 ml-3">
                <Text className="text-amber-500 font-bold mb-1">
                  💤 REPOS APRÈS CE DROP
                </Text>
                <Text className="text-gray-400 text-sm">
                  Repos avant le tour {dropRound + 1}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Saisie Poids */}
        <View className={`rounded-2xl p-4 mb-4 ${isSuperset ? 'bg-accent-cyan/10 border border-accent-cyan/30' : isDropset ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-primary-navy'}`}>
          <Text className="text-gray-400 text-sm mb-2">POIDS (kg)</Text>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="bg-primary-dark rounded-xl p-3"
              onPress={() => adjustValue('weight', -2.5)}
            >
              <Ionicons name="remove" size={24} color="#fff" />
            </TouchableOpacity>

            <TextInput
              className="text-white text-4xl font-bold text-center flex-1 mx-4"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              className="bg-primary-dark rounded-xl p-3"
              onPress={() => adjustValue('weight', 2.5)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Saisie Reps */}
        <View className={`rounded-2xl p-4 mb-6 ${isSuperset ? 'bg-accent-cyan/10 border border-accent-cyan/30' : isDropset ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-primary-navy'}`}>
          <Text className="text-gray-400 text-sm mb-2">RÉPÉTITIONS</Text>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="bg-primary-dark rounded-xl p-3"
              onPress={() => adjustValue('reps', -1)}
            >
              <Ionicons name="remove" size={24} color="#fff" />
            </TouchableOpacity>

            <TextInput
              className="text-white text-4xl font-bold text-center flex-1 mx-4"
              value={reps}
              onChangeText={setReps}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              className="bg-primary-dark rounded-xl p-3"
              onPress={() => adjustValue('reps', 1)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dernière performance + Records */}
        {lastPerformance && lastPerformance.lastSets && lastPerformance.lastSets.length > 0 && !isDropset && (
          <View className="bg-primary-navy rounded-2xl p-4 mb-4">
            <Text className="text-gray-400 text-sm font-bold mb-3">
              📊 HISTORIQUE
            </Text>

            {/* Dernière fois */}
            <View className="bg-primary-dark rounded-xl p-3 mb-2">
              <Text className="text-gray-400 text-xs mb-1">Dernière fois</Text>
              <Text className="text-white font-semibold text-lg">
                {lastPerformance.lastSets[0].weight}kg × {lastPerformance.lastSets[0].reps} reps
              </Text>
            </View>

            {/* Records */}
            <View className="flex-row gap-2">
              {/* Record poids */}
              <View className="flex-1 bg-accent-cyan/10 border border-accent-cyan/30 rounded-xl p-3">
                <Text className="text-accent-cyan text-xs font-bold mb-1">
                  🏆 RECORD POIDS
                </Text>
                <Text className="text-white font-bold text-xl">
                  {lastPerformance.maxWeight}kg
                </Text>
              </View>

              {/* Record reps */}
              <View className="flex-1 bg-success/10 border border-success/30 rounded-xl p-3">
                <Text className="text-success text-xs font-bold mb-1">
                  💪 RECORD REPS
                </Text>
                <Text className="text-white font-bold text-xl">
                  {lastPerformance.maxReps} reps
                </Text>
                <Text className="text-gray-400 text-xs">
                  à {lastPerformance.maxRepsWeight}kg
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 🆕 HISTORIQUE DROP SET - DERNIÈRE FOIS + RECORDS */}
        {isDropset && lastPerformance && lastPerformance.isDropset && (
          <View className="bg-amber-500/10 rounded-2xl p-4 mb-4 border border-amber-500/30">
            <Text className="text-amber-500 text-sm font-bold mb-3">
              📊 DERNIÈRE FOIS
            </Text>

            {/* Afficher chaque drop de la dernière séance */}
            {lastPerformance.lastDropSets && lastPerformance.lastDropSets.length > 0 ? (
              <View className="mb-3">
                {lastPerformance.lastDropSets
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((set, idx) => (
                    <View key={idx} className="bg-primary-dark rounded-xl p-3 mb-2">
                      <Text className="text-gray-400 text-xs mb-1">
                        Drop {set.set_number}
                      </Text>
                      <Text className="text-white font-semibold text-lg">
                        {set.weight}kg × {set.reps} reps
                      </Text>
                    </View>
                  ))}
              </View>
            ) : (
              <View className="bg-primary-dark rounded-xl p-3 mb-3">
                <Text className="text-gray-400 text-sm text-center">
                  Première fois pour cet exercice en drop set
                </Text>
              </View>
            )}

            {/* Records pour chaque drop */}
            {lastPerformance.dropRecords && (
              <>
                <Text className="text-amber-500 text-sm font-bold mb-2 mt-2">
                  🏆 RECORDS PAR DROP
                </Text>
                {Object.keys(lastPerformance.dropRecords).map((dropIdx) => {
                  const record = lastPerformance.dropRecords[dropIdx];
                  const isCurrentDrop = parseInt(dropIdx) === dropIndex;

                  return (
                    <View
                      key={dropIdx}
                      className={`rounded-xl p-3 mb-2 ${isCurrentDrop
                          ? 'bg-amber-500/20 border border-amber-500'
                          : 'bg-primary-dark'
                        }`}
                    >
                      <Text className={`text-xs font-bold mb-2 ${isCurrentDrop ? 'text-amber-400' : 'text-gray-400'
                        }`}>
                        Drop {parseInt(dropIdx) + 1} {isCurrentDrop ? '← Actuel' : ''}
                      </Text>

                      <View className="flex-row gap-2">
                        {/* Record poids */}
                        <View className="flex-1">
                          <Text className="text-accent-cyan text-xs">
                            🏋️ Poids max
                          </Text>
                          <Text className="text-white font-bold">
                            {record.maxWeight}kg
                          </Text>
                        </View>

                        {/* Record reps */}
                        <View className="flex-1">
                          <Text className="text-success text-xs">
                            💪 Reps max
                          </Text>
                          <Text className="text-white font-bold">
                            {record.maxReps} reps
                          </Text>
                          <Text className="text-gray-400 text-xs">
                            à {record.maxRepsWeight}kg
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* 🆕 HISTORIQUE DES DROPS PAR TOUR (séance en cours) */}
        {isDropset && previousSets.length > 0 && (
          <View className="bg-primary-navy rounded-2xl p-4 mb-4">
            <Text className="text-gray-400 text-sm font-bold mb-3">
              📈 SÉANCE EN COURS
            </Text>
            {(() => {
              const tourGroups = {};
              previousSets.forEach(set => {
                const tourNum = set.round || 1;
                if (!tourGroups[tourNum]) {
                  tourGroups[tourNum] = [];
                }
                tourGroups[tourNum].push(set);
              });

              return Object.keys(tourGroups)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(tourNum => (
                  <View key={tourNum} className="mb-3">
                    <Text className="text-accent-cyan text-sm font-bold mb-1">
                      Série {tourNum}
                    </Text>
                    {tourGroups[tourNum]
                      .sort((a, b) => a.dropIndex - b.dropIndex)
                      .map((set, idx) => (
                        <Text key={idx} className="text-white text-sm ml-2">
                          • Drop {set.dropIndex + 1}: {set.weight}kg × {set.reps} reps
                        </Text>
                      ))}
                  </View>
                ));
            })()}

            <View className="mt-2 pt-2 border-t border-primary-dark">
              <Text className="text-gray-400 text-xs text-center">
                🔥 Série {dropRound} en cours
              </Text>
            </View>
          </View>
        )}

        {/* Suggestion */}
        {suggestion && !isDropset && (
          <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-6 border border-accent-cyan/20">
            <View className="flex-row items-center mb-3">
              <Ionicons name="bulb" size={20} color="#00f5ff" />
              <Text className="text-accent-cyan text-sm font-bold ml-2">
                🎯 SUGGESTION
              </Text>
            </View>

            <TouchableOpacity
              className="bg-accent-cyan rounded-xl p-4"
              onPress={() => applySuggestion('suggested')}
            >
              <Text className="text-primary-dark text-center font-bold text-lg">
                {suggestion.weight}kg × {suggestion.reps} reps
              </Text>
              <Text className="text-primary-dark/70 text-center text-sm mt-1">
                {suggestion.type === 'reps' && 'Augmente d\'1 répétition 📈'}
                {suggestion.type === 'weight' && 'Augmente le poids (+5kg) 🔥'}
                {suggestion.type === 'maintain' && 'Maintien de la performance 🔄'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🆕 BOUTON ADAPTÉ AU CONTEXTE */}
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

        {/* Bouton répéter */}
        {!isDropset && (
          <TouchableOpacity
            className="bg-primary-navy rounded-xl p-3 mb-4"
            onPress={() => applySuggestion('repeat')}
          >
            <Text className="text-gray-400 text-center font-semibold">
              = Répéter dernière perf
            </Text>
          </TouchableOpacity>
        )}



      </View>
    </ScrollView>
  );
}
