// Conecta la Bitácora QA con Supabase (base de datos, imágenes y sesión).
(function () {
  const cfg = window.BITACORA_CONFIG || {};
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.__sb = sb;
  const BUCKET = "evidencias";
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const ready = sb.auth.getSession().then(r => r.data.session);

  // ---------- Sesión ----------
  async function uid() { const s = await ready; return s && s.user ? s.user.id : null; }

  // ---------- Base de datos ----------
  const listeners = new Set();
  let cache = null;
  async function loadAll() {
    const { data, error } = await sb.from("revisiones").select("id,data").order("fecha", { ascending: false }).limit(5000);
    if (error) throw error;
    cache = data;
    return data;
  }
  const snap = rows => ({ docs: rows.map(r => ({ id: r.id, exists: true, data: () => r.data })), size: rows.length, empty: !rows.length });
  async function notify() { const rows = await loadAll(); listeners.forEach(cb => cb(snap(rows))); }
  const err = e => { const x = new Error(e && e.message || "error"); x.code = "unavailable"; return x; };

  function docRef(id) {
    return {
      id,
      async get() { const { data } = await sb.from("revisiones").select("id,data").eq("id", id).maybeSingle(); return { id, exists: !!data, data: () => data && data.data }; },
      async set(body) {
        const user_id = await uid();
        const { error } = await sb.from("revisiones").upsert({ id, user_id, data: body, updated_at: new Date().toISOString() }, { onConflict: "user_id,id" });
        if (error) throw err(error); notify();
      },
      async update(part) {
        const cur = await this.get();
        if (!cur.exists) { const x = new Error("no existe"); x.code = "invalid_argument"; throw x; }
        await this.set({ ...cur.data(), ...part });
      },
      async delete() { const { error } = await sb.from("revisiones").delete().eq("id", id); if (error) throw err(error); notify(); }
    };
  }
  const query = {
    orderBy() { return query; }, limit() { return query; }, where() { return query; },
    async get() { return snap(await loadAll()); },
    onSnapshot(cb, onErr) { listeners.add(cb); loadAll().then(rows => cb(snap(rows))).catch(e => onErr && onErr(err(e))); return () => listeners.delete(cb); },
    doc(id) { return docRef(id || rid()); },
    async add(body) { const r = docRef(rid()); await r.set(body); return r; }
  };
  // Documento de configuración (colección de stickers propios)
  function configRef(key) {
    const subs = new Set();
    const read = async () => { const { data } = await sb.from("config").select("data").eq("key", key).maybeSingle(); return { exists: !!data, data: () => data && data.data }; };
    return {
      async get() { return read(); },
      async set(body) {
        const user_id = await uid();
        const { error } = await sb.from("config").upsert({ key, user_id, data: body }, { onConflict: "user_id,key" });
        if (error) throw err(error); const s = await read(); subs.forEach(cb => cb(s));
      },
      onSnapshot(cb) { subs.add(cb); read().then(cb); return () => subs.delete(cb); }
    };
  }
  const configRefs = {};
  const db = {
    collection(path) { return query; },
    doc(path) { const key = path.split("/").pop(); return configRefs[key] || (configRefs[key] = configRef(key)); }
  };

  // ---------- Imágenes ----------
  const urlCache = {}, pending = {};
  const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  let rerenderT;
  async function resolve(path) {
    if (urlCache[path]) return urlCache[path];
    if (!pending[path]) pending[path] = sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6).then(({ data }) => {
      urlCache[path] = data ? data.signedUrl : PIXEL; return urlCache[path];
    });
    return pending[path];
  }
  window.__resolveAsset = resolve;
  window.__assetUrl = path => {
    if (urlCache[path]) return urlCache[path];
    resolve(path).then(() => { clearTimeout(rerenderT); rerenderT = setTimeout(() => window.__rerender && window.__rerender(), 50); });
    return PIXEL;
  };
  const assets = {
    async upload(blob, opts) {
      const user = await uid();
      const type = (opts && opts.type) || blob.type || "image/png";
      const ext = (type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
      const path = `${user}/${rid()}.${ext}`;
      if (blob.size > 20 * 1024 * 1024) { const x = new Error("grande"); x.code = "too_large"; throw x; }
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false });
      if (error) { const x = new Error(error.message); x.code = "upstream_error"; throw x; }
      urlCache[path] = URL.createObjectURL(blob);
      return { id: path, url: urlCache[path], sizeBytes: blob.size, contentType: type };
    },
    async delete(path) { await sb.storage.from(BUCKET).remove([path]); delete urlCache[path]; return { deleted: true }; }
  };

  // ---------- Descargas ----------
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return { status: "saved" };
    }
  };

  const user = { can: async () => true, isOwner: () => true, canEdit: () => true };

  window.claude = {
    async use(name) {
      const s = await ready;
      if (!s) return null;
      return { db, assets, downloads, user }[name] || null;
    }
  };

  // ---------- Pantalla de inicio de sesión ----------
  document.addEventListener("DOMContentLoaded", async () => {
    const s = await ready;
    const box = document.getElementById("login");
    const out = document.getElementById("btn-logout");
    if (s) { out.hidden = false; out.onclick = async () => { await sb.auth.signOut(); location.reload(); }; return; }
    box.hidden = false;
    const msg = document.getElementById("login-msg");
    const go = async (mode) => {
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-pass").value;
      if (!email || password.length < 8) { msg.textContent = "Escribe tu correo y una contraseña de al menos 8 caracteres."; return; }
      msg.textContent = mode === "up" ? "Creando cuenta…" : "Entrando…";
      const r = mode === "up" ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.href.split("#")[0] } })
                              : await sb.auth.signInWithPassword({ email, password });
      if (r.error) { msg.textContent = /Invalid login/i.test(r.error.message) ? "Correo o contraseña incorrectos." : /not allowed|disabled/i.test(r.error.message) ? "El registro de cuentas nuevas está desactivado." : r.error.message; return; }
      if (mode === "up" && !r.data.session) { msg.textContent = "Listo. Revisa tu correo y confirma tu cuenta; después entra aquí."; return; }
      location.reload();
    };
    document.getElementById("login-form").addEventListener("submit", e => { e.preventDefault(); go("in"); });
    document.getElementById("login-up").addEventListener("click", () => go("up"));
  });
})();
