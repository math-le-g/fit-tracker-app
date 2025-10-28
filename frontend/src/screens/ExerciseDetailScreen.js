import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';


export default function ExerciseDetailScreen({ route }) {
    const { exerciseId, exerciseName } = route.params;
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadExerciseHistory();
    }, []);

    const loadExerciseHistory = async () => {
        try {
            const sets = await db.getAllAsync(`
        SELECT s.*, w.date 
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
        ORDER BY w.date ASC
      `, [exerciseId]);

            if (sets.length === 0) {
                setHistory([]);
                return;
            }

            const sessionMap = {};
            sets.forEach(set => {
                const dateKey = new Date(set.date).toLocaleDateString();
                if (!sessionMap[dateKey]) {
                    sessionMap[dateKey] = {
                        date: set.date,
                        maxWeight: set.weight,
                        maxReps: set.reps,
                        totalVolume: set.weight * set.reps,
                        sets: 1
                    };
                } else {
                    if (set.weight > sessionMap[dateKey].maxWeight) {
                        sessionMap[dateKey].maxWeight = set.weight;
                        sessionMap[dateKey].maxReps = set.reps;
                    }
                    sessionMap[dateKey].totalVolume += set.weight * set.reps;
                    sessionMap[dateKey].sets++;
                }
            });

            const historyData = Object.values(sessionMap);
            setHistory(historyData);

            const allWeights = historyData.map(h => h.maxWeight);
            const allVolumes = historyData.map(h => h.totalVolume);

            const currentWeight = allWeights[allWeights.length - 1];
            const previousWeight = allWeights[allWeights.length - 2] || currentWeight;
            const bestWeight = Math.max(...allWeights);
            const avgWeight = allWeights.reduce((sum, w) => sum + w, 0) / allWeights.length;
            const totalVolume = allVolumes.reduce((sum, v) => sum + v, 0);

            const progression = currentWeight - previousWeight;
            const progressionPercent = previousWeight > 0 ? ((currentWeight - previousWeight) / previousWeight * 100) : 0;

            setStats({
                currentWeight,
                bestWeight,
                avgWeight,
                totalVolume,
                totalSessions: historyData.length,
                progression,
                progressionPercent
            });

        } catch (error) {
            console.error('Erreur chargement historique exercice:', error);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    };

    const getProgressionColor = () => {
        if (!stats) return 'text-gray-400';
        if (stats.progression > 0) return 'text-success';
        if (stats.progression < 0) return 'text-danger';
        return 'text-gray-400';
    };

    const getProgressionIcon = () => {
        if (!stats) return 'remove';
        if (stats.progression > 0) return 'trending-up';
        if (stats.progression < 0) return 'trending-down';
        return 'remove';
    };

    const getStatusLabel = () => {
        if (!stats) return 'Chargement...';
        if (stats.progression > 0) return '📈 EN PROGRESSION';
        if (stats.progression < 0) return '📉 EN RÉGRESSION';
        return '➡️ STABLE';
    };

    if (history.length === 0) {
        return (
            <ScrollView className="flex-1 bg-primary-dark">
                <View className="p-6">
                    <Text className="text-white text-2xl font-bold mb-4">
                        {exerciseName}
                    </Text>
                    <View className="bg-primary-navy rounded-2xl p-6">
                        <Text className="text-gray-400 text-center">
                            Aucune donnée disponible pour cet exercice.
                            {'\n\n'}
                            Fais une séance pour voir ta progression !
                        </Text>
                    </View>
                </View>
            </ScrollView>
        );
    }

    const chartData = history.map((h, index) => ({
        x: index + 1,
        y: h.maxWeight,
        label: formatDate(h.date)
    }));

    const screenWidth = Dimensions.get('window').width;

    return (
        <ScrollView className="flex-1 bg-primary-dark">
            <View className="p-6">
                <Text className="text-white text-2xl font-bold mb-2">
                    {exerciseName}
                </Text>
                <Text className="text-gray-400 mb-6">
                    Historique et progression
                </Text>

                {stats && (
                    <View className="bg-primary-navy rounded-2xl p-6 mb-6">
                        <View className="flex-row items-center mb-4">
                            <Ionicons name={getProgressionIcon()} size={24} color={stats.progression > 0 ? '#00ff88' : stats.progression < 0 ? '#ff4444' : '#6b7280'} />
                            <Text className={`text-xl font-bold ml-2 ${getProgressionColor()}`}>
                                {getStatusLabel()}
                            </Text>
                        </View>

                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-400">Charge actuelle :</Text>
                            <Text className="text-white font-bold">{stats.currentWeight}kg</Text>
                        </View>

                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-400">Record personnel :</Text>
                            <Text className="text-success font-bold">{stats.bestWeight}kg 🏆</Text>
                        </View>

                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-400">Charge moyenne :</Text>
                            <Text className="text-white font-bold">{stats.avgWeight.toFixed(1)}kg</Text>
                        </View>

                        {stats.progression !== 0 && (
                            <View className="mt-4 pt-4 border-t border-primary-dark">
                                <View className="flex-row justify-between">
                                    <Text className="text-gray-400">Dernière progression :</Text>
                                    <Text className={`font-bold ${getProgressionColor()}`}>
                                        {stats.progression > 0 ? '+' : ''}{stats.progression}kg ({stats.progressionPercent.toFixed(1)}%)
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Graphique */}
                <View className="bg-primary-navy rounded-2xl p-4 mb-6">
                    <Text className="text-white text-lg font-bold mb-4">
                        <Text>📈 </Text>ÉVOLUTION CHARGE MAX
                    </Text>

                    <LineChart
                        data={{
                            labels: history.map((h, i) => i % Math.floor(history.length / 5) === 0 ? formatDate(h.date) : ''),
                            datasets: [{
                                data: history.map(h => h.maxWeight)
                            }]
                        }}
                        width={Dimensions.get('window').width - 80}
                        height={220}
                        chartConfig={{
                            backgroundColor: '#1a1f3a',
                            backgroundGradientFrom: '#1a1f3a',
                            backgroundGradientTo: '#1a1f3a',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(0, 245, 255, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                            style: {
                                borderRadius: 16
                            },
                            propsForDots: {
                                r: '4',
                                strokeWidth: '2',
                                stroke: '#00f5ff'
                            },
                            propsForBackgroundLines: {
                                strokeDasharray: '',
                                stroke: '#374151',
                                strokeWidth: 1
                            }
                        }}
                        bezier
                        style={{
                            marginVertical: 8,
                            borderRadius: 16
                        }}
                    />

                    <Text className="text-gray-400 text-xs text-center mt-2">
                        Séances (de la plus ancienne à la plus récente)
                    </Text>
                </View>

                {stats && (
                    <View className="bg-primary-navy rounded-2xl p-6">
                        <Text className="text-white text-lg font-bold mb-4">
                            📊 STATISTIQUES DÉTAILLÉES
                        </Text>

                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-400">• Séances totales :</Text>
                            <Text className="text-white font-bold">{stats.totalSessions}</Text>
                        </View>

                        <View className="flex-row justify-between">
                            <Text className="text-gray-400">• Volume total :</Text>
                            <Text className="text-success font-bold">
                                {stats.totalVolume.toLocaleString()}kg
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}