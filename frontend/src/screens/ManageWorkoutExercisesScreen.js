import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function ManageWorkoutExercisesScreen({ route, navigation }) {
  const { exercises, currentIndex, onReorder } = route.params;
  const [exerciseList, setExerciseList] = useState([...exercises]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [showAddExercise, setShowAddExercise] = useState(false);

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
      Alert.alert('Info', 'Tu ne peux pas déplacer un exercice déjà fait !');
      return;
    }

    const newList = [...exerciseList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex <= currentIndex) {
      Alert.alert('Info', 'Tu ne peux pas déplacer avant l\'exercice en cours !');
      return;
    }

    if (targetIndex >= 0 && targetIndex < newList.length) {
      [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
      setExerciseList(newList);
    }
  };

  const skipExercise = (index) => {
    if (index <= currentIndex) {
      Alert.alert('Info', 'Cet exercice est déjà fait !');
      return;
    }

    Alert.alert(
      '⏭️ Passer cet exercice ?',
      'Il sera déplacé à la fin',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Passer',
          onPress: () => {
            const newList = [...exerciseList];
            const exercise = newList.splice(index, 1)[0];
            newList.push(exercise);
            setExerciseList(newList);
          }
        }
      ]
    );
  };

  const replaceExercise = (index) => {
    if (index <= currentIndex) {
      Alert.alert('Info', 'Cet exercice est déjà fait !');
      return;
    }

    Alert.alert(
      '🔄 Remplacer cet exercice ?',
      `Remplacer "${exerciseList[index].name}" par un autre`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Remplacer',
          onPress: () => {
            // Stocker l'index à remplacer
            navigation.navigate('SelectReplacementExercise', {
              currentExercises: exerciseList,
              replaceIndex: index,
              onReplace: (newExercise) => {
                const newList = [...exerciseList];
                newList[index] = {
                  ...newExercise,
                  sets: newList[index].sets,
                  rest_time: newExercise.default_rest_time || 90
                };
                setExerciseList(newList);
              }
            });
          }
        }
      ]
    );
  };

  const removeExercise = (index) => {
    if (index <= currentIndex) {
      Alert.alert('Info', 'Cet exercice est déjà fait !');
      return;
    }

    Alert.alert(
      '🗑️ Retirer cet exercice ?',
      'Il sera complètement supprimé de cette séance',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => {
            const newList = exerciseList.filter((_, i) => i !== index);
            setExerciseList(newList);
          }
        }
      ]
    );
  };

  const addExercise = (exercise) => {
    const newExercise = {
      ...exercise,
      sets: 3,
      rest_time: exercise.default_rest_time || 90
    };
    setExerciseList([...exerciseList, newExercise]);
    setShowAddExercise(false);
  };

  const saveChanges = () => {
    if (exerciseList.length === 0) {
      Alert.alert('Erreur', 'Tu dois avoir au moins un exercice !');
      return;
    }

    onReorder(exerciseList);
    navigation.goBack();
  };

  if (showAddExercise) {
    return (
      <ScrollView className="flex-1 bg-primary-dark">
        <View className="p-6">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setShowAddExercise(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text className="text-white ml-2 text-lg">Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-accent-cyan rounded-full px-4 py-2"
              onPress={() => navigation.navigate('CreateCustomExercise', {
                onExerciseCreated: (newExercise) => {
                  addExercise(newExercise);
                }
              })}
            >
              <Text className="text-primary-dark font-bold">+ CRÉER</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-white text-2xl font-bold mb-6">
            Ajouter un exercice
          </Text>

          {availableExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              className="bg-primary-navy rounded-xl p-4 mb-3"
              onPress={() => addExercise(exercise)}
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
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-3xl font-bold mb-2">
          ⚙️ Gérer les exercices
        </Text>
        <Text className="text-gray-400 mb-6">
          Réorganise, passe, remplace ou retire
        </Text>

        {/* Bouton ajouter */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-xl p-4 mb-6 flex-row items-center justify-center"
          onPress={() => setShowAddExercise(true)}
        >
          <Ionicons name="add-circle" size={24} color="#0a0e27" />
          <Text className="text-primary-dark font-bold ml-2">
            AJOUTER UN EXERCICE
          </Text>
        </TouchableOpacity>

        {/* Liste exercices */}
        {exerciseList.map((exercise, index) => (
          <View
            key={`${exercise.id}-${index}`}
            className={`rounded-xl p-4 mb-3 ${
              index < currentIndex ? 'bg-success/10 border border-success' :
              index === currentIndex ? 'bg-accent-cyan/10 border border-accent-cyan' :
              'bg-primary-navy'
            }`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-1">
                  {index < currentIndex && (
                    <Ionicons name="checkmark-circle" size={20} color="#00ff88" />
                  )}
                  {index === currentIndex && (
                    <Ionicons name="play-circle" size={20} color="#00f5ff" />
                  )}
                  <Text className={`font-bold ml-2 ${
                    index < currentIndex ? 'text-success' :
                    index === currentIndex ? 'text-accent-cyan' :
                    'text-white'
                  }`}>
                    {index + 1}. {exercise.name}
                  </Text>
                </View>
                <Text className="text-gray-400 text-sm">
                  {exercise.sets} séries • {exercise.rest_time}s repos
                </Text>
              </View>

              {/* Actions (seulement pour exercices futurs) */}
              {index > currentIndex && (
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-2"
                    onPress={() => moveExercise(index, 'up')}
                    disabled={index <= currentIndex + 1}
                  >
                    <Ionicons 
                      name="chevron-up" 
                      size={20} 
                      color={index <= currentIndex + 1 ? '#374151' : '#6b7280'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-2"
                    onPress={() => moveExercise(index, 'down')}
                    disabled={index === exerciseList.length - 1}
                  >
                    <Ionicons 
                      name="chevron-down" 
                      size={20} 
                      color={index === exerciseList.length - 1 ? '#374151' : '#6b7280'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-2"
                    onPress={() => skipExercise(index)}
                  >
                    <Ionicons name="play-forward" size={20} color="#00f5ff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-2"
                    onPress={() => replaceExercise(index)}
                  >
                    <Ionicons name="repeat" size={20} color="#b026ff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-primary-dark rounded-lg p-2"
                    onPress={() => removeExercise(index)}
                  >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {index < currentIndex && (
              <Text className="text-success text-xs mt-2">✓ Exercice terminé</Text>
            )}
            {index === currentIndex && (
              <Text className="text-accent-cyan text-xs mt-2">▶ En cours...</Text>
            )}
          </View>
        ))}

        {/* Boutons */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-5 mb-3 mt-4"
          onPress={saveChanges}
        >
          <Text className="text-primary-dark text-center text-xl font-bold">
            ✓ APPLIQUER LES CHANGEMENTS
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