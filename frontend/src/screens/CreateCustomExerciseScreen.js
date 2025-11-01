import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { db } from '../database/database';

export default function CreateCustomExerciseScreen({ navigation, route }) {
  const { onExerciseCreated } = route.params || {};
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [restTime, setRestTime] = useState(90);

  const muscleGroups = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux', 'Autre'];
  const restTimes = [30, 45, 60, 90, 120];

  const createExercise = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Donne un nom à l\'exercice !');
      return;
    }

    if (!muscleGroup) {
      Alert.alert('Erreur', 'Choisis un groupe musculaire !');
      return;
    }

    try {
      const result = await db.runAsync(
        'INSERT INTO exercises (name, muscle_group, equipment, default_rest_time, is_custom) VALUES (?, ?, ?, ?, 1)',
        [name.trim(), muscleGroup, equipment.trim() || 'Autre', restTime]
      );

      const newExercise = {
        id: result.lastInsertRowId,
        name: name.trim(),
        muscle_group: muscleGroup,
        equipment: equipment.trim() || 'Autre',
        default_rest_time: restTime,
        is_custom: 1
      };

      console.log('✅ Exercice créé:', newExercise);

      if (onExerciseCreated) {
        onExerciseCreated(newExercise);
      }

      Alert.alert('✅ Succès', 'Exercice créé !', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('Erreur création exercice:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'exercice');
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-3xl font-bold mb-6">
          Créer un exercice
        </Text>

        {/* Nom */}
        <View className="mb-6">
          <Text className="text-gray-400 mb-2">NOM DE L'EXERCICE *</Text>
          <TextInput
            className="bg-primary-navy rounded-xl p-4 text-white"
            placeholder="Ex: Presse convergente"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Groupe musculaire */}
        <View className="mb-6">
          <Text className="text-gray-400 mb-2">GROUPE MUSCULAIRE *</Text>
          <View className="flex-row flex-wrap gap-2">
            {muscleGroups.map((group) => (
              <TouchableOpacity
                key={group}
                className={`rounded-xl px-4 py-2 ${
                  muscleGroup === group ? 'bg-accent-cyan' : 'bg-primary-navy'
                }`}
                onPress={() => setMuscleGroup(group)}
              >
                <Text className={`font-semibold ${
                  muscleGroup === group ? 'text-primary-dark' : 'text-gray-400'
                }`}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Équipement */}
        <View className="mb-6">
          <Text className="text-gray-400 mb-2">ÉQUIPEMENT</Text>
          <TextInput
            className="bg-primary-navy rounded-xl p-4 text-white"
            placeholder="Ex: Haltères, Machine, Poulie..."
            placeholderTextColor="#6b7280"
            value={equipment}
            onChangeText={setEquipment}
          />
        </View>

        {/* Temps de repos */}
        <View className="mb-6">
          <Text className="text-gray-400 mb-2">TEMPS DE REPOS (secondes)</Text>
          <View className="flex-row gap-2">
            {restTimes.map((time) => (
              <TouchableOpacity
                key={time}
                className={`flex-1 rounded-xl p-3 ${
                  restTime === time ? 'bg-accent-cyan' : 'bg-primary-navy'
                }`}
                onPress={() => setRestTime(time)}
              >
                <Text className={`text-center font-bold ${
                  restTime === time ? 'text-primary-dark' : 'text-gray-400'
                }`}>
                  {time}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Boutons */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-5 mb-3"
          onPress={createExercise}
        >
          <Text className="text-primary-dark text-center text-xl font-bold">
            ✓ CRÉER L'EXERCICE
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