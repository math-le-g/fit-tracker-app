import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function ProgressAnalysisScreen({ navigation }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeProgress();
  }, []);

  const analyzeProgress = async () => {
    try {
      // Récupérer tous les exercices pratiqués
      const exercises = await db.getAllAsync(`
        SELECT DISTINCT e.id, e.name
        FROM exercises e
        JOIN sets s ON e.id = s.exercise_id
      `);

      const progressingExercises = [];
      const stableExercises = [];
      const regressingExercises = [];
      const needAttentionExercises = [];

      for (const exercise of exercises) {
        // Récupérer l'historique des charges max par séance
        const sets = await db.getAllAsync(`
          SELECT s.weight, w.date 
          FROM sets s
          JOIN workouts w ON s.workout_id = w.id
          WHERE s.exercise_id = ?
          ORDER BY w.date ASC
        `, [exercise.id]);

        if (sets.length < 2) continue;

        // Grouper par séance et prendre le max
        const sessionMap = {};
        sets.forEach(set => {
          const dateKey = new Date(set.date).toLocaleDateString();
          if (!sessionMap[dateKey] || set.weight > sessionMap[dateKey]) {
            sessionMap[dateKey] = set.weight;
          }
        });

        const weights = Object.values(sessionMap);
        if (weights.length < 2) continue;

        const currentWeight = weights[weights.length - 1];
        const previousWeight = weights[weights.length - 2];
        const progression = currentWeight - previousWeight;
        const progressionPercent = (progression / previousWeight) * 100;

        // Calculer la tendance sur les 3 dernières séances
        const recentWeights = weights.slice(-3);
        const trend = recentWeights[recentWeights.length - 1] - recentWeights[0];

        const exerciseData = {
          id: exercise.id,
          name: exercise.name,
          currentWeight,
          previousWeight,
          progression,
          progressionPercent,
          trend,
          sessions: weights.length
        };

        // Classification
        if (progression > 0) {
          progressingExercises.push(exerciseData);
        } else if (progression < 0) {
          regressingExercises.push(exerciseData);
          if (Math.abs(progressionPercent) > 5) {
            needAttentionExercises.push(exerciseData);
          }
        } else {
          stableExercises.push(exerciseData);
        }
      }

      // Trier par progression
      progressingExercises.sort((a, b) => b.progressionPercent - a.progressionPercent);
      regressingExercises.sort((a, b) => a.progressionPercent - b.progressionPercent);

      setAnalysis({
        progressingExercises,
        stableExercises,
        regressingExercises,
        needAttentionExercises,
        totalExercises: exercises.length
      });
      setLoading(false);

    } catch (error) {
      console.error('Erreur analyse progression:', error);
      setLoading(false);
    }
  };

  const getOverallStatus = () => {
    if (!analysis) return { label: 'Chargement...', color: 'text-gray-400', icon: 'time' };

    const progressingCount = analysis.progressingExercises.length;
    const regressingCount = analysis.regressingExercises.length;
    const total = analysis.totalExercises;

    const progressRate = (progressingCount / total) * 100;

    if (progressRate >= 70) {
      return { label: '🚀 EXCELLENTE FORME', color: 'text-success', icon: 'trending-up' };
    } else if (progressRate >= 50) {
      return { label: '💪 BONNE PROGRESSION', color: 'text-accent-cyan', icon: 'trending-up' };
    } else if (regressingCount > progressingCount) {
      return { label: '⚠️ ATTENTION REQUISE', color: 'text-danger', icon: 'warning' };
    } else {
      return { label: '➡️ FORME STABLE', color: 'text-gray-400', icon: 'remove' };
    }
  };

  const getSuggestions = () => {
    if (!analysis) return [];

    const suggestions = [];

    // Suggestions basées sur les régressions
    if (analysis.regressingExercises.length > 0) {
      suggestions.push({
        title: '📉 Exercices en régression',
        message: `${analysis.regressingExercises.length} exercice(s) ont baissé. Vérifie ton repos et ta nutrition.`,
        type: 'warning'
      });
    }

    // Suggestions basées sur la progression
    if (analysis.progressingExercises.length >= analysis.totalExercises * 0.7) {
      suggestions.push({
        title: '🔥 Excellente progression !',
        message: 'Continue comme ça ! Pense à bien te reposer entre les séances.',
        type: 'success'
      });
    }

    // Exercices stables
    if (analysis.stableExercises.length > 3) {
      suggestions.push({
        title: '💡 Exercices stables',
        message: `${analysis.stableExercises.length} exercices stagnent. Essaie de varier les techniques (drop sets, tempo...)`,
        type: 'info'
      });
    }

    // Besoin d'attention
    if (analysis.needAttentionExercises.length > 0) {
      suggestions.push({
        title: '⚠️ Attention requise',
        message: `Forte baisse sur ${analysis.needAttentionExercises.length} exercice(s). Prends une semaine de deload ?`,
        type: 'danger'
      });
    }

    return suggestions;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Analyse en cours...</Text>
      </View>
    );
  }

  if (!analysis || analysis.totalExercises === 0) {
    return (
      <ScrollView className="flex-1 bg-primary-dark">
        <View className="p-6">
          <Text className="text-white text-2xl font-bold mb-4">
            📊 Analyse de progression
          </Text>
          <View className="bg-primary-navy rounded-2xl p-6">
            <Text className="text-gray-400 text-center">
              Pas assez de données pour analyser ta progression.
              {'\n\n'}
              Fais au moins 2 séances pour voir l'analyse !
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  const status = getOverallStatus();
  const suggestions = getSuggestions();

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-3xl font-bold mb-2">
          📊 Analyse
        </Text>
        <Text className="text-gray-400 mb-6">
          Progression globale
        </Text>

        {/* Statut global */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name={status.icon} size={28} color={status.color === 'text-success' ? '#00ff88' : status.color === 'text-danger' ? '#ff4444' : '#00f5ff'} />
            <Text className={`text-2xl font-bold ml-3 ${status.color}`}>
              {status.label}
            </Text>
          </View>

          <View className="flex-row justify-around pt-4 border-t border-primary-dark">
            <View className="items-center">
              <Text className="text-success text-2xl font-bold">
                {analysis.progressingExercises.length}
              </Text>
              <Text className="text-gray-400 text-sm">↗️ Progression</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-400 text-2xl font-bold">
                {analysis.stableExercises.length}
              </Text>
              <Text className="text-gray-400 text-sm">➡️ Stable</Text>
            </View>
            <View className="items-center">
              <Text className="text-danger text-2xl font-bold">
                {analysis.regressingExercises.length}
              </Text>
              <Text className="text-gray-400 text-sm">↘️ Régression</Text>
            </View>
          </View>
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View className="mb-6">
            <Text className="text-white text-xl font-bold mb-3">
              💡 SUGGESTIONS
            </Text>
            {suggestions.map((suggestion, index) => (
              <View
                key={index}
                className={`rounded-2xl p-4 mb-3 ${
                  suggestion.type === 'success' ? 'bg-success/10 border border-success' :
                  suggestion.type === 'warning' ? 'bg-accent-cyan/10 border border-accent-cyan' :
                  suggestion.type === 'danger' ? 'bg-danger/10 border border-danger' :
                  'bg-primary-navy'
                }`}
              >
                <Text className={`font-bold mb-1 ${
                  suggestion.type === 'success' ? 'text-success' :
                  suggestion.type === 'warning' ? 'text-accent-cyan' :
                  suggestion.type === 'danger' ? 'text-danger' :
                  'text-white'
                }`}>
                  {suggestion.title}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {suggestion.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Exercices en progression */}
        {analysis.progressingExercises.length > 0 && (
          <View className="mb-6">
            <Text className="text-success text-xl font-bold mb-3">
              📈 EN PROGRESSION ({analysis.progressingExercises.length})
            </Text>
            {analysis.progressingExercises.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                className="bg-success/10 rounded-2xl p-4 mb-3 border border-success"
                onPress={() => navigation.navigate('ExerciseDetail', {
                  exerciseId: ex.id,
                  exerciseName: ex.name
                })}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white font-bold">{ex.name}</Text>
                    <Text className="text-gray-400 text-sm">
                      {ex.previousWeight}kg → {ex.currentWeight}kg
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-success font-bold text-lg">
                      +{ex.progression}kg
                    </Text>
                    <Text className="text-success text-sm">
                      +{ex.progressionPercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Exercices en régression */}
        {analysis.regressingExercises.length > 0 && (
          <View className="mb-6">
            <Text className="text-danger text-xl font-bold mb-3">
              📉 EN RÉGRESSION ({analysis.regressingExercises.length})
            </Text>
            {analysis.regressingExercises.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                className="bg-danger/10 rounded-2xl p-4 mb-3 border border-danger"
                onPress={() => navigation.navigate('ExerciseDetail', {
                  exerciseId: ex.id,
                  exerciseName: ex.name
                })}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white font-bold">{ex.name}</Text>
                    <Text className="text-gray-400 text-sm">
                      {ex.previousWeight}kg → {ex.currentWeight}kg
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-danger font-bold text-lg">
                      {ex.progression}kg
                    </Text>
                    <Text className="text-danger text-sm">
                      {ex.progressionPercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Exercices stables */}
        {analysis.stableExercises.length > 0 && (
          <View className="mb-6">
            <Text className="text-gray-400 text-xl font-bold mb-3">
              ➡️ STABLES ({analysis.stableExercises.length})
            </Text>
            {analysis.stableExercises.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                className="bg-primary-navy rounded-2xl p-4 mb-3"
                onPress={() => navigation.navigate('ExerciseDetail', {
                  exerciseId: ex.id,
                  exerciseName: ex.name
                })}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white font-bold">{ex.name}</Text>
                    <Text className="text-gray-400 text-sm">
                      {ex.currentWeight}kg
                    </Text>
                  </View>
                  <Ionicons name="remove" size={24} color="#6b7280" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}