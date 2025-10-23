import { View, Text, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function RouteHistoryScreen({ route }) {
  const { routeId } = route.params;
  const [routeData, setRouteData] = useState(null);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadRouteHistory();
  }, []);

  const loadRouteHistory = async () => {
    try {
      // Charger les infos du parcours
      const routeInfo = await db.getFirstAsync(
        'SELECT * FROM routes WHERE id = ?',
        [routeId]
      );
      setRouteData(routeInfo);

      // Charger toutes les courses sur ce parcours
      const allRuns = await db.getAllAsync(
        'SELECT * FROM runs WHERE route_id = ? ORDER BY date DESC',
        [routeId]
      );
      setRuns(allRuns);

      // Calculer les stats
      if (allRuns.length > 0) {
        const bestPace = Math.min(...allRuns.map(r => r.pace));
        const avgPace = allRuns.reduce((sum, r) => sum + r.pace, 0) / allRuns.length;
        const firstRun = allRuns[allRuns.length - 1];
        const lastRun = allRuns[0];
        const totalProgress = firstRun.pace - lastRun.pace;

        setStats({
          bestPace,
          avgPace,
          totalProgress,
          totalRuns: allRuns.length
        });
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('fr-FR', { month: 'short' });
    return `${day} ${month}`;
  };

  const formatPace = (paceInSeconds) => {
    const mins = Math.floor(paceInSeconds / 60);
    const secs = Math.round(paceInSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTerrainIcon = (terrain) => {
    switch (terrain) {
      case 'Plat': return '➡️';
      case 'Vallonné': return '〰️';
      case 'Montagne': return '⛰️';
      default: return '📍';
    }
  };

  if (!routeData) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* En-tête parcours */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <Text className="text-white text-2xl font-bold mb-2">
            {getTerrainIcon(routeData.terrain)} {routeData.name}
          </Text>
          <Text className="text-gray-400">
            Distance : ~{routeData.distance} km • {routeData.terrain}
          </Text>
        </View>

        {/* Stats globales */}
        {stats && (
          <View className="bg-primary-navy rounded-2xl p-6 mb-6">
            <Text className="text-white text-xl font-bold mb-4">
              📊 STATISTIQUES
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">• Meilleure allure :</Text>
                <Text className="text-success font-bold">
                  {formatPace(stats.bestPace)} /km 🏆
                </Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">• Allure moyenne :</Text>
                <Text className="text-white font-semibold">
                  {formatPace(stats.avgPace)} /km
                </Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">• Progression totale :</Text>
                <Text className="text-accent-cyan font-semibold">
                  {stats.totalProgress > 0 ? '-' : '+'}{Math.abs(Math.round(stats.totalProgress))} sec/km
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-400">• Courses ce parcours :</Text>
                <Text className="text-white font-semibold">
                  {stats.totalRuns}
                </Text>
              </View>
            </View>

            {stats.totalProgress > 0 && (
              <View className="mt-4 pt-4 border-t border-primary-dark">
                <Text className="text-success text-center font-bold">
                  💪 TU PROGRESSES BIEN ! 📈
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Historique courses */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <Text className="text-white text-xl font-bold mb-4">
            📅 HISTORIQUE ({runs.length} courses)
          </Text>

          {runs.map((run, index) => {
            const isBest = run.pace === stats?.bestPace;
            return (
              <View
                key={run.id}
                className={`py-3 ${
                  index < runs.length - 1 ? 'border-b border-primary-dark' : ''
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-gray-400 text-sm">
                    {formatDate(run.date)}
                  </Text>
                  {isBest && (
                    <View className="bg-success/20 rounded-full px-2 py-1">
                      <Text className="text-success text-xs font-bold">
                        🏆 Record
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white font-semibold">
                      {run.distance}km • {formatDuration(run.duration)}
                    </Text>
                  </View>
                  <Text className={`font-bold ${isBest ? 'text-success' : 'text-accent-cyan'}`}>
                    {formatPace(run.pace)} /km
                  </Text>
                </View>
              </View>
            );
          })}

          {runs.length === 0 && (
            <Text className="text-gray-400 text-center py-4">
              Aucune course enregistrée sur ce parcours
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}