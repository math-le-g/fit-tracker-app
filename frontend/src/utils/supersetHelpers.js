/**
 * Helper pour obtenir le nom et l'icône d'un superset selon le nombre d'exercices
 */
export const getSupersetInfo = (exerciseCount) => {
  if (exerciseCount === 2) {
    return {
      name: 'SUPERSET',
      emoji: '🔥',
      icon: 'flash',
      color: '#00f5ff', // cyan
      bgColor: 'bg-accent-cyan',
      borderColor: 'border-accent-cyan',
      textColor: 'text-accent-cyan'
    };
  } else if (exerciseCount === 3) {
    return {
      name: 'TRISET',
      emoji: '⚡',
      icon: 'layers',
      color: '#b026ff', // violet
      bgColor: 'bg-accent-purple',
      borderColor: 'border-accent-purple',
      textColor: 'text-accent-purple'
    };
  } else {
    // 4-5 exercices
    return {
      name: 'GIANT SET',
      emoji: '🌪️',
      icon: 'thunderstorm',
      color: '#ff6b35', // orange
      bgColor: 'bg-danger',
      borderColor: 'border-danger',
      textColor: 'text-danger'
    };
  }
};

/**
 * Vérifie si un item est un superset/triset/giant set
 */
export const isSuperset = (item) => {
  return item?.type === 'superset';
};

/**
 * Obtient le nom court (pour affichage compact)
 */
export const getSupersetShortName = (exerciseCount) => {
  if (exerciseCount === 2) return 'Superset';
  if (exerciseCount === 3) return 'Triset';
  return 'Giant Set';
};