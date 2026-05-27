// ─── Personal Profile ─────────────────────────────────────────────────────────
const PROFILE = {
  name: 'Glen',
  heightCm: 184,
  startWeightKg: 95.8,
  targetWeightKg: 89,
  startBodyFatPct: 23.2,
  startWaistCm: 100,
  startDate: '2026-05-27',
  bpSystolic: 130,
  bpDiastolic: 78,
};

// ─── Calorie / Macro Targets ──────────────────────────────────────────────────
const NUTRITION_TARGETS = {
  trainingDay: { kcal: 2550, protein: 195, carbs: 260, fat: 73 },
  restDay:     { kcal: 2275, protein: 195, carbs: 180, fat: 78 },
  proteinPerMeal: { min: 35, max: 50 },
};

// ─── Supplements ──────────────────────────────────────────────────────────────
const SUPPLEMENTS = [
  { name: 'Creatine monohydrate', dose: '3–5 g', timing: 'Any time, daily', why: 'Best-supported ergogenic for strength & lean mass' },
  { name: 'Whey / Casein protein', dose: '25–40 g', timing: 'Post-lift or before bed', why: 'Hits 180–210 g/day protein target' },
  { name: 'Vitamin D', dose: '10 mcg', timing: 'With a meal', why: 'UK default for autumn/winter; sun-exposure insurance' },
  { name: 'Algal omega-3', dose: '250–500 mg EPA+DHA', timing: 'With food', why: 'EPA/DHA alternative since you dislike fish/seafood' },
];

// ─── Workout Sessions ─────────────────────────────────────────────────────────
const SESSIONS = {
  A: {
    label: 'Session A',
    focus: 'Squat · Chest · Row',
    exercises: [
      { name: 'Safety-bar Squat / Front Squat / Leg Press', sets: '3–4', reps: '5–8', note: 'Controlled eccentric' },
      { name: 'DB Bench Press / Machine Chest Press',       sets: '3–4', reps: '6–10', note: 'Neutral or semi-neutral grip' },
      { name: 'Chest-supported Row',                        sets: '3–4', reps: '8–12', note: 'Pause at contraction' },
      { name: 'Romanian Deadlift',                          sets: '3',   reps: '6–10', note: 'Hips back, ribs down' },
      { name: 'Rear-foot-elevated Split Squat',             sets: '2–3', reps: '8–12 /side', note: 'Moderate load' },
      { name: 'Cable Lateral Raise',                        sets: '2–3', reps: '12–15', note: 'Scapula controlled' },
      { name: 'Pallof Press / Dead Bug',                    sets: '2–3', reps: '8–12', note: 'Anti-rotation focus' },
      { name: 'Bike/Rower Finisher',                        sets: '1',   reps: '6–8 min', note: '30 s hard / 60 s easy' },
    ]
  },
  B: {
    label: 'Session B',
    focus: 'Deadlift · Press · Pull',
    exercises: [
      { name: 'Trap-bar Deadlift / Conventional Deadlift', sets: '3–4', reps: '4–6',  note: 'Crisp reps, no grinders' },
      { name: 'Incline DB Press / Landmine Press',         sets: '3–4', reps: '6–10', note: 'Shoulder-friendly pressing' },
      { name: 'Lat Pulldown / Assisted Chin-up',           sets: '3–4', reps: '6–10', note: 'Full stretch' },
      { name: 'Leg Press / Hack Squat',                    sets: '3',   reps: '8–12', note: 'Quads hard' },
      { name: 'Seated Hamstring Curl',                     sets: '2–3', reps: '10–15', note: 'Full squeeze' },
      { name: 'Face Pull / Cable Y-raise',                 sets: '2–3', reps: '12–15', note: 'Posture bias' },
      { name: 'Farmer Carry',                              sets: '3',   reps: '30–40 m', note: 'Ribcage stacked' },
      { name: 'Easy Cardio Cooldown',                      sets: '1',   reps: '5–10 min', note: 'Nose-breathing pace' },
    ]
  },
  C: {
    label: 'Session C',
    focus: 'Glutes · Push · Arms',
    exercises: [
      { name: 'Goblet Squat / Front Squat',           sets: '3',   reps: '8–10', note: 'Quality over load' },
      { name: 'Hip Thrust / 45° Back Extension',       sets: '3',   reps: '8–12', note: 'Glute focus' },
      { name: 'One-arm Cable Row / Low Row',           sets: '3',   reps: '8–12', note: 'Scapular control' },
      { name: 'Push-up Progression / Machine Press',   sets: '3',   reps: '8–15', note: 'Leave 1–2 reps in reserve' },
      { name: 'Walking Lunge',                         sets: '2–3', reps: '10–12 /side', note: 'Light to moderate' },
      { name: 'Cable Curl superset Rope Pressdown',    sets: '2–3', reps: '10–15 each', note: 'Optional arm volume' },
      { name: 'Sled Push / Bike Intervals',            sets: '1',   reps: '8–10 min', note: 'Short, hard, low skill' },
    ]
  }
};

