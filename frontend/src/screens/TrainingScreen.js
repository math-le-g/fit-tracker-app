import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoutineListScreen from './RoutineListScreen';
import RoutineDetailScreen from './RoutineDetailScreen';
import WarmupScreen from './WarmupScreen';
import WarmupTransitionScreen from './WarmupTransitionScreen';
import WorkoutSessionScreen from './WorkoutSessionScreen';
import WorkoutSummaryScreen from './WorkoutSummaryScreen';
import LogRunScreen from './LogRunScreen';
import SelectRouteScreen from './SelectRouteScreen';
import CreateRouteScreen from './CreateRouteScreen';
import RunConfirmationScreen from './RunConfirmationScreen';
import RouteHistoryScreen from './RouteHistoryScreen';
import CreateRoutineScreen from './CreateRoutineScreen';
import EditRoutineScreen from './EditRoutineScreen';
import CreateCustomExerciseScreen from './CreateCustomExerciseScreen';
import ManageWorkoutExercisesScreen from './ManageWorkoutExercisesScreen';
import SelectReplacementExerciseScreen from './SelectReplacementExerciseScreen';

const Stack = createNativeStackNavigator();

function TrainingHome({ navigation }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a1628' }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Sous-titre uniquement */}
          <Text style={{ 
            color: '#a8a8a0', 
            fontSize: 16, 
            marginBottom: 24 
          }}>
            Choisis ton type d'activité
          </Text>

          {/* Carte Musculation */}
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(0, 245, 255, 0.15)',
              borderRadius: 24,
              padding: 24,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(0, 245, 255, 0.3)'
            }}
            onPress={() => navigation.navigate('RoutineList')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#00f5ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <Ionicons name="barbell" size={32} color="#0a0e27" />
                  </View>
                  <View>
                    <Text style={{ 
                      color: '#f5f5f0', 
                      fontSize: 24, 
                      fontWeight: 'bold' 
                    }}>
                      MUSCULATION
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={28} color="#00f5ff" />
            </View>
          </TouchableOpacity>

          {/* Carte Course */}
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(176, 38, 255, 0.15)',
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(176, 38, 255, 0.3)'
            }}
            onPress={() => navigation.navigate('LogRun')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#b026ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16
                  }}>
                    <Ionicons name="walk" size={32} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={{ 
                      color: '#f5f5f0', 
                      fontSize: 24, 
                      fontWeight: 'bold' 
                    }}>
                      COURSE À PIED
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={28} color="#b026ff" />
            </View>
          </TouchableOpacity>

          {/* Info supplémentaire (optionnel) */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            padding: 16,
            marginTop: 24,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="information-circle" size={20} color="#00f5ff" />
              <Text style={{ 
                color: '#00f5ff', 
                fontSize: 14, 
                fontWeight: 'bold',
                marginLeft: 8
              }}>
                💡 ASTUCE
              </Text>
            </View>
            <Text style={{ color: '#a8a8a0', fontSize: 14 }}>
              Choisis "Musculation" pour accéder à tes routines d'entraînement, ou "Course" pour enregistrer une sortie running.
            </Text>
          </View>
        </View>
      </ScrollView>
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
        headerShown: false,
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
      <Stack.Screen
        name="LogRun"
        component={LogRunScreen}
        options={{ title: 'Enregistrer une course' }}
      />
      <Stack.Screen
        name="SelectRoute"
        component={SelectRouteScreen}
        options={{ title: 'Sélectionner un parcours' }}
      />
      <Stack.Screen
        name="CreateRoute"
        component={CreateRouteScreen}
        options={{ title: 'Nouveau parcours' }}
      />
      <Stack.Screen
        name="RunConfirmation"
        component={RunConfirmationScreen}
        options={{
          title: 'Course enregistrée',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="RouteHistory"
        component={RouteHistoryScreen}
        options={{ title: 'Historique parcours' }}
      />
      <Stack.Screen
        name="CreateRoutine"
        component={CreateRoutineScreen}
        options={{ title: 'Créer une routine' }}
      />
      <Stack.Screen
        name="EditRoutine"
        component={EditRoutineScreen}
        options={{ title: 'Modifier la routine' }}
      />
      <Stack.Screen
        name="CreateCustomExercise"
        component={CreateCustomExerciseScreen}
        options={{ title: 'Créer un exercice' }}
      />
      <Stack.Screen
        name="ManageWorkoutExercises"
        component={ManageWorkoutExercisesScreen}
        options={{ title: 'Gérer les exercices' }}
      />
      <Stack.Screen
        name="SelectReplacementExercise"
        component={SelectReplacementExerciseScreen}
        options={{ title: 'Remplacer l\'exercice' }}
      />
    </Stack.Navigator>
  );
}