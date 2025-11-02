import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function RoutineListScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('routines'); // 'routines' | 'exercises'
  const [routines, setRoutines] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');

  // ✅ Actualisation automatique
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'routines') {
        loadRoutines();
      } else {
        loadExercises();
      }
      setSearchQuery('');
    }, [activeTab])
  );

  const loadRoutines = async () => {
    try {
      const allRoutines = await db.getAllAsync('SELECT * FROM routines ORDER BY id DESC');
      setRoutines(allRoutines);
    } catch (error) {
      console.error('Erreur chargement routines:', error);
    }
  };

  const loadExercises = async () => {
    try {
      const allExercises = await db.getAllAsync(
        'SELECT * FROM exercises ORDER BY is_custom DESC, muscle_group, name'
      );
      setExercises(allExercises);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setMuscleFilter('all');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Filtrer les exercices
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  // Filtrer les routines
  const filteredRoutines = routines.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ FIX: Groupes musculaires corrigés
  const muscleGroups = ['all', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Abdominaux', 'Jambes'];

  const getTypeEmoji = (type) => {
    switch (type) {
      case 'Push': return '💪';
      case 'Pull': return '🔙';
      case 'Legs': return '🦵';
      case 'Full Body': return '🏋️';
      default: return '⚡';
    }
  };

  return (
    <View className="flex-1 bg-primary-dark">
      {/* Header avec onglets */}
      <View className="bg-primary-navy p-4">
        <Text className="text-white text-2xl font-bold mb-4">💪 Musculation</Text>

        {/* Onglets */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            className={`flex-1 rounded-xl p-3 ${
              activeTab === 'routines' ? 'bg-accent-cyan' : 'bg-primary-dark'
            }`}
            onPress={() => changeTab('routines')}
          >
            <Text className={`text-center font-bold ${
              activeTab === 'routines' ? 'text-primary-dark' : 'text-gray-400'
            }`}>
              📋 Routines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 rounded-xl p-3 ${
              activeTab === 'exercises' ? 'bg-accent-cyan' : 'bg-primary-dark'
            }`}
            onPress={() => changeTab('exercises')}
          >
            <Text className={`text-center font-bold ${
              activeTab === 'exercises' ? 'text-primary-dark' : 'text-gray-400'
            }`}>
              🏋️ Exercices
            </Text>
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View className="bg-primary-dark rounded-xl px-4 py-3 flex-row items-center">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 text-white ml-2"
            placeholder={activeTab === 'routines' ? 'Rechercher une routine...' : 'Rechercher un exercice...'}
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

      {/* Filtres groupes musculaires (seulement pour exercices) */}
      {activeTab === 'exercises' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3 bg-primary-navy">
          {muscleGroups.map(muscle => (
            <TouchableOpacity
              key={muscle}
              className={`mr-2 px-4 py-2 rounded-xl ${
                muscleFilter === muscle ? 'bg-accent-cyan' : 'bg-primary-dark'
              }`}
              onPress={() => {
                setMuscleFilter(muscle);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text className={`font-semibold ${
                muscleFilter === muscle ? 'text-primary-dark' : 'text-gray-400'
              }`}>
                {muscle === 'all' ? 'Tous' : muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Contenu */}
      <ScrollView className="flex-1">
        <View className="p-4">
          {activeTab === 'routines' ? (
            <>
              {/* Bouton créer routine */}
              <TouchableOpacity
                className="bg-accent-cyan rounded-2xl p-5 mb-4"
                onPress={() => navigation.navigate('CreateRoutine')}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="add-circle" size={28} color="#0a0e27" />
                  <Text className="text-primary-dark text-xl font-bold ml-3">
                    ➕ CRÉER UNE ROUTINE
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Liste routines */}
              {filteredRoutines.length > 0 ? (
                filteredRoutines.map(routine => (
                  <TouchableOpacity
                    key={routine.id}
                    className="bg-primary-navy rounded-2xl p-4 mb-3"
                    onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-white text-lg font-bold">
                            {getTypeEmoji(routine.type)} {routine.name}
                          </Text>
                        </View>
                        <Text className="text-gray-400 text-sm">
                          {routine.type}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#6b7280" />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="bg-primary-navy rounded-2xl p-6">
                  <Text className="text-gray-400 text-center">
                    {searchQuery ? 'Aucune routine trouvée' : 'Aucune routine créée'}
                  </Text>
                  {!searchQuery && (
                    <Text className="text-gray-400 text-center text-sm mt-2">
                      Crée ta première routine pour commencer !
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              {/* Bouton créer exercice */}
              <TouchableOpacity
                className="bg-accent-cyan rounded-2xl p-5 mb-4"
                onPress={() => navigation.navigate('CreateCustomExercise')}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="add-circle" size={28} color="#0a0e27" />
                  <Text className="text-primary-dark text-xl font-bold ml-3">
                    ➕ CRÉER UN EXERCICE
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Liste exercices */}
              {filteredExercises.length > 0 ? (
                filteredExercises.map(ex => (
                  <TouchableOpacity
                    key={ex.id}
                    className={`rounded-2xl p-4 mb-3 ${
                      ex.is_custom ? 'bg-accent-cyan/10 border border-accent-cyan/30' : 'bg-primary-navy'
                    }`}
                    onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: ex.id })}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className={`text-lg font-bold ${ex.is_custom ? 'text-accent-cyan' : 'text-white'}`}>
                            {ex.name}
                          </Text>
                          {ex.is_custom && (
                            <View className="ml-2 bg-accent-cyan rounded-full px-2 py-1">
                              <Text className="text-primary-dark text-xs font-bold">PERSO</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-gray-400 text-sm">
                          {ex.muscle_group} • {ex.equipment}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color={ex.is_custom ? "#00f5ff" : "#6b7280"} />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="bg-primary-navy rounded-2xl p-6">
                  <Text className="text-gray-400 text-center">
                    Aucun exercice trouvé
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}