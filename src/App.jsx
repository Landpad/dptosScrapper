import { useState, useEffect, useCallback, useRef } from "react";

const ML_API = "https://api.mercadolibre.com";
const CATEGORY_DEPARTAMENTOS = "MLA1472"; // Departamentos (subcategoría de Inmuebles MLA1459)
const OPERATION_ALQUILER = "2";           // 1=venta, 2=alquiler

const CLIENT_ID = "4268924083857847";
const REDIRECT_URI = window.location.origin;
const AUTH_KEY = "buscadpto_auth";

const loadAuth = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; } };
const saveAuth = (d) => localStorage.setItem(AUTH_KEY, JSON.stringify(d));
const clearAuth = () => localStorage.removeItem(AUTH_KEY);

function mlAuthUrl() {
  return `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=offline_access`;
}

async function fetchToken(params) {
  const res = await fetch("/ml-oauth", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`OAuth ${res.status}: ${t.slice(0, 200)}`); }
  return res.json();
}

const SEEN_KEY = "buscadpto_seen";
const FILTERS_KEY = "buscadpto_filters";

const getSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveSeen = (set) => localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));

const getStoredFilters = () => {
  try { return JSON.parse(localStorage.getItem(FILTERS_KEY) || "null"); }
  catch { return null; }
};

const DEFAULT_FILTERS = {
  query: "",
  precioMin: "",
  precioMax: "",
  expensasMax: "",
  ambientes: "",
  m2Min: "",
  m2Max: "",
  cochera: false,
  mostrarVistos: false,
  zona: "",
  moneda: "ARS",
};

function formatPrice(n, currency) {
  if (!n) return "—";
  const sym = currency === "USD" ? "USD" : "$";
  return `${sym} ${Number(n).toLocaleString("es-AR")}`;
}

