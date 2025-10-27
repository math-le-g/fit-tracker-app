import { db } from '../database/database';
import * as Haptics from 'expo-haptics';

export const checkAndUnlockBadges = async () => {
    try {
        const unlockedBadges = [];

        // Récupérer les stats globales
        const user = await db.getFirstAsync('SELECT * FROM user WHERE id = 1');
        const workoutCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM workouts');
        const runCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM runs');

        const totalDistance = await db.getFirstAsync('SELECT SUM(distance) as total FROM runs');
        const distanceTotal = totalDistance?.total || 0;

        const sets = await db.getAllAsync('SELECT weight, reps FROM sets');
        const volumeTotal = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);

        // Compter les records (exercices où la charge actuelle = meilleure charge)
        const exercises = await db.getAllAsync('SELECT DISTINCT exercise_id FROM sets');
        let prCount = 0;
        for (const ex of exercises) {
            const maxWeight = await db.getFirstAsync(
                'SELECT MAX(weight) as max FROM sets WHERE exercise_id = ?',
                [ex.exercise_id]
            );
            const lastWeight = await db.getFirstAsync(
                'SELECT weight FROM sets WHERE exercise_id = ? ORDER BY id DESC LIMIT 1',
                [ex.exercise_id]
            );
            if (lastWeight && lastWeight.weight === maxWeight.max) {
                prCount++;
            }
        }

        // Charger tous les badges non débloqués
        const badges = await db.getAllAsync('SELECT * FROM badges WHERE unlocked = 0');

        for (const badge of badges) {
            let shouldUnlock = false;
            let progress = 0;

            switch (badge.category) {
                case 'workout':
                    progress = workoutCount.count;
                    shouldUnlock = progress >= badge.target;
                    break;

                case 'run':
                    progress = runCount.count;
                    shouldUnlock = progress >= badge.target;
                    break;

                case 'streak':
                    progress = user.streak;
                    shouldUnlock = progress >= badge.target;
                    break;

                case 'volume':
                    progress = Math.floor(volumeTotal);
                    shouldUnlock = progress >= badge.target;
                    break;

                case 'progress':
                    progress = prCount;
                    shouldUnlock = progress >= badge.target;
                    break;

                case 'level':
                    progress = user.level;
                    shouldUnlock = progress >= badge.target;
                    break;

                default:
                    break;
            }

            // Mettre à jour la progression
            await db.runAsync(
                'UPDATE badges SET progress = ? WHERE id = ?',
                [progress, badge.id]
            );

            // Débloquer si objectif atteint
            if (shouldUnlock) {
                console.log(`🏆 Déblocage badge: ${badge.name} (ID: ${badge.id})`);

                const unlockDate = new Date().toISOString();

                await db.runAsync(
                    'UPDATE badges SET unlocked = 1, unlocked_at = ? WHERE id = ?',
                    [unlockDate, badge.id]
                );

                // Mettre à jour l'objet badge avant de le push
                badge.unlocked = 1;
                badge.unlocked_at = unlockDate;

                unlockedBadges.push(badge);
                console.log(`✅ Badge débloqué:`, badge.name);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }

        return unlockedBadges;

    } catch (error) {
        console.error('Erreur vérification badges:', error);
        return [];
    }
};

export const getBadgeStats = async () => {
    try {
        const total = await db.getFirstAsync('SELECT COUNT(*) as count FROM badges');
        const unlocked = await db.getFirstAsync('SELECT COUNT(*) as count FROM badges WHERE unlocked = 1');

        return {
            total: total.count,
            unlocked: unlocked.count,
            percentage: Math.round((unlocked.count / total.count) * 100)
        };
    } catch (error) {
        console.error('Erreur stats badges:', error);
        return { total: 0, unlocked: 0, percentage: 0 };
    }
};
