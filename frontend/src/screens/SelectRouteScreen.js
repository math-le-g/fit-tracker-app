import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CustomModal from '../components/CustomModal';

export default function SelectRouteScreen({ route, navigation }) {
  const { distance, onSelect } = route.params;
  const [routes, setRoutes] = useState([]);
  const [similarRoutes, setSimilarRoutes] = useState([]);
  
  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const allRoutes = await db.getAllAsync('SELECT * FROM routes ORDER BY created_at DESC');
      setRoutes(allRoutes);

      if (distance > 0) {
        const similar = allRoutes.filter(
          (r) => r.distance && Math.abs(r.distance - distance) <= 0.5
        );
        setSimilarRoutes(similar);
      }
    } catch (error) {
      console.error('Erreur chargement parcours:', error);
    }
  };

  const handleSelectRoute = (selectedRoute) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('LogRun', { selectedRoute });
  };

  const handleLongPress = (routeToManage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setModalConfig({
      title: routeToManage.name,
      message: 'Que veux-tu faire avec ce parcours ?',
      icon: 'location',
      iconColor: '#b026ff',
      buttons: [
        {
          text: '🗑️ Supprimer',
          style: 'destructive',
          onPress: () => {
            // Ouvrir un second modal pour confirmer la suppression
            setModalConfig({
              title: '🗑️ Supprimer ce parcours ?',
              message: `Êtes-vous sûr de vouloir supprimer "${routeToManage.name}" ?\n\nToutes les courses associées à ce parcours seront conservées mais ne seront plus liées au parcours.`,
              icon: 'trash',
              iconColor: '#ff4444',
              buttons: [
                { text: 'Annuler', onPress: () => {} },
                {
                  text: 'Supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Mettre à null le route_id des courses associées
                      await db.runAsync(
                        'UPDATE runs SET route_id = NULL WHERE route_id = ?',
                        [routeToManage.id]
                      );
                      
                      // Supprimer le parcours
                      await db.runAsync('DELETE FROM routes WHERE id = ?', [routeToManage.id]);
                      
                      console.log('✅ Parcours supprimé:', routeToManage.name);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      
                      // Recharger la liste
                      loadRoutes();
                    } catch (error) {
                      console.error('❌ Erreur suppression parcours:', error);
                      setModalConfig({
                        title: 'Erreur',
                        message: 'Impossible de supprimer le parcours',
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
          },
          closeOnPress: false
        },
        { text: 'Annuler', onPress: () => {} }
      ]
    });
    setModalVisible(true);
  };

  const getTerrainIcon = (terrain) => {
    switch (terrain) {
      case 'Plat': return '➡️';
      case 'Vallonné': return '〰️';
      case 'Montagne': return '⛰️';
      default: return '📍';
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-2xl font-bold mb-2">
          📍 Parcours
        </Text>

        <Text className="text-gray-400 mb-6">
          Sélectionne un parcours pour cette course
        </Text>

        {/* Info : appui long pour supprimer */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6 border border-accent-cyan/20">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#00f5ff" />
            <View className="flex-1 ml-3">
              <Text className="text-accent-cyan text-sm font-bold mb-1">
                💡 ASTUCE
              </Text>
              <Text className="text-gray-400 text-xs">
                Appuie longuement sur un parcours pour le supprimer
              </Text>
            </View>
          </View>
        </View>

        {/* Parcours similaires détectés */}
        {similarRoutes.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="bulb" size={20} color="#00f5ff" />
              <Text className="text-accent-cyan text-sm font-bold ml-2">
                💡 PARCOURS SIMILAIRES DÉTECTÉS
              </Text>
            </View>
            <Text className="text-gray-400 text-sm mb-3">
              Courses ~{distance} km
            </Text>

            {similarRoutes.map((r) => (
              <TouchableOpacity
                key={r.id}
                className="bg-accent-cyan/10 rounded-2xl p-4 mb-3 border border-accent-cyan/20"
                onPress={() => handleSelectRoute(r)}
                onLongPress={() => handleLongPress(r)}
                delayLongPress={500}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-white text-lg font-bold">
                      {getTerrainIcon(r.terrain)} {r.name}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      ~{r.distance} km • {r.terrain}
                    </Text>
                  </View>
                  <View className="bg-accent-cyan rounded-full p-2">
                    <Ionicons name="checkmark" size={20} color="#0a0e27" />
                  </View>
                </View>

                <View className="bg-primary-dark rounded-lg p-3 mt-2">
                  <Text className="text-gray-400 text-xs">
                    Appuie longuement pour gérer ce parcours
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tous les parcours */}
        {routes.length > 0 && (
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">
              📂 TOUS LES PARCOURS
            </Text>

            {routes.map((r) => (
              <TouchableOpacity
                key={r.id}
                className="bg-primary-navy rounded-2xl p-4 mb-3"
                onPress={() => handleSelectRoute(r)}
                onLongPress={() => handleLongPress(r)}
                delayLongPress={500}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white font-semibold">
                      {getTerrainIcon(r.terrain)} {r.name}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      {r.distance ? `~${r.distance} km • ` : ''}
                      {r.terrain}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Nouveau parcours */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-4 mb-3"
          onPress={() => navigation.navigate('CreateRoute', { distance })}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="add-circle" size={24} color="#0a0e27" />
            <Text className="text-primary-dark text-lg font-bold ml-2">
              ➕ CRÉER UN NOUVEAU PARCOURS
            </Text>
          </View>
        </TouchableOpacity>

        {/* Pas de parcours */}
        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-4"
          onPress={() => handleSelectRoute(null)}
        >
          <Text className="text-gray-400 text-center font-semibold">
            Pas de parcours
          </Text>
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
