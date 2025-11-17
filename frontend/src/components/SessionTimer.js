import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';

export default function SessionTimer() {
  const { isSessionActive, formattedTime } = useSession();

  if (!isSessionActive) return null;

  return (
    <View className="absolute top-4 left-4 z-50 bg-accent-cyan/90 rounded-full px-4 py-2 flex-row items-center">
      <Ionicons name="timer" size={16} color="#0a0e27" />
      <Text className="text-primary-dark font-bold ml-2">
        {formattedTime}
      </Text>
    </View>
  );
}