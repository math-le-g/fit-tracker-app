import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const [routine, setRoutine] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [warmupDuration, setWarmupDuration] = useState(0); // 0 = pas d'échauffement
  
  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  useEffect(() => {
    loadRoutineDetails();
  }, []);

  const loadRoutineDetails = async () => {
    try {
      // Charger la routine
      const routineData = await db.getFirstAsync(
        'SELECT * FROM routines WHERE id = ?',
        [routineId]
      );

      // Charger les exercices de la routine
      const exercisesList = await db.getAllAsync(`
        SELECT 
          e.id,
          e.name,
          e.muscle_group,
          e.equipment,
          re.sets,
          re.rest_time
        FROM routine_exercises re
        JOIN exercises e ON re.exercise_id = e.id
        WHERE re.routine_id = ?
        ORDER BY re.order_index ASC
      `, [routineId]);

      setRoutine(routineData);
      setExercises(exercisesList);

      // Charger la dernière séance pour suggestions
      loadLastWorkoutSuggestions();
    } catch (error) {
      console.error('Erreur chargement détails routine:', error);
    }
  };

  const loadLastWorkoutSuggestions = async () => {
    // TODO: Charger dernière séance pour afficher suggestions
    // On le fera dans les prochaines étapes
  };

  const getTotalSets = () => {
    return exercises.reduce((sum, ex) => sum + ex.sets, 0);
  };

  const getEstimatedDuration = () => {
    const workoutTime = exercises.reduce((sum, ex) => {
      // Temps exercice : 45s par série + temps repos entre séries
      return sum + (ex.sets * 45) + ((ex.sets - 1) * ex.rest_time);
    }, 0);
    return Math.round(workoutTime / 60) + warmupDuration;
  };

  const startWorkout = () => {
    if (warmupDuration > 0) {
      // Aller à l'échauffement
      navigation.navigate('Warmup', { 
        routineId, 
        warmupDuration,
        exercises 
      });
    } else {
      // Passer directement aux exercices
      navigation.navigate('WorkoutSession', { 
        routineId,
        exercises,
        warmupDuration: 0
      });
    }
  };

  const handleModifyRoutine = () => {
    navigation.navigate('EditRoutine', { routineId });
  };

  const handleDeleteRoutine = () => {
    setModalConfig({
      title: '🗑️ Supprimer cette routine ?',
      message: `Êtes-vous sûr de vouloir supprimer "${routine.name}" ?\n\nCette action est irréversible.`,
      icon: 'trash',
      iconColor: '#ff4444',
      buttons: [
        { 
          text: 'Annuler', 
          onPress: () => {} 
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer les exercices de la routine
              await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [routineId]);
              
              // Supprimer la routine
              await db.runAsync('DELETE FROM routines WHERE id = ?', [routineId]);
              
              console.log('✅ Routine supprimée');
              
              // Retour à la liste des routines
              navigation.goBack();
            } catch (error) {
              console.error('❌ Erreur suppression routine:', error);
              setModalConfig({
                title: 'Erreur',
                message: 'Impossible de supprimer la routine',
                icon: 'alert-circle',
                iconColor: '#ff4444',
                buttons: [
                  { text: 'OK', style: 'primary', onPress: () => {} }
                ]
              });
              setModalVisible(true);
            }
          }
        }
      ]
    });
    setModalVisible(true);
  };

  if (!routine) {
    return (
      <View className="flex-1 bg-primary-dark items-center justify-center">
        <Text className="text-white">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* En-tête */}
        <Text className="text-white text-3xl font-bold mb-2">
          {routine.name}
        </Text>
        <View className="flex-row items-center mb-6">
          <View className="flex-row items-center mr-4">
            <Ionicons name="barbell-outline" size={18} color="#6b7280" />
            <Text className="text-gray-400 ml-1">
              {exercises.length} exercices
            </Text>
          </View>
          <View className="flex-row items-center mr-4">
            <Ionicons name="layers-outline" size={18} color="#6b7280" />
            <Text className="text-gray-400 ml-1">
              {getTotalSets()} séries
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={18} color="#6b7280" />
            <Text className="text-gray-400 ml-1">
              ~{getEstimatedDuration()} min
            </Text>
          </View>
        </View>

        {/* Échauffement */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6 border border-danger/20">
          <View className="flex-row items-center mb-3">
            <Ionicons name="flame" size={24} color="#ff6b35" />
            <Text className="text-white text-lg font-bold ml-2">
              ÉCHAUFFEMENT
            </Text>
          </View>

          <View className="flex-row justify-between">
            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 mr-2 ${
                warmupDuration === 5 ? 'bg-danger' : 'bg-primary-dark'
              }`}
              onPress={() => setWarmupDuration(5)}
            >
              <Text className={`text-center font-bold ${
                warmupDuration === 5 ? 'text-white' : 'text-gray-400'
              }`}>
                5 min
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 mx-1 ${
                warmupDuration === 10 ? 'bg-danger' : 'bg-primary-dark'
              }`}
              onPress={() => setWarmupDuration(10)}
            >
              <Text className={`text-center font-bold ${
                warmupDuration === 10 ? 'text-white' : 'text-gray-400'
              }`}>
                10 min
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 mx-1 ${
                warmupDuration === 15 ? 'bg-danger' : 'bg-primary-dark'
              }`}
              onPress={() => setWarmupDuration(15)}
            >
              <Text className={`text-center font-bold ${
                warmupDuration === 15 ? 'text-white' : 'text-gray-400'
              }`}>
                15 min
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 rounded-xl p-3 ml-2 ${
                warmupDuration === 0 ? 'bg-gray-700' : 'bg-primary-dark'
              }`}
              onPress={() => setWarmupDuration(0)}
            >
              <Text className={`text-center font-bold ${
                warmupDuration === 0 ? 'text-white' : 'text-gray-400'
              }`}>
                Passer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Liste exercices */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-3">
            📋 Exercices de la séance
          </Text>

          {exercises.map((exercise, index) => (
            <View
              key={exercise.id}
              className={`flex-row items-center py-3 ${
                index < exercises.length - 1 ? 'border-b border-primary-dark' : ''
              }`}
            >
              <View className="bg-accent-cyan rounded-full w-8 h-8 items-center justify-center mr-3">
                <Text className="text-primary-dark font-bold">
                  {index + 1}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-white font-semibold">
                  {exercise.name}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {exercise.sets} séries • {exercise.rest_time}s repos
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Suggestions dernière séance */}
        <View className="bg-success/10 rounded-2xl p-4 mb-6 border border-success/20">
          <View className="flex-row items-center mb-2">
            <Ionicons name="bulb" size={20} color="#00ff88" />
            <Text className="text-success text-sm font-bold ml-2">
              💡 DERNIÈRE FOIS
            </Text>
          </View>
          <Text className="text-gray-400 text-sm">
            Tu as fait cette routine il y a 3 jours
          </Text>
          <Text className="text-gray-400 text-sm">
            Développé Couché : 82kg × 10 → Essaye 85kg ! 🎯
          </Text>
        </View>

        {/* Bouton commencer */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-4 items-center mb-3"
          onPress={startWorkout}
        >
          <View className="flex-row items-center">
            <Ionicons name="play" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-xl font-bold ml-2">
              COMMENCER LA SÉANCE
            </Text>
          </View>
          {warmupDuration > 0 && (
            <Text className="text-primary-dark/70 text-sm mt-1">
              Échauffement {warmupDuration} min inclus
            </Text>
          )}
        </TouchableOpacity>

        {/* Bouton modifier */}
        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-3 items-center mb-3"
          onPress={handleModifyRoutine}
        >
          <View className="flex-row items-center">
            <Ionicons name="create-outline" size={20} color="#00f5ff" />
            <Text className="text-accent-cyan font-semibold ml-2">
              ✏️ Modifier la séance
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bouton supprimer */}
        <TouchableOpacity
          className="bg-danger/10 rounded-2xl p-3 items-center border border-danger/30"
          onPress={handleDeleteRoutine}
        >
          <View className="flex-row items-center">
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
            <Text className="text-danger font-semibold ml-2">
              🗑️ Supprimer la routine
            </Text>
          </View>
        </TouchableOpacity>

        {/* Modal custom */}
        <CustomModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          {...modalConfig}
        />
      </View>
    </ScrollView>
  );
}