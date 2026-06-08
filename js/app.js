/* ─── Storage ─────────────────────────────────────────────────────────────── */
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// Restore active tab when phone wakes from sleep
let _activeTab = store.get('fitplan_tab') || 'home';

/* ─── State ───────────────────────────────────────────────────────────────── */
let state = store.get('fitplan_v2') || {
  weightLog:   [],
  waistLog:    [],
  foodLog:     {},
  workoutLog:  {},
  mobilityLog: {},
  mealTemplate: 'omnivore',
  restSec: 90,
};
if (state.restSec == null) state.restSec = 90;
function save() { state.updatedAt = Date.now(); store.set('fitplan_v2', state); if (window.cloudPush) window.cloudPush(); }

/* ─── Workout-log model (per-set weight/reps) ─────────────────────────────────── */
function parseSetCount(setsStr) { const m = String(setsStr).match(/\d+/); return m ? Math.max(1, parseInt(m[0])) : 3; }
function blankSets(ex) { return Array.from({length: parseSetCount(ex.sets)}, () => ({ w:'', r:'', done:false })); }
function ensureSession(date, session) {
  if (!state.workoutLog[date]) state.workoutLog[date] = {};
  let s = state.workoutLog[date][session];
  const exs = SESSIONS[session].exercises;
  if (Array.isArray(s)) {                      // migrate old boolean-array format
    s = { sets: exs.map((ex,i) => { const arr = blankSets(ex); if (s[i]) arr.forEach(x => x.done = true); return arr; }), finishedAt: null };
    state.workoutLog[date][session] = s;
  } else if (!s) {
    s = { sets: exs.map(blankSets), finishedAt: null };
    state.workoutLog[date][session] = s;
  } else if (!s.sets) {
    s.sets = exs.map(blankSets); s.finishedAt = s.finishedAt || null;
  }
  if (!s.names)   s.names   = {};   // per-day exercise substitutions  {ei: "New name"}
  if (!s.skipped) s.skipped = {};   // exercises skipped today          {ei: true}
  return s;
}
// A session "counts" only once it has real work — at least one completed set
// or an explicit finish. Stops merely *viewing* a session tab from creating
// phantom 0/N entries in History and inflating the gym-session count.
function sessionHasWork(sd) {
  if (Array.isArray(sd)) return sd.some(Boolean);                 // legacy boolean array
  if (sd && sd.sets) return !!sd.finishedAt || sd.sets.some(a => a.some(s => s.done));
  return false;
}
function dayHasGym(ds) {
  const wl = state.workoutLog[ds];
  return !!wl && Object.entries(wl).some(([sess, sd]) => SESSIONS[sess] && sessionHasWork(sd));
}

/* ─── Progression lookups (per-exercise history, "last time", charts) ──────────── */
// Completed sets for one exercise slot on a given day, as {w,r} numbers.
function doneSetsFor(sd, ei) {
  if (!sd || !sd.sets || (sd.skipped && sd.skipped[ei])) return [];
  return (sd.sets[ei] || [])
    .filter(s => s.done && (s.w !== '' || s.r !== ''))
    .map(s => ({ w: parseFloat(s.w) || 0, r: parseInt(s.r) || 0 }));
}
// Render a set list as "60×8, 60×8, 65×6".
function fmtSets(arr) { return arr.map(s => `${s.w || '–'}×${s.r || '–'}`).join(', '); }
// Heaviest working-set weight in a list (drives the progression chart).
function topWeight(arr) { return arr.reduce((m, s) => Math.max(m, s.w), 0); }
// Total volume (Σ weight × reps) of a set list.
function volOf(arr) { return arr.reduce((m, s) => m + s.w * s.r, 0); }

// Every logged performance of one program slot (session + exercise index),
// newest first. Keyed by the fixed slot so it survives day-to-day; carries
// that day's display name so swaps still read correctly.
function exerciseHistory(session, ei, includeToday) {
  const td = today();
  return Object.keys(state.workoutLog)
    .filter(d => includeToday || d < td)
    .sort((a, b) => b.localeCompare(a))
    .map(d => {
      const sd = state.workoutLog[d][session];
      const done = doneSetsFor(sd, ei);
      if (!done.length) return null;
      const name = (sd.names && sd.names[ei]) || SESSIONS[session].exercises[ei].name;
      return { date: d, sets: done, name, top: topWeight(done), vol: volOf(done) };
    })
    .filter(Boolean);
}
// Most recent prior performance (powers the inline "last time" hint).
function lastPerformance(session, ei) {
  const h = exerciseHistory(session, ei, false);
  return h.length ? h[0] : null;
}

