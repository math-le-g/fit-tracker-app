import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function CreateRoutineScreen({ navigation }) {
  const [routineName, setRoutineName] = useState('');
  const [routineType, setRoutineType] = useState('custom');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);

  const loadExercises = async () => {
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');
      setAvailableExercises(exercises);
      setShowExercisePicker(true);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const addExercise = (exercise) => {
    if (!selectedExercises.find(e => e.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, {
        ...exercise,
        sets: 3,
        rest_time: exercise.default_rest_time
      }]);
    }
    setShowExercisePicker(false);
  };

  const removeExercise = (exerciseId) => {
    setSelectedExercises(selectedExercises.filter(e => e.id !== exerciseId));
  };

  const updateExerciseSets = (exerciseId, sets) => {
    setSelectedExercises(selectedExercises.map(e => 
      e.id === exerciseId ? { ...e, sets: parseInt(sets) || 3 } : e
    ));
  };

  const updateExerciseRest = (exerciseId, rest) => {
    setSelectedExercises(selectedExercises.map(e => 
      e.id === exerciseId ? { ...e, rest_time: parseInt(rest) || 60 } : e
    ));
  };

  const moveExercise = (index, direction) => {
    const newOrder = [...selectedExercises];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newOrder.length) {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
      setSelectedExercises(newOrder);
    }
  };

  const saveRoutine = async () => {
    if (!routineName.trim()) {
      Alert.alert('Erreur', 'Donne un nom à ta routine !');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Erreur', 'Ajoute au moins un exercice !');
      return;
    }

    try {
      // Créer la routine
      const result = await db.runAsync(
        'INSERT INTO routines (name, type) VALUES (?, ?)',
        [routineName, routineType]
      );

      const routineId = result.lastInsertRowId;

      // Ajouter les exercices
      for (let i = 0; i < selectedExercises.length; i++) {
        const ex = selectedExercises[i];
        await db.runAsync(
          'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time) VALUES (?, ?, ?, ?, ?)',
          [routineId, ex.id, i, ex.sets, ex.rest_time]
        );
      }

      Alert.alert('✅ Succès', 'Routine créée !', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('Erreur création routine:', error);
      Alert.alert('Erreur', 'Impossible de créer la routine');
    }
  };

  if (showExercisePicker) {
    return (
      <ScrollView className="flex-1 bg-primary-dark">
        <View className="p-6">
          <TouchableOpacity
            className="flex-row items-center mb-4"
            onPress={() => setShowExercisePicker(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text className="text-white ml-2 text-lg">Retour</Text>
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold mb-6">
            Choisis un exercice
          </Text>

          {availableExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              className="bg-primary-navy rounded-xl p-4 mb-3"
              onPress={() => addExercise(exercise)}
            >
              <Text className="text-white font-bold">{exercise.name}</Text>
              <Text className="text-gray-400 text-sm">
                {exercise.muscle_group} • {exercise.equipment}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-3xl font-bold mb-6">
          Créer une routine
        </Text>

        {/* Nom de la routine */}
        <View className="mb-6">
          <Text className="text-gray-400 mb-2">NOM DE LA ROUTINE</Text>
          <TextInput
            className="bg-primary-navy rounded-xl p-4 text-white"
            placeholder="Ex: Upper Body"
            placeholderTextColor="#6b7280"
            value={routineName}
            onChangeText={setRoutineName}
          />
        </View>

        {/* Type */}
        <View className="mb-6">
          <Text className="text-gray-400 mb-2">TYPE</Text>
          <View className="flex-row gap-2">
            {['push', 'pull', 'legs', 'custom'].map((type) => (
              <TouchableOpacity
                key={type}
                className={`flex-1 rounded-xl p-3 ${
                  routineType === type ? 'bg-accent-cyan' : 'bg-primary-navy'
                }`}
                onPress={() => setRoutineType(type)}
              >
                <Text className={`text-center font-bold text-xs ${
                  routineType === type ? 'text-primary-dark' : 'text-gray-400'
                }`}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exercices */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-400">EXERCICES ({selectedExercises.length})</Text>
            <TouchableOpacity
              className="bg-accent-cyan rounded-full p-2"
              onPress={loadExercises}
            >
              <Ionicons name="add" size={24} color="#0a0e27" />
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 && (
            <View className="bg-primary-navy rounded-xl p-6">
              <Text className="text-gray-400 text-center">
                Aucun exercice ajouté
              </Text>
            </View>
          )}

          {selectedExercises.map((exercise, index) => (
            <View key={exercise.id} className="bg-primary-navy rounded-xl p-4 mb-3">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white font-bold flex-1">
                  {index + 1}. {exercise.name}
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => moveExercise(index, 'up')}
                    disabled={index === 0}
                  >
                    <Ionicons 
                      name="chevron-up" 
                      size={20} 
                      color={index === 0 ? '#374151' : '#6b7280'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveExercise(index, 'down')}
                    disabled={index === selectedExercises.length - 1}
                  >
                    <Ionicons 
                      name="chevron-down" 
                      size={20} 
                      color={index === selectedExercises.length - 1 ? '#374151' : '#6b7280'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeExercise(exercise.id)}>
                    <Ionicons name="trash" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs mb-1">Séries</Text>
                  <TextInput
                    className="bg-primary-dark rounded-lg p-2 text-white text-center"
                    value={exercise.sets.toString()}
                    onChangeText={(text) => updateExerciseSets(exercise.id, text)}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs mb-1">Repos (sec)</Text>
                  <TextInput
                    className="bg-primary-dark rounded-lg p-2 text-white text-center"
                    value={exercise.rest_time.toString()}
                    onChangeText={(text) => updateExerciseRest(exercise.id, text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Boutons */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-5 mb-3"
          onPress={saveRoutine}
        >
          <Text className="text-primary-dark text-center text-xl font-bold">
            ✓ CRÉER LA ROUTINE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-4"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-gray-400 text-center font-semibold">
            Annuler
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}