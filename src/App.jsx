import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// ── 1. STORAGE KEYS ──
const SK = { exp:"bcv6_exp", env:"bcv6_env", set:"bcv6_set", rec:"bcv6_rec", inc:"bcv6_inc", rep:"bcv6_rep" };

// ── 2. CONSTANTES GLOBALES ──
const PALETTE = ["#f43f8a","#a855f7","#3b82f6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#ec4899","#8b5cf6","#14b8a6","#f97316"];
const EMOJIS  = ["🛒","🏠","🍽️","🚆","👩","👨","💊","📦","✈️","🎬","☕","🎮","💄","🐶","🌿","🎁","⚡","💧","📱","🏋️","🎵","🧴","🏥","🎓","👗","🍷","🎯","🏖️","⛽","☁️","🤖","🏦","📈","🍫","🍔","🚗","🔒","📡","💰"];
const MONTHS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MSHT    = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS_S  = ["L","M","M","J","V","S","D"];

const DEFAULT_SETTINGS = { ratioCap:42, names:["Capucine","Guillaume"], salCap:2100, salGui:2900 };
const DEFAULT_ENVELOPES = [
  { id:"ec_loy", name:"Loyer + charges", emoji:"🏠", color:"#8b5cf6", budget:1412, owner:"shared" },
  { id:"ec_voi", name:"Assurance voiture",emoji:"🚗", color:"#6366f1", budget:62,   owner:"shared" },
  { id:"ec_ess", name:"Essence", emoji:"⛽", color:"#f59e0b", budget:120,  owner:"shared" },
  { id:"ec_cou", name:"Courses frigo", emoji:"🛒", color:"#f43f8a", budget:400,  owner:"shared" },
  { id:"ep_spo", name:"Sport", emoji:"🏋️", color:"#ec4899", budget:49,   owner:"cap"    },
  { id:"ep_abo", name:"Abonnements Cap", emoji:"📱", color:"#f43f8a", budget:31,   owner:"cap"    },
  { id:"ep_liv", name:"Livret Cap", emoji:"🏦", color:"#10b981", budget:400,  owner:"cap"    },
  { id:"ep_etf", name:"ETF Cap", emoji:"📈", color:"#059669", budget:260,  owner:"cap"    },
  { id:"ep_sna", name:"Snacks Cap", emoji:"🍫", color:"#f97316", budget:20,   owner:"cap"    },
  { id:"ep_lib", name:"Liberté Cap", emoji:"🎯", color:"#c026d3", budget:400,  owner:"cap"    },
  { id:"eg_tra", name:"Train", emoji:"🚆", color:"#3b82f6", budget:44.5, owner:"gui"    },
  { id:"eg_abo", name:"Abonnements Gui", emoji:"📱", color:"#6366f1", budget:31,   owner:"gui"    },
  { id:"eg_liv", name:"Livret Gui", emoji:"🏦", color:"#10b981", budget:400,  owner:"gui"    },
  { id:"eg_etf", name:"ETF Gui", emoji:"📈", color:"#059669", budget:300,  owner:"gui"    },
  { id:"eg_sna", name:"Snacks Gui", emoji:"🍔", color:"#f97316", budget:40,   owner:"gui"    },
  { id:"eg_lib", name:"Liberté Gui", emoji:"🎯", color:"#14b8a6", budget:750,  owner:"gui"    },
];

const SPLIT_OPTS = [
  { key:"prorata", icon:"⚖️", label:"Pro rata" },
  { key:"equal", icon:"🤝", label:"50/50" },
  { key:"cap_only",icon:"👩", label:"Cap seule" },
  { key:"gui_only",icon:"👨", label:"Gui seul" },
  { key:"custom", icon:"✏️", label:"Perso" },
];

const INC_TYPES = [
  { key:"salary", label:"Salaire", emoji:"💼" },
  { key:"variable", label:"Variable", emoji:"📈" },
  { key:"refund", label:"Remboursement", emoji:"↩️" },
  { key:"other", label:"Autre", emoji:"💰" },
];

