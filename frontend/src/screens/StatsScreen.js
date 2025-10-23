import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StatsOverviewScreen from './StatsOverviewScreen'; // ← CETTE LIGNE EST IMPORTANTE
import HeatmapScreen from './HeatmapScreen';

const Stack = createNativeStackNavigator();

export default function StatsScreen() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1f3a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="StatsOverview" 
        component={StatsOverviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Heatmap" 
        component={HeatmapScreen}
        options={{ title: 'Calendrier' }}
      />
    </Stack.Navigator>
  );
}