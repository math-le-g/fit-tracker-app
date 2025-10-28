import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function LogRunScreen({ route, navigation }) {
    const [distance, setDistance] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');
    const [selectedRoute, setSelectedRoute] = useState(null);

    useEffect(() => {
        // Détecter quand on revient avec un parcours sélectionné
        if (route.params?.selectedRoute) {
            setSelectedRoute(route.params.selectedRoute);
            // Nettoyer le param pour éviter de le réappliquer
            navigation.setParams({ selectedRoute: undefined });
        }
    }, [route.params?.selectedRoute]);

    const calculatePace = () => {
        const dist = parseFloat(distance);
        const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

        if (dist > 0 && totalSeconds > 0) {
            const paceInSeconds = totalSeconds / dist;
            const paceMinutes = Math.floor(paceInSeconds / 60);
            const paceSeconds = Math.round(paceInSeconds % 60);
            return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
        }
        return '--:--';
    };

    const adjustValue = (field, delta) => {
        if (field === 'distance') {
            const current = parseFloat(distance) || 0;
            setDistance(Math.max(0, current + delta).toFixed(1));
        } else if (field === 'minutes') {
            const current = parseInt(minutes) || 0;
            setMinutes(Math.max(0, current + delta).toString());
        } else if (field === 'seconds') {
            const current = parseInt(seconds) || 0;
            let newSeconds = current + delta;
            if (newSeconds >= 60) {
                setMinutes((parseInt(minutes) || 0) + 1).toString();
                newSeconds = 0;
            } else if (newSeconds < 0) {
                if (parseInt(minutes) > 0) {
                    setMinutes((parseInt(minutes) - 1).toString());
                    newSeconds = 59;
                } else {
                    newSeconds = 0;
                }
            }
            setSeconds(newSeconds.toString());
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSave = () => {
        const dist = parseFloat(distance);
        const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

        if (dist > 0 && totalSeconds > 0) {
            const paceInSeconds = totalSeconds / dist;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            navigation.navigate('RunConfirmation', {
                distance: dist,
                duration: totalSeconds,
                pace: paceInSeconds,
                route: selectedRoute
            });
        }
    };

    const isValid = parseFloat(distance) > 0 && (parseInt(minutes) > 0 || parseInt(seconds) > 0);

    return (
        <ScrollView className="flex-1 bg-primary-dark">
            <View className="p-6">
                {/* Titre */}
                <Text className="text-white text-3xl font-bold mb-2">
                    🏃 Nouvelle course
                </Text>
                <Text className="text-gray-400 mb-6">
                    Enregistre ta sortie running
                </Text>

                {/* Distance */}
                <View className="bg-primary-navy rounded-2xl p-6 mb-4">
                    <Text className="text-gray-400 text-sm mb-3">📏 DISTANCE (km)</Text>

                    <View className="flex-row items-center justify-between mb-3">
                        <TouchableOpacity
                            className="bg-primary-dark rounded-xl p-3"
                            onPress={() => adjustValue('distance', -0.5)}
                        >
                            <Ionicons name="remove" size={24} color="#fff" />
                        </TouchableOpacity>

                        <TextInput
                            className="text-white text-5xl font-bold text-center flex-1 mx-4"
                            value={distance}
                            onChangeText={setDistance}
                            keyboardType="decimal-pad"
                            placeholder="0.0"
                            placeholderTextColor="#6b7280"
                        />

                        <TouchableOpacity
                            className="bg-primary-dark rounded-xl p-3"
                            onPress={() => adjustValue('distance', 0.5)}
                        >
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Ajustements fins ±0.1 km */}
                    <View className="flex-row justify-center gap-2 mb-3">
                        <TouchableOpacity
                            className="bg-primary-dark rounded-lg px-3 py-2"
                            onPress={() => adjustValue('distance', -0.1)}
                        >
                            <Text className="text-gray-400 font-semibold">-0.1</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-primary-dark rounded-lg px-3 py-2"
                            onPress={() => adjustValue('distance', 0.1)}
                        >
                            <Text className="text-gray-400 font-semibold">+0.1</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Boutons rapides */}
                    <View className="flex-row justify-center gap-2">
                        {[1, 5, 10].map(km => (
                            <TouchableOpacity
                                key={km}
                                className="bg-primary-dark rounded-lg px-3 py-2"
                                onPress={() => {
                                    setDistance(km.toString());
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Text className="text-gray-400 font-semibold">{km} km</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Temps */}
                <View className="bg-primary-navy rounded-2xl p-6 mb-4">
                    <Text className="text-gray-400 text-sm mb-3"><Text>⏱️</Text> TEMPS</Text>

                    <View className="flex-row items-center justify-center gap-2">
                        {/* Minutes */}
                        <View className="flex-1">
                            <TouchableOpacity
                                className="bg-primary-dark rounded-xl p-2 mb-2"
                                onPress={() => adjustValue('minutes', 1)}
                            >
                                <Ionicons name="chevron-up" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TextInput
                                className="text-white text-4xl font-bold text-center bg-primary-dark rounded-xl p-3"
                                value={minutes}
                                onChangeText={setMinutes}
                                keyboardType="number-pad"
                                placeholder="00"
                                placeholderTextColor="#6b7280"
                            />

                            <TouchableOpacity
                                className="bg-primary-dark rounded-xl p-2 mt-2"
                                onPress={() => adjustValue('minutes', -1)}
                            >
                                <Ionicons name="chevron-down" size={20} color="#fff" />
                            </TouchableOpacity>

                            <Text className="text-gray-400 text-center mt-2 text-sm">min</Text>
                        </View>

                        <Text className="text-white text-4xl font-bold">:</Text>

                        {/* Secondes */}
                        <View className="flex-1">
                            <TouchableOpacity
                                className="bg-primary-dark rounded-xl p-2 mb-2"
                                onPress={() => adjustValue('seconds', 5)}
                            >
                                <Ionicons name="chevron-up" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TextInput
                                className="text-white text-4xl font-bold text-center bg-primary-dark rounded-xl p-3"
                                value={seconds}
                                onChangeText={setSeconds}
                                keyboardType="number-pad"
                                placeholder="00"
                                placeholderTextColor="#6b7280"
                            />

                            <TouchableOpacity
                                className="bg-primary-dark rounded-xl p-2 mt-2"
                                onPress={() => adjustValue('seconds', -5)}
                            >
                                <Ionicons name="chevron-down" size={20} color="#fff" />
                            </TouchableOpacity>

                            <Text className="text-gray-400 text-center mt-2 text-sm">sec</Text>
                        </View>
                    </View>
                </View>

                {/* Allure calculée */}
                <View className="bg-accent-purple/10 rounded-2xl p-6 mb-4 border border-accent-purple/20">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-gray-400"><Text>⚡</Text> ALLURE CALCULÉE</Text>
                        <Text className="text-accent-purple text-3xl font-bold">
                            {calculatePace()} <Text className="text-lg">/km</Text>
                        </Text>
                    </View>
                </View>

                {/* Parcours */}
                <TouchableOpacity
                    className="bg-primary-navy rounded-2xl p-4 mb-6"
                    onPress={() => navigation.navigate('SelectRoute', {
                        distance: parseFloat(distance) || 0,

                    })}
                >
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-gray-400 text-sm mb-1"><Text>📍</Text> PARCOURS (optionnel)</Text>
                            <Text className="text-white font-semibold">
                                {selectedRoute ? selectedRoute.name : 'Aucun parcours sélectionné'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#6b7280" />
                    </View>
                </TouchableOpacity>

                {/* Bouton enregistrer */}
                <TouchableOpacity
                    className={`rounded-2xl p-5 ${isValid ? 'bg-success' : 'bg-gray-700'}`}
                    onPress={handleSave}
                    disabled={!isValid}
                >
                    <View className="flex-row items-center justify-center">
                        <Ionicons name="checkmark-circle" size={28} color={isValid ? "#0a0e27" : "#6b7280"} />
                        <Text className={`text-xl font-bold ml-2 ${isValid ? 'text-primary-dark' : 'text-gray-500'}`}>
                            ✓ ENREGISTRER
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}