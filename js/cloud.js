/* ─── Cloud sync (Firebase Auth + Firestore) ──────────────────────────────────
   Backs up `state` to Firestore under users/{uid} and keeps every signed-in
   device in sync in real time. Fully defensive: if the Firebase SDK fails to
   load (e.g. offline first-load), the app keeps working from localStorage. */
(function () {
  if (typeof firebase === 'undefined') {
    console.warn('[cloud] Firebase SDK not available — running local-only.');
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyDYdTo-NVmKlFQb64Cv4BxNb3lXPLSDWcw",
    authDomain: "glen-fitness.firebaseapp.com",
    projectId: "glen-fitness",
    storageBucket: "glen-fitness.firebasestorage.app",
    messagingSenderId: "103649815685",
    appId: "1:103649815685:web:d58f4ab641fa02b3424dec"
  };

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  // Offline cache so the app reads/writes Firestore data without a connection.
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

  let currentUser = null;
  let unsub = null;
  let applyingRemote = false;
  let saveTimer = null;
  let _status = 'signedout';

  const docRef = uid => db.collection('users').doc(uid);

  function setStatus(s) { _status = s; renderCloudCard(); }

  // Debounced push of the whole state blob up to Firestore.
  // NOTE: state is stored as a JSON *string* — Firestore rejects nested arrays
  // (our workout `sets` is an array-of-arrays), so we serialise the whole thing.
  window.cloudPush = function () {
    if (!currentUser) return;
    setStatus('syncing');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      docRef(currentUser.uid).set({ json: JSON.stringify(state), updatedAt: state.updatedAt || Date.now() })
        .then(() => setStatus('synced'))
        .catch(e => { console.warn('[cloud] push failed', e); setStatus('error'); });
    }, 800);
  };

  // Parse a remote document's JSON payload (returns null if unusable).
  function parseRemote(d) {
    if (!d || !d.json) return null;
    try { return JSON.parse(d.json); } catch (e) { console.warn('[cloud] bad remote json', e); return null; }
  }

  // How much real logged work a session holds — used to pick the richer copy
  // when merging, so an emptier remote copy can never wipe a logged one.
  function workScore(sd) {
    if (!sd) return -1;
    if (Array.isArray(sd)) return sd.filter(Boolean).length;
    if (!sd.sets) return sd.finishedAt ? 1 : 0;
    let n = sd.finishedAt ? 1000 : 0;
    sd.sets.forEach(arr => (arr || []).forEach(s => {
      if (s && (s.done || (s.w !== '' && s.w != null) || (s.r !== '' && s.r != null))) n++;
    }));
    return n;
  }
  // Union two workout logs by date+session, keeping the richer session each time.
  function mergeWorkoutLogs(local, remote) {
    const out = {};
    const dates = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
    dates.forEach(d => {
      const L = (local && local[d]) || {}, R = (remote && remote[d]) || {};
      const day = {};
      new Set([...Object.keys(L), ...Object.keys(R)]).forEach(s => {
        day[s] = workScore(L[s]) >= workScore(R[s]) ? L[s] : R[s];
      });
      out[d] = day;
    });
    return out;
  }
  // Union date-keyed log objects (foodLog, mobilityLog), keeping the fuller day.
  function mergeDateArrays(local, remote) {
    const out = {};
    new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]).forEach(d => {
      const la = (local && local[d]) || [], rb = (remote && remote[d]) || [];
      out[d] = la.length >= rb.length ? la : rb;
    });
    return out;
  }
  // Union arrays of {date,…} (weightLog, waistLog) by date.
  function mergeByDate(local, remote) {
    const map = {};
    (remote || []).forEach(x => { if (x && x.date) map[x.date] = x; });
    (local || []).forEach(x => { if (x && x.date) map[x.date] = x; });
    return Object.values(map).sort((p, q) => String(p.date).localeCompare(String(q.date)));
  }

  // Merge a remote copy into local state — NON-destructively for logged data, so
  // sync can never delete a workout/meal/measurement that exists on either side.
  function adoptRemote(data) {
    if (!data) return;
    applyingRemote = true;
    Object.keys(data).forEach(k => {
      if (k === 'workoutLog') state.workoutLog = mergeWorkoutLogs(state.workoutLog, data.workoutLog);
      else if (k === 'foodLog' || k === 'mobilityLog') state[k] = mergeDateArrays(state[k], data[k]);
      else if (k === 'weightLog' || k === 'waistLog') state[k] = mergeByDate(state[k], data[k]);
      else state[k] = data[k];   // settings & scalars: remote wins
    });
    store.set('fitplan_v2', state);
    applyingRemote = false;
    if (typeof renders !== 'undefined') renders[_activeTab]?.();
  }

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (unsub) { unsub(); unsub = null; }

    if (!user) { setStatus('signedout'); return; }

    setStatus('syncing');
    // One-off reconcile: MERGE local + cloud (union, never delete), then push the
    // merged superset back so the cloud converges and can't re-clobber a device.
    docRef(user.uid).get().then(snap => {
      const remoteData = parseRemote(snap.exists ? snap.data() : null);
      if (remoteData) adoptRemote(remoteData);
      state.updatedAt = Date.now();
      docRef(user.uid).set({ json: JSON.stringify(state), updatedAt: state.updatedAt })
        .then(() => setStatus('synced'))
        .catch(e => { console.warn('[cloud] merge push failed', e); setStatus('error'); });
      setStatus('synced');

      // Live updates from other devices.
      unsub = docRef(user.uid).onSnapshot(s => {
        if (!s.exists || applyingRemote) return;
        const d = s.data();
        if (d.updatedAt && d.updatedAt > (state.updatedAt || 0)) {
          adoptRemote(parseRemote(d));
        }
      });
    }).catch(e => { console.warn('[cloud] reconcile failed', e); setStatus('error'); });
  });

  window.signInCloud = function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request' ||
                e.code === 'auth/operation-not-supported-in-this-environment')) {
        auth.signInWithRedirect(provider);
      } else {
        console.warn('[cloud] sign-in failed', e);
        alert('Sign-in failed: ' + (e.message || e.code || e));
      }
    });
  };

  window.signOutCloud = function () { auth.signOut(); };

  window.renderCloudCard = function () {
    const el = document.getElementById('cloud-card');
    if (!el) return;
    if (!currentUser) {
      // Not signed in — make it clearly a warning so a session isn't trained un-backed-up.
      el.innerHTML =
        '<div class="cloudrow warn">' +
          '<div class="cloudico warn">⚠</div>' +
          '<div class="cloudtxt"><div class="cloudnm warn">Not backed up</div>' +
            '<div class="cloudst">Sign in so your workouts save & survive a phone wipe</div></div>' +
          '<button class="btn sm" onclick="signInCloud()">Sign in</button>' +
        '</div>';
      return;
    }
    const name = currentUser.displayName || currentUser.email || 'Signed in';
    if (_status === 'synced') {
      el.innerHTML =
        '<div class="cloudrow ok">' +
          '<div class="cloudico ok">✓</div>' +
          '<div class="cloudtxt"><div class="cloudnm ok">Backed up &amp; syncing</div>' +
            '<div class="cloudst">' + name + ' · safe across your devices</div></div>' +
          '<button class="btn ghost sm" onclick="signOutCloud()">Sign out</button>' +
        '</div>';
    } else if (_status === 'error') {
      el.innerHTML =
        '<div class="cloudrow warn">' +
          '<div class="cloudico warn">⚠</div>' +
          '<div class="cloudtxt"><div class="cloudnm warn">Sync hiccup — retrying</div>' +
            '<div class="cloudst">' + name + ' · your data is still safe on this phone</div></div>' +
          '<button class="btn ghost sm" onclick="signOutCloud()">Sign out</button>' +
        '</div>';
    } else { // syncing / connecting
      el.innerHTML =
        '<div class="cloudrow">' +
          '<div class="cloudico">☁</div>' +
          '<div class="cloudtxt"><div class="cloudnm">Syncing…</div><div class="cloudst">' + name + '</div></div>' +
        '</div>';
    }
  };

  // Complete a redirect-based sign-in if the popup fallback was used.
  auth.getRedirectResult().catch(() => {});
})();
