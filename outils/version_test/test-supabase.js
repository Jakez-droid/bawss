/* Version test de Bawss : faux Supabase, rien ne part sur le vrai serveur.
   Les comptes, favoris, messages et photos restent dans ce navigateur. */
(function () {
  const K = 'bawss-test-session';
  const lire = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const ok = v => Promise.resolve({ data: v, error: null, count: Array.isArray(v) ? v.length : 0 });
  const uid = () => 'test-' + Math.random().toString(36).slice(2, 10);
  let ecouteurs = [];
  const session = () => lire(K, null);
  function connecter(user) {
    const s = { access_token: 'test', user };
    ecrire(K, s); ecouteurs.forEach(f => { try { f('SIGNED_IN', s); } catch (e) {} });
    return { data: { user, session: s }, error: null };
  }
  const profils = () => lire('bawss-test-profils', {});
  const messages = () => lire('bawss-test-messages', []);
  function table(nom) {
    let op = 'select', ligne = null, filtres = {}, tete = false;
    const q = {
      select(c, o) { if (o && o.head) tete = true; return q; },
      insert(v) { op = 'insert'; ligne = v; return q; },
      update(v) { op = 'update'; ligne = v; return q; },
      upsert(v) { op = 'upsert'; ligne = v; return q; },
      delete() { op = 'delete'; return q; },
      eq(k, v) { filtres[k] = v; return q; }, neq() { return q; }, in() { return q; }, gt() { return q; }, lt() { return q; }, gte() { return q; }, lte() { return q; },
      is() { return q; }, or() { return q; }, order() { return q; }, limit() { return q; }, range() { return q; }, match() { return q; },
      maybeSingle() { return executer(true); }, single() { return executer(true); },
      then(a, b) { return executer(false).then(a, b); }
    };
    function executer(un) {
      const s = session(), moi = s && s.user;
      if (nom === 'profils') {
        const P = profils();
        if (op === 'insert' || op === 'upsert' || op === 'update') {
          const id = (ligne && ligne.id) || (moi && moi.id); if (id) { P[id] = Object.assign({ id, admin: false, cree_le: new Date().toISOString(), vu_le: new Date().toISOString() }, P[id] || {}, ligne || {}); ecrire('bawss-test-profils', P); }
          return ok(un ? P[id] : [P[id]]);
        }
        if (un) return ok(moi ? P[filtres.id || moi.id] || null : null);
        return ok(Object.values(P));
      }
      if (nom === 'messages') {
        const M = messages();
        if (op === 'insert') {
          const m = Object.assign({ id: uid(), cree_le: new Date().toISOString(), de_admin: false, lu: false }, ligne);
          M.push(m); ecrire('bawss-test-messages', M);
          setTimeout(() => { const r = { id: uid(), user_id: m.user_id, texte: 'Message reçu ! (version test : ton Jakez ne le voit pas)', de_admin: true, lu: false, cree_le: new Date().toISOString() }; const L = messages(); L.push(r); ecrire('bawss-test-messages', L); }, 1500);
          return ok(un ? m : [m]);
        }
        if (op === 'update' || op === 'delete') return ok(null);
        const L = M.filter(m => !filtres.user_id || m.user_id === filtres.user_id);
        if (tete) return Promise.resolve({ data: null, error: null, count: 0 });
        return ok(un ? L[0] || null : L);
      }
      if (op !== 'select') return ok(un ? ligne : []);
      if (tete) return Promise.resolve({ data: null, error: null, count: 0 });
      return ok(un ? null : []);
    }
    return q;
  }
  const client = {
    auth: {
      getSession: () => ok({ session: session() }),
      getUser: () => ok({ user: (session() || {}).user || null }),
      onAuthStateChange(f) { ecouteurs.push(f); return { data: { subscription: { unsubscribe() { ecouteurs = ecouteurs.filter(x => x !== f); } } } }; },
      signUp: ({ email, options }) => {
        const C = lire('bawss-test-comptes', {});
        if (C[email]) return Promise.resolve({ data: { user: { identities: [] } }, error: null });
        const user = { id: uid(), email, user_metadata: (options && options.data) || {}, identities: [{}] };
        C[email] = user; ecrire('bawss-test-comptes', C);
        return Promise.resolve(connecter(user));
      },
      signInWithPassword: ({ email }) => {
        const C = lire('bawss-test-comptes', {});
        if (!C[email]) return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
        return Promise.resolve(connecter(C[email]));
      },
      signInAnonymously: ({ options } = {}) => Promise.resolve(connecter({ id: uid(), is_anonymous: true, user_metadata: (options && options.data) || {} })),
      signOut: () => { ecrire(K, null); ecouteurs.forEach(f => { try { f('SIGNED_OUT', null); } catch (e) {} }); return ok(null); },
      updateUser: ({ data } = {}) => { const s = session(); if (s && data) { s.user.user_metadata = Object.assign({}, s.user.user_metadata, data); ecrire(K, s); } return ok({ user: s && s.user }); },
      resetPasswordForEmail: () => ok(null)
    },
    from: table,
    rpc: (nom) => ok(nom === 'pseudo_libre' ? true : nom === 'membres' ? Object.values(profils()) : null),
    channel() { const c = { on: () => c, subscribe: () => c, unsubscribe() {} }; return c; },
    removeChannel() {},
    storage: { from: () => ({ upload: () => ok({ path: 'test' }), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: () => ok(null) }) }
  };
  window.supabase = { createClient: () => client };
})();