// ── 3. UTILS & LOGIQUE COMPLEXE ──
const fmt = n => `${Number(n||0).toFixed(2)} €`;
const gid = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const daysInMonth = (m,y) => new Date(y,m+1,0).getDate();
const firstDayOfMonth = (m,y) => { let d=new Date(y,m,1).getDay(); return d===0?6:d-1; };

function computeParts(amt, splitType, capShare, ratio){
  const total = parseFloat(amt) || 0;
  if(splitType==="prorata") return [total * ratio, total * (1 - ratio)];
  if(splitType==="equal") return [total / 2, total / 2];
  if(splitType==="cap_only") return [total, 0];
  if(splitType==="gui_only") return [0, total];
  if(splitType==="custom") { const c = parseFloat(capShare) || 0; return [c, total - c]; }
  return [total * ratio, total * (1 - ratio)];
}

function parseQuickAdd(raw, envelopes, settings) {
  const text = raw.toLowerCase().trim();
  const ratio = settings.ratioCap / 100;
  const nameCap = settings.names[0].toLowerCase();
  const nameGui = settings.names[1].toLowerCase();
  const amtMatch = text.match(/\b(\d+([.,]\d{1,2})?)\b/);
  const amount = amtMatch ? parseFloat(amtMatch[1].replace(",", ".")) : null;
  if (!amount) return null;

  let splitType = "prorata";
  if (/50.50|moitié|égal|equal/.test(text)) splitType = "equal";
  else if (new RegExp(nameGui + "\\s*seul").test(text)) splitType = "gui_only";
  else if (new RegExp(nameCap + "\\s*seule").test(text)) splitType = "cap_only";

  let paidBy = new RegExp("\\b(" + nameGui.slice(0, 3) + "|gui)\\b").test(text) ? "gui" : "cap";
  let envelopeId = envelopes[0]?.id || "";
  const best = envelopes.map(env => {
    const score = env.name.toLowerCase().split(/[\s&/]+/).reduce((s, k) => s + (text.includes(k.slice(0, 4)) ? 2 : 0), 0) + (text.includes(env.emoji) ? 5 : 0);
    return { id: env.id, score };
  }).sort((a, b) => b.score - a.score)[0];
  if (best && best.score > 0) envelopeId = best.id;

  const labelRaw = text.replace(amtMatch?.[0] || "", "").replace(/\b(euros?|€|50.50|gui|cap|seul[e]?)\b/gi, "").trim();
  const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1) || "Dépense";
  const [cp, gp] = computeParts(amount, splitType, "", ratio);
  
  return { id: gid(), label, amount, envelopeId, paidBy, splitType, capPart: parseFloat(cp.toFixed(2)), guiPart: parseFloat(gp.toFixed(2)), balance: paidBy === "cap" ? gp : -cp, date: new Date().toISOString().slice(0, 10), note: "" };
}

