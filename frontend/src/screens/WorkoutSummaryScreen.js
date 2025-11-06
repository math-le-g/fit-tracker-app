import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { checkAndUnlockBadges } from '../utils/badgeSystem';

export default function WorkoutSummaryScreen({ route, navigation }) {
  // ✅ AJOUT du flag isPartial
  const { workoutId, warmupDuration, workoutDuration, totalSets, totalVolume, xpGained, isPartial = false } = route.params;
  const [workoutDetails, setWorkoutDetails] = useState([]);
  const [records, setRecords] = useState([]);
  const [newBadges, setNewBadges] = useState([]);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadWorkoutDetails();
    checkForRecords();
    checkBadges();
  }, []);

  const loadWorkoutDetails = async () => {
    try {
      const details = await db.getAllAsync(`
        SELECT 
          e.name,
          s.set_number,
          s.weight,
          s.reps
        FROM sets s
        JOIN exercises e ON s.exercise_id = e.id
        WHERE s.workout_id = ?
        ORDER BY s.id ASC
      `, [workoutId]);

      setWorkoutDetails(details);
    } catch (error) {
      console.error('Erreur chargement détails:', error);
    }
  };

  const checkForRecords = async () => {
    // TODO: Vérifier les records
    // Pour l'instant, on simule
    setRecords([
      // { exercise: 'Développé Couché', oldValue: '82kg', newValue: '85kg', improvement: '+3kg' }
    ]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  const getTotalTime = () => {
    return (warmupDuration * 60) + workoutDuration;
  };

  const groupByExercise = () => {
    const grouped = {};
    workoutDetails.forEach(detail => {
      if (!grouped[detail.name]) {
        grouped[detail.name] = [];
      }
      grouped[detail.name].push(detail);
    });
    return grouped;
  };

  const checkBadges = async () => {
    const unlockedBadges = await checkAndUnlockBadges();
    if (unlockedBadges.length > 0) {
      setNewBadges(unlockedBadges);
      console.log('🏆 Nouveaux badges débloqués:', unlockedBadges);
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* Célébration */}
        <View className="items-center mb-8">
          <View className={`rounded-full p-6 mb-4 ${isPartial ? 'bg-accent-cyan/20' : 'bg-success/20'}`}>
            <Ionicons 
              name={isPartial ? "pause-circle" : "trophy"} 
              size={80} 
              color={isPartial ? "#00f5ff" : "#00ff88"} 
            />
          </View>
          {/* ✅ MODIFICATION DU TITRE selon isPartial */}
          <Text className="text-white text-3xl font-bold mb-2">
            {isPartial ? '⏸️ SÉANCE PARTIELLE' : '🎉 SÉANCE TERMINÉE !'}
          </Text>
          <Text className="text-gray-400 text-lg">
            {isPartial ? 'Sauvegardée avec succès 💾' : 'Excellent travail ! 💪'}
          </Text>
        </View>

        {/* ✅ NOUVEAU BADGE SI SÉANCE PARTIELLE */}
        {isPartial && (
          <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-6 border border-accent-cyan">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#00f5ff" />
              <View className="flex-1 ml-3">
                <Text className="text-accent-cyan font-bold mb-1">
                  💡 SÉANCE INTERROMPUE
                </Text>
                <Text className="text-gray-400 text-sm">
                  Les séries effectuées ont été comptabilisées. Tu peux reprendre une séance complète quand tu veux !
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats principales */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-primary-dark">
            <View className="items-center flex-1">
              <Ionicons name="time" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">TEMPS TOTAL</Text>
              <Text className="text-white text-xl font-bold">
                {formatTime(getTotalTime())}
              </Text>
            </View>

            <View className="items-center flex-1">
              <Ionicons name="layers" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">SÉRIES</Text>
              <Text className="text-white text-xl font-bold">
                {totalSets}
              </Text>
            </View>

            <View className="items-center flex-1">
              <Ionicons name="barbell" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">VOLUME</Text>
              <Text className="text-white text-xl font-bold">
                {totalVolume.toLocaleString()} kg
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-4">
            <View className="flex-1">
              <Text className="text-gray-400 text-sm">Détail temps</Text>
              <Text className="text-white">
                🔥 Échauffement : {warmupDuration} min
              </Text>
              <Text className="text-white">
                💪 Exercices : {formatTime(workoutDuration)}
              </Text>
            </View>

            <View className="items-center">
              <View className="bg-accent-cyan rounded-full px-4 py-2">
                <Text className="text-primary-dark font-bold text-lg">
                  +{xpGained} XP
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Records */}
        {records.length > 0 && (
          <View className="bg-success/10 rounded-2xl p-6 mb-6 border border-success">
            <View className="flex-row items-center mb-4">
              <Ionicons name="trophy" size={24} color="#00ff88" />
              <Text className="text-success text-xl font-bold ml-2">
                🏆 NOUVEAUX RECORDS !
              </Text>
            </View>

            {records.map((record, index) => (
              <View key={index} className="mb-3">
                <Text className="text-white font-semibold">
                  • {record.exercise}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {record.oldValue} → {record.newValue} ({record.improvement}) 🔥
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Nouveaux badges */}
        {newBadges.length > 0 && (
          <View className="bg-accent-cyan/10 rounded-2xl p-6 mb-6 border border-accent-cyan">
            <View className="flex-row items-center mb-4">
              <Ionicons name="trophy" size={24} color="#00f5ff" />
              <Text className="text-accent-cyan text-xl font-bold ml-2">
                🏆 NOUVEAUX BADGES !
              </Text>
            </View>

            {newBadges.map((badge, index) => (
              <View key={index} className="flex-row items-center mb-3 bg-primary-navy rounded-xl p-3">
                <View className="w-12 h-12 bg-accent-cyan rounded-full items-center justify-center mr-3">
                  <Text className="text-3xl">{badge.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold">{badge.name}</Text>
                  <Text className="text-gray-400 text-sm">{badge.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Détails exercices */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <Text className="text-white text-xl font-bold mb-4">
            📋 Détails de la séance
          </Text>

          {Object.entries(groupByExercise()).map(([exerciseName, sets], index) => (
            <View
              key={index}
              className={`py-3 ${
                index < Object.keys(groupByExercise()).length - 1 ? 'border-b border-primary-dark' : ''
              }`}
            >
              <Text className="text-white font-semibold mb-2">
                {exerciseName}
              </Text>
              {sets.map((set, setIndex) => (
                <Text key={setIndex} className="text-gray-400 text-sm">
                  Série {set.set_number}: {set.weight}kg × {set.reps} reps
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Bouton terminer */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-5 mb-3"
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'TrainingHome' }],
            });
          }}
        >
          <Text className="text-primary-dark text-center text-xl font-bold">
            ✓ TERMINER
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}