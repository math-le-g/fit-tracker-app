import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';

export default function RoutineListScreen({ navigation }) {
  const [routines, setRoutines] = useState([]);

  useFocusEffect(
  useCallback(() => {
    loadRoutines();
  }, [])
);

  const loadRoutines = async () => {
    try {
      const allRoutines = await db.getAllAsync('SELECT * FROM routines ORDER BY id ASC');

      // Pour chaque routine, charger les exercices
      const routinesWithExercises = await Promise.all(
        allRoutines.map(async (routine) => {
          const exercises = await db.getAllAsync(`
            SELECT e.name, re.sets, re.rest_time
            FROM routine_exercises re
            JOIN exercises e ON re.exercise_id = e.id
            WHERE re.routine_id = ?
            ORDER BY re.order_index ASC
          `, [routine.id]);

          return {
            ...routine,
            exercises,
            totalSets: exercises.reduce((sum, ex) => sum + ex.sets, 0),
            estimatedDuration: Math.round(exercises.reduce((sum, ex) => {
              return sum + (ex.sets * 45) + ((ex.sets - 1) * ex.rest_time);
            }, 0) / 60)
          };
        })
      );

      setRoutines(routinesWithExercises);
    } catch (error) {
      console.error('Erreur chargement routines:', error);
    }
  };

  const getRoutineIcon = (type) => {
    switch (type) {
      case 'push': return 'fitness';
      case 'pull': return 'barbell';
      case 'legs': return 'walk';
      default: return 'barbell-outline';
    }
  };

  const getRoutineColor = (type) => {
    switch (type) {
      case 'push': return 'bg-accent-cyan';
      case 'pull': return 'bg-accent-purple';
      case 'legs': return 'bg-success';
      default: return 'bg-gray-500';
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-2xl font-bold mb-2">
          Mes Routines 💪
        </Text>
        <Text className="text-gray-400 mb-6">
          Sélectionne une routine pour commencer
        </Text>

        {routines.map((routine) => (
          <TouchableOpacity
            key={routine.id}
            className="bg-primary-navy rounded-2xl p-4 mb-4 border border-accent-cyan/20"
            onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
            onLongPress={() => {
              Alert.alert(
                routine.name,
                'Que veux-tu faire ?',
                [
                  {
                    text: 'Modifier',
                    onPress: () => navigation.navigate('EditRoutine', { routineId: routine.id })
                  },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        'Confirmer',
                        'Supprimer cette routine ?',
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Supprimer',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [routine.id]);
                                await db.runAsync('DELETE FROM routines WHERE id = ?', [routine.id]);
                                loadRoutines();
                              } catch (error) {
                                console.error('Erreur suppression:', error);
                              }
                            }
                          }
                        ]
                      );
                    }
                  },
                  { text: 'Annuler', style: 'cancel' }
                ]
              );
            }}
          >
            <View className="flex-row items-center mb-3">
              <View className={`${getRoutineColor(routine.type)} rounded-full p-2 mr-3`}>
                <Ionicons
                  name={getRoutineIcon(routine.type)}
                  size={24}
                  color="#0a0e27"
                />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-bold">
                  {routine.name}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {routine.exercises.length} exercices • {routine.totalSets} séries
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#6b7280" />
            </View>

            <View className="bg-primary-dark rounded-lg p-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text className="text-gray-400 text-sm ml-1">
                    ~{routine.estimatedDuration} min
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="flame-outline" size={16} color="#ff6b35" />
                  <Text className="text-gray-400 text-sm ml-1">
                    +25 XP
                  </Text>
                </View>
              </View>

              <Text className="text-gray-500 text-xs">
                {routine.exercises.map(ex => ex.name).join(' • ')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-4 border-2 border-dashed border-gray-700 items-center"
          onPress={() => navigation.navigate('CreateRoutine')}
        >
          <Ionicons name="add-circle-outline" size={32} color="#6b7280" />
          <Text className="text-gray-400 mt-2 font-semibold">
            Créer une routine
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}