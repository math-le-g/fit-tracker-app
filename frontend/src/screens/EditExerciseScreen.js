import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import * as Haptics from 'expo-haptics';

export default function EditExerciseScreen({ route, navigation }) {
  const { exerciseId, exerciseName, muscleGroup, equipment, restTime } = route.params;
  
  const [name, setName] = useState(exerciseName);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(muscleGroup);
  const [selectedEquipment, setSelectedEquipment] = useState(equipment);
  const [defaultRestTime, setDefaultRestTime] = useState(restTime ? restTime.toString() : '90');
  
  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const muscleGroups = [
    'Pectoraux',
    'Dos',
    'Épaules',
    'Biceps',
    'Triceps',
    'Abdominaux',
    'Jambes',
    'Cardio'
  ];

  const equipmentList = [
    'Poids du corps',
    'Haltères',
    'Barre',
    'Machine',
    'Poulie',
    'Élastiques',
    'Kettlebell',
    'Autre'
  ];

  const saveChanges = async () => {
    if (!name.trim()) {
      setModalConfig({
        title: 'Nom requis',
        message: 'L\'exercice doit avoir un nom !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
      return;
    }

    try {
      await db.runAsync(
        'UPDATE exercises SET name = ?, muscle_group = ?, equipment = ?, default_rest_time = ? WHERE id = ?',
        [name.trim(), selectedMuscleGroup, selectedEquipment, parseInt(defaultRestTime) || 90, exerciseId]
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setModalConfig({
        title: '✓ Exercice modifié !',
        message: `"${name}" a été mis à jour`,
        icon: 'checkmark-circle',
        iconColor: '#00ff88',
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Erreur modification exercice:', error);
      setModalConfig({
        title: 'Erreur',
        message: 'Impossible de modifier l\'exercice',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
    }
  };

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        <Text className="text-white text-2xl font-bold mb-2">
          ✏️ Modifier l'exercice
        </Text>
        <Text className="text-gray-400 mb-6">
          Modifie les détails de l'exercice
        </Text>

        {/* Nom */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-2">NOM DE L'EXERCICE</Text>
          <TextInput
            className="bg-primary-navy text-white rounded-xl p-4"
            value={name}
            onChangeText={setName}
            placeholder="Nom de l'exercice"
            placeholderTextColor="#6b7280"
          />
        </View>

        {/* Groupe musculaire */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">GROUPE MUSCULAIRE</Text>
          <View className="flex-row flex-wrap gap-2">
            {muscleGroups.map(group => (
              <TouchableOpacity
                key={group}
                className={`px-4 py-2 rounded-xl ${
                  selectedMuscleGroup === group 
                    ? 'bg-accent-cyan' 
                    : 'bg-primary-navy'
                }`}
                onPress={() => setSelectedMuscleGroup(group)}
              >
                <Text className={`font-semibold ${
                  selectedMuscleGroup === group 
                    ? 'text-primary-dark' 
                    : 'text-gray-400'
                }`}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Équipement */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">ÉQUIPEMENT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {equipmentList.map(eq => (
              <TouchableOpacity
                key={eq}
                className={`px-4 py-2 rounded-xl mr-2 ${
                  selectedEquipment === eq 
                    ? 'bg-accent-cyan' 
                    : 'bg-primary-navy'
                }`}
                onPress={() => setSelectedEquipment(eq)}
              >
                <Text className={`font-semibold ${
                  selectedEquipment === eq 
                    ? 'text-primary-dark' 
                    : 'text-gray-400'
                }`}>
                  {eq}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Temps de repos par défaut */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-2">TEMPS DE REPOS PAR DÉFAUT (secondes)</Text>
          <TextInput
            className="bg-primary-navy text-white rounded-xl p-4"
            value={defaultRestTime}
            onChangeText={setDefaultRestTime}
            keyboardType="number-pad"
            placeholder="90"
            placeholderTextColor="#6b7280"
          />
        </View>

        {/* Boutons */}
        <TouchableOpacity
          className="bg-success rounded-2xl p-5 mb-3"
          onPress={saveChanges}
        >
          <Text className="text-primary-dark text-center text-xl font-bold">
            ✓ ENREGISTRER LES MODIFICATIONS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-primary-navy rounded-2xl p-4"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-gray-400 text-center font-semibold">
            Annuler
          </Text>
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </ScrollView>
  );
}