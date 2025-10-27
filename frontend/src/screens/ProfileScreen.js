import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { getBadgeStats } from '../utils/badgeSystem';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [badgeStats, setBadgeStats] = useState({ total: 0, unlocked: 0, percentage: 0 });

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      // Charger utilisateur
      const userData = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      setUser(userData);

      // Stats globales
      const workoutCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM workouts');
      const runCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM runs');
      
      const sets = await db.getAllAsync('SELECT weight, reps FROM sets');
      const totalVolume = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);

      const runs = await db.getAllAsync('SELECT distance FROM runs');
      const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);

      setStats({
        workouts: workoutCount.count,
        runs: runCount.count,
        volume: totalVolume,
        distance: totalDistance
      });

      // Stats badges
      const badges = await getBadgeStats();
      setBadgeStats(badges);

    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const getNextLevelXP = () => {
    if (!user) return 0;
    return user.level * 100;
  };

  const getXPProgress = () => {
    if (!user) return 0;
    return (user.xp / getNextLevelXP()) * 100;
  };

  if (!user || !stats) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* En-tête profil */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-accent-cyan rounded-full items-center justify-center mb-4">
            <Ionicons name="person" size={48} color="#0a0e27" />
          </View>
          <Text className="text-white text-2xl font-bold mb-1">
            Mathieu
          </Text>
          <Text className="text-gray-400">
            Membre depuis {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Niveau et XP */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-400 text-sm">NIVEAU</Text>
              <Text className="text-white text-4xl font-bold">
                {user.level}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-sm">XP</Text>
              <Text className="text-accent-cyan text-2xl font-bold">
                {user.xp}/{getNextLevelXP()}
              </Text>
            </View>
          </View>

          <View className="bg-primary-dark rounded-full h-3 overflow-hidden mb-2">
            <View
              className="bg-accent-cyan h-full"
              style={{ width: `${getXPProgress()}%` }}
            />
          </View>

          <Text className="text-gray-400 text-xs text-center">
            {getNextLevelXP() - user.xp} XP pour le niveau {user.level + 1}
          </Text>
        </View>

        {/* Streak */}
        <View className="bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 rounded-2xl p-6 mb-6 border border-accent-cyan/30">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-400 text-sm mb-1">🔥 STREAK ACTUEL</Text>
              <Text className="text-white text-3xl font-bold">
                {user.streak} jours
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-sm mb-1">🏆 RECORD</Text>
              <Text className="text-accent-cyan text-3xl font-bold">
                {user.best_streak}
              </Text>
            </View>
          </View>

          {user.streak === user.best_streak && user.streak > 0 && (
            <View className="mt-4 pt-4 border-t border-accent-cyan/20">
              <Text className="text-accent-cyan text-center font-bold">
                🏆 RECORD PERSONNEL EN COURS ! 🔥
              </Text>
            </View>
          )}
        </View>

        {/* Stats globales */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <Text className="text-white text-xl font-bold mb-4">
            📊 STATISTIQUES
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="barbell" size={20} color="#00f5ff" />
                <Text className="text-gray-400 ml-2">Séances muscu</Text>
              </View>
              <Text className="text-white font-bold">{stats.workouts}</Text>
            </View>

            <View className="flex-row justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="walk" size={20} color="#b026ff" />
                <Text className="text-gray-400 ml-2">Courses</Text>
              </View>
              <Text className="text-white font-bold">{stats.runs}</Text>
            </View>

            <View className="flex-row justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="fitness" size={20} color="#00ff88" />
                <Text className="text-gray-400 ml-2">Volume total</Text>
              </View>
              <Text className="text-success font-bold">
                {stats.volume.toLocaleString()} kg
              </Text>
            </View>

            <View className="flex-row justify-between">
              <View className="flex-row items-center">
                <Ionicons name="navigate" size={20} color="#00ff88" />
                <Text className="text-gray-400 ml-2">Distance totale</Text>
              </View>
              <Text className="text-success font-bold">
                {stats.distance.toFixed(1)} km
              </Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-6 mb-6"
          onPress={() => navigation.navigate('Badges')}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Ionicons name="trophy" size={24} color="#00f5ff" />
              <Text className="text-white text-xl font-bold ml-2">
                🏆 BADGES
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6b7280" />
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-gray-400 text-sm mb-2">Progression</Text>
              <View className="bg-primary-dark rounded-full h-3 overflow-hidden">
                <View
                  className="bg-accent-cyan h-full"
                  style={{ width: `${badgeStats.percentage}%` }}
                />
              </View>
            </View>
            <Text className="text-white text-2xl font-bold ml-4">
              {badgeStats.unlocked}/{badgeStats.total}
            </Text>
          </View>

          <Text className="text-accent-cyan text-center mt-3 font-semibold">
            Voir ma collection →
          </Text>
        </TouchableOpacity>

        {/* Actions */}
        <View className="space-y-3">
          <TouchableOpacity
            className="bg-primary-navy rounded-2xl p-4"
            onPress={() => navigation.navigate('StatsOverview')}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="stats-chart" size={20} color="#6b7280" />
                <Text className="text-gray-400 font-semibold ml-2">
                  Statistiques détaillées
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-primary-navy rounded-2xl p-4"
            onPress={() => {/* TODO: Paramètres */}}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="settings" size={20} color="#6b7280" />
                <Text className="text-gray-400 font-semibold ml-2">
                  Paramètres
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-primary-navy rounded-2xl p-4"
            onPress={() => {/* TODO: À propos */}}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="information-circle" size={20} color="#6b7280" />
                <Text className="text-gray-400 font-semibold ml-2">
                  À propos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}