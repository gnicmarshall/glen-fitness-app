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

  // Replace local state with a remote copy and re-render the active screen.
  function adoptRemote(data) {
    if (!data) return;
    applyingRemote = true;
    Object.keys(data).forEach(k => { state[k] = data[k]; });
    store.set('fitplan_v2', state);
    applyingRemote = false;
    if (typeof renders !== 'undefined') renders[_activeTab]?.();
  }

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (unsub) { unsub(); unsub = null; }

    if (!user) { setStatus('signedout'); return; }

    setStatus('syncing');
    // One-off reconcile: whichever copy (local vs cloud) is newer wins.
    docRef(user.uid).get().then(snap => {
      const remote = snap.exists ? snap.data() : null;
      const remoteData = parseRemote(remote);
      const localUpdated = state.updatedAt || 0;
      const remoteUpdated = (remote && remote.updatedAt) || 0;

      if (remoteData && remoteUpdated >= localUpdated) {
        adoptRemote(remoteData);
      } else {
        state.updatedAt = state.updatedAt || Date.now();
        docRef(user.uid).set({ json: JSON.stringify(state), updatedAt: state.updatedAt })
          .then(() => setStatus('synced'))
          .catch(e => { console.warn('[cloud] initial push failed', e); setStatus('error'); });
      }
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
    if (currentUser) {
      const name = currentUser.displayName || currentUser.email || 'Signed in';
      const st = _status === 'synced' ? '✓ Backed up &amp; syncing'
               : _status === 'syncing' ? 'Syncing…'
               : _status === 'error' ? '⚠ Sync error — will retry'
               : 'Connected';
      el.innerHTML =
        '<div class="cloudrow">' +
          '<div class="cloudico ok">☁</div>' +
          '<div class="cloudtxt"><div class="cloudnm">' + name + '</div><div class="cloudst">' + st + '</div></div>' +
          '<button class="btn ghost sm" onclick="signOutCloud()">Sign out</button>' +
        '</div>';
    } else {
      el.innerHTML =
        '<div class="cloudrow">' +
          '<div class="cloudico">☁</div>' +
          '<div class="cloudtxt"><div class="cloudnm">Back up &amp; sync</div><div class="cloudst">Sign in to save across all your devices</div></div>' +
          '<button class="btn sm" onclick="signInCloud()">Sign in</button>' +
        '</div>';
    }
  };

  // Complete a redirect-based sign-in if the popup fallback was used.
  auth.getRedirectResult().catch(() => {});
})();