// Minimal responsive SVG line chart for a series of numbers.
function sparkline(vals, w, h) {
  w = w || 280; h = h || 72;
  if (vals.length < 2) return '';
  const max = Math.max(...vals), min = Math.min(...vals), range = (max - min) || 1, pad = 8;
  const step = (w - pad * 2) / (vals.length - 1);
  const xy = i => {
    const x = pad + i * step;
    const y = h - pad - ((vals[i] - min) / range) * (h - pad * 2);
    return [x, y];
  };
  const pts = vals.map((_, i) => xy(i).map(n => n.toFixed(1)).join(',')).join(' ');
  const dots = vals.map((_, i) => { const [x, y] = xy(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="var(--orange)"/>`; }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="xMidYMid meet" style="display:block">
    <polyline points="${pts}" fill="none" stroke="var(--orange)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
  </svg>`;
}

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
  const r = 34, c = 2*Math.PI*r, fill = Math.min(1, pct)*c;
  return `<div class="ring-wrap">
    <svg class="ring-svg" width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="rgba(18,22,40,0.07)" stroke-width="8"/>
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${fill} ${c}" stroke-linecap="round"/>
    </svg>
    <div class="ring-ctr" style="color:${color}">${label}<small>${sub}</small></div>
  </div>`;
}

function pbar(label, val, target, color, unit='g') {
  const pct = Math.min(100, Math.round(val/target*100));
  return `<div class="pb">
    <div class="pbh">
      <span class="pbl">${label}</span>
      <span class="pbv" style="color:${color}">${val}${unit} <span style="color:var(--text3);font-weight:500">/ ${target}${unit}</span></span>
    </div>
    <div class="pbb"><div class="pbf" style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */
function navigate(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-'+tab).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  _activeTab = tab;
  store.set('fitplan_tab', tab); // persist so sleep/wake restores here
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
    return `<div class="wdot ${cls}">${w===9?'🔄':w}</div>`;
  }).join('');

  // Today plan
  let todayHtml = '';
  if (plan) {
    if (plan.gym) todayHtml += `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(14,165,233,0.12);display:flex;align-items:center;justify-content:center;font-size:20px">💪</div>
        <div><div style="font-weight:700;font-size:15px">Gym Session ${plan.gym}</div><div style="font-size:13px;color:var(--text3)">${SESSIONS[plan.gym].focus}</div></div>
        <button class="btn ghost sm" style="margin-left:auto" onclick="navigate('train')">Go</button>
      </div>`;
    if (plan.run) todayHtml += `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(0,230,118,0.12);display:flex;align-items:center;justify-content:center;font-size:20px">🏃</div>
        <div><div style="font-weight:700;font-size:15px">${plan.run} Run</div><div style="font-size:13px;color:var(--text3)">${plan.note}</div></div>
        <button class="btn ghost sm" style="margin-left:auto;color:var(--green);border-color:rgba(0,230,118,0.3)" onclick="navigate('train')">Go</button>
      </div>`;
    todayHtml += `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0">
        <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,107,53,0.1);display:flex;align-items:center;justify-content:center;font-size:20px">🧘</div>
        <div><div style="font-weight:700;font-size:15px">Mobility Routine</div><div style="font-size:13px;color:var(--text3)">8 drills · ~12 min</div></div>
        <button class="btn ghost sm" style="margin-left:auto;color:var(--orange);border-color:rgba(255,107,53,0.3)" onclick="navigate('train')">Go</button>
      </div>`;
    if (!plan.gym && !plan.run) todayHtml = `<div style="padding:12px 0;color:var(--text2);font-size:15px">Rest day — walk, recover, prep meals 🛌</div>`;
  }

  document.getElementById('home-body').innerHTML = `
    <div id="cloud-card"></div>
    <div class="hero">
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Week ${wk} of 12</div>
          <div style="font-size:28px;font-weight:900;letter-spacing:-0.8px;line-height:1.1">Hey Glen 👋</div>
          <div style="font-size:13px;color:var(--text3);margin-top:5px">${dow} · ${fmtFull(d)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:36px;font-weight:900;letter-spacing:-1.5px;color:var(--cyan);line-height:1">${latestW}</div>
          <div style="font-size:11px;color:var(--text3);font-weight:600;margin-top:3px;text-transform:uppercase;letter-spacing:0.4px">kg now</div>
          ${parseFloat(lost)>0?`<div style="font-size:12px;color:var(--green);font-weight:700;margin-top:3px">▼ ${lost} kg lost</div>`:''}
        </div>
      </div>
      <div class="wd">${dots}</div>
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);font-weight:600;margin-bottom:5px">
          <span>${toGo} kg to go</span><span>${pctDone}%</span>
        </div>
        <div class="pbb">
          <div class="pbf" style="width:${pctDone}%;background:linear-gradient(90deg,var(--purple),var(--cyan))"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="lbl">Today's Plan</div>
      ${todayHtml||'<div style="color:var(--text3);font-size:14px;padding:6px 0">Rest day — walk, recover, prep meals 🛌</div>'}
    </div>

    <div class="sg">
      <div class="sc p">
        <div class="sv p">${kcalToday||'0'}</div>
        <div class="su">kcal today</div>
        <div class="sm">target ${t.kcal}</div>
      </div>
      <div class="sc c">
        <div class="sv c">${protToday||'0'}<span style="font-size:16px">g</span></div>
        <div class="su">protein</div>
        <div class="sm">target ${t.protein}g</div>
      </div>
      <div class="sc g">
        <div class="sv g">${toGo}</div>
        <div class="su">kg to goal</div>
        <div class="sm" style="color:var(--green)">89 kg milestone</div>
      </div>
      <div class="sc o">
        <div class="sv o">${wk}</div>
        <div class="su">current week</div>
        <div class="sm">${weekInfo.intensity}</div>
      </div>
    </div>

    <div class="card">
      <div class="lbl">Week ${wk} Focus</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:5px">${weekInfo.gymFocus}</div>
      <div style="font-size:13.5px;color:var(--text2);margin-bottom:9px">${weekInfo.runFocus}</div>
      <div class="strip p" style="margin-bottom:0">${weekInfo.notes}</div>
    </div>

    <div class="card">
      <div class="lbl">Today's Nutrition</div>
      <div class="mrc">
        ${ringHTML(Math.min(1,kcalToday/t.kcal),'var(--orange)',Math.round(kcalToday/t.kcal*100)+'%','kcal')}
        <div class="mrl">
          ${pbar('Protein',protToday,t.protein,'var(--purple)')}
          ${pbar('Calories',kcalToday,t.kcal,'var(--orange)',' kcal')}
        </div>
      </div>
      <button class="btn ghost sm" onclick="navigate('eat')">Log food →</button>
    </div>

    <div class="card">
      <div class="lbl">Daily Supplements</div>
      ${SUPPLEMENTS.map((s,i)=>{
        const icons=['🧪','🥛','☀️','🐟'];
        const bgs=['rgba(139,127,255,0.12)','rgba(34,211,238,0.08)','rgba(251,191,36,0.1)','rgba(74,222,128,0.08)'];
        return `<div class="suprow"><div class="supico" style="background:${bgs[i]}">${icons[i]}</div>
          <div><div class="supnm">${s.name}</div><div class="supd">${s.dose} · ${s.timing}</div></div>
        </div>`;
      }).join('')}
    </div>
  `;
  if (window.renderCloudCard) renderCloudCard();
}

/* ══════════════════════════════════════════════════════════════════════════════
   TRAIN
══════════════════════════════════════════════════════════════════════════════ */
let trainTab = 'workout', activeSession = 'A';

function renderTrain() {
  document.getElementById('train-body').innerHTML = `
    <div class="seg">
      <button class="sbtn ${trainTab==='workout'?'active':''}" onclick="setTrainTab('workout')">Workout</button>
      <button class="sbtn ${trainTab==='running'?'active':''}" onclick="setTrainTab('running')">Running</button>
      <button class="sbtn ${trainTab==='mobility'?'active':''}" onclick="setTrainTab('mobility')">Mobility</button>
      <button class="sbtn ${trainTab==='schedule'?'active':''}" onclick="setTrainTab('schedule')">Schedule</button>
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
    const sess = SESSIONS[activeSession];
    const slog = ensureSession(d, activeSession);
    const isSkip = ei => slog.skipped && slog.skipped[ei];
    const totalSets = slog.sets.reduce((n,a,ei)=>n+(isSkip(ei)?0:a.length),0);
    const doneSets  = slog.sets.reduce((n,a,ei)=>n+(isSkip(ei)?0:a.filter(s=>s.done).length),0);
    const volume    = slog.sets.reduce((n,a,ei)=>n+(isSkip(ei)?0:a.reduce((m,s)=>m+(s.done?(parseFloat(s.w)||0)*(parseFloat(s.r)||0):0),0)),0);
    const rest = state.restSec||90;

    el.innerHTML = `
      <div class="seg">
        ${['A','B','C'].map(s=>`<button class="sbtn ${activeSession===s?'active':''}" onclick="setSession('${s}')">Session ${s}</button>`).join('')}
      </div>

      <div class="card">
        <div class="sbadge">${sess.label} · ${sess.focus}</div>
        <div class="restset">
          <span class="restset-lbl">Rest between sets</span>
          <div class="restset-opts">
            ${[60,90,120,150].map(v=>`<button class="restpill ${rest===v?'active':''}" onclick="setRest(${v})">${v}s</button>`).join('')}
          </div>
        </div>
        <div class="pbb" style="margin:12px 0 5px"><div class="pbf" style="width:${totalSets?doneSets/totalSets*100:0}%;background:var(--grad-green)"></div></div>
        <div style="font-size:12px;color:var(--text3);font-weight:600">${doneSets} / ${totalSets} sets done · ${Math.round(volume)} kg total volume</div>
      </div>

      ${sess.exercises.map((ex,ei)=>{
        const dispName = (slog.names && slog.names[ei]) || ex.name;
        if (isSkip(ei)) return `
        <div class="card exblock skipped">
          <div class="exhead">
            <div>
              <div class="exnm2" style="color:var(--text3);text-decoration:line-through">${dispName}</div>
              <div class="extar">Skipped today</div>
            </div>
            <button class="demobtn alt" onclick="restoreExercise(${ei})">↩ Restore</button>
          </div>
        </div>`;
        const sets = slog.sets[ei]||[];
        const exDone = sets.length>0 && sets.every(s=>s.done);
        const q = encodeURIComponent(dispName.split('/')[0].trim()+' proper form technique');
        const swapped = slog.names && slog.names[ei];
        const last = lastPerformance(activeSession, ei);
        const lastHtml = last ? `
          <div class="lasttime" onclick="openExHist('${activeSession}',${ei})">
            <span class="lt-lbl">Last · ${dayName(last.date)} ${fmtFull(last.date)}</span>
            <span class="lt-sets">${fmtSets(last.sets)}</span>
            <span class="lt-chart">📈</span>
          </div>` : '';
        return `
        <div class="card exblock">
          <div class="exhead">
            <div>
              <div class="exnm2 ${exDone?'done':''}">${dispName}${swapped?' <span class="swaptag">swapped</span>':''}</div>
              <div class="extar">Target ${ex.sets} × ${ex.reps}${ex.note?` · ${ex.note}`:''}</div>
            </div>
            <div class="exacts">
              <button class="demobtn alt" onclick="openSwap(${ei})">⇄ Swap</button>
              <a class="demobtn" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ Demo</a>
            </div>
          </div>
          ${lastHtml}
          <div class="setgrid-head"><span>Set</span><span>kg</span><span>Reps</span><span>✓</span></div>
          ${sets.map((s,si)=>`
            <div class="setrow ${s.done?'done':''}">
              <div class="setn">${si+1}</div>
              <input class="setinp" type="number" inputmode="decimal" placeholder="–" value="${s.w}" oninput="setField('${d}','${activeSession}',${ei},${si},'w',this.value)">
              <input class="setinp" type="number" inputmode="numeric" placeholder="–" value="${s.r}" oninput="setField('${d}','${activeSession}',${ei},${si},'r',this.value)">
              <button class="setck ${s.done?'done':''}" onclick="toggleSet('${d}','${activeSession}',${ei},${si})"></button>
            </div>`).join('')}
          <button class="addset" onclick="addSet('${d}','${activeSession}',${ei})">+ Add set</button>
        </div>`;
      }).join('')}

      <div class="card ${slog.finishedAt?'card-glow':''}">
        ${slog.finishedAt
          ? `<div style="text-align:center;padding:6px 0">
               <div style="font-size:34px">🏆</div>
               <div style="font-size:17px;font-weight:800;margin-top:4px">Workout logged</div>
               <div style="font-size:13px;color:var(--text3);margin-top:3px">${doneSets} sets · ${Math.round(volume)} kg total volume</div>
               <button class="btn ghost sm" style="margin-top:13px" onclick="reopenWorkout('${d}','${activeSession}')">Reopen session</button>
             </div>`
          : `<button class="btn block" onclick="finishWorkout('${d}','${activeSession}')">Finish &amp; Log Workout</button>
             <button class="btn ghost block sm" style="margin-top:9px" onclick="clearSession('${d}','${activeSession}')">Reset session</button>`}
      </div>

      <div class="card">
        <div class="lbl">Double Progression</div>
        <div class="card-body" style="font-size:14px;line-height:1.6">Hit the <strong style="color:var(--orange)">top of the rep range</strong> on all sets with solid form → add load next session. Keep <strong style="color:var(--text)">2–3 reps in reserve</strong> early, tightening to 1–2 RIR in harder weeks.</div>
      </div>
    `;

  } else if (trainTab === 'running') {
    const wk = weekNum();
    const phase = RUNNING_PHASES.find(p => {
      const [a,b] = p.weeks.split('–').map(Number); return wk>=a && wk<=(b||a);
    }) || RUNNING_PHASES[0];
    el.innerHTML = `
      <div class="card card-glow">
        <div class="lbl">Current Phase — Week ${wk}</div>
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green)"></div>
            <span style="font-size:15px;font-weight:800">Easy Run</span>
          </div>
          <div style="font-size:15px;color:var(--text2);margin-bottom:8px">${phase.easyRun}</div>
          <div class="strip g" style="font-size:13px">Conversational pace — finish fresher than you started</div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--orange);box-shadow:0 0 8px var(--orange)"></div>
            <span style="font-size:15px;font-weight:800">Quality Run</span>
          </div>
          <div style="font-size:15px;color:var(--text2);margin-bottom:8px">${phase.qualityRun}</div>
          <div class="strip o" style="font-size:13px">Space 24h+ from heavy lower-body day</div>
        </div>
      </div>
      <div class="card">
        <div class="lbl">All Phases</div>
        ${RUNNING_PHASES.map(p=>`
          <div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:800;font-size:14px;color:var(--cyan);margin-bottom:4px">Weeks ${p.weeks}</div>
            <div style="font-size:13px;color:var(--text2)">Easy: ${p.easyRun}</div>
            <div style="font-size:13px;color:var(--orange);margin-top:2px">Quality: ${p.qualityRun}</div>
          </div>`).join('')}
      </div>
      <div class="strip o">Drop intensity before dropping consistency if recovery is poor.</div>
    `;

  } else if (trainTab === 'mobility') {
    const d = today();
    const done = state.mobilityLog[d] || [];
    const pct = Math.round(done.length/MOBILITY_DRILLS.length*100);
    el.innerHTML = `
      <div class="card ${pct===100?'card-glow':''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <div class="lbl">Daily Mobility</div>
            <div style="font-size:22px;font-weight:900">${done.length} <span style="font-size:14px;color:var(--text3);font-weight:600">/ ${MOBILITY_DRILLS.length} done</span></div>
          </div>
          ${pct===100 ? '<div style="font-size:32px">🎯</div>' : ''}
        </div>
        <div class="pbb" style="margin-bottom:0">
          <div class="pbf" style="width:${pct}%;background:var(--grad-orange)"></div>
        </div>
      </div>
      <div class="card">
        ${MOBILITY_DRILLS.map((drill,i)=>{
          const isDone = done.includes(i);
          const icons=['🫁','🦴','📖','🚪','🧱','💪','🎯','🤲'];
          return `<div class="drrow" onclick="openDrill(${i})">
            <div class="drico ${isDone?'done':''}">${isDone?'✅':icons[i]}</div>
            <div class="di">
              <div class="drnm ${isDone?'done':''}">${drill.name}</div>
              <div class="drrp">${drill.reps}</div>
            </div>
            <div class="drtm">${formatSec(drill.timerSec)}</div>
          </div>`;
        }).join('')}
        <div style="margin-top:12px">
          <button class="btn ghost sm" onclick="resetMobility()">Reset today</button>
        </div>
      </div>
      <div class="card">
        <div class="lbl">Phase Priorities</div>
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
      <div class="strip o">⚠️ Sharp pain, numbness, or neck symptoms → stop and see a physio.</div>
    `;

  } else {
    el.innerHTML = `
      <div class="card">
        <div class="lbl">Weekly Blueprint</div>
        ${WEEKLY_SCHEDULE.map(row=>`
          <div class="srow">
            <div class="sday">${row.day.slice(0,3)}</div>
            <div class="spills">
              ${row.gym?`<span class="pill pill-gym">💪 Session ${row.gym}</span>`:''}
              ${row.run?`<span class="pill pill-run">🏃 ${row.run}</span>`:''}
              ${!row.gym&&!row.run?`<span class="pill pill-rest">😴 Rest</span>`:''}
              <span class="pill pill-mob">🧘 Mobility</span>
            </div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="lbl">12-Week Microcycle</div>
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

function setField(date, session, ei, si, k, v) {
  const sl = ensureSession(date, session); sl.sets[ei][si][k] = v; save();
}
function toggleSet(date, session, ei, si) {
  const sl = ensureSession(date, session); const set = sl.sets[ei][si];
  set.done = !set.done; save();
  if (set.done) startRest();
  renderTrainContent();
}
function addSet(date, session, ei) {
  const sl = ensureSession(date, session); const arr = sl.sets[ei]; const last = arr[arr.length-1];
  arr.push({ w: last?last.w:'', r: last?last.r:'', done:false }); save(); renderTrainContent();
}
function setRest(v) { state.restSec = v; save(); renderTrainContent(); }
function finishWorkout(date, session) {
  const sl = ensureSession(date, session); sl.finishedAt = new Date().toISOString();
  save(); skipRest(); renderTrainContent();
  if (navigator.vibrate) navigator.vibrate(80);
}
function reopenWorkout(date, session) {
  const sl = ensureSession(date, session); sl.finishedAt = null; save(); renderTrainContent();
}
function clearSession(date, session) {
  if (!state.workoutLog[date]) state.workoutLog[date] = {};
  state.workoutLog[date][session] = { sets: SESSIONS[session].exercises.map(blankSets), finishedAt: null, names: {}, skipped: {} };
  save(); renderTrainContent();
}

/* ─── Swap / skip exercise (today only) ───────────────────────────────────────── */
let swapEi = null;
function openSwap(ei) {
  swapEi = ei;
  const ex = SESSIONS[activeSession].exercises[ei];
  const sl = ensureSession(today(), activeSession);
  const current = (sl.names && sl.names[ei]) || ex.name;
  const alts = ex.name.split('/').map(s => s.trim()).filter(Boolean);
  document.getElementById('swap-body').innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px;line-height:1.55">Couldn't do this one? Pick what you actually did, type your own, or skip it. Only changes today's session.</div>
    ${alts.length>1 ? `<div class="swaplbl">Listed alternatives</div>
      <div class="swapchips">${alts.map(a=>`<button class="swapchip ${a===current?'active':''}" onclick="applySwap('${a.replace(/'/g,"\\'")}')">${a}</button>`).join('')}</div>`:''}
    <div class="swaplbl">Or type your own</div>
    <input id="swap-input" class="setinp" style="text-align:left;width:100%;margin-bottom:16px" type="text" placeholder="e.g. Dumbbell bench press" value="${current.replace(/"/g,'&quot;')}">
    <button class="btn block" onclick="applySwapInput()">Save swap</button>
    <div style="display:flex;gap:9px;margin-top:9px">
      <button class="btn ghost block sm" onclick="skipExercise(${ei})">Skip today</button>
      <button class="btn ghost block sm" onclick="restoreExercise(${ei})">Reset to original</button>
    </div>
    <button class="btn ghost block sm" style="margin-top:9px" onclick="closeSwap()">Cancel</button>`;
  document.getElementById('swap-modal').classList.add('open');
}
function applySwap(name) {
  if (swapEi == null) return;
  const sl = ensureSession(today(), activeSession);
  const orig = SESSIONS[activeSession].exercises[swapEi].name;
  if (name && name.trim() && name.trim() !== orig) sl.names[swapEi] = name.trim();
  else delete sl.names[swapEi];
  delete sl.skipped[swapEi];
  save(); closeSwap(); renderTrainContent();
}
function applySwapInput() { applySwap(document.getElementById('swap-input').value); }
function skipExercise(ei) {
  const sl = ensureSession(today(), activeSession);
  sl.skipped[ei] = true; save(); closeSwap(); renderTrainContent();
}
function restoreExercise(ei) {
  const sl = ensureSession(today(), activeSession);
  delete sl.skipped[ei]; delete sl.names[ei]; save(); closeSwap(); renderTrainContent();
}
function closeSwap() { document.getElementById('swap-modal').classList.remove('open'); swapEi = null; }

/* ─── Per-exercise history + progression chart (modal) ────────────────────────── */
function openExHist(session, ei) {
  const hist = exerciseHistory(session, ei, true); // newest first, incl. today
  const sl = ensureSession(today(), session);
  const name = (sl.names && sl.names[ei]) || SESSIONS[session].exercises[ei].name;
  const body = document.getElementById('exhist-body');

  if (!hist.length) {
    body.innerHTML =
      `<div class="mtit2">${name}</div>
       <div class="exhist-empty">No logged sets yet. Tick off a set and it'll show up here with a progression chart.</div>
       <button class="btn ghost block" onclick="closeExHist()">Close</button>`;
  } else {
    const chrono = [...hist].reverse();          // oldest → newest for the chart
    const topVals = chrono.map(p => p.top);
    const best = Math.max(...topVals);
    const chart = sparkline(topVals);
    const rows = hist.map(p => `
      <div class="exhist-row">
        <div class="exhist-date">${dayName(p.date)} ${fmtFull(p.date)}${p.date===today()?' · Today':''}</div>
        <div class="exhist-sets">${fmtSets(p.sets)}</div>
        <div class="exhist-vol">${Math.round(p.vol)} kg${p.top===best && p.sets.length?' · 🏅 PB':''}</div>
      </div>`).join('');
    body.innerHTML =
      `<div class="mtit2">${name}</div>
       ${chart ? `<div class="exhist-chartwrap">
            <div class="exhist-chartlbl">Top set — kg over time</div>
            ${chart}
            <div class="exhist-chartmeta">Best ${best} kg · ${hist.length} session${hist.length>1?'s':''} logged</div>
          </div>` : `<div class="exhist-chartmeta" style="margin-bottom:12px">Log one more session to unlock the trend chart.</div>`}
       <div class="exhist-list">${rows}</div>
       <button class="btn ghost block" style="margin-top:14px" onclick="closeExHist()">Close</button>`;
  }
  document.getElementById('exhist-modal').classList.add('open');
}
function closeExHist() { document.getElementById('exhist-modal').classList.remove('open'); }

/* ─── Rest timer (floating bar) ───────────────────────────────────────────────── */
let restTimer = null, restRemain = 0;
function startRest() {
  restRemain = state.restSec || 90;
  const bar = document.getElementById('rest-bar'); if (bar) bar.classList.add('show');
  updateRestDisplay();
  if (restTimer) clearInterval(restTimer);
  restTimer = setInterval(() => {
    restRemain--; updateRestDisplay();
    if (restRemain <= 0) {
      clearInterval(restTimer); restTimer = null;
      if (navigator.vibrate) navigator.vibrate([300,120,300]);
      const t = document.getElementById('rest-time'); if (t) t.textContent = 'Go! 💪';
      setTimeout(hideRest, 1500);
    }
  }, 1000);
}
function updateRestDisplay() {
  const m = Math.floor(Math.max(0,restRemain)/60), s = Math.max(0,restRemain)%60;
  const el = document.getElementById('rest-time'); if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
}
function addRest(n) { restRemain = Math.max(5, restRemain + n); updateRestDisplay(); }
function skipRest() { if (restTimer) clearInterval(restTimer); restTimer = null; hideRest(); }
function hideRest() { const bar = document.getElementById('rest-bar'); if (bar) bar.classList.remove('show'); }

/* ══════════════════════════════════════════════════════════════════════════════
   EAT
══════════════════════════════════════════════════════════════════════════════ */
let eatTab = 'log';

function renderEat() {
  document.getElementById('eat-body').innerHTML = `
    <div class="seg">
      <button class="sbtn ${eatTab==='log'?'active':''}" onclick="setEatTab('log')">Today</button>
      <button class="sbtn ${eatTab==='meals'?'active':''}" onclick="setEatTab('meals')">Meal Plans</button>
      <button class="sbtn ${eatTab==='targets'?'active':''}" onclick="setEatTab('targets')">Targets</button>
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
        <div class="mrc">
          ${ringHTML(Math.min(1,totalKcal/t.kcal),'var(--orange)',Math.round(totalKcal/t.kcal*100)+'%','kcal')}
          <div class="mrl">
            ${pbar('Protein', totalProt, t.protein, 'var(--purple)')}
            ${pbar('Calories', totalKcal, t.kcal, 'var(--orange)', ' kcal')}
          </div>
        </div>
        <div class="kcalbar">
          <div><div class="knum">${totalKcal}</div><div class="klbl">eaten</div></div>
          <div style="text-align:center"><div style="font-size:22px;color:var(--text3);font-weight:900">—</div></div>
          <div style="text-align:center"><div class="knum" style="color:var(--cyan)">${t.kcal}</div><div class="klbl">target</div></div>
          <div style="text-align:center"><div class="knum" style="color:var(--green);font-size:22px">${remaining}</div><div class="klbl">left</div></div>
        </div>
      </div>
      <div class="card">
        <div class="lbl">Log Food</div>
        <input class="inp" id="food-name" placeholder="Food or meal name" type="text" style="width:100%;margin-bottom:8px">
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input class="inp" id="food-kcal" placeholder="kcal" type="number" inputmode="decimal">
          <input class="inp" id="food-prot" placeholder="protein (g)" type="number" inputmode="decimal">
        </div>
        <button class="btn block" onclick="logFood()">+ Add Food</button>
      </div>
      ${foods.length ? `
      <div class="card">
        <div class="lbl">${foods.length} Items Logged Today</div>
        ${foods.map((f,i)=>`
          <div class="fe">
            <div class="fen">${f.name}</div>
            <div class="fek">${f.kcal} kcal</div>
            <div class="fep">${f.protein}g</div>
            <div class="fed" onclick="deleteFood(${i})">×</div>
          </div>`).join('')}
      </div>` : ''}
      <div class="card">
        <div class="lbl">Adjustment Rules</div>
        <div class="strip g">2-week avg <strong>under 0.25 kg/week</strong> → cut 100–150 kcal/day</div>
        <div class="strip o" style="margin-top:6px">Dropping <strong>over 0.8 kg/week</strong> and gym sliding → add 100–150 kcal/day</div>
      </div>
    `;

  } else if (eatTab==='meals') {
    const tpls = {omnivore:'🥩 Omnivore', vegetarian:'🥗 Vegetarian', highProtein:'💪 High-Protein'};
    el.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;margin-bottom:6px">
        ${Object.entries(tpls).map(([k,v])=>`<span class="mpill ${state.mealTemplate===k?'active':''}" onclick="setTemplate('${k}')">${v}</span>`).join('')}
      </div>
      <div class="card">
        <div class="lbl">${tpls[state.mealTemplate]}</div>
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
        <div class="lbl">Recipe Bank</div>
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
        <div class="lbl">Training Day</div>
        <div style="font-size:24px;font-weight:900;color:var(--orange);margin-bottom:12px">2,450–2,650 kcal</div>
        ${pbar('Protein', 195, 210, 'var(--purple)')}
        ${pbar('Carbohydrate', 260, 300, 'var(--cyan)')}
        ${pbar('Fat', 73, 80, 'var(--orange)')}
      </div>
      <div class="card">
        <div class="lbl">Rest / Easy Day</div>
        <div style="font-size:24px;font-weight:900;color:var(--cyan);margin-bottom:12px">2,200–2,350 kcal</div>
        ${pbar('Protein', 195, 210, 'var(--purple)')}
        ${pbar('Carbohydrate', 180, 220, 'var(--cyan)')}
        ${pbar('Fat', 78, 85, 'var(--orange)')}
      </div>
      <div class="card">
        <div class="lbl">Protein Rules</div>
        <div class="strip p">35–50 g per main meal · 3–5 feedings per day</div>
        <div class="strip g" style="margin-top:6px">25–40 g within 1–2 hours post-lift</div>
      </div>
      <div class="card">
        <div class="lbl">Heart Health (Cholesterol)</div>
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
    <div class="seg">
      <button class="sbtn ${histTab==='log'?'active':''}" onclick="setHistTab('log')">Activity</button>
      <button class="sbtn ${histTab==='calendar'?'active':''}" onclick="setHistTab('calendar')">Calendar</button>
      <button class="sbtn ${histTab==='nutrition'?'active':''}" onclick="setHistTab('nutrition')">Nutrition</button>
    </div>
    <div id="history-content"></div>
  `;
  renderHistoryContent();
}
function setHistTab(t){ histTab=t; renderHistory(); }
let histExpanded = {};
function toggleHistEntry(k){ histExpanded[k] = !histExpanded[k]; renderHistoryContent(); }

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
      const hasActivity = dayHasGym(ds)
        || (state.foodLog[ds] && state.foodLog[ds].length)
        || (state.mobilityLog[ds] && state.mobilityLog[ds].length);
      if (hasActivity) { streak++; checkDate.setDate(checkDate.getDate()-1); }
      else break;
    }

    // Stats summary
    const totalWorkouts = Object.values(state.workoutLog).reduce((s,day)=>s+Object.entries(day).filter(([sess,sd])=>SESSIONS[sess]&&sessionHasWork(sd)).length,0);
    const totalMobDays  = Object.keys(state.mobilityLog).filter(d=>state.mobilityLog[d].length>0).length;
    const totalFoodDays = Object.keys(state.foodLog).filter(d=>state.foodLog[d].length>0).length;

    el.innerHTML = `
      <div class="sg" style="margin-bottom:12px">
        <div class="sc p">
          <div class="sv p">${streak}</div>
          <div class="su">day streak 🔥</div>
        </div>
        <div class="sc c">
          <div class="sv c">${totalWorkouts}</div>
          <div class="su">gym sessions</div>
        </div>
        <div class="sc o">
          <div class="sv o">${totalMobDays}</div>
          <div class="su">mobility days</div>
        </div>
        <div class="sc g">
          <div class="sv g">${totalFoodDays}</div>
          <div class="su">days logged</div>
        </div>
      </div>
      <div class="card">
        <div class="lbl">Activity Log</div>
        ${sorted.map(d => {
          const wl = state.workoutLog[d];
          const ml = state.mobilityLog[d];
          const fl = state.foodLog[d];
          const wt = state.weightLog.find(w=>w.date===d);
          const ws = state.waistLog.find(w=>w.date===d);
          const entries = [];

          if (wl) Object.entries(wl).forEach(([sess, sdata])=>{
            if (!SESSIONS[sess] || !sessionHasWork(sdata)) return;
            let doneSets=0, totalSets=0, vol=0, fin=false, detail='';
            if (Array.isArray(sdata)) { doneSets = sdata.filter(Boolean).length; totalSets = SESSIONS[sess].exercises.length; }
            else if (sdata && sdata.sets) {
              sdata.sets.forEach((a,ei)=>{ if (sdata.skipped && sdata.skipped[ei]) return; a.forEach(s=>{ totalSets++; if (s.done){ doneSets++; vol += (parseFloat(s.w)||0)*(parseFloat(s.r)||0); } }); });
              fin = !!sdata.finishedAt;
              const lines = [];
              SESSIONS[sess].exercises.forEach((ex,ei)=>{
                const done = doneSetsFor(sdata, ei);
                if (!done.length) return;
                const nm = ((sdata.names && sdata.names[ei]) || ex.name).split('/')[0].trim();
                lines.push(`<div class="hd-ex"><span class="hd-nm">${nm}</span><span class="hd-sets">${fmtSets(done)}</span></div>`);
              });
              detail = lines.join('');
            }
            entries.push({type:'gym', icon:'💪', key:`${d}|${sess}`, detail,
              title:`Session ${sess} — ${SESSIONS[sess].focus}`,
              meta:`${doneSets}/${totalSets} sets${vol?` · ${Math.round(vol)} kg volume`:''}${fin?' · ✅ finished':''}`});
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
              ${entries.map(e=>{
                const canExpand = e.type==='gym' && e.detail;
                const open = canExpand && histExpanded[e.key];
                return `
                <div class="hentry ${canExpand?'tappable':''}" ${canExpand?`onclick="toggleHistEntry('${e.key}')"`:''}>
                  <div class="hdot ${e.type}">${e.icon}</div>
                  <div class="hi">
                    <div class="htit">${e.title}${canExpand?` <span class="hexp">${open?'▾':'▸'}</span>`:''}</div>
                    <div class="hmet">${e.meta}</div>
                    ${open?`<div class="hdetail">${e.detail}</div>`:''}
                  </div>
                </div>`;}).join('')}
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
        <div class="lbl">Activity Heatmap · Last 5 Weeks</div>
        <div class="cal">
          ${days.map(d=>`<div class="cal-lbl">${d}</div>`).join('')}
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
        <div class="lbl">Weight History</div>
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
    const tt = NUTRITION_TARGETS.trainingDay;
    const last14 = nutDates.slice(0,14).reverse();
    el.innerHTML = `
      ${last14.length>=2?`
      <div class="card">
        <div class="lbl">Calories · Last ${last14.length} Logged Days</div>
        <canvas id="nut-bar-chart" width="320" height="150" style="width:100%"></canvas>
      </div>`:''}
      <div class="card">
        <div class="lbl">Nutrition History</div>
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
              <div class="pbb" style="height:5px">
                <div class="pbf" style="width:${pct}%;background:${pct>=90?'var(--green)':pct>=70?'var(--orange)':'var(--red)'}"></div>
              </div>
            </div>`;
        }).join('')}
      </div>
    `;
    if (last14.length>=2) {
      const bars = last14.map(d=>{
        const k = state.foodLog[d].reduce((s,f)=>s+f.kcal,0);
        const p = k/tt.kcal;
        const col = p>1.18?'#ef4444':p>=0.9?'#10b981':p>=0.5?'#ff6b35':'#cbd2de';
        return { label: dayName(d)[0], val: k, color: col };
      });
      drawBarChart('nut-bar-chart', bars, '#ff6b35', tt.kcal);
    }
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
    <div class="seg">
      <button class="sbtn ${progTab==='weight'?'active':''}" onclick="setProgTab('weight')">Weight</button>
      <button class="sbtn ${progTab==='waist'?'active':''}" onclick="setProgTab('waist')">Waist</button>
      <button class="sbtn ${progTab==='dna'?'active':''}" onclick="setProgTab('dna')">DNA Insights</button>
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
    const lostKg = PROFILE.startWeightKg - latest;
    const wkEl = Math.max(1, weekNum());
    const rate = lostKg / wkEl;
    const needRate = (PROFILE.startWeightKg - PROFILE.targetWeightKg) / 12;
    const ratio = needRate ? rate/needRate : 0;
    const pace = wl.length===0 ? {t:'Log a weigh-in to start tracking', c:'var(--text3)', e:'📍'}
               : ratio>=1.05 ? {t:'Ahead of schedule', c:'var(--green)', e:'🚀'}
               : ratio>=0.85 ? {t:'On track for 89 kg', c:'var(--green)', e:'🎯'}
               : ratio>0      ? {t:'Slightly behind pace', c:'var(--orange)', e:'⚡'}
               : {t:'No change logged yet', c:'var(--text3)', e:'📍'};
    el.innerHTML = `
      <div class="sg">
        <div class="sc c"><div class="sv c">${latest}</div><div class="su">kg current</div></div>
        <div class="sc p"><div class="sv p">${avg7}</div><div class="su">7-day avg</div></div>
        <div class="sc g"><div class="sv g">${lostKg.toFixed(1)}</div><div class="su">kg lost</div></div>
        <div class="sc o"><div class="sv o">${Math.max(0,latest-PROFILE.targetWeightKg).toFixed(1)}</div><div class="su">kg to 89 kg</div></div>
      </div>
      <div class="card">
        <div class="lbl">Pace to Goal</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px">
          <div>
            <div style="font-size:17px;font-weight:800;color:${pace.c};letter-spacing:-0.3px">${pace.t}</div>
            <div style="font-size:12.5px;color:var(--text3);margin-top:3px">${rate.toFixed(2)} kg/wk · target ~${needRate.toFixed(2)} kg/wk</div>
          </div>
          <div style="font-size:26px">${pace.e}</div>
        </div>
        <div class="pbb"><div class="pbf" style="width:${Math.min(100,Math.max(0,Math.round(ratio*100)))}%;background:${pace.c}"></div></div>
      </div>
      <div class="card">
        <div class="lbl">Log Today's Weight</div>
        <div class="inp-row">
          <input class="inp" id="weight-input" placeholder="${latest} kg" type="number" inputmode="decimal" step="0.1">
          <button class="btn" onclick="logWeight()">Log</button>
        </div>
      </div>
      <div class="card">
        <div class="lbl">Weight Trend</div>
        <canvas id="weight-chart" width="320" height="150" style="width:100%;border-radius:8px;margin-bottom:12px"></canvas>
        ${wl.slice(-10).reverse().map(w=>`
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="color:var(--text2)">${dayName(w.date)} ${fmtFull(w.date)}</span>
            <span style="font-weight:800;color:var(--cyan)">${w.kg} kg</span>
          </div>`).join('')}
        ${wl.length===0?'<div style="text-align:center;padding:16px;color:var(--text3)">Log your first weigh-in above</div>':''}
      </div>
      <div class="card">
        <div class="lbl">Milestones</div>
        ${[
          {kg:95.8,label:'Start weight',note:PROFILE.startDate},
          {kg:93,  label:'Early momentum'},
          {kg:91,  label:'Approaching milestone'},
          {kg:89,  label:'First milestone 🎯'},
          {kg:86,  label:'Lean phase'},
          {kg:83.6,label:'~12% body fat (lean mass held)'},
        ].map(m=>{
          const reached = latest <= m.kg;
          return `<div class="msrow">
            <div class="ms-check">${reached?'✅':'⬜'}</div>
            <div class="ms-info"><div class="mslbl ${reached?'done':''}">${m.label}</div>${m.note?`<div style="font-size:11px;color:var(--text3)">${fmt(m.note)}</div>`:''}</div>
            <div class="mskg ${reached?'done':''}">${m.kg}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    drawWeightChart();

  } else if (progTab === 'waist') {
    const wl = state.waistLog;
    const latest = wl.length ? wl[wl.length-1].cm : PROFILE.startWaistCm;
    el.innerHTML = `
      <div class="sg">
        <div class="sc c"><div class="sv c">${latest}</div><div class="su">cm current</div></div>
        <div class="sc p"><div class="sv p">${PROFILE.startWaistCm}</div><div class="su">cm start</div></div>
        <div class="sc g"><div class="sv g">${(PROFILE.startWaistCm-latest).toFixed(1)}</div><div class="su">cm lost</div></div>
        <div class="sc o"><div class="sv o">4–8</div><div class="su">cm 12wk target</div></div>
      </div>
      <div class="card">
        <div class="lbl">Log Waist (Weekly)</div>
        <div class="inp-row">
          <input class="inp" id="waist-input" placeholder="${latest} cm" type="number" inputmode="decimal" step="0.5">
          <button class="btn" onclick="logWaist()">Log</button>
        </div>
        <div class="strip o" style="margin-top:10px;font-size:13px">Measure at navel, relaxed. Same time weekly.</div>
      </div>
      <div class="card">
        <div class="lbl">Waist Trend</div>
        <canvas id="waist-chart" width="320" height="150" style="width:100%;border-radius:8px;margin-bottom:12px"></canvas>
        ${wl.slice(-8).reverse().map(w=>`
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:14px">
            <span style="color:var(--text2)">${fmt(w.date)}</span>
            <span style="font-weight:800;color:var(--green)">${w.cm} cm</span>
          </div>`).join('')}
        ${wl.length===0?'<div style="text-align:center;padding:16px;color:var(--text3)">Log your first waist measurement above</div>':''}
      </div>
      <div class="strip p">Scale stalls but waist falls + lifts hold? → Recomp happening. Don't panic.</div>
      <div class="strip o" style="margin-top:-4px">Weight drops fast but waist static + gym sliding? → Deficit too deep. Add 100–150 kcal.</div>
    `;
    drawWaistChart();

  } else {
    el.innerHTML = `
      <div class="card">
        <div class="lbl">About Your Vitl DNA Report</div>
        <div class="card-body" style="font-size:14px;color:var(--text2);line-height:1.6" style="margin-bottom:10px">Your test covers nutrition, fitness, caffeine/sleep & vitamin traits. Use the conditional rules below based on your actual trait results.</div>
        <div class="strip c">DNA markers fine-tune the programme — calories, protein, training & sleep explain far more of your outcome than any single SNP.</div>
      </div>
      ${DNA_INSIGHTS.map(d=>`
        <div class="dna-c">
          <div class="dna-h">
            <div class="dna-i">${d.icon}</div>
            <div><div class="dna-t">${d.trait}</div><div class="dna-m">${d.marker}</div></div>
          </div>
          ${Object.entries(d).filter(([k])=>!['trait','marker','icon'].includes(k)).map(([k,v])=>`
            <div class="dna-o">
              <strong>${k.charAt(0).toUpperCase()+k.slice(1).replace(/([A-Z])/g,' $1')} →</strong>${v}
            </div>`).join('')}
        </div>`).join('')}
    `;
  }
}

