import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function SelectReplacementExerciseScreen({ route, navigation }) {
  const { onReplace } = route.params;
  const [availableExercises, setAvailableExercises] = useState([]);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY is_custom DESC, muscle_group, name');
      setAvailableExercises(exercises);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const selectExercise = (exercise) => {
    onReplace(exercise);
    navigation.goBack();
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-2xl font-bold">
            Choisir un remplacement
          </Text>

          <TouchableOpacity
            className="bg-accent-cyan rounded-full px-4 py-2"
            onPress={() => navigation.navigate('CreateCustomExercise', {
              onExerciseCreated: (newExercise) => {
                selectExercise(newExercise);
              }
            })}
          >
            <Text className="text-primary-dark font-bold">+ CRÉER</Text>
          </TouchableOpacity>
        </View>

        {availableExercises.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            className="bg-primary-navy rounded-xl p-4 mb-3"
            onPress={() => selectExercise(exercise)}
          >
            <View className="flex-row items-center">
              {exercise.is_custom === 1 && (
                <Text className="text-accent-cyan mr-2">🔧</Text>
              )}
              <View className="flex-1">
                <Text className="text-white font-bold">{exercise.name}</Text>
                <Text className="text-gray-400 text-sm">
                  {exercise.muscle_group} • {exercise.equipment}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}