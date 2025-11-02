import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function LogRunScreen({ route, navigation }) {
    const [distance, setDistance] = useState('');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');
    const [selectedRoute, setSelectedRoute] = useState(null);

    useEffect(() => {
        // Détecter quand on revient avec un parcours sélectionné
        if (route.params?.selectedRoute) {
            setSelectedRoute(route.params.selectedRoute);
            // Si le parcours a une distance, on la définit et elle devient non-modifiable
            if (route.params.selectedRoute.distance) {
                setDistance(route.params.selectedRoute.distance.toString());
            }
            // Nettoyer le param pour éviter de le réappliquer
            navigation.setParams({ selectedRoute: undefined });
        }
    }, [route.params?.selectedRoute]);

    // Validation de la distance (max 999.99 km, 2 décimales)
    const handleDistanceChange = (text) => {
        // Supprimer tout sauf les chiffres et le point
        let cleaned = text.replace(/[^0-9.]/g, '');
        
        // Ne garder qu'un seul point
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limiter à 2 décimales
        if (parts.length === 2 && parts[1].length > 2) {
            cleaned = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        // Limiter à 999.99 km max
        const value = parseFloat(cleaned);
        if (!isNaN(value) && value > 999.99) {
            cleaned = '999.99';
        }
        
        setDistance(cleaned);
    };

    // Validation des heures (max 99)
    const handleHoursChange = (text) => {
        // Seulement des chiffres
        let cleaned = text.replace(/[^0-9]/g, '');
        
        // Limiter à 99 heures
        const value = parseInt(cleaned);
        if (!isNaN(value) && value > 99) {
            cleaned = '99';
        }
        
        setHours(cleaned);
    };

    // Validation des minutes (max 999)
    const handleMinutesChange = (text) => {
        // Seulement des chiffres
        let cleaned = text.replace(/[^0-9]/g, '');
        
        // Limiter à 999 minutes
        const value = parseInt(cleaned);
        if (!isNaN(value) && value > 999) {
            cleaned = '999';
        }
        
        setMinutes(cleaned);
    };

    // Validation des secondes (max 59)
    const handleSecondsChange = (text) => {
        // Seulement des chiffres
        let cleaned = text.replace(/[^0-9]/g, '');
        
        // Limiter à 59 secondes
        const value = parseInt(cleaned);
        if (!isNaN(value) && value > 59) {
            cleaned = '59';
        }
        
        setSeconds(cleaned);
    };

    const calculatePace = () => {
        const dist = parseFloat(distance);
        const totalSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

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
            const newValue = Math.max(0, Math.min(999.99, current + delta));
            setDistance(newValue.toFixed(2));
        } else if (field === 'hours') {
            const current = parseInt(hours) || 0;
            const newValue = Math.max(0, Math.min(99, current + delta));
            setHours(newValue.toString());
        } else if (field === 'minutes') {
            const current = parseInt(minutes) || 0;
            let newMinutes = current + delta;
            
            if (newMinutes >= 60) {
                const currentHours = parseInt(hours) || 0;
                if (currentHours < 99) {
                    setHours((currentHours + 1).toString());
                    newMinutes = 0;
                } else {
                    newMinutes = 59;
                }
            } else if (newMinutes < 0) {
                const currentHours = parseInt(hours) || 0;
                if (currentHours > 0) {
                    setHours((currentHours - 1).toString());
                    newMinutes = 59;
                } else {
                    newMinutes = 0;
                }
            }
            setMinutes(newMinutes.toString());
        } else if (field === 'seconds') {
            const current = parseInt(seconds) || 0;
            let newSeconds = current + delta;
            
            if (newSeconds >= 60) {
                const currentMins = parseInt(minutes) || 0;
                if (currentMins < 59) {
                    setMinutes((currentMins + 1).toString());
                    newSeconds = 0;
                } else {
                    // Passer à l'heure supérieure
                    const currentHours = parseInt(hours) || 0;
                    if (currentHours < 99) {
                        setHours((currentHours + 1).toString());
                        setMinutes('0');
                        newSeconds = 0;
                    } else {
                        newSeconds = 59;
                    }
                }
            } else if (newSeconds < 0) {
                const currentMins = parseInt(minutes) || 0;
                if (currentMins > 0) {
                    setMinutes((currentMins - 1).toString());
                    newSeconds = 59;
                } else {
                    const currentHours = parseInt(hours) || 0;
                    if (currentHours > 0) {
                        setHours((currentHours - 1).toString());
                        setMinutes('59');
                        newSeconds = 59;
                    } else {
                        newSeconds = 0;
                    }
                }
            }
            setSeconds(newSeconds.toString());
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSave = () => {
        const dist = parseFloat(distance);
        const totalSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

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

    const isValid = parseFloat(distance) > 0 && ((parseInt(hours) || 0) > 0 || (parseInt(minutes) || 0) > 0 || (parseInt(seconds) || 0) > 0);

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

                {/* Parcours EN PREMIER (si utile) */}
                <View className="bg-primary-navy rounded-2xl p-4 mb-4 border border-accent-purple/30">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('SelectRoute', {
                            distance: parseFloat(distance) || 0,
                        })}
                        disabled={false}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="location" size={20} color="#b026ff" />
                                    <Text className="text-accent-purple text-sm font-bold ml-2">
                                        📍 PARCOURS
                                    </Text>
                                </View>
                                <Text className="text-white font-semibold text-base">
                                    {selectedRoute ? selectedRoute.name : 'Aucun parcours'}
                                </Text>
                                {selectedRoute && (
                                    <Text className="text-gray-400 text-sm mt-1">
                                        ~{selectedRoute.distance} km • {selectedRoute.terrain}
                                    </Text>
                                )}
                                {!selectedRoute && (
                                    <Text className="text-gray-400 text-sm mt-1">
                                        Optionnel - Compare tes performances
                                    </Text>
                                )}
                            </View>
                            
                            {selectedRoute ? (
                                <TouchableOpacity
                                    className="bg-danger/20 rounded-full p-2 ml-2"
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        setSelectedRoute(null);
                                        setDistance('');
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Ionicons name="close" size={24} color="#ff4444" />
                                </TouchableOpacity>
                            ) : (
                                <Ionicons name="chevron-forward" size={24} color="#6b7280" />
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Message si parcours sélectionné */}
                {selectedRoute && (
                    <View className="bg-accent-purple/10 rounded-2xl p-4 mb-4 border border-accent-purple/20">
                        <View className="flex-row items-start">
                            <Ionicons name="lock-closed" size={20} color="#b026ff" />
                            <View className="flex-1 ml-3">
                                <Text className="text-accent-purple text-sm font-bold mb-1">
                                    🔒 DISTANCE VERROUILLÉE
                                </Text>
                                <Text className="text-gray-400 text-xs">
                                    La distance est fixée à {selectedRoute.distance} km par le parcours "{selectedRoute.name}". Clique sur ❌ pour désélectionner le parcours.
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Distance */}
                <View className={`rounded-2xl p-6 mb-4 ${selectedRoute ? 'bg-gray-700 opacity-50' : 'bg-primary-navy'}`}>
                    <Text className="text-gray-400 text-sm mb-3">📏 DISTANCE (km)</Text>

                    <View className="flex-row items-center justify-between mb-3">
                        <TouchableOpacity
                            className="bg-primary-dark rounded-xl p-3"
                            onPress={() => !selectedRoute && adjustValue('distance', -0.5)}
                            disabled={!!selectedRoute}
                        >
                            <Ionicons name="remove" size={24} color={selectedRoute ? "#4b5563" : "#fff"} />
                        </TouchableOpacity>

                        <TextInput
                            className="text-white text-5xl font-bold text-center flex-1 mx-4"
                            value={distance}
                            onChangeText={handleDistanceChange}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#6b7280"
                            maxLength={6}
                            editable={!selectedRoute}
                        />

                        <TouchableOpacity
                            className="bg-primary-dark rounded-xl p-3"
                            onPress={() => !selectedRoute && adjustValue('distance', 0.5)}
                            disabled={!!selectedRoute}
                        >
                            <Ionicons name="add" size={24} color={selectedRoute ? "#4b5563" : "#fff"} />
                        </TouchableOpacity>
                    </View>

                    {/* Ajustements fins ±0.1 km */}
                    <View className="flex-row justify-center gap-2 mb-3">
                        <TouchableOpacity
                            className="bg-primary-dark rounded-lg px-3 py-2"
                            onPress={() => !selectedRoute && adjustValue('distance', -0.1)}
                            disabled={!!selectedRoute}
                        >
                            <Text className={`font-semibold ${selectedRoute ? 'text-gray-600' : 'text-gray-400'}`}>-0.1</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-primary-dark rounded-lg px-3 py-2"
                            onPress={() => !selectedRoute && adjustValue('distance', 0.1)}
                            disabled={!!selectedRoute}
                        >
                            <Text className={`font-semibold ${selectedRoute ? 'text-gray-600' : 'text-gray-400'}`}>+0.1</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Boutons rapides */}
                    <View className="flex-row justify-center gap-2">
                        {[1, 5, 10].map(km => (
                            <TouchableOpacity
                                key={km}
                                className="bg-primary-dark rounded-lg px-3 py-2"
                                onPress={() => {
                                    if (!selectedRoute) {
                                        setDistance(km.toString());
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                }}
                                disabled={!!selectedRoute}
                            >
                                <Text className={`font-semibold ${selectedRoute ? 'text-gray-600' : 'text-gray-400'}`}>{km} km</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Temps */}
                <View className="bg-primary-navy rounded-2xl p-6 mb-4">
                    <Text className="text-gray-400 text-sm mb-3">⏱️ TEMPS</Text>

                    <View className="flex-row items-center justify-center gap-2">
                        {/* Heures */}
                        <View className="flex-1">
                            <TouchableOpacity
                                className="bg-primary-dark rounded-xl p-2 mb-2"
                                onPress={() => adjustValue('hours', 1)}
                            >
                                <Ionicons name="chevron-up" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TextInput
                                className="text-white text-4xl font-bold text-center bg-primary-dark rounded-xl p-3"
                                value={hours}
                                onChangeText={handleHoursChange}
                                keyboardType="number-pad"
                                placeholder="00"
                                placeholderTextColor="#6b7280"
                                maxLength={2}
                            />

                            <TouchableOpacity
                                className="bg-primary-dark rounded-xl p-2 mt-2"
                                onPress={() => adjustValue('hours', -1)}
                            >
                                <Ionicons name="chevron-down" size={20} color="#fff" />
                            </TouchableOpacity>

                            <Text className="text-gray-400 text-center mt-2 text-sm">h</Text>
                        </View>

                        <Text className="text-white text-4xl font-bold">:</Text>

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
                                onChangeText={handleMinutesChange}
                                keyboardType="number-pad"
                                placeholder="00"
                                placeholderTextColor="#6b7280"
                                maxLength={3}
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
                                onPress={() => adjustValue('seconds', 1)}
                            >
                                <Ionicons name="chevron-up" size={20} color="#fff" />
                            </TouchableOpacity>

                            <TextInput
                                className="text-white text-4xl font-bold text-center bg-primary-dark rounded-xl p-3"
                                value={seconds}
                                onChangeText={handleSecondsChange}
                                keyboardType="number-pad"
                                placeholder="00"
                                placeholderTextColor="#6b7280"
                                maxLength={2}
                            />

                            <TouchableOpacity
                                className="bg-primary-dark rounded-xl p-2 mt-2"
                                onPress={() => adjustValue('seconds', -1)}
                            >
                                <Ionicons name="chevron-down" size={20} color="#fff" />
                            </TouchableOpacity>

                            <Text className="text-gray-400 text-center mt-2 text-sm">sec</Text>
                        </View>
                    </View>
                </View>

                {/* Allure calculée */}
                <View className="bg-accent-purple/10 rounded-2xl p-6 mb-6 border border-accent-purple/20">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <Ionicons name="flash" size={24} color="#b026ff" />
                            <Text className="text-gray-400 ml-2">ALLURE CALCULÉE</Text>
                        </View>
                        <Text className="text-accent-purple text-3xl font-bold">
                            {calculatePace()} <Text className="text-lg">/km</Text>
                        </Text>
                    </View>
                </View>

                {/* Info parcours */}
                {!selectedRoute && (
                    <View className="bg-primary-navy rounded-2xl p-4 mb-6">
                        <View className="flex-row items-start">
                            <Ionicons name="information-circle" size={20} color="#00f5ff" />
                            <View className="flex-1 ml-3">
                                <Text className="text-accent-cyan text-sm font-bold mb-1">
                                    💡 ASTUCE PARCOURS
                                </Text>
                                <Text className="text-gray-400 text-xs">
                                    Sélectionne un parcours pour comparer automatiquement tes performances à chaque fois que tu cours sur ce trajet !
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

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