/* ─── Chart drawing ───────────────────────────────────────────────────────── */
function drawLineChart(id, data, color, startVal, goalVal) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const dpr = window.devicePixelRatio||1;
  const w = canvas.offsetWidth, h = canvas.offsetHeight||150;
  canvas.width = w*dpr; canvas.height = h*dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);

  const vals = [startVal, ...data.map(d=>d.val)];
  if (vals.length < 2) return;
  const allV = goalVal!=null ? [...vals, goalVal] : vals;
  const min = Math.min(...allV)-0.5, max = Math.max(...allV)+0.5;
  const pad = {t:16,b:24,l:36,r:10};
  const pw = w-pad.l-pad.r, ph = h-pad.t-pad.b;
  const px = i => pad.l + (i/(vals.length-1))*pw;
  const py = v => pad.t + ph - (v-min)/(max-min)*ph;

  // Grid lines
  [0,0.5,1].forEach(f=>{
    const y=pad.t+ph*(1-f), v=(min+f*(max-min)).toFixed(1);
    ctx.beginPath(); ctx.strokeStyle='rgba(18,22,40,0.07)'; ctx.lineWidth=1;
    ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke();
    ctx.fillStyle='rgba(18,22,40,0.32)'; ctx.font=`bold ${10*dpr/dpr}px -apple-system`;
    ctx.fillText(v, 2, y+4);
  });

  // Goal line (dashed)
  if (goalVal!=null) {
    const gy = py(goalVal);
    ctx.save();
    ctx.setLineDash([5,4]); ctx.strokeStyle='rgba(16,185,129,0.75)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(pad.l,gy); ctx.lineTo(w-pad.r,gy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#059669'; ctx.font='bold 9px -apple-system';
    ctx.fillText('goal '+goalVal, pad.l+3, gy-4);
    ctx.restore();
  }

  // Gradient fill
  const grad = ctx.createLinearGradient(0,pad.t,0,h-pad.b);
  const col = color.startsWith('var(') ? (color==='var(--cyan)'?'#0ea5e9':color==='var(--green)'?'#10b981':'#3b66f5') : color;
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
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.stroke();
  });
}

