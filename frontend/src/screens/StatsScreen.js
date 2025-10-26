import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StatsOverviewScreen from './StatsOverviewScreen';
import HeatmapScreen from './HeatmapScreen';
import ExerciseListScreen from './ExerciseListScreen';
import ExerciseDetailScreen from './ExerciseDetailScreen';
import ProgressAnalysisScreen from './ProgressAnalysisScreen';

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
      <Stack.Screen
        name="ExerciseList"
        component={ExerciseListScreen}
        options={{ title: 'Mes exercices' }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: 'Détail exercice' }}
      />
      <Stack.Screen
        name="ProgressAnalysis"
        component={ProgressAnalysisScreen}
        options={{ title: 'Analyse de progression' }}
      />
    </Stack.Navigator>
  );
}