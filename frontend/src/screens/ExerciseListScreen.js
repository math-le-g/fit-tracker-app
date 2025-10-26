import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ExerciseListScreen({ route, navigation }) {
  const { exercises } = route.params;

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-2xl font-bold mb-2">
          📈 Mes exercices
        </Text>
        <Text className="text-gray-400 mb-6">
          Clique sur un exercice pour voir ta progression
        </Text>

        {exercises.map((exercise) => (
          <TouchableOpacity
            key={exercise.id}
            className="bg-primary-navy rounded-2xl p-4 mb-3"
            onPress={() => navigation.navigate('ExerciseDetail', {
              exerciseId: exercise.id,
              exerciseName: exercise.name
            })}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold">
                  {exercise.name}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {exercise.total_sets} séries réalisées
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#6b7280" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}