function drawWeightChart() { drawLineChart('weight-chart', state.weightLog.map(w=>({val:w.kg})), 'var(--cyan)', PROFILE.startWeightKg, PROFILE.targetWeightKg); }
function drawWaistChart()  { drawLineChart('waist-chart',  state.waistLog.map(w=>({val:w.cm})),  'var(--green)', PROFILE.startWaistCm, PROFILE.startWaistCm-8); }

/* ─── Bar chart (rounded-top columns + dashed target) ─────────────────────────── */
function drawBarChart(id, bars, color, targetVal) {
  const canvas = document.getElementById(id);
  if (!canvas || !bars.length) return;
  const dpr = window.devicePixelRatio||1;
  const w = canvas.offsetWidth, h = canvas.offsetHeight||150;
  canvas.width = w*dpr; canvas.height = h*dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);

  const vals = bars.map(b=>b.val);
  const max = (Math.max(targetVal||0, ...vals) || 1) * 1.18;
  const pad = {t:14,b:20,l:6,r:6};
  const pw = w-pad.l-pad.r, ph = h-pad.t-pad.b;
  const n = bars.length, slot = pw/n;
  const bw = Math.min(28, slot*0.6);
  const barY = v => pad.t + ph - (v/max)*ph;

  // Target line
  if (targetVal) {
    const ty = barY(targetVal);
    ctx.save();
    ctx.setLineDash([4,4]); ctx.strokeStyle='rgba(18,22,40,0.25)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.l,ty); ctx.lineTo(w-pad.r,ty); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(18,22,40,0.4)'; ctx.font='bold 9px -apple-system'; ctx.textAlign='right';
    ctx.fillText('target', w-pad.r, ty-4); ctx.textAlign='left';
    ctx.restore();
  }

  bars.forEach((b,i)=>{
    const x = pad.l + i*slot + (slot-bw)/2;
    const bh = Math.max(3, (b.val/max)*ph);
    const y = pad.t + ph - bh;
    const r = Math.min(5, bw/2);
    ctx.beginPath();
    ctx.moveTo(x, y+bh); ctx.lineTo(x, y+r);
    ctx.arcTo(x, y, x+r, y, r); ctx.lineTo(x+bw-r, y);
    ctx.arcTo(x+bw, y, x+bw, y+r, r); ctx.lineTo(x+bw, y+bh);
    ctx.closePath();
    ctx.fillStyle = b.color || color; ctx.fill();
    ctx.fillStyle='rgba(18,22,40,0.4)'; ctx.font='600 9px -apple-system'; ctx.textAlign='center';
    ctx.fillText(b.label, x+bw/2, h-6); ctx.textAlign='left';
  });
}

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

  // Restore last tab (survives sleep/wake)
  navigate(_activeTab);

  // Also re-render on page visibility change (wake from sleep)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      renders[_activeTab]?.();
    }
  });
});
