import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ExerciseScreen({
  exercise,
  setNumber,
  totalSets,
  onSetComplete,
  workoutStartTime,
  warmupDuration,
  exerciseIndex,
  totalExercises,
  exercisesList,      // ← AJOUTÉ
  setExercisesList,   // ← AJOUTÉ
  navigation,         // ← AJOUTÉ
  onBack              // ← AJOUTÉ
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [lastPerformance, setLastPerformance] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    loadLastPerformance();
  }, []);

  const loadLastPerformance = async () => {
    try {
      // Charger la dernière performance pour cet exercice
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
        
        // Calculer suggestion
        const lastSetForThisNumber = lastSets.find(s => s.set_number === setNumber) || lastSets[0];
        const allSetsSuccessful = lastSets.every(s => s.reps >= 8);
        
        if (allSetsSuccessful && lastSetForThisNumber.reps >= 10) {
          // Suggérer +1 rep
          setSuggestion({
            weight: lastSetForThisNumber.weight,
            reps: lastSetForThisNumber.reps + 1,
            type: 'reps'
          });
        } else if (allSetsSuccessful && lastSetForThisNumber.reps >= 12) {
          // Suggérer +5kg
          setSuggestion({
            weight: lastSetForThisNumber.weight + 5,
            reps: 8,
            type: 'weight'
          });
        } else {
          // Maintenir
          setSuggestion({
            weight: lastSetForThisNumber.weight,
            reps: lastSetForThisNumber.reps,
            type: 'maintain'
          });
        }

        // Pré-remplir avec la dernière perf
        setWeight(lastSetForThisNumber.weight.toString());
        setReps(lastSetForThisNumber.reps.toString());
      }
    } catch (error) {
      console.error('Erreur chargement dernière perf:', error);
    }
  };

  const applySuggestion = (suggestionType) => {
    if (!suggestion) return;
    
    if (suggestionType === 'suggested') {
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
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - workoutStartTime);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* En-tête */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm mb-1">
            Exercice {exerciseIndex + 1}/{totalExercises}
          </Text>
          <Text className="text-white text-3xl font-bold mb-2">
            {exercise.name}
          </Text>
          
          {/* Ligne avec Série + Timer + Bouton Gérer */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-accent-cyan text-xl font-bold">
                Série {setNumber}/{totalSets}
              </Text>
              <Text className="text-gray-400 ml-4">
                ⏱️ {formatTime(elapsedTime)}
              </Text>
            </View>
            
            {/* Bouton Gérer exercices */}
            <TouchableOpacity
              className="bg-primary-navy rounded-full p-2"
              onPress={() => navigation.navigate('ManageWorkoutExercises', {
                exercises: exercisesList,
                currentIndex: exerciseIndex,
                onReorder: (newList) => setExercisesList(newList)
              })}
            >
              <Ionicons name="settings" size={24} color="#00f5ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Saisie Poids */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-4">
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
        <View className="bg-primary-navy rounded-2xl p-4 mb-6">
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
        {lastPerformance && (
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

        {/* Bouton valider */}
        <TouchableOpacity
          className="bg-success rounded-2xl p-5 mb-4"
          onPress={handleValidate}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="checkmark-circle" size={28} color="#0a0e27" />
            <Text className="text-primary-dark text-xl font-bold ml-2">
              ✓ VALIDER SÉRIE
            </Text>
          </View>
        </TouchableOpacity>

        {/* Boutons secondaires */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-primary-navy rounded-xl p-3"
            onPress={() => applySuggestion('repeat')}
          >
            <Text className="text-gray-400 text-center font-semibold">
              = Répéter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-primary-navy rounded-xl p-3"
          >
            <Text className="text-gray-400 text-center font-semibold">
              📝 Note
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}