function Badge({ children, color }) {
  const colors = {
    blue: { bg: "#1e3a5f", text: "#93c5fd" },
    green: { bg: "#14532d", text: "#86efac" },
    amber: { bg: "#451a03", text: "#fcd34d" },
    gray: { bg: "#1f2937", text: "#9ca3af" },
    rose: { bg: "#4c0519", text: "#fda4af" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "2px 8px", borderRadius: 4, fontSize: 11,
      fontWeight: 500, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function PropertyCard({ item, seen, onSee }) {
  const isSeen = seen.has(item.id);
  const attrs = item.attributes || [];
  const get = (id) => attrs.find(a => a.id === id)?.value_name || "";

  const ambientes = get("ROOMS") || get("BEDROOMS") || item.ambientes;
  const banos = get("FULL_BATHROOMS") || get("BATHROOMS") || item.banos;
  const m2 = parseFloat(get("TOTAL_AREA") || get("COVERED_AREA") || item.m2 || 0);
  const cochera = get("PARKING_LOTS") > 0 || item.cochera;
  const expensas = item.expensas;
  const precio = item.price;
  const currency = item.currency_id;
  const zona = item.address?.city_name || item.location?.city?.name || item.zona || "";
  const barrio = item.address?.neighborhood_name || item.location?.neighborhood?.name || "";
  const img = item.thumbnail?.replace("I.jpg", "O.jpg") || item.thumbnail || item.img;
  const link = item.permalink || item.link;
  const title = item.title;
  const porm2 = m2 > 0 && precio ? Math.round(precio / m2) : null;
  const fecha = item.date_created ? new Date(item.date_created).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "";

  const handleClick = () => {
    onSee(item.id);
    window.open(link, "_blank");
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: isSeen ? "#0f172a" : "#111827",
        border: `1px solid ${isSeen ? "#1e293b" : "#1f2937"}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
        opacity: isSeen ? 0.6 : 1,
        position: "relative",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {isSeen && (
        <div style={{
          position: "absolute", top: 8, right: 8, zIndex: 2,
          background: "#374151", color: "#9ca3af",
          fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 600,
        }}>VISTO</div>
      )}
      {fecha && (
        <div style={{
          position: "absolute", top: 8, left: 8, zIndex: 2,
          background: "rgba(0,0,0,0.7)", color: "#d1d5db",
          fontSize: 10, padding: "2px 7px", borderRadius: 4,
        }}>{fecha}</div>
      )}
      <div style={{ height: 180, background: "#1f2937", overflow: "hidden" }}>
        {img ? (
          <img src={img} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
        )}
      </div>
      <div style={{ padding: "14px 16px" }}>
        <p style={{ color: "#f9fafb", fontSize: 13, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
        {(zona || barrio) && (
          <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 10px" }}>
            📍 {[barrio, zona].filter(Boolean).join(", ")}
          </p>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {ambientes && <Badge color="blue">{ambientes} amb.</Badge>}
          {banos && <Badge color="gray">{banos} baño{banos > 1 ? "s" : ""}</Badge>}
          {m2 > 0 && <Badge color="green">{m2} m²</Badge>}
          {cochera && <Badge color="amber">🚗 cochera</Badge>}
        </div>
        <div style={{ borderTop: "1px solid #1f2937", paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#9ca3af", fontSize: 12 }}>Alquiler</span>
            <span style={{ color: "#f9fafb", fontSize: 15, fontWeight: 700 }}>{formatPrice(precio, currency)}</span>
          </div>
          {expensas > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>Expensas</span>
              <span style={{ color: "#fbbf24", fontSize: 13 }}>{formatPrice(expensas, "ARS")}</span>
            </div>
          )}
          {porm2 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#9ca3af", fontSize: 12 }}>Precio/m²</span>
              <span style={{ color: "#6b7280", fontSize: 12 }}>{formatPrice(porm2, currency)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ filters, onChange, onSearch, loading }) {
  const inp = (field) => ({
    value: filters[field],
    onChange: e => onChange({ ...filters, [field]: e.target.value }),
    style: inputStyle,
  });

  return (
    <div style={{
      background: "#111827", border: "1px solid #1f2937", borderRadius: 12,
      padding: "20px", display: "flex", flexDirection: "column", gap: 14,
    }}>
      <h2 style={{ color: "#f9fafb", margin: 0, fontSize: 16, fontWeight: 600 }}>Filtros</h2>

      <div>
        <label style={labelStyle}>Búsqueda</label>
        <input {...inp("query")} placeholder="loft, monoambiente, luminoso..." />
      </div>

      <div>
        <label style={labelStyle}>Zona / Barrio</label>
        <input {...inp("zona")} placeholder="Palermo, Belgrano..." />
      </div>

      <div>
        <label style={labelStyle}>Moneda</label>
        <select value={filters.moneda} onChange={e => onChange({ ...filters, moneda: e.target.value })} style={inputStyle}>
          <option value="ARS">Pesos (ARS)</option>
          <option value="USD">Dólares (USD)</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Precio alquiler</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input {...inp("precioMin")} placeholder="Mín" style={{ ...inputStyle, flex: 1 }} />
          <input {...inp("precioMax")} placeholder="Máx" style={{ ...inputStyle, flex: 1 }} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Expensas máx (ARS)</label>
        <input {...inp("expensasMax")} placeholder="ej: 80000" />
      </div>

      <div>
        <label style={labelStyle}>Ambientes</label>
        <select value={filters.ambientes} onChange={e => onChange({ ...filters, ambientes: e.target.value })} style={inputStyle}>
          <option value="">Cualquiera</option>
          <option value="1">1 ambiente</option>
          <option value="2">2 ambientes</option>
          <option value="3">3 ambientes</option>
          <option value="4">4 ambientes</option>
          <option value="5">5+</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Superficie (m²)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input {...inp("m2Min")} placeholder="Mín" style={{ ...inputStyle, flex: 1 }} />
          <input {...inp("m2Max")} placeholder="Máx" style={{ ...inputStyle, flex: 1 }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" id="cochera" checked={filters.cochera}
          onChange={e => onChange({ ...filters, cochera: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: "#3b82f6" }} />
        <label htmlFor="cochera" style={{ ...labelStyle, margin: 0, cursor: "pointer" }}>Solo con cochera</label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" id="vistos" checked={filters.mostrarVistos}
          onChange={e => onChange({ ...filters, mostrarVistos: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: "#3b82f6" }} />
        <label htmlFor="vistos" style={{ ...labelStyle, margin: 0, cursor: "pointer" }}>Mostrar ya vistos</label>
      </div>

      <button
        onClick={onSearch}
        disabled={loading}
        style={{
          background: loading ? "#374151" : "#2563eb",
          color: loading ? "#9ca3af" : "#fff",
          border: "none", borderRadius: 8, padding: "12px",
          fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Buscando..." : "Buscar"}
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "#1f2937", border: "1px solid #374151",
  borderRadius: 6, padding: "8px 10px",
  color: "#f9fafb", fontSize: 13, outline: "none",
};
const labelStyle = {
  display: "block", color: "#9ca3af", fontSize: 12,
  marginBottom: 5, fontWeight: 500,
};

export default function BuscaDpto() {
  const [auth, setAuth] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [filters, setFilters] = useState(getStoredFilters() || DEFAULT_FILTERS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seen, setSeen] = useState(getSeen());
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Handle OAuth callback and restore saved session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, "", window.location.pathname);
      fetchToken({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI })
        .then(data => {
          const a = { access_token: data.access_token, refresh_token: data.refresh_token, expiry: Date.now() + (data.expires_in - 300) * 1000 };
          saveAuth(a); setAuth(a);
        })
        .catch(e => console.error("Code exchange failed:", e))
        .finally(() => setAuthLoading(false));
      return;
    }
    const stored = loadAuth();
    if (!stored) { setAuthLoading(false); return; }
    if (Date.now() < stored.expiry) { setAuth(stored); setAuthLoading(false); return; }
    // Token expired → refresh
    fetchToken({ grant_type: "refresh_token", refresh_token: stored.refresh_token })
      .then(data => {
        const a = { access_token: data.access_token, refresh_token: data.refresh_token || stored.refresh_token, expiry: Date.now() + (data.expires_in - 300) * 1000 };
        saveAuth(a); setAuth(a);
      })
      .catch(() => clearAuth())
      .finally(() => setAuthLoading(false));
  }, []);

  const getValidToken = useCallback(async () => {
    if (!auth) throw new Error("No autenticado");
    if (Date.now() < auth.expiry) return auth.access_token;
    const data = await fetchToken({ grant_type: "refresh_token", refresh_token: auth.refresh_token });
    const a = { access_token: data.access_token, refresh_token: data.refresh_token || auth.refresh_token, expiry: Date.now() + (data.expires_in - 300) * 1000 };
    saveAuth(a); setAuth(a);
    return a.access_token;
  }, [auth]);

  const markSeen = useCallback((id) => {
    setSeen(prev => {
      const next = new Set(prev);
      next.add(String(id));
      saveSeen(next);
      return next;
    });
  }, []);

  const buildParams = (off = 0) => {
    const p = new URLSearchParams();
    p.set("category", CATEGORY_DEPARTAMENTOS);
    p.set("sort", "date_desc");
    p.set("limit", LIMIT);
    p.set("offset", off);
    const q = [filters.query, filters.zona, "alquiler"].filter(Boolean).join(" ");
    p.set("q", q);
    if (filters.precioMin) p.set("price_min", filters.precioMin);
    if (filters.precioMax) p.set("price_max", filters.precioMax);
    if (filters.ambientes) p.set("ROOMS", filters.ambientes);
    if (filters.m2Min) p.set("TOTAL_AREA_FROM", filters.m2Min);
    if (filters.m2Max) p.set("TOTAL_AREA_TO", filters.m2Max);
    if (filters.cochera) p.set("PARKING_LOTS_FROM", "1");
    return p.toString();
  };

  const fetchResults = async (off = 0, append = false) => {
    setLoading(true);
    setError("");
    try {
      const token = await getValidToken();
      const url = `${ML_API}/sites/MLA/search?${buildParams(off)}&access_token=${token}`;
      console.log("[BuscaDpto] GET", url.replace(/access_token=[^&]+/, "access_token=***"));
      const res = await fetch(url);
      if (!res.ok) {
        let body = "";
        try { body = await res.text(); } catch { /* ignore */ }
        console.error("[BuscaDpto] API error", res.status, body);
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      const items = (data.results || []).map(item => ({
        ...item,
        ambientes: item.attributes?.find(a => a.id === "ROOMS")?.value_name,
        banos: item.attributes?.find(a => a.id === "FULL_BATHROOMS")?.value_name,
        m2: parseFloat(item.attributes?.find(a => a.id === "TOTAL_AREA")?.value_name || item.attributes?.find(a => a.id === "COVERED_AREA")?.value_name || 0),
        expensas: parseFloat(item.attributes?.find(a => a.id === "EXPENSES")?.value_name || 0),
        cochera: (item.attributes?.find(a => a.id === "PARKING_LOTS")?.value_name || 0) > 0,
      }));
      setTotal(data.paging?.total || 0);
      setResults(prev => append ? [...prev, ...items] : items);
      setOffset(off + LIMIT);
      localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    } catch (e) {
      console.error("[BuscaDpto] fetch error:", e);
      setError(e.message.startsWith("HTTP ") ? e.message : "No se pudo conectar con MercadoLibre. Revisá la consola del navegador para más detalles.");
    }
    setLoading(false);
  };

  useEffect(() => { if (auth) fetchResults(0); }, [auth]);

  const visibleResults = filters.mostrarVistos
    ? results
    : results.filter(r => !seen.has(String(r.id)));

  const expMax = parseFloat(filters.expensasMax) || Infinity;
  const filtered = visibleResults.filter(r => {
    if (filters.expensasMax && r.expensas > 0 && r.expensas > expMax) return false;
    return true;
  });

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#6b7280", fontSize: 14 }}>Cargando...</span>
    </div>
  );

  if (!auth) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", padding: 40 }}>
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none" style={{ marginBottom: 16 }}>
          <rect width="32" height="32" rx="8" fill="#2563eb"/>
          <path d="M8 20V13l8-6 8 6v7H8z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          <rect x="13" y="14" width="3" height="3" rx="0.5" fill="#93c5fd"/>
          <rect x="17" y="14" width="3" height="3" rx="0.5" fill="#93c5fd"/>
          <rect x="13" y="18" width="6" height="3" rx="0.5" fill="#93c5fd"/>
          <circle cx="23" cy="11" r="3.5" stroke="#facc15" strokeWidth="1.5" fill="none"/>
          <line x1="25.5" y1="13.5" x2="27.5" y2="15.5" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <h1 style={{ color: "#f9fafb", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>BuscaDpto</h1>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "0 0 28px" }}>Iniciá sesión con tu cuenta de MercadoLibre<br/>para buscar departamentos en alquiler</p>
        <a href={mlAuthUrl()} style={{
          display: "inline-block", background: "#ffe600", color: "#1a1a1a",
          padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700,
          textDecoration: "none",
        }}>Entrar con MercadoLibre</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "'DM Sans', sans-serif", color: "#f9fafb" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "#111827", borderBottom: "1px solid #1f2937",
        padding: "16px 24px", display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#2563eb"/>
          <path d="M8 20V13l8-6 8 6v7H8z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          <rect x="13" y="14" width="3" height="3" rx="0.5" fill="#93c5fd"/>
          <rect x="17" y="14" width="3" height="3" rx="0.5" fill="#93c5fd"/>
          <rect x="13" y="18" width="6" height="3" rx="0.5" fill="#93c5fd"/>
          <circle cx="23" cy="11" r="3.5" stroke="#facc15" strokeWidth="1.5" fill="none"/>
          <line x1="25.5" y1="13.5" x2="27.5" y2="15.5" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f9fafb", letterSpacing: "-0.5px" }}>BuscaDpto</h1>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>departamentos en alquiler · argentina</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {total > 0 && <span style={{ color: "#6b7280", fontSize: 12 }}>{total.toLocaleString()} publicaciones</span>}
          {seen.size > 0 && (
            <button onClick={() => { const s = new Set(); setSeen(s); saveSeen(s); }}
              style={{ background: "none", border: "1px solid #374151", borderRadius: 6,
                color: "#9ca3af", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>
              Limpiar vistos ({seen.size})
            </button>
          )}
          <button onClick={() => { clearAuth(); setAuth(null); setResults([]); }}
            style={{ background: "none", border: "1px solid #374151", borderRadius: 6,
              color: "#6b7280", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, maxWidth: 1400, margin: "0 auto" }}>
        {/* Sidebar */}
        <div style={{
          width: 260, minWidth: 260, padding: "20px 16px",
          position: "sticky", top: 65, height: "calc(100vh - 65px)", overflowY: "auto",
        }}>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onSearch={() => fetchResults(0)}
            loading={loading}
          />
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "20px 20px 40px" }}>
          {error && (
            <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8,
              padding: "12px 16px", color: "#fca5a5", marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          {loading && results.length === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: "#111827", border: "1px solid #1f2937",
                  borderRadius: 12, height: 320, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && results.length > 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
              <p style={{ fontSize: 16 }}>Todos los resultados ya fueron vistos.</p>
              <button onClick={() => setFilters({ ...filters, mostrarVistos: true })}
                style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8,
                  color: "#9ca3af", padding: "8px 16px", cursor: "pointer", marginTop: 8 }}>
                Mostrar vistos igual
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <>
              <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>
                Mostrando {filtered.length} resultados
                {!filters.mostrarVistos && seen.size > 0 && ` · ${seen.size} ocultados (ya vistos)`}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {filtered.map(item => (
                  <PropertyCard key={item.id} item={item} seen={seen} onSee={markSeen} />
                ))}
              </div>
              {offset < total && (
                <div style={{ textAlign: "center", marginTop: 32 }}>
                  <button onClick={() => fetchResults(offset, true)} disabled={loading}
                    style={{
                      background: "#1f2937", border: "1px solid #374151", borderRadius: 8,
                      color: loading ? "#6b7280" : "#f9fafb", padding: "12px 32px",
                      fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontWeight: 500,
                    }}>
                    {loading ? "Cargando..." : `Cargar más (${total - offset} restantes)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
