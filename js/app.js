/* ─── Storage ─────────────────────────────────────────────────────────────── */
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

/* ─── State ───────────────────────────────────────────────────────────────── */
let state = store.get('fitplan_v2') || {
  weightLog:   [],
  waistLog:    [],
  foodLog:     {},
  workoutLog:  {},
  mobilityLog: {},
  mealTemplate: 'omnivore',
};
function save() { store.set('fitplan_v2', state); }

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const today   = () => new Date().toISOString().split('T')[0];
const dayName = d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T12:00:00').getDay()];
const fullDay = d => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d+'T12:00:00').getDay()];
const fmt     = d => { const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };
const fmtFull = d => { const [y,m,dd]=d.split('-'); const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${parseInt(dd)} ${ms[parseInt(m)-1]}`; };

function weekNum() {
  const ms = new Date() - new Date(PROFILE.startDate);
  return Math.max(1, Math.min(12, Math.ceil(ms / (7*864e5))));
}

function ringHTML(pct, color, label, sub) {
  const r = 36, c = 2*Math.PI*r, fill = Math.min(1, pct)*c;
  return `<div class="ring-wrap">
    <svg class="ring-svg" width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
      <circle cx="44" cy="44" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${fill} ${c}" stroke-linecap="round"/>
    </svg>
    <div class="ring-center" style="color:${color}">${label}<small>${sub}</small></div>
  </div>`;
}

function pbar(label, val, target, color, unit='g') {
  const pct = Math.min(100, Math.round(val/target*100));
  return `<div class="pbar-wrap">
    <div class="pbar-head">
      <span class="pbar-label">${label}</span>
      <span class="pbar-val" style="color:${color}">${val}${unit} <span style="color:var(--text3);font-weight:500">/ ${target}${unit}</span></span>
    </div>
    <div class="pbar-bg"><div class="pbar-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */
function navigate(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-'+tab).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  renders[tab]?.();
}

/* ══════════════════════════════════════════════════════════════════════════════
   HOME
══════════════════════════════════════════════════════════════════════════════ */
function renderHome() {
  const d = today(), dow = fullDay(d), wk = weekNum();
  const plan = WEEKLY_SCHEDULE.find(s => s.day === dow);
  const weekInfo = WEEK_PLAN[wk-1];
  const wl = state.weightLog;
  const latestW = wl.length ? wl[wl.length-1].kg : PROFILE.startWeightKg;
  const lost = (PROFILE.startWeightKg - latestW).toFixed(1);
  const toGo = Math.max(0, latestW - PROFILE.targetWeightKg).toFixed(1);
  const pctDone = Math.min(100, Math.max(0, Math.round((PROFILE.startWeightKg - latestW) / (PROFILE.startWeightKg - PROFILE.targetWeightKg)*100)));
  const foods = state.foodLog[d] || [];
  const kcalToday = foods.reduce((s,f)=>s+f.kcal,0);
  const protToday = foods.reduce((s,f)=>s+(f.protein||0),0);
  const t = NUTRITION_TARGETS.trainingDay;

  // Week dots
  const dots = Array.from({length:12},(_,i)=>{
    const w=i+1, cls=w<wk?'done':w===wk?'cur':w===9?'deload':'';
    return `<div class="w-dot ${cls}">${w===9?'🔄':w}</div>`;
  }).join('');

  // Today plan
  let todayHtml = '';
  if (plan) {
    if (plan.gym) todayHtml += `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(124,109,250,0.15);display:flex;align-items:center;justify-content:center;font-size:20px">💪</div>
        <div><div style="font-weight:700;font-size:15px">Gym Session ${plan.gym}</div><div style="font-size:13px;color:var(--text3)">${SESSIONS[plan.gym].focus}</div></div>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="navigate('train')">Go</button>
      </div>`;
    if (plan.run) todayHtml += `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(0,230,118,0.12);display:flex;align-items:center;justify-content:center;font-size:20px">🏃</div>
        <div><div style="font-weight:700;font-size:15px">${plan.run} Run</div><div style="font-size:13px;color:var(--text3)">${plan.note}</div></div>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--green);border-color:rgba(0,230,118,0.3)" onclick="navigate('train')">Go</button>
      </div>`;
    todayHtml += `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,107,53,0.1);display:flex;align-items:center;justify-content:center;font-size:20px">🧘</div>
        <div><div style="font-weight:700;font-size:15px">Mobility Routine</div><div style="font-size:13px;color:var(--text3)">8 drills · ~12 min</div></div>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--orange);border-color:rgba(255,107,53,0.3)" onclick="navigate('train')">Go</button>
      </div>`;
    if (!plan.gym && !plan.run) todayHtml = `<div style="padding:12px 0;color:var(--text2);font-size:15px">Rest day — walk, recover, prep meals 🛌</div>`;
  }

  document.getElementById('home-body').innerHTML = `
    <!-- HERO -->
    <div class="hero-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Week ${wk} of 12</div>
          <div style="font-size:32px;font-weight:900;letter-spacing:-1px">Hey Glen 👋</div>
          <div style="font-size:14px;color:var(--text3);margin-top:4px">${dow} · ${fmtFull(d)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:38px;font-weight:900;letter-spacing:-1.5px;color:var(--cyan)">${latestW}</div>
          <div style="font-size:12px;color:var(--text3);font-weight:600;margin-top:2px">kg current</div>
          ${parseFloat(lost) > 0 ? `<div style="font-size:13px;color:var(--green);font-weight:700;margin-top:2px">▼ ${lost} kg lost</div>` : ''}
        </div>
      </div>
      <div class="week-dots">${dots}</div>
      <div style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text3);font-weight:600;margin-bottom:6px">
          <span>To goal: ${toGo} kg</span><span>${pctDone}%</span>
        </div>
        <div class="pbar-bg" style="height:6px">
          <div class="pbar-fill" style="width:${pctDone}%;background:linear-gradient(90deg,var(--purple),var(--cyan))"></div>
        </div>
      </div>
    </div>

    <!-- TODAY'S PLAN -->
    <div class="card">
      <div class="card-label">Today's Plan</div>
      ${todayHtml || '<div style="color:var(--text3);font-size:14px;padding:8px 0">No plan today — enjoy the rest 🛌</div>'}
    </div>

    <!-- QUICK STATS -->
    <div class="stat-grid">
      <div class="stat-card purple">
        <div class="stat-value purple">${kcalToday || '—'}</div>
        <div class="stat-unit">kcal today</div>
        <div class="stat-change" style="color:var(--text3)">target ${t.kcal}</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-value cyan">${protToday || '—'}<span style="font-size:18px">g</span></div>
        <div class="stat-unit">protein today</div>
        <div class="stat-change" style="color:var(--text3)">target ${t.protein}g</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value green">${toGo}</div>
        <div class="stat-unit">kg to milestone</div>
        <div class="stat-change pos">89 kg target</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value orange">${wk}</div>
        <div class="stat-unit">current week</div>
        <div class="stat-change" style="color:var(--text3)">${weekInfo.intensity}</div>
      </div>
    </div>

    <!-- WEEK FOCUS -->
    <div class="card">
      <div class="card-label">Week ${wk} Focus</div>
      <div style="font-size:17px;font-weight:800;margin-bottom:6px">${weekInfo.gymFocus}</div>
      <div style="font-size:14px;color:var(--text2);margin-bottom:10px">${weekInfo.runFocus}</div>
      <div class="strip strip-purple" style="margin-bottom:0">${weekInfo.notes}</div>
    </div>

    <!-- CALORIES -->
    <div class="card">
      <div class="card-label">Today's Nutrition</div>
      <div class="macro-ring-container">
        ${ringHTML(Math.min(1,kcalToday/t.kcal), 'var(--orange)', Math.round(kcalToday/t.kcal*100)+'%', 'kcal')}
        <div class="macro-labels">
          ${pbar('Protein', protToday, t.protein, 'var(--purple)')}
          ${pbar('Calories', kcalToday, t.kcal, 'var(--orange)', ' kcal')}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('eat')">Log food →</button>
    </div>

    <!-- SUPPLEMENTS -->
    <div class="card">
      <div class="card-label">Daily Supplements</div>
      ${SUPPLEMENTS.map((s,i)=>{
        const icons=['🧪','🥛','☀️','🐟'];
        const colors=['rgba(124,109,250,0.15)','rgba(0,212,255,0.1)','rgba(255,214,10,0.1)','rgba(0,230,118,0.1)'];
        return `<div class="supp-row">
          <div class="supp-icon" style="background:${colors[i]}">${icons[i]}</div>
          <div class="supp-info">
            <div class="supp-name">${s.name}</div>
            <div class="supp-dose">${s.dose} · ${s.timing}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════════════════════
   TRAIN
══════════════════════════════════════════════════════════════════════════════ */
let trainTab = 'workout', activeSession = 'A';

function renderTrain() {
  document.getElementById('train-body').innerHTML = `
    <div class="seg-ctrl">
      <button class="seg-btn ${trainTab==='workout'?'active':''}" onclick="setTrainTab('workout')">Workout</button>
      <button class="seg-btn ${trainTab==='running'?'active':''}" onclick="setTrainTab('running')">Running</button>
      <button class="seg-btn ${trainTab==='mobility'?'active':''}" onclick="setTrainTab('mobility')">Mobility</button>
      <button class="seg-btn ${trainTab==='schedule'?'active':''}" onclick="setTrainTab('schedule')">Schedule</button>
    </div>
    <div id="train-content"></div>
  `;
  renderTrainContent();
}
function setTrainTab(t){ trainTab=t; renderTrain(); }
function setSession(s){ activeSession=s; renderTrain(); }

function renderTrainContent() {
  const el = document.getElementById('train-content');

  if (trainTab === 'workout') {
    const d = today();
    const log = state.workoutLog[d]?.[activeSession] || [];
    const sess = SESSIONS[activeSession];
    const doneCount = log.filter(Boolean).length;
    const total = sess.exercises.length;
    el.innerHTML = `
      <div class="seg-ctrl">
        ${['A','B','C'].map(s=>`<button class="seg-btn ${activeSession===s?'active':''}" onclick="setSession('${s}')">Session ${s}</button>`).join('')}
      </div>
      <div class="card card-glow">
        <div class="session-badge">⚡ ${sess.label} — ${sess.focus}</div>
        <div style="margin-bottom:14px">
          <div class="pbar-bg"><div class="pbar-fill" style="width:${doneCount/total*100}%;background:var(--grad-green)"></div></div>
          <div style="font-size:12px;color:var(--text3);margin-top:5px;font-weight:600">${doneCount} / ${total} exercises done</div>
        </div>
        ${sess.exercises.map((ex,i)=>{
          const done = log[i]||false;
          return `<div class="exercise-row">
            <div class="ex-check ${done?'done':''}" onclick="toggleExercise('${d}','${activeSession}',${i})"></div>
            <div class="ex-info">
              <div class="ex-name ${done?'done':''}">${ex.name}</div>
              <div class="ex-sets">${ex.sets} × ${ex.reps}</div>
              <div class="ex-note">${ex.note}</div>
            </div>
          </div>`;
        }).join('')}
        <div style="margin-top:14px;display:flex;gap:8px">
          ${doneCount===total ? `<div style="flex:1;text-align:center;padding:10px;background:rgba(0,230,118,0.1);border-radius:12px;color:var(--green);font-weight:700">Session Complete! 🎉</div>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="clearSession('${d}','${activeSession}')">Reset</button>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Double Progression</div>
        <div class="card-body">Hit the <strong style="color:var(--cyan)">top of the rep range</strong> on all sets with solid form → add load next session. Target <strong style="color:var(--purple)">2–3 reps in reserve</strong> early, tightening to 1–2 RIR in harder weeks.</div>
      </div>
      <div class="card">
        <div class="card-label">Shoulder-Safe Warm-up</div>
        ${['5 min light bike/row','Thoracic extension on roller','Open books','Wall slides','Serratus drill','2 ramp-up sets for first press & row'].map((s,i)=>
          `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;align-items:center">
            <div style="width:24px;height:24px;border-radius:8px;background:var(--grad-purple);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${i+1}</div>
            <span style="color:var(--text2)">${s}</span>
          </div>`).join('')}
      </div>
    `;

  } else if (trainTab === 'running') {
    const wk = weekNum();
    const phase = RUNNING_PHASES.find(p => {
      const [a,b] = p.weeks.split('–').map(Number); return wk>=a && wk<=(b||a);
    }) || RUNNING_PHASES[0];
    el.innerHTML = `
      <div class="card card-glow">
        <div class="card-label">Current Phase — Week ${wk}</div>
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)"></div>
            <span style="font-size:15px;font-weight:800">Easy Run</span>
          </div>
          <div style="font-size:15px;color:var(--text2);margin-bottom:8px">${phase.easyRun}</div>
          <div class="strip strip-green" style="font-size:13px">Conversational pace — finish fresher than you started</div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--orange);box-shadow:0 0 8px var(--orange)"></div>
            <span style="font-size:15px;font-weight:800">Quality Run</span>
          </div>
          <div style="font-size:15px;color:var(--text2);margin-bottom:8px">${phase.qualityRun}</div>
          <div class="strip strip-orange" style="font-size:13px">Space 24h+ from heavy lower-body day</div>
        </div>
      </div>
      <div class="card">
        <div class="card-label">All Phases</div>
        ${RUNNING_PHASES.map(p=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:800;font-size:14px;color:var(--cyan);margin-bottom:4px">Weeks ${p.weeks}</div>
            <div style="font-size:13px;color:var(--text2)">Easy: ${p.easyRun}</div>
            <div style="font-size:13px;color:var(--orange);margin-top:2px">Quality: ${p.qualityRun}</div>
          </div>`).join('')}
      </div>
      <div class="strip strip-orange">Drop intensity before dropping consistency if recovery is poor.</div>
    `;

  } else if (trainTab === 'mobility') {
    const d = today();
    const done = state.mobilityLog[d] || [];
    const pct = Math.round(done.length/MOBILITY_DRILLS.length*100);
    el.innerHTML = `
      <div class="card ${pct===100?'card-glow':''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <div class="card-label">Daily Mobility</div>
            <div style="font-size:22px;font-weight:900">${done.length} <span style="font-size:14px;color:var(--text3);font-weight:600">/ ${MOBILITY_DRILLS.length} done</span></div>
          </div>
          ${pct===100 ? '<div style="font-size:32px">🎯</div>' : ''}
        </div>
        <div class="pbar-bg" style="margin-bottom:0">
          <div class="pbar-fill" style="width:${pct}%;background:var(--grad-orange)"></div>
        </div>
      </div>
      <div class="card">
        ${MOBILITY_DRILLS.map((drill,i)=>{
          const isDone = done.includes(i);
          const icons=['🫁','🦴','📖','🚪','🧱','💪','🎯','🤲'];
          return `<div class="drill-row" onclick="openDrill(${i})">
            <div class="drill-icon ${isDone?'done':''}">${isDone?'✅':icons[i]}</div>
            <div class="drill-info">
              <div class="drill-name ${isDone?'done':''}">${drill.name}</div>
              <div class="drill-reps">${drill.reps}</div>
            </div>
            <div class="drill-timer">${formatSec(drill.timerSec)}</div>
          </div>`;
        }).join('')}
        <div style="margin-top:12px">
          <button class="btn btn-ghost btn-sm" onclick="resetMobility()">Reset today</button>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Phase Priorities</div>
        ${[
          {wk:'1–4',lbl:'Mobility Access',txt:'Thoracic work, light activation, controlled tempo'},
          {wk:'5–8',lbl:'Stability',txt:'Add load to wall slides, face pulls, carries'},
          {wk:'9–12',lbl:'Integration',txt:'Keep mobility volume, increase loaded carries & pressing range'},
        ].map(p=>`
          <div style="padding:9px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-weight:800;font-size:14px">Weeks ${p.wk}</span>
              <span style="font-size:12px;color:var(--cyan);font-weight:700">${p.lbl}</span>
            </div>
            <div style="font-size:13px;color:var(--text2)">${p.txt}</div>
          </div>`).join('')}
      </div>
      <div class="strip strip-orange">⚠️ Sharp pain, numbness, or neck symptoms → stop and see a physio.</div>
    `;

  } else {
    el.innerHTML = `
      <div class="card">
        <div class="card-label">Weekly Blueprint</div>
        ${WEEKLY_SCHEDULE.map(row=>`
          <div class="sched-row">
            <div class="sched-day">${row.day.slice(0,3)}</div>
            <div class="sched-pills">
              ${row.gym?`<span class="pill pill-gym">💪 Session ${row.gym}</span>`:''}
              ${row.run?`<span class="pill pill-run">🏃 ${row.run}</span>`:''}
              ${!row.gym&&!row.run?`<span class="pill pill-rest">😴 Rest</span>`:''}
              <span class="pill pill-mob">🧘 Mobility</span>
            </div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-label">12-Week Microcycle</div>
        ${WEEK_PLAN.map(w=>`
          <div style="padding:9px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
              <span style="font-weight:800;font-size:15px">Week ${w.week}${w.week===9?' 🔄':''}</span>
              <span style="font-size:11px;color:${w.week===9?'var(--orange)':'var(--text3)'};font-weight:700;background:${w.week===9?'rgba(255,107,53,0.1)':'var(--bg3)'};padding:3px 8px;border-radius:20px">${w.intensity}</span>
            </div>
            <div style="font-size:13px;color:var(--text2)">${w.gymFocus}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">${w.notes}</div>
          </div>`).join('')}
      </div>
    `;
  }
}

function toggleExercise(date, session, idx) {
  if (!state.workoutLog[date]) state.workoutLog[date]={};
  if (!state.workoutLog[date][session]) state.workoutLog[date][session]=Array(SESSIONS[session].exercises.length).fill(false);
  state.workoutLog[date][session][idx] = !state.workoutLog[date][session][idx];
  save(); renderTrain();
}
function clearSession(date, session) {
  if (state.workoutLog[date]) delete state.workoutLog[date][session];
  save(); renderTrain();
}

/* ══════════════════════════════════════════════════════════════════════════════
   EAT
══════════════════════════════════════════════════════════════════════════════ */
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
function setEatTab(t){ eatTab=t; renderEat(); }

function renderEatContent() {
  const el = document.getElementById('eat-content');
  const d = today(), foods = state.foodLog[d]||[];
  const totalKcal = foods.reduce((s,f)=>s+f.kcal,0);
  const totalProt = foods.reduce((s,f)=>s+(f.protein||0),0);
  const t = NUTRITION_TARGETS.trainingDay;
  const remaining = Math.max(0, t.kcal - totalKcal);

  if (eatTab==='log') {
    el.innerHTML = `
      <div class="card">
        <div class="macro-ring-container">
          ${ringHTML(Math.min(1,totalKcal/t.kcal),'var(--orange)',Math.round(totalKcal/t.kcal*100)+'%','kcal')}
          <div class="macro-labels">
            ${pbar('Protein', totalProt, t.protein, 'var(--purple)')}
            ${pbar('Calories', totalKcal, t.kcal, 'var(--orange)', ' kcal')}
          </div>
        </div>
        <div class="kcal-bar">
          <div><div class="kcal-num">${totalKcal}</div><div class="kcal-label">eaten</div></div>
          <div style="text-align:center"><div style="font-size:22px;color:var(--text3);font-weight:900">—</div></div>
          <div style="text-align:center"><div class="kcal-num" style="color:var(--cyan)">${t.kcal}</div><div class="kcal-label">target</div></div>
          <div style="text-align:center"><div class="kcal-num" style="color:var(--green);font-size:22px">${remaining}</div><div class="kcal-label">left</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Log Food</div>
        <input class="log-input" id="food-name" placeholder="Food or meal name" type="text" style="width:100%;margin-bottom:8px">
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input class="log-input" id="food-kcal" placeholder="kcal" type="number" inputmode="decimal">
          <input class="log-input" id="food-prot" placeholder="protein (g)" type="number" inputmode="decimal">
        </div>
        <button class="btn btn-block" onclick="logFood()">+ Add Food</button>
      </div>
      ${foods.length ? `
      <div class="card">
        <div class="card-label">${foods.length} Items Logged Today</div>
        ${foods.map((f,i)=>`
          <div class="food-entry">
            <div class="food-name">${f.name}</div>
            <div class="food-kcal">${f.kcal} kcal</div>
            <div class="food-protein">${f.protein}g</div>
            <div class="food-del" onclick="deleteFood(${i})">×</div>
          </div>`).join('')}
      </div>` : ''}
      <div class="card">
        <div class="card-label">Adjustment Rules</div>
        <div class="strip strip-green">2-week avg <strong>under 0.25 kg/week</strong> → cut 100–150 kcal/day</div>
        <div class="strip strip-orange" style="margin-top:6px">Dropping <strong>over 0.8 kg/week</strong> and gym sliding → add 100–150 kcal/day</div>
      </div>
    `;

  } else if (eatTab==='meals') {
    const tpls = {omnivore:'🥩 Omnivore', vegetarian:'🥗 Vegetarian', highProtein:'💪 High-Protein'};
    el.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;margin-bottom:6px">
        ${Object.entries(tpls).map(([k,v])=>`<span class="meal-pill ${state.mealTemplate===k?'active':''}" onclick="setTemplate('${k}')">${v}</span>`).join('')}
      </div>
      <div class="card">
        <div class="card-label">${tpls[state.mealTemplate]}</div>
        ${MEAL_TEMPLATES[state.mealTemplate].map(m=>`
          <div style="padding:11px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--purple);margin-bottom:5px">${m.meal}</div>
            <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">${m.food}</div>
            <div style="font-size:13px;color:var(--green);font-weight:700">~${m.protein}g protein</div>
          </div>`).join('')}
        <div style="padding:10px 0;display:flex;justify-content:space-between;align-items:center">
          <span style="color:var(--text3);font-size:13px">Daily protein total</span>
          <span style="font-size:18px;font-weight:900;color:var(--green)">~${MEAL_TEMPLATES[state.mealTemplate].reduce((s,m)=>s+m.protein,0)}g</span>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Recipe Bank</div>
        ${[
          {e:'🍗',t:'Chicken & Roasted Pepper Bowl',b:'Roast chicken with paprika, garlic, lemon. Serve over rice with roasted peppers, broccoli, yoghurt-olive oil dressing. Batch-cookable.'},
          {e:'🦃',t:'Turkey Meatballs in Tomato Sauce',b:'5% turkey mince, oats, egg, garlic, parmesan. Bake then simmer in passata. Pasta + wilted spinach. No raw tomatoes.'},
          {e:'🌶️',t:'Beef & Bean Chilli',b:'Lean beef mince, beans, peppers, passata, spices. Serve with rice and yoghurt. Great for batch prep + fibre.'},
          {e:'🫙',t:'High-Protein Overnight Oats',b:'Oats, Greek yoghurt, milk, whey, berries, chia. Best way to front-load protein at breakfast.'},
          {e:'🧀',t:'Paneer Tikka Traybake',b:'Paneer or tofu with tikka spices, peppers, onions. Roast and serve with rice, lentils and mint yoghurt.'},
        ].map(r=>`
          <div style="padding:11px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:16px;font-weight:800;margin-bottom:5px">${r.e} ${r.t}</div>
            <div style="font-size:13px;color:var(--text2);line-height:1.5">${r.b}</div>
          </div>`).join('')}
      </div>
    `;

  } else {
    el.innerHTML = `
      <div class="card">
        <div class="card-label">Training Day</div>
        <div style="font-size:24px;font-weight:900;color:var(--orange);margin-bottom:12px">2,450–2,650 kcal</div>
        ${pbar('Protein', 195, 210, 'var(--purple)')}
        ${pbar('Carbohydrate', 260, 300, 'var(--cyan)')}
        ${pbar('Fat', 73, 80, 'var(--orange)')}
      </div>
      <div class="card">
        <div class="card-label">Rest / Easy Day</div>
        <div style="font-size:24px;font-weight:900;color:var(--cyan);margin-bottom:12px">2,200–2,350 kcal</div>
        ${pbar('Protein', 195, 210, 'var(--purple)')}
        ${pbar('Carbohydrate', 180, 220, 'var(--cyan)')}
        ${pbar('Fat', 78, 85, 'var(--orange)')}
      </div>
      <div class="card">
        <div class="card-label">Protein Rules</div>
        <div class="strip strip-purple">35–50 g per main meal · 3–5 feedings per day</div>
        <div class="strip strip-green" style="margin-top:6px">25–40 g within 1–2 hours post-lift</div>
      </div>
      <div class="card">
        <div class="card-label">Heart Health (Cholesterol)</div>
        <div style="font-size:14px;color:var(--text2);line-height:1.7">
          ✅ Olive oil, nuts, seeds, avocado<br>
          ✅ Oats, beans, lentils (soluble fibre)<br>
          ✅ Lean cuts, poultry, eggs<br>
          ⚠️ Limit red/processed meat & full-fat dairy
        </div>
      </div>
    `;
  }
}

function setTemplate(t){ state.mealTemplate=t; save(); renderEat(); }

function logFood() {
  const name=document.getElementById('food-name').value.trim();
  const kcal=parseInt(document.getElementById('food-kcal').value)||0;
  const prot=parseInt(document.getElementById('food-prot').value)||0;
  if (!name||!kcal) return;
  const d=today();
  if (!state.foodLog[d]) state.foodLog[d]=[];
  state.foodLog[d].push({name,kcal,protein:prot});
  save(); renderEat();
}
function deleteFood(idx){
  const d=today(); state.foodLog[d]?.splice(idx,1); save(); renderEat();
}

/* ══════════════════════════════════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════════════════════════════════ */
let histTab = 'log';

function renderHistory() {
  document.getElementById('history-body').innerHTML = `
    <div class="seg-ctrl">
      <button class="seg-btn ${histTab==='log'?'active':''}" onclick="setHistTab('log')">Activity</button>
      <button class="seg-btn ${histTab==='calendar'?'active':''}" onclick="setHistTab('calendar')">Calendar</button>
      <button class="seg-btn ${histTab==='nutrition'?'active':''}" onclick="setHistTab('nutrition')">Nutrition</button>
    </div>
    <div id="history-content"></div>
  `;
  renderHistoryContent();
}
function setHistTab(t){ histTab=t; renderHistory(); }

function renderHistoryContent() {
  const el = document.getElementById('history-content');

  // Build all activity entries across all dates
  const allDates = new Set([
    ...Object.keys(state.workoutLog),
    ...Object.keys(state.mobilityLog),
    ...Object.keys(state.foodLog),
    ...state.weightLog.map(w=>w.date),
    ...state.waistLog.map(w=>w.date),
  ]);
  const sorted = [...allDates].sort((a,b)=>b.localeCompare(a));

  if (histTab === 'log') {
    if (sorted.length === 0) {
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:40px 20px">
          <div style="font-size:48px;margin-bottom:12px">📋</div>
          <div style="font-size:18px;font-weight:800;margin-bottom:8px">No history yet</div>
          <div style="font-size:14px;color:var(--text3)">Start logging workouts, food and measurements — they'll all appear here.</div>
        </div>`;
      return;
    }

    // Streak calculation
    let streak = 0;
    const td = today();
    let checkDate = new Date(td);
    while (true) {
      const ds = checkDate.toISOString().split('T')[0];
      const hasActivity = state.workoutLog[ds] || state.foodLog[ds] || state.mobilityLog[ds];
      if (hasActivity) { streak++; checkDate.setDate(checkDate.getDate()-1); }
      else break;
    }

    // Stats summary
    const totalWorkouts = Object.values(state.workoutLog).reduce((s,day)=>s+Object.keys(day).length,0);
    const totalMobDays  = Object.keys(state.mobilityLog).filter(d=>state.mobilityLog[d].length>0).length;
    const totalFoodDays = Object.keys(state.foodLog).filter(d=>state.foodLog[d].length>0).length;

    el.innerHTML = `
      <div class="stat-grid" style="margin-bottom:12px">
        <div class="stat-card purple">
          <div class="stat-value purple">${streak}</div>
          <div class="stat-unit">day streak 🔥</div>
        </div>
        <div class="stat-card cyan">
          <div class="stat-value cyan">${totalWorkouts}</div>
          <div class="stat-unit">gym sessions</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-value orange">${totalMobDays}</div>
          <div class="stat-unit">mobility days</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value green">${totalFoodDays}</div>
          <div class="stat-unit">days logged</div>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Activity Log</div>
        ${sorted.map(d => {
          const wl = state.workoutLog[d];
          const ml = state.mobilityLog[d];
          const fl = state.foodLog[d];
          const wt = state.weightLog.find(w=>w.date===d);
          const ws = state.waistLog.find(w=>w.date===d);
          const entries = [];

          if (wl) Object.entries(wl).forEach(([sess, exs])=>{
            const done = exs.filter(Boolean).length;
            entries.push({type:'gym', icon:'💪', title:`Session ${sess} — ${SESSIONS[sess].focus}`, meta:`${done}/${SESSIONS[sess].exercises.length} exercises completed`});
          });

          if (fl && fl.length) {
            const kcal = fl.reduce((s,f)=>s+f.kcal,0);
            const prot = fl.reduce((s,f)=>s+(f.protein||0),0);
            entries.push({type:'eat', icon:'🥗', title:`Nutrition logged`, meta:`${kcal} kcal · ${prot}g protein · ${fl.length} items`});
          }

          if (ml && ml.length) entries.push({type:'mob', icon:'🧘', title:`Mobility done`, meta:`${ml.length}/${MOBILITY_DRILLS.length} drills completed`});
          if (wt) entries.push({type:'gym', icon:'⚖️', title:`Weight: ${wt.kg} kg`, meta:`${(PROFILE.startWeightKg-wt.kg).toFixed(1)} kg lost since start`});
          if (ws) entries.push({type:'run', icon:'📏', title:`Waist: ${ws.cm} cm`, meta:`${(PROFILE.startWaistCm-ws.cm).toFixed(1)} cm reduced`});

          if (!entries.length) return '';

          return `
            <div style="margin-bottom:14px">
              <div style="font-size:12px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${dayName(d)} ${fmtFull(d)}${d===today()?' · Today':''}</div>
              ${entries.map(e=>`
                <div class="history-entry">
                  <div class="history-dot ${e.type}">${e.icon}</div>
                  <div class="history-info">
                    <div class="history-title">${e.title}</div>
                    <div class="history-meta">${e.meta}</div>
                  </div>
                </div>`).join('')}
            </div>`;
        }).join('')}
      </div>
    `;

  } else if (histTab === 'calendar') {
    // Show last 5 weeks as a calendar heatmap
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const cells = [];
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate()-34);

    // Pad start to Monday
    while (start.getDay() !== 1) start.setDate(start.getDate()-1);

    const cur = new Date(start);
    while (cur <= end) {
      const ds = cur.toISOString().split('T')[0];
      const hasGym = !!state.workoutLog[ds] && Object.keys(state.workoutLog[ds]).length > 0;
      const hasRun = false; // future: could track run sessions
      const hasMob = (state.mobilityLog[ds]||[]).length > 0;
      const isToday = ds === today();
      let cls = '';
      if (hasGym && hasMob) cls = 'has-both';
      else if (hasGym) cls = 'has-gym';
      else if (hasMob) cls = 'has-mob';
      cells.push({date:ds, day:cur.getDate(), cls, isToday, future: cur > new Date()});
      cur.setDate(cur.getDate()+1);
    }

    el.innerHTML = `
      <div class="card">
        <div class="card-label">Activity Heatmap · Last 5 Weeks</div>
        <div class="cal-grid">
          ${days.map(d=>`<div class="cal-day-label">${d}</div>`).join('')}
          ${cells.map(c=>`<div class="cal-cell ${c.cls}${c.isToday?' is-today':''}${c.future?' empty':''}">${c.day}</div>`).join('')}
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:12px;color:var(--text3)">
          <span><span style="color:var(--purple)">■</span> Gym</span>
          <span><span style="color:var(--orange)">■</span> Mobility ring</span>
          <span><span style="color:white">■</span> Gym + Mobility</span>
          <span><span style="color:var(--cyan)">□</span> Today</span>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Weight History</div>
        <canvas id="hist-weight-chart" width="320" height="140" style="width:100%;border-radius:8px"></canvas>
        ${state.weightLog.length===0?'<div style="text-align:center;padding:20px;color:var(--text3);font-size:14px">No weight logs yet — log via Progress tab</div>':''}
        ${state.weightLog.slice(-7).reverse().map(w=>`
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="color:var(--text2);font-weight:500">${dayName(w.date)} ${fmtFull(w.date)}</span>
            <span style="font-weight:800;color:var(--cyan)">${w.kg} kg</span>
          </div>`).join('')}
      </div>
    `;
    drawHistChart();

  } else {
    // Nutrition history
    const nutDates = Object.keys(state.foodLog).filter(d=>state.foodLog[d].length>0).sort((a,b)=>b.localeCompare(a));
    el.innerHTML = `
      <div class="card">
        <div class="card-label">Nutrition History</div>
        ${nutDates.length===0?'<div style="text-align:center;padding:20px;color:var(--text3);font-size:14px">No nutrition logs yet — log food via Fuel tab</div>':''}
        ${nutDates.map(d=>{
          const foods = state.foodLog[d];
          const kcal = foods.reduce((s,f)=>s+f.kcal,0);
          const prot = foods.reduce((s,f)=>s+(f.protein||0),0);
          const t = NUTRITION_TARGETS.trainingDay;
          const pct = Math.min(100, Math.round(kcal/t.kcal*100));
          return `
            <div style="padding:12px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div>
                  <div style="font-weight:800;font-size:15px">${dayName(d)} ${fmtFull(d)}${d===today()?' <span style="color:var(--cyan);font-size:12px">today</span>':''}</div>
                  <div style="font-size:12px;color:var(--text3);margin-top:2px">${foods.length} items logged</div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:900;font-size:20px;color:var(--orange)">${kcal} <span style="font-size:12px;font-weight:600">kcal</span></div>
                  <div style="font-size:13px;color:var(--purple);font-weight:700">${prot}g protein</div>
                </div>
              </div>
              <div class="pbar-bg" style="height:5px">
                <div class="pbar-fill" style="width:${pct}%;background:${pct>=90?'var(--green)':pct>=70?'var(--orange)':'var(--red)'}"></div>
              </div>
            </div>`;
        }).join('')}
      </div>
    `;
  }
}

function drawHistChart() {
  const canvas = document.getElementById('hist-weight-chart');
  if (!canvas || state.weightLog.length < 2) return;
  const data = state.weightLog.map(w=>({val:w.kg}));
  drawLineChart('hist-weight-chart', data, 'var(--cyan)', PROFILE.startWeightKg);
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROGRESS
══════════════════════════════════════════════════════════════════════════════ */
let progTab = 'weight';

function renderProgress() {
  document.getElementById('prog-body').innerHTML = `
    <div class="seg-ctrl">
      <button class="seg-btn ${progTab==='weight'?'active':''}" onclick="setProgTab('weight')">Weight</button>
      <button class="seg-btn ${progTab==='waist'?'active':''}" onclick="setProgTab('waist')">Waist</button>
      <button class="seg-btn ${progTab==='dna'?'active':''}" onclick="setProgTab('dna')">DNA Insights</button>
    </div>
    <div id="prog-content"></div>
  `;
  renderProgContent();
}
function setProgTab(t){ progTab=t; renderProgress(); }

function renderProgContent() {
  const el = document.getElementById('prog-content');

  if (progTab === 'weight') {
    const wl = state.weightLog;
    const latest = wl.length ? wl[wl.length-1].kg : PROFILE.startWeightKg;
    const avg7 = wl.length>=7 ? (wl.slice(-7).reduce((s,w)=>s+w.kg,0)/7).toFixed(1) : latest;
    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card cyan"><div class="stat-value cyan">${latest}</div><div class="stat-unit">kg current</div></div>
        <div class="stat-card purple"><div class="stat-value purple">${avg7}</div><div class="stat-unit">7-day avg</div></div>
        <div class="stat-card green"><div class="stat-value green">${(PROFILE.startWeightKg-latest).toFixed(1)}</div><div class="stat-unit">kg lost</div></div>
        <div class="stat-card orange"><div class="stat-value orange">${Math.max(0,latest-PROFILE.targetWeightKg).toFixed(1)}</div><div class="stat-unit">kg to 89 kg</div></div>
      </div>
      <div class="card">
        <div class="card-label">Log Today's Weight</div>
        <div class="log-form">
          <input class="log-input" id="weight-input" placeholder="${latest} kg" type="number" inputmode="decimal" step="0.1">
          <button class="btn" onclick="logWeight()">Log</button>
        </div>
      </div>
      <div class="card">
        <div class="card-label">Weight Trend</div>
        <canvas id="weight-chart" width="320" height="150" style="width:100%;border-radius:8px;margin-bottom:12px"></canvas>
        ${wl.slice(-10).reverse().map(w=>`
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="color:var(--text2)">${dayName(w.date)} ${fmtFull(w.date)}</span>
            <span style="font-weight:800;color:var(--cyan)">${w.kg} kg</span>
          </div>`).join('')}
        ${wl.length===0?'<div style="text-align:center;padding:16px;color:var(--text3)">Log your first weigh-in above</div>':''}
      </div>
      <div class="card">
        <div class="card-label">Milestones</div>
        ${[
          {kg:95.8,label:'Start weight',note:PROFILE.startDate},
          {kg:93,  label:'Early momentum'},
          {kg:91,  label:'Approaching milestone'},
          {kg:89,  label:'First milestone 🎯'},
          {kg:86,  label:'Lean phase'},
          {kg:83.6,label:'~12% body fat (lean mass held)'},
        ].map(m=>{
          const reached = latest <= m.kg;
          return `<div class="milestone-row">
            <div class="ms-check">${reached?'✅':'⬜'}</div>
            <div class="ms-info"><div class="ms-label ${reached?'done':''}">${m.label}</div>${m.note?`<div style="font-size:11px;color:var(--text3)">${fmt(m.note)}</div>`:''}</div>
            <div class="ms-kg ${reached?'done':''}">${m.kg}</div>
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
        <div class="stat-card cyan"><div class="stat-value cyan">${latest}</div><div class="stat-unit">cm current</div></div>
        <div class="stat-card purple"><div class="stat-value purple">${PROFILE.startWaistCm}</div><div class="stat-unit">cm start</div></div>
        <div class="stat-card green"><div class="stat-value green">${(PROFILE.startWaistCm-latest).toFixed(1)}</div><div class="stat-unit">cm lost</div></div>
        <div class="stat-card orange"><div class="stat-value orange">4–8</div><div class="stat-unit">cm 12wk target</div></div>
      </div>
      <div class="card">
        <div class="card-label">Log Waist (Weekly)</div>
        <div class="log-form">
          <input class="log-input" id="waist-input" placeholder="${latest} cm" type="number" inputmode="decimal" step="0.5">
          <button class="btn" onclick="logWaist()">Log</button>
        </div>
        <div class="strip strip-orange" style="margin-top:10px;font-size:13px">Measure at navel, relaxed. Same time weekly.</div>
      </div>
      <div class="card">
        <div class="card-label">Waist Trend</div>
        <canvas id="waist-chart" width="320" height="150" style="width:100%;border-radius:8px;margin-bottom:12px"></canvas>
        ${wl.slice(-8).reverse().map(w=>`
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="color:var(--text2)">${fmt(w.date)}</span>
            <span style="font-weight:800;color:var(--green)">${w.cm} cm</span>
          </div>`).join('')}
        ${wl.length===0?'<div style="text-align:center;padding:16px;color:var(--text3)">Log your first waist measurement above</div>':''}
      </div>
      <div class="strip strip-purple">Scale stalls but waist falls + lifts hold? → Recomp happening. Don't panic.</div>
      <div class="strip strip-orange" style="margin-top:-4px">Weight drops fast but waist static + gym sliding? → Deficit too deep. Add 100–150 kcal.</div>
    `;
    drawWaistChart();

  } else {
    el.innerHTML = `
      <div class="card">
        <div class="card-label">About Your Vitl DNA Report</div>
        <div class="card-body" style="margin-bottom:10px">Your test covers nutrition, fitness, caffeine/sleep & vitamin traits. Use the conditional rules below based on your actual trait results.</div>
        <div class="strip strip-cyan">DNA markers fine-tune the programme — calories, protein, training & sleep explain far more of your outcome than any single SNP.</div>
      </div>
      ${DNA_INSIGHTS.map(d=>`
        <div class="dna-card">
          <div class="dna-header">
            <div class="dna-icon">${d.icon}</div>
            <div><div class="dna-title">${d.trait}</div><div class="dna-marker">${d.marker}</div></div>
          </div>
          ${Object.entries(d).filter(([k])=>!['trait','marker','icon'].includes(k)).map(([k,v])=>`
            <div class="dna-option">
              <strong>${k.charAt(0).toUpperCase()+k.slice(1).replace(/([A-Z])/g,' $1')} →</strong>${v}
            </div>`).join('')}
        </div>`).join('')}
    `;
  }
}

/* ─── Chart drawing ───────────────────────────────────────────────────────── */
function drawLineChart(id, data, color, startVal) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const dpr = window.devicePixelRatio||1;
  const w = canvas.offsetWidth, h = canvas.offsetHeight||150;
  canvas.width = w*dpr; canvas.height = h*dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);

  const vals = [startVal, ...data.map(d=>d.val)];
  if (vals.length < 2) return;
  const min = Math.min(...vals)-0.5, max = Math.max(...vals)+0.5;
  const pad = {t:16,b:24,l:36,r:10};
  const pw = w-pad.l-pad.r, ph = h-pad.t-pad.b;
  const px = i => pad.l + (i/(vals.length-1))*pw;
  const py = v => pad.t + ph - (v-min)/(max-min)*ph;

  // Grid lines
  [0,0.5,1].forEach(f=>{
    const y=pad.t+ph*(1-f), v=(min+f*(max-min)).toFixed(1);
    ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
    ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font=`bold ${10*dpr/dpr}px -apple-system`;
    ctx.fillText(v, 2, y+4);
  });

  // Gradient fill
  const grad = ctx.createLinearGradient(0,pad.t,0,h-pad.b);
  const col = color.startsWith('var(') ? (color==='var(--cyan)'?'#00d4ff':color==='var(--green)'?'#00e676':'#7c6dfa') : color;
  grad.addColorStop(0, col+'55'); grad.addColorStop(1, col+'00');
  ctx.beginPath(); ctx.moveTo(px(0),py(vals[0]));
  vals.forEach((v,i)=>i>0&&ctx.lineTo(px(i),py(v)));
  ctx.lineTo(px(vals.length-1),h-pad.b); ctx.lineTo(px(0),h-pad.b); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();

  // Line
  ctx.beginPath(); ctx.moveTo(px(0),py(vals[0]));
  vals.forEach((v,i)=>i>0&&ctx.lineTo(px(i),py(v)));
  ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();

  // Dots
  vals.forEach((v,i)=>{
    ctx.beginPath(); ctx.arc(px(i),py(v),4,0,Math.PI*2);
    ctx.fillStyle=col; ctx.fill();
    ctx.strokeStyle='#07070f'; ctx.lineWidth=2; ctx.stroke();
  });
}

function drawWeightChart() { drawLineChart('weight-chart', state.weightLog.map(w=>({val:w.kg})), 'var(--cyan)', PROFILE.startWeightKg); }
function drawWaistChart()  { drawLineChart('waist-chart',  state.waistLog.map(w=>({val:w.cm})),  'var(--green)', PROFILE.startWaistCm); }

function logWeight() {
  const v=parseFloat(document.getElementById('weight-input').value);
  if (!v||v<40||v>200) return;
  const d=today();
  state.weightLog=state.weightLog.filter(w=>w.date!==d);
  state.weightLog.push({date:d,kg:v});
  state.weightLog.sort((a,b)=>a.date.localeCompare(b.date));
  save(); renderProgress();
}
function logWaist() {
  const v=parseFloat(document.getElementById('waist-input').value);
  if (!v||v<50||v>200) return;
  const d=today();
  state.waistLog=state.waistLog.filter(w=>w.date!==d);
  state.waistLog.push({date:d,cm:v});
  state.waistLog.sort((a,b)=>a.date.localeCompare(b.date));
  save(); renderProgress();
}

/* ══════════════════════════════════════════════════════════════════════════════
   MOBILITY MODAL
══════════════════════════════════════════════════════════════════════════════ */
let activeTimer=null, timerSec=0, timerRunning=false, timerDrillIdx=null;

function openDrill(idx) {
  const drill=MOBILITY_DRILLS[idx]; timerDrillIdx=idx; timerSec=drill.timerSec; timerRunning=false;
  if (activeTimer) clearInterval(activeTimer);
  document.getElementById('drill-modal-title').textContent=drill.name;
  document.getElementById('drill-modal-reps').textContent=drill.reps;
  document.getElementById('drill-modal-why').textContent=drill.why;
  document.getElementById('timer-toggle').textContent='▶ Start';
  updateTimerDisplay();
  document.getElementById('drill-modal').classList.add('open');
}
function closeDrillModal() {
  document.getElementById('drill-modal').classList.remove('open');
  if (activeTimer) clearInterval(activeTimer); timerRunning=false;
}
function toggleTimer() {
  if (timerRunning) {
    clearInterval(activeTimer); timerRunning=false;
    document.getElementById('timer-toggle').textContent='▶ Resume';
  } else {
    timerRunning=true; document.getElementById('timer-toggle').textContent='⏸ Pause';
    activeTimer=setInterval(()=>{
      if (timerSec>0){ timerSec--; updateTimerDisplay(); }
      else {
        clearInterval(activeTimer); timerRunning=false;
        document.getElementById('timer-toggle').textContent='▶ Start';
        if (navigator.vibrate) navigator.vibrate([200,100,200]);
        markDrillDone(timerDrillIdx);
      }
    },1000);
  }
}
function resetTimer() {
  if (activeTimer) clearInterval(activeTimer); timerRunning=false;
  timerSec=MOBILITY_DRILLS[timerDrillIdx].timerSec;
  document.getElementById('timer-toggle').textContent='▶ Start';
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const m=Math.floor(timerSec/60).toString().padStart(2,'0');
  const s=(timerSec%60).toString().padStart(2,'0');
  document.getElementById('timer-display').textContent=`${m}:${s}`;
}
function markDrillDone(idx) {
  const d=today();
  if (!state.mobilityLog[d]) state.mobilityLog[d]=[];
  if (!state.mobilityLog[d].includes(idx)) state.mobilityLog[d].push(idx);
  save(); closeDrillModal(); renderTrain();
}
function resetMobility() {
  state.mobilityLog[today()]=[];
  save(); renderTrain();
}
function formatSec(s){ const m=Math.floor(s/60),ss=s%60; return m>0?`${m}:${ss.toString().padStart(2,'0')}`:`${ss}s`; }

/* ══════════════════════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════════════════════ */
const renders = { home:renderHome, train:renderTrain, eat:renderEat, history:renderHistory, progress:renderProgress };

window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/glen-fitness-app/sw.js').catch(()=>{});
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.tab)));
  navigate('home');
});