// ─── Running Plan ─────────────────────────────────────────────────────────────
const RUNNING_PHASES = [
  { weeks: '1–4',  easyRun: '30–45 min zone 2', qualityRun: '6 × 1 min hard / 2 min easy' },
  { weeks: '5–8',  easyRun: '30–45 min zone 2', qualityRun: '3 × 6 min tempo / 3 min easy' },
  { weeks: '9',    easyRun: '30–45 min easy only', qualityRun: 'No hard running — deload' },
  { weeks: '10–12',easyRun: '30–45 min zone 2', qualityRun: '5 × 3 min at 10k effort / 2 min easy' },
];

// ─── Weekly Schedule ──────────────────────────────────────────────────────────
const WEEKLY_SCHEDULE = [
  { day: 'Monday',    gym: 'A', run: null,        note: '8–10 min post-lift conditioning' },
  { day: 'Tuesday',   gym: null, run: 'Easy',     note: 'Mobility routine' },
  { day: 'Wednesday', gym: 'B', run: null,        note: 'Walks / steps / mobility' },
  { day: 'Thursday',  gym: null, run: 'Quality',  note: 'Mobility routine' },
  { day: 'Friday',    gym: 'C', run: null,        note: 'Optional — rest if only doing 2 sessions' },
  { day: 'Saturday',  gym: null, run: 'Easy',     note: 'Parkrun-style easy effort' },
  { day: 'Sunday',    gym: null, run: null,        note: 'Rest · long walk · weekly review' },
];

// ─── Mobility Drills ──────────────────────────────────────────────────────────
const MOBILITY_DRILLS = [
  { name: '90/90 Breathing',            reps: '5 breaths × 2 rounds', why: 'Ribcage position; reduces flared-chest set-up',         timerSec: 40  },
  { name: 'Foam-roller Thoracic Ext.',  reps: '6–8 reps',             why: 'Improves upper-back extension access',                  timerSec: 30  },
  { name: 'Open Book / Thread-the-Needle', reps: '6 reps/side',      why: 'Thoracic rotation',                                     timerSec: 45  },
  { name: 'Doorway Pec Stretch',        reps: '30–45 sec × 2/side',  why: 'Reduces anterior shoulder tightness',                   timerSec: 80  },
  { name: 'Wall Slides with Lift-off',  reps: '2 × 8',               why: 'Shoulder upward rotation',                              timerSec: 40  },
  { name: 'Serratus Wall Slide / Push-up Plus', reps: '2 × 8–12',   why: 'Serratus activation',                                   timerSec: 40  },
  { name: 'Band Pull-apart / Face Pull',reps: '2 × 12–15',           why: 'Mid-back and rear-delt endurance',                      timerSec: 40  },
  { name: 'Scapular Hang / Active Hang',reps: '2 × 15–30 sec',       why: 'Shoulder position tolerance',                          timerSec: 60  },
];

// ─── Meal Templates ───────────────────────────────────────────────────────────
const MEAL_TEMPLATES = {
  omnivore: [
    { meal: 'Breakfast', food: 'Greek yoghurt, oats, whey, berries, chia',                  protein: 45 },
    { meal: 'Lunch',     food: 'Chicken, rice, roasted peppers/onions/broccoli, yoghurt dressing', protein: 50 },
    { meal: 'Snack',     food: 'Cottage cheese, apple, walnuts',                             protein: 30 },
    { meal: 'Dinner',    food: 'Turkey meatballs, tomato-basil sauce, pasta, spinach',       protein: 50 },
    { meal: 'Pre-bed',   food: 'Milk or casein shake',                                       protein: 28 },
  ],
  vegetarian: [
    { meal: 'Breakfast', food: 'Protein porridge, soy milk, whey/soy isolate, banana, PB',  protein: 38 },
    { meal: 'Lunch',     food: 'Paneer & chickpea tikka bowl, rice, cucumber-yoghurt',       protein: 43 },
    { meal: 'Snack',     food: 'Skyr or high-protein yoghurt with berries',                  protein: 23 },
    { meal: 'Dinner',    food: 'Lentil & tofu chilli, rice, cheddar, avocado',               protein: 48 },
    { meal: 'Pre-bed',   food: 'Casein or soy isolate shake',                               protein: 28 },
  ],
  highProtein: [
    { meal: 'Breakfast', food: 'Egg-white omelette, spinach, reduced-fat cheese, toast',    protein: 48 },
    { meal: 'Lunch',     food: 'Beef mince burrito bowl, beans, rice, peppers, salsa',       protein: 50 },
    { meal: 'Snack',     food: 'Whey shake and fruit',                                       protein: 28 },
    { meal: 'Dinner',    food: 'Chicken thigh traybake, potatoes, carrots, green beans',     protein: 53 },
    { meal: 'Pre-bed',   food: 'Cottage cheese with cinnamon and berries',                   protein: 28 },
  ],
};

