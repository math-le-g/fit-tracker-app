import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function CreateRouteScreen({ route, navigation }) {
  const { distance } = route.params;
  const [name, setName] = useState('');
  const [routeDistance, setRouteDistance] = useState(distance ? distance.toFixed(1) : '');
  const [terrain, setTerrain] = useState('Plat');

  const terrainOptions = ['Plat', 'Vallonné', 'Montagne'];

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      const result = await db.runAsync(
        'INSERT INTO routes (name, distance, terrain) VALUES (?, ?, ?)',
        [name.trim(), parseFloat(routeDistance) || null, terrain]
      );

      const newRoute = {
        id: result.lastInsertRowId,
        name: name.trim(),
        distance: parseFloat(routeDistance) || null,
        terrain
      };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      navigation.navigate('LogRun', { selectedRoute: newRoute });
    } catch (error) {
      console.error('Erreur création parcours:', error);
    }
  };

  const getTerrainIcon = (t) => {
    switch (t) {
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
          ➕ Nouveau parcours
        </Text>
        <Text className="text-gray-400 mb-6">
          Crée un parcours pour retrouver tes courses facilement
        </Text>

        {/* Nom */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-4">
          <Text className="text-gray-400 text-sm mb-2">NOM DU PARCOURS</Text>
          <TextInput
            className="text-white text-xl"
            value={name}
            onChangeText={setName}
            placeholder="Ex: Parc Municipal, Tour du Lac..."
            placeholderTextColor="#6b7280"
            autoFocus
          />
        </View>

        {/* Distance approximative */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-4">
          <Text className="text-gray-400 text-sm mb-2">DISTANCE APPROXIMATIVE (km)</Text>
          <TextInput
            className="text-white text-xl"
            value={routeDistance}
            onChangeText={setRouteDistance}
            keyboardType="decimal-pad"
            placeholder="Optionnel"
            placeholderTextColor="#6b7280"
          />
          <Text className="text-gray-500 text-xs mt-2">
            💡 Permet de détecter ce parcours automatiquement
          </Text>
        </View>

        {/* Terrain */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-6">
          <Text className="text-gray-400 text-sm mb-3">TYPE DE TERRAIN</Text>
          
          <View className="flex-row gap-2">
            {terrainOptions.map((t) => (
              <TouchableOpacity
                key={t}
                className={`flex-1 rounded-xl p-3 ${
                  terrain === t ? 'bg-accent-cyan' : 'bg-primary-dark'
                }`}
                onPress={() => {
                  setTerrain(t);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text className={`text-center font-bold ${
                  terrain === t ? 'text-primary-dark' : 'text-gray-400'
                }`}>
                  {getTerrainIcon(t)} {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Aperçu */}
        <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-6 border border-accent-cyan/20">
          <Text className="text-accent-cyan text-sm font-bold mb-2">
            📍 APERÇU
          </Text>
          <Text className="text-white text-lg font-semibold">
            {name.trim() || 'Nom du parcours'}
          </Text>
          <Text className="text-gray-400 text-sm">
            {routeDistance ? `~${routeDistance} km • ` : ''}{terrain}
          </Text>
        </View>

        {/* Bouton créer */}
        <TouchableOpacity
          className={`rounded-2xl p-5 ${
            name.trim() ? 'bg-accent-cyan' : 'bg-gray-700'
          }`}
          onPress={handleCreate}
          disabled={!name.trim()}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="checkmark-circle" size={28} color={name.trim() ? "#0a0e27" : "#6b7280"} />
            <Text className={`text-xl font-bold ml-2 ${
              name.trim() ? 'text-primary-dark' : 'text-gray-500'
            }`}>
              ✓ CRÉER
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}