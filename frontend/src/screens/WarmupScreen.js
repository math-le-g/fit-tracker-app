import { View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';
import { useSession } from '../context/SessionContext';
import SessionTimer from '../components/SessionTimer';

export default function WarmupScreen({ route, navigation }) {
  const { routineId, warmupDuration, exercises } = route.params;
  const [timeLeft, setTimeLeft] = useState(warmupDuration * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [startTime] = useState(Date.now());  // ✅ Timestamp de début pour calculer le temps RÉEL
  const { startSession, formattedTime, endSession } = useSession();

  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  // Ref pour stocker le unsubscribe
  const [navigationListener, setNavigationListener] = useState(null);

  // Timer
  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer terminé
          clearInterval(interval);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          finishWarmup();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  useEffect(() => {
    startSession(); // Démarrer le timer global
  }, []);

  // BLOQUER LE RETOUR ARRIÈRE
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Empêcher la navigation par défaut
      e.preventDefault();

      // Afficher le modal de confirmation
      setModalConfig({
        title: '🚪 Quitter la séance ?',
        message: 'Tu vas perdre ta progression d\'échauffement. Es-tu sûr de vouloir quitter ?',
        icon: 'exit-outline',
        iconColor: '#ff4444',
        buttons: [
          {
            text: 'Continuer l\'échauffement',
            style: 'primary',
            onPress: () => {
              // Ne rien faire, rester sur l'écran
            }
          },
          {
            text: 'Quitter',
            style: 'destructive',
            onPress: () => {
              // Retirer le listener et naviguer
              navigation.removeListener('beforeRemove', unsubscribe);
              navigation.dispatch(e.data.action);
            }
          }
        ]
      });
      setModalVisible(true);
    });

    // Stocker le unsubscribe pour pouvoir le retirer plus tard
    setNavigationListener(() => unsubscribe);

    return unsubscribe;
  }, [navigation]);

  const finishWarmup = () => {
    if (navigationListener) {
      navigationListener();
    }

    // ✅ Calculer le temps RÉEL écoulé depuis le début
    const actualWarmupSeconds = Math.floor((Date.now() - startTime) / 1000);

    navigation.replace('WarmupTransition', {
      routineId,
      exercises,
      warmupDuration,
      actualWarmupSeconds,  // ✅ Temps réel écoulé en secondes
      lastWorkoutDuration: route.params.lastWorkoutDuration || null
    });
  };

  const adjustTime = (seconds) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalSeconds = warmupDuration * 60;
    return (timeLeft / totalSeconds) * 100;
  };

  // FONCTION POUR QUITTER LA SÉANCE (BOUTON CROIX ROUGE)
  const handleQuitSession = () => {
    setModalConfig({
      title: '🚪 Quitter la séance ?',
      message: 'Tu vas perdre ta progression d\'échauffement. Es-tu sûr de vouloir quitter ?',
      icon: 'exit-outline',
      iconColor: '#ff4444',
      buttons: [
        {
          text: 'Continuer l\'échauffement',
          style: 'primary',
          onPress: () => {
            // Ne rien faire
          }
        },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: () => {
            // RETIRER LE LISTENER AVANT DE NAVIGUER
            if (navigationListener) {
              navigationListener();
            }
            endSession();
            // Naviguer vers l'accueil
            navigation.navigate('TrainingHome');
          }
        }
      ]
    });
    setModalVisible(true);
  };

  return (
    <View className="flex-1 bg-primary-dark">
      <SessionTimer />
      {/* BOUTON QUITTER EN HAUT À DROITE */}
      <View className="absolute top-4 right-4 z-50">
        <TouchableOpacity
          className="bg-danger/20 rounded-full p-2"
          onPress={handleQuitSession}
        >
          <Ionicons name="close" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center p-6">
        {/* Timer */}
        <View className="items-center mb-8">
          <Text className="text-danger text-6xl font-bold mb-2">
            {formatTime(timeLeft)}
          </Text>

          {/* Barre de progression */}
          <View className="w-64 h-2 bg-primary-navy rounded-full overflow-hidden mt-4">
            <View
              className="h-full bg-danger rounded-full"
              style={{ width: `${getProgress()}%` }}
            />
          </View>
        </View>

        {/* Instructions */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-8">
          <View className="flex-row items-center mb-3">
            <Ionicons name="flame" size={20} color="#ff6b35" />
            <Text className="text-white text-xl font-bold ml-2">
              Échauffement en cours
            </Text>
          </View>

          <Text className="text-gray-400 mb-2">
            • Cardio léger (vélo, rameur...)
          </Text>
          <Text className="text-gray-400 mb-2">
            • Mobilité articulaire
          </Text>
          <Text className="text-gray-400">
            • Étirements dynamiques
          </Text>
        </View>

        {/* Boutons ajuster */}
        <View className="mb-8">
          <Text className="text-gray-400 text-center mb-3">
            AJUSTER LE TEMPS
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(-60)}
            >
              <Text className="text-white font-bold">-1 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary-navy rounded-xl px-4 py-3"
              onPress={() => adjustTime(60)}
            >
              <Text className="text-white font-bold">+1 min</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton terminer */}
        <TouchableOpacity
          className="bg-success rounded-2xl px-8 py-4"
          onPress={finishWarmup}
        >
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-lg font-bold ml-2">
              ✓ ÉCHAUFFEMENT TERMINÉ
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* MODAL DE CONFIRMATION */}
      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </View>
  );
}