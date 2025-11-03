import { View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function RestTimerScreen({
  exercise,
  setNumber,
  totalSets,
  restTime,
  onComplete,
  workoutStartTime,
  warmupDuration
}) {
  const [timeLeft, setTimeLeft] = useState(restTime);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

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
    return (timeLeft / restTime) * 100;
  };

  const formatSessionTime = (ms) => {
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
    <View className="flex-1 bg-primary-dark">
      <View className="flex-1 items-center justify-center p-6">
        {/* En-tête */}
        <View className="items-center mb-8">
          <Text className="text-gray-400 text-lg mb-2">
            ⏸️ REPOS
          </Text>
          <Text className="text-white text-xl font-semibold">
            {exercise.name}
          </Text>
        </View>

        {/* Timer circulaire */}
        <View className="items-center mb-8">
          <View className="relative items-center justify-center mb-4">
            <Text className="text-accent-cyan text-7xl font-bold">
              {formatTime(timeLeft)}
            </Text>
          </View>

          {/* Barre de progression */}
          <View className="w-72 h-3 bg-primary-navy rounded-full overflow-hidden">
            <View
              className="h-full bg-accent-cyan rounded-full"
              style={{ width: `${100 - getProgress()}%` }}
            />
          </View>
        </View>

        {/* Info prochaine série */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-8 w-full">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-400">Prochaine :</Text>
            <Text className="text-white font-bold text-lg">
              Série {setNumber + 1}/{totalSets}
            </Text>
          </View>
          <Text className="text-gray-400 text-sm">
            {exercise.name}
          </Text>
        </View>

        {/* Message encouragement */}
        {timeLeft === 0 && (
          <View className="bg-success/20 rounded-2xl p-4 mb-6 border border-success">
            <Text className="text-success text-center font-bold text-lg">
              💪 C'est parti ! Tu es prêt !
            </Text>
          </View>
        )}

        {/* Boutons ajuster */}
        <View className="mb-6">
          <Text className="text-gray-400 text-center mb-3">
            AJUSTER LE TEMPS
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(-30)}
            >
              <Text className="text-white font-bold">-30s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(-10)}
            >
              <Text className="text-white font-bold">-10s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(-5)}
            >
              <Text className="text-white font-bold">-5s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(5)}
            >
              <Text className="text-white font-bold">+5s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(10)}
            >
              <Text className="text-white font-bold">+10s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(30)}
            >
              <Text className="text-white font-bold">+30s</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton passer */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl px-8 py-4"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onComplete();
          }}
        >
          <View className="flex-row items-center">
            <Ionicons name="play-skip-forward" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-lg font-bold ml-2">
              ⏭️ PASSER (Prêt)
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer - Timer séance */}
      <View className="bg-primary-navy p-4 border-t border-accent-cyan/20">
        <View className="flex-row items-center justify-center">
          <Ionicons name="time-outline" size={20} color="#6b7280" />
          <Text className="text-gray-400 ml-2">
            Séance : {formatSessionTime(elapsedTime)}
            {warmupDuration > 0 && ` (dont 🔥 ${warmupDuration}min)`}
          </Text>
        </View>
      </View>
    </View>
  );
}