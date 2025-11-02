import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';

export default function ExerciseDetailScreen({ route, navigation }) {
  const { exerciseId } = route.params;
  const [exercise, setExercise] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadExerciseDetails();
  }, []);

  const loadExerciseDetails = async () => {
    try {
      // Charger l'exercice
      const ex = await db.getFirstAsync(
        'SELECT * FROM exercises WHERE id = ?',
        [exerciseId]
      );
      setExercise(ex);

      // Charger historique (10 dernières séances)
      const sets = await db.getAllAsync(`
        SELECT 
          s.*,
          w.date,
          w.id as workout_id
        FROM sets s
        JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = ?
        ORDER BY w.date DESC
        LIMIT 30
      `, [exerciseId]);

      // Grouper par séance
      const grouped = {};
      sets.forEach(set => {
        const date = new Date(set.date).toLocaleDateString();
        if (!grouped[date]) {
          grouped[date] = {
            date: set.date,
            workout_id: set.workout_id,
            sets: []
          };
        }
        grouped[date].sets.push(set);
      });

      setHistory(Object.values(grouped));

      // Calculer stats
      if (sets.length > 0) {
        const maxWeight = Math.max(...sets.map(s => s.weight));
        const maxReps = Math.max(...sets.map(s => s.reps));
        const maxVolume = Math.max(...sets.map(s => s.weight * s.reps));
        const totalVolume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
        const totalSets = sets.length;

        setStats({
          maxWeight,
          maxReps,
          maxVolume,
          totalVolume,
          totalSets,
          sessions: Object.keys(grouped).length
        });
      }
    } catch (error) {
      console.error('Erreur chargement détails exercice:', error);
    }
  };

  if (!exercise) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Chargement...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary-dark">
      <ScrollView>
        <View className="p-6">
          {/* En-tête */}
          <View className="mb-6">
            <Text className="text-white text-3xl font-bold mb-2">
              {exercise.name}
            </Text>
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center">
                <Ionicons name="fitness" size={18} color="#6b7280" />
                <Text className="text-gray-400 ml-1">{exercise.muscle_group}</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="barbell" size={18} color="#6b7280" />
                <Text className="text-gray-400 ml-1">{exercise.equipment}</Text>
              </View>
              {exercise.is_custom && (
                <View className="bg-accent-cyan rounded-full px-3 py-1">
                  <Text className="text-primary-dark text-xs font-bold">PERSONNALISÉ</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          {stats && (
            <View className="bg-primary-navy rounded-2xl p-6 mb-6">
              <Text className="text-white text-xl font-bold mb-4">📊 STATISTIQUES</Text>
              
              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-400">Séances réalisées :</Text>
                <Text className="text-white font-bold">{stats.sessions}</Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-400">Séries totales :</Text>
                <Text className="text-white font-bold">{stats.totalSets}</Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-400">Charge max :</Text>
                <Text className="text-success font-bold">{stats.maxWeight} kg</Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-400">Reps max :</Text>
                <Text className="text-success font-bold">{stats.maxReps}</Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text className="text-gray-400">Volume max (1 série) :</Text>
                <Text className="text-success font-bold">{stats.maxVolume} kg</Text>
              </View>

              <View className="flex-row justify-between pt-3 border-t border-primary-dark">
                <Text className="text-gray-400">Volume total :</Text>
                <Text className="text-accent-cyan font-bold">{stats.totalVolume.toLocaleString()} kg</Text>
              </View>
            </View>
          )}

          {/* Historique */}
          <View className="bg-primary-navy rounded-2xl p-6 mb-6">
            <Text className="text-white text-xl font-bold mb-4">
              📅 HISTORIQUE ({history.length} séances)
            </Text>

            {history.length > 0 ? (
              history.map((session, index) => (
                <View
                  key={session.workout_id}
                  className={`py-3 ${index < history.length - 1 ? 'border-b border-primary-dark' : ''}`}
                >
                  <Text className="text-gray-400 text-sm mb-2">
                    {new Date(session.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                  {session.sets.map((set, setIndex) => (
                    <Text key={setIndex} className="text-white">
                      • Série {set.set_number}: {set.weight}kg × {set.reps} reps
                    </Text>
                  ))}
                </View>
              ))
            ) : (
              <Text className="text-gray-400 text-center">
                Aucune séance enregistrée pour cet exercice
              </Text>
            )}
          </View>

          {/* Description / Notes (si custom) */}
          {exercise.is_custom && exercise.notes && (
            <View className="bg-primary-navy rounded-2xl p-6 mb-6">
              <Text className="text-white text-xl font-bold mb-3">📝 NOTES</Text>
              <Text className="text-gray-400">{exercise.notes}</Text>
            </View>
          )}

          {/* Bouton retour */}
          <TouchableOpacity
            className="bg-primary-navy rounded-2xl p-4"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-gray-400 text-center font-semibold">
              ← Retour
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}