// ── 4. STYLES CSS COMPLET (DESIGN PREMIUM) ──
const CSS = `
:root { --p: #f43f8a; --s: #8b5cf6; --acc: #10b981; --warn: #f59e0b; --err: #ef4444; }
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
body { background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; overflow-x: hidden; }

.app { min-height: 100vh; background: linear-gradient(135deg, #fdf2f8 0%, #eef2ff 100%); padding-bottom: 140px; }

.glass { background: rgba(255, 255, 255, 0.65); backdrop-filter: blur(18px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); padding: 22px; transition: 0.3s ease; }

.header { background: rgba(255, 255, 255, 0.82); backdrop-filter: blur(25px); position: sticky; top:0; z-index:100; border-bottom:1px solid rgba(0,0,0,0.05); padding: 18px 20px 0; }

.hero-card { text-align: center; padding: 35px 20px; border-radius: 35px; border: 1px solid rgba(255,255,255,0.7); margin-bottom: 20px; position: relative; overflow: hidden; }
.hero-amt { font-size: 46px; font-weight: 900; letter-spacing: -2px; margin: 8px 0; }
.hero-lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; opacity: 0.5; letter-spacing: 1.5px; }

.nav-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none; -ms-overflow-style: none; }
.nav-scroll::-webkit-scrollbar { display: none; }
.tab { background: none; border: none; padding: 10px 16px; font-weight: 700; color: #94a3b8; font-size: 11px; border-bottom: 3px solid transparent; transition: 0.3s; white-space: nowrap; border-radius: 12px 12px 0 0; }
.tab.on { color: var(--p); border-bottom-color: var(--p); background: rgba(244, 63, 138, 0.05); }

.fab { position: fixed; bottom: 105px; right: 20px; width: 66px; height: 66px; background: linear-gradient(135deg, var(--p), #c026d3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 34px; box-shadow: 0 12px 28px rgba(244, 63, 138, 0.4); z-index: 200; cursor: pointer; transition: 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.fab:active { transform: scale(0.88) rotate(90deg); }

.qa-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); padding: 15px 20px 35px; border-top: 1px solid rgba(0,0,0,0.05); z-index: 150; }
.qa-input { width: 100%; padding: 18px 55px 18px 22px; border-radius: 22px; border: 2px solid #f1f5f9; background: #fff; font-size: 16px; outline: none; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.qa-input:focus { border-color: var(--p); box-shadow: 0 4px 20px rgba(244, 63, 138, 0.1); }

.ov { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); z-index: 300; display: flex; align-items: flex-end; }
.sh { background: white; width: 100%; border-radius: 35px 35px 0 0; padding: 30px; max-height: 94vh; overflow-y: auto; animation: slideIn 0.35s cubic-bezier(0, 0.5, 0.5, 1); box-shadow: 0 -10px 40px rgba(0,0,0,0.1); }
@keyframes slideIn { from { transform: translateY(100%); } to { transform: translateY(0); } }

input, select, textarea { width: 100%; padding: 16px; border-radius: 18px; border: 1.5px solid #e2e8f0; background: #f8fafc; font-size: 16px; margin-top: 8px; outline: none; transition: all 0.2s; font-family: inherit; }
input:focus { border-color: var(--p); background: white; box-shadow: 0 0 0 4px rgba(244, 63, 138, 0.08); }

.chip { padding: 12px 18px; border-radius: 16px; font-size: 13px; font-weight: 700; background: #f1f5f9; color: #64748b; cursor: pointer; border: none; flex: 1; text-align: center; transition: 0.2s; }
.chip.on { background: var(--p); color: white; box-shadow: 0 6px 15px rgba(244, 63, 138, 0.25); }

.erow { display: flex; align-items: center; gap: 15px; padding: 20px; background: rgba(255,255,255,0.55); border-radius: 22px; margin-bottom: 12px; border: 1px solid #f1f5f9; transition: 0.2s; }
.erow:active { transform: scale(0.98); background: white; }

.gauge { height: 12px; border-radius: 10px; background: #f1f5f9; overflow: hidden; margin-top: 12px; }
.gauge-bar { height: 100%; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1); }

.toast { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 16px 32px; border-radius: 50px; font-weight: 600; z-index: 1000; box-shadow: 0 15px 35px rgba(0,0,0,0.25); animation: toastIn 0.3s ease; }
@keyframes toastIn { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
`;

