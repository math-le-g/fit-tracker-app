import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';
import { initDatabase } from './src/database/database';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialiser la base de données
        await initDatabase();
        console.log('✅ App prête !');
      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-primary-dark">
        <ActivityIndicator size="large" color="#00f5ff" />
        <Text className="text-white mt-4">Chargement...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-primary-dark">
      <Text className="text-2xl font-bold text-accent-cyan">
        🏋️ FitTracker
      </Text>
      <Text className="text-white mt-2">
        Base de données initialisée ! ✅
      </Text>
      <Text className="text-gray-400 mt-4">
        57 exercices chargés 💪
      </Text>
      <StatusBar style="light" />
    </View>
  );
}
