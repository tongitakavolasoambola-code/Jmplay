/* Baiboly sy Fihirana FJM — Mise à jour avy amin'ny Supabase (offline-first)
   - Maka hira / lohahevitra / dikisionera navoaka (published)
   - Tehirizina ao amin'ny localStorage
   - Tsy manolo ny baiboly.js lehibe (mijanona static)
*/
(() => {
  'use strict';
  const CACHE_KEY = 'hiraplus_remote_v1';
  const CFG = window.APP_CONFIG || {};
  let sb = null;

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeCache(obj) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  async function ensureClient() {
    if (sb) return sb;
    if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) return null;
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
    return sb;
  }

  /** Maka ny andalana rehetra (Supabase mampiato 1000 isaky ny fangatahana) */
  async function fetchAll(client, table, build) {
    const PAGE = 1000;
    let from = 0, rows = [];
    for (;;) {
      const { data, error } = await build(client.from(table).select('*')).range(from, from + PAGE - 1);
      if (error) return { data: null, error };
      rows = rows.concat(data || []);
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return { data: rows, error: null };
  }

  /** Mahita ny vaovao hampandrenesina: hafatra admin vaovao + fanavaozana votoaty.
   *  Ny fampitahana dia amin'ny "signature" (isa + updated_at farany) voatahiry; ny sync voalohany dia tsy mampandre. */
  const SIG_KEY = 'hiraplus_sync_sig', SEEN_KEY = 'hiraplus_seen_notif';
  function detectNews(out) {
    const news = { messages: [], updates: {} };
    try {
      const sig = r => (r || []).length + '|' + (r || []).reduce((m, x) => (x.updated_at && x.updated_at > m ? x.updated_at : m), '');
      const cur = { songs: sig(out.songs), topics: sig(out.topics), dictionary: sig(out.dictionary) };
      const old = JSON.parse(localStorage.getItem(SIG_KEY) || 'null');
      if (old) {
        const prevCache = readCache();
        const diff = (k, now) => Math.max(0, now.length - (prevCache[k] || []).length);
        for (const k of ['songs', 'topics', 'dictionary']) {
          if (old[k] !== cur[k]) news.updates[k] = diff(k, out[k]) || -1; // -1 = nohavaozina fa tsy nitombo
        }
      }
      localStorage.setItem(SIG_KEY, JSON.stringify(cur));
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null');
      const ids = (out.notifications || []).map(n => n.id);
      if (seen) news.messages = (out.notifications || []).filter(n => !seen.includes(n.id));
      else if (ids.length) news.messages = []; // fampiasana voalohany: aza mampandre hafatra taloha
      localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(0, 200).concat((seen || []).slice(0, 200))));
    } catch (e) {}
    return news;
  }

  /** Maka votoaty navoaka ary mitahiry offline */
  async function pullUpdates() {
    const client = await ensureClient();
    if (!client || !navigator.onLine) return { ok: false, reason: 'offline_or_no_config' };

    const out = { songs: [], topics: [], dictionary: [], notifications: [], at: new Date().toISOString() };
    try {
      const [s, t, d, n] = await Promise.all([
        fetchAll(client, 'songs', q => q.eq('published', true).order('year').order('number').order('id')),
        fetchAll(client, 'topics', q => q.eq('published', true).order('name').order('id')),
        fetchAll(client, 'dictionary_entries', q => q.eq('published', true).order('word')),
        client.from('notifications').select('*').eq('published', true).eq('active', true).order('id', { ascending: false })
      ]);
      if (s.error) throw s.error;
      if (t.error) throw t.error;
      if (d.error) throw d.error;
      // notifications may fail if table not yet created
      out.songs = s.data || [];
      out.topics = t.data || [];
      out.dictionary = d.data || [];
      out.notifications = (n && !n.error && n.data) ? n.data : [];
      const news = detectNews(out);
      writeCache(out);
      return { ok: true, news, counts: { songs: out.songs.length, topics: out.topics.length, dictionary: out.dictionary.length, notifications: out.notifications.length } };
    } catch (e) {
      console.warn('sync pull failed', e);
      return { ok: false, reason: e.message || String(e) };
    }
  }

  /** Ampifangaro amin'ny hira static.
   *  Voafantina amin'ny laharana + taona (0 / banga = boky voalohany), satria misy laharana mitovy
   *  amin'ny taona samihafa. Ny hira any Supabase no manolo ny static; ny vaovao ampiana. */
  function mergeSongs(staticSongs) {
    const remote = readCache().songs || [];
    if (!remote.length) return staticSongs;
    const num = n => parseInt(String(n).replace(/\D/g, ''), 10) || 0;
    const key = (n, y) => num(n) + '|' + (parseInt(y, 10) || 0);
    const out = [], idx = new Map();
    (staticSongs || []).forEach(s => { idx.set(key(s.number, s.year), out.length); out.push(s); });
    remote.forEach(r => {
      const y = parseInt(r.year, 10) || 0;
      const k = key(r.number, y);
      const base = idx.has(k) ? out[idx.get(k)] : null;
      const merged = Object.assign({ book: 'JM', author: '' }, base || {}, {
        id: base ? base.id : 'r-' + y + '-' + String(r.number).padStart(3, '0'),
        number: base ? base.number : String(r.number).padStart(3, '0'),
        title: r.title || (base && base.title) || '',
        lyrics: r.lyrics || '',
        category: r.topic || (base && base.category) || '',
        year: y ? String(y) : (base && base.year) || '',
        audio: r.audio_url || r.audio || (base && base.audio) || ''
      });
      delete merged._n;
      if (base) out[idx.get(k)] = merged; else { idx.set(k, out.length); out.push(merged); }
    });
    return out.sort((a, b) => num(a.number) - num(b.number));
  }

  /** Ampifangaro dikisionera.
   *  Ny teny avy any Supabase no manolo ny static (mitovy ny teny, tsy mijery ny " (2)").
   *  Ny static tsy ao amin'ny remote dia tazonina (anisan'izany ny teny mitovy anarana). */
  function mergeDict(staticDict) {
    const remote = readCache().dictionary || [];
    if (!remote.length) return staticDict;
    const clean = w => String(w || '').replace(/\s+\(\d+\)\s*$/, '').trim().toLowerCase();
    const remoteWords = new Set();
    const out = [];
    remote.forEach(r => {
      const raw = (r.word || '').trim();
      if (!raw) return;
      remoteWords.add(clean(raw));
      out.push({
        id: 'r-' + (r.id || raw),
        w: raw.replace(/\s+\(\d+\)\s*$/, ''),
        g: r.g || '',
        t: r.definition || '',
        r: Array.isArray(r.refs) ? r.refs : []
      });
    });
    (staticDict || []).forEach(e => {
      if (!remoteWords.has(clean(e.w))) out.push(e);
    });
    return out;
  }

  /** Lohahevitra: [Anarana MG, FR, EN, [[boky,toko,andininy],...]].
   *  Ny avy any Supabase (published) no manolo ny static raha mitovy anarana; ny vaovao ampiana. */
  function mergeTopics(staticTopics) {
    const remote = readCache().topics || [];
    if (!remote.length) return staticTopics;
    const key = s => String(s || '').trim().toLowerCase();
    const out = (staticTopics || []).slice(), idx = new Map();
    out.forEach((t, i) => idx.set(key(t[0]), i));
    remote.forEach(r => {
      const name = String(r.name || '').trim(); if (!name) return;
      const refs = Array.isArray(r.refs) ? r.refs.filter(x => Array.isArray(x) && x.length === 3) : [];
      const k = key(name), i = idx.get(k), old = i != null ? out[i] : null;
      const row = [name, r.name_fr || (old && old[1]) || '', r.name_en || (old && old[2]) || '', refs.length ? refs : (old ? old[3] : [])];
      if (old) out[i] = row; else { idx.set(k, out.length); out.push(row); }
    });
    return out.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'mg'));
  }

  function getRemoteTopics() { return readCache().topics || []; }
  function lastSyncAt() { return readCache().at || null; }

  
  // Fangatahana code: mandeha amin'ny function Supabase (tsy mamaky table mivantana)
  async function requestActivation({ name, contact, year, message }) {
    const client = await ensureClient();
    if (!client || !navigator.onLine) return { ok: false, reason: 'offline_or_no_config' };
    const { data, error } = await client.rpc('request_activation', {
      p_name: name || '',
      p_contact: contact || '',
      p_year: year || 2026,
      p_message: message || ''
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, id: data };
  }

  async function checkMyRequest(contact) {
    const client = await ensureClient();
    if (!client || !contact) return [];
    const { data, error } = await client.rpc('my_activation_requests', { p_contact: contact });
    if (error) return [];
    return data || [];
  }

  // Fanamarinana code: eny/tsia fotsiny no miverina, tsy misy lisitry ny code any amin'ny finday
  async function verifyCode(code) {
    const client = await ensureClient();
    if (!client || !navigator.onLine) return { ok: false, reason: 'offline_or_no_config' };
    const { data, error } = await client.rpc('verify_activation_code', { p_code: code });
    if (error) return { ok: false, reason: error.message };
    return data ? { ok: true, year: data } : { ok: false, reason: 'invalid' };
  }

  window.HIRA_SYNC = {
    requestActivation,
    checkMyRequest,
    verifyCode,
    pullUpdates,
    mergeSongs,
    mergeDict,
    mergeTopics,
    getRemoteTopics,
    getNotifications: () => readCache().notifications || [],
    getCodes: () => [], // tsy tehirizina intsony ao amin'ny finday (jereo verifyCode)
    lastSyncAt,
    readCache
  };
})();
