import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getSupersetInfo } from '../utils/supersetHelpers';
import { db } from '../database/database';

export default function ExerciseTransitionScreen({
  completedExercise,
  completedSets,
  nextExercise,
  exerciseNumber,
  totalExercises,
  workoutStartTime,
  warmupDuration,
  onStartNext,
  navigation,
  exercisesList,
  onUpdateExercises,
  onQuitSession,
  isSuperset = false,
  isDropset = false
}) {

  const [showReplacementMenu, setShowReplacementMenu] = useState(false);

  // 🆕 OBTENIR LES INFOS DU SUPERSET
  const supersetInfo = isSuperset && completedExercise?.exercises
    ? getSupersetInfo(completedExercise.exercises.length)
    : null;

  const handleStartNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStartNext();
  };

  const handleReplaceExercise = () => {
    setShowReplacementMenu(true);
  };

  const handleReplaceWithSimple = () => {
    setShowReplacementMenu(false);
    navigation.push('SelectReplacementExercise', {
      currentExercise: nextExercise.type === 'dropset' ? nextExercise.exercise : nextExercise,
      onReplace: (newExercise) => {
        const newList = [...exercisesList];
        newList[exerciseNumber] = {
          ...newExercise,
          sets: 3,
          rest_time: 90
        };
        if (onUpdateExercises) {
          onUpdateExercises(newList);
          console.log('✅ Remplacé par exercice simple');
        }
      }
    });
  };

  const handleReplaceWithDropset = async () => {
    setShowReplacementMenu(false);
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');
      navigation.navigate('CreateDropset', {
        availableExercises: exercises,
        onCreateDropset: (dropset) => {
          const newList = [...exercisesList];
          newList[exerciseNumber] = dropset;
          if (onUpdateExercises) {
            onUpdateExercises(newList);
            console.log('✅ Remplacé par drop set');
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur chargement exercices:', error);
    }
  };

  const handleReplaceWithSuperset = async () => {
    setShowReplacementMenu(false);
    try {
      const exercises = await db.getAllAsync('SELECT * FROM exercises ORDER BY muscle_group, name');
      navigation.navigate('CreateSuperset', {
        availableExercises: exercises,
        onCreateSuperset: (superset) => {
          const newList = [...exercisesList];
          newList[exerciseNumber] = superset;
          if (onUpdateExercises) {
            onUpdateExercises(newList);
            console.log('✅ Remplacé par superset');
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur chargement exercices:', error);
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalVolume = () => {
    if (isSuperset) {
      // Pour les supersets, completedSets est un objet
      let total = 0;
      Object.values(completedSets || {}).forEach(exerciseSets => {
        exerciseSets.forEach(set => {
          total += set.weight * set.reps;
        });
      });
      return total;
    } else if (isDropset) {
      // Pour les drop sets, completedSets est un tableau d'objets avec weight/reps
      return (completedSets || []).reduce((sum, set) => {
        return sum + (set.weight * set.reps);
      }, 0);
    } else {
      // Pour les exercices normaux, completedSets est un tableau
      return (completedSets || []).reduce((sum, set) => sum + (set.weight * set.reps), 0);
    }
  };

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - workoutStartTime);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <ScrollView className="flex-1 bg-primary-dark">
        <View className="p-6">
          <TouchableOpacity
            className="absolute top-4 right-4 z-50 bg-danger/20 rounded-full p-2"
            onPress={onQuitSession}
          >
            <Ionicons name="close" size={20} color="#ff4444" />
          </TouchableOpacity>

          {/* Exercice terminé */}
          <View className="items-center mb-6">
            <View className={`rounded-full p-6 mb-4 ${isSuperset && supersetInfo ? `${supersetInfo.bgColor}/20` : isDropset ? 'bg-amber-500/20' : 'bg-success/20'}`}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={isSuperset && supersetInfo ? supersetInfo.color : isDropset ? "#f59e0b" : "#00ff88"}
              />
            </View>
            <Text className="text-white text-2xl font-bold mb-2">
              {isSuperset && supersetInfo
                ? `${supersetInfo.emoji} ${supersetInfo.name} TERMINÉ !`
                : isDropset
                  ? '🔻 DROP SET TERMINÉ !'
                  : '✅ EXERCICE TERMINÉ !'
              }
            </Text>
            <Text className="text-gray-400 text-lg">
              {isSuperset
                ? `${supersetInfo?.name || 'Superset'} ${exerciseNumber}`
                : isDropset
                  ? completedExercise.exercise?.name || 'Drop Set'
                  : completedExercise.name || 'Exercice'
              }
            </Text>
          </View>

          {/* Récap exercice */}
          <View className={`rounded-2xl p-6 mb-4 ${isSuperset && supersetInfo ? `${supersetInfo.bgColor}/10 border ${supersetInfo.borderColor}` : isDropset ? 'bg-amber-500/10 border border-amber-500' : 'bg-primary-navy'}`}>
            <Text className="text-white text-lg font-bold mb-3">
              📊 Performance
            </Text>

            {/* AFFICHAGE DIFFÉRENT SELON LE TYPE */}
            {isSuperset ? (
              // SUPERSET/TRISET/GIANT SET
              <>
                {completedExercise.exercises?.map((exercise, exIndex) => {
                  const exerciseSets = completedSets[exercise.id] || [];
                  return (
                    <View key={exercise.id} className="mb-4">
                      <Text className={`${supersetInfo?.textColor || 'text-accent-cyan'} font-bold mb-2`}>
                        {exIndex + 1}. {exercise.name}
                      </Text>
                      {exerciseSets.map((set, setIndex) => (
                        <View key={setIndex} className="flex-row justify-between mb-1 ml-4">
                          <Text className="text-gray-400">Tour {setIndex + 1}</Text>
                          <Text className="text-white font-semibold">
                            {set.weight}kg × {set.reps} reps
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </>
            ) : isDropset ? (
              // DROP SET
              <>
                {(() => {
                  // Grouper par tour
                  const tourGroups = {};
                  (completedSets || []).forEach(set => {
                    const tourNum = set.round || 1;
                    if (!tourGroups[tourNum]) {
                      tourGroups[tourNum] = [];
                    }
                    tourGroups[tourNum].push(set);
                  });

                  return Object.keys(tourGroups)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map(tourNum => (
                      <View key={tourNum} className="mb-3">
                        <Text className="text-amber-500 font-bold mb-1">
                          Série {tourNum}
                        </Text>
                        {tourGroups[tourNum]
                          .sort((a, b) => a.dropIndex - b.dropIndex)
                          .map((set, idx) => (
                            <View key={idx} className="flex-row justify-between mb-1 ml-4">
                              <Text className="text-gray-400">Drop {set.dropIndex + 1}</Text>
                              <Text className="text-white font-semibold">
                                {set.weight}kg × {set.reps} reps
                              </Text>
                            </View>
                          ))}
                      </View>
                    ));
                })()}
              </>
            ) : (
              // EXERCICE NORMAL
              <>
                {(completedSets || []).map((set, index) => (
                  <View key={index} className="flex-row justify-between mb-2">
                    <Text className="text-gray-400">Série {index + 1}</Text>
                    <Text className="text-white font-semibold">
                      {set.weight}kg × {set.reps} reps
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View className="mt-3 pt-3 border-t border-primary-dark">
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Volume total</Text>
                <Text className={`font-bold ${isSuperset && supersetInfo ? supersetInfo.textColor : isDropset ? 'text-amber-500' : 'text-success'}`}>
                  {getTotalVolume()} kg
                </Text>
              </View>
            </View>
          </View>

          {/* Message transition */}
          <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-4 border border-accent-cyan/20">
            <View className="flex-row items-start">
              <Ionicons name="time-outline" size={20} color="#00f5ff" />
              <View className="flex-1 ml-3">
                <Text className="text-accent-cyan font-semibold mb-1">
                  💡 Prends ton temps
                </Text>
                <Text className="text-gray-400 text-sm">
                  Range tes poids, change de machine et prépare le prochain exercice
                </Text>
              </View>
            </View>
          </View>

          {/* Prochain exercice avec options */}
          {nextExercise && (
            <View className="bg-primary-navy rounded-2xl p-6 mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="arrow-forward-circle" size={24} color="#00f5ff" />
                  <Text className="text-white text-lg font-bold ml-2">
                    PROCHAIN EXERCICE
                  </Text>
                </View>

                {/* Bouton pour remplacer l'exercice */}
                <TouchableOpacity
                  className="bg-primary-dark rounded-full p-2"
                  onPress={handleReplaceExercise}
                >
                  <Ionicons name="swap-horizontal" size={20} color="#00f5ff" />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-gray-400 text-sm mb-1">
                    Exercice {exerciseNumber + 1}/{totalExercises}
                  </Text>

                  {/* AFFICHAGE ADAPTÉ SELON LE TYPE */}
                  {nextExercise.type === 'dropset' ? (
                    <>
                      <Text className="text-amber-500 text-lg font-bold">
                        🔻 DROP SET
                      </Text>
                      <Text className="text-white text-xl font-bold">
                        {nextExercise.exercise?.name}
                      </Text>
                    </>
                  ) : nextExercise.type === 'superset' ? (
                    <>
                      <Text className="text-accent-cyan text-xl font-bold mb-2">
                        {getSupersetInfo(nextExercise.exercises?.length || 2).emoji} {getSupersetInfo(nextExercise.exercises?.length || 2).name}
                      </Text>
                      {/* LISTE DES EXERCICES DU SUPERSET */}
                      {nextExercise.exercises?.map((ex, index) => (
                        <Text key={index} className="text-white text-sm ml-2 mb-1">
                          {index + 1}. {ex.name}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <Text className="text-white text-xl font-bold">
                      {nextExercise.name || 'Exercice suivant'}
                    </Text>
                  )}

                  <Text className="text-gray-400 text-sm mt-1">
                    {nextExercise.type === 'superset'
                      ? `${nextExercise.exercises?.length} exercices • ${nextExercise.rounds} tours`
                      : nextExercise.type === 'dropset'
                        ? `${nextExercise.drops} drops • ${nextExercise.rounds} tours`
                        : `${nextExercise.sets} séries • ${nextExercise.rest_time}s repos`
                    }
                  </Text>
                </View>
                <View className="bg-accent-cyan rounded-full w-12 h-12 items-center justify-center">
                  <Text className="text-primary-dark font-bold text-xl">
                    {exerciseNumber + 1}
                  </Text>
                </View>
              </View>

              {/* Info changement d'exercice */}
              <View className="bg-primary-dark rounded-xl p-3 mb-4">
                <Text className="text-gray-400 text-xs text-center">
                  💡 Machine occupée ? Clique sur 🔄 pour changer d'exercice
                </Text>
              </View>

              {/* Bouton commencer */}
              <TouchableOpacity
                className="bg-accent-cyan rounded-xl p-4"
                onPress={handleStartNext}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="play" size={24} color="#0a0e27" />
                  <Text className="text-primary-dark text-lg font-bold ml-2">
                    🚀 COMMENCER
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Timer séance */}
          <View className="items-center mt-4 mb-6">
            <Text className="text-gray-400 text-center">
              ⏱️ Temps total : {formatTime(elapsedTime)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* MODAL CHOIX REMPLACEMENT */}
      <Modal
        visible={showReplacementMenu}
        animationType="fade"
        transparent={true}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-primary-navy rounded-2xl p-6 mx-6 w-80">
            <Text className="text-white text-xl font-bold mb-4 text-center">
              🔄 REMPLACER PAR :
            </Text>

            <TouchableOpacity
              className="bg-primary-dark rounded-xl p-4 mb-3"
              onPress={handleReplaceWithSimple}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="barbell" size={24} color="#00f5ff" />
                <Text className="text-white font-bold text-lg ml-2">
                  EXERCICE SIMPLE
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-amber-500/20 border border-amber-500 rounded-xl p-4 mb-3"
              onPress={handleReplaceWithDropset}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="trending-down" size={24} color="#f59e0b" />
                <Text className="text-amber-500 font-bold text-lg ml-2">
                  🔻 DROP SET
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-accent-cyan/20 border border-accent-cyan rounded-xl p-4 mb-4"
              onPress={handleReplaceWithSuperset}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="flash" size={24} color="#00f5ff" />
                <Text className="text-accent-cyan font-bold text-lg ml-2">
                  🔥 SUPERSET
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-dark rounded-xl p-3"
              onPress={() => setShowReplacementMenu(false)}
            >
              <Text className="text-gray-400 text-center font-semibold">
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}