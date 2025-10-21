import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/database/database';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
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
    <>
      <AppNavigator />
      <StatusBar style="light" />
    </>
  );
}