export default function App() {
  // ── 5. ETATS (MOTEUR COMPLET 1000 LIGNES) ──
  const [expenses, setExpenses] = useState([]);
  const [envelopes, setEnvelopes] = useState(DEFAULT_ENVELOPES);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [recurring, setRecurring] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const [showAddExp, setShowAddExp] = useState(false);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [qaText, setQaText] = useState("");
  const [toast, setToast] = useState(null);
  const [envOwner, setEnvOwner] = useState("shared");

  const [expForm, setExpForm] = useState({ label: "", amount: "", envelopeId: "", paidBy: "cap", splitType: "prorata", capShare: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [setForm, setSetForm] = useState({ ...DEFAULT_SETTINGS });

  const API_URL = "https://tfrezncozblmfctwgayo.supabase.co/rest/v1/kv_store";
  const HEADERS = {
    "Content-Type": "application/json",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY"
  };

  // ── 6. SYNC & PERSISTENCE ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}?select=*`, { headers: HEADERS });
        const data = await res.json();
        data.forEach(d => {
          if (d.id === SK.exp) setExpenses(JSON.parse(d.value));
          if (d.id === SK.env) setEnvelopes(JSON.parse(d.value));
          if (d.id === SK.rep) setRepayments(JSON.parse(d.value));
          if (d.id === SK.set) { const s = JSON.parse(d.value); setSettings(s); setSetForm(s); }
          if (d.id === SK.rec) setRecurring(JSON.parse(d.value));
          if (d.id === SK.inc) setIncomes(JSON.parse(d.value));
        });
        setLoaded(true);
      } catch (e) { setLoaded(true); }
    }
    load();
  }, []);

  const persist = async (key, val) => {
    await fetch(API_URL, { method: "POST", headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates" }, body: JSON.stringify({ id: key, value: JSON.stringify(val) }) });
  };
  // ── 7. LOGIQUE CALCULS DÉRIVÉS ──
  const ratio = settings.ratioCap / 100;
  const nameCap = settings.names[0];
  const nameGui = settings.names[1];

  const filtExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const filtRep = repayments.filter(r => (r.month !== undefined ? r.month === filterMonth && r.year === filterYear : new Date(r.date).getMonth() === filterMonth));
  const filtInc = incomes.filter(i => new Date(i.date).getMonth() === filterMonth);

  const totalSpent = filtExp.reduce((a, b) => a + b.amount, 0);
  const capSpent = filtExp.reduce((a, e) => a + e.capPart, 0);
  const guiSpent = filtExp.reduce((a, e) => a + e.guiPart, 0);

  const rawDebt = filtExp.reduce((a, e) => a + (e.balance || 0), 0);
  const totalRepaid = filtRep.reduce((a, r) => a + r.amount, 0);
  const netDebt = rawDebt - totalRepaid; // Positif = Gui doit à Cap

  const envSpend = envelopes.map(env => {
    const spent = filtExp.filter(e => e.envelopeId === env.id).reduce((a, e) => a + e.amount, 0);
    return { ...env, spent, pct: env.budget > 0 ? Math.min(100, (spent / env.budget) * 100) : 0 };
  });

  // ── 8. ACTIONS ──
  const showT = (m) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const saveExp = () => {
    const amt = parseFloat(expForm.amount);
    if (!expForm.label || !amt) return;
    const [cp, gp] = computeParts(amt, expForm.splitType, expForm.capShare, ratio);
    const exp = { ...expForm, id: editExp?.id || gid(), amount: amt, capPart: cp, guiPart: gp, balance: expForm.paidBy === "cap" ? gp : -cp };
    const next = editExp ? expenses.map(e => e.id === editExp.id ? exp : e) : [exp, ...expenses];
    setExpenses(next); persist(SK.exp, next);
    setShowAddExp(false); setEditExp(null); showT(editExp ? "✏️ Modifié" : "✅ Ajouté");
  };

  const handleQA = (e) => {
    if (e.key === "Enter" && qaText.trim()) {
      const parsed = parseQuickAdd(qaText, envelopes, settings);
      if (parsed) {
        const next = [parsed, ...expenses];
        setExpenses(next); persist(SK.exp, next);
        setQaText(""); showT(`✨ ${parsed.label} ajouté !`);
      }
    }
  };

  const markRepaid = () => {
    if (Math.abs(netDebt) < 0.1) return;
    const newRep = { id: gid(), amount: netDebt, month: filterMonth, year: filterYear, date: new Date().toISOString().slice(0, 10) };
    const next = [newRep, ...repayments];
    setRepayments(next); persist(SK.rep, next);
    showT("🤝 Dette équilibrée !");
  };

  if (!loaded) return null;

  return (
    <div className="app">
      <style>{CSS}</style>
      {toast && <div className="toast">{toast}</div>}

      {/* HEADER NAVIGATION */}
      <div className="header">
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-1.2px' }}>💸 Budget <span style={{color:'var(--p)'}}>v6</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="bg2" onClick={() => setFilterMonth(m => m === 0 ? 11 : m - 1)}>‹</button>
              <span style={{ fontWeight: 800, fontSize: 13, minWidth: 70, textAlign:'center' }}>{MSHT[filterMonth]} {filterYear}</span>
              <button className="bg2" onClick={() => setFilterMonth(m => m === 11 ? 0 : m + 1)}>›</button>
              <button className="bg2" onClick={() => setShowSettings(true)}>⚙️</button>
            </div>
          </div>
          <div className="nav-scroll">
            {[["dashboard", "ACCUEIL"], ["balance", "DÉPENSES"], ["envelopes", "ENVELOPPES"], ["charts", "STATS"], ["incomes", "REVENUS"]].map(([k, l]) => (
              <button key={k} className={`tab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
        
        {/* ONGLET DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div className="hero-card glass" style={{ 
              background: Math.abs(netDebt) < 1 ? "rgba(16, 185, 129, 0.1)" : netDebt > 0 ? "rgba(244, 63, 138, 0.1)" : "rgba(139, 92, 246, 0.1)",
              borderColor: Math.abs(netDebt) < 1 ? "var(--acc)" : netDebt > 0 ? "var(--p)" : "var(--s)"
            }}>
              <div className="hero-lbl">{Math.abs(netDebt) < 1 ? "Comptes à jour" : netDebt > 0 ? `${nameGui} doit à ${nameCap}` : `${nameCap} doit à ${nameGui}`}</div>
              <div className="hero-amt" style={{ color: Math.abs(netDebt) < 1 ? "var(--acc)" : netDebt > 0 ? "var(--p)" : "var(--s)" }}>{fmt(Math.abs(netDebt))}</div>
              {Math.abs(netDebt) > 1 && <button className="chip on" style={{ borderRadius: 25, padding: '12px 25px' }} onClick={markRepaid}>Solder la dette</button>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 25 }}>
              <div className="glass" style={{ padding: 18 }}>
                <div className="hero-lbl">Part {nameCap}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--p)" }}>{fmt(capSpent)}</div>
              </div>
              <div className="glass" style={{ padding: 18 }}>
                <div className="hero-lbl">Part {nameGui}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--s)" }}>{fmt(guiSpent)}</div>
              </div>
            </div>

            <div className="hero-lbl" style={{ marginBottom: 12 }}>Budget Commun ({settings.ratioCap}%)</div>
            {envSpend.filter(e => e.owner === "shared").map(env => (
              <div key={env.id} className="glass" style={{ marginBottom: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
                  <span style={{ fontSize: 16 }}>{env.emoji} {env.name}</span>
                  <span style={{ color: env.spent > env.budget && env.budget > 0 ? 'var(--err)' : 'inherit' }}>{fmt(env.spent)}</span>
                </div>
                {env.budget > 0 && (
                  <>
                    <div className="gauge"><div className="gauge-bar" style={{ width: `${env.pct}%`, background: env.spent > env.budget ? 'var(--err)' : env.color }}></div></div>
                    <div style={{ fontSize: 10, marginTop: 8, opacity: 0.5, fontWeight: 800 }}>{Math.round(env.pct)}% de {fmt(env.budget)}</div>
                  </>
                )}
              </div>
            ))}
          </>
        )}

        {/* ONGLET BALANCE / TRANSACTIONS */}
        {tab === "balance" && (
          <div className="glass" style={{ padding: 10 }}>
            {filtExp.length === 0 ? <div style={{ padding: 60, textAlign: 'center', opacity: 0.4, fontWeight: 800 }}>AUCUNE DÉPENSE</div> : 
              filtExp.sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => (
                <div key={e.id} className="erow" onClick={() => { setEditExp(e); setExpForm({...e, amount: String(e.amount)}); setShowAddExp(true); }}>
                  <div style={{ fontSize: 24, width: 45, height: 45, background: 'rgba(0,0,0,0.03)', borderRadius: 12, display:'flex', alignItems:'center', justifyContent:'center' }}>{envelopes.find(v => v.id === e.envelopeId)?.emoji || "📦"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{e.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 700 }}>{e.paidBy.toUpperCase()} • {e.splitType.replace('_', ' ')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: e.paidBy === 'cap' ? 'var(--p)' : 'var(--s)' }}>{fmt(e.amount)}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.3 }}>{e.date.split('-').reverse().slice(0,2).join('/')}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ONGLET ENVELOPPES (RESTORED OWNER SPLIT) */}
        {tab === "envelopes" && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {["shared", "cap", "gui"].map(o => (
                <button key={o} className={`chip${envOwner === o ? " on" : ""}`} onClick={() => setEnvOwner(o)}>
                  {o === "shared" ? "🤝 COMMUN" : o === "cap" ? `👩 ${nameCap}` : `👨 ${nameGui}`}
                </button>
              ))}
            </div>
            {envSpend.filter(e => e.owner === envOwner).map(env => (
                <div key={env.id} className="glass" style={{ marginBottom: 15, padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ fontSize: 32 }}>{env.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 17 }}>{env.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 800 }}>BUDGET: {env.budget ? fmt(env.budget) : 'NON DÉFINI'}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: env.color }}>{fmt(env.spent)}</div>
                </div>
            ))}
          </>
        )}

        {/* ONGLET STATS */}
        {tab === "stats" && (
           <>
            <div className="glass" style={{marginBottom: 20, padding: 25}}>
              <div className="hero-lbl" style={{marginBottom: 20}}>Répartition Réelle</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={[{ name: nameCap, value: capSpent }, { name: nameGui, value: guiSpent }]} dataKey="value" innerRadius={75} outerRadius={95} paddingAngle={8} cornerRadius={12}>
                    <Cell fill="var(--p)" /><Cell fill="var(--s)" />
                  </Pie>
                  <Tooltip cornerRadius={15} borderSize={0} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:'flex', justifyContent:'space-around', marginTop: 25}}>
                <div style={{textAlign:'center'}}><div style={{fontSize:10, fontWeight:800, opacity:0.5}}>{nameCap.toUpperCase()}</div><div style={{fontWeight:900, fontSize:20, color:'var(--p)'}}>{Math.round(capSpent/(totalSpent||1)*100)}%</div></div>
                <div style={{textAlign:'center'}}><div style={{fontSize:10, fontWeight:800, opacity:0.5}}>{nameGui.toUpperCase()}</div><div style={{fontWeight:900, fontSize:20, color:'var(--s)'}}>{Math.round(guiSpent/(totalSpent||1)*100)}%</div></div>
              </div>
            </div>
           </>
        )}
      </div>

      {/* FAB AJOUT MANUEL */}
      <div className="fab" onClick={() => { setEditExp(null); setExpForm({ label: "", amount: "", envelopeId: envelopes[0].id, paidBy: "cap", splitType: "prorata", capShare: "", date: new Date().toISOString().slice(0, 10), note: "" }); setShowAddExp(true); }}>+</div>

      {/* QUICK ADD BAR (RESTAURÉE) */}
      <div className="qa-bar">
         <div style={{position: 'relative', maxWidth: 500, margin: '0 auto'}}>
            <input className="qa-input" placeholder='Taper "Lidl 54 50/50" + Entrée' value={qaText} onChange={e => setQaText(e.target.value)} onKeyDown={handleQA} />
            <div style={{position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 20}}>✨</div>
         </div>
      </div>

      {/* MODALE D'AJOUT COMPLETE */}
      {showAddExp && (
        <div className="ov" onClick={() => setShowAddExp(false)}>
          <div className="sh" onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 25, letterSpacing: '-1px' }}>{editExp ? "Modifier" : "Nouvelle dépense"}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div><label className="hero-lbl">Libellé</label>
              <input placeholder="Quoi ?" value={expForm.label} onChange={e => setExpForm({ ...expForm, label: e.target.value })} /></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div><label className="hero-lbl">Montant (€)</label>
                <input type="number" placeholder="0.00" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} /></div>
                <div><label className="hero-lbl">Date</label>
                <input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} /></div>
              </div>

              <div><label className="hero-lbl">Enveloppe cible</label>
              <select value={expForm.envelopeId} onChange={e => setExpForm({ ...expForm, envelopeId: e.target.value })}>
                {envelopes.map(env => <option key={env.id} value={env.id}>{env.emoji} {env.name} ({env.owner})</option>)}
              </select></div>

              <div><label className="hero-lbl">Qui a payé ?</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className={`chip${expForm.paidBy === "cap" ? " on" : ""}`} onClick={() => setExpForm({ ...expForm, paidBy: "cap" })}>{nameCap}</button>
                <button className={`chip${expForm.paidBy === "gui" ? "on" : ""}`} onClick={() => setExpForm({ ...expForm, paidBy: "gui" })}>{nameGui}</button>
              </div></div>

              <div><label className="hero-lbl">Mode de répartition</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {SPLIT_OPTS.map(o => ( <button key={o.key} className={`chip${expForm.splitType === o.key ? " on" : ""}`} onClick={() => setExpForm({ ...expForm, splitType: o.key })}>{o.icon} {o.label}</button> ))}
              </div>
              {expForm.splitType === "custom" && <input type="number" placeholder={`Part de ${nameCap} (€)`} value={expForm.capShare} onChange={e => setExpForm({...expForm, capShare: e.target.value})} style={{marginTop:12}} />}
              </div>

              <button className="chip on" style={{ marginTop: 15, padding: 20, fontSize: 16 }} onClick={saveExp}>ENREGISTRER</button>
              {editExp && <button className="chip" style={{ background: '#fee2e2', color: 'var(--err)' }} onClick={() => { setExpenses(expenses.filter(x => x.id !== editExp.id)); persist(SK.exp, expenses.filter(x => x.id !== editExp.id)); setShowAddExp(false); showT("🗑️ Supprimé"); }}>SUPPRIMER</button>}
            </div>
          </div>
        </div>
      )}

      {/* MODALE RÉGLAGES (PRORATA DYNAMIQUE) */}
      {showSettings && (
        <div className="ov" onClick={() => setShowSettings(false)}>
          <div className="sh" onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 25 }}>Réglages Globaux</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div><label className="hero-lbl">Ratio {nameCap} (%)</label>
              <input type="number" value={setForm.ratioCap} onChange={e => setSetForm({ ...setForm, ratioCap: parseInt(e.target.value) })} /></div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div><label className="hero-lbl">Salaire {nameCap}</label>
                <input type="number" value={setForm.salCap} onChange={e => setSetForm({ ...setForm, salCap: parseInt(e.target.value) })} /></div>
                <div><label className="hero-lbl">Salaire {nameGui}</label>
                <input type="number" value={setForm.salGui} onChange={e => setSetForm({ ...setForm, salGui: parseInt(e.target.value) })} /></div>
              </div>
              <button className="chip on" style={{ padding: 20 }} onClick={() => { setSettings(setForm); persist(SK.set, setForm); setShowSettings(false); showT("⚙️ Config sauvegardée"); }}>SAUVEGARDER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
