import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { db } from '../database/database';
import { getBadgeStats } from '../utils/badgeSystem';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function BadgesScreen() {
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, percentage: 0 });
  const [filter, setFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'

  useFocusEffect(
    useCallback(() => {
      loadBadges();
    }, [filter])
  );

  const loadBadges = async () => {
    try {
      const badgeStats = await getBadgeStats();
      setStats(badgeStats);

      let query = 'SELECT * FROM badges';
      if (filter === 'unlocked') query += ' WHERE unlocked = 1';
      else if (filter === 'locked') query += ' WHERE unlocked = 0';
      query += ' ORDER BY unlocked DESC, category, target ASC';

      const allBadges = await db.getAllAsync(query);
      setBadges(allBadges);
    } catch (error) {
      console.error('Erreur chargement badges:', error);
    }
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'workout': return '💪';
      case 'run':     return '🏃';
      case 'streak':  return '🔥';
      case 'volume':  return '🏋️';
      case 'progress':return '📈';
      case 'level':   return '⭐';
      default:        return '🏅';
    }
  };

  const getCategoryText = (category) => {
    switch (category) {
      case 'workout': return 'Musculation';
      case 'run':     return 'Course';
      case 'streak':  return 'Régularité';
      case 'volume':  return 'Volume';
      case 'progress':return 'Progression';
      case 'level':   return 'Niveau';
      default:        return String(category || '');
    }
  };

  const groupedBadges = badges.reduce((acc, b) => {
    const key = b.category || 'autres';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <ScrollView className="flex-1 bg-primary-dark">
      <View className="p-6">
        {/* Titre */}
        <Text className="text-white text-3xl font-bold mb-2">
          <Text>🏆 </Text>
          <Text>Badges</Text>
        </Text>
        <Text className="text-gray-400 mb-6">
          <Text>Collection de tes accomplissements</Text>
        </Text>

        {/* Stats */}
        <View className="bg-primary-navy rounded-2xl p-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-400 text-sm">PROGRESSION</Text>
              <Text className="text-white text-3xl font-bold">
                {stats.unlocked}/{stats.total}
              </Text>
            </View>

            <View className="items-center">
              <View className="w-24 h-24 rounded-full bg-primary-dark items-center justify-center border-4 border-accent-cyan">
                <Text className="text-accent-cyan text-2xl font-bold">
                  {stats.percentage}%
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-primary-dark rounded-full h-3 overflow-hidden">
            <View className="bg-accent-cyan h-full" style={{ width: `${stats.percentage}%` }} />
          </View>
        </View>

        {/* Filtres */}
        <View className="flex-row gap-2 mb-6">
          {['all', 'unlocked', 'locked'].map((f) => (
            <TouchableOpacity
              key={f}
              className={`flex-1 rounded-xl p-3 ${filter === f ? 'bg-accent-cyan' : 'bg-primary-navy'}`}
              onPress={() => setFilter(f)}
            >
              <Text className={`text-center font-bold ${filter === f ? 'text-primary-dark' : 'text-gray-400'}`}>
                {f === 'all' ? 'Tous' : f === 'unlocked' ? 'Débloqués' : 'Verrouillés'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Badges par catégorie */}
        {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
          <View key={category} className="mb-6">
            <Text className="text-white text-xl font-bold mb-3">
              <Text>{getCategoryEmoji(category)} </Text>
              <Text>{getCategoryText(category)}</Text>
            </Text>

            {categoryBadges.map((badge) => (
              <View
                key={badge.id}
                className={`rounded-2xl p-4 mb-3 ${
                  badge.unlocked
                    ? 'bg-accent-cyan/10 border border-accent-cyan'
                    : 'bg-primary-navy opacity-50'
                }`}
              >
                <View className="flex-row items-center">
                  <View className={`${badge.unlocked ? 'bg-accent-cyan' : 'bg-primary-dark'} w-16 h-16 rounded-full items-center justify-center`}>
                    <Text className="text-4xl">{badge.icon || '🏅'}</Text>
                  </View>

                  <View className="flex-1 ml-4">
                    <Text className={`text-lg font-bold ${badge.unlocked ? 'text-white' : 'text-gray-500'}`}>
                      {badge.name || ''}
                    </Text>

                    <Text className="text-gray-400 text-sm mb-2">
                      {badge.description || ''}
                    </Text>

                    {!badge.unlocked && (
                      <View>
                        <View className="flex-row items-center mb-1">
                          <Text className="text-gray-400 text-xs">
                            {`${badge.progress}/${badge.target}`}
                          </Text>
                        </View>
                        <View className="bg-primary-dark rounded-full h-2 overflow-hidden">
                          <View
                            className="bg-gray-600 h-full"
                            style={{ width: `${Math.min((badge.progress / badge.target) * 100, 100)}%` }}
                          />
                        </View>
                      </View>
                    )}

                    {badge.unlocked && badge.unlocked_at && (
                      <Text className="text-accent-cyan text-xs">
                        {`✓ Débloqué le ${new Date(badge.unlocked_at).toLocaleDateString()}`}
                      </Text>
                    )}
                  </View>

                  {badge.unlocked ? (
                    <Ionicons name="checkmark-circle" size={32} color="#00f5ff" />
                  ) : (
                    <View />
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {badges.length === 0 && (
          <View className="bg-primary-navy rounded-2xl p-6">
            <Text className="text-gray-400 text-center">
              Aucun badge dans cette catégorie
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

