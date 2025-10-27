import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { checkAndUnlockBadges } from '../utils/badgeSystem';

export default function RunConfirmationScreen({ route, navigation }) {
  const { distance, duration, pace, route: selectedRoute } = route.params;
  const [lastRun, setLastRun] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [newBadges, setNewBadges] = useState([]);

  useEffect(() => {
    saveRun();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const saveRun = async () => {
    try {
      // Si un parcours est sélectionné, charger la dernière course sur ce parcours
      if (selectedRoute) {
        const lastRunOnRoute = await db.getFirstAsync(
          'SELECT * FROM runs WHERE route_id = ? ORDER BY date DESC LIMIT 1',
          [selectedRoute.id]
        );

        if (lastRunOnRoute) {
          setLastRun(lastRunOnRoute);
          // Vérifier si c'est un record (meilleure allure)
          if (pace < lastRunOnRoute.pace) {
            setIsNewRecord(true);
          }
        }
      }

      // Enregistrer la nouvelle course
      await db.runAsync(
        'INSERT INTO runs (date, distance, duration, pace, route_id, xp_gained) VALUES (?, ?, ?, ?, ?, ?)',
        [new Date().toISOString(), distance, duration, pace, selectedRoute?.id || null, 15]
      );

      // Mettre à jour XP utilisateur
      await db.runAsync('UPDATE user SET xp = xp + 15 WHERE id = 1');

      console.log('✅ Course enregistrée:', distance, 'km en', formatDuration(duration));
    } catch (error) {
      console.error('Erreur enregistrement course:', error);
    }

    // Vérifier les badges
    const unlockedBadges = await checkAndUnlockBadges();
    if (unlockedBadges.length > 0) {
      setNewBadges(unlockedBadges);
      console.log('🏆 Nouveaux badges:', unlockedBadges);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (paceInSeconds) => {
    const mins = Math.floor(paceInSeconds / 60);
    const secs = Math.round(paceInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getComparison = () => {
    if (!lastRun) return null;

    const timeDiff = duration - lastRun.duration;
    const paceDiff = pace - lastRun.pace;

    return {
      timeDiff,
      paceDiff,
      improved: timeDiff < 0
    };
  };

  const comparison = getComparison();

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* Célébration */}
        <View className="items-center mb-8">
          <View className="bg-success/20 rounded-full p-6 mb-4">
            <Ionicons name="checkmark-circle" size={80} color="#00ff88" />
          </View>
          <Text className="text-white text-3xl font-bold mb-2">
            ✅ COURSE ENREGISTRÉE !
          </Text>
          {selectedRoute && (
            <Text className="text-gray-400 text-lg">
              📍 {selectedRoute.name}
            </Text>
          )}
        </View>

        {/* Stats principales */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-primary-dark">
            <View className="items-center flex-1">
              <Ionicons name="navigate" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">DISTANCE</Text>
              <Text className="text-white text-2xl font-bold">
                {distance} km
              </Text>
            </View>

            <View className="items-center flex-1">
              <Ionicons name="time" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">TEMPS</Text>
              <Text className="text-white text-2xl font-bold">
                {formatDuration(duration)}
              </Text>
            </View>

            <View className="items-center flex-1">
              <Ionicons name="flash" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">ALLURE</Text>
              <Text className="text-white text-2xl font-bold">
                {formatPace(pace)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-center pt-4">
            <View className="bg-accent-cyan rounded-full px-4 py-2">
              <Text className="text-primary-dark font-bold text-lg">
                +15 XP
              </Text>
            </View>
          </View>
        </View>

        {/* Comparaison avec dernière fois */}
        {comparison && (
          <View className={`rounded-2xl p-6 mb-6 border ${comparison.improved ? 'bg-success/10 border-success' : 'bg-primary-navy border-primary-dark'
            }`}>
            <View className="flex-row items-center mb-4">
              <Ionicons
                name={comparison.improved ? "trending-up" : "remove"}
                size={24}
                color={comparison.improved ? "#00ff88" : "#6b7280"}
              />
              <Text className={`text-lg font-bold ml-2 ${comparison.improved ? 'text-success' : 'text-white'
                }`}>
                📊 COMPARAISON CE PARCOURS
              </Text>
            </View>

            <View className="mb-3">
              <Text className="text-gray-400 text-sm mb-1">Dernière fois :</Text>
              <Text className="text-white">
                {lastRun.distance}km • {formatDuration(lastRun.duration)} • {formatPace(lastRun.pace)} /km
              </Text>
            </View>

            <View className="mb-3">
              <Text className="text-gray-400 text-sm mb-1">Aujourd'hui :</Text>
              <Text className="text-white">
                {distance}km • {formatDuration(duration)} • {formatPace(pace)} /km
              </Text>
            </View>

            <View className="pt-3 border-t border-primary-dark">
              <Text className={`font-bold ${comparison.improved ? 'text-success' : 'text-gray-400'
                }`}>
                📈 PROGRESSION
              </Text>
              <Text className={comparison.improved ? 'text-success' : 'text-gray-400'}>
                ⏱️ {comparison.timeDiff > 0 ? '+' : ''}{Math.abs(comparison.timeDiff)} secondes
              </Text>
              <Text className={comparison.improved ? 'text-success' : 'text-gray-400'}>
                ⚡ {comparison.paceDiff > 0 ? '+' : ''}{Math.abs(Math.round(comparison.paceDiff))} sec/km
                {comparison.improved && ' 🔥'}
              </Text>
            </View>
          </View>
        )}

        {/* Nouveau record */}
        {isNewRecord && (
          <View className="bg-success/10 rounded-2xl p-6 mb-6 border border-success">
            <View className="flex-row items-center mb-2">
              <Ionicons name="trophy" size={24} color="#00ff88" />
              <Text className="text-success text-xl font-bold ml-2">
                🏆 NOUVEAU RECORD !
              </Text>
            </View>
            <Text className="text-gray-400">
              Meilleure allure sur ce parcours ! 🔥
            </Text>
            <Text className="text-success font-semibold mt-1">
              Ancien : {formatPace(lastRun.pace)} /km
            </Text>
            <Text className="text-white mt-4 text-center font-bold">
              ⭐ +5 XP BONUS
            </Text>
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

        {/* Pas de parcours */}
        {!selectedRoute && (
          <View className="bg-primary-navy rounded-2xl p-4 mb-6">
            <Text className="text-gray-400 text-center text-sm">
              💡 Astuce : Tagge tes courses avec un parcours pour comparer tes performances !
            </Text>
          </View>
        )}

        {/* Boutons */}
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

        {selectedRoute && (
          <TouchableOpacity
            className="bg-primary-navy rounded-2xl p-4"
            onPress={() => navigation.navigate('RouteHistory', { routeId: selectedRoute.id })}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="stats-chart" size={20} color="#6b7280" />
              <Text className="text-gray-400 font-semibold ml-2">
                Voir l'historique de ce parcours
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}