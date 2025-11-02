import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';

export default function RoutineListScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('routines');
  const [routines, setRoutines] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  
  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  // ✅ Actualisation automatique
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'routines') {
        loadRoutines();
      } else {
        loadExercises();
      }
      setSearchQuery('');
    }, [activeTab])
  );

  const loadRoutines = async () => {
    try {
      const allRoutines = await db.getAllAsync('SELECT * FROM routines ORDER BY id DESC');
      setRoutines(allRoutines);
    } catch (error) {
      console.error('Erreur chargement routines:', error);
    }
  };

  const loadExercises = async () => {
    try {
      const allExercises = await db.getAllAsync(
        'SELECT * FROM exercises ORDER BY muscle_group, name'
      );
      setExercises(allExercises);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setMuscleFilter('all');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Fonction pour supprimer un exercice
  const deleteExercise = async (exercise) => {
    // Vérifier si l'exercice est utilisé dans des routines
    const usedInRoutines = await db.getAllAsync(
      'SELECT r.name FROM routine_exercises re JOIN routines r ON re.routine_id = r.id WHERE re.exercise_id = ?',
      [exercise.id]
    );

    if (usedInRoutines.length > 0) {
      setModalConfig({
        title: '⚠️ Exercice utilisé',
        message: `Cet exercice est utilisé dans ${usedInRoutines.length} routine(s):\n\n${usedInRoutines.map(r => `• ${r.name}`).join('\n')}\n\nTu dois d'abord le retirer des routines.`,
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'Compris', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
      return;
    }

    // Vérifier si l'exercice a été utilisé dans des séances
    const usedInWorkouts = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM sets WHERE exercise_id = ?',
      [exercise.id]
    );

    let warningMessage = `Es-tu sûr de vouloir supprimer "${exercise.name}" ?`;
    if (usedInWorkouts.count > 0) {
      warningMessage += `\n\n⚠️ Cet exercice a été utilisé dans ${usedInWorkouts.count} série(s) enregistrée(s). L'historique sera conservé mais l'exercice ne sera plus disponible.`;
    }

    setModalConfig({
      title: '🗑️ Supprimer l\'exercice ?',
      message: warningMessage,
      icon: 'trash',
      iconColor: '#ff4444',
      buttons: [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM exercises WHERE id = ?', [exercise.id]);
              console.log('✅ Exercice supprimé:', exercise.name);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadExercises(); // Recharger la liste
            } catch (error) {
              console.error('❌ Erreur suppression exercice:', error);
              setModalConfig({
                title: 'Erreur',
                message: 'Impossible de supprimer l\'exercice',
                icon: 'alert-circle',
                iconColor: '#ff4444',
                buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
              });
              setModalVisible(true);
            }
          }
        }
      ]
    });
    setModalVisible(true);
  };

  // Fonction pour modifier un exercice
  const editExercise = (exercise) => {
    navigation.navigate('EditExercise', { 
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscle_group,
      equipment: exercise.equipment,
      restTime: exercise.default_rest_time
    });
  };

  // Filtrer les exercices
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
    return matchesSearch && matchesMuscle;
  });

  // Filtrer les routines
  const filteredRoutines = routines.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const muscleGroups = ['all', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Abdominaux', 'Jambes'];

  const getTypeEmoji = (type) => {
    switch (type) {
      case 'Push': return '💪';
      case 'Pull': return '🔙';
      case 'Legs': return '🦵';
      case 'Full Body': return '🏋️';
      default: return '⚡';
    }
  };

  return (
    <View className="flex-1 bg-primary-dark">
      {/* Header avec onglets */}
      <View className="bg-primary-navy p-4">
        <Text className="text-white text-2xl font-bold mb-4">💪 Musculation</Text>

        {/* Onglets */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            className={`flex-1 rounded-xl p-3 ${
              activeTab === 'routines' ? 'bg-accent-cyan' : 'bg-primary-dark'
            }`}
            onPress={() => changeTab('routines')}
          >
            <Text className={`text-center font-bold ${
              activeTab === 'routines' ? 'text-primary-dark' : 'text-gray-400'
            }`}>
              📋 Routines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 rounded-xl p-3 ${
              activeTab === 'exercises' ? 'bg-accent-cyan' : 'bg-primary-dark'
            }`}
            onPress={() => changeTab('exercises')}
          >
            <Text className={`text-center font-bold ${
              activeTab === 'exercises' ? 'text-primary-dark' : 'text-gray-400'
            }`}>
              🏋️ Exercices
            </Text>
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View className="bg-primary-dark rounded-xl px-4 py-3 flex-row items-center">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 text-white ml-2"
            placeholder={activeTab === 'routines' ? 'Rechercher une routine...' : 'Rechercher un exercice...'}
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtres groupes musculaires */}
      {activeTab === 'exercises' && (
        <View style={{ backgroundColor: '#1a1f3a', paddingVertical: 12 }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {muscleGroups.map((muscle, index) => (
              <TouchableOpacity
                key={muscle}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: muscleFilter === muscle ? '#00f5ff' : 'rgba(255, 255, 255, 0.1)',
                  borderWidth: 1,
                  borderColor: muscleFilter === muscle ? '#00f5ff' : 'transparent',
                  marginRight: index < muscleGroups.length - 1 ? 8 : 0
                }}
                onPress={() => {
                  setMuscleFilter(muscle);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: muscleFilter === muscle ? '#0a0e27' : '#a8a8a0'
                }}>
                  {muscle === 'all' ? 'Tous' : muscle}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Contenu */}
      <ScrollView className="flex-1">
        <View className="p-4">
          {activeTab === 'routines' ? (
            <>
              {/* Bouton créer routine */}
              <TouchableOpacity
                className="bg-accent-cyan rounded-2xl p-5 mb-4"
                onPress={() => navigation.navigate('CreateRoutine')}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="add-circle" size={28} color="#0a0e27" />
                  <Text className="text-primary-dark text-xl font-bold ml-3">
                    CRÉER UNE ROUTINE
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Liste routines */}
              {filteredRoutines.length > 0 ? (
                filteredRoutines.map(routine => (
                  <TouchableOpacity
                    key={routine.id}
                    className="bg-primary-navy rounded-2xl p-4 mb-3"
                    onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-white text-lg font-bold">
                            {getTypeEmoji(routine.type)} {routine.name}
                          </Text>
                        </View>
                        <Text className="text-gray-400 text-sm">
                          {routine.type}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color="#6b7280" />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="bg-primary-navy rounded-2xl p-6">
                  <Text className="text-gray-400 text-center">
                    {searchQuery ? 'Aucune routine trouvée' : 'Aucune routine créée'}
                  </Text>
                  {!searchQuery && (
                    <Text className="text-gray-400 text-center text-sm mt-2">
                      Crée ta première routine pour commencer !
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              {/* Bouton créer exercice */}
              <TouchableOpacity
                className="bg-accent-cyan rounded-2xl p-5 mb-4"
                onPress={() => navigation.navigate('CreateCustomExercise')}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="add-circle" size={28} color="#0a0e27" />
                  <Text className="text-primary-dark text-xl font-bold ml-3">
                    CRÉER UN EXERCICE
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Info actions */}
              <View className="bg-primary-navy/50 rounded-xl p-3 mb-3">
                <Text className="text-gray-400 text-center text-sm">
                  💡 Appui long ou boutons pour modifier/supprimer
                </Text>
              </View>

              {/* Liste exercices avec boutons modifier/supprimer */}
              {filteredExercises.length > 0 ? (
                filteredExercises.map(ex => (
                  <TouchableOpacity
                    key={ex.id}
                    className="bg-primary-navy rounded-2xl p-4 mb-3"
                    onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: ex.id })}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      deleteExercise(ex);
                    }}
                    delayLongPress={500}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-white text-lg font-bold">
                          {ex.name}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                          {ex.muscle_group || 'Non défini'}
                          {ex.equipment ? ` • ${ex.equipment}` : ''}
                        </Text>
                      </View>
                      
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          className="bg-primary-dark rounded-full p-2 mr-2"
                          onPress={(e) => {
                            e.stopPropagation();
                            editExercise(ex);
                          }}
                        >
                          <Ionicons name="create" size={20} color="#00f5ff" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          className="bg-danger/20 rounded-full p-2 mr-2"
                          onPress={(e) => {
                            e.stopPropagation();
                            deleteExercise(ex);
                          }}
                        >
                          <Ionicons name="trash" size={20} color="#ff4444" />
                        </TouchableOpacity>
                        
                        <Ionicons name="chevron-forward" size={24} color="#6b7280" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="bg-primary-navy rounded-2xl p-6">
                  <Text className="text-gray-400 text-center">
                    Aucun exercice trouvé
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal custom */}
      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </View>
  );
}