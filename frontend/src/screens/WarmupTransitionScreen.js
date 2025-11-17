import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import SessionTimer from '../components/SessionTimer';
import { useSession } from '../context/SessionContext';
import CustomModal from '../components/CustomModal';

export default function WarmupTransitionScreen({ route, navigation }) {
  const { routineId, exercises, warmupDuration, lastWorkoutDuration } = route.params;
  const { formattedTime, endSession } = useSession();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const getTotalSets = () => {
    return exercises.reduce((sum, ex) => {
      // Superset ou Dropset : compter les rounds
      if (ex.type === 'superset' || ex.type === 'dropset') {
        return sum + ex.rounds;
      }
      // Exercice chronométré : 1 série en mode simple, rounds en mode intervalle
      if (ex.type === 'timed') {
        return sum + (ex.mode === 'simple' ? 1 : ex.rounds);
      }
      // Exercice normal : compter les sets
      return sum + (ex.sets || 0);
    }, 0);
  };

  const getEstimatedDuration = () => {
    const workoutTime = exercises.reduce((sum, ex) => {
      // Superset ou Dropset : temps = (rounds * 45s) + repos entre rounds
      if (ex.type === 'superset' || ex.type === 'dropset') {
        return sum + (ex.rounds * 45) + ((ex.rounds - 1) * ex.rest_time);
      }
      // Exercice chronométré
      if (ex.type === 'timed') {
        if (ex.mode === 'simple') {
          // Mode simple : durée directe en secondes
          return sum + ex.duration;
        } else {
          // Mode intervalle : (travail + repos) * rounds
          return sum + ((ex.workDuration + ex.restDuration) * ex.rounds);
        }
      }
      // Exercice normal : temps = (sets * 45s) + repos entre sets
      return sum + ((ex.sets || 0) * 45) + (((ex.sets || 1) - 1) * (ex.rest_time || 90));
    }, 0);
    return Math.round(workoutTime / 60);
  };

  const startExercises = () => {
    navigation.replace('WorkoutSession', {
      routineId,
      exercises,
      warmupDuration,
      skipWarmup: true  // ✅ Échauffement déjà fait !
    });
  };

  // Fonction pour afficher le nom de l'exercice selon son type
  const getExerciseName = (exercise) => {
    if (!exercise) return 'Exercice inconnu';

    if (exercise.type === 'superset') {
      return exercise.exercises?.map(ex => ex.name).join(' + ') || 'Superset';
    }
    if (exercise.type === 'dropset') {
      return `${exercise.exercise?.name || 'Drop Set'} (Drop Set)`;
    }
    if (exercise.type === 'timed') {
      return `${exercise.exercise?.name || 'Chronométré'} (⏱️)`;
    }
    return exercise.name || 'Exercice';
  };

  // Fonction pour afficher le nombre de séries/rounds
  const getExerciseSets = (exercise) => {
    if (!exercise) return '0 séries';

    if (exercise.type === 'superset' || exercise.type === 'dropset') {
      return `${exercise.rounds || 0} tours`;
    }
    if (exercise.type === 'timed') {
      if (exercise.mode === 'simple') {
        return `${Math.floor((exercise.duration || 0) / 60)} min`;
      }
      return `${exercise.rounds || 0} intervalles`;
    }
    return `${exercise.sets || 0} séries`;
  };
  const handleQuitSession = () => {
    setModalConfig({
      title: '🚪 Quitter la séance ?',
      message: 'Tu vas perdre ta progression. Es-tu sûr de vouloir quitter ?',
      icon: 'exit-outline',
      iconColor: '#ff4444',
      buttons: [
        {
          text: 'Continuer',
          style: 'primary',
          onPress: () => { }
        },
        {
          text: 'Annuler la séance',
          style: 'destructive',
          onPress: () => {
            endSession();
            navigation.reset({
              index: 0,
              routes: [{ name: 'TrainingHome' }],
            });
          }
        }
      ]
    });
    setModalVisible(true);
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="absolute top-4 right-4 z-50">
        <TouchableOpacity
          className="bg-danger/20 rounded-full p-2"
          onPress={handleQuitSession}
        >
          <Ionicons name="close" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>
      <SessionTimer />
      <View className="flex-1 items-center justify-center p-6">
        {/* Confirmation échauffement */}
        <View className="items-center mb-8">
          <View className="bg-success/20 rounded-full p-6 mb-4">
            <Ionicons name="checkmark-circle" size={80} color="#00ff88" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">
            ✅ ÉCHAUFFEMENT TERMINÉ
          </Text>
          <Text className="text-gray-400">
            ⏱️ {warmupDuration} minutes
          </Text>
        </View>

        {/* Récap séance */}
        <View className="bg-primary-navy rounded-2xl p-6 w-full mb-8">
          <Text className="text-white text-xl font-bold mb-4">
            🎯 TA SÉANCE
          </Text>

          {exercises.map((exercise, index) => (
            <View
              key={exercise.id || index}
              className={`flex-row items-center py-2 ${index < exercises.length - 1 ? 'border-b border-primary-dark' : ''
                }`}
            >
              <View className="bg-accent-cyan rounded-full w-6 h-6 items-center justify-center mr-3">
                <Text className="text-primary-dark font-bold text-xs">
                  {index + 1}
                </Text>
              </View>
              <Text className="text-white flex-1" numberOfLines={1}>
                {getExerciseName(exercise)}
              </Text>
              <Text className="text-gray-400 text-sm">
                {getExerciseSets(exercise)}
              </Text>
            </View>
          ))}

          <View className="mt-4 pt-4 border-t border-primary-dark">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400">Total séries :</Text>
              <Text className="text-white font-bold">{getTotalSets()}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-gray-400">
                {lastWorkoutDuration ? 'Durée dernière séance :' : 'Durée estimée exercices :'}
              </Text>
              <Text className={`font-bold ${lastWorkoutDuration ? 'text-success' : 'text-white'}`}>
                {lastWorkoutDuration
                  ? `${Math.round(lastWorkoutDuration / 60)} min`
                  : `~${getEstimatedDuration()} min`
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Bouton commencer */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-5 w-full"
          onPress={startExercises}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="barbell" size={28} color="#0a0e27" />
            <Text className="text-primary-dark text-xl font-bold ml-3">
              🚀 COMMENCER LES EXERCICES
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bouton modifier */}
        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-3 w-full mt-3"
          onPress={() => {
            navigation.navigate('ManageWorkoutExercises', {
              exercises: exercises,
              currentIndex: -1,  // -1 car on n'a pas encore commencé
              onReorder: (newExercises) => {
                // Mettre à jour la liste des exercices
                navigation.setParams({ exercises: newExercises });
              }
            });
          }}
        >
          <Text className="text-gray-400 text-center font-semibold">
            ✏️ Modifier la séance
          </Text>
        </TouchableOpacity>
      </View>
      {/* 🆕 MODAL DE CONFIRMATION */}
      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </ScrollView>
  );
}