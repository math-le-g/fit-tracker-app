import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function SelectReplacementExerciseScreen({ route, navigation }) {
  const { currentExercise, onReplace } = route.params;
  const [exercises, setExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState(currentExercise?.muscle_group || 'all');

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const allExercises = await db.getAllAsync(
        'SELECT * FROM exercises WHERE id != ? ORDER BY muscle_group, name',
        [currentExercise.id]
      );
      setExercises(allExercises);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const selectExercise = (exercise) => {
    // ✅ CORRECTION: Appeler onReplace AVANT goBack
    if (onReplace) {
      onReplace(exercise);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Retourner directement sans naviguer
    navigation.goBack();
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  const recommended = filteredExercises.filter(ex => ex.muscle_group === currentExercise.muscle_group);
  const others = filteredExercises.filter(ex => ex.muscle_group !== currentExercise.muscle_group);

  const muscleGroups = ['all', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux', 'Cardio'];

  return (
    <View className="flex-1 bg-primary-dark">
      {/* Header */}
      <View className="bg-primary-navy p-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-gray-400 text-sm">REMPLACER</Text>
            <Text className="text-white text-lg font-bold">{currentExercise.name}</Text>
            <Text className="text-gray-400 text-sm">{currentExercise.muscle_group}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View className="bg-primary-dark rounded-xl px-4 py-3 flex-row items-center">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 text-white ml-2"
            placeholder="Rechercher un exercice..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ✅ CORRECTION: Filtres avec taille réduite */}
      <View style={{ backgroundColor: '#1a1f3a', paddingVertical: 8 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {muscleGroups.map((muscle, index) => (
            <TouchableOpacity
              key={muscle}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: muscleFilter === muscle ? '#00f5ff' : 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: muscleFilter === muscle ? '#00f5ff' : 'transparent',
                marginRight: index < muscleGroups.length - 1 ? 6 : 0
              }}
              onPress={() => {
                setMuscleFilter(muscle);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: muscleFilter === muscle ? '#0a0e27' : '#a8a8a0'
              }}>
                {muscle === 'all' ? 'Tous' : muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste exercices */}
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Recommandations */}
          {recommended.length > 0 && (
            <>
              <View className="flex-row items-center mb-3">
                <Ionicons name="bulb" size={20} color="#00f5ff" />
                <Text className="text-accent-cyan text-sm font-bold ml-2">
                  💡 RECOMMANDÉ (même groupe musculaire)
                </Text>
              </View>

              {recommended.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  className="bg-accent-cyan/10 rounded-xl p-4 mb-2 border border-accent-cyan/30"
                  onPress={() => selectExercise(ex)}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-white font-bold">{ex.name}</Text>
                      <Text className="text-gray-400 text-sm">
                        {ex.muscle_group} • {ex.equipment}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={24} color="#00f5ff" />
                  </View>
                </TouchableOpacity>
              ))}

              {others.length > 0 && (
                <Text className="text-gray-400 text-sm font-bold mt-6 mb-3">
                  AUTRES EXERCICES
                </Text>
              )}
            </>
          )}

          {/* Autres exercices */}
          {others.map(ex => (
            <TouchableOpacity
              key={ex.id}
              className="bg-primary-navy rounded-xl p-4 mb-2"
              onPress={() => selectExercise(ex)}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white font-bold">{ex.name}</Text>
                  <Text className="text-gray-400 text-sm">
                    {ex.muscle_group} • {ex.equipment}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>
          ))}

          {filteredExercises.length === 0 && (
            <View className="bg-primary-navy rounded-xl p-6">
              <Text className="text-gray-400 text-center">
                Aucun exercice trouvé
              </Text>
            </View>
          )}

          {/* Bouton créer exercice */}
          <TouchableOpacity
            className="bg-primary-navy rounded-xl p-4 mt-4 border border-dashed border-accent-cyan"
            onPress={() => navigation.navigate('CreateCustomExercise')}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="add-circle" size={24} color="#00f5ff" />
              <Text className="text-accent-cyan font-bold ml-2">
                Créer un exercice personnalisé
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}