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
  { name: 'Ape Nutrition Beef Protein', dose: '1 scoop (~25 g protein)', timing: 'Post-lift or as a snack', why: 'Cacao maple sea salt — dairy-free protein toward your 180–210 g/day target' },
  { name: 'Newbeing Men’s Supplement', dose: 'Per label, daily', timing: 'With a meal', why: 'Daily multivitamin — covers vitamin D & key micronutrients' },
  { name: 'Omega-3', dose: '~250–500 mg EPA+DHA', timing: 'With food', why: 'Heart & recovery support — helps your raised cholesterol markers' },
  { name: 'Creatine monohydrate', dose: '3–5 g', timing: 'Any time, daily', why: 'Best-supported ergogenic for strength & lean mass — add if not already taking' },
];

// ─── Workout Sessions ─────────────────────────────────────────────────────────
// ─── Sessions ─────────────────────────────────────────────────────────────────
// Elastic 3-day plan from the deep-research report: A + B are the non-negotiable
// floor (every major muscle ~2×/week), C is the bonus when you're fresh. Sharpened
// for the lean "Fight Club" look without losing what the health report calls for:
//   • Key compounds pushed to 4 hard sets, reps tightened toward 6–12.
//   • Side delts on all three days — the single biggest lever for lean width.
//   • Shoulder-friendly selection + face pulls / posture work KEPT (your report
//     flags shoulder mobility as a real bottleneck — this isn't filler).
//   • No bent-over rows (chest-supported / pulldown only).
//   • Conditioning finishers kept for fat-loss + cholesterol markers.
// Push the last 1–2 reps of each set close to failure — that proximity is what
// retains muscle in a deficit. The deficit reveals it; the lifting protects it.
const SESSIONS = {
  A: {
    label: 'Session A',
    focus: 'Hinge · Pull · Delts',
    exercises: [
      { name: 'Trap-bar Deadlift / Conventional Deadlift', sets: '4', reps: '5–6',  note: 'Heaviest lift — do it fresh. No grinders. Busy → RDL 4×8' },
      { name: 'Lat Pulldown / Assisted Chin-up',           sets: '4', reps: '6–10', note: 'Full stretch, no swing — your V-taper builder' },
      { name: 'Rear-foot-elevated Split Squat',            sets: '3', reps: '8–10 /side', note: 'Quads, glutes & stability. Busy → Leg Press' },
      { name: 'Incline DB Press / Machine Chest Press',    sets: '4', reps: '6–10', note: 'Upper chest — shoulder-friendly pressing' },
      { name: 'Cable Lateral Raise',                       sets: '4', reps: '12–20', note: 'Biggest lever for the wide look. Strict, push hard' },
      { name: 'EZ-bar / Cable Curl',                       sets: '3', reps: '10–15', note: 'Direct biceps. Controlled, no body swing' },
      { name: 'Sled Push / Bike Intervals',               sets: '1', reps: '6–8 min', note: 'Optional finisher — first thing to cut if tired' },
    ]
  },
  B: {
    label: 'Session B',
    focus: 'Press · Quads · Pull',
    exercises: [
      { name: 'Incline DB Press / Machine Chest Press', sets: '4', reps: '6–10', note: 'Lead fresh — upper chest focus' },
      { name: 'Lat Pulldown / Assisted Chin-up',        sets: '4', reps: '8–12', note: 'Second back hit of the week. No bent-over rows' },
      { name: 'Leg Press / Hack Squat',                 sets: '4', reps: '8–12', note: 'Quad volume that spares the spine' },
      { name: 'Seated Hamstring Curl',                  sets: '3', reps: '10–12', note: 'Balances the quad work. Full squeeze' },
      { name: 'Cable Lateral Raise',                    sets: '4', reps: '12–20', note: 'Delts again — worth hitting every day' },
      { name: 'Rope Pressdown / Overhead Triceps Ext.', sets: '3', reps: '10–15', note: 'Direct triceps for arm definition' },
      { name: 'Face Pull / Cable Y-raise',              sets: '3', reps: '12–15', note: 'Posture + rear delt — keeps your shoulders healthy' },
    ]
  },
  C: {
    label: 'Session C',
    focus: 'Pump · Arms · Delts',
    exercises: [
      { name: 'Leg Press / Hack Squat',                 sets: '3', reps: '10–12', note: 'Quads — bonus-day volume. Busy → Split Squat' },
      { name: 'Incline DB Press / Machine Chest Press', sets: '3', reps: '8–12', note: '3rd chest hit, shoulder-friendly' },
      { name: 'Lat Pulldown / Assisted Chin-up',        sets: '3', reps: '8–12', note: 'Back again. Full stretch' },
      { name: 'Cable Lateral Raise',                    sets: '3', reps: '12–20', note: 'Delts a 3rd time — low fatigue, big payoff' },
      { name: 'Cable Curl superset Rope Pressdown',     sets: '3', reps: '10–15 each', note: 'Direct arms — biceps + triceps for definition' },
      { name: 'Face Pull / Cable Y-raise',              sets: '3', reps: '12–15', note: 'Posture + rear delt — shoulder health' },
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
  { day: 'Monday',    gym: 'A', run: null,        note: 'Hinge day — do it fresh' },
  { day: 'Tuesday',   gym: null, run: 'Easy',     note: 'Mobility routine' },
  { day: 'Wednesday', gym: 'B', run: null,        note: 'Press/quad day' },
  { day: 'Thursday',  gym: null, run: 'Quality',  note: 'Mobility routine' },
  { day: 'Friday',    gym: 'C', run: null,         note: 'Bonus session — do it if fresh, else rest' },
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
