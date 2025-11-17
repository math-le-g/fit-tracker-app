import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { checkAndUnlockBadges } from '../utils/badgeSystem';
import { getSupersetInfo, isSuperset as isSupersetHelper } from '../utils/supersetHelpers';

export default function WorkoutSummaryScreen({ route, navigation }) {
  // ✅ AJOUT du flag isPartial
  const { workoutId, warmupDuration, workoutDuration, totalSets, totalVolume, xpGained, isPartial = false } = route.params;
  const [workoutDetails, setWorkoutDetails] = useState([]);
  const [records, setRecords] = useState([]);
  const [newBadges, setNewBadges] = useState([]);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadWorkoutDetails();
    checkForRecords();
    checkBadges();
  }, []);

  const loadWorkoutDetails = async () => {
    try {
      // 🆕 CHARGER AVEC superset_id
      const details = await db.getAllAsync(`
  SELECT 
    e.id as exercise_id,
    e.name,
    s.set_number,
    s.weight,
    s.reps,
    s.superset_id,
    s.dropset_id
  FROM sets s
  JOIN exercises e ON s.exercise_id = e.id
  WHERE s.workout_id = ?
  ORDER BY s.id ASC
`, [workoutId]);

      setWorkoutDetails(details);
    } catch (error) {
      console.error('Erreur chargement détails:', error);
    }
  };

  const checkForRecords = async () => {
    // TODO: Vérifier les records
    // Pour l'instant, on simule
    setRecords([
      // { exercise: 'Développé Couché', oldValue: '82kg', newValue: '85kg', improvement: '+3kg' }
    ]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  const getTotalTime = () => {
    return (warmupDuration * 60) + workoutDuration;
  };

  const groupByExercise = () => {
    const grouped = {};
    const supersets = {};
    const dropsets = {};
    const timed = {}; // 🆕

    workoutDetails.forEach(detail => {
      // 🆕 DÉTECTER LES EXERCICES CHRONOMÉTRÉS (weight=0 et pas de superset/dropset)
      if (detail.weight === 0 && !detail.superset_id && !detail.dropset_id) {
        // C'EST UN EXERCICE CHRONOMÉTRÉ
        if (!timed[detail.name]) {
          timed[detail.name] = {
            isTimed: true,
            exerciseName: detail.name,
            duration: detail.reps // La durée est stockée dans reps
          };
        }
      } else if (detail.dropset_id) {
        // 🔻 C'EST UN DROP SET
        if (!dropsets[detail.dropset_id]) {
          dropsets[detail.dropset_id] = {
            isDropset: true,
            exerciseName: detail.name,
            sets: []
          };
        }
        dropsets[detail.dropset_id].sets.push(detail);
      } else if (detail.superset_id) {
        // 🔥 C'EST UN SUPERSET
        if (!supersets[detail.superset_id]) {
          supersets[detail.superset_id] = {
            isSuperset: true,
            exercises: {}
          };
        }
        if (!supersets[detail.superset_id].exercises[detail.name]) {
          supersets[detail.superset_id].exercises[detail.name] = [];
        }
        supersets[detail.superset_id].exercises[detail.name].push(detail);
      } else {
        // ✅ EXERCICE NORMAL
        if (!grouped[detail.name]) {
          grouped[detail.name] = [];
        }
        grouped[detail.name].push(detail);
      }
    });

    return { normal: grouped, supersets: supersets, dropsets: dropsets, timed: timed };
  };

  const checkBadges = async () => {
    const unlockedBadges = await checkAndUnlockBadges();
    if (unlockedBadges.length > 0) {
      setNewBadges(unlockedBadges);
      console.log('🏆 Nouveaux badges débloqués:', unlockedBadges);
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* Célébration */}
        <View className="items-center mb-8">
          <View className={`rounded-full p-6 mb-4 ${isPartial ? 'bg-accent-cyan/20' : 'bg-success/20'}`}>
            <Ionicons
              name={isPartial ? "pause-circle" : "trophy"}
              size={80}
              color={isPartial ? "#00f5ff" : "#00ff88"}
            />
          </View>
          {/* ✅ MODIFICATION DU TITRE selon isPartial */}
          <Text className="text-white text-3xl font-bold mb-2">
            {isPartial ? '⏸️ SÉANCE PARTIELLE' : '🎉 SÉANCE TERMINÉE !'}
          </Text>
          <Text className="text-gray-400 text-lg">
            {isPartial ? 'Sauvegardée avec succès 💾' : 'Excellent travail ! 💪'}
          </Text>
        </View>

        {/* ✅ NOUVEAU BADGE SI SÉANCE PARTIELLE */}
        {isPartial && (
          <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-6 border border-accent-cyan">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#00f5ff" />
              <View className="flex-1 ml-3">
                <Text className="text-accent-cyan font-bold mb-1">
                  💡 SÉANCE INTERROMPUE
                </Text>
                <Text className="text-gray-400 text-sm">
                  Les séries effectuées ont été comptabilisées. Tu peux reprendre une séance complète quand tu veux !
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats principales */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-primary-dark">
            <View className="items-center flex-1">
              <Ionicons name="time" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">TEMPS TOTAL</Text>
              <Text className="text-white text-xl font-bold">
                {formatTime(getTotalTime())}
              </Text>
            </View>

            <View className="items-center flex-1">
              <Ionicons name="layers" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">SÉRIES</Text>
              <Text className="text-white text-xl font-bold">
                {totalSets}
              </Text>
            </View>

            <View className="items-center flex-1">
              <Ionicons name="barbell" size={28} color="#00f5ff" />
              <Text className="text-gray-400 text-sm mt-2">VOLUME</Text>
              <Text className="text-white text-xl font-bold">
                {totalVolume.toLocaleString()} kg
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between pt-4">
            <View className="flex-1">
              <Text className="text-gray-400 text-sm">Détail temps</Text>
              <Text className="text-white">
                🔥 Échauffement : {warmupDuration} min
              </Text>
              <Text className="text-white">
                💪 Exercices : {formatTime(workoutDuration)}
              </Text>
            </View>

            <View className="items-center">
              <View className="bg-accent-cyan rounded-full px-4 py-2">
                <Text className="text-primary-dark font-bold text-lg">
                  +{xpGained} XP
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Records */}
        {records.length > 0 && (
          <View className="bg-success/10 rounded-2xl p-6 mb-6 border border-success">
            <View className="flex-row items-center mb-4">
              <Ionicons name="trophy" size={24} color="#00ff88" />
              <Text className="text-success text-xl font-bold ml-2">
                🏆 NOUVEAUX RECORDS !
              </Text>
            </View>

            {records.map((record, index) => (
              <View key={index} className="mb-3">
                <Text className="text-white font-semibold">
                  • {record.exercise}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {record.oldValue} → {record.newValue} ({record.improvement}) 🔥
                </Text>
              </View>
            ))}
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

        {/* Détails exercices */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <Text className="text-white text-xl font-bold mb-4">
            📋 Détails de la séance
          </Text>

          {(() => {
            const { normal, supersets, dropsets, timed } = groupByExercise();
            const allItems = [];

            // Ajouter les exercices normaux
            Object.entries(normal).forEach(([exerciseName, sets]) => {
              allItems.push({ type: 'normal', name: exerciseName, sets });
            });

            // Ajouter les supersets
            Object.entries(supersets).forEach(([supersetId, supersetData]) => {
              allItems.push({ type: 'superset', id: supersetId, data: supersetData });
            });

            // Ajouter les drop sets
            Object.entries(dropsets).forEach(([dropsetId, dropsetData]) => {
              allItems.push({ type: 'dropset', id: dropsetId, data: dropsetData });
            });

            // 🆕 Ajouter les exercices chronométrés
            Object.entries(timed).forEach(([exerciseName, timedData]) => {
              allItems.push({ type: 'timed', name: exerciseName, data: timedData });
            });

            return allItems.map((item, index) => {
              if (item.type === 'timed') {
                // ⏱️ AFFICHAGE EXERCICE CHRONOMÉTRÉ
                return (
                  <View
                    key={`timed_${index}`}
                    className={`py-3 mb-3 ${index < allItems.length - 1 ? 'border-b border-primary-dark' : ''}`}
                  >
                    <View className="bg-purple-500/10 rounded-2xl p-4 border border-purple-500/30">
                      <View className="flex-row items-center mb-3">
                        <View className="bg-purple-500 rounded-full w-10 h-10 items-center justify-center mr-3">
                          <Ionicons name="timer" size={20} color="#0a0e27" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-purple-500 text-xs font-bold mb-1">
                            ⏱️ EXERCICE CHRONOMÉTRÉ
                          </Text>
                          <Text className="text-white font-bold text-lg">
                            {item.name}
                          </Text>
                        </View>
                      </View>

                      {/* Durée effectuée */}
                      <View className="bg-primary-dark rounded-xl p-3">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons name="time" size={16} color="#a855f7" />
                            <Text className="text-gray-400 text-sm ml-2">Durée effectuée :</Text>
                          </View>
                          <Text className="text-white font-bold">
                            {Math.floor(item.data.duration / 60)}:{(item.data.duration % 60).toString().padStart(2, '0')}
                          </Text>
                        </View>
                      </View>

                      {/* Badge */}
                      <View className="bg-purple-500/20 rounded-xl p-2 border border-purple-500/30 mt-3">
                        <Text className="text-purple-500 text-xs text-center font-semibold">
                          ⏱️ Timer complété
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              } else if (item.type === 'dropset') {
                // 🔻 AFFICHAGE DROP SET
                const sets = item.data.sets;

                // DÉTECTER LE NOMBRE DE DROPS PAR TOUR
                let dropsPerRound = 2; // Par défaut
                for (let d = 2; d <= 4; d++) {
                  if (sets.length % d === 0) {
                    dropsPerRound = d;
                    break;
                  }
                }

                // GROUPER PAR TOUR
                const roundsMap = {};
                sets.forEach(set => {
                  const roundNum = Math.ceil(set.set_number / dropsPerRound);
                  const dropNum = ((set.set_number - 1) % dropsPerRound) + 1;

                  if (!roundsMap[roundNum]) {
                    roundsMap[roundNum] = [];
                  }
                  roundsMap[roundNum].push({ ...set, dropNum });
                });

                return (
                  <View
                    key={item.id}
                    className={`py-3 mb-3 ${index < allItems.length - 1 ? 'border-b border-primary-dark' : ''
                      }`}
                  >
                    <View className="rounded-xl p-4 mb-2 bg-amber-500/10 border border-amber-500">
                      <View className="mb-3">
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="trending-down" size={20} color="#f59e0b" />
                          <Text className="text-amber-500 font-bold text-lg ml-2">
                            🔻 DROP SET
                          </Text>
                        </View>
                        <Text className="text-white font-bold text-xl ml-7">
                          {item.data.exerciseName}
                        </Text>
                      </View>

                      {/* Tours groupés */}
                      {Object.keys(roundsMap)
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map(roundNum => (
                          <View key={roundNum} className="mb-3">
                            <Text className="text-amber-400 text-sm font-bold mb-1">
                              Série {roundNum}
                            </Text>
                            {roundsMap[roundNum]
                              .sort((a, b) => a.dropNum - b.dropNum)
                              .map((set, idx) => (
                                <Text key={idx} className="text-white text-sm ml-2">
                                  • Drop {set.dropNum}: {set.weight}kg × {set.reps} reps
                                </Text>
                              ))}
                          </View>
                        ))}
                    </View>
                  </View>
                );
              } else if (item.type === 'superset') {
                // 🔥 AFFICHAGE SUPERSET
                const exerciseCount = Object.keys(item.data.exercises).length;
                const supersetInfo = getSupersetInfo(exerciseCount);

                return (
                  <View
                    key={item.id}
                    className={`py-3 mb-3 ${index < allItems.length - 1 ? 'border-b border-primary-dark' : ''
                      }`}
                  >
                    <View className={`rounded-xl p-3 mb-2 ${supersetInfo.bgColor}/10 border ${supersetInfo.borderColor}`}>
                      <View className="flex-row items-center mb-2">
                        <Ionicons name={supersetInfo.icon} size={20} color={supersetInfo.color} />
                        <Text className={`${supersetInfo.textColor} font-bold text-lg ml-2`}>
                          {supersetInfo.emoji} {supersetInfo.name}
                        </Text>
                      </View>

                      {/* Exercices du superset */}
                      {Object.entries(item.data.exercises).map(([exerciseName, sets], exIndex) => (
                        <View key={exIndex} className="ml-3 mt-2">
                          <Text className="text-white font-semibold mb-1">
                            {exIndex + 1}. {exerciseName}
                          </Text>
                          {sets.map((set, setIndex) => (
                            <Text key={setIndex} className="text-gray-400 text-sm ml-2">
                              Tour {set.set_number}: {set.weight}kg × {set.reps} reps
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              } else {
                // ✅ AFFICHAGE EXERCICE NORMAL
                return (
                  <View
                    key={index}
                    className={`py-3 mb-3 ${index < allItems.length - 1 ? 'border-b border-primary-dark' : ''}`}
                  >
                    <View className="bg-success/10 rounded-2xl p-4 border border-success/30">
                      <View className="flex-row items-center mb-3">
                        <View className="bg-success rounded-full w-10 h-10 items-center justify-center mr-3">
                          <Ionicons name="fitness" size={20} color="#0a0e27" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-success text-xs font-bold mb-1">
                            💪 EXERCICE SIMPLE
                          </Text>
                          <Text className="text-white font-bold text-lg">
                            {item.name}
                          </Text>
                        </View>
                      </View>

                      {/* Liste des séries */}
                      <View className="bg-primary-dark rounded-xl p-3">
                        {item.sets.map((set, setIndex) => (
                          <View
                            key={setIndex}
                            className={`flex-row items-center justify-between py-2 ${setIndex < item.sets.length - 1 ? 'border-b border-primary-navy' : ''
                              }`}
                          >
                            <View className="flex-row items-center">
                              <View className="bg-success rounded-full w-6 h-6 items-center justify-center mr-3">
                                <Text className="text-primary-dark text-xs font-bold">
                                  {setIndex + 1}
                                </Text>
                              </View>
                              <Text className="text-white text-sm">
                                Série {set.set_number}
                              </Text>
                            </View>
                            <Text className="text-white font-bold">
                              {set.weight}kg × {set.reps} reps
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              }
            });
          })()}
        </View>

        {/* Bouton terminer */}
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
      </View>
    </ScrollView>
  );
}