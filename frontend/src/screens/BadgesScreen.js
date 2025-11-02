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
    <View style={{ flex: 1, backgroundColor: '#0a1628' }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          {/* Sous-titre */}
          <Text style={{ color: '#a8a8a0', fontSize: 16, marginBottom: 24 }}>
            Collection de tes accomplissements
          </Text>

          {/* Stats progression */}
          <View style={{
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            borderRadius: 24,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(212, 175, 55, 0.3)'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ color: '#a8a8a0', fontSize: 14 }}>PROGRESSION</Text>
                <Text style={{ color: '#f5f5f0', fontSize: 32, fontWeight: 'bold' }}>
                  {stats.unlocked}/{stats.total}
                </Text>
              </View>

              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(10, 14, 39, 0.8)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 4,
                  borderColor: '#d4af37'
                }}>
                  <Text style={{ color: '#d4af37', fontSize: 24, fontWeight: 'bold' }}>
                    {stats.percentage}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={{
              width: '100%',
              height: 12,
              backgroundColor: 'rgba(10, 14, 39, 0.8)',
              borderRadius: 6,
              overflow: 'hidden'
            }}>
              <View style={{
                width: `${stats.percentage}%`,
                height: '100%',
                backgroundColor: '#d4af37',
                borderRadius: 6
              }} />
            </View>
          </View>

          {/* Filtres */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            {['all', 'unlocked', 'locked'].map((f) => (
              <TouchableOpacity
                key={f}
                style={{
                  flex: 1,
                  backgroundColor: filter === f ? 'rgba(0, 245, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: filter === f ? 'rgba(0, 245, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'
                }}
                onPress={() => setFilter(f)}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: filter === f ? '#00f5ff' : '#a8a8a0'
                }}>
                  {f === 'all' ? 'Tous' : f === 'unlocked' ? 'Débloqués' : 'Verrouillés'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Badges par catégorie */}
          {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
            <View key={category} style={{ marginBottom: 20 }}>
              <Text style={{ color: '#f5f5f0', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                {getCategoryEmoji(category)} {getCategoryText(category)}
              </Text>

              {categoryBadges.map((badge) => (
                <View
                  key={badge.id}
                  style={{
                    backgroundColor: badge.unlocked 
                      ? 'rgba(0, 245, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: badge.unlocked 
                      ? 'rgba(0, 245, 255, 0.3)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    opacity: badge.unlocked ? 1 : 0.6
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: badge.unlocked ? '#00f5ff' : 'rgba(10, 14, 39, 0.8)',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: 32 }}>{badge.icon || '🏅'}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: badge.unlocked ? '#f5f5f0' : '#6b7280',
                        marginBottom: 4
                      }}>
                        {badge.name || ''}
                      </Text>

                      <Text style={{ color: '#a8a8a0', fontSize: 14, marginBottom: 8 }}>
                        {badge.description || ''}
                      </Text>

                      {!badge.unlocked && (
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ color: '#a8a8a0', fontSize: 12 }}>
                              {badge.progress}/{badge.target}
                            </Text>
                          </View>
                          <View style={{
                            backgroundColor: 'rgba(10, 14, 39, 0.8)',
                            borderRadius: 4,
                            height: 8,
                            overflow: 'hidden'
                          }}>
                            <View
                              style={{
                                backgroundColor: '#6b7280',
                                height: '100%',
                                width: `${Math.min((badge.progress / badge.target) * 100, 100)}%`
                              }}
                            />
                          </View>
                        </View>
                      )}

                      {badge.unlocked && badge.unlocked_at && (
                        <Text style={{ color: '#00f5ff', fontSize: 12 }}>
                          ✓ Débloqué le {new Date(badge.unlocked_at).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    {badge.unlocked && (
                      <Ionicons name="checkmark-circle" size={28} color="#00f5ff" />
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}

          {badges.length === 0 && (
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}>
              <Text style={{ color: '#a8a8a0', textAlign: 'center' }}>
                Aucun badge dans cette catégorie
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

