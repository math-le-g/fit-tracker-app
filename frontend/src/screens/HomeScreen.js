import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [period, setPeriod] = useState('week');
  const [weekStats, setWeekStats] = useState({ workouts: 0, volume: 0, runs: 0, distance: 0 });
  const [monthStats, setMonthStats] = useState({ workouts: 0, volume: 0, runs: 0, distance: 0 });
  const [weekActivities, setWeekActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadUserData(),
        loadWeekStats(),
        loadMonthStats(),
        loadWeekActivities()
      ]);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadUserData = async () => {
    try {
      const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      setUserData(user);
    } catch (error) {
      console.error('Erreur chargement user:', error);
    }
  };

  const loadWeekStats = async () => {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const workoutStats = await db.getFirstAsync(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_volume), 0) as volume
        FROM workouts
        WHERE date >= ?
      `, [startOfWeek.toISOString()]);

      const runStats = await db.getFirstAsync(`
        SELECT COUNT(*) as count, COALESCE(SUM(distance), 0) as distance
        FROM runs
        WHERE date >= ?
      `, [startOfWeek.toISOString()]);

      setWeekStats({
        workouts: workoutStats?.count || 0,
        volume: Math.round(workoutStats?.volume || 0),
        runs: runStats?.count || 0,
        distance: parseFloat((runStats?.distance || 0).toFixed(1))
      });
    } catch (error) {
      console.error('Erreur stats semaine:', error);
    }
  };

  const loadMonthStats = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const workoutStats = await db.getFirstAsync(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_volume), 0) as volume
        FROM workouts
        WHERE date >= ?
      `, [startOfMonth.toISOString()]);

      const runStats = await db.getFirstAsync(`
        SELECT COUNT(*) as count, COALESCE(SUM(distance), 0) as distance
        FROM runs
        WHERE date >= ?
      `, [startOfMonth.toISOString()]);

      setMonthStats({
        workouts: workoutStats?.count || 0,
        volume: Math.round(workoutStats?.volume || 0),
        runs: runStats?.count || 0,
        distance: parseFloat((runStats?.distance || 0).toFixed(1))
      });
    } catch (error) {
      console.error('Erreur stats mois:', error);
    }
  };

  const loadWeekActivities = async () => {
    try {
      const today = new Date();
      const activities = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dayName = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'][date.getDay()];
        
        // Chercher séance musculation (SANS routine_id)
        const workout = await db.getFirstAsync(`
          SELECT *
          FROM workouts
          WHERE date(date) = date(?)
          ORDER BY date DESC
          LIMIT 1
        `, [date.toISOString()]);

        // Chercher course
        const run = await db.getFirstAsync(`
          SELECT *
          FROM runs
          WHERE date(date) = date(?)
          ORDER BY date DESC
          LIMIT 1
        `, [date.toISOString()]);

        const isToday = date.toDateString() === today.toDateString();

        if (workout) {
          const workoutDate = new Date(workout.date);
          const hours = workoutDate.getHours().toString().padStart(2, '0');
          const minutes = workoutDate.getMinutes().toString().padStart(2, '0');
          const duration = Math.round(workout.workout_duration / 60);

          activities.push({
            day: dayName,
            time: `${hours}:${minutes}`,
            name: 'Séance musculation',
            duration: `${duration}min`,
            type: 'workout',
            today: isToday
          });
        } else if (run) {
          const runDate = new Date(run.date);
          const hours = runDate.getHours().toString().padStart(2, '0');
          const minutes = runDate.getMinutes().toString().padStart(2, '0');
          const duration = Math.round(run.duration / 60);

          activities.push({
            day: dayName,
            time: `${hours}:${minutes}`,
            name: `Course ${run.distance}km`,
            duration: `${duration}min`,
            type: 'workout',
            today: isToday
          });
        } else {
          activities.push({
            day: dayName,
            type: 'rest',
            today: isToday
          });
        }
      }

      setWeekActivities(activities);
    } catch (error) {
      console.error('Erreur activités semaine:', error);
    }
  };

  if (!userData) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white' }}>Chargement...</Text>
      </View>
    );
  }

  const stats = period === 'week' ? weekStats : monthStats;
  const nextLevelXp = userData.level * 1000;
  const xpPercent = Math.min(Math.round((userData.xp / nextLevelXp) * 100), 100);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a1628' }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
        }
      >
        <View style={{ padding: 24 }}>
          
          {/* Carte Niveau + XP + Streak */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#f5f5f0', fontSize: 20, fontWeight: 'bold', marginRight: 12 }}>
                  Niveau {userData.level}
                </Text>
                <Text style={{ color: '#a8a8a0', fontSize: 16 }}>
                  ⭐ {userData.xp.toLocaleString()} XP
                </Text>
              </View>
              <Text style={{ color: '#d4af37', fontSize: 18, fontWeight: 'bold' }}>
                {xpPercent}%
              </Text>
            </View>

            {/* Barre de progression */}
            <View style={{
              width: '100%',
              height: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              overflow: 'hidden',
              marginBottom: 16
            }}>
              <View style={{
                width: `${xpPercent}%`,
                height: '100%',
                backgroundColor: '#d4af37',
                borderRadius: 6
              }} />
            </View>

            <Text style={{ color: '#a8a8a0', fontSize: 14 }}>
              🔥 Streak: <Text style={{ color: '#d4af37', fontWeight: 'bold' }}>{userData.streak} jours</Text>
            </Text>
          </View>

          {/* Onglets Semaine/Mois */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: period === 'week' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: period === 'week' ? 'rgba(212, 175, 55, 0.5)' : 'rgba(255, 255, 255, 0.1)'
              }}
              onPress={() => setPeriod('week')}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: period === 'week' ? '#d4af37' : '#a8a8a0'
              }}>
                Semaine
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: period === 'month' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: period === 'month' ? 'rgba(212, 175, 55, 0.5)' : 'rgba(255, 255, 255, 0.1)'
              }}
              onPress={() => setPeriod('month')}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: period === 'month' ? '#d4af37' : '#a8a8a0'
              }}>
                Mois
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats Musculation */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <Text style={{ fontSize: 24, marginBottom: 12, color: '#f5f5f0' }}>💪 MUSCULATION</Text>
            <Text style={{ color: '#f5f5f0', fontSize: 18, marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>{stats.workouts}</Text> séances {period === 'week' ? 'cette semaine' : 'ce mois'}
            </Text>
            <Text style={{ color: '#a8a8a0', fontSize: 16 }}>
              {stats.volume.toLocaleString()} kg volume total
            </Text>
          </View>

          {/* Stats Course */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <Text style={{ fontSize: 24, marginBottom: 12, color: '#f5f5f0' }}>🏃 COURSE</Text>
            <Text style={{ color: '#f5f5f0', fontSize: 18, marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>{stats.runs}</Text> courses {period === 'week' ? 'cette semaine' : 'ce mois'}
            </Text>
            <Text style={{ color: '#a8a8a0', fontSize: 16 }}>
              {stats.distance} km parcourus
            </Text>
          </View>

          {/* Timeline Semaine */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
              ACTIVITÉ DE LA SEMAINE
            </Text>

            {weekActivities.map((activity, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: index < weekActivities.length - 1 ? 16 : 0 }}>
                {/* Point */}
                <View style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: activity.type === 'workout' ? '#d4af37' : 'transparent',
                  borderWidth: activity.type === 'rest' ? 2 : 0,
                  borderColor: '#6b7280',
                  marginRight: 16,
                  marginTop: 4
                }} />

                {/* Contenu */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#a8a8a0', fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
                    {activity.day} {activity.time || ''} {activity.today ? "(aujourd'hui)" : ''}
                  </Text>

                  {activity.type === 'workout' ? (
                    <>
                      <Text style={{ color: '#f5f5f0', fontSize: 16, fontWeight: '600' }}>
                        {activity.name}
                      </Text>
                      <Text style={{ color: '#a8a8a0', fontSize: 14 }}>
                        {activity.duration}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: '#6b7280', fontSize: 16 }}>
                      Repos
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}