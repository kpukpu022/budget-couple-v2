import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// ── Storage keys ──
const SK = { exp:"bcv6_exp", env:"bcv6_env", set:"bcv6_set", rec:"bcv6_rec", inc:"bcv6_inc", rep:"bcv6_rep" };

// ── Constants ──
const PALETTE = ["#f43f8a","#a855f7","#3b82f6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16"];
const EMOJIS  = ["🛒","🏠","🍽️","🚆","👩","👨","💊","📦","✈️","🎬","☕","🎮","💄","🐶","🌿","🎁","⚡","💧","📱","🏋️","🎵","🧴","🏥","🏦","📈","🍫","🍔","🚗","🔒","📡","💰"];
const MSHT    = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

const DEFAULT_SETTINGS = { ratioCap:42, names:["Capucine","Guillaume"], salCap:2100, salGui:2900 };
const DEFAULT_ENVELOPES = [
  { id:"ec_loy", name:"Loyer + charges",  emoji:"🏠", color:"#8b5cf6", budget:1412, owner:"shared" },
  { id:"ec_cou", name:"Courses",          emoji:"🛒", color:"#f43f8a", budget:400,  owner:"shared" },
  { id:"ep_spo", name:"Sport Cap",        emoji:"🏋️", color:"#ec4899", budget:49,   owner:"cap"    },
  { id:"eg_tra", name:"Train Gui",        emoji:"🚆", color:"#3b82f6", budget:44.5, owner:"gui"    },
];

const SPLIT_OPTS = [
  { key:"prorata", icon:"⚖️", label:"Pro rata" },
  { key:"equal",   icon:"🤝", label:"50/50"    },
  { key:"cap_only",icon:"👩", label:"Cap seule" },
  { key:"gui_only",icon:"👨", label:"Gui seul"  },
  { key:"custom",  icon:"✏️", label:"Perso"     },
];

// ── Utils ──
const fmt  = n => `${Number(n||0).toFixed(2)} €`;
const gid  = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36);

function computeParts(amt, splitType, capShare, ratio) {
  const a = parseFloat(amt) || 0;
  const r = parseFloat(ratio) || 0.5;
  if(splitType === "prorata")  return [a * r, a * (1 - r)];
  if(splitType === "equal")    return [a / 2, a / 2];
  if(splitType === "cap_only") return [a, 0];
  if(splitType === "gui_only") return [0, a];
  if(splitType === "custom")   { const c = parseFloat(capShare) || 0; return [c, a - c]; }
  return [a * r, a * (1 - r)];
}

