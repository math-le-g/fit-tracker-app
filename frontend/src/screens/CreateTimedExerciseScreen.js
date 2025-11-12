import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function CreateTimedExerciseScreen({ route, navigation }) {
  const { availableExercises, onCreateTimedExercise } = route.params;

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [mode, setMode] = useState('simple'); // 'simple' ou 'interval'
  const [duration, setDuration] = useState('10'); // en minutes
  const [workDuration, setWorkDuration] = useState('45'); // en secondes
  const [restDuration, setRestDuration] = useState('15'); // en secondes
  const [rounds, setRounds] = useState('10');

  const [showExerciseList, setShowExerciseList] = useState(false);

  const handleCreate = () => {
    if (!selectedExercise) {
      alert('Sélectionne un exercice');
      return;
    }

    const timedExercise = {
      type: 'timed',
      exercise: selectedExercise,
      mode: mode,
    };

    if (mode === 'simple') {
      timedExercise.duration = parseInt(duration) * 60; // Convertir en secondes
    } else {
      timedExercise.workDuration = parseInt(workDuration);
      timedExercise.restDuration = parseInt(restDuration);
      timedExercise.rounds = parseInt(rounds);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreateTimedExercise(timedExercise);
    navigation.goBack();
  };

  const getTotalDuration = () => {
    if (mode === 'simple') {
      return parseInt(duration) || 0;
    } else {
      const totalSeconds = (parseInt(workDuration) + parseInt(restDuration)) * parseInt(rounds);
      return Math.round(totalSeconds / 60);
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            className="mr-4"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">
            ⏱️ Exercice chronométré
          </Text>
        </View>

        {/* Sélection exercice */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-4">
          <Text className="text-gray-400 text-sm mb-2">EXERCICE</Text>
          <TouchableOpacity
            className="bg-primary-dark rounded-xl p-4 border-2 border-accent-cyan/30"
            onPress={() => setShowExerciseList(!showExerciseList)}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="fitness" size={24} color="#00f5ff" />
                <Text className="text-white font-semibold text-lg ml-3">
                  {selectedExercise ? selectedExercise.name : 'Choisir un exercice'}
                </Text>
              </View>
              <Ionicons 
                name={showExerciseList ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#00f5ff" 
              />
            </View>
          </TouchableOpacity>

          {/* Liste des exercices */}
          {showExerciseList && (
            <View className="mt-3 max-h-64">
              <ScrollView className="bg-primary-dark rounded-xl p-2">
                {availableExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    className={`p-3 rounded-lg mb-2 ${
                      selectedExercise?.id === ex.id
                        ? 'bg-accent-cyan/20 border border-accent-cyan'
                        : 'bg-primary-navy'
                    }`}
                    onPress={() => {
                      setSelectedExercise(ex);
                      setShowExerciseList(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text className="text-white font-semibold">{ex.name}</Text>
                    <Text className="text-gray-400 text-xs">
                      {ex.muscle_group} • {ex.equipment}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Choix du mode */}
        <View className="bg-primary-navy rounded-2xl p-4 mb-4">
          <Text className="text-gray-400 text-sm mb-3">MODE</Text>

          <TouchableOpacity
            className={`rounded-xl p-4 mb-3 border-2 ${
              mode === 'simple'
                ? 'bg-accent-cyan/20 border-accent-cyan'
                : 'bg-primary-dark border-primary-dark'
            }`}
            onPress={() => {
              setMode('simple');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View className="flex-row items-center">
              <View className={`rounded-full w-6 h-6 mr-3 border-2 items-center justify-center ${
                mode === 'simple' ? 'border-accent-cyan bg-accent-cyan' : 'border-gray-400'
              }`}>
                {mode === 'simple' && (
                  <Ionicons name="checkmark" size={16} color="#0a0e27" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">⏱️ Timer simple</Text>
                <Text className="text-gray-400 text-sm">
                  Lance un chrono et c'est tout
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-xl p-4 border-2 ${
              mode === 'interval'
                ? 'bg-accent-cyan/20 border-accent-cyan'
                : 'bg-primary-dark border-primary-dark'
            }`}
            onPress={() => {
              setMode('interval');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View className="flex-row items-center">
              <View className={`rounded-full w-6 h-6 mr-3 border-2 items-center justify-center ${
                mode === 'interval' ? 'border-accent-cyan bg-accent-cyan' : 'border-gray-400'
              }`}>
                {mode === 'interval' && (
                  <Ionicons name="checkmark" size={16} color="#0a0e27" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">🔥 Intervalles (HIIT)</Text>
                <Text className="text-gray-400 text-sm">
                  Alterne travail / repos automatiquement
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Configuration selon le mode */}
        {mode === 'simple' ? (
          <View className="bg-primary-navy rounded-2xl p-4 mb-4">
            <Text className="text-gray-400 text-sm mb-3">DURÉE TOTALE</Text>
            <View className="flex-row items-center bg-primary-dark rounded-xl p-4">
              <TouchableOpacity
                className="bg-accent-cyan/20 rounded-full p-3"
                onPress={() => {
                  const val = Math.max(1, parseInt(duration) - 1);
                  setDuration(val.toString());
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="remove" size={24} color="#00f5ff" />
              </TouchableOpacity>

              <View className="flex-1 items-center">
                <TextInput
                  className="text-white text-5xl font-bold text-center"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text className="text-gray-400 text-sm">minutes</Text>
              </View>

              <TouchableOpacity
                className="bg-accent-cyan/20 rounded-full p-3"
                onPress={() => {
                  const val = parseInt(duration) + 1;
                  setDuration(val.toString());
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="add" size={24} color="#00f5ff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-primary-navy rounded-2xl p-4 mb-4">
            <Text className="text-gray-400 text-sm mb-3">CONFIGURATION INTERVALLES</Text>

            {/* Temps de travail */}
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">💪 Temps de travail</Text>
              <View className="flex-row items-center bg-accent-cyan/10 border border-accent-cyan/30 rounded-xl p-3">
                <TouchableOpacity
                  className="bg-accent-cyan/20 rounded-full p-2"
                  onPress={() => {
                    const val = Math.max(5, parseInt(workDuration) - 5);
                    setWorkDuration(val.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="remove" size={20} color="#00f5ff" />
                </TouchableOpacity>

                <View className="flex-1 items-center">
                  <TextInput
                    className="text-white text-3xl font-bold text-center"
                    value={workDuration}
                    onChangeText={setWorkDuration}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text className="text-gray-400 text-xs">secondes</Text>
                </View>

                <TouchableOpacity
                  className="bg-accent-cyan/20 rounded-full p-2"
                  onPress={() => {
                    const val = parseInt(workDuration) + 5;
                    setWorkDuration(val.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="add" size={20} color="#00f5ff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Temps de repos */}
            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">😮‍💨 Temps de repos</Text>
              <View className="flex-row items-center bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <TouchableOpacity
                  className="bg-amber-500/20 rounded-full p-2"
                  onPress={() => {
                    const val = Math.max(5, parseInt(restDuration) - 5);
                    setRestDuration(val.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="remove" size={20} color="#f59e0b" />
                </TouchableOpacity>

                <View className="flex-1 items-center">
                  <TextInput
                    className="text-white text-3xl font-bold text-center"
                    value={restDuration}
                    onChangeText={setRestDuration}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                  <Text className="text-gray-400 text-xs">secondes</Text>
                </View>

                <TouchableOpacity
                  className="bg-amber-500/20 rounded-full p-2"
                  onPress={() => {
                    const val = parseInt(restDuration) + 5;
                    setRestDuration(val.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="add" size={20} color="#f59e0b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nombre de tours */}
            <View>
              <Text className="text-white font-semibold mb-2">🔁 Nombre de tours</Text>
              <View className="flex-row items-center bg-primary-dark rounded-xl p-3">
                <TouchableOpacity
                  className="bg-accent-cyan/20 rounded-full p-2"
                  onPress={() => {
                    const val = Math.max(1, parseInt(rounds) - 1);
                    setRounds(val.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="remove" size={20} color="#00f5ff" />
                </TouchableOpacity>

                <View className="flex-1 items-center">
                  <TextInput
                    className="text-white text-3xl font-bold text-center"
                    value={rounds}
                    onChangeText={setRounds}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text className="text-gray-400 text-xs">tours</Text>
                </View>

                <TouchableOpacity
                  className="bg-accent-cyan/20 rounded-full p-2"
                  onPress={() => {
                    const val = parseInt(rounds) + 1;
                    setRounds(val.toString());
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="add" size={20} color="#00f5ff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Récap */}
        <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-6 border border-accent-cyan/30">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={20} color="#00f5ff" />
            <Text className="text-accent-cyan font-bold ml-2">
              📊 RÉCAPITULATIF
            </Text>
          </View>
          <Text className="text-white text-lg font-bold mb-1">
            Durée totale : ~{getTotalDuration()} min
          </Text>
          {mode === 'interval' && (
            <Text className="text-gray-400 text-sm">
              {rounds} × ({workDuration}s travail + {restDuration}s repos)
            </Text>
          )}
        </View>

        {/* Bouton créer */}
        <TouchableOpacity
          className="bg-accent-cyan rounded-2xl p-5 mb-3"
          onPress={handleCreate}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="checkmark-circle" size={28} color="#0a0e27" />
            <Text className="text-primary-dark text-xl font-bold ml-2">
              ✓ CRÉER L'EXERCICE
            </Text>
          </View>
        </TouchableOpacity>

        {/* Bouton annuler */}
        <TouchableOpacity
          className="bg-primary-navy rounded-xl p-3"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-gray-400 text-center font-semibold">
            Annuler
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}