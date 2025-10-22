import { View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function WarmupScreen({ route, navigation }) {
  const { routineId, warmupDuration, exercises } = route.params;
  const [timeLeft, setTimeLeft] = useState(warmupDuration * 60); // Convertir en secondes
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer terminé
          clearInterval(interval);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          finishWarmup();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  const finishWarmup = () => {
    navigation.replace('WarmupTransition', {
      routineId,
      exercises,
      warmupDuration
    });
  };

  const adjustTime = (seconds) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalSeconds = warmupDuration * 60;
    return (timeLeft / totalSeconds) * 100;
  };

  return (
    <View className="flex-1 bg-primary-dark">
      <View className="flex-1 items-center justify-center p-6">
        {/* Timer */}
        <View className="items-center mb-8">
          <Text className="text-danger text-6xl font-bold mb-2">
            {formatTime(timeLeft)}
          </Text>
          
          {/* Barre de progression */}
          <View className="w-64 h-2 bg-primary-navy rounded-full overflow-hidden mt-4">
            <View 
              className="h-full bg-danger rounded-full"
              style={{ width: `${getProgress()}%` }}
            />
          </View>
        </View>

        {/* Instructions */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-8">
          <View className="flex-row items-center mb-3">
            <Ionicons name="flame" size={24} color="#ff6b35" />
            <Text className="text-white text-xl font-bold ml-2">
              Échauffement en cours
            </Text>
          </View>

          <Text className="text-gray-400 mb-2">
            • Cardio léger (vélo, rameur...)
          </Text>
          <Text className="text-gray-400 mb-2">
            • Mobilité articulaire
          </Text>
          <Text className="text-gray-400">
            • Étirements dynamiques
          </Text>
        </View>

        {/* Boutons ajuster */}
        <View className="mb-8">
          <Text className="text-gray-400 text-center mb-3">
            AJUSTER LE TEMPS
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(-60)}
            >
              <Text className="text-white font-bold">-1 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(60)}
            >
              <Text className="text-white font-bold">+1 min</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton terminer */}
        <TouchableOpacity
          className="bg-success rounded-2xl px-8 py-4"
          onPress={finishWarmup}
        >
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-lg font-bold ml-2">
              ✓ ÉCHAUFFEMENT TERMINÉ
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Timer séance global */}
      <View className="bg-primary-navy p-4 border-t border-accent-cyan/20">
        <View className="flex-row items-center justify-center">
          <Ionicons name="time-outline" size={20} color="#6b7280" />
          <Text className="text-gray-400 ml-2">
            Temps total séance : {formatTime((warmupDuration * 60) - timeLeft)}
          </Text>
        </View>
      </View>
    </View>
  );
}