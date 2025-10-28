import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function HeatmapScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutDates, setWorkoutDates] = useState([]);
  const [runDates, setRunDates] = useState([]);
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  const loadMonthData = async () => {
    try {
      // Charger utilisateur
      const userData = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      setUser(userData);

      // Dates début et fin du mois
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Charger les séances du mois
      const workouts = await db.getAllAsync(
        'SELECT date FROM workouts WHERE date >= ? AND date <= ?',
        [startOfMonth.toISOString(), endOfMonth.toISOString()]
      );

      const workoutDateStrings = workouts.map(w => new Date(w.date).toDateString());
      setWorkoutDates(workoutDateStrings);

      // Charger les courses du mois
      const runs = await db.getAllAsync(
        'SELECT date FROM runs WHERE date >= ? AND date <= ?',
        [startOfMonth.toISOString(), endOfMonth.toISOString()]
      );

      const runDateStrings = runs.map(r => new Date(r.date).toDateString());
      setRunDates(runDateStrings);

      // Calculer stats
      const totalDays = workoutDateStrings.length + runDateStrings.length;
      const uniqueDays = new Set([...workoutDateStrings, ...runDateStrings]).size;
      const daysInMonth = endOfMonth.getDate();
      const activityRate = Math.round((uniqueDays / daysInMonth) * 100);
      const restDays = daysInMonth - uniqueDays;

      setStats({
        trainingDays: uniqueDays,
        activityRate,
        restDays
      });

    } catch (error) {
      console.error('Erreur chargement heatmap:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Dimanche

    const days = [];

    // Ajouter des cases vides pour aligner le premier jour
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Ajouter tous les jours du mois
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

  const getActivityEmoji = (activity) => {
    switch (activity) {
      case 'workout': return '💪';
      case 'run': return '🏃';
      case 'both': return '🔥';
      default: return '';
    }
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    setCurrentMonth(newMonth);
  };

  const getMonthName = () => {
    return currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentMonth.getMonth() === now.getMonth() &&
      currentMonth.getFullYear() === now.getFullYear();
  };

  const days = getDaysInMonth();
  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* Navigation mois */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            className="bg-primary-navy rounded-xl p-3"
            onPress={() => changeMonth(-1)}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text className="text-white text-xl font-bold capitalize">
            {getMonthName()}
          </Text>

          <TouchableOpacity
            className={`rounded-xl p-3 ${isCurrentMonth() ? 'bg-gray-700' : 'bg-primary-navy'
              }`}
            onPress={() => changeMonth(1)}
            disabled={isCurrentMonth()}
          >
            <Ionicons name="chevron-forward" size={24} color={isCurrentMonth() ? "#6b7280" : "#fff"} />
          </TouchableOpacity>
        </View>

        {/* Calendrier */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6">
          {/* Jours de la semaine */}
          <View className="flex-row mb-2">
            {weekDays.map((day, index) => (
              <View key={index} className="flex-1 items-center">
                <Text className="text-gray-400 text-sm font-semibold">
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Jours du mois */}
          <View className="flex-row flex-wrap">
            {days.map((day, index) => {
              const activity = getDayActivity(day);
              return (
                <View
                  key={index}
                  className="w-[14.28%] p-1"
                  style={{ height: 55 }}
                >
                  {day && (
                    <View className={`flex-1 items-center rounded-lg ${activity ? 'bg-primary-dark' : ''
                      }`} style={{ position: 'relative', paddingTop: 8 }}>
                      <Text className="text-white text-base font-semibold">
                        {day}
                      </Text>
                      {activity && (
                        <View style={{ position: 'absolute', bottom: 2 }}>
                          <Text className="text-xs">
                            {getActivityEmoji(activity)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Légende */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6">
          <Text className="text-white font-bold mb-3"><Text>📖</Text> Légende</Text>
          <View className="space-y-2">
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-2"><Text>💪</Text></Text>
              <Text className="text-gray-400">Musculation</Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Text className="text-2xl mr-2"><Text>🏃</Text></Text>
              <Text className="text-gray-400">Course</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2"><Text>🔥</Text></Text>
              <Text className="text-gray-400">Les deux</Text>
            </View>
          </View>
        </View>

        {/* Stats du mois */}
        {stats && (
          <View className="bg-primary-navy rounded-2xl p-6 mb-6">
            <Text className="text-white text-xl font-bold mb-4">
              <Text>📊</Text> STATS DU MOIS
            </Text>

            <View className="space-y-2">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">• Jours d'entraînement :</Text>
                <Text className="text-success font-bold">
                  {stats.trainingDays}
                </Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">• Taux d'activité :</Text>
                <Text className="text-accent-cyan font-bold">
                  {stats.activityRate}% <Text>🔥</Text>
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-400">• Jours de repos :</Text>
                <Text className="text-white font-bold">
                  {stats.restDays}
                </Text>
              </View>
            </View>

            {stats.activityRate >= 70 && (
              <View className="mt-4 pt-4 border-t border-primary-dark">
                <Text className="text-success text-center font-bold">
                  <Text>💪</Text> Excellente régularité ! <Text>🔥</Text>
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Streak */}
        {user && (
          <View className="bg-accent-cyan/10 rounded-2xl p-6 border border-accent-cyan/20">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-gray-400 text-sm mb-1">
                  <Text>🔥</Text> STREAK ACTUEL
                </Text>
                <Text className="text-white text-3xl font-bold">
                  {user.streak} jours
                </Text>
              </View>
              <View>
                <Text className="text-gray-400 text-sm mb-1 text-right">
                  <text>🏆</text> RECORD PERSONNEL
                </Text>
                <Text className="text-accent-cyan text-3xl font-bold text-right">
                  {user.best_streak} jours
                </Text>
              </View>
            </View>

            {user.streak === user.best_streak && user.streak > 0 && (
              <View className="mt-4 pt-4 border-t border-accent-cyan/20">
                <Text className="text-accent-cyan text-center font-bold">
                  <Text>🏆</Text> RECORD PERSONNEL EN COURS ! <text>🔥</text>
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}