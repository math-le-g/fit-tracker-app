import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [lastWorkout, setLastWorkout] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Charger les données utilisateur
      const userData = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
      setUser(userData);

      // Charger la dernière séance
      const workout = await db.getFirstAsync(
        'SELECT * FROM workouts ORDER BY date DESC LIMIT 1'
      );
      setLastWorkout(workout);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  if (!user) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* Message de bienvenue */}
        <Text className="text-3xl font-bold text-white mb-2">
          Bonjour ! <Text>👋</Text>
        </Text>

        {/* Streak + Niveau + XP */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6 border border-accent-cyan/20">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <Ionicons name="flame" size={24} color="#ff6b35" />
              <Text className="text-white text-lg ml-2 font-bold">
                Streak : {user.streak} jours
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={20} color="#00f5ff" />
              <Text className="text-accent-cyan text-lg ml-1 font-bold">
                Niveau {user.level}
              </Text>
            </View>
          </View>

          {/* Barre XP */}
          <View className="mb-2">
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-400 text-sm">XP</Text>
              <Text className="text-gray-400 text-sm">
                {user.xp} / {user.level * 100}
              </Text>
            </View>
            <View className="bg-gray-700 h-3 rounded-full overflow-hidden">
              <View
                className="bg-accent-cyan h-full rounded-full"
                style={{
                  width: `${(user.xp / (user.level * 100)) * 100}%`,
                }}
              />
            </View>
          </View>
        </View>

        {/* Statut forme */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6 border border-success/20">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-2">🟢</Text>
            <Text className="text-white text-xl font-bold">EXCELLENT FORME</Text>
          </View>
          <Text className="text-gray-400">
            Continue comme ça ! <Text>💪</Text>
          </Text>
        </View>

        {/* Dernière séance */}
        {lastWorkout ? (
          <View className="bg-primary-navy rounded-2xl p-4 mb-6 border border-accent-purple/20">
            <Text className="text-gray-400 text-sm mb-2"><Text>📅</Text> DERNIÈRE SÉANCE</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white text-lg font-bold">
                  {lastWorkout.type || 'Séance'}
                </Text>
                <Text className="text-gray-400">
                  {lastWorkout.total_sets} séries • {Math.floor(lastWorkout.workout_duration / 60)} min
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={40} color="#00ff88" />
            </View>
          </View>
        ) : (
          <View className="bg-primary-navy rounded-2xl p-4 mb-6 border border-gray-700">
            <Text className="text-gray-400 text-center">
              Aucune séance enregistrée
            </Text>
            <Text className="text-gray-500 text-center text-sm mt-1">
              Commence ton premier entraînement ! <Text>🚀</Text>
            </Text>
          </View>
        )}

        {/* Boutons d'action */}
        <View className="gap-4">
          <TouchableOpacity
            className="bg-accent-cyan rounded-2xl p-4 items-center"
            onPress={() => navigation.navigate('Entraînement')}
          >
            <View className="flex-row items-center">
              <Ionicons name="barbell" size={24} color="#0a0e27" />
              <Text className="text-primary-dark text-xl font-bold ml-2">
                MUSCULATION
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-accent-purple rounded-2xl p-4 items-center"
            onPress={() => navigation.navigate('Entraînement', {
              screen: 'LogRun'
            })}
          >
            <View className="flex-row items-center">
              <Ionicons name="walk" size={24} color="#ffffff" />
              <Text className="text-white text-xl font-bold ml-2">
                COURSE À PIED
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}