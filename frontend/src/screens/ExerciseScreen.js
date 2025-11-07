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
  // 🆕 PROPS POUR LES SUPERSETS
  isSuperset = false,
  supersetRound = null,
  supersetTotalRounds = null,
  supersetExerciseIndex = null,
  supersetTotalExercises = null,
  supersetName = null
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [lastPerformance, setLastPerformance] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  // 🆕 OBTENIR LES INFOS DU SUPERSET
  const supersetInfo = isSuperset && supersetTotalExercises
    ? getSupersetInfo(supersetTotalExercises)
    : null;

  // 🆕 VÉRIFIER SI C'EST LE DERNIER EXERCICE DU SUPERSET
  const isLastExerciseInSuperset = isSuperset && (supersetExerciseIndex === supersetTotalExercises - 1);

  useEffect(() => {
    loadLastPerformance();
  }, [exercise.id]); // 🆕 Recharger quand l'exercice change

  const loadLastPerformance = async () => {
    try {
      const lastSets = await db.getAllAsync(`
        SELECT s.weight, s.reps, s.set_number, w.date
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
        AND w.id != (SELECT MAX(id) FROM workouts)
        ORDER BY w.date DESC, s.set_number ASC
        LIMIT 10
      `, [exercise.id]);

      if (lastSets.length > 0) {
        setLastPerformance(lastSets);

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

    if (w > 0 && r > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSetComplete(w, r);
      // Reset pour la prochaine série
      setWeight('');
      setReps('');
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <TouchableOpacity
          className="absolute top-2 right-2 z-10 bg-danger/20 rounded-full p-2"
          onPress={onQuitSession}
        >
          <Ionicons name="close" size={20} color="#ff4444" />
        </TouchableOpacity>

        {/* 🆕 BADGE SUPERSET */}
        {isSuperset && supersetInfo && (
          <View className={`rounded-2xl p-4 mb-4 border-2 ${supersetInfo.bgColor}/20 ${supersetInfo.borderColor}`}>
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
                    Tour {supersetRound}/{supersetTotalRounds}
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

        {/* En-tête */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm mb-1">
            {isSuperset
              ? `Exercice ${supersetExerciseIndex + 1}/${supersetTotalExercises} du superset`
              : `Exercice ${exerciseNumber}/${totalExercises}`
            }
          </Text>
          <Text className="text-white text-3xl font-bold mb-2">
            {exercise.name}
          </Text>

          {/* Ligne avec Série et Bouton Gérer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className={`text-xl font-bold ${isSuperset ? 'text-accent-cyan' : 'text-accent-cyan'}`}>
                {isSuperset
                  ? `Tour ${supersetRound}/${supersetTotalRounds}`
                  : `Série ${setNumber}/${totalSets}`
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

        {/* 🆕 INFO SUPERSET */}
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

        {/* Saisie Poids */}
        <View className={`rounded-2xl p-4 mb-4 ${isSuperset ? 'bg-accent-cyan/10 border border-accent-cyan/30' : 'bg-primary-navy'}`}>
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
        <View className={`rounded-2xl p-4 mb-6 ${isSuperset ? 'bg-accent-cyan/10 border border-accent-cyan/30' : 'bg-primary-navy'}`}>
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

        {/* Dernière performance */}
        {lastPerformance && lastPerformance.length > 0 && (
          <View className="bg-primary-navy rounded-2xl p-4 mb-4">
            <Text className="text-gray-400 text-sm mb-2">
              📊 DERNIÈRE FOIS
            </Text>
            <Text className="text-white font-semibold">
              {lastPerformance[0].weight}kg × {lastPerformance[0].reps} reps
            </Text>
          </View>
        )}

        {/* Suggestion */}
        {suggestion && (
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

        {/* 🆕 BOUTON DIFFÉRENT SELON SUPERSET */}
        <TouchableOpacity
          className={`rounded-2xl p-5 mb-4 ${isSuperset ? 'bg-accent-cyan' : 'bg-success'}`}
          onPress={handleValidate}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons
              name={isSuperset && !isLastExerciseInSuperset ? "arrow-forward-circle" : "checkmark-circle"}
              size={28}
              color="#0a0e27"
            />
            <Text className="text-primary-dark text-xl font-bold ml-2">
              {isSuperset && !isLastExerciseInSuperset
                ? '➡️ ENCHAÎNER'
                : '✓ VALIDER SÉRIE'
              }
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bouton répéter uniquement */}
        <TouchableOpacity
          className="bg-primary-navy rounded-xl p-3"
          onPress={() => applySuggestion('repeat')}
        >
          <Text className="text-gray-400 text-center font-semibold">
            = Répéter dernière perf
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
