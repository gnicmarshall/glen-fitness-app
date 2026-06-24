/* ─── AI Coach ─────────────────────────────────────────────────────────────────
   Talks to Claude using Glen's OWN Anthropic API key. The key is stored only in
   this device's localStorage and is sent only to api.anthropic.com — never to
   GitHub Pages or anywhere else. No backend required (uses Anthropic's direct
   browser-access header). Pay-per-use on his own account. */
(function () {
  const KEY_LS = 'fitplan_anthropic_key';
  const MODEL  = 'claude-sonnet-4-6';   // swap to 'claude-haiku-4-5' for cheaper
  let msgs = [];          // [{role:'user'|'assistant', content:'…'}]
  let busy = false;

  const getKey = () => { try { return localStorage.getItem(KEY_LS) || ''; } catch (e) { return ''; } };

  window.saveCoachKey = function () {
    const v = (document.getElementById('coach-key-input').value || '').trim();
    if (!/^sk-ant-/.test(v)) { alert("That doesn't look right — an Anthropic key starts with 'sk-ant-'. Paste the whole key."); return; }
    try { localStorage.setItem(KEY_LS, v); } catch (e) {}
    renderCoach();
  };
  window.clearCoachKey = function () {
    if (!confirm('Remove your saved API key from this device?')) return;
    try { localStorage.removeItem(KEY_LS); } catch (e) {}
    msgs = []; renderCoach();
  };

  // System prompt built from Glen's real plan, recent logs, goal and constraints.
  function buildSystem() {
    const sess = Object.keys(SESSIONS).map(k => {
      const s = SESSIONS[k];
      return `Session ${k} (${s.focus}): ` + s.exercises.map(e => `${e.name} ${e.sets}×${e.reps}`).join('; ');
    }).join('\n');

    const dates = Object.keys(state.workoutLog || {}).sort((a, b) => b.localeCompare(a)).slice(0, 12);
    let hist = '';
    dates.forEach(d => {
      const day = state.workoutLog[d];
      Object.keys(day).forEach(sk => {
        const sd = day[sk];
        if (!SESSIONS[sk] || !sd || !sd.sets) return;
        const lines = [];
        SESSIONS[sk].exercises.forEach((ex, ei) => {
          const done = (sd.sets[ei] || []).filter(s => s.done);
          if (!done.length) return;
          const nm = (sd.names && sd.names[ei]) || ex.name;
          lines.push(`${nm.split('/')[0].trim()}: ` + done.map(s => s.w ? `${s.w}kg×${s.r}` : `${s.r}`).join(', '));
        });
        if (lines.length) hist += `\n${d} Session ${sk}:\n  ` + lines.join('\n  ');
      });
    });

    return `You are Glen's personal strength & physique coach, living inside his fitness app. Be concise, practical and direct — he's often in the gym reading on his phone. Give specific numbers and clear next steps, not essays or disclaimers.

GOAL: lean "Brad Pitt in Fight Club" look — low body fat, visible-but-modest muscle, V-taper. Start ~95.8kg / 23.2% body fat; first milestone 89kg, then reassess. Fat loss is mostly diet (moderate deficit, ~180–210g protein/day); training protects muscle through the cut, it doesn't burn the fat.

HEALTH CONSTRAINTS (respect these):
- Shoulder mobility is a real bottleneck → favour shoulder-friendly options (neutral-grip / machine / landmine pressing, chest-supported rows, pulldowns, trap-bar).
- He HATES bent-over rows — never suggest them.
- Mildly raised cholesterol → keep some conditioning.
- Asthma history; broken sleep.

CURRENT PROGRAMME (elastic 3-day: A+B are the floor, C is a bonus when fresh):
${sess}

RECENT LOGGED WORKOUTS (newest first — use these for progression):${hist || '\n(nothing logged yet)'}

HOW TO COACH:
- Swaps: give 2–3 specific shoulder-friendly alternatives that match the muscle/movement.
- Loads: read the recent logs and give concrete kg×reps targets using double progression (hit the top of the rep range on all sets with good form → add load next time).
- Form: short cue lists, flag his shoulder mobility where relevant.
- Keep replies short and skimmable. Use plain text, short bullet points.`;
  }

  async function send(text) {
    if (busy) return;
    const key = getKey(); if (!key) return;
    msgs.push({ role: 'user', content: text });
    busy = true; renderThread();
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          system: [{ type: 'text', text: buildSystem(), cache_control: { type: 'ephemeral' } }],
          messages: msgs.map(m => ({ role: m.role, content: m.content }))
        })
      });
      if (!res.ok) {
        let detail = res.status + '';
        try { const j = await res.json(); detail = (j.error && j.error.message) || detail; } catch (e) {}
        if (res.status === 401) detail = 'Key rejected — check it’s correct and has credit.';
        if (res.status === 429) detail = 'Rate limited or out of credit — top up your Anthropic account.';
        throw new Error(detail);
      }
      const data = await res.json();
      const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || '(no reply)';
      msgs.push({ role: 'assistant', content: reply });
    } catch (e) {
      msgs.push({ role: 'assistant', content: '⚠ ' + (e.message || e) });
    }
    busy = false; renderThread();
  }

  window.coachSend = function () {
    const inp = document.getElementById('coach-input');
    const t = (inp.value || '').trim();
    if (!t || busy) return;
    inp.value = '';
    send(t);
  };
  window.coachQuick = function (t) { const inp = document.getElementById('coach-input'); if (inp) { inp.value = t; inp.focus(); } };

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function renderThread() {
    const thread = document.getElementById('coach-thread'); if (!thread) return;
    if (!msgs.length) {
      thread.innerHTML = `<div class="coach-empty">Ask me anything about your training — swaps, what to lift next, form, or whether your plan fits the goal.</div>`;
    } else {
      thread.innerHTML = msgs.map(m =>
        `<div class="coach-msg ${m.role}">${esc(m.content).replace(/\n/g, '<br>')}</div>`).join('') +
        (busy ? `<div class="coach-msg assistant coach-typing">…thinking</div>` : '');
    }
    thread.scrollTop = thread.scrollHeight;
    const btn = document.getElementById('coach-send'); if (btn) btn.disabled = busy;
  }

  window.renderCoach = function () {
    const body = document.getElementById('coach-body'); if (!body) return;
    if (!getKey()) {
      body.innerHTML = `
        <div class="coach-setup">
          <div class="coach-setup-tit">Connect the coach</div>
          <p>The coach runs on your own Anthropic API key. It's stored only on this phone and used only to talk to Claude. Pay-per-use — pennies per question.</p>
          <ol>
            <li>Go to <strong>console.anthropic.com</strong> → API keys → create a key</li>
            <li>Add a little credit (min $5 — lasts ages)</li>
            <li>Paste the key below</li>
          </ol>
          <input id="coach-key-input" class="setinp" style="text-align:left;width:100%;margin:6px 0 12px" type="password" placeholder="sk-ant-…" autocomplete="off">
          <button class="btn block" onclick="saveCoachKey()">Save key &amp; start</button>
        </div>`;
      return;
    }
    body.innerHTML = `
      <div class="coach-thread" id="coach-thread"></div>
      <div class="coach-quick">
        <button class="lib-chip" onclick="coachQuick('Swap an exercise — ')">Swap an exercise</button>
        <button class="lib-chip" onclick="coachQuick('What should I lift next session on ')">Next-session load</button>
        <button class="lib-chip" onclick="coachQuick('Is my weekly volume enough for the lean look?')">Volume check</button>
        <button class="lib-chip" onclick="coachQuick('Form check: ')">Form check</button>
      </div>
      <div class="coach-input-row">
        <textarea id="coach-input" class="coach-input" rows="1" placeholder="Ask your coach…"></textarea>
        <button class="btn" id="coach-send" onclick="coachSend()">Send</button>
      </div>
      <button class="coach-removekey" onclick="clearCoachKey()">Remove API key</button>`;
    renderThread();
  };

  window.openCoach = function (preset) {
    document.getElementById('coach-modal').classList.add('open');
    renderCoach();
    if (preset) { const inp = document.getElementById('coach-input'); if (inp) { inp.value = preset; inp.focus(); } }
  };
  window.closeCoach = function () { document.getElementById('coach-modal').classList.remove('open'); };
})();
