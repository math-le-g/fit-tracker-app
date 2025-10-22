import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WarmupTransitionScreen({ route, navigation }) {
  const { routineId, exercises, warmupDuration } = route.params;

  const getTotalSets = () => {
    return exercises.reduce((sum, ex) => sum + ex.sets, 0);
  };

  const getEstimatedDuration = () => {
    const workoutTime = exercises.reduce((sum, ex) => {
      return sum + (ex.sets * 45) + ((ex.sets - 1) * ex.rest_time);
    }, 0);
    return Math.round(workoutTime / 60);
  };

  const startExercises = () => {
    navigation.replace('WorkoutSession', {
      routineId,
      exercises,
      warmupDuration
    });
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="flex-1 items-center justify-center p-6">
        {/* Confirmation échauffement */}
        <View className="items-center mb-8">
          <View className="bg-success/20 rounded-full p-6 mb-4">
            <Ionicons name="checkmark-circle" size={80} color="#00ff88" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">
            ✅ ÉCHAUFFEMENT TERMINÉ
          </Text>
          <Text className="text-gray-400">
            ⏱️ {warmupDuration} minutes
          </Text>
        </View>

        {/* Récap séance */}
        <View className="bg-primary-navy rounded-2xl p-6 w-full mb-8">
          <Text className="text-white text-xl font-bold mb-4">
            🎯 TA SÉANCE
          </Text>

          {exercises.map((exercise, index) => (
            <View
              key={exercise.id}
              className={`flex-row items-center py-2 ${
                index < exercises.length - 1 ? 'border-b border-primary-dark' : ''
              }`}
            >
              <View className="bg-accent-cyan rounded-full w-6 h-6 items-center justify-center mr-3">
                <Text className="text-primary-dark font-bold text-xs">
                  {index + 1}
                </Text>
              </View>
              <Text className="text-white flex-1">
                {exercise.name}
              </Text>
              <Text className="text-gray-400 text-sm">
                {exercise.sets} séries
              </Text>
            </View>
          ))}

          <View className="mt-4 pt-4 border-t border-primary-dark">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400">Total séries :</Text>
              <Text className="text-white font-bold">{getTotalSets()}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-400">Durée estimée :</Text>
              <Text className="text-white font-bold">~{getEstimatedDuration()} min</Text>
            </View>
          </View>
        </View>

        {/* Bouton commencer */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-5 w-full"
          onPress={startExercises}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="barbell" size={28} color="#0a0e27" />
            <Text className="text-primary-dark text-xl font-bold ml-3">
              🚀 COMMENCER LES EXERCICES
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bouton modifier (optionnel) */}
        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-3 w-full mt-3"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-gray-400 text-center font-semibold">
            ✏️ Modifier la séance
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}