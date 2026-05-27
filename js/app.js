/* ─── Storage helpers ─────────────────────────────────────────────────────── */
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

/* ─── State ───────────────────────────────────────────────────────────────── */
let state = store.get('fitplan_state') || {
  weightLog:   [],   // [{date, kg}]
  waistLog:    [],   // [{date, cm}]
  foodLog:     {},   // {date: [{name, kcal, protein}]}
  workoutLog:  {},   // {date: {session, exercises: [done]}}
  mobilityLog: {},   // {date: [drillsDone]}
  liftLog:     {},   // {date: {exerciseName: {sets, reps, kg}}}
  currentWeek: 1,
  todayMealTemplate: 'omnivore',
};

function save() { store.set('fitplan_state', state); }

/* ─── Date helpers ────────────────────────────────────────────────────────── */
const today = () => new Date().toISOString().split('T')[0];
const dayName = d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T12:00:00').getDay()];
const fullDayName = d => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d+'T12:00:00').getDay()];
const fmt = d => { const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };

function weeksSinceStart() {
  const start = new Date(PROFILE.startDate);
  const now = new Date();
  return Math.max(1, Math.min(12, Math.ceil((now - start) / (7*24*3600*1000))));
}

/* ─── Tab navigation ──────────────────────────────────────────────────────── */
function navigate(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + tab).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  renders[tab]?.();
}

/* ─── Utility: ring SVG ───────────────────────────────────────────────────── */
function ringHTML(pct, color, label, sub) {
  const r = 34, c = 2*Math.PI*r, fill = Math.min(1, pct) * c;
  return `<div class="ring-wrap">
    <svg class="ring-svg" width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="7"/>
      <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="7"
        stroke-dasharray="${fill} ${c}" stroke-linecap="round"/>
    </svg>
    <div class="ring-center">${label}<small>${sub}</small></div>
  </div>`;
}

