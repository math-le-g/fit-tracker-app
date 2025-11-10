import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function CreateDropsetScreen({ route, navigation }) {
    const { availableExercises, onCreateDropset, existingDropset } = route.params;

    // Mode édition ou création
    const isEditMode = !!existingDropset;

    // États
    const [selectedExercise, setSelectedExercise] = useState(
        isEditMode ? existingDropset.exercise : null
    );
    const [drops, setDrops] = useState(
        isEditMode ? existingDropset.drops : 2
    );
    const [rounds, setRounds] = useState(
        isEditMode ? existingDropset.rounds : 4
    );
    const [restMinutes, setRestMinutes] = useState(
        isEditMode ? Math.floor(existingDropset.rest_time / 60) : 1
    );
    const [restSeconds, setRestSeconds] = useState(
        isEditMode ? existingDropset.rest_time % 60 : 30
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [muscleFilter, setMuscleFilter] = useState('all');

    const MIN_DROPS = 2;
    const MAX_DROPS = 5;

    const muscleGroups = ['all', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Abdominaux'];

    useEffect(() => {
        navigation.setOptions({
            title: isEditMode ? '✏️ Modifier le drop set' : '🔻 Créer un drop set'
        });
    }, [isEditMode]);

    const selectExercise = (exercise) => {
        setSelectedExercise(exercise);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleCreateDropset = () => {
        if (!selectedExercise) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const totalRestSeconds = (restMinutes * 60) + restSeconds;

        const dropset = {
            type: 'dropset',
            id: `dropset_${Date.now()}`,
            exercise: {
                id: selectedExercise.id,
                name: selectedExercise.name,
                muscle_group: selectedExercise.muscle_group,
                equipment: selectedExercise.equipment
            },
            drops: drops,
            rounds: rounds,
            rest_time: totalRestSeconds
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (onCreateDropset) {
            onCreateDropset(dropset);
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
                    {/* Info sur le drop set */}
                    <View className="bg-amber-500/10 rounded-2xl p-4 mb-4 border border-amber-500">
                        <View className="flex-row items-start">
                            <Ionicons name="trending-down" size={24} color="#f59e0b" />
                            <View className="flex-1 ml-3">
                                <Text className="text-amber-500 font-bold text-lg mb-2">
                                    🔻 QU'EST-CE QU'UN DROP SET ?
                                </Text>
                                <Text className="text-gray-400 text-sm mb-2">
                                    • Même exercice, poids dégressifs
                                </Text>
                                <Text className="text-gray-400 text-sm mb-2">
                                    • Enchaîne {drops} drops SANS repos
                                </Text>
                                <Text className="text-gray-400 text-sm">
                                    • Épuisement musculaire total 🔥
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Exercice sélectionné */}
                    {selectedExercise ? (
                        <View className="bg-amber-500/10 rounded-2xl p-4 mb-4 border border-amber-500">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text className="text-amber-500 font-bold mb-1">
                                        ✅ EXERCICE SÉLECTIONNÉ
                                    </Text>
                                    <Text className="text-white font-bold text-lg">
                                        {selectedExercise.name}
                                    </Text>
                                    <Text className="text-gray-400 text-sm">
                                        {selectedExercise.muscle_group} • {selectedExercise.equipment}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                                    <Ionicons name="close-circle" size={28} color="#f59e0b" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            {/* Titre */}
                            <Text className="text-white text-lg font-bold mb-2">
                                SÉLECTIONNER L'EXERCICE
                            </Text>
                            <Text className="text-gray-400 text-sm mb-3">
                                Choisis 1 exercice pour le drop set
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

                            {/* Filtres */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="mb-4"
                            >
                                {muscleGroups.map((muscle) => (
                                    <TouchableOpacity
                                        key={muscle}
                                        className={`px-3 py-2 rounded-xl mr-2 ${muscleFilter === muscle ? 'bg-amber-500' : 'bg-primary-navy'
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

                            {/* Liste des exercices */}
                            <View className="bg-primary-navy rounded-2xl p-4 mb-4">
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className="text-gray-400 text-sm">
                                        📋 EXERCICES DISPONIBLES ({filteredExercises.length})
                                    </Text>
                                    {/* 🆕 BOUTON CRÉER EXERCICE */}
                                    <TouchableOpacity
                                        className="bg-amber-500 rounded-full px-3 py-1.5 flex-row items-center"
                                        onPress={() => {
                                            navigation.navigate('CreateCustomExercise');
                                        }}
                                    >
                                        <Ionicons name="add" size={16} color="#0a0e27" />
                                        <Text className="text-primary-dark text-xs font-bold ml-1">
                                            CRÉER
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                {filteredExercises.map((ex) => (
                                    <TouchableOpacity
                                        key={ex.id}
                                        className="bg-primary-dark rounded-xl p-3 mb-2"
                                        onPress={() => selectExercise(ex)}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-1">
                                                <Text className="text-white font-semibold">
                                                    {ex.name}
                                                </Text>
                                                <Text className="text-gray-400 text-xs">
                                                    {ex.muscle_group} • {ex.equipment}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Configuration (visible seulement si exercice sélectionné) */}
                    {selectedExercise && (
                        <>
                            {/* Nombre de drops */}
                            <View className="mb-4">
                                <Text className="text-white text-lg font-bold mb-3">
                                    NOMBRE DE DROPS
                                </Text>
                                <Text className="text-gray-400 text-sm mb-3">
                                    Combien de baisses de poids ? (min {MIN_DROPS}, max {MAX_DROPS})
                                </Text>
                                <View className="flex-row items-center gap-3">
                                    <TouchableOpacity
                                        className="bg-primary-navy rounded-xl p-4"
                                        onPress={() => {
                                            setDrops(Math.max(MIN_DROPS, drops - 1));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="remove" size={24} color="#fff" />
                                    </TouchableOpacity>

                                    <View className="flex-1 bg-primary-navy rounded-xl p-4">
                                        <Text className="text-white text-center text-2xl font-bold">
                                            {drops}
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        className="bg-primary-navy rounded-xl p-4"
                                        onPress={() => {
                                            setDrops(Math.min(MAX_DROPS, drops + 1));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    >
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Nombre de tours */}
                            <View className="mb-4">
                                <Text className="text-white text-lg font-bold mb-3">
                                    NOMBRE DE TOURS
                                </Text>
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

                            {/* Temps de repos */}
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

                                    {/* Secondes */}
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
                            <View className="bg-amber-500/10 rounded-2xl p-4 mb-4 border border-amber-500">
                                <Text className="text-amber-500 font-bold mb-3">📝 RÉSUMÉ</Text>
                                <Text className="text-gray-400 text-sm mb-1">
                                    • {selectedExercise.name}
                                </Text>
                                <Text className="text-gray-400 text-sm mb-1">
                                    • {drops} drops (30kg → 25kg → 20kg...)
                                </Text>
                                <Text className="text-gray-400 text-sm mb-1">
                                    • {rounds} tour{rounds > 1 ? 's' : ''} au total
                                </Text>
                                <Text className="text-gray-400 text-sm">
                                    • {restMinutes}:{restSeconds.toString().padStart(2, '0')} de repos entre tours
                                </Text>
                            </View>

                            {/* Boutons */}
                            <TouchableOpacity
                                className="bg-amber-500 rounded-2xl p-5 mb-3"
                                onPress={handleCreateDropset}
                            >
                                <View className="flex-row items-center justify-center">
                                    <Ionicons
                                        name={isEditMode ? "checkmark-circle" : "trending-down"}
                                        size={24}
                                        color="#0a0e27"
                                    />
                                    <Text className="text-primary-dark text-xl font-bold ml-2">
                                        {isEditMode ? '✓ ENREGISTRER' : '🔻 CRÉER LE DROP SET'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </>
                    )}

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