// ── CSS ──
const CSS = `
:root { --p: #f43f8a; --s: #8b5cf6; --acc: #10b981; }
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
body { background: #f8fafc; font-family: -apple-system, system-ui, sans-serif; color: #1e293b; }

.app { min-height: 100vh; background: linear-gradient(135deg, #fdf2f8 0%, #eef2ff 100%); padding-bottom: 120px; }
.glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 24px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
.header { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 15px 20px 0; }

.hero-card { text-align: center; padding: 30px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.7); margin-bottom: 20px; }
.hero-amount { font-size: 40px; font-weight: 900; letter-spacing: -1.5px; margin: 10px 0; }
.hero-label { font-size: 11px; font-weight: 800; text-transform: uppercase; opacity: 0.5; letter-spacing: 1px; }

.tab { background: none; border: none; padding: 12px 10px; font-weight: 700; color: #94a3b8; font-size: 11px; border-bottom: 3px solid transparent; transition: 0.3s; }
.tab.on { color: var(--p); border-bottom-color: var(--p); }

.fab { position: fixed; bottom: 30px; right: 20px; width: 64px; height: 64px; background: linear-gradient(135deg, var(--p), #c026d3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; box-shadow: 0 10px 25px rgba(244, 63, 138, 0.4); z-index: 200; cursor: pointer; }

.ov { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); z-index: 300; display: flex; align-items: flex-end; }
.sh { background: white; width: 100%; border-radius: 32px 32px 0 0; padding: 25px; max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

input, select { width: 100%; padding: 14px; border-radius: 14px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 16px; margin-top: 8px; outline: none; }
.chip { padding: 10px 15px; border-radius: 12px; font-size: 12px; font-weight: 700; background: #f1f5f9; color: #64748b; cursor: pointer; border: none; flex: 1; text-align: center; }
.chip.on { background: var(--p); color: white; }

.erow { display: flex; align-items: center; gap: 12px; padding: 15px; border-bottom: 1px solid #f1f5f9; }
.gauge { height: 8px; border-radius: 10px; background: #eee; overflow: hidden; margin-top: 8px; }
.gauge-bar { height: 100%; transition: width 0.8s ease; }

.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 12px 25px; border-radius: 50px; font-weight: 600; z-index: 1000; }
`;

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [envelopes, setEnvelopes] = useState(DEFAULT_ENVELOPES);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [repayments, setRepayments] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [showSet, setShowSet] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  
  const [expForm, setExpForm] = useState({ label: "", amount: "", envelopeId: "", paidBy: "cap", splitType: "prorata", capShare: "", date: new Date().toISOString().slice(0, 10) });
  const [setForm, setSetForm] = useState({ ...DEFAULT_SETTINGS });

  const API_URL = "https://tfrezncozblmfctwgayo.supabase.co/rest/v1/kv_store";
  const HEADERS = { "Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY" };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}?select=*`, { headers: HEADERS });
        const data = await res.json();
        data.forEach(d => {
          if (d.id === SK.exp) setExpenses(JSON.parse(d.value));
          if (d.id === SK.env) setEnvelopes(JSON.parse(d.value));
          if (d.id === SK.rep) setRepayments(JSON.parse(d.value));
          if (d.id === SK.set) { 
            const s = JSON.parse(d.value);
            setSettings(s); setSetForm(s);
          }
        });
        setLoaded(true);
      } catch (e) { setLoaded(true); }
    }
    load();
  }, []);

  const persist = async (key, val) => {
    await fetch(API_URL, { method: "POST", headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify({ id: key, value: JSON.stringify(val) }) });
  };

  // ── Logic (Moteur de calcul complet) ──
  const ratio = settings.ratioCap / 100;
  const filtExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const filtRep = repayments.filter(r => (r.month !== undefined ? r.month === filterMonth && r.year === filterYear : new Date(r.date).getMonth() === filterMonth));

  const capSpent = filtExp.reduce((a, e) => a + e.capPart, 0);
  const guiSpent = filtExp.reduce((a, e) => a + e.guiPart, 0);
  const rawDebt = filtExp.reduce((a, e) => a + (e.balance || 0), 0);
  const netDebt = rawDebt - filtRep.reduce((a, r) => a + r.amount, 0);

  const saveExp = () => {
    const amt = parseFloat(expForm.amount);
    if (!expForm.label || !amt) return;
    const [cp, gp] = computeParts(amt, expForm.splitType, expForm.capShare, ratio);
    const exp = { ...expForm, id: gid(), amount: amt, capPart: cp, guiPart: gp, balance: expForm.paidBy === "cap" ? gp : -cp };
    const next = [exp, ...expenses];
    setExpenses(next); persist(SK.exp, next);
    setShowAdd(false);
  };

  const handleMarkRepaid = () => {
    const newRep = { id: gid(), amount: netDebt, month: filterMonth, year: filterYear, date: new Date().toISOString().slice(0, 10) };
    const next = [newRep, ...repayments];
    setRepayments(next); persist(SK.rep, next);
  };

  if (!loaded) return <div style={{textAlign:'center', padding:50}}>Chargement...</div>;

  return (
    <div className="app">
      <style>{CSS}</style>

      <div className="header">
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <div style={{ fontWeight: 900, fontSize: 22 }}>💸 Budget</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="bg2" onClick={() => setFilterMonth(m => m === 0 ? 11 : m - 1)}>‹</button>
              <span style={{ fontWeight: 800 }}>{MSHT[filterMonth]} {filterYear}</span>
              <button className="bg2" onClick={() => setFilterMonth(m => m === 11 ? 0 : m + 1)}>›</button>
              <button className="bg2" onClick={() => setShowSet(true)}>⚙️</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 15 }}>
            {["dashboard", "balance", "envelopes", "stats"].map(k => (
              <button key={k} className={`tab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{k.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
        {tab === "dashboard" && (
          <>
            <div className="hero-card" style={{ 
                background: Math.abs(netDebt) < 1 ? "#ecfdf5" : netDebt > 0 ? "#fff1f2" : "#f5f3ff",
                borderColor: Math.abs(netDebt) < 1 ? "#10b981" : netDebt > 0 ? "#fb7185" : "#a78bfa"
            }}>
              <div className="hero-label">{Math.abs(netDebt) < 1 ? "Équilibre parfait" : netDebt > 0 ? `${settings.names[1]} doit à ${settings.names[0]}` : `${settings.names[0]} doit à ${settings.names[1]}`}</div>
              <div className="hero-amount" style={{ color: Math.abs(netDebt) < 1 ? "#059669" : netDebt > 0 ? "#e11d48" : "#7c3aed" }}>{fmt(Math.abs(netDebt))}</div>
              {Math.abs(netDebt) > 1 && <button className="btn bg2" style={{borderRadius:20, fontWeight:800}} onClick={handleMarkRepaid}>Régler la dette</button>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
              <div className="glass" style={{ padding: 15 }}>
                <div className="hero-label">Part {settings.names[0]}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: var(--p) }}>{fmt(capSpent)}</div>
              </div>
              <div className="glass" style={{ padding: 15 }}>
                <div className="hero-label">Part {settings.names[1]}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: var(--s) }}>{fmt(guiSpent)}</div>
              </div>
            </div>

            <div className="hero-label" style={{marginBottom:10}}>Enveloppes Communes</div>
            {envelopes.filter(e => e.owner === "shared").map(env => {
              const spent = filtExp.filter(e => e.envelopeId === env.id).reduce((a, b) => a + b.amount, 0);
              const pct = env.budget ? Math.min(100, (spent / env.budget) * 100) : 0;
              return (
                <div key={env.id} className="glass" style={{ marginBottom: 12, padding: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{env.emoji} {env.name}</span>
                    <span>{fmt(spent)}</span>
                  </div>
                  <div className="gauge"><div className="gauge-bar" style={{ width: `${pct}%`, background: env.color }}></div></div>
                </div>
              );
            })}
          </>
        )}

        {tab === "balance" && (
           <div className="glass">
              {filtExp.map(e => (
                <div key={e.id} className="erow">
                   <div style={{flex:1}}>
                      <div style={{fontWeight:700}}>{e.label}</div>
                      <div style={{fontSize:11, opacity:0.5}}>{e.paidBy === "cap" ? settings.names[0] : settings.names[1]} • {e.splitType}</div>
                   </div>
                   <div style={{fontWeight:900}}>{fmt(e.amount)}</div>
                </div>
              ))}
           </div>
        )}
      </div>

      <div className="fab" onClick={() => setShowAdd(true)}>+</div>

      {/* MODALE AJOUT (RETOUR DU SPLIT TYPE) */}
      {showAdd && (
        <div className="ov" onClick={() => setShowAdd(false)}>
          <div className="sh" onClick={e => e.stopPropagation()}>
            <div style={{fontWeight:900, fontSize:20, marginBottom:20}}>Nouvelle dépense</div>
            <input placeholder="Libellé" value={expForm.label} onChange={e => setExpForm({...expForm, label: e.target.value})} />
            <input type="number" placeholder="Montant €" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} style={{marginTop:12}} />
            
            <label className="hero-label" style={{display:'block', marginTop:15}}>Enveloppe</label>
            <select value={expForm.envelopeId} onChange={e => setExpForm({...expForm, envelopeId: e.target.value})}>
              <option value="">Choisir...</option>
              {envelopes.map(env => <option key={env.id} value={env.id}>{env.emoji} {env.name}</option>)}
            </select>

            <label className="hero-label" style={{display:'block', marginTop:15}}>Payé par</label>
            <div style={{display:'flex', gap:10, marginTop:8}}>
              <button className={`chip ${expForm.paidBy === "cap" ? "on" : ""}`} onClick={() => setExpForm({...expForm, paidBy: "cap"})}>{settings.names[0]}</button>
              <button className={`chip ${expForm.paidBy === "gui" ? "on" : ""}`} onClick={() => setExpForm({...expForm, paidBy: "gui"})}>{settings.names[1]}</button>
            </div>

            <label className="hero-label" style={{display:'block', marginTop:15}}>Répartition</label>
            <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:8}}>
              {SPLIT_OPTS.map(o => (
                <button key={o.key} className={`chip ${expForm.splitType === o.key ? "on" : ""}`} onClick={() => setExpForm({...expForm, splitType: o.key})}>
                  {o.icon} {o.label}
                </button>
              ))}
            </div>

            <button className="btn bp" style={{marginTop:25}} onClick={saveExp}>Confirmer</button>
          </div>
        </div>
      )}

      {/* MODALE RÉGLAGES (AJUSTEMENT PRORATA) */}
      {showSet && (
        <div className="ov" onClick={() => setShowSet(false)}>
          <div className="sh" onClick={e => e.stopPropagation()}>
            <div style={{fontWeight:900, fontSize:20, marginBottom:20}}>Réglages</div>
            <label className="hero-label">Ratio {settings.names[0]} (%)</label>
            <input type="number" value={setForm.ratioCap} onChange={e => setSetForm({...setForm, ratioCap: e.target.value})} />
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:15}}>
              <div>
                <label className="hero-label">Salaire {settings.names[0]}</label>
                <input type="number" value={setForm.salCap} onChange={e => setSetForm({...setForm, salCap: e.target.value})} />
              </div>
              <div>
                <label className="hero-label">Salaire {settings.names[1]}</label>
                <input type="number" value={setForm.salGui} onChange={e => setSetForm({...setForm, salGui: e.target.value})} />
              </div>
            </div>

            <button className="btn bp" style={{marginTop:25}} onClick={() => { setSettings(setForm); persist(SK.set, setForm); setShowSet(false); }}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  );
}
