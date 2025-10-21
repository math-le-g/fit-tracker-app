import { View, Text } from 'react-native';

export default function TrainingScreen() {
  return (
    <View className="flex-1 bg-primary-dark items-center justify-center">
      <Text className="text-white text-2xl font-bold">💪 Entraînement</Text>
      <Text className="text-gray-400 mt-2">À venir...</Text>
    </View>
  );
}