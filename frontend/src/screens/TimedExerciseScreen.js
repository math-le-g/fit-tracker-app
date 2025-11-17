import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.7;
const CIRCLE_RADIUS = (CIRCLE_SIZE - 20) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function TimedExerciseScreen({
  exercise,
  mode,
  duration,
  workDuration,
  restDuration,
  rounds,
  onComplete
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === 'simple' ? duration : workDuration);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState('work');
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);
  const startTimeRef = useRef(null);

  const progress = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Animation de pulsation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (isRunning && !isPaused) {
      pulseAnimation.start();
    } else {
      pulseAnimation.stop();
      scale.setValue(1);
    }

    return () => pulseAnimation.stop();
  }, [isRunning, isPaused]);

  // Timer principal
  useEffect(() => {
    let interval;

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return prev;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, isPaused, phase, currentRound]);

  // Animation du cercle de progression
  useEffect(() => {
    const totalTime = mode === 'simple' ? duration : (phase === 'work' ? workDuration : restDuration);
    const progressValue = 1 - (timeLeft / totalTime);

    Animated.timing(progress, {
      toValue: progressValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [timeLeft]);

  const handlePhaseComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (mode === 'simple') {
      // Timer simple terminé - durée complète
      onComplete(duration);
    } else {
      // Mode intervalles
      if (phase === 'work') {
        // Passer au repos
        setPhase('rest');
        setTimeLeft(restDuration);
      } else {
        // Repos terminé
        if (currentRound >= rounds) {
          // Tous les tours terminés - durée complète
          onComplete((workDuration + restDuration) * rounds);
        } else {
          // Tour suivant
          setCurrentRound(currentRound + 1);
          setPhase('work');
          setTimeLeft(workDuration);
        }
      }
    }
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSkip = () => {
    handlePhaseComplete();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    if (mode === 'simple') return '#00f5ff';
    return phase === 'work' ? '#00f5ff' : '#f59e0b';
  };

  const getPhaseText = () => {
    if (mode === 'simple') return '⏱️ EN COURS';
    return phase === 'work' ? '💪 TRAVAIL' : '😮‍💨 REPOS';
  };

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_CIRCUMFERENCE, 0],
  });

  const getElapsedTime = () => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  };

  return (
    <View className="flex-1 bg-primary-dark">
      <View className="p-6 flex-1">
        {/* Header */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-gray-400 text-sm mb-2">
            {mode === 'interval' ? `SÉRIE ${currentRound}/${rounds}` : 'EXERCICE CHRONOMÉTRÉ'}
          </Text>
          <Text className="text-white text-2xl font-bold">
            {exercise.name}
          </Text>
        </View>

        {/* Grand cercle animé */}
        <View className="items-center justify-center flex-1">
          <Animated.View style={{ transform: [{ scale }] }}>
            <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                {/* Cercle de fond */}
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke="#1a1f3a"
                  strokeWidth="20"
                  fill="none"
                />

                {/* Cercle de progression */}
                <AnimatedCircle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke={getPhaseColor()}
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
              </Svg>

              {/* Timer au centre */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 72,
                    fontWeight: 'bold',
                    color: getPhaseColor(),
                  }}
                >
                  {formatTime(timeLeft)}
                </Text>
                <Text className="text-gray-400 text-lg mt-2">
                  {getPhaseText()}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Info phase suivante */}
          {mode === 'interval' && (
            <View className="mt-8 bg-primary-navy rounded-2xl p-4">
              <Text className="text-gray-400 text-center text-sm">
                {phase === 'work' ? 'Prochain repos' : 'Prochain travail'} :{' '}
                <Text className="text-white font-bold">
                  {phase === 'work' ? restDuration : workDuration}s
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* Boutons de contrôle */}
        <View className="mb-8">
          {!isRunning ? (
            <TouchableOpacity
              className="bg-accent-cyan rounded-2xl p-5 mb-3"
              onPress={handleStart}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="play" size={32} color="#0a0e27" />
                <Text className="text-primary-dark text-2xl font-bold ml-3">
                  COMMENCER
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 rounded-2xl p-5 ${isPaused ? 'bg-accent-cyan' : 'bg-amber-500'
                  }`}
                onPress={handlePause}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={28}
                    color="#0a0e27"
                  />
                  <Text className="text-primary-dark text-xl font-bold ml-2">
                    {isPaused ? 'REPRENDRE' : 'PAUSE'}
                  </Text>
                </View>
              </TouchableOpacity>

              {mode === 'interval' && (
                <TouchableOpacity
                  className="bg-primary-navy rounded-2xl p-5 px-6"
                  onPress={handleSkip}
                >
                  <Ionicons name="play-skip-forward" size={28} color="#00f5ff" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bouton terminer */}
          <TouchableOpacity
            className="bg-success/20 border-2 border-success rounded-2xl p-4 mt-3"
            onPress={() => {
              const elapsedTime = getElapsedTime();
              onComplete(elapsedTime > 0 ? elapsedTime : (mode === 'simple' ? duration : (workDuration + restDuration) * rounds));
            }}
          >
            <Text className="text-success text-center font-bold text-lg">
              ✓ TERMINER L'EXERCICE
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}