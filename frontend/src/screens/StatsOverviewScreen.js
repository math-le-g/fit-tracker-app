import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function StatsOverviewScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const [workoutStats, setWorkoutStats] = useState(null);
  const [runStats, setRunStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    try {
      const userData = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      setUser(userData);

      const now = new Date();
      let startDate = new Date();
      
      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      const workouts = await db.getAllAsync(
        'SELECT * FROM workouts WHERE date > ?',
        [startDate.toISOString()]
      );

      const sets = await db.getAllAsync(
        'SELECT s.* FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE w.date > ?',
        [startDate.toISOString()]
      );

      const totalVolume = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);
      const totalSets = sets.length;
      const totalWorkoutDuration = workouts.reduce((sum, w) => sum + w.workout_duration, 0);
      const totalWarmupDuration = workouts.reduce((sum, w) => sum + (w.warmup_duration * 60), 0);

      setWorkoutStats({
        count: workouts.length,
        sets: totalSets,
        volume: totalVolume,
        workoutTime: totalWorkoutDuration,
        warmupTime: totalWarmupDuration,
        totalTime: totalWorkoutDuration + totalWarmupDuration
      });

      const runs = await db.getAllAsync(
        'SELECT * FROM runs WHERE date > ?',
        [startDate.toISOString()]
      );

      const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
      const totalRunDuration = runs.reduce((sum, r) => sum + r.duration, 0);
      const avgPace = runs.length > 0 ? runs.reduce((sum, r) => sum + r.pace, 0) / runs.length : 0;

      setRunStats({
        count: runs.length,
        distance: totalDistance,
        duration: totalRunDuration,
        avgPace
      });

    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatPace = (paceInSeconds) => {
    const mins = Math.floor(paceInSeconds / 60);
    const secs = Math.round(paceInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'CETTE SEMAINE';
      case 'month': return 'CE MOIS';
      case 'year': return 'CETTE ANNÉE';
      default: return 'CE MOIS';
    }
  };

  const getStatusColor = () => {
    if (!workoutStats || !runStats) return 'text-gray-400';
    const totalActivities = workoutStats.count + runStats.count;
    const expectedPerWeek = period === 'week' ? 3 : period === 'month' ? 12 : 150;
    if (totalActivities >= expectedPerWeek) return 'text-success';
    if (totalActivities >= expectedPerWeek * 0.7) return 'text-accent-cyan';
    return 'text-danger';
  };

  const getStatusLabel = () => {
    if (!workoutStats || !runStats) return 'Chargement...';
    const totalActivities = workoutStats.count + runStats.count;
    const expectedPerWeek = period === 'week' ? 3 : period === 'month' ? 12 : 150;
    if (totalActivities >= expectedPerWeek) return '🟢 EXCELLENT FORME';
    if (totalActivities >= expectedPerWeek * 0.7) return '🟡 BONNE FORME';
    return '🔴 PEU ACTIF';
  };

  if (!workoutStats || !runStats || !user) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-3xl font-bold mb-2">
          📊 Statistiques
        </Text>

        <View className="flex-row gap-2 mb-6">
          {['week', 'month', 'year'].map((p) => (
            <TouchableOpacity
              key={p}
              className={`flex-1 rounded-xl p-3 ${period === p ? 'bg-accent-cyan' : 'bg-primary-navy'}`}
              onPress={() => setPeriod(p)}
            >
              <Text className={`text-center font-bold ${period === p ? 'text-primary-dark' : 'text-gray-400'}`}>
                {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <Text className="text-gray-400 text-sm mb-2">📅 {getPeriodLabel()}</Text>
          <Text className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>{getStatusLabel()}</Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-400 text-sm">Niveau</Text>
              <Text className="text-white text-xl font-bold">⭐ {user.level}</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-sm">Streak</Text>
              <Text className="text-white text-xl font-bold">🔥 {user.streak} jours</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-sm">XP</Text>
              <Text className="text-accent-cyan text-xl font-bold">{user.xp}/{user.level * 100}</Text>
            </View>
          </View>
        </View>

        <View className="bg-primary-navy rounded-2xl p-6 mb-4">
          <View className="flex-row items-center mb-4">
            <Ionicons name="barbell" size={24} color="#00f5ff" />
            <Text className="text-white text-xl font-bold ml-2">💪 MUSCULATION</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400">• Séances :</Text>
            <Text className="text-white font-bold">{workoutStats.count}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400">• Séries totales :</Text>
            <Text className="text-white font-bold">{workoutStats.sets}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400">• Volume total :</Text>
            <Text className="text-success font-bold">{workoutStats.volume.toLocaleString()} kg</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400">• Temps exercices :</Text>
            <Text className="text-white font-bold">{formatTime(workoutStats.workoutTime)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-400">• Temps échauffement :</Text>
            <Text className="text-gray-400 font-bold">{formatTime(workoutStats.warmupTime)}</Text>
          </View>
        </View>

        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="walk" size={24} color="#b026ff" />
            <Text className="text-white text-xl font-bold ml-2">🏃 COURSE</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400">• Sorties :</Text>
            <Text className="text-white font-bold">{runStats.count}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400">• Distance totale :</Text>
            <Text className="text-success font-bold">{runStats.distance.toFixed(1)} km</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-400">• Allure moyenne :</Text>
            <Text className="text-accent-purple font-bold">
              {runStats.count > 0 ? formatPace(runStats.avgPace) : '--:--'} /km
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-400">• Temps total :</Text>
            <Text className="text-white font-bold">{formatTime(runStats.duration)}</Text>
          </View>
        </View>

        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-4 mb-3"
          onPress={() => navigation.navigate('Heatmap')}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="calendar" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-lg font-bold ml-2">🗓️ VOIR LE CALENDRIER</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity className="bg-primary-navy rounded-2xl p-4">
          <View className="flex-row items-center justify-center">
            <Ionicons name="analytics" size={20} color="#6b7280" />
            <Text className="text-gray-400 font-semibold ml-2">Analyse détaillée (à venir)</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}