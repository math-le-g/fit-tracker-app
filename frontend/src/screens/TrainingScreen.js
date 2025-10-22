import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoutineListScreen from './RoutineListScreen';
import RoutineDetailScreen from './RoutineDetailScreen';
import WarmupScreen from './WarmupScreen';
import WarmupTransitionScreen from './WarmupTransitionScreen';
import WorkoutSessionScreen from './WorkoutSessionScreen';
import WorkoutSummaryScreen from './WorkoutSummaryScreen';


const Stack = createNativeStackNavigator();

function TrainingHome({ navigation }) {
  return (
    <View className="flex-1 bg-primary-dark justify-center items-center p-6">
      <Text className="text-white text-3xl font-bold mb-8">
        💪 Entraînement
      </Text>

      <TouchableOpacity
        className="bg-accent-cyan rounded-2xl p-6 w-full mb-4"
        onPress={() => navigation.navigate('RoutineList')}
      >
        <View className="items-center">
          <Ionicons name="barbell" size={48} color="#0a0e27" />
          <Text className="text-primary-dark text-2xl font-bold mt-3">
            MUSCULATION
          </Text>
          <Text className="text-primary-dark/70 mt-1">
            Séances de force
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-accent-purple rounded-2xl p-6 w-full"
        onPress={() => {/* TODO: Course */ }}
      >
        <View className="items-center">
          <Ionicons name="walk" size={48} color="#ffffff" />
          <Text className="text-white text-2xl font-bold mt-3">
            COURSE À PIED
          </Text>
          <Text className="text-white/70 mt-1">
            Cardio & endurance
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function TrainingScreen() {
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
        name="TrainingHome"
        component={TrainingHome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RoutineList"
        component={RoutineListScreen}
        options={{ title: 'Routines' }}
      />
      <Stack.Screen
        name="RoutineDetail"
        component={RoutineDetailScreen}
        options={{ title: 'Détails routine' }}
      />
      <Stack.Screen
        name="Warmup"
        component={WarmupScreen}
        options={{ title: 'Échauffement' }}
      />
      <Stack.Screen
        name="WarmupTransition"
        component={WarmupTransitionScreen}
        options={{ title: 'Prêt !' }}
      />
      <Stack.Screen
        name="WorkoutSession"
        component={WorkoutSessionScreen}
        options={{
          title: 'Séance en cours',
          headerLeft: () => null, // Empêcher le retour arrière
        }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{
          title: 'Séance terminée',
          headerLeft: () => null, // Empêcher le retour
        }}
      />
    </Stack.Navigator>
  );
}