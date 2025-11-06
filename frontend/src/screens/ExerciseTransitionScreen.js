import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ExerciseTransitionScreen({
  completedExercise,
  completedSets,
  nextExercise,
  exerciseNumber,
  totalExercises,
  workoutStartTime,
  warmupDuration,
  onStartNext,
  navigation,
  exercisesList,
  onUpdateExercises,
  onQuitSession
}) {

  const handleStartNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartNext();
  };

  const handleReplaceExercise = () => {
    // ✅ CORRECTION: Utiliser push au lieu de navigate pour éviter de créer un nouveau workout
    navigation.push('SelectReplacementExercise', {
      currentExercise: nextExercise,
      onReplace: (newExercise) => {
        console.log('🔄 Remplacement de l\'exercice:', nextExercise.name, '→', newExercise.name);

        // Créer une nouvelle liste avec l'exercice remplacé
        const newList = [...exercisesList];
        newList[exerciseNumber] = {
          ...newExercise,
          sets: nextExercise.sets,
          rest_time: nextExercise.rest_time
        };

        // Mettre à jour la liste
        if (onUpdateExercises) {
          onUpdateExercises(newList);
          console.log('✅ Liste d\'exercices mise à jour');
        } else {
          console.warn('⚠️ onUpdateExercises n\'est pas défini');
        }
      }
    });
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - workoutStartTime);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <TouchableOpacity
          className="absolute top-2 right-2 z-10 bg-danger/20 rounded-full p-2"
          onPress={onQuitSession}
        >
          <Ionicons name="close" size={20} color="#ff4444" />
        </TouchableOpacity>
        {/* Exercice terminé */}
        <View className="items-center mb-6">
          <View className="bg-success/20 rounded-full p-6 mb-4">
            <Ionicons name="checkmark-circle" size={64} color="#00ff88" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">
            ✅ EXERCICE TERMINÉ !
          </Text>
          <Text className="text-gray-400 text-lg">
            {completedExercise.name}
          </Text>
        </View>

        {/* Récap exercice */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-4">
          <Text className="text-white text-lg font-bold mb-3">
            📊 Performance
          </Text>

          {completedSets.map((set, index) => (
            <View key={index} className="flex-row justify-between mb-2">
              <Text className="text-gray-400">Série {index + 1}</Text>
              <Text className="text-white font-semibold">
                {set.weight}kg × {set.reps} reps
              </Text>
            </View>
          ))}

          <View className="mt-3 pt-3 border-t border-primary-dark">
            <View className="flex-row justify-between">
              <Text className="text-gray-400">Volume total</Text>
              <Text className="text-success font-bold">
                {completedSets.reduce((sum, set) => sum + (set.weight * set.reps), 0)} kg
              </Text>
            </View>
          </View>
        </View>

        {/* Message transition */}
        <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-4 border border-accent-cyan/20">
          <View className="flex-row items-start">
            <Ionicons name="time-outline" size={20} color="#00f5ff" />
            <View className="flex-1 ml-3">
              <Text className="text-accent-cyan font-semibold mb-1">
                💡 Prends ton temps
              </Text>
              <Text className="text-gray-400 text-sm">
                Range tes poids, change de machine et prépare le prochain exercice
              </Text>
            </View>
          </View>
        </View>

        {/* Prochain exercice avec options */}
        {nextExercise && (
          <View className="bg-primary-navy rounded-2xl p-6 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons name="arrow-forward-circle" size={24} color="#00f5ff" />
                <Text className="text-white text-lg font-bold ml-2">
                  PROCHAIN EXERCICE
                </Text>
              </View>

              {/* Bouton pour remplacer l'exercice */}
              <TouchableOpacity
                className="bg-primary-dark rounded-full p-2"
                onPress={handleReplaceExercise}
              >
                <Ionicons name="swap-horizontal" size={20} color="#00f5ff" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-gray-400 text-sm mb-1">
                  Exercice {exerciseNumber + 1}/{totalExercises}
                </Text>
                <Text className="text-white text-xl font-bold">
                  {nextExercise.name}
                </Text>
                <Text className="text-gray-400 text-sm mt-1">
                  {nextExercise.sets} séries • {nextExercise.rest_time}s repos
                </Text>
              </View>
              <View className="bg-accent-cyan rounded-full w-12 h-12 items-center justify-center">
                <Text className="text-primary-dark font-bold text-xl">
                  {exerciseNumber + 1}
                </Text>
              </View>
            </View>

            {/* Info changement d'exercice */}
            <View className="bg-primary-dark rounded-xl p-3 mb-4">
              <Text className="text-gray-400 text-xs text-center">
                💡 Machine occupée ? Clique sur 🔄 pour changer d'exercice
              </Text>
            </View>

            {/* Bouton commencer */}
            <TouchableOpacity
              className="bg-accent-cyan rounded-xl p-4"
              onPress={handleStartNext}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="play" size={24} color="#0a0e27" />
                <Text className="text-primary-dark text-lg font-bold ml-2">
                  🚀 COMMENCER
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Timer séance */}
        <View className="items-center mt-4 mb-6">
          <Text className="text-gray-400 text-center">
            ⏱️ Temps total : {formatTime(elapsedTime)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}