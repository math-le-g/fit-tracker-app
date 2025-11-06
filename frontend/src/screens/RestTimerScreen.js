import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export default function RestTimerScreen({
  duration = 90,
  onComplete,
  isWarmup = false,
  nextSet,
  totalSets,
  exerciseName,
  onQuitSession,
  navigation
}) {

  console.log('🔍 RestTimer - onQuitSession:', onQuitSession ? 'REÇU ✅' : 'UNDEFINED ❌');


  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // ✨ Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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

  // ✨ Animation de pulse (respiration)
  useEffect(() => {
    if (isPaused || hasCompleted) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [isPaused, hasCompleted]);

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

  const progress = (timeLeft / duration) * 100;
  const size = 280;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const color = timeLeft <= 10 ? '#ff4444' : '#00f5ff';
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
  <View className="flex-1 bg-primary-dark">
    {/* 🆕 BOUTON EN DEHORS */}
    <View className="absolute top-4 right-4 z-50" style={{ elevation: 999 }}>
      <TouchableOpacity
        className="bg-danger/20 rounded-full p-3"
        onPress={() => {
          console.log('🔴 BOUTON CLIQUÉ !');
          if (onQuitSession) {
            onQuitSession();
          }
        }}
      >
        <Ionicons name="close" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>

    {/* CONTENU AVEC PADDING */}
    <View className="flex-1 p-6">
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-400 text-lg mb-2">
          {isWarmup ? '🔥 ÉCHAUFFEMENT' : '💪 REPOS'}
        </Text>

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

        {/* ✨ Timer avec effet PULSE + GLOW */}
        <Animated.View
          className="relative items-center justify-center mb-8"
          style={{
            width: size,
            height: size,
            transform: [{ scale: pulseAnim }]
          }}
        >
          {/* Cercle de fond avec glow */}
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="50%">
                <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={color} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius + 30}
              fill="url(#glow)"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#1a1f3a"
              strokeWidth={strokeWidth}
              fill="none"
            />
          </Svg>

          {/* Cercle de progression avec glow animé */}
          <Animated.View style={{ opacity: glowOpacity, position: 'absolute' }}>
            <Svg
              width={size}
              height={size}
              style={{ transform: [{ rotate: '-90deg' }] }}
            >
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth + 4}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                opacity={0.3}
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>

          {/* Timer au centre */}
          <View className="items-center">
            <Text
              className={`text-6xl font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-white'}`}
              style={{ textShadowColor: color, textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 } }}
            >
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
        </Animated.View>

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

        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl px-12 py-4"
          onPress={skipRest}
          disabled={hasCompleted}
        >
          <Text className="text-primary-dark text-lg font-bold">
            {isWarmup ? 'COMMENCER LA SÉANCE' : 'PASSER LE REPOS'}
          </Text>
        </TouchableOpacity>

        {!isWarmup && (
          <View className="mt-6 bg-primary-navy rounded-xl p-4">
            <Text className="text-gray-400 text-center text-sm">
              💡 Profite pour boire de l'eau et préparer tes poids
            </Text>
          </View>
        )}
      </View>
    </View>
  </View>
);
}