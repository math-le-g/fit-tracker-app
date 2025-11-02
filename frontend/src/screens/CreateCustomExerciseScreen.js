import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { db } from '../database/database';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import * as Haptics from 'expo-haptics';

export default function CreateCustomExerciseScreen({ navigation }) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');
  const [showMuscleGroupPicker, setShowMuscleGroupPicker] = useState(false);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  // États pour le modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const muscleGroups = [
    'Pectoraux',
    'Dos',
    'Épaules',
    'Bras',
    'Jambes',
    'Core',
    'Cardio'
  ];

  const equipmentList = [
    'Poids du corps',
    'Haltères',
    'Barre',
    'Machine',
    'Câbles',
    'Élastiques',
    'Kettlebell',
    'Swiss Ball',
    'TRX',
    'Autre'
  ];

  const saveExercise = async () => {
    if (!name.trim()) {
      setModalConfig({
        title: 'Nom requis',
        message: 'Donne un nom à ton exercice !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
      return;
    }

    if (!muscleGroup) {
      setModalConfig({
        title: 'Groupe musculaire requis',
        message: 'Sélectionne un groupe musculaire !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
      return;
    }

    if (!equipment) {
      setModalConfig({
        title: 'Équipement requis',
        message: 'Sélectionne un équipement !',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
      return;
    }

    try {
      await db.runAsync(
        'INSERT INTO exercises (name, muscle_group, equipment, is_custom, notes) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), muscleGroup, equipment, 1, notes.trim()]
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setModalConfig({
        title: '✓ Exercice créé !',
        message: `"${name}" a été ajouté à ta bibliothèque d'exercices`,
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
      console.error('Erreur création exercice:', error);
      setModalConfig({
        title: 'Erreur',
        message: 'Impossible de créer l\'exercice',
        icon: 'alert-circle',
        iconColor: '#ff4444',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => {} }]
      });
      setModalVisible(true);
    }
  };

  return (
    <View className="flex-1 bg-primary-dark">
      <ScrollView>
        <View className="p-6">
          <Text className="text-gray-400 mb-6">
            Crée un exercice personnalisé pour l'ajouter à ta bibliothèque
          </Text>

          {/* Nom */}
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-2">NOM DE L'EXERCICE *</Text>
            <TextInput
              className="bg-primary-navy text-white rounded-xl p-4"
              placeholder="Ex: Développé incliné haltères"
              placeholderTextColor="#6b7280"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Groupe musculaire */}
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-2">GROUPE MUSCULAIRE *</Text>
            <TouchableOpacity
              className="bg-primary-navy rounded-xl p-4 flex-row items-center justify-between"
              onPress={() => setShowMuscleGroupPicker(true)}
            >
              <Text className={muscleGroup ? 'text-white' : 'text-gray-400'}>
                {muscleGroup || 'Sélectionner...'}
              </Text>
              <Ionicons name="chevron-down" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Équipement */}
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-2">ÉQUIPEMENT *</Text>
            <TouchableOpacity
              className="bg-primary-navy rounded-xl p-4 flex-row items-center justify-between"
              onPress={() => setShowEquipmentPicker(true)}
            >
              <Text className={equipment ? 'text-white' : 'text-gray-400'}>
                {equipment || 'Sélectionner...'}
              </Text>
              <Ionicons name="chevron-down" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Info temps de repos */}
          <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-6 border border-accent-cyan/20">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#00f5ff" />
              <View className="flex-1 ml-3">
                <Text className="text-accent-cyan text-sm font-bold mb-1">
                  💡 À PROPOS DU TEMPS DE REPOS
                </Text>
                <Text className="text-gray-400 text-xs">
                  Le temps de repos se configure directement dans tes routines, car il peut varier d'une séance à l'autre !
                </Text>
              </View>
            </View>
          </View>

          {/* Notes (optionnel) */}
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-2">NOTES (optionnel)</Text>
            <TextInput
              className="bg-primary-navy text-white rounded-xl p-4"
              placeholder="Instructions, variantes, conseils..."
              placeholderTextColor="#6b7280"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Boutons */}
          <TouchableOpacity
            className="bg-success rounded-2xl p-5 mb-3"
            onPress={saveExercise}
          >
            <Text className="text-primary-dark text-center text-xl font-bold">
              ✓ CRÉER L'EXERCICE
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
      </ScrollView>

      {/* Modal groupe musculaire */}
      <Modal
        visible={showMuscleGroupPicker}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-primary-navy rounded-t-3xl">
            <View className="p-4 border-b border-primary-dark flex-row items-center justify-between">
              <Text className="text-white text-lg font-bold">Groupe musculaire</Text>
              <TouchableOpacity onPress={() => setShowMuscleGroupPicker(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {muscleGroups.map(group => (
                <TouchableOpacity
                  key={group}
                  className="p-4 border-b border-primary-dark"
                  onPress={() => {
                    setMuscleGroup(group);
                    setShowMuscleGroupPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white text-lg">{group}</Text>
                    {muscleGroup === group && (
                      <Ionicons name="checkmark" size={24} color="#00f5ff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal équipement */}
      <Modal
        visible={showEquipmentPicker}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-primary-navy rounded-t-3xl">
            <View className="p-4 border-b border-primary-dark flex-row items-center justify-between">
              <Text className="text-white text-lg font-bold">Équipement</Text>
              <TouchableOpacity onPress={() => setShowEquipmentPicker(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {equipmentList.map(eq => (
                <TouchableOpacity
                  key={eq}
                  className="p-4 border-b border-primary-dark"
                  onPress={() => {
                    setEquipment(eq);
                    setShowEquipmentPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white text-lg">{eq}</Text>
                    {equipment === eq && (
                      <Ionicons name="checkmark" size={24} color="#00f5ff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        {...modalConfig}
      />
    </View>
  );
}