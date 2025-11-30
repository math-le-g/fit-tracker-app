import { View, Text, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LastSessionModal({ visible, onClose, lastWorkout }) {
  
  if (!visible) return null;

  // Si pas de données
  if (!lastWorkout || !lastWorkout.allDetails || lastWorkout.allDetails.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { maxHeight: SCREEN_HEIGHT * 0.5 }]}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>📋</Text>
                <Text style={styles.headerTitle}>Détails de la dernière séance</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close-circle" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: '#9ca3af', textAlign: 'center' }}>
                Aucun détail disponible pour cette séance.
              </Text>
            </View>
            <View style={styles.footer}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const details = lastWorkout.allDetails;

  // Grouper les exercices par type
  const groupExercises = () => {
    const grouped = {};
    const supersets = {};
    const dropsets = {};
    const timed = {};
    const orderTracker = {};

    details.forEach(detail => {
      if (detail.is_timed === 1) {
        if (!timed[detail.name]) {
          timed[detail.name] = {
            type: 'timed',
            exerciseName: detail.name,
            duration: detail.reps,
            firstId: detail.id
          };
          orderTracker[detail.id] = { type: 'timed', key: detail.name };
        }
      } else if (detail.dropset_id) {
        if (!dropsets[detail.dropset_id]) {
          dropsets[detail.dropset_id] = {
            type: 'dropset',
            exerciseName: detail.name,
            sets: [],
            firstId: detail.id
          };
          orderTracker[detail.id] = { type: 'dropset', key: detail.dropset_id };
        }
        dropsets[detail.dropset_id].sets.push(detail);
      } else if (detail.superset_id) {
        if (!supersets[detail.superset_id]) {
          supersets[detail.superset_id] = {
            type: 'superset',
            exercises: {},
            firstId: detail.id
          };
          orderTracker[detail.id] = { type: 'superset', key: detail.superset_id };
        }
        if (!supersets[detail.superset_id].exercises[detail.name]) {
          supersets[detail.superset_id].exercises[detail.name] = [];
        }
        supersets[detail.superset_id].exercises[detail.name].push(detail);
      } else {
        if (!grouped[detail.name]) {
          grouped[detail.name] = {
            type: 'normal',
            exerciseName: detail.name,
            sets: [],
            firstId: detail.id
          };
          orderTracker[detail.id] = { type: 'normal', key: detail.name };
        }
        grouped[detail.name].sets.push(detail);
      }
    });

    // Créer les items dans l'ordre chronologique (éviter les doublons)
    const seenKeys = new Set();
    const allItems = [];

    Object.keys(orderTracker)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(id => {
        const tracker = orderTracker[id];
        const uniqueKey = `${tracker.type}_${tracker.key}`;

        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);

          if (tracker.type === 'normal') {
            allItems.push({ ...grouped[tracker.key] });
          } else if (tracker.type === 'superset') {
            allItems.push({ type: 'superset', data: supersets[tracker.key] });
          } else if (tracker.type === 'dropset') {
            allItems.push({ type: 'dropset', data: dropsets[tracker.key] });
          } else if (tracker.type === 'timed') {
            allItems.push({ ...timed[tracker.key] });
          }
        }
      });

    return allItems;
  };

  const allItems = groupExercises();

  // 🆕 NOUVELLE LOGIQUE : Grouper les dropsets par série
  // set_number = numéro du drop (1, 2, 3), pas compteur global
  // Quand set_number diminue ou revient à 1 = nouvelle série
  const groupDropsByRound = (sets) => {
    const rounds = {};
    const sortedSets = [...sets].sort((a, b) => a.id - b.id);
    
    let currentRound = 1;
    let lastSetNumber = 0;
    
    sortedSets.forEach((set) => {
      // Si set_number diminue ou revient à 1, c'est une nouvelle série
      if (set.set_number <= lastSetNumber && lastSetNumber > 0) {
        currentRound++;
      }
      lastSetNumber = set.set_number;
      
      if (!rounds[currentRound]) {
        rounds[currentRound] = [];
      }
      
      rounds[currentRound].push({ 
        ...set, 
        dropNum: set.set_number // Le numéro du drop est directement set_number
      });
    });
    
    return rounds;
  };

  // Grouper les séries du superset par round
  const groupSupersetByRound = (exercises) => {
    const rounds = {};
    
    Object.entries(exercises).forEach(([name, sets]) => {
      sets.forEach((set) => {
        const roundNum = set.set_number;
        if (!rounds[roundNum]) {
          rounds[roundNum] = [];
        }
        rounds[roundNum].push({
          name,
          weight: set.weight,
          reps: set.reps
        });
      });
    });
    
    return rounds;
  };

  // Calculer les totaux
  const totalSets = lastWorkout.total_sets || 0;
  const totalVolume = Math.round(lastWorkout.total_volume || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { maxHeight: SCREEN_HEIGHT * 0.85 }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>📋</Text>
              <Text style={styles.headerTitle}>Détails de la dernière séance</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Contenu scrollable */}
          <ScrollView 
            style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={true}
          >
            {allItems.map((item, index) => {
              
              // EXERCICE CHRONOMÉTRÉ
              if (item.type === 'timed') {
                return (
                  <View key={`timed_${index}`} style={styles.cardTimed}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.numberBadge, { backgroundColor: '#a855f7' }]}>
                        <Text style={styles.numberBadgeText}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardType, { color: '#a855f7' }]}>⏱️ EXERCICE CHRONOMÉTRÉ</Text>
                        <Text style={styles.cardTitle}>{item.exerciseName}</Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.setText}>
                        Durée: <Text style={styles.setValueText}>
                          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                        </Text>
                      </Text>
                    </View>
                  </View>
                );
              }
              
              // DROP SET
              if (item.type === 'dropset') {
                const rounds = groupDropsByRound(item.data.sets);
                const totalRounds = Object.keys(rounds).length;
                const dropsPerRound = rounds[1] ? rounds[1].length : 0;
                
                return (
                  <View key={`dropset_${index}`} style={styles.cardDropset}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.numberBadge, { backgroundColor: '#f59e0b' }]}>
                        <Text style={[styles.numberBadgeText, { color: '#0a1628' }]}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.cardType, { color: '#f59e0b' }]}>🔻 DROP SET</Text>
                          <Text style={{ color: '#f59e0b', fontSize: 11, marginLeft: 8 }}>
                            ({totalRounds} séries × {dropsPerRound} drops)
                          </Text>
                        </View>
                        <Text style={styles.cardTitle}>{item.data.exerciseName}</Text>
                      </View>
                    </View>
                    {Object.entries(rounds)
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([roundNum, drops]) => (
                        <View key={roundNum} style={styles.roundContainer}>
                          <Text style={[styles.roundTitle, { color: '#f59e0b' }]}>Série {roundNum}</Text>
                          {drops
                            .sort((a, b) => a.dropNum - b.dropNum)
                            .map((drop, dropIndex) => (
                              <View key={dropIndex} style={[styles.setRow, dropIndex < drops.length - 1 && styles.setRowBorder]}>
                                <Text style={styles.setText}>Drop {drop.dropNum}</Text>
                                <Text style={styles.setValueText}>{drop.weight}kg × {drop.reps} reps</Text>
                              </View>
                            ))}
                        </View>
                      ))}
                  </View>
                );
              }
              
              // SUPERSET
              if (item.type === 'superset') {
                const rounds = groupSupersetByRound(item.data.exercises);
                const exerciseNames = Object.keys(item.data.exercises);
                return (
                  <View key={`superset_${index}`} style={styles.cardSuperset}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.numberBadge, { backgroundColor: '#00f5ff' }]}>
                        <Text style={[styles.numberBadgeText, { color: '#0a1628' }]}>{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardType, { color: '#00f5ff' }]}>⚡ SUPERSET</Text>
                        <Text style={styles.cardTitle}>{exerciseNames.join(' + ')}</Text>
                      </View>
                    </View>
                    {Object.entries(rounds).map(([roundNum, exercisesInRound]) => (
                      <View key={roundNum} style={styles.roundContainer}>
                        <Text style={[styles.roundTitle, { color: '#00f5ff' }]}>Série {roundNum}</Text>
                        {exercisesInRound.map((ex, exIndex) => (
                          <View key={exIndex} style={[styles.setRow, exIndex < exercisesInRound.length - 1 && styles.setRowBorder]}>
                            <Text style={styles.setText}>• {ex.name}</Text>
                            <Text style={styles.setValueText}>{ex.weight}kg × {ex.reps} reps</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                );
              }
              
              // EXERCICE NORMAL
              return (
                <View key={`normal_${index}`} style={styles.cardNormal}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.numberBadge, { backgroundColor: '#00ff88' }]}>
                      <Text style={[styles.numberBadgeText, { color: '#0a1628' }]}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardType, { color: '#00ff88' }]}>💪 EXERCICE</Text>
                      <Text style={styles.cardTitle}>{item.exerciseName}</Text>
                    </View>
                  </View>
                  <View style={styles.cardContent}>
                    {item.sets.map((set, setIndex) => (
                      <View key={setIndex} style={[styles.setRow, setIndex < item.sets.length - 1 && styles.setRowBorder]}>
                        <Text style={styles.setText}>Série {set.set_number}</Text>
                        <Text style={styles.setValueText}>{set.weight}kg × {set.reps} reps</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>📊</Text>
              <Text style={styles.totalText}>Total: {totalSets} séries • {totalVolume.toLocaleString()}kg</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContainer: {
    backgroundColor: '#0a1628',
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden'
  },
  header: {
    backgroundColor: '#111827',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  footer: {
    backgroundColor: '#111827',
    padding: 16
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  totalText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  closeButton: {
    backgroundColor: '#d4af37',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center'
  },
  closeButtonText: {
    color: '#0a1628',
    fontWeight: 'bold',
    fontSize: 16
  },
  // Cards
  cardTimed: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)'
  },
  cardDropset: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  cardSuperset: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)'
  },
  cardNormal: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  numberBadge: {
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  numberBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  cardType: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  cardTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  cardContent: {
    backgroundColor: '#0a1628',
    borderRadius: 12,
    padding: 12
  },
  roundContainer: {
    backgroundColor: '#0a1628',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  roundTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  setRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    marginBottom: 4,
    paddingBottom: 8
  },
  setText: {
    color: '#9ca3af',
    fontSize: 14
  },
  setValueText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  }
};