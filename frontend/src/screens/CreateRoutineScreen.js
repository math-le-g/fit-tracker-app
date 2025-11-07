import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';
import { getSupersetInfo } from '../utils/supersetHelpers';

export default function CreateRoutineScreen({ navigation }) {
  const [routineName, setRoutineName] = useState('');
  const [routineType, setRoutineType] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');

  // Config pour nouvel exercice
  const [showExerciseConfig, setShowExerciseConfig] = useState(false);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState(null);
  const [newExerciseSets, setNewExerciseSets] = useState(0);
  const [newExerciseRestMinutes, setNewExerciseRestMinutes] = useState(1);
  const [newExerciseRestSeconds, setNewExerciseRestSeconds] = useState(30);

  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const routineTypes = [
    { value: 'push', label: 'Push', icon: '💪' },
    { value: 'pull', label: 'Pull', icon: '🔙' },
    { value: 'legs', label: 'Legs', icon: '🦵' },
    { value: 'upper', label: 'Upper Body', icon: '💪' },
    { value: 'lower', label: 'Lower Body', icon: '🦵' },
    { value: 'full', label: 'Full Body', icon: '🏋️' },
    { value: 'custom', label: 'Custom', icon: '⚡' }
  ];

  const muscleGroups = ['all', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Abdominaux', 'Jambes'];

  const loadAvailableExercises = async () => {
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');
      setAvailableExercises(exercises);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const openExercisePicker = () => {
    loadAvailableExercises();
    setShowExercisePicker(true);
  };

  const selectExercise = (exercise) => {
    setSelectedExerciseToAdd(exercise);
    setNewExerciseSets(0);
    setNewExerciseRestMinutes(1);
    setNewExerciseRestSeconds(30);
    setShowExercisePicker(false);
    setShowExerciseConfig(true);
  };

  const confirmAddExercise = () => {
    if (!selectedExerciseToAdd || newExerciseSets === 0) return;

    const totalRestSeconds = (newExerciseRestMinutes * 60) + newExerciseRestSeconds;
    const exerciseConfig = {
      ...selectedExerciseToAdd,
      sets: newExerciseSets,
      rest_time: totalRestSeconds
    };

    setSelectedExercises([...selectedExercises, exerciseConfig]);
    setShowExerciseConfig(false);
    setSelectedExerciseToAdd(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeExercise = (index) => {
    const newList = selectedExercises.filter((_, i) => i !== index);
    setSelectedExercises(newList);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const moveExercise = (index, direction) => {
    const newList = [...selectedExercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newList.length) {
      [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
      setSelectedExercises(newList);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // 🆕 FONCTION POUR OUVRIR LE CRÉATEUR DE SUPERSET
  const openSupersetCreator = async () => {
    try {
      // Charger les exercices directement depuis la BDD
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');

      navigation.navigate('CreateSuperset', {
        availableExercises: exercises,
        onCreateSuperset: (superset) => {
          // Ajouter le superset à la liste des exercices
          setSelectedExercises([...selectedExercises, superset]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  // 🆕 FONCTION POUR DISSOCIER UN SUPERSET
  const dissociateSuperset = (index) => {
    const superset = selectedExercises[index];

    if (superset.type !== 'superset') return;

    setModalConfig({
      title: '🔓 Dissocier le superset ?',
      message: 'Les exercices seront remis en exercices normaux (3 séries chacun)',
      icon: 'git-branch',
      iconColor: '#00f5ff',
      buttons: [
        { text: 'Annuler', onPress: () => { } },
        {
          text: 'Dissocier',
          style: 'primary',
          onPress: () => {
            const newList = [...selectedExercises];
            // Remplacer le superset par ses exercices individuels
            const normalExercises = superset.exercises.map(ex => ({
              ...ex,
              sets: 3,
              rest_time: 90
            }));

            // Retirer le superset et ajouter les exercices normaux
            newList.splice(index, 1, ...normalExercises);
            setSelectedExercises(newList);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    });
    setModalVisible(true);
  };



  const saveRoutine = async () => {
    if (!routineName.trim()) {
      setModalConfig({
        title: 'Nom requis',
        message: 'Donne un nom à ta routine !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    if (selectedExercises.length === 0) {
      setModalConfig({
        title: 'Exercices requis',
        message: 'Ajoute au moins un exercice !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    try {
      const result = await db.runAsync(
        'INSERT INTO routines (name, type) VALUES (?, ?)',
        [routineName.trim(), routineType || 'custom']
      );

      const routineId = result.lastInsertRowId;

      // 🆕 Ajouter les exercices (avec support des supersets)
      for (let i = 0; i < selectedExercises.length; i++) {
        const item = selectedExercises[i];

        if (item.type === 'superset') {
          // 🔥 SUPERSET : Sauvegarder comme JSON
          const supersetData = JSON.stringify({
            type: 'superset',
            rounds: item.rounds,
            rest_time: item.rest_time,
            exercises: item.exercises
          });

          await db.runAsync(
            'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time, superset_data) VALUES (?, ?, ?, ?, ?, ?)',
            [routineId, -1, i, item.rounds, item.rest_time, supersetData]
          );
        } else {
          // ✅ EXERCICE NORMAL
          await db.runAsync(
            'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time) VALUES (?, ?, ?, ?, ?)',
            [routineId, item.id, i, item.sets, item.rest_time]
          );
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setModalConfig({
        title: '✅ Routine créée !',
        message: `"${routineName}" a été ajoutée à tes routines`,
        icon: 'checkmark-circle',
        iconColor: '#00ff88',
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => navigation.goBack()
          }
        ]
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Erreur création routine:', error);
      setModalConfig({
        title: 'Erreur',
        message: 'Impossible de créer la routine',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
    }
  };

  // Filtrer les exercices disponibles
  const filteredExercises = availableExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  return (
    <View className="flex-1 bg-primary-dark">
      <ScrollView>
        <View className="p-6">
          {/* Nom de la routine */}
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-2">NOM DE LA ROUTINE</Text>
            <TextInput
              className="bg-primary-navy text-white rounded-xl p-4"
              placeholder="Ex: Push Day, Upper Body..."
              placeholderTextColor="#6b7280"
              value={routineName}
              onChangeText={setRoutineName}
            />
          </View>

          {/* Type de routine */}
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">TYPE DE ROUTINE</Text>
            <View className="flex-row flex-wrap gap-2">
              {routineTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  className={`px-4 py-2 rounded-xl ${routineType === type.value ? 'bg-accent-cyan' : 'bg-primary-navy'
                    }`}
                  onPress={() => setRoutineType(type.value)}
                >
                  <Text className={`font-semibold ${routineType === type.value ? 'text-primary-dark' : 'text-gray-400'
                    }`}>
                    {type.icon} {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Exercices */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white text-lg font-bold">EXERCICES</Text>
              <Text className="text-gray-400">
                {selectedExercises.length} exercice{selectedExercises.length > 1 ? 's' : ''}
              </Text>
            </View>

            {/* Liste des exercices ajoutés */}
            {selectedExercises.map((item, index) => {
              // 🆕 DÉTECTION SUPERSET
              const isSuperset = item.type === 'superset';

              if (isSuperset) {
                // 🔥 AFFICHAGE SUPERSET AVEC NOM ADAPTATIF
                const supersetInfo = getSupersetInfo(item.exercises.length);

                return (
                  <View
                    key={item.id || index}
                    className={`rounded-xl p-4 mb-3 border-2 ${supersetInfo.bgColor}/10 ${supersetInfo.borderColor}`}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1">
                        <View className={`${supersetInfo.bgColor} rounded-full p-2 mr-3`}>
                          <Ionicons name={supersetInfo.icon} size={20} color="#0a0e27" />
                        </View>
                        <View className="flex-1">
                          <Text className={`${supersetInfo.textColor} font-bold text-lg`}>
                            {supersetInfo.emoji} {supersetInfo.name} {index + 1}
                          </Text>
                          <Text className="text-gray-400 text-sm">
                            {item.exercises.length} exercices • {item.rounds} tours
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => moveExercise(index, 'up')}
                          disabled={index === 0}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={20}
                            color={index === 0 ? '#374151' : supersetInfo.color}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveExercise(index, 'down')}
                          disabled={index === selectedExercises.length - 1}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={20}
                            color={index === selectedExercises.length - 1 ? '#374151' : supersetInfo.color}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeExercise(index)}>
                          <Ionicons name="trash" size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="bg-primary-dark rounded-xl p-3">
                      {item.exercises.map((ex, exIndex) => (
                        <View key={ex.id} className="flex-row items-center mb-2">
                          <View className={`${supersetInfo.bgColor} rounded-full w-6 h-6 items-center justify-center mr-2`}>
                            <Text className="text-primary-dark font-bold text-xs">
                              {exIndex + 1}
                            </Text>
                          </View>
                          <Text className="text-white text-sm flex-1">{ex.name}</Text>
                        </View>
                      ))}
                    </View>

                    <View className={`mt-3 pt-3 border-t ${supersetInfo.borderColor}/30`}>
                      <Text className="text-gray-400 text-xs text-center">
                        ⚡ Enchaînement direct • 💤 {Math.floor(item.rest_time / 60)}:{(item.rest_time % 60).toString().padStart(2, '0')} entre tours
                      </Text>
                    </View>
                  </View>
                );
              } else {
                // ✅ AFFICHAGE EXERCICE NORMAL
                return (
                  <View key={index} className="bg-primary-navy rounded-xl p-4 mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-white font-semibold flex-1">
                        {index + 1}. {item.name}
                      </Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => moveExercise(index, 'up')}
                          disabled={index === 0}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={20}
                            color={index === 0 ? '#374151' : '#fff'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveExercise(index, 'down')}
                          disabled={index === selectedExercises.length - 1}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={20}
                            color={index === selectedExercises.length - 1 ? '#374151' : '#fff'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeExercise(index)}>
                          <Ionicons name="trash" size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text className="text-gray-400 text-sm">
                      {item.sets} séries • {Math.floor(item.rest_time / 60)}:{(item.rest_time % 60).toString().padStart(2, '0')} repos
                    </Text>
                  </View>
                );
              }
            })}

            {/* Bouton ajouter exercice */}
            <TouchableOpacity
              className="bg-primary-navy border-2 border-dashed border-gray-600 rounded-xl p-4 items-center mb-3"
              onPress={openExercisePicker}
            >
              <Ionicons name="add-circle" size={24} color="#00f5ff" />
              <Text className="text-gray-400 mt-2">Ajouter un exercice</Text>
            </TouchableOpacity>

            {/* 🆕 BOUTON CRÉER SUPERSET */}
            <TouchableOpacity
              className="bg-accent-cyan/10 border-2 border-dashed border-accent-cyan rounded-xl p-4 items-center"
              onPress={openSupersetCreator}
            >
              <View className="flex-row items-center">
                <Ionicons name="flash" size={24} color="#00f5ff" />
                <Text className="text-accent-cyan font-bold ml-2">
                  🔥 CRÉER UN SUPERSET
                </Text>
              </View>
              <Text className="text-gray-400 text-xs mt-1">
                Enchaîne 2+ exercices sans repos
              </Text>
            </TouchableOpacity>
          </View>


          {/* Boutons */}
          <TouchableOpacity
            className="bg-success rounded-2xl p-5 mb-3"
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

      {/* Modal sélection exercice */}
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
                placeholder="Rechercher..."
                placeholderTextColor="#6b7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* ✅ CORRECTION - Filtres avec PETITE taille en style inline */}
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
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    backgroundColor: muscleFilter === muscle ? '#00f5ff' : 'rgba(255, 255, 255, 0.1)',
                    marginRight: index < muscleGroups.length - 1 ? 5 : 0
                  }}
                  onPress={() => setMuscleFilter(muscle)}
                >
                  <Text style={{
                    fontSize: 11,
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
              {filteredExercises.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  className="bg-primary-navy rounded-xl p-4 mb-2"
                  onPress={() => selectExercise(ex)}
                >
                  <Text className="text-white font-bold">{ex.name}</Text>
                  <Text className="text-gray-400 text-sm">
                    {ex.muscle_group} • {ex.equipment}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal configuration exercice */}
      <Modal
        visible={showExerciseConfig}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-primary-dark">
          {/* Header */}
          <View className="bg-primary-navy p-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Configuration</Text>
            <TouchableOpacity onPress={() => setShowExerciseConfig(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View className="p-6">
              {selectedExerciseToAdd && (
                <>
                  <Text className="text-white text-2xl font-bold mb-2">
                    {selectedExerciseToAdd.name}
                  </Text>
                  <Text className="text-gray-400 mb-6">
                    {selectedExerciseToAdd.muscle_group} • {selectedExerciseToAdd.equipment}
                  </Text>

                  {/* Séries */}
                  <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">NOMBRE DE SÉRIES</Text>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        className="bg-primary-navy rounded-xl p-4"
                        onPress={() => setNewExerciseSets(Math.max(0, newExerciseSets - 1))}
                      >
                        <Ionicons name="remove" size={24} color="#fff" />
                      </TouchableOpacity>

                      <TextInput
                        className="flex-1 bg-primary-navy text-white text-center rounded-xl p-4 text-2xl font-bold"
                        value={newExerciseSets.toString()}
                        onChangeText={(text) => {
                          const val = parseInt(text) || 0;
                          setNewExerciseSets(Math.max(0, Math.min(20, val)));
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />

                      <TouchableOpacity
                        className="bg-primary-navy rounded-xl p-4"
                        onPress={() => setNewExerciseSets(Math.min(20, newExerciseSets + 1))}
                      >
                        <Ionicons name="add" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {/* Message d'avertissement si 0 série */}
                    {newExerciseSets === 0 && (
                      <Text className="text-amber-400 text-sm text-center mt-2">
                        ⚠️ Tu dois définir au moins 1 série
                      </Text>
                    )}
                  </View>

                  {/* Temps de repos */}
                  <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">TEMPS DE REPOS</Text>
                    <View className="flex-row items-center gap-2">
                      {/* Minutes */}
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setNewExerciseRestMinutes(Math.max(0, newExerciseRestMinutes - 1))}
                          >
                            <Ionicons name="remove" size={18} color="#fff" />
                          </TouchableOpacity>

                          <TextInput
                            className="flex-1 bg-primary-navy text-white text-center rounded-lg p-3 text-xl font-bold"
                            value={newExerciseRestMinutes.toString()}
                            onChangeText={(text) => {
                              const val = parseInt(text) || 0;
                              setNewExerciseRestMinutes(Math.max(0, Math.min(10, val)));
                            }}
                            keyboardType="number-pad"
                            maxLength={2}
                          />

                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setNewExerciseRestMinutes(Math.min(10, newExerciseRestMinutes + 1))}
                          >
                            <Ionicons name="add" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-gray-400 text-xs text-center mt-2">minutes</Text>
                      </View>

                      <Text className="text-white text-2xl">:</Text>

                      {/* Secondes avec paliers de 5 */}
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setNewExerciseRestSeconds(Math.max(0, newExerciseRestSeconds - 5))}
                          >
                            <Ionicons name="remove" size={18} color="#fff" />
                          </TouchableOpacity>

                          <TextInput
                            className="flex-1 bg-primary-navy text-white text-center rounded-lg p-3 text-xl font-bold"
                            value={newExerciseRestSeconds.toString()}
                            onChangeText={(text) => {
                              const val = parseInt(text) || 0;
                              setNewExerciseRestSeconds(Math.max(0, Math.min(59, val)));
                            }}
                            keyboardType="number-pad"
                            maxLength={2}
                          />

                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setNewExerciseRestSeconds(Math.min(59, newExerciseRestSeconds + 5))}
                          >
                            <Ionicons name="add" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-gray-400 text-xs text-center mt-2">secondes</Text>
                      </View>
                    </View>
                  </View>

                  {/* Bouton valider */}
                  <TouchableOpacity
                    className={`rounded-2xl p-5 ${newExerciseSets > 0 ? 'bg-success' : 'bg-gray-700'}`}
                    onPress={confirmAddExercise}
                    disabled={newExerciseSets === 0}
                  >
                    <Text className={`text-center text-xl font-bold ${newExerciseSets > 0 ? 'text-primary-dark' : 'text-gray-500'}`}>
                      ✓ AJOUTER CET EXERCICE
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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