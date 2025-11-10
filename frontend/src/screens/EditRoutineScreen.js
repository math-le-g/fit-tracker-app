import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';
import { getSupersetInfo } from '../utils/supersetHelpers';


export default function EditRoutineScreen({ route, navigation }) {
  const { routineId } = route.params;

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

  // Config pour exercice existant
  const [editingExerciseIndex, setEditingExerciseIndex] = useState(null);
  const [editingSets, setEditingSets] = useState(0);
  const [editingRestMinutes, setEditingRestMinutes] = useState(0);
  const [editingRestSeconds, setEditingRestSeconds] = useState(0);

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
      setRoutineType(routine.type || 'custom');

      const rawExercises = await db.getAllAsync(`
        SELECT 
          re.id as routine_exercise_id,
          e.id,
          e.name,
          e.muscle_group,
          e.equipment,
          re.sets,
          re.rest_time,
          re.superset_data
        FROM routine_exercises re
        LEFT JOIN exercises e ON re.exercise_id = e.id
        WHERE re.routine_id = ?
        ORDER BY re.order_index ASC
      `, [routineId]);

      // 🆕 PARSER LES SUPERSETS ET DROP SETS
      const parsedExercises = rawExercises.map((ex, index) => {
        if (ex.superset_data) {
          try {
            const data = JSON.parse(ex.superset_data);
            return {
              ...data,
              id: `${data.type}_${ex.routine_exercise_id}_${index}`
            };
          } catch (error) {
            console.error('❌ Erreur parsing:', error);
            return null;
          }
        } else {
          return ex;
        }
      }).filter(Boolean);

      console.log('📋 EXERCICES CHARGÉS (Edit):', parsedExercises);

      setSelectedExercises(parsedExercises);
    } catch (error) {
      console.error('Erreur chargement routine:', error);
    }
  };

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

  const editExercise = (index) => {
    const exercise = selectedExercises[index];
    setEditingExerciseIndex(index);
    setEditingSets(exercise.sets);
    const minutes = Math.floor(exercise.rest_time / 60);
    const seconds = exercise.rest_time % 60;
    setEditingRestMinutes(minutes);
    setEditingRestSeconds(seconds);
  };

  const confirmEditExercise = () => {
    if (editingExerciseIndex === null) return;

    const totalRestSeconds = (editingRestMinutes * 60) + editingRestSeconds;
    const newList = [...selectedExercises];
    newList[editingExerciseIndex] = {
      ...newList[editingExerciseIndex],
      sets: editingSets,
      rest_time: totalRestSeconds
    };

    setSelectedExercises(newList);
    setEditingExerciseIndex(null);
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

  // FONCTION POUR OUVRIR LE CRÉATEUR DE SUPERSET
  const openSupersetCreator = async () => {
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');

      navigation.navigate('CreateSuperset', {
        availableExercises: exercises,
        onCreateSuperset: (superset) => {
          setSelectedExercises([...selectedExercises, superset]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  // 🆕 FONCTION POUR OUVRIR LE CRÉATEUR DE DROP SET
  const openDropsetCreator = async () => {
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');

      navigation.navigate('CreateDropset', {
        availableExercises: exercises,
        onCreateDropset: (dropset) => {
          setSelectedExercises([...selectedExercises, dropset]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  // FONCTION POUR DISSOCIER UN SUPERSET
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
            const normalExercises = superset.exercises.map(ex => ({
              ...ex,
              sets: 3,
              rest_time: 90
            }));

            newList.splice(index, 1, ...normalExercises);
            setSelectedExercises(newList);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    });
    setModalVisible(true);
  };

  // 🆕 FONCTION POUR DISSOCIER UN DROP SET
  const dissociateDropset = (index) => {
    const dropset = selectedExercises[index];

    if (dropset.type !== 'dropset') return;

    setModalConfig({
      title: '🔓 Dissocier le drop set ?',
      message: `${dropset.exercise.name} sera remis en exercice normal (3 séries)`,
      icon: 'git-branch',
      iconColor: '#f59e0b',
      buttons: [
        { text: 'Annuler', onPress: () => { } },
        {
          text: 'Dissocier',
          style: 'primary',
          onPress: () => {
            const newList = [...selectedExercises];
            const normalExercise = {
              ...dropset.exercise,
              sets: 3,
              rest_time: 90
            };

            newList.splice(index, 1, normalExercise);
            setSelectedExercises(newList);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    });
    setModalVisible(true);
  };

  // FONCTION POUR MODIFIER UN SUPERSET
  const editSuperset = async (index) => {
    const superset = selectedExercises[index];

    if (superset.type !== 'superset') return;

    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');

      navigation.navigate('CreateSuperset', {
        availableExercises: exercises,
        existingSuperset: superset,
        onCreateSuperset: (updatedSuperset) => {
          const newList = [...selectedExercises];
          newList[index] = updatedSuperset;
          setSelectedExercises(newList);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  // 🆕 FONCTION POUR MODIFIER UN DROP SET
  const editDropset = async (index) => {
    const dropset = selectedExercises[index];

    if (dropset.type !== 'dropset') return;

    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');

      navigation.navigate('CreateDropset', {
        availableExercises: exercises,
        existingDropset: dropset,
        onCreateDropset: (updatedDropset) => {
          const newList = [...selectedExercises];
          newList[index] = updatedDropset;
          setSelectedExercises(newList);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
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
      await db.runAsync(
        'UPDATE routines SET name = ?, type = ? WHERE id = ?',
        [routineName.trim(), routineType, routineId]
      );

      await db.runAsync(
        'DELETE FROM routine_exercises WHERE routine_id = ?',
        [routineId]
      );

      // 🆕 Ajouter les exercices (normaux, supersets ET drop sets)
      for (let i = 0; i < selectedExercises.length; i++) {
        const item = selectedExercises[i];

        if (item.type === 'superset') {
          // SUPERSET
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
        } else if (item.type === 'dropset') {
          // 🆕 DROP SET
          const dropsetData = JSON.stringify({
            type: 'dropset',
            exercise: item.exercise,
            drops: item.drops,
            rounds: item.rounds,
            rest_time: item.rest_time
          });

          await db.runAsync(
            'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time, superset_data) VALUES (?, ?, ?, ?, ?, ?)',
            [routineId, -2, i, item.rounds, item.rest_time, dropsetData]
          );
        } else {
          // EXERCICE NORMAL
          await db.runAsync(
            'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time) VALUES (?, ?, ?, ?, ?)',
            [routineId, item.id, i, item.sets, item.rest_time]
          );
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setModalConfig({
        title: '✅ Routine modifiée !',
        message: `"${routineName}" a été mise à jour`,
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
      console.error('Erreur modification routine:', error);
      setModalConfig({
        title: 'Erreur',
        message: 'Impossible de modifier la routine',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
    }
  };

  const deleteRoutine = async () => {
    setModalConfig({
      title: '🗑️ Supprimer la routine ?',
      message: 'Cette action est irréversible',
      icon: 'trash',
      iconColor: '#ff4444',
      buttons: [
        { text: 'Annuler', onPress: () => { } },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [routineId]);
              await db.runAsync('DELETE FROM routines WHERE id = ?', [routineId]);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.goBack();
            } catch (error) {
              console.error('Erreur suppression routine:', error);
            }
          }
        }
      ]
    });
    setModalVisible(true);
  };

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
              const isSuperset = item.type === 'superset';
              const isDropset = item.type === 'dropset';

              if (isSuperset) {
                // 🔥 AFFICHAGE SUPERSET
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
                        <TouchableOpacity onPress={() => editSuperset(index)}>
                          <Ionicons name="create" size={20} color={supersetInfo.color} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => dissociateSuperset(index)}>
                          <Ionicons name="git-branch" size={20} color={supersetInfo.color} />
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
              } else if (isDropset) {
                // 🔻 AFFICHAGE DROP SET
                return (
                  <View
                    key={item.id || index}
                    className="rounded-xl p-4 mb-3 border-2 bg-amber-500/10 border-amber-500"
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1">
                        <View className="bg-amber-500 rounded-full p-2 mr-3">
                          <Ionicons name="trending-down" size={20} color="#0a0e27" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-amber-500 font-bold text-lg">
                            🔻 DROP SET {index + 1}
                          </Text>
                          <Text className="text-gray-400 text-sm">
                            {item.exercise.name} • {item.drops} drops • {item.rounds} tours
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
                            color={index === 0 ? '#374151' : '#f59e0b'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveExercise(index, 'down')}
                          disabled={index === selectedExercises.length - 1}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={20}
                            color={index === selectedExercises.length - 1 ? '#374151' : '#f59e0b'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => editDropset(index)}>
                          <Ionicons name="create" size={20} color="#f59e0b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => dissociateDropset(index)}>
                          <Ionicons name="git-branch" size={20} color="#f59e0b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeExercise(index)}>
                          <Ionicons name="trash" size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="bg-primary-dark rounded-xl p-3">
                      <Text className="text-white font-semibold mb-1">
                        {item.exercise.name}
                      </Text>
                      <Text className="text-gray-400 text-sm">
                        {item.exercise.muscle_group} • {item.exercise.equipment}
                      </Text>
                    </View>

                    <View className="mt-3 pt-3 border-t border-amber-500/30">
                      <Text className="text-gray-400 text-xs text-center">
                        ⚡ {item.drops} drops sans repos • 💤 {Math.floor(item.rest_time / 60)}:{(item.rest_time % 60).toString().padStart(2, '0')} entre tours
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
                        <TouchableOpacity onPress={() => editExercise(index)}>
                          <Ionicons name="create" size={20} color="#00f5ff" />
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

            {/* BOUTON CRÉER SUPERSET */}
            <TouchableOpacity
              className="bg-accent-cyan/10 border-2 border-dashed border-accent-cyan rounded-xl p-4 items-center mb-3"
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

            {/* 🆕 BOUTON CRÉER DROP SET */}
            <TouchableOpacity
              className="bg-amber-500/10 border-2 border-dashed border-amber-500 rounded-xl p-4 items-center"
              onPress={openDropsetCreator}
            >
              <View className="flex-row items-center">
                <Ionicons name="trending-down" size={24} color="#f59e0b" />
                <Text className="text-amber-500 font-bold ml-2">
                  🔻 CRÉER UN DROP SET
                </Text>
              </View>
              <Text className="text-gray-400 text-xs mt-1">
                Poids dégressifs sur 1 exercice
              </Text>
            </TouchableOpacity>
          </View>

          {/* Boutons */}
          <TouchableOpacity
            className="bg-success rounded-2xl p-5 mb-3"
            onPress={saveRoutine}
          >
            <Text className="text-primary-dark text-center text-xl font-bold">
              ✓ ENREGISTRER LES MODIFICATIONS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-danger/20 rounded-2xl p-4 mb-3"
            onPress={deleteRoutine}
          >
            <Text className="text-danger text-center font-semibold">
              🗑️ Supprimer la routine
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

      {/* TOUS LES MODALS (ne pas modifier) */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-primary-dark">
          <View className="bg-primary-navy p-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Ajouter un exercice</Text>
            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

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

      {/* Modal configuration nouvel exercice - INCHANGÉ */}
      <Modal
        visible={showExerciseConfig}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-primary-dark">
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

                    {newExerciseSets === 0 && (
                      <Text className="text-amber-400 text-sm text-center mt-2">
                        ⚠️ Tu dois définir au moins 1 série
                      </Text>
                    )}
                  </View>

                  <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">TEMPS DE REPOS</Text>
                    <View className="flex-row items-center gap-2">
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

      {/* Modal édition exercice existant - INCHANGÉ */}
      <Modal
        visible={editingExerciseIndex !== null}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-primary-dark">
          <View className="bg-primary-navy p-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Modifier l'exercice</Text>
            <TouchableOpacity onPress={() => setEditingExerciseIndex(null)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View className="p-6">
              {editingExerciseIndex !== null && (
                <>
                  <Text className="text-white text-2xl font-bold mb-2">
                    {selectedExercises[editingExerciseIndex]?.name}
                  </Text>
                  <Text className="text-gray-400 mb-6">
                    {selectedExercises[editingExerciseIndex]?.muscle_group} • {selectedExercises[editingExerciseIndex]?.equipment}
                  </Text>

                  <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">NOMBRE DE SÉRIES</Text>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        className="bg-primary-navy rounded-xl p-4"
                        onPress={() => setEditingSets(Math.max(1, editingSets - 1))}
                      >
                        <Ionicons name="remove" size={24} color="#fff" />
                      </TouchableOpacity>

                      <TextInput
                        className="flex-1 bg-primary-navy text-white text-center rounded-xl p-4 text-2xl font-bold"
                        value={editingSets.toString()}
                        onChangeText={(text) => {
                          const val = parseInt(text) || 1;
                          setEditingSets(Math.max(1, Math.min(20, val)));
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />

                      <TouchableOpacity
                        className="bg-primary-navy rounded-xl p-4"
                        onPress={() => setEditingSets(Math.min(20, editingSets + 1))}
                      >
                        <Ionicons name="add" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">TEMPS DE REPOS</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setEditingRestMinutes(Math.max(0, editingRestMinutes - 1))}
                          >
                            <Ionicons name="remove" size={18} color="#fff" />
                          </TouchableOpacity>

                          <TextInput
                            className="flex-1 bg-primary-navy text-white text-center rounded-lg p-3 text-xl font-bold"
                            value={editingRestMinutes.toString()}
                            onChangeText={(text) => {
                              const val = parseInt(text) || 0;
                              setEditingRestMinutes(Math.max(0, Math.min(10, val)));
                            }}
                            keyboardType="number-pad"
                            maxLength={2}
                          />

                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setEditingRestMinutes(Math.min(10, editingRestMinutes + 1))}
                          >
                            <Ionicons name="add" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-gray-400 text-xs text-center mt-2">minutes</Text>
                      </View>

                      <Text className="text-white text-2xl">:</Text>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setEditingRestSeconds(Math.max(0, editingRestSeconds - 5))}
                          >
                            <Ionicons name="remove" size={18} color="#fff" />
                          </TouchableOpacity>

                          <TextInput
                            className="flex-1 bg-primary-navy text-white text-center rounded-lg p-3 text-xl font-bold"
                            value={editingRestSeconds.toString()}
                            onChangeText={(text) => {
                              const val = parseInt(text) || 0;
                              setEditingRestSeconds(Math.max(0, Math.min(59, val)));
                            }}
                            keyboardType="number-pad"
                            maxLength={2}
                          />

                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setEditingRestSeconds(Math.min(59, editingRestSeconds + 5))}
                          >
                            <Ionicons name="add" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-gray-400 text-xs text-center mt-2">secondes</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    className="bg-success rounded-2xl p-5"
                    onPress={confirmEditExercise}
                  >
                    <Text className="text-primary-dark text-center text-xl font-bold">
                      ✓ VALIDER LES MODIFICATIONS
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