/* ─── Macro bar ───────────────────────────────────────────────────────────── */
function macroBar(label, val, target, color) {
  const pct = Math.min(100, Math.round(val/target*100));
  return `<div class="macro-bar-wrap">
    <div class="macro-bar-label"><span>${label}</span><span>${val}g / ${target}g</span></div>
    <div class="macro-bar-bg"><div class="macro-bar-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── HOME SCREEN ─────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────── */
function renderHome() {
  const d = today();
  const dow = fullDayName(d);
  const week = weeksSinceStart();
  const plan = WEEKLY_SCHEDULE.find(s => s.day === dow);
  const weekInfo = WEEK_PLAN[Math.min(week,12)-1];

  // Weight
  const wl = state.weightLog;
  const latestW = wl.length ? wl[wl.length-1].kg : PROFILE.startWeightKg;
  const lost = (PROFILE.startWeightKg - latestW).toFixed(1);
  const toGo = (latestW - PROFILE.targetWeightKg).toFixed(1);
  const pctToGoal = Math.min(100, Math.max(0, Math.round(
    (PROFILE.startWeightKg - latestW) / (PROFILE.startWeightKg - PROFILE.targetWeightKg) * 100
  )));

  // Today's calories
  const foodToday = state.foodLog[d] || [];
  const kcalToday = foodToday.reduce((s,f) => s+f.kcal, 0);
  const targets = NUTRITION_TARGETS.trainingDay;
  const kcalPct = Math.min(1, kcalToday / targets.kcal);

  // Weekly dots
  const dots = Array.from({length:12}, (_,i) => {
    const w = i+1;
    const cls = w < week ? 'done' : w === week ? 'cur' : w===9 ? 'deload' : '';
    const tip = w===9 ? '🔄' : '';
    return `<div class="week-dot ${cls}" title="Week ${w}">${tip || w}</div>`;
  }).join('');

  // Today's plan summary
  let planHtml = '';
  if (plan) {
    if (plan.gym) planHtml += `<div class="strip strip-accent">💪 <strong>Gym Session ${plan.gym}</strong> — ${SESSIONS[plan.gym].focus}</div>`;
    if (plan.run) planHtml += `<div class="strip strip-green">🏃 <strong>${plan.run} Run</strong> — ${plan.note}</div>`;
    if (!plan.gym && !plan.run) planHtml += `<div class="strip strip-orange">😴 <strong>Rest / Recovery</strong> — ${plan.note}</div>`;
    else planHtml += `<div class="strip strip-orange">🧘 Mobility routine</div>`;
  }

  document.getElementById('home-body').innerHTML = `
    <div class="card" style="background:linear-gradient(135deg,#1c1c35,#252545)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div>
          <div style="font-size:22px;font-weight:800">Hey Glen 👋</div>
          <div style="color:var(--text2);font-size:14px;margin-top:2px">${dow} · Week ${week} of 12</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:900;color:var(--accent)">${latestW} kg</div>
          <div style="font-size:12px;color:var(--green)">▼ ${lost} kg lost</div>
        </div>
      </div>
      <div class="week-progress" style="margin-top:12px">${dots}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${toGo}</div>
        <div class="stat-unit">kg to 89 kg goal</div>
        <div class="stat-label">${pctToGoal}% there</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${kcalToday}</div>
        <div class="stat-unit">kcal today</div>
        <div class="stat-label">target ${targets.kcal}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Today's Plan</div>
      ${planHtml || '<div class="card-body">No plan for today — rest up!</div>'}
    </div>

    <div class="card">
      <div class="card-title">Week ${week} Focus</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">${weekInfo.gymFocus}</div>
      <div class="card-body">${weekInfo.runFocus}</div>
      <div class="strip strip-accent" style="margin-top:10px;font-size:13px">${weekInfo.notes}</div>
    </div>

    <div class="card">
      <div class="card-title">Calories Today</div>
      ${ringHTML(kcalPct, 'var(--orange)', Math.round(kcalPct*100)+'%', 'kcal')}
      <div style="margin-top:12px">
        ${macroBar('Protein', foodToday.reduce((s,f)=>s+(f.protein||0),0), targets.protein, 'var(--accent)')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Quick Stats</div>
      <div class="stat-grid" style="margin-bottom:0">
        <div class="stat-card">
          <div class="stat-value">184</div><div class="stat-unit">cm</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">23.2%</div><div class="stat-unit">start body fat</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">100</div><div class="stat-unit">cm start waist</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">89</div><div class="stat-unit">kg milestone</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Daily Supplements</div>
      ${SUPPLEMENTS.map(s => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="font-weight:600;font-size:15px">${s.name}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:2px">${s.dose} · ${s.timing}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${s.why}</div>
        </div>`).join('')}
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── TRAIN SCREEN ────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────── */
let trainTab = 'schedule';
let activeSession = 'A';

function renderTrain() {
  document.getElementById('train-body').innerHTML = `
    <div class="seg-ctrl">
      <button class="seg-btn ${trainTab==='schedule'?'active':''}" onclick="setTrainTab('schedule')">Schedule</button>
      <button class="seg-btn ${trainTab==='workout'?'active':''}" onclick="setTrainTab('workout')">Workout</button>
      <button class="seg-btn ${trainTab==='running'?'active':''}" onclick="setTrainTab('running')">Running</button>
    </div>
    <div id="train-content"></div>
  `;
  renderTrainContent();
}

function setTrainTab(t) { trainTab = t; renderTrain(); }

function renderTrainContent() {
  const el = document.getElementById('train-content');
  if (trainTab === 'schedule') {
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Weekly Schedule</div>
        ${WEEKLY_SCHEDULE.map(row => `
          <div class="sched-row">
            <div class="sched-day">${row.day.slice(0,3)}</div>
            <div class="sched-pills">
              ${row.gym ? `<span class="pill pill-gym">Gym ${row.gym}</span>` : ''}
              ${row.run ? `<span class="pill pill-run">🏃 ${row.run}</span>` : ''}
              ${!row.gym && !row.run ? `<span class="pill pill-rest">Rest</span>` : ''}
              <span class="pill pill-mob">🧘 Mobility</span>
            </div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">12-Week Microcycle</div>
        ${WEEK_PLAN.map(w => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
              <span style="font-weight:700;font-size:14px">Week ${w.week}</span>
              <span style="font-size:11px;color:${w.week===9?'var(--orange)':'var(--text3)'};font-weight:600">${w.intensity}</span>
            </div>
            <div style="font-size:13px;color:var(--text2)">${w.gymFocus}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">${w.notes}</div>
          </div>`).join('')}
      </div>
    `;
  } else if (trainTab === 'workout') {
    const d = today();
    const log = state.workoutLog[d]?.[activeSession] || [];
    const sess = SESSIONS[activeSession];
    el.innerHTML = `
      <div class="seg-ctrl">
        ${['A','B','C'].map(s => `<button class="seg-btn ${activeSession===s?'active':''}" onclick="setSession('${s}')">Session ${s}</button>`).join('')}
      </div>
      <div class="card">
        <div class="session-badge">💪 ${sess.label}</div>
        <div style="color:var(--text2);font-size:14px;margin-bottom:12px">${sess.focus}</div>
        ${sess.exercises.map((ex, i) => {
          const done = log[i] || false;
          return `<div class="exercise-row">
            <div class="exercise-check ${done?'done':''}" onclick="toggleExercise('${d}','${activeSession}',${i})"></div>
            <div class="exercise-info">
              <div class="exercise-name" style="${done?'text-decoration:line-through;opacity:0.5':''}">${ex.name}</div>
              <div class="exercise-meta">${ex.sets} sets × ${ex.reps}</div>
              <div class="exercise-note">${ex.note}</div>
            </div>
          </div>`;
        }).join('')}
        <div style="margin-top:14px;text-align:center">
          <button class="btn btn-sm btn-ghost" onclick="clearSession('${d}','${activeSession}')">Reset session</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Double Progression Rule</div>
        <div class="card-body">Hit the <strong>top of the rep range</strong> on all sets with solid form → add load next session.<br><br>
        Early weeks: 2–3 reps in reserve. Harder weeks: 1–2 RIR.</div>
      </div>
      <div class="card">
        <div class="card-title">Shoulder-Safe Warm-up</div>
        <div style="counter-reset:wm">
        ${['5 min light bike/row','Thoracic extension on roller','Open books','Wall slides','One serratus drill','2 ramp-up sets for first press and row'].map((s,i) =>
          `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="color:var(--accent);font-weight:700;width:18px">${i+1}.</span>
            <span>${s}</span>
          </div>`).join('')}
        </div>
      </div>
    `;
  } else {
    const week = weeksSinceStart();
    const phase = RUNNING_PHASES.find((p,i) => {
      const [a,b] = p.weeks.split('–').map(Number);
      return week >= a && week <= (b||a);
    }) || RUNNING_PHASES[0];
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Current Phase (Week ${week})</div>
        <div style="margin-bottom:12px">
          <div style="font-size:16px;font-weight:700;margin-bottom:6px">🟢 Easy Run</div>
          <div class="card-body">${phase.easyRun}</div>
          <div class="strip strip-green" style="margin-top:8px;font-size:13px">Conversational pace — zone 2. Finish fresher than you started.</div>
        </div>
        <div>
          <div style="font-size:16px;font-weight:700;margin-bottom:6px">⚡ Quality Run</div>
          <div class="card-body">${phase.qualityRun}</div>
          <div class="strip strip-accent" style="margin-top:8px;font-size:13px">Space it 24h+ from your heavier lower-body lift.</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Running Phases</div>
        ${RUNNING_PHASES.map(p => `
          <div style="padding:9px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:700;font-size:14px;margin-bottom:3px">Weeks ${p.weeks}</div>
            <div style="font-size:13px;color:var(--text2)">Easy: ${p.easyRun}</div>
            <div style="font-size:13px;color:var(--accent);margin-top:2px">Quality: ${p.qualityRun}</div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">Running Rules</div>
        <div class="strip strip-orange" style="margin-bottom:8px">Drop intensity before dropping consistency if recovery is poor.</div>
        <div class="card-body">Keep asthma inhaler accessible on all runs. If flat post-leg-day, reschedule quality run — don't compromise form.</div>
      </div>
    `;
  }
}

function setSession(s) { activeSession = s; renderTrain(); }

function toggleExercise(date, session, idx) {
  if (!state.workoutLog[date]) state.workoutLog[date] = {};
  if (!state.workoutLog[date][session]) {
    state.workoutLog[date][session] = Array(SESSIONS[session].exercises.length).fill(false);
  }
  state.workoutLog[date][session][idx] = !state.workoutLog[date][session][idx];
  save();
  renderTrain();
}

function clearSession(date, session) {
  if (state.workoutLog[date]) delete state.workoutLog[date][session];
  save();
  renderTrain();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── EAT SCREEN ──────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────── */
let eatTab = 'log';

function renderEat() {
  document.getElementById('eat-body').innerHTML = `
    <div class="seg-ctrl">
      <button class="seg-btn ${eatTab==='log'?'active':''}" onclick="setEatTab('log')">Today</button>
      <button class="seg-btn ${eatTab==='meals'?'active':''}" onclick="setEatTab('meals')">Meal Plans</button>
      <button class="seg-btn ${eatTab==='targets'?'active':''}" onclick="setEatTab('targets')">Targets</button>
    </div>
    <div id="eat-content"></div>
  `;
  renderEatContent();
}

function setEatTab(t) { eatTab = t; renderEat(); }

function renderEatContent() {
  const el = document.getElementById('eat-content');
  const d = today();
  const foods = state.foodLog[d] || [];
  const totalKcal = foods.reduce((s,f) => s+f.kcal, 0);
  const totalProt = foods.reduce((s,f) => s+(f.protein||0), 0);
  const t = NUTRITION_TARGETS.trainingDay;

  if (eatTab === 'log') {
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Today · ${fmt(d)}</div>
        <div class="macro-ring-container">
          ${ringHTML(Math.min(1,totalKcal/t.kcal), 'var(--orange)', Math.round(totalKcal/t.kcal*100)+'%', 'kcal')}
          <div class="macro-labels">
            ${macroBar('Protein', totalProt, t.protein, 'var(--accent)')}
            ${macroBar('Calories', totalKcal, t.kcal, 'var(--orange)')}
          </div>
        </div>
        <div style="display:flex;justify-content:space-around;text-align:center;padding:8px 0;border-top:1px solid var(--border);margin-top:4px">
          <div><div style="font-size:18px;font-weight:700;color:var(--orange)">${totalKcal}</div><div style="font-size:11px;color:var(--text3)">kcal / ${t.kcal}</div></div>
          <div><div style="font-size:18px;font-weight:700;color:var(--accent)">${totalProt}g</div><div style="font-size:11px;color:var(--text3)">protein / ${t.protein}g</div></div>
          <div><div style="font-size:18px;font-weight:700;color:var(--green)">${t.kcal-totalKcal > 0 ? t.kcal-totalKcal : '✓'}</div><div style="font-size:11px;color:var(--text3)">remaining</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Log Food</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input class="log-input" id="food-name" placeholder="Food / meal name" type="text">
          <div style="display:flex;gap:8px">
            <input class="log-input" id="food-kcal" placeholder="kcal" type="number" inputmode="decimal" style="flex:1">
            <input class="log-input" id="food-prot" placeholder="protein (g)" type="number" inputmode="decimal" style="flex:1">
          </div>
          <button class="btn" onclick="logFood()">Add Food</button>
        </div>
      </div>
      ${foods.length ? `
      <div class="card">
        <div class="card-title">Today's Food</div>
        ${foods.map((f,i) => `
          <div class="food-entry">
            <div class="food-name">${f.name}</div>
            <div class="food-kcal">${f.kcal} kcal</div>
            <div class="food-protein">${f.protein}g</div>
            <div class="food-del" onclick="deleteFood(${i})">×</div>
          </div>`).join('')}
      </div>` : ''}
      <div class="card">
        <div class="card-title">Calorie Adjustment Rule</div>
        <div class="strip strip-green">Rolling 2-week average <strong>slower than 0.25 kg/week</strong> → cut 100–150 kcal/day</div>
        <div class="strip strip-orange" style="margin-top:8px">Dropping faster than <strong>0.8 kg/week</strong> and gym performance sliding → add 100–150 kcal/day</div>
      </div>
    `;
  } else if (eatTab === 'meals') {
    const tpls = ['omnivore', 'vegetarian', 'highProtein'];
    const labels = { omnivore: '🥩 Omnivore', vegetarian: '🥗 Vegetarian', highProtein: '💪 High-Protein' };
    el.innerHTML = `
      <div class="seg-ctrl">
        ${tpls.map(t => `<button class="seg-btn ${state.todayMealTemplate===t?'active':''}" onclick="setTemplate('${t}')">${labels[t]}</button>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">${labels[state.todayMealTemplate]} Template</div>
        ${MEAL_TEMPLATES[state.todayMealTemplate].map(m => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:700;font-size:14px;color:var(--accent);margin-bottom:4px">${m.meal}</div>
            <div style="font-size:14px;color:var(--text2)">${m.food}</div>
            <div style="font-size:13px;color:var(--green);margin-top:4px">~${m.protein}g protein</div>
          </div>`).join('')}
        <div style="padding:10px 0;text-align:center;font-size:13px;color:var(--text2)">
          Total: ~${MEAL_TEMPLATES[state.todayMealTemplate].reduce((s,m)=>s+m.protein,0)}g protein
        </div>
      </div>
      <div class="card">
        <div class="card-title">Recipe Bank</div>
        ${[
          {title:'🍗 Chicken & Roasted Pepper Bowl', body:'Roast chicken breast with paprika, garlic, lemon. Serve over rice/quinoa with roasted peppers, onions, broccoli. Greek yoghurt + olive oil dressing. Batch-cookable.'},
          {title:'🦃 Turkey Meatballs in Tomato-Basil Sauce', body:'5% turkey mince, oats, egg, garlic, parmesan. Bake then simmer in tomato passata. Serve with pasta and spinach. Cooked tomatoes — no raw tomato issue.'},
          {title:'🌶️ Beef & Bean Chilli', body:'Lean beef mince, onions, peppers, garlic, beans, passata, spices. Rice, cheese, yoghurt. Excellent for meal prep and fibre goals.'},
          {title:'🫙 High-Protein Overnight Oats', body:'Oats, Greek yoghurt, milk, whey, berries, chia. Easiest way to front-load protein at breakfast.'},
          {title:'🧀 Paneer Tikka Traybake', body:'Paneer or tofu with tikka spices, peppers, onions. Roast and serve with rice, lentils and mint yoghurt.'},
        ].map(r => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">${r.title}</div>
            <div style="font-size:13px;color:var(--text2);line-height:1.5">${r.body}</div>
          </div>`).join('')}
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Training Day Targets</div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:12px">2,450–2,650 kcal</div>
        ${macroBar('Protein', 195, 210, 'var(--accent)')}
        ${macroBar('Carbohydrate', 260, 300, 'var(--blue)')}
        ${macroBar('Fat', 73, 80, 'var(--orange)')}
      </div>
      <div class="card">
        <div class="card-title">Rest / Easy Day Targets</div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:12px">2,200–2,350 kcal</div>
        ${macroBar('Protein', 195, 210, 'var(--accent)')}
        ${macroBar('Carbohydrate', 180, 220, 'var(--blue)')}
        ${macroBar('Fat', 78, 85, 'var(--orange)')}
      </div>
      <div class="card">
        <div class="card-title">Protein Targets</div>
        <div class="strip strip-accent">35–50 g protein per main meal · 3–5 feedings per day</div>
        <div class="strip strip-green" style="margin-top:8px">Post-lift protein: 25–40 g within 1–2 hours</div>
        <div class="card-body" style="margin-top:10px">Total daily protein matters more than an exact "anabolic window" — but getting protein near training is still pragmatic.</div>
      </div>
      <div class="card">
        <div class="card-title">Cholesterol / Heart Health</div>
        <div class="card-body">Mildly raised cholesterol markers flagged in your health report. Bias fat intake towards:<br><br>
        ✅ Olive oil, nuts, seeds, avocado<br>
        ✅ Oats, beans, legumes (soluble fibre)<br>
        ✅ Lean cuts, poultry<br>
        ⚠️ Limit saturated fat — red/processed meat, full-fat dairy</div>
      </div>
      ${SUPPLEMENTS.map(s => `
        <div class="card">
          <div class="card-title">${s.name}</div>
          <div style="font-weight:600;font-size:16px;margin-bottom:4px">${s.dose}</div>
          <div style="font-size:13px;color:var(--text2)">${s.timing}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:6px">${s.why}</div>
        </div>`).join('')}
    `;
  }
}

function setTemplate(t) { state.todayMealTemplate = t; save(); renderEat(); }

function logFood() {
  const name = document.getElementById('food-name').value.trim();
  const kcal = parseInt(document.getElementById('food-kcal').value) || 0;
  const prot = parseInt(document.getElementById('food-prot').value) || 0;
  if (!name || !kcal) return;
  const d = today();
  if (!state.foodLog[d]) state.foodLog[d] = [];
  state.foodLog[d].push({ name, kcal, protein: prot });
  save();
  renderEat();
}

function deleteFood(idx) {
  const d = today();
  state.foodLog[d]?.splice(idx, 1);
  save();
  renderEat();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── MOVE (MOBILITY) SCREEN ──────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────── */
let activeTimer = null;
let timerSec = 0;
let timerRunning = false;
let timerDrillIdx = null;

function renderMove() {
  const d = today();
  const done = state.mobilityLog[d] || [];
  const allDone = done.length === MOBILITY_DRILLS.length;

  document.getElementById('move-body').innerHTML = `
    <div class="card" style="${allDone ? 'border-color:var(--green)' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div class="card-title">Daily Routine</div>
          <div style="font-size:15px;font-weight:600">${done.length} / ${MOBILITY_DRILLS.length} drills done</div>
        </div>
        ${allDone ? '<div style="font-size:28px">✅</div>' : ''}
      </div>
      <div style="background:var(--bg3);border-radius:4px;height:8px;margin-top:10px;overflow:hidden">
        <div style="background:var(--green);height:100%;border-radius:4px;width:${done.length/MOBILITY_DRILLS.length*100}%;transition:width .3s"></div>
      </div>
    </div>
    <div class="card">
      ${MOBILITY_DRILLS.map((drill, i) => {
        const isDone = done.includes(i);
        return `<div class="drill-row" onclick="openDrill(${i})">
          <div class="drill-icon" style="${isDone ? 'background:var(--green)' : ''}">
            ${isDone ? '✅' : ['🫁','🦴','📖','🚪','🧱','💪','🎯','🤲'][i]}
          </div>
          <div class="drill-info">
            <div class="drill-name" style="${isDone ? 'text-decoration:line-through;opacity:0.5' : ''}">${drill.name}</div>
            <div class="drill-reps">${drill.reps}</div>
          </div>
          <div class="drill-timer">${formatSec(drill.timerSec)}</div>
        </div>`;
      }).join('')}
      <div style="margin-top:12px;text-align:center">
        <button class="btn btn-ghost btn-sm" onclick="resetMobility()">Reset today</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Phase Priorities</div>
      ${[
        {phase:'Weeks 1–4',label:'Mobility Access',detail:'More thoracic work, light activation, controlled tempo'},
        {phase:'Weeks 5–8',label:'Stability',detail:'Add load to wall slides, face pulls, carries, push-up plus'},
        {phase:'Weeks 9–12',label:'Integration',detail:'Keep mobility volume, increase loaded carries, rowing quality'},
      ].map(p => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-weight:700;font-size:14px">${p.phase}</span>
            <span style="font-size:13px;color:var(--accent)">${p.label}</span>
          </div>
          <div style="font-size:13px;color:var(--text2)">${p.detail}</div>
        </div>`).join('')}
    </div>
    <div class="strip strip-orange">
      ⚠️ Sharp shoulder pain, numbness, or neck-radiating symptoms → stop and see a physio. Do not improvise around these.
    </div>
  `;
}

function openDrill(idx) {
  const drill = MOBILITY_DRILLS[idx];
  timerDrillIdx = idx;
  timerSec = drill.timerSec;
  timerRunning = false;
  if (activeTimer) clearInterval(activeTimer);

  const modal = document.getElementById('drill-modal');
  document.getElementById('drill-modal-title').textContent = drill.name;
  document.getElementById('drill-modal-reps').textContent = drill.reps;
  document.getElementById('drill-modal-why').textContent = drill.why;
  updateTimerDisplay();
  modal.classList.add('open');
}

function closeDrillModal() {
  document.getElementById('drill-modal').classList.remove('open');
  if (activeTimer) clearInterval(activeTimer);
  timerRunning = false;
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(activeTimer);
    timerRunning = false;
    document.getElementById('timer-toggle').textContent = '▶ Resume';
  } else {
    timerRunning = true;
    document.getElementById('timer-toggle').textContent = '⏸ Pause';
    activeTimer = setInterval(() => {
      if (timerSec > 0) {
        timerSec--;
        updateTimerDisplay();
      } else {
        clearInterval(activeTimer);
        timerRunning = false;
        document.getElementById('timer-toggle').textContent = '▶ Start';
        // vibrate if supported
        if (navigator.vibrate) navigator.vibrate([200,100,200]);
        markDrillDone(timerDrillIdx);
      }
    }, 1000);
  }
}

function resetTimer() {
  if (activeTimer) clearInterval(activeTimer);
  timerRunning = false;
  timerSec = MOBILITY_DRILLS[timerDrillIdx].timerSec;
  document.getElementById('timer-toggle').textContent = '▶ Start';
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(timerSec/60).toString().padStart(2,'0');
  const s = (timerSec%60).toString().padStart(2,'0');
  document.getElementById('timer-display').textContent = `${m}:${s}`;
}

function markDrillDone(idx) {
  const d = today();
  if (!state.mobilityLog[d]) state.mobilityLog[d] = [];
  if (!state.mobilityLog[d].includes(idx)) state.mobilityLog[d].push(idx);
  save();
  closeDrillModal();
  renderMove();
}

function resetMobility() {
  state.mobilityLog[today()] = [];
  save();
  renderMove();
}

function formatSec(s) {
  const m = Math.floor(s/60), ss = s%60;
  return m > 0 ? `${m}:${ss.toString().padStart(2,'0')}` : `${ss}s`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── PROGRESS SCREEN ─────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────── */
let progTab = 'weight';

function renderProgress() {
  document.getElementById('prog-body').innerHTML = `
    <div class="seg-ctrl">
      <button class="seg-btn ${progTab==='weight'?'active':''}" onclick="setProgTab('weight')">Weight</button>
      <button class="seg-btn ${progTab==='waist'?'active':''}" onclick="setProgTab('waist')">Waist</button>
      <button class="seg-btn ${progTab==='dna'?'active':''}" onclick="setProgTab('dna')">DNA</button>
    </div>
    <div id="prog-content"></div>
  `;
  renderProgContent();
}

function setProgTab(t) { progTab = t; renderProgress(); }

function renderProgContent() {
  const el = document.getElementById('prog-content');
  if (progTab === 'weight') {
    const d = today();
    const wl = state.weightLog;
    const latest = wl.length ? wl[wl.length-1].kg : PROFILE.startWeightKg;
    const avg7 = wl.length >= 7
      ? (wl.slice(-7).reduce((s,w)=>s+w.kg,0)/7).toFixed(1)
      : latest;

    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${latest}</div><div class="stat-unit">kg today</div></div>
        <div class="stat-card"><div class="stat-value">${avg7}</div><div class="stat-unit">7-day avg</div></div>
        <div class="stat-card"><div class="stat-value">${(PROFILE.startWeightKg - latest).toFixed(1)}</div><div class="stat-unit">kg lost</div></div>
        <div class="stat-card"><div class="stat-value">${(latest - PROFILE.targetWeightKg).toFixed(1)}</div><div class="stat-unit">kg to goal</div></div>
      </div>
      <div class="card">
        <div class="card-title">Log Weight</div>
        <div class="log-form">
          <input class="log-input" id="weight-input" placeholder="${latest} kg" type="number" inputmode="decimal" step="0.1">
          <button class="btn" onclick="logWeight()">Log</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Weight History</div>
        <canvas id="weight-chart" width="320" height="160" style="width:100%;border-radius:8px"></canvas>
        ${wl.length === 0 ? '<div class="card-body" style="text-align:center;padding:20px;color:var(--text3)">Log your first weigh-in above</div>' : ''}
        <div style="margin-top:12px">
          ${wl.slice(-10).reverse().map(w => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px">
              <span style="color:var(--text2)">${fmt(w.date)} ${dayName(w.date)}</span>
              <span style="font-weight:600">${w.kg} kg</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Milestones</div>
        ${[
          {kg:95.8, label:'Start weight', date:PROFILE.startDate},
          {kg:93,   label:'Phase 1 midpoint'},
          {kg:91,   label:'Approaching goal'},
          {kg:89,   label:'First milestone 🎯'},
          {kg:86,   label:'Lean threshold'},
          {kg:83.6, label:'~12% body fat (if lean mass held)'},
        ].map(m => {
          const reached = latest <= m.kg;
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:18px">${reached ? '✅' : '⬜'}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600;${reached?'text-decoration:line-through;opacity:0.5':''}">${m.label}</div>
              ${m.date ? `<div style="font-size:12px;color:var(--text3)">${fmt(m.date)}</div>` : ''}
            </div>
            <div style="font-weight:700;color:${reached?'var(--green)':'var(--text2)'}">${m.kg} kg</div>
          </div>`;
        }).join('')}
      </div>
    `;
    drawWeightChart();

  } else if (progTab === 'waist') {
    const wl = state.waistLog;
    const latest = wl.length ? wl[wl.length-1].cm : PROFILE.startWaistCm;
    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value">${latest}</div><div class="stat-unit">cm today</div></div>
        <div class="stat-card"><div class="stat-value">${PROFILE.startWaistCm}</div><div class="stat-unit">cm start</div></div>
        <div class="stat-card"><div class="stat-value">${(PROFILE.startWaistCm - latest).toFixed(1)}</div><div class="stat-unit">cm lost</div></div>
        <div class="stat-card"><div class="stat-value">4–8</div><div class="stat-unit">cm 12wk target</div></div>
      </div>
      <div class="card">
        <div class="card-title">Log Waist (Weekly)</div>
        <div class="log-form">
          <input class="log-input" id="waist-input" placeholder="${latest} cm" type="number" inputmode="decimal" step="0.5">
          <button class="btn" onclick="logWaist()">Log</button>
        </div>
        <div class="strip strip-orange" style="margin-top:10px;font-size:13px">Measure at navel height, relaxed. Same time each week.</div>
      </div>
      <div class="card">
        <div class="card-title">Waist History</div>
        <canvas id="waist-chart" width="320" height="160" style="width:100%;border-radius:8px"></canvas>
        ${wl.length === 0 ? '<div class="card-body" style="text-align:center;padding:20px;color:var(--text3)">Log your first waist measurement above</div>' : ''}
        ${wl.slice(-8).reverse().map(w => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="color:var(--text2)">${fmt(w.date)}</span>
            <span style="font-weight:600">${w.cm} cm</span>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title">Interpretation</div>
        <div class="strip strip-accent" style="font-size:13px">Scale stalls for 10–14 days but waist falls and lifts hold? → Recomp is happening. Don't panic.</div>
        <div class="strip strip-orange" style="margin-top:8px;font-size:13px">Weight falls fast but waist doesn't move and gym performance collapses? → Deficit is too deep. Add 100–150 kcal/day.</div>
      </div>
    `;
    drawWaistChart();

  } else {
    // DNA screen
    el.innerHTML = `
      <div class="card">
        <div class="card-title">Vitl DNA Insights</div>
        <div class="card-body" style="margin-bottom:8px">Your Vitl test covers nutrition, fitness, caffeine/sleep & vitamin traits. Use the decision rules below based on your actual trait results.</div>
        <div class="strip strip-accent" style="font-size:13px">DNA markers fine-tune the programme — fundamentals (calories, protein, training, sleep) explain far more of the outcome than any single SNP.</div>
      </div>
      ${DNA_INSIGHTS.map(d => `
        <div class="dna-card">
          <div class="dna-header">
            <div class="dna-icon">${d.icon}</div>
            <div>
              <div class="dna-title">${d.trait}</div>
              <div class="dna-marker">${d.marker}</div>
            </div>
          </div>
          <div class="dna-options">
            ${Object.entries(d).filter(([k]) => !['trait','marker','icon'].includes(k)).map(([k,v]) => `
              <div class="dna-option">
                <strong>${k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g,' $1')} →</strong>${v}
              </div>`).join('')}
          </div>
        </div>`).join('')}
    `;
  }
}

/* ─── Canvas charts ───────────────────────────────────────────────────────── */
function drawLineChart(canvasId, data, color, startVal, unit) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || data.length < 2) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth * dpr, H = 160 * dpr;
  canvas.width = W; canvas.height = H;
  ctx.scale(dpr, dpr);
  const w = canvas.offsetWidth, h = 160;

  const vals = [startVal, ...data.map(d => d.val)];
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const pad = { t:20, b:30, l:10, r:10 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;

  const px = i => pad.l + (i / (vals.length-1)) * pw;
  const py = v => pad.t + ph - (v - min) / (max - min) * ph;

  // Grid
  ctx.strokeStyle = '#2a2a45';
  ctx.lineWidth = 1;
  [0, 0.33, 0.67, 1].forEach(frac => {
    const y = pad.t + ph * (1 - frac);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w-pad.r, y); ctx.stroke();
    const v = (min + frac*(max-min)).toFixed(1);
    ctx.fillStyle = '#5a5a7a';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText(v, 2, y+4);
  });

  // Fill
  ctx.beginPath();
  ctx.moveTo(px(0), py(vals[0]));
  vals.forEach((v,i) => i > 0 && ctx.lineTo(px(i), py(v)));
  ctx.lineTo(px(vals.length-1), h-pad.b);
  ctx.lineTo(px(0), h-pad.b);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.t, 0, h-pad.b);
  grad.addColorStop(0, color + '44');
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(px(0), py(vals[0]));
  vals.forEach((v,i) => i > 0 && ctx.lineTo(px(i), py(v)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  vals.forEach((v,i) => {
    ctx.beginPath();
    ctx.arc(px(i), py(v), 4, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0a0a0f';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawWeightChart() {
  const data = state.weightLog.map(w => ({ val: w.kg }));
  drawLineChart('weight-chart', data, '#7c6dfa', PROFILE.startWeightKg, 'kg');
}

function drawWaistChart() {
  const data = state.waistLog.map(w => ({ val: w.cm }));
  drawLineChart('waist-chart', data, '#30d158', PROFILE.startWaistCm, 'cm');
}

function logWeight() {
  const v = parseFloat(document.getElementById('weight-input').value);
  if (!v || v < 40 || v > 200) return;
  const d = today();
  state.weightLog = state.weightLog.filter(w => w.date !== d);
  state.weightLog.push({ date: d, kg: v });
  state.weightLog.sort((a,b) => a.date.localeCompare(b.date));
  save();
  renderProgress();
}

function logWaist() {
  const v = parseFloat(document.getElementById('waist-input').value);
  if (!v || v < 50 || v > 200) return;
  const d = today();
  state.waistLog = state.waistLog.filter(w => w.date !== d);
  state.waistLog.push({ date: d, cm: v });
  state.waistLog.sort((a,b) => a.date.localeCompare(b.date));
  save();
  renderProgress();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── Render dispatch ─────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────── */
const renders = {
  home:     renderHome,
  train:    renderTrain,
  eat:      renderEat,
  move:     renderMove,
  progress: renderProgress,
};

/* ─── Init ────────────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Tab bar events
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });

  navigate('home');
});
