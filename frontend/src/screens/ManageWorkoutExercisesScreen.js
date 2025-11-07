import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import * as Haptics from 'expo-haptics';
import { getSupersetInfo, isSuperset as isSupersetHelper } from '../utils/supersetHelpers';

export default function ManageWorkoutExercisesScreen({ route, navigation }) {
  const { exercises, currentIndex, onReorder } = route.params;
  const [exerciseList, setExerciseList] = useState([...exercises]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');

  // Config pour nouvel exercice
  const [showExerciseConfig, setShowExerciseConfig] = useState(false);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState(null);
  const [newExerciseSets, setNewExerciseSets] = useState(3);
  const [newExerciseRestMinutes, setNewExerciseRestMinutes] = useState(1);
  const [newExerciseRestSeconds, setNewExerciseRestSeconds] = useState(30);

  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  useEffect(() => {
    if (showAddExercise) {
      loadAvailableExercises();
    }
  }, [showAddExercise]);

  const loadAvailableExercises = async () => {
    try {
      const allExercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY is_custom DESC, muscle_group, name');
      setAvailableExercises(allExercises);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const moveExercise = (index, direction) => {
    if (index <= currentIndex) {
      setModalConfig({
        title: 'Info',
        message: 'Tu ne peux pas déplacer un exercice déjà fait !',
        icon: 'information-circle',
        iconColor: '#00f5ff',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    const newList = [...exerciseList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex <= currentIndex) {
      setModalConfig({
        title: 'Info',
        message: 'Tu ne peux pas déplacer avant l\'exercice en cours !',
        icon: 'information-circle',
        iconColor: '#00f5ff',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    if (targetIndex >= 0 && targetIndex < newList.length) {
      [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
      setExerciseList(newList);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const skipExercise = (index) => {
    if (index <= currentIndex) {
      setModalConfig({
        title: 'Info',
        message: 'Cet exercice est déjà fait !',
        icon: 'information-circle',
        iconColor: '#00f5ff',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    setModalConfig({
      title: '⏭️ Passer cet exercice ?',
      message: 'Il sera déplacé à la fin',
      icon: 'play-forward',
      iconColor: '#d4af37',
      buttons: [
        { text: 'Annuler', onPress: () => { } },
        {
          text: 'Passer',
          style: 'primary',
          onPress: () => {
            const newList = [...exerciseList];
            const exercise = newList.splice(index, 1)[0];
            newList.push(exercise);
            setExerciseList(newList);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      ]
    });
    setModalVisible(true);
  };

  const replaceExercise = (index) => {
    if (index <= currentIndex) {
      setModalConfig({
        title: 'Info',
        message: 'Cet exercice est déjà fait !',
        icon: 'information-circle',
        iconColor: '#00f5ff',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    const currentExercise = exerciseList[index];

    // 🆕 VÉRIFIER SI C'EST UN SUPERSET
    if (isSupersetHelper(currentExercise)) {
      setModalConfig({
        title: '⚠️ Remplacer un superset ?',
        message: 'Tu ne peux pas remplacer un superset complet. Tu peux le retirer et ajouter un exercice normal à la place.',
        icon: 'alert-circle',
        iconColor: '#ff6b35',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    navigation.navigate('SelectReplacementExercise', {
      currentExercise: exerciseList[index],
      onReplace: (newExercise) => {
        const newList = [...exerciseList];
        newList[index] = {
          ...newExercise,
          sets: newList[index].sets,
          rest_time: newList[index].rest_time
        };
        setExerciseList(newList);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  };

  const removeExercise = (index) => {
    if (index <= currentIndex) {
      setModalConfig({
        title: 'Info',
        message: 'Cet exercice est déjà fait !',
        icon: 'information-circle',
        iconColor: '#00f5ff',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    setModalConfig({
      title: '🗑️ Retirer cet exercice ?',
      message: 'Il sera complètement supprimé de cette séance',
      icon: 'trash',
      iconColor: '#ff4444',
      buttons: [
        { text: 'Annuler', onPress: () => { } },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => {
            const newList = exerciseList.filter((_, i) => i !== index);
            setExerciseList(newList);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      ]
    });
    setModalVisible(true);
  };

  const selectExerciseToAdd = (exercise) => {
    setSelectedExerciseToAdd(exercise);
    setNewExerciseSets(3);
    setNewExerciseRestMinutes(1);
    setNewExerciseRestSeconds(30);
    setShowAddExercise(false);
    setShowExerciseConfig(true);
  };

  const confirmAddExercise = () => {
    if (!selectedExerciseToAdd) return;

    const totalRestSeconds = (newExerciseRestMinutes * 60) + newExerciseRestSeconds;
    const newExercise = {
      ...selectedExerciseToAdd,
      sets: newExerciseSets,
      rest_time: totalRestSeconds
    };

    setExerciseList([...exerciseList, newExercise]);
    setShowExerciseConfig(false);
    setSelectedExerciseToAdd(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveChanges = () => {
    if (exerciseList.length === 0) {
      setModalConfig({
        title: 'Attention',
        message: 'Tu ne peux pas continuer sans exercices !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => { } }]
      });
      setModalVisible(true);
      return;
    }

    onReorder(exerciseList);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
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
          <Text className="text-gray-400 text-sm mb-4">
            Organise tes exercices pour cette séance
          </Text>

          {/* Liste exercices */}
          {exerciseList.map((ex, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            const canModify = index > currentIndex;

            // 🆕 DÉTECTION SUPERSET
            const isSuperset = isSupersetHelper(ex);
            const supersetInfo = isSuperset ? getSupersetInfo(ex.exercises.length) : null;

            return (
              <View
                key={`${ex.id}-${index}`}
                className={`rounded-2xl p-4 mb-3 ${isDone
                    ? 'bg-success/10 border border-success/30'
                    : isCurrent
                      ? isSuperset
                        ? `${supersetInfo.bgColor}/10 border ${supersetInfo.borderColor}`
                        : 'bg-accent-cyan/10 border border-accent-cyan'
                      : isSuperset
                        ? `${supersetInfo.bgColor}/5 border ${supersetInfo.borderColor}/30`
                        : 'bg-primary-navy'
                  }`}
              >
                {/* En-tête */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      {isDone && (
                        <Ionicons name="checkmark-circle" size={20} color="#00ff88" style={{ marginRight: 8 }} />
                      )}
                      {isCurrent && !isSuperset && (
                        <Ionicons name="play-circle" size={20} color="#00f5ff" style={{ marginRight: 8 }} />
                      )}
                      {isCurrent && isSuperset && (
                        <Ionicons name={supersetInfo.icon} size={20} color={supersetInfo.color} style={{ marginRight: 8 }} />
                      )}

                      {/* 🆕 AFFICHAGE SELON LE TYPE */}
                      {isSuperset ? (
                        <Text className={`font-bold ${isDone ? 'text-success' : isCurrent ? supersetInfo.textColor : 'text-white'
                          }`}>
                          {index + 1}. {supersetInfo.emoji} {supersetInfo.name}
                        </Text>
                      ) : (
                        <Text className={`font-bold ${isDone ? 'text-success' : isCurrent ? 'text-accent-cyan' : 'text-white'
                          }`}>
                          {index + 1}. {ex.name}
                        </Text>
                      )}
                    </View>

                    {/* 🆕 INFO SELON LE TYPE */}
                    {isSuperset ? (
                      <>
                        <Text className="text-gray-400 text-sm">
                          {ex.exercises.length} exercices • {ex.rounds} tours • {Math.floor(ex.rest_time / 60)}:{(ex.rest_time % 60).toString().padStart(2, '0')} repos
                        </Text>
                        {/* Liste des exercices du superset */}
                        <View className="mt-2 ml-4">
                          {ex.exercises.map((exercise, exIndex) => (
                            <Text key={exercise.id} className="text-gray-400 text-xs">
                              • {exercise.name}
                            </Text>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text className="text-gray-400 text-sm">
                        {ex.sets} séries • {Math.floor(ex.rest_time / 60)}:{(ex.rest_time % 60).toString().padStart(2, '0')} repos
                      </Text>
                    )}
                  </View>

                  {canModify && (
                    <View className="flex-row gap-2">
                      {/* Déplacer */}
                      <TouchableOpacity
                        className="bg-primary-dark rounded-lg p-2"
                        onPress={() => moveExercise(index, 'up')}
                      >
                        <Ionicons name="chevron-up" size={18} color="#fff" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="bg-primary-dark rounded-lg p-2"
                        onPress={() => moveExercise(index, 'down')}
                      >
                        <Ionicons name="chevron-down" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {canModify && (
                  <View className="flex-row gap-2 mt-2">
                    {/* 🆕 DÉSACTIVER "REMPLACER" POUR LES SUPERSETS */}
                    {isSuperset ? (
                      <View className="flex-1 bg-gray-700/30 rounded-lg py-2">
                        <Text className="text-gray-600 text-center text-sm font-semibold">
                          🔒 Remplacer
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        className="flex-1 bg-accent-cyan/20 rounded-lg py-2"
                        onPress={() => replaceExercise(index)}
                      >
                        <Text className="text-accent-cyan text-center text-sm font-semibold">
                          🔄 Remplacer
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      className="flex-1 bg-primary-dark rounded-lg py-2"
                      onPress={() => skipExercise(index)}
                    >
                      <Text className="text-gray-400 text-center text-sm font-semibold">
                        ⏭️ Passer
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 bg-danger/20 rounded-lg py-2"
                      onPress={() => removeExercise(index)}
                    >
                      <Text className="text-danger text-center text-sm font-semibold">
                        🗑️ Retirer
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 🆕 MESSAGE INFO POUR SUPERSETS */}
                {isSuperset && canModify && (
                  <View className={`mt-2 p-2 rounded-lg ${supersetInfo.bgColor}/10`}>
                    <Text className="text-gray-400 text-xs text-center">
                      💡 Le {supersetInfo.name.toLowerCase()} reste intact, tu peux le déplacer ou le retirer
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Bouton ajouter exercice */}
          <TouchableOpacity
            className="bg-primary-navy rounded-2xl p-4 mb-6 border border-dashed border-accent-cyan"
            onPress={() => setShowAddExercise(true)}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="add-circle" size={24} color="#00f5ff" />
              <Text className="text-accent-cyan font-bold ml-2">
                + AJOUTER UN EXERCICE
              </Text>
            </View>
          </TouchableOpacity>

          {/* Boutons */}
          <TouchableOpacity
            className="bg-success rounded-2xl p-4 mb-3"
            onPress={saveChanges}
          >
            <Text className="text-primary-dark text-center text-lg font-bold">
              ✓ VALIDER LES MODIFICATIONS
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

      {/* Modal sélection exercice */}
      <Modal
        visible={showAddExercise}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-primary-dark">
          <View className="bg-primary-navy p-4 flex-row items-center justify-between">
            <Text className="text-white text-xl font-bold">Ajouter un exercice</Text>
            <TouchableOpacity onPress={() => setShowAddExercise(false)}>
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
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtres */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-3 bg-primary-navy">
            {muscleGroups.map(muscle => (
              <TouchableOpacity
                key={muscle}
                className={`mr-2 px-4 py-2 rounded-xl ${muscleFilter === muscle ? 'bg-accent-cyan' : 'bg-primary-dark'
                  }`}
                onPress={() => setMuscleFilter(muscle)}
              >
                <Text className={`font-semibold ${muscleFilter === muscle ? 'text-primary-dark' : 'text-gray-400'
                  }`}>
                  {muscle === 'all' ? 'Tous' : muscle}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Liste exercices */}
          <ScrollView className="flex-1">
            <View className="p-4">
              {filteredExercises.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  className="bg-primary-navy rounded-xl p-4 mb-2"
                  onPress={() => selectExerciseToAdd(ex)}
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
                    <Text className="text-white text-lg font-bold mb-3">SÉRIES</Text>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        className="bg-primary-navy rounded-xl p-4"
                        onPress={() => setNewExerciseSets(Math.max(1, newExerciseSets - 1))}
                      >
                        <Ionicons name="remove" size={24} color="#fff" />
                      </TouchableOpacity>

                      <TextInput
                        className="flex-1 bg-primary-navy text-white text-center rounded-xl p-4 text-2xl font-bold"
                        value={newExerciseSets.toString()}
                        onChangeText={(text) => {
                          const val = parseInt(text) || 1;
                          setNewExerciseSets(Math.max(1, Math.min(20, val)));
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

                      {/* Secondes */}
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity
                            className="bg-primary-navy rounded-lg p-3"
                            onPress={() => setNewExerciseRestSeconds(Math.max(0, newExerciseRestSeconds - 15))}
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
                            onPress={() => setNewExerciseRestSeconds(Math.min(59, newExerciseRestSeconds + 15))}
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
                    className="bg-success rounded-2xl p-5"
                    onPress={confirmAddExercise}
                  >
                    <Text className="text-primary-dark text-center text-xl font-bold">
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