// ─── 12-Week Microcycle ───────────────────────────────────────────────────────
const WEEK_PLAN = [
  { week: 1,  gymFocus: '2 sessions min, 3 optional',          runFocus: '1 easy run + 1 brisk walk/run',    intensity: 'Easy–moderate',   notes: 'Learn technique, film top sets' },
  { week: 2,  gymFocus: 'Add 1 set on key patterns',           runFocus: '2 easy runs',                       intensity: 'Moderate',        notes: 'Shoulder work daily' },
  { week: 3,  gymFocus: 'Add reps on compounds',               runFocus: '1 easy + 1 short tempo',           intensity: 'Moderate',        notes: 'Steps 8k–10k/day' },
  { week: 4,  gymFocus: 'Match wk 3, slightly heavier',        runFocus: '1 easy + 1 interval-lite',         intensity: 'Moderate–hard',   notes: 'First check-in week' },
  { week: 5,  gymFocus: 'Volume bump chest/back/legs',         runFocus: '1 easy + 1 tempo',                 intensity: 'Hard but controlled', notes: 'Protein strictness matters' },
  { week: 6,  gymFocus: 'Keep volume, add load',               runFocus: '1 easy + 1 interval session',      intensity: 'Hard',            notes: 'Watch sleep and appetite' },
  { week: 7,  gymFocus: 'Main lifts slightly heavier',         runFocus: '1 easy + 1 tempo/threshold',       intensity: 'Hard',            notes: 'Do not chase PBs on every lift' },
  { week: 8,  gymFocus: 'Similar to week 7',                   runFocus: '1 easy + 1 interval session',      intensity: 'Hard',            notes: 'Photos and waist check' },
  { week: 9,  gymFocus: 'Deload — cut sets 35–50%',            runFocus: '2 easy aerobic sessions',          intensity: 'Easy',            notes: 'No grinders' },
  { week: 10, gymFocus: 'Resume, slightly heavier compounds',  runFocus: '1 easy + 1 tempo',                 intensity: 'Moderate–hard',   notes: 'Best week for momentum' },
  { week: 11, gymFocus: 'Peak work capacity this block',       runFocus: '1 easy + 1 interval session',      intensity: 'Hard',            notes: 'Keep technique clean' },
  { week: 12, gymFocus: 'Consolidate, lower accessory fatigue',runFocus: '1 easy run',                       intensity: 'Moderate',        notes: 'Re-test measurements' },
];

// ─── DNA / Vitl Insights ──────────────────────────────────────────────────────
const DNA_INSIGHTS = [
  {
    trait: 'Caffeine Metabolism',
    marker: 'CYP1A2 rs762551',
    icon: '☕',
    slow: 'Cap pre-workout caffeine at 0–100 mg or avoid entirely. Never after late morning — especially important given broken sleep and anxiety history.',
    fast: 'Optional 100–200 mg pre-workout if sleep is stable.',
  },
  {
    trait: 'Appetite / Binge Eating',
    marker: 'FTO rs9939609, MC4R rs17782313',
    icon: '🍽️',
    elevated: 'Fixed meal times, 35–50 g protein per meal, high-fibre foods, no "saving calories" for late-night eating.',
    normal: 'Standard high-protein omnivore template.',
  },
  {
    trait: 'Saturated Fat Sensitivity',
    marker: 'APOA2 rs5082',
    icon: '🫀',
    elevated: 'Tighten sat-fat control — olive oil, nuts, beans, oats, poultry, low-fat dairy. Cholesterol markers already mildly raised.',
    normal: 'Moderate sat fat still sensible given your cholesterol context.',
  },
  {
    trait: 'Strength / Glycolytic Capacity',
    marker: 'ACTN3 rs1815739',
    icon: '⚡',
    power: 'Keep one lower-rep heavy compound focus day each week.',
    endurance: 'Bias more volume, aerobic work, and hypertrophy density.',
  },
  {
    trait: 'Folate Handling',
    marker: 'MTHFR rs1801133',
    icon: '🧬',
    elevated: 'Prioritise folate-rich foods. Methylfolate form may be practical if supplementing. Do not over-medicalise.',
    normal: 'Food-first folate strategy.',
  },
  {
    trait: 'Vitamin D Predisposition',
    marker: 'GC, CYP2R1, DHCR7',
    icon: '☀️',
    elevated: 'Be consistent with 10 mcg autumn/winter D3. Consider blood test if energy/mood/recovery suggests deficiency.',
    normal: 'Baseline 10 mcg D3 Oct–Mar.',
  },
];
