import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getSupersetInfo } from '../utils/supersetHelpers';

export default function CreateSupersetScreen({ route, navigation }) {
    const { availableExercises, onCreateSuperset, existingSuperset } = route.params;

    // 🆕 DÉTECTION DU MODE (création ou édition)
    const isEditMode = !!existingSuperset;

    // 🆕 PRÉ-REMPLIR SI MODE ÉDITION
    const [selectedExercises, setSelectedExercises] = useState(
        isEditMode ? existingSuperset.exercises : []
    );
    const [rounds, setRounds] = useState(
        isEditMode ? existingSuperset.rounds : 3
    );
    const [restMinutes, setRestMinutes] = useState(
        isEditMode ? Math.floor(existingSuperset.rest_time / 60) : 1
    );
    const [restSeconds, setRestSeconds] = useState(
        isEditMode ? existingSuperset.rest_time % 60 : 30
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('all');

    const MIN_EXERCISES = 2;
    const MAX_EXERCISES = 5;

    const muscleGroups = ['all', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux'];

    // 🆕 OBTENIR LES INFOS SELON LE NOMBRE D'EXERCICES
    const supersetInfo = getSupersetInfo(selectedExercises.length);

    // 🆕 METTRE À JOUR LE TITRE DE LA NAVIGATION
    useEffect(() => {
        navigation.setOptions({
            title: isEditMode ? '✏️ Modifier le superset' : '🔥 Créer un superset'
        });
    }, [isEditMode]);

    const toggleExercise = (exercise) => {
        const isSelected = selectedExercises.some(ex => ex.id === exercise.id);

        if (isSelected) {
            setSelectedExercises(selectedExercises.filter(ex => ex.id !== exercise.id));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            if (selectedExercises.length < MAX_EXERCISES) {
                setSelectedExercises([...selectedExercises, exercise]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
        }
    };

    const isExerciseSelected = (exerciseId) => {
        return selectedExercises.some(ex => ex.id === exerciseId);
    };

    const handleCreateSuperset = () => {
        if (selectedExercises.length < MIN_EXERCISES) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const totalRestSeconds = (restMinutes * 60) + restSeconds;

        const superset = {
            type: 'superset',
            id: `superset_${Date.now()}`,
            rounds: rounds,
            rest_time: totalRestSeconds,
            exercises: selectedExercises.map(ex => ({
                id: ex.id,
                name: ex.name,
                muscle_group: ex.muscle_group,
                equipment: ex.equipment,
                sets: rounds,
                rest_time: 0
            }))
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (onCreateSuperset) {
            onCreateSuperset(superset);
        }

        navigation.goBack();
    };

    const filteredExercises = availableExercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMuscle = muscleFilter === 'all' || ex.muscle_group === muscleFilter;
        return matchesSearch && matchesMuscle;
    });

    return (
        <View className="flex-1 bg-primary-dark">
            <ScrollView>
                <View className="p-6">
                    {/* Info sur le superset */}
                    <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-4 border border-accent-cyan">
                        <View className="flex-row items-start">
                            <Ionicons name={supersetInfo.icon} size={24} color={supersetInfo.color} />
                            <View className="flex-1 ml-3">
                                <Text style={{ color: supersetInfo.color }} className="font-bold text-lg mb-2">
                                    {supersetInfo.emoji} QU'EST-CE QU'UN {supersetInfo.name} ?
                                </Text>
                                <Text className="text-gray-400 text-sm mb-2">
                                    • Enchaîne {selectedExercises.length || 'plusieurs'} exercices SANS repos
                                </Text>
                                <Text className="text-gray-400 text-sm mb-2">
                                    • Repos uniquement entre les tours
                                </Text>
                                <Text className="text-gray-400 text-sm">
                                    • Intensité maximale, gain de temps 💪
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Titre */}
                    <Text className="text-white text-lg font-bold mb-2">
                        SÉLECTIONNER LES EXERCICES ({selectedExercises.length}/{MAX_EXERCISES})
                    </Text>
                    <Text className="text-gray-400 text-sm mb-3">
                        Minimum {MIN_EXERCISES} exercices requis
                    </Text>

                    {/* Barre de recherche */}
                    <View className="bg-primary-navy rounded-xl px-4 py-3 flex-row items-center mb-3">
                        <Ionicons name="search" size={20} color="#6b7280" />
                        <TextInput
                            className="flex-1 text-white ml-2"
                            placeholder="Rechercher un exercice..."
                            placeholderTextColor="#6b7280"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Filtres par groupe musculaire */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-4"
                    >
                        {muscleGroups.map((muscle) => (
                            <TouchableOpacity
                                key={muscle}
                                className={`px-3 py-2 rounded-xl mr-2 ${muscleFilter === muscle ? 'bg-accent-cyan' : 'bg-primary-navy'
                                    }`}
                                onPress={() => {
                                    setMuscleFilter(muscle);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Text className={`text-sm font-semibold ${muscleFilter === muscle ? 'text-primary-dark' : 'text-gray-400'
                                    }`}>
                                    {muscle === 'all' ? 'Tous' : muscle}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Exercices sélectionnés */}
                    {selectedExercises.length > 0 && (
                        <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-4 border border-accent-cyan">
                            <Text className="text-accent-cyan font-bold mb-3">
                                ✅ EXERCICES SÉLECTIONNÉS
                            </Text>
                            {selectedExercises.map((ex, index) => (
                                <View key={ex.id} className="flex-row items-center justify-between mb-2">
                                    <View className="flex-row items-center flex-1">
                                        <View className="bg-accent-cyan rounded-full w-6 h-6 items-center justify-center mr-2">
                                            <Text className="text-primary-dark font-bold text-xs">
                                                {index + 1}
                                            </Text>
                                        </View>
                                        <Text className="text-white font-semibold flex-1">{ex.name}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => toggleExercise(ex)}>
                                        <Ionicons name="close-circle" size={24} color="#ff4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Liste des exercices disponibles */}
                    <View className="bg-primary-navy rounded-2xl p-4 mb-4">
                        <Text className="text-gray-400 text-sm mb-3">
                            📋 EXERCICES DISPONIBLES ({filteredExercises.length})
                        </Text>
                        {filteredExercises.map((ex) => {
                            const selected = isExerciseSelected(ex.id);
                            return (
                                <TouchableOpacity
                                    key={ex.id}
                                    className={`rounded-xl p-3 mb-2 ${selected
                                        ? 'bg-accent-cyan/20 border border-accent-cyan'
                                        : 'bg-primary-dark'
                                        }`}
                                    onPress={() => toggleExercise(ex)}
                                    disabled={!selected && selectedExercises.length >= MAX_EXERCISES}
                                >
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className={`font-semibold ${selected ? 'text-accent-cyan' : 'text-white'}`}>
                                                {ex.name}
                                            </Text>
                                            <Text className="text-gray-400 text-xs">
                                                {ex.muscle_group} • {ex.equipment}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name={selected ? "checkmark-circle" : "add-circle-outline"}
                                            size={24}
                                            color={selected ? "#00f5ff" : "#6b7280"}
                                        />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Configuration des tours */}
                    <View className="mb-4">
                        <Text className="text-white text-lg font-bold mb-3">NOMBRE DE TOURS</Text>
                        <View className="flex-row items-center gap-3">
                            <TouchableOpacity
                                className="bg-primary-navy rounded-xl p-4"
                                onPress={() => {
                                    setRounds(Math.max(1, rounds - 1));
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Ionicons name="remove" size={24} color="#fff" />
                            </TouchableOpacity>

                            <View className="flex-1 bg-primary-navy rounded-xl p-4">
                                <Text className="text-white text-center text-2xl font-bold">
                                    {rounds}
                                </Text>
                            </View>

                            <TouchableOpacity
                                className="bg-primary-navy rounded-xl p-4"
                                onPress={() => {
                                    setRounds(Math.min(10, rounds + 1));
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Ionicons name="add" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Temps de repos entre les tours */}
                    <View className="mb-4">
                        <Text className="text-white text-lg font-bold mb-3">
                            REPOS ENTRE LES TOURS
                        </Text>
                        <View className="flex-row items-center gap-2">
                            {/* Minutes */}
                            <View className="flex-1">
                                <View className="flex-row items-center gap-1">
                                    <TouchableOpacity
                                        className="bg-primary-navy rounded-lg p-3"
                                        onPress={() => {
                                            setRestMinutes(Math.max(0, restMinutes - 1));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="remove" size={18} color="#fff" />
                                    </TouchableOpacity>

                                    <TextInput
                                        className="flex-1 bg-primary-navy text-white text-center rounded-lg p-3 text-xl font-bold"
                                        value={restMinutes.toString()}
                                        onChangeText={(text) => {
                                            const val = parseInt(text) || 0;
                                            setRestMinutes(Math.max(0, Math.min(10, val)));
                                        }}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                    />

                                    <TouchableOpacity
                                        className="bg-primary-navy rounded-lg p-3"
                                        onPress={() => {
                                            setRestMinutes(Math.min(10, restMinutes + 1));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="add" size={18} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-gray-400 text-xs text-center mt-2">minutes</Text>
                            </View>

                            <Text className="text-white text-2xl">:</Text>

                            {/* Secondes - 🆕 PAR PALIERS DE 5 ET ÉDITABLE */}
                            <View className="flex-1">
                                <View className="flex-row items-center gap-1">
                                    <TouchableOpacity
                                        className="bg-primary-navy rounded-lg p-3"
                                        onPress={() => {
                                            setRestSeconds(Math.max(0, restSeconds - 5));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="remove" size={18} color="#fff" />
                                    </TouchableOpacity>

                                    <TextInput
                                        className="flex-1 bg-primary-navy text-white text-center rounded-lg p-3 text-xl font-bold"
                                        value={restSeconds.toString()}
                                        onChangeText={(text) => {
                                            const val = parseInt(text) || 0;
                                            setRestSeconds(Math.max(0, Math.min(59, val)));
                                        }}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                    />

                                    <TouchableOpacity
                                        className="bg-primary-navy rounded-lg p-3"
                                        onPress={() => {
                                            setRestSeconds(Math.min(59, restSeconds + 5));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="add" size={18} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-gray-400 text-xs text-center mt-2">secondes</Text>
                            </View>
                        </View>
                    </View>

                    {/* Résumé */}
                    <View className="bg-accent-cyan/10 rounded-2xl p-4 mb-4 border border-accent-cyan">
                        <Text className="text-accent-cyan font-bold mb-3">📝 RÉSUMÉ</Text>
                        <Text className="text-gray-400 text-sm mb-1">
                            • {selectedExercises.length} exercice{selectedExercises.length > 1 ? 's' : ''} enchaîné{selectedExercises.length > 1 ? 's' : ''}
                        </Text>
                        <Text className="text-gray-400 text-sm mb-1">
                            • {rounds} tour{rounds > 1 ? 's' : ''} au total
                        </Text>
                        <Text className="text-gray-400 text-sm">
                            • {restMinutes}:{restSeconds.toString().padStart(2, '0')} de repos entre les tours
                        </Text>
                    </View>

                    {/* Message d'erreur */}
                    {selectedExercises.length < MIN_EXERCISES && (
                        <View className="bg-danger/10 rounded-2xl p-4 mb-4 border border-danger">
                            <View className="flex-row items-start">
                                <Ionicons name="warning" size={20} color="#ff4444" />
                                <Text className="text-danger text-sm ml-2">
                                    Sélectionne au moins {MIN_EXERCISES} exercices pour créer un superset
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Boutons */}
                    <TouchableOpacity
                        className={`rounded-2xl p-5 mb-3 ${selectedExercises.length >= MIN_EXERCISES
                                ? 'bg-accent-cyan'
                                : 'bg-gray-700'
                            }`}
                        onPress={handleCreateSuperset}
                        disabled={selectedExercises.length < MIN_EXERCISES}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons
                                name={isEditMode ? "checkmark-circle" : supersetInfo.icon}
                                size={24}
                                color={selectedExercises.length >= MIN_EXERCISES ? "#0a0e27" : "#6b7280"}
                            />
                            <Text className={`text-xl font-bold ml-2 ${selectedExercises.length >= MIN_EXERCISES
                                    ? 'text-primary-dark'
                                    : 'text-gray-500'
                                }`}>
                                {isEditMode
                                    ? '✓ ENREGISTRER'
                                    : `${supersetInfo.emoji} CRÉER ${supersetInfo.name}`
                                }
                            </Text>
                        </View>
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
        </View>
    );
}