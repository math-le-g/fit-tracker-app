import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import * as Haptics from 'expo-haptics';

export default function EditRoutineScreen({ route, navigation }) {
  const { routineId } = route.params;
  const [routineName, setRoutineName] = useState('');
  const [routineType, setRoutineType] = useState('Personnalisé');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  
  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  useEffect(() => {
    loadRoutine();
  }, []);

  const loadRoutine = async () => {
    try {
      const routine = await db.getFirstAsync(
        'SELECT * FROM routines WHERE id = ?',
        [routineId]
      );

      setRoutineName(routine.name);
      setRoutineType(routine.type);

      const exercises = await db.getAllAsync(`
        SELECT 
          e.*,
          re.sets,
          re.rest_time,
          re.order_index
        FROM routine_exercises re
        JOIN exercises e ON re.exercise_id = e.id
        WHERE re.routine_id = ?
        ORDER BY re.order_index ASC
      `, [routineId]);

      const formattedExercises = exercises.map(ex => ({
        ...ex,
        rest_minutes: Math.floor(ex.rest_time / 60),
        rest_seconds: ex.rest_time % 60
      }));

      setSelectedExercises(formattedExercises);
    } catch (error) {
      console.error('Erreur chargement routine:', error);
    }
  };

  const loadExercises = async () => {
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');
      setAvailableExercises(exercises);
      setShowExercisePicker(true);
      setSearchQuery('');
      setMuscleFilter('all');
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const addExercise = (exercise) => {
    if (!selectedExercises.find(e => e.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, {
        ...exercise,
        sets: 3,
        rest_minutes: 1,
        rest_seconds: 30
      }]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeExercise = (exerciseId) => {
    setSelectedExercises(selectedExercises.filter(e => e.id !== exerciseId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const updateExerciseSets = (exerciseId, sets) => {
    const parsedSets = parseInt(sets) || 1;
    setSelectedExercises(selectedExercises.map(e => 
      e.id === exerciseId ? { ...e, sets: Math.max(1, Math.min(20, parsedSets)) } : e
    ));
  };

  const updateExerciseRestMinutes = (exerciseId, minutes) => {
    const parsedMinutes = parseInt(minutes) || 0;
    setSelectedExercises(selectedExercises.map(e => 
      e.id === exerciseId ? { ...e, rest_minutes: Math.max(0, Math.min(10, parsedMinutes)) } : e
    ));
  };

  const updateExerciseRestSeconds = (exerciseId, seconds) => {
    const parsedSeconds = parseInt(seconds) || 0;
    setSelectedExercises(selectedExercises.map(e => 
      e.id === exerciseId ? { ...e, rest_seconds: Math.max(0, Math.min(59, parsedSeconds)) } : e
    ));
  };

  const moveExercise = (index, direction) => {
    const newExercises = [...selectedExercises];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newExercises.length) {
      [newExercises[index], newExercises[newIndex]] = [newExercises[newIndex], newExercises[index]];
      setSelectedExercises(newExercises);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const saveRoutine = async () => {
    if (!routineName.trim()) {
      setModalConfig({
        title: 'Nom requis',
        message: 'Donne un nom à ta routine !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
      return;
    }

    if (selectedExercises.length === 0) {
      setModalConfig({
        title: 'Exercices requis',
        message: 'Ajoute au moins un exercice à ta routine !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
      return;
    }

    try {
      // Mettre à jour la routine
      await db.runAsync(
        'UPDATE routines SET name = ?, type = ? WHERE id = ?',
        [routineName, routineType, routineId]
      );

      // Supprimer les anciens exercices
      await db.runAsync(
        'DELETE FROM routine_exercises WHERE routine_id = ?',
        [routineId]
      );

      // Réinsérer les exercices
      for (let i = 0; i < selectedExercises.length; i++) {
        const ex = selectedExercises[i];
        const totalRestSeconds = (ex.rest_minutes * 60) + ex.rest_seconds;
        
        await db.runAsync(
          'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time) VALUES (?, ?, ?, ?, ?)',
          [routineId, ex.id, i, ex.sets, totalRestSeconds]
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error('Erreur sauvegarde routine:', error);
      setModalConfig({
        title: 'Erreur',
        message: 'Impossible de sauvegarder la routine',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
    }
  };

  // Filtrer les exercices
  const filteredExercises = availableExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  const muscleGroups = ['all', 'Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Core'];

  return (
    <View className="flex-1 bg-primary-dark">
      <ScrollView>
        <View className="p-6">
          {/* Nom de la routine */}
          <Text className="text-white text-lg font-bold mb-2">NOM DE LA ROUTINE</Text>
          <TextInput
            className="bg-primary-navy text-white rounded-xl p-4 mb-6"
            placeholder="Ex: Pectoraux & Triceps"
            placeholderTextColor="#6b7280"
            value={routineName}
            onChangeText={setRoutineName}
          />

          {/* Type */}
          <Text className="text-white text-lg font-bold mb-3">TYPE D'ENTRAÎNEMENT</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {['Pectoraux & Épaules', 'Dos & Bras', 'Jambes', 'Corps complet', 'Personnalisé'].map(type => (
              <TouchableOpacity
                key={type}
                className={`rounded-xl px-4 py-3 border ${
                  routineType === type 
                    ? 'bg-accent-cyan border-accent-cyan' 
                    : 'bg-primary-navy border-gray-600'
                }`}
                onPress={() => setRoutineType(type)}
              >
                <Text className={`font-bold ${
                  routineType === type ? 'text-primary-dark' : 'text-gray-400'
                }`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Exercices sélectionnés */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white text-lg font-bold">
              EXERCICES ({selectedExercises.length})
            </Text>
            <TouchableOpacity
              className="bg-accent-cyan rounded-xl px-4 py-2"
              onPress={loadExercises}
            >
              <Text className="text-primary-dark font-bold">+ AJOUTER</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.map((ex, index) => (
            <View key={`${ex.id}-${index}`} className="bg-primary-navy rounded-2xl p-4 mb-3">
              {/* En-tête exercice */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-white font-bold">{ex.name}</Text>
                  <Text className="text-gray-400 text-sm">{ex.muscle_group}</Text>
                </View>

                <View className="flex-row gap-2">
                  {/* Boutons réorganiser */}
                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-2"
                    onPress={() => moveExercise(index, -1)}
                    disabled={index === 0}
                  >
                    <Ionicons name="chevron-up" size={20} color={index === 0 ? "#4b5563" : "#fff"} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-2"
                    onPress={() => moveExercise(index, 1)}
                    disabled={index === selectedExercises.length - 1}
                  >
                    <Ionicons name="chevron-down" size={20} color={index === selectedExercises.length - 1 ? "#4b5563" : "#fff"} />
                  </TouchableOpacity>

                  {/* Bouton supprimer */}
                  <TouchableOpacity
                    className="bg-danger/20 rounded-lg p-2"
                    onPress={() => removeExercise(ex.id)}
                  >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Séries */}
              <View className="mb-3">
                <Text className="text-gray-400 text-sm mb-2">Séries</Text>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-3"
                    onPress={() => updateExerciseSets(ex.id, ex.sets - 1)}
                  >
                    <Ionicons name="remove" size={20} color="#fff" />
                  </TouchableOpacity>

                  <TextInput
                    className="flex-1 bg-primary-dark text-white text-center rounded-lg p-3 text-lg font-bold"
                    value={ex.sets.toString()}
                    onChangeText={(text) => updateExerciseSets(ex.id, text)}
                    keyboardType="number-pad"
                    maxLength={2}
                  />

                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-3"
                    onPress={() => updateExerciseSets(ex.id, ex.sets + 1)}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Temps de repos */}
              <View>
                <Text className="text-gray-400 text-sm mb-2">Temps de repos</Text>
                <View className="flex-row items-center gap-2">
                  {/* Minutes */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1">
                      <TouchableOpacity
                        className="bg-primary-dark rounded-lg p-2"
                        onPress={() => updateExerciseRestMinutes(ex.id, ex.rest_minutes - 1)}
                      >
                        <Ionicons name="remove" size={16} color="#fff" />
                      </TouchableOpacity>

                      <TextInput
                        className="flex-1 bg-primary-dark text-white text-center rounded-lg p-2"
                        value={ex.rest_minutes.toString()}
                        onChangeText={(text) => updateExerciseRestMinutes(ex.id, text)}
                        keyboardType="number-pad"
                        maxLength={2}
                      />

                      <TouchableOpacity
                        className="bg-primary-dark rounded-lg p-2"
                        onPress={() => updateExerciseRestMinutes(ex.id, ex.rest_minutes + 1)}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <Text className="text-gray-400 text-xs text-center mt-1">min</Text>
                  </View>

                  <Text className="text-white text-xl">:</Text>

                  {/* Secondes */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1">
                      <TouchableOpacity
                        className="bg-primary-dark rounded-lg p-2"
                        onPress={() => updateExerciseRestSeconds(ex.id, ex.rest_seconds - 15)}
                      >
                        <Ionicons name="remove" size={16} color="#fff" />
                      </TouchableOpacity>

                      <TextInput
                        className="flex-1 bg-primary-dark text-white text-center rounded-lg p-2"
                        value={ex.rest_seconds.toString()}
                        onChangeText={(text) => updateExerciseRestSeconds(ex.id, text)}
                        keyboardType="number-pad"
                        maxLength={2}
                      />

                      <TouchableOpacity
                        className="bg-primary-dark rounded-lg p-2"
                        onPress={() => updateExerciseRestSeconds(ex.id, ex.rest_seconds + 15)}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <Text className="text-gray-400 text-xs text-center mt-1">sec</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {selectedExercises.length === 0 && (
            <View className="bg-primary-navy rounded-2xl p-6 mb-6">
              <Text className="text-gray-400 text-center">
                Aucun exercice ajouté
              </Text>
            </View>
          )}

          {/* Bouton enregistrer */}
          <TouchableOpacity
            className="bg-success rounded-2xl p-4 mb-3"
            onPress={saveRoutine}
          >
            <Text className="text-primary-dark text-center text-lg font-bold">
              ✓ ENREGISTRER LES MODIFICATIONS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-primary-navy rounded-2xl p-3"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-gray-400 text-center font-semibold">
              Annuler
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal sélection exercices avec recherche */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-primary-dark">
          {/* Header */}
          <View className="bg-primary-navy p-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Ajouter un exercice</Text>
            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View className="p-4 bg-primary-navy">
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

          {/* Filtres groupes musculaires - FIX CSS */}
          <View style={{ backgroundColor: '#1a1f3a', paddingBottom: 12 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {muscleGroups.map(muscle => (
                <TouchableOpacity
                  key={muscle}
                  style={{
                    marginRight: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: muscleFilter === muscle ? '#00f5ff' : '#0a0e27'
                  }}
                  onPress={() => setMuscleFilter(muscle)}
                >
                  <Text style={{
                    fontWeight: '600',
                    color: muscleFilter === muscle ? '#0a0e27' : '#6b7280'
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
              {filteredExercises.length === 0 ? (
                <View className="bg-primary-navy rounded-xl p-6">
                  <Text className="text-gray-400 text-center">
                    Aucun exercice trouvé
                  </Text>
                </View>
              ) : (
                filteredExercises.map(ex => {
                  const isSelected = selectedExercises.find(e => e.id === ex.id);
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      className={`rounded-xl p-4 mb-2 ${
                        isSelected ? 'bg-accent-cyan/20 border border-accent-cyan' : 'bg-primary-navy'
                      }`}
                      onPress={() => addExercise(ex)}
                      disabled={!!isSelected}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className={`font-bold ${isSelected ? 'text-accent-cyan' : 'text-white'}`}>
                            {ex.name}
                          </Text>
                          <Text className="text-gray-400 text-sm">
                            {ex.muscle_group} • {ex.equipment}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#00f5ff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Bouton créer exercice custom */}
              <TouchableOpacity
                className="bg-primary-navy rounded-xl p-4 mt-4 border border-dashed border-gray-600"
                onPress={() => {
                  setShowExercisePicker(false);
                  navigation.navigate('CreateCustomExercise');
                }}
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
      </Modal>

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </View>
  );
}