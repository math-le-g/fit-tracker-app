import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import { getSupersetInfo } from '../utils/supersetHelpers'; // 🆕 IMPORT

export default function StatsOverviewScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const [workoutStats, setWorkoutStats] = useState(null);
  const [runStats, setRunStats] = useState(null);
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutDates, setWorkoutDates] = useState([]);
  const [runDates, setRunDates] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [supersetStats, setSupersetStats] = useState(null); // 🆕 ÉTAT SUPERSETS

  // ✅ Actualisation automatique
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [period, currentMonth])
  );

  const loadAllData = async () => {
    await Promise.all([
      loadStats(),
      loadCalendarData(),
      loadProgressData()
    ]);
  };

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

      setWorkoutStats({
        count: workouts.length,
        sets: totalSets,
        volume: totalVolume,
        workoutTime: totalWorkoutDuration
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

      // 🆕 STATS DES SUPERSETS
      const supersetSets = await db.getAllAsync(`
        SELECT s.*, e.name
        FROM sets s
        JOIN exercises e ON s.exercise_id = e.id
        JOIN workouts w ON s.workout_id = w.id
        WHERE w.date > ? AND s.superset_id IS NOT NULL
      `, [startDate.toISOString()]);

      // Grouper par superset_id
      const supersetGroups = {};
      supersetSets.forEach(set => {
        if (!supersetGroups[set.superset_id]) {
          supersetGroups[set.superset_id] = {
            exercises: new Set(),
            volume: 0,
            sets: 0
          };
        }
        supersetGroups[set.superset_id].exercises.add(set.name);
        supersetGroups[set.superset_id].volume += (set.weight * set.reps);
        supersetGroups[set.superset_id].sets++;
      });

      // Compter par type (superset/triset/giant set)
      let supersetCount = 0;
      let trisetCount = 0;
      let giantSetCount = 0;
      let totalSupersetVolume = 0;
      let maxVolume = 0;

      Object.values(supersetGroups).forEach(group => {
        const exerciseCount = group.exercises.size;
        totalSupersetVolume += group.volume;
        maxVolume = Math.max(maxVolume, group.volume);

        if (exerciseCount === 2) supersetCount++;
        else if (exerciseCount === 3) trisetCount++;
        else giantSetCount++;
      });

      setSupersetStats({
        total: Object.keys(supersetGroups).length,
        supersetCount,
        trisetCount,
        giantSetCount,
        volume: totalSupersetVolume,
        maxVolume
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadCalendarData = async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const workouts = await db.getAllAsync(
        'SELECT date FROM workouts WHERE date >= ? AND date <= ?',
        [startOfMonth.toISOString(), endOfMonth.toISOString()]
      );

      const runs = await db.getAllAsync(
        'SELECT date FROM runs WHERE date >= ? AND date <= ?',
        [startOfMonth.toISOString(), endOfMonth.toISOString()]
      );

      setWorkoutDates(workouts.map(w => new Date(w.date).toDateString()));
      setRunDates(runs.map(r => new Date(r.date).toDateString()));
    } catch (error) {
      console.error('Erreur chargement calendrier:', error);
    }
  };

  const loadProgressData = async () => {
    try {
      // Charger les 3 exercices les plus pratiqués avec progression
      const exercises = await db.getAllAsync(`
        SELECT 
          e.id,
          e.name,
          MAX(s.weight * s.reps) as max_volume,
          COUNT(DISTINCT w.id) as session_count
        FROM exercises e
        JOIN sets s ON e.id = s.exercise_id
        JOIN workouts w ON s.workout_id = w.id
        WHERE w.date >= datetime('now', '-30 days')
        GROUP BY e.id
        ORDER BY session_count DESC
        LIMIT 3
      `);

      setProgressData(exercises);
    } catch (error) {
      console.error('Erreur chargement progression:', error);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${mins}min`;
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

  // Calendrier
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const getDayActivity = (day) => {
    if (!day) return null;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateString = date.toDateString();
    const hasWorkout = workoutDates.includes(dateString);
    const hasRun = runDates.includes(dateString);
    if (hasWorkout && hasRun) return 'both';
    if (hasWorkout) return 'workout';
    if (hasRun) return 'run';
    return null;
  };

  const changeMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  if (!workoutStats || !runStats || !user || supersetStats === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1628', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white' }}>Chargement...</Text>
      </View>
    );
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <View style={{ flex: 1, backgroundColor: '#0a1628' }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Sous-titre */}
          <Text style={{ color: '#a8a8a0', fontSize: 16, marginBottom: 24 }}>
            Aperçu de tes performances
          </Text>

          {/* Filtres période */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            {['week', 'month', 'year'].map((p) => (
              <TouchableOpacity
                key={p}
                style={{
                  flex: 1,
                  backgroundColor: period === p ? 'rgba(0, 245, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: period === p ? 'rgba(0, 245, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'
                }}
                onPress={() => setPeriod(p)}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: period === p ? '#00f5ff' : '#a8a8a0'
                }}>
                  {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats rapides */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <Text style={{ color: '#a8a8a0', fontSize: 14, marginBottom: 12 }}>
              📅 {getPeriodLabel()}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Niveau</Text>
                <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold' }}>⭐ {user.level}</Text>
              </View>
              <View>
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Streak</Text>
                <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold' }}>🔥 {user.streak}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>XP</Text>
                <Text style={{ color: '#00f5ff', fontSize: 18, fontWeight: 'bold' }}>{user.xp}</Text>
              </View>
            </View>
          </View>

          {/* Calendrier d'activité */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={24} color="#00f5ff" />
              </TouchableOpacity>
              <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold' }}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={24} color="#00f5ff" />
              </TouchableOpacity>
            </View>

            {/* Jours de la semaine */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {dayNames.map((day, index) => (
                <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#6b7280', fontSize: 12, fontWeight: 'bold' }}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Grille calendrier */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {getDaysInMonth().map((day, index) => {
                const activity = getDayActivity(day);
                return (
                  <View
                    key={index}
                    style={{
                      width: `${100 / 7}%`,
                      aspectRatio: 1,
                      padding: 2,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {day && (
                      <View style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 8,
                        backgroundColor: 
                          activity === 'both' ? '#d4af37' :
                          activity === 'workout' ? '#00f5ff' :
                          activity === 'run' ? '#b026ff' :
                          'rgba(255, 255, 255, 0.05)',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{ 
                          color: activity ? '#0a0e27' : '#6b7280', 
                          fontSize: 12,
                          fontWeight: activity ? 'bold' : 'normal'
                        }}>
                          {day}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Légende */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#00f5ff', marginRight: 4 }} />
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Muscu</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#b026ff', marginRight: 4 }} />
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Course</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#d4af37', marginRight: 4 }} />
                <Text style={{ color: '#a8a8a0', fontSize: 12 }}>Les deux</Text>
              </View>
            </View>
          </View>

          {/* Progression récente */}
          <View style={{
            backgroundColor: 'rgba(0, 245, 255, 0.1)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(0, 245, 255, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="trending-up" size={24} color="#00f5ff" />
              <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold', marginLeft: 12 }}>
                📈 PROGRESSION (30 jours)
              </Text>
            </View>
            {progressData.length > 0 ? (
              progressData.map(ex => (
                <View key={ex.id} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#f5f5f0', fontWeight: '600' }}>{ex.name}</Text>
                    <Text style={{ color: '#00ff88', fontWeight: 'bold' }}>{ex.max_volume} kg</Text>
                  </View>
                  <Text style={{ color: '#a8a8a0', fontSize: 12 }}>
                    {ex.session_count} séances
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#a8a8a0' }}>Commence à t'entraîner pour voir ta progression !</Text>
            )}
          </View>

          {/* Stats détaillées */}
          <View style={{
            backgroundColor: 'rgba(0, 245, 255, 0.1)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(0, 245, 255, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="barbell" size={24} color="#00f5ff" />
              <Text style={{ color: '#f5f5f0', fontSize: 20, fontWeight: 'bold', marginLeft: 12 }}>
                💪 MUSCULATION
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Séances :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{workoutStats.count}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Séries totales :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{workoutStats.sets}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Volume total :</Text>
              <Text style={{ color: '#00ff88', fontWeight: 'bold' }}>{workoutStats.volume.toLocaleString()} kg</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a8a8a0' }}>• Temps total :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{formatTime(workoutStats.workoutTime)}</Text>
            </View>
          </View>

          {/* 🆕 STATS SUPERSETS */}
          {supersetStats && supersetStats.total > 0 && (
            <View style={{
              backgroundColor: 'rgba(0, 245, 255, 0.1)',
              borderRadius: 24,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(0, 245, 255, 0.3)'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="flash" size={24} color="#00f5ff" />
                <Text style={{ color: '#f5f5f0', fontSize: 20, fontWeight: 'bold', marginLeft: 12 }}>
                  🔥 SUPERSETS
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#a8a8a0' }}>• Total complétés :</Text>
                <Text style={{ color: '#00f5ff', fontWeight: 'bold' }}>{supersetStats.total}</Text>
              </View>

              {/* Détail par type */}
              <View style={{ marginLeft: 16, marginBottom: 8 }}>
                {supersetStats.supersetCount > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#a8a8a0', fontSize: 14 }}>🔥 Supersets (2 ex) :</Text>
                    <Text style={{ color: '#00f5ff', fontWeight: 'bold', fontSize: 14 }}>{supersetStats.supersetCount}</Text>
                  </View>
                )}
                {supersetStats.trisetCount > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#a8a8a0', fontSize: 14 }}>⚡ Trisets (3 ex) :</Text>
                    <Text style={{ color: '#b026ff', fontWeight: 'bold', fontSize: 14 }}>{supersetStats.trisetCount}</Text>
                  </View>
                )}
                {supersetStats.giantSetCount > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#a8a8a0', fontSize: 14 }}>🌪️ Giant Sets (4-5 ex) :</Text>
                    <Text style={{ color: '#ff6b35', fontWeight: 'bold', fontSize: 14 }}>{supersetStats.giantSetCount}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#a8a8a0' }}>• Volume total :</Text>
                <Text style={{ color: '#00ff88', fontWeight: 'bold' }}>{supersetStats.volume.toLocaleString()} kg</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#a8a8a0' }}>• Meilleur volume :</Text>
                <Text style={{ color: '#d4af37', fontWeight: 'bold' }}>{supersetStats.maxVolume.toLocaleString()} kg</Text>
              </View>
            </View>
          )}

          <View style={{
            backgroundColor: 'rgba(176, 38, 255, 0.1)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(176, 38, 255, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="walk" size={24} color="#b026ff" />
              <Text style={{ color: '#f5f5f0', fontSize: 20, fontWeight: 'bold', marginLeft: 12 }}>
                🏃 COURSE
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Sorties :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{runStats.count}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Distance totale :</Text>
              <Text style={{ color: '#00ff88', fontWeight: 'bold' }}>{runStats.distance.toFixed(1)} km</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#a8a8a0' }}>• Allure moyenne :</Text>
              <Text style={{ color: '#b026ff', fontWeight: 'bold' }}>
                {runStats.count > 0 ? formatPace(runStats.avgPace) : '--:--'} /km
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a8a8a0' }}>• Temps total :</Text>
              <Text style={{ color: '#f5f5f0', fontWeight: 'bold' }}>{formatTime(runStats.duration)}</Text>
            </View>
          </View>

          {/* Bouton voir exercices */}
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(0, 245, 255, 0.15)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(0, 245, 255, 0.3)'
            }}
            onPress={async () => {
              try {
                const exercises = await db.getAllAsync(`
                  SELECT DISTINCT e.id, e.name, COUNT(s.id) as total_sets
                  FROM exercises e
                  JOIN sets s ON e.id = s.exercise_id
                  GROUP BY e.id
                  ORDER BY total_sets DESC
                  LIMIT 10
                `);
                if (exercises.length > 0) {
                  navigation.navigate('ExerciseList', { exercises });
                }
              } catch (error) {
                console.error('Erreur:', error);
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="fitness" size={24} color="#00f5ff" />
              <Text style={{ color: '#00f5ff', fontSize: 16, fontWeight: 'bold', marginLeft: 12 }}>
                📈 VOIR MES EXERCICES
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}