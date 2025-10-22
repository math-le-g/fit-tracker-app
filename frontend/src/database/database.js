import * as SQLite from 'expo-sqlite';

// Ouvrir la base de données
export const db = SQLite.openDatabaseSync('fittracker.db');

// Initialiser la base de données
export const initDatabase = async () => {
  try {
    // Table utilisateur
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        last_workout_date TEXT,
        vacation_days_used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insérer l'utilisateur par défaut s'il n'existe pas
    const users = await db.getAllAsync('SELECT * FROM user');
    if (users.length === 0) {
      await db.runAsync(`
        INSERT INTO user (xp, level, streak, best_streak) 
        VALUES (0, 1, 0, 0)
      `);
    }

    // Table exercices
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        equipment TEXT,
        default_rest_time INTEGER DEFAULT 90,
        is_custom INTEGER DEFAULT 0
      );
    `);

    // Table séances
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT,
        warmup_duration INTEGER DEFAULT 0,
        workout_duration INTEGER DEFAULT 0,
        total_volume INTEGER DEFAULT 0,
        total_sets INTEGER DEFAULT 0,
        xp_gained INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table séries
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        weight REAL,
        reps INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(workout_id) REFERENCES workouts(id),
        FOREIGN KEY(exercise_id) REFERENCES exercises(id)
      );
    `);

    // Table courses
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        distance REAL NOT NULL,
        duration INTEGER NOT NULL,
        pace REAL NOT NULL,
        route_id INTEGER,
        xp_gained INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(route_id) REFERENCES routes(id)
      );
    `);

    // Table parcours
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        distance REAL,
        terrain TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table badges
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_type TEXT NOT NULL,
        unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        xp_reward INTEGER DEFAULT 0
      );
    `);

    // Table routines
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table routine_exercises (exercices d'une routine)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS routine_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        sets INTEGER DEFAULT 3,
        rest_time INTEGER DEFAULT 90,
        FOREIGN KEY(routine_id) REFERENCES routines(id),
        FOREIGN KEY(exercise_id) REFERENCES exercises(id)
      );
    `);

    // Pré-charger les 57 exercices
    await loadDefaultExercises();

    // Pré-charger les routines par défaut
    await loadDefaultRoutines();

    console.log('✅ Base de données initialisée avec succès !');
  } catch (error) {
    console.error('❌ Erreur initialisation BDD:', error);
  }
};

// Pré-charger les 57 exercices
const loadDefaultExercises = async () => {
  const count = await db.getFirstAsync('SELECT COUNT(*) as count FROM exercises');
  
  if (count.count > 0) {
    console.log('✅ Exercices déjà chargés');
    return;
  }

  const exercises = [
    // PECTORAUX (7)
    { name: 'Développé Couché', muscle_group: 'Pectoraux', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Développé Incliné', muscle_group: 'Pectoraux', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Développé Décliné', muscle_group: 'Pectoraux', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Développé Couché Haltères', muscle_group: 'Pectoraux', equipment: 'Haltères', default_rest_time: 90 },
    { name: 'Écarté Haltères', muscle_group: 'Pectoraux', equipment: 'Haltères', default_rest_time: 50 },
    { name: 'Écarté Poulie', muscle_group: 'Pectoraux', equipment: 'Poulie', default_rest_time: 50 },
    { name: 'Pompes', muscle_group: 'Pectoraux', equipment: 'Poids du corps', default_rest_time: 60 },

    // DOS (9)
    { name: 'Tractions', muscle_group: 'Dos', equipment: 'Poids du corps', default_rest_time: 90 },
    { name: 'Rowing Barre', muscle_group: 'Dos', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Rowing Haltère', muscle_group: 'Dos', equipment: 'Haltères', default_rest_time: 90 },
    { name: 'Rowing T-Bar', muscle_group: 'Dos', equipment: 'Machine', default_rest_time: 90 },
    { name: 'Tirage Vertical', muscle_group: 'Dos', equipment: 'Poulie', default_rest_time: 60 },
    { name: 'Tirage Horizontal', muscle_group: 'Dos', equipment: 'Poulie', default_rest_time: 60 },
    { name: 'Pull-over', muscle_group: 'Dos', equipment: 'Haltère', default_rest_time: 60 },
    { name: 'Soulevé de Terre', muscle_group: 'Dos', equipment: 'Barre', default_rest_time: 120 },
    { name: 'Shrugs', muscle_group: 'Dos', equipment: 'Haltères', default_rest_time: 60 },

    // ÉPAULES (7)
    { name: 'Développé Militaire', muscle_group: 'Épaules', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Développé Haltères', muscle_group: 'Épaules', equipment: 'Haltères', default_rest_time: 90 },
    { name: 'Élévations Latérales', muscle_group: 'Épaules', equipment: 'Haltères', default_rest_time: 50 },
    { name: 'Élévations Frontales', muscle_group: 'Épaules', equipment: 'Haltères', default_rest_time: 50 },
    { name: 'Oiseau Haltères', muscle_group: 'Épaules', equipment: 'Haltères', default_rest_time: 50 },
    { name: 'Face Pull', muscle_group: 'Épaules', equipment: 'Poulie', default_rest_time: 50 },
    { name: 'Tirage Menton', muscle_group: 'Épaules', equipment: 'Barre', default_rest_time: 60 },

    // BICEPS (6)
    { name: 'Curl Barre', muscle_group: 'Biceps', equipment: 'Barre', default_rest_time: 60 },
    { name: 'Curl Haltères', muscle_group: 'Biceps', equipment: 'Haltères', default_rest_time: 60 },
    { name: 'Curl Marteau', muscle_group: 'Biceps', equipment: 'Haltères', default_rest_time: 60 },
    { name: 'Curl Pupitre', muscle_group: 'Biceps', equipment: 'Haltère', default_rest_time: 60 },
    { name: 'Curl Incliné', muscle_group: 'Biceps', equipment: 'Haltères', default_rest_time: 60 },
    { name: 'Curl Poulie', muscle_group: 'Biceps', equipment: 'Poulie', default_rest_time: 50 },

    // TRICEPS (7)
    { name: 'Dips', muscle_group: 'Triceps', equipment: 'Poids du corps', default_rest_time: 90 },
    { name: 'Extensions Poulie', muscle_group: 'Triceps', equipment: 'Poulie', default_rest_time: 50 },
    { name: 'Extensions Nuque', muscle_group: 'Triceps', equipment: 'Haltère', default_rest_time: 60 },
    { name: 'Kickback', muscle_group: 'Triceps', equipment: 'Haltères', default_rest_time: 50 },
    { name: 'Développé Serré', muscle_group: 'Triceps', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Extensions Corde', muscle_group: 'Triceps', equipment: 'Poulie', default_rest_time: 50 },
    { name: 'Barre au Front', muscle_group: 'Triceps', equipment: 'Barre', default_rest_time: 60 },

    // JAMBES (15)
    { name: 'Squat', muscle_group: 'Jambes', equipment: 'Barre', default_rest_time: 120 },
    { name: 'Squat Avant', muscle_group: 'Jambes', equipment: 'Barre', default_rest_time: 120 },
    { name: 'Presse à Cuisses', muscle_group: 'Jambes', equipment: 'Machine', default_rest_time: 90 },
    { name: 'Fentes', muscle_group: 'Jambes', equipment: 'Haltères', default_rest_time: 60 },
    { name: 'Leg Extension', muscle_group: 'Jambes', equipment: 'Machine', default_rest_time: 60 },
    { name: 'Leg Curl', muscle_group: 'Jambes', equipment: 'Machine', default_rest_time: 60 },
    { name: 'Soulevé de Terre Roumain', muscle_group: 'Jambes', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Hip Thrust', muscle_group: 'Jambes', equipment: 'Barre', default_rest_time: 90 },
    { name: 'Bulgarian Split Squat', muscle_group: 'Jambes', equipment: 'Haltères', default_rest_time: 60 },
    { name: 'Mollets Debout', muscle_group: 'Jambes', equipment: 'Machine', default_rest_time: 50 },
    { name: 'Mollets Assis', muscle_group: 'Jambes', equipment: 'Machine', default_rest_time: 50 },
    { name: 'Hack Squat', muscle_group: 'Jambes', equipment: 'Machine', default_rest_time: 90 },
    { name: 'Goblet Squat', muscle_group: 'Jambes', equipment: 'Haltère', default_rest_time: 60 },
    { name: 'Step-up', muscle_group: 'Jambes', equipment: 'Haltères', default_rest_time: 60 },
    { name: 'Adducteurs', muscle_group: 'Jambes', equipment: 'Machine', default_rest_time: 50 },

    // ABDOMINAUX (6)
    { name: 'Crunch', muscle_group: 'Abdominaux', equipment: 'Poids du corps', default_rest_time: 45 },
    { name: 'Planche', muscle_group: 'Abdominaux', equipment: 'Poids du corps', default_rest_time: 45 },
    { name: 'Relevé de Jambes', muscle_group: 'Abdominaux', equipment: 'Poids du corps', default_rest_time: 45 },
    { name: 'Russian Twist', muscle_group: 'Abdominaux', equipment: 'Poids', default_rest_time: 45 },
    { name: 'Ab Wheel', muscle_group: 'Abdominaux', equipment: 'Roue', default_rest_time: 60 },
    { name: 'Mountain Climbers', muscle_group: 'Abdominaux', equipment: 'Poids du corps', default_rest_time: 45 },
  ];

  for (const exercise of exercises) {
    await db.runAsync(
      'INSERT INTO exercises (name, muscle_group, equipment, default_rest_time, is_custom) VALUES (?, ?, ?, ?, 0)',
      [exercise.name, exercise.muscle_group, exercise.equipment, exercise.default_rest_time]
    );
  }

  console.log('✅ 57 exercices chargés avec succès !');
};

// Pré-charger les routines par défaut
const loadDefaultRoutines = async () => {
  const count = await db.getFirstAsync('SELECT COUNT(*) as count FROM routines');
  
  if (count.count > 0) {
    console.log('✅ Routines déjà chargées');
    return;
  }

  // Routine PUSH
  await db.runAsync(
    'INSERT INTO routines (name, type) VALUES (?, ?)',
    ['Push (Pectoraux/Épaules/Triceps)', 'push']
  );
  const pushId = (await db.getFirstAsync('SELECT last_insert_rowid() as id')).id;

  // Exercices Push
  const pushExercises = [
    { exercise: 'Développé Couché', sets: 4, rest: 90 },
    { exercise: 'Développé Incliné', sets: 3, rest: 90 },
    { exercise: 'Écarté Haltères', sets: 3, rest: 50 },
    { exercise: 'Élévations Latérales', sets: 4, rest: 50 },
    { exercise: 'Extensions Poulie', sets: 3, rest: 50 }
  ];

  for (let i = 0; i < pushExercises.length; i++) {
    const ex = pushExercises[i];
    const exerciseId = (await db.getFirstAsync(
      'SELECT id FROM exercises WHERE name = ?',
      [ex.exercise]
    )).id;

    await db.runAsync(
      'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time) VALUES (?, ?, ?, ?, ?)',
      [pushId, exerciseId, i, ex.sets, ex.rest]
    );
  }

  // Routine PULL
  await db.runAsync(
    'INSERT INTO routines (name, type) VALUES (?, ?)',
    ['Pull (Dos/Biceps)', 'pull']
  );
  const pullId = (await db.getFirstAsync('SELECT last_insert_rowid() as id')).id;

  const pullExercises = [
    { exercise: 'Tractions', sets: 4, rest: 90 },
    { exercise: 'Rowing Barre', sets: 4, rest: 90 },
    { exercise: 'Tirage Vertical', sets: 3, rest: 60 },
    { exercise: 'Tirage Horizontal', sets: 3, rest: 60 },
    { exercise: 'Curl Barre', sets: 3, rest: 60 },
    { exercise: 'Curl Marteau', sets: 3, rest: 60 }
  ];

  for (let i = 0; i < pullExercises.length; i++) {
    const ex = pullExercises[i];
    const exerciseId = (await db.getFirstAsync(
      'SELECT id FROM exercises WHERE name = ?',
      [ex.exercise]
    )).id;

    await db.runAsync(
      'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time) VALUES (?, ?, ?, ?, ?)',
      [pullId, exerciseId, i, ex.sets, ex.rest]
    );
  }

  // Routine LEGS
  await db.runAsync(
    'INSERT INTO routines (name, type) VALUES (?, ?)',
    ['Legs (Jambes)', 'legs']
  );
  const legsId = (await db.getFirstAsync('SELECT last_insert_rowid() as id')).id;

  const legsExercises = [
    { exercise: 'Squat', sets: 4, rest: 120 },
    { exercise: 'Presse à Cuisses', sets: 3, rest: 90 },
    { exercise: 'Leg Extension', sets: 3, rest: 60 },
    { exercise: 'Leg Curl', sets: 3, rest: 60 },
    { exercise: 'Soulevé de Terre Roumain', sets: 3, rest: 90 },
    { exercise: 'Mollets Debout', sets: 4, rest: 50 }
  ];

  for (let i = 0; i < legsExercises.length; i++) {
    const ex = legsExercises[i];
    const exerciseId = (await db.getFirstAsync(
      'SELECT id FROM exercises WHERE name = ?',
      [ex.exercise]
    )).id;

    await db.runAsync(
      'INSERT INTO routine_exercises (routine_id, exercise_id, order_index, sets, rest_time) VALUES (?, ?, ?, ?, ?)',
      [legsId, exerciseId, i, ex.sets, ex.rest]
    );
  }

  console.log('✅ 3 routines par défaut chargées (Push/Pull/Legs)');
};