import { View, Text, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function RestTimerScreen({
  duration = 90,
  onComplete,
  isWarmup = false,
  nextSet,
  totalSets,
  exerciseName,
  navigation
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (isPaused || hasCompleted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 3 && prev > 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, hasCompleted]);

  // ✅ Effet séparé pour gérer la fin du timer
  useEffect(() => {
    if (timeLeft === 0 && !hasCompleted) {
      setHasCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        onComplete(duration);
      }, 100);
    }
  }, [timeLeft, hasCompleted, duration, onComplete]);

  const skipRest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHasCompleted(true);
    onComplete(duration - timeLeft);
  };

  const adjustTime = (seconds) => {
    setTimeLeft(Math.max(0, timeLeft + seconds));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <View className="flex-1 bg-primary-dark p-6">
      <View className="flex-1 justify-center items-center">
        {/* Type de repos */}
        <Text className="text-gray-400 text-lg mb-2">
          {isWarmup ? '🔥 ÉCHAUFFEMENT' : '💪 REPOS'}
        </Text>

        {/* Info exercice - AVEC VÉRIFICATION */}
        {!isWarmup && exerciseName && (
          <View className="mb-8">
            <Text className="text-white text-2xl font-bold text-center mb-2">
              {exerciseName}
            </Text>
            {nextSet && totalSets && (
              <Text className="text-gray-400 text-center">
                Prochaine série : {nextSet}/{totalSets}
              </Text>
            )}
          </View>
        )}

        {/* Timer circulaire */}
        <View className="relative w-64 h-64 items-center justify-center mb-8">
          {/* Cercle de progression */}
          <View
            className="absolute w-full h-full rounded-full border-8 border-primary-navy"
            style={{
              borderLeftColor: timeLeft <= 10 ? '#ff4444' : '#00f5ff',
              borderTopColor: timeLeft <= 10 ? '#ff4444' : '#00f5ff',
              transform: [{ rotate: `${(progress * 3.6)}deg` }]
            }}
          />

          {/* Timer */}
          <View className="items-center">
            <Text className={`text-6xl font-bold ${
              timeLeft <= 10 ? 'text-danger' : 'text-white'
            }`}>
              {formatTime(timeLeft)}
            </Text>
            <TouchableOpacity
              className="mt-4 px-4 py-2 bg-primary-navy rounded-xl"
              onPress={() => setIsPaused(!isPaused)}
            >
              <Ionicons
                name={isPaused ? "play" : "pause"}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>

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
          className="bg-accent-cyan rounded-2xl px-12 py-4"
          onPress={skipRest}
          disabled={hasCompleted}
        >
          <Text className="text-primary-dark text-lg font-bold">
            {isWarmup ? 'COMMENCER LA SÉANCE' : 'PASSER LE REPOS'}
          </Text>
        </TouchableOpacity>

        {/* Conseils */}
        {!isWarmup && (
          <View className="mt-6 bg-primary-navy rounded-xl p-4">
            <Text className="text-gray-400 text-center text-sm">
              💡 Profite pour boire de l'eau et préparer tes poids
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}