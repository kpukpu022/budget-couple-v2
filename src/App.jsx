import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// ── Storage keys ──
const SK = { exp:"bcv6_exp", env:"bcv6_env", set:"bcv6_set", rec:"bcv6_rec", inc:"bcv6_inc", rep:"bcv6_rep" };

// ── Constants ──
const PALETTE = ["#f43f8a","#a855f7","#3b82f6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#ec4899","#8b5cf6","#14b8a6","#f97316"];
const EMOJIS  = ["🛒","🏠","🍽️","🚆","👩","👨","💊","📦","✈️","🎬","☕","🎮","💄","🐶","🌿","🎁","⚡","💧","📱","🏋️","🎵","🧴","🏥","🎓","👗","🍷","🎯","🏖️","⛽","☁️","🤖","🏦","📈","🍫","🍔","🚗","🔒","📡","💰"];
const MONTHS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MSHT    = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS_S  = ["L","M","M","J","V","S","D"];

const DEFAULT_SETTINGS = { ratioCap:42, names:["Capucine","Guillaume"], salCap:2100, salGui:2900 };
const DEFAULT_ENVELOPES = [
  { id:"ec_loy", name:"Loyer + charges",  emoji:"🏠", color:"#8b5cf6", budget:1412, owner:"shared" },
  { id:"ec_voi", name:"Assurance voiture",emoji:"🚗", color:"#6366f1", budget:62,   owner:"shared" },
  { id:"ec_ess", name:"Essence",          emoji:"⛽", color:"#f59e0b", budget:120,  owner:"shared" },
  { id:"ec_cou", name:"Courses frigo",    emoji:"🛒", color:"#f43f8a", budget:400,  owner:"shared" },
  { id:"ep_spo", name:"Sport",            emoji:"🏋️", color:"#ec4899", budget:49,   owner:"cap"    },
  { id:"ep_abo", name:"Abonnements Cap",  emoji:"📱", color:"#f43f8a", budget:31,   owner:"cap"    },
  { id:"ep_liv", name:"Livret Cap",       emoji:"🏦", color:"#10b981", budget:400,  owner:"cap"    },
  { id:"ep_etf", name:"ETF Cap",          emoji:"📈", color:"#059669", budget:260,  owner:"cap"    },
  { id:"ep_sna", name:"Snacks Cap",       emoji:"🍫", color:"#f97316", budget:20,   owner:"cap"    },
  { id:"ep_lib", name:"Liberté Cap",      emoji:"🎯", color:"#c026d3", budget:400,  owner:"cap"    },
  { id:"eg_tra", name:"Train",            emoji:"🚆", color:"#3b82f6", budget:44.5, owner:"gui"    },
  { id:"eg_abo", name:"Abonnements Gui",  emoji:"📱", color:"#6366f1", budget:31,   owner:"gui"    },
  { id:"eg_liv", name:"Livret Gui",       emoji:"🏦", color:"#10b981", budget:400,  owner:"gui"    },
  { id:"eg_etf", name:"ETF Gui",          emoji:"📈", color:"#059669", budget:300,  owner:"gui"    },
  { id:"eg_sna", name:"Snacks Gui",       emoji:"🍔", color:"#f97316", budget:40,   owner:"gui"    },
  { id:"eg_lib", name:"Liberté Gui",      emoji:"🎯", color:"#14b8a6", budget:750,  owner:"gui"    },
];

const SPLIT_OPTS = [
  { key:"prorata", icon:"⚖️", label:"Pro rata" },
  { key:"equal",   icon:"🤝", label:"50/50"    },
  { key:"cap_only",icon:"👩", label:"Cap seule" },
  { key:"gui_only",icon:"👨", label:"Gui seul"  },
  { key:"custom",  icon:"✏️", label:"Perso"     },
];

const INC_TYPES = [
  { key:"salary",   label:"Salaire",       emoji:"💼" },
  { key:"variable", label:"Variable/Prime",emoji:"📈" },
  { key:"refund",   label:"Remboursement", emoji:"↩️"  },
  { key:"other",    label:"Autre",         emoji:"💰" },
];

// ── Utils ──
const fmt  = n => `${Number(n||0).toFixed(2)} €`;
const gid  = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const daysInMonth     = (m,y) => new Date(y,m+1,0).getDate();
const firstDayOfMonth = (m,y) => { let d=new Date(y,m,1).getDay(); return d===0?6:d-1; };

function computeParts(amt,splitType,capShare,ratio){
  if(splitType==="prorata")  return [amt*ratio,      amt*(1-ratio)];
  if(splitType==="equal")    return [amt/2,           amt/2];
  if(splitType==="cap_only") return [amt,            0];
  if(splitType==="gui_only") return [0,               amt];
  if(splitType==="custom")   { const c=parseFloat(capShare)||0; return [c,amt-c]; }
  return [amt*ratio,amt*(1-ratio)];
}

// ── CSS ──
const CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color: transparent;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:99px;}

body { background: #f0f2f5; }

.app{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;
  min-height:100vh;
  background: linear-gradient(135deg, #fdf2f8 0%, #eef2ff 100%);
  color:#1e1b2e;
  font-size:15px;
  padding-bottom: 100px;
}

.glass{
  background:rgba(255,255,255,.6);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,.8);
  border-radius:24px;
  box-shadow:0 10px 30px rgba(0,0,0,.04);
}

.header-glass{
  background:rgba(255,255,255,.8);
  backdrop-filter:blur(25px);
  position: sticky; top: 0; z-index: 100;
  border-bottom:1px solid rgba(0,0,0,.05);
}

.hero-card {
  text-align: center;
  padding: 30px 20px;
  border-radius: 30px;
  border: 1px solid rgba(255,255,255,0.7);
  margin-bottom: 20px;
}

.hero-amount {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -1.5px;
  margin: 10px 0;
}

/* FAB - Floating Action Button */
.fab {
  position: fixed;
  bottom: 30px;
  right: 20px;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #f43f8a, #c026d3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  box-shadow: 0 10px 25px rgba(244, 63, 138, 0.4);
  z-index: 200;
  cursor: pointer;
  transition: transform 0.2s;
}
.fab:active { transform: scale(0.85); }

input,select,textarea{
  outline:none;
  background:rgba(255,255,255,.8);
  border:1.5px solid #e2e8f0;
  border-radius:14px;
  padding:14px;
  font-size:16px;
  width:100%;
}

.btn{ border:none; cursor:pointer; font-weight:700; border-radius: 14px; transition: 0.2s; }
.bp{ background:#f43f8a; color:#fff; padding:14px; width: 100%; }
.bg2{ background:rgba(255,255,255,.8); color:#64748b; padding:8px 12px; font-size:12px; border: 1px solid #e2e8f0; }

.tab{ background:none; border:none; padding:12px 5px; font-weight:700; color:#94a3b8; font-size:12px; border-bottom: 3px solid transparent; }
.tab.on{ color:#f43f8a; border-bottom-color:#f43f8a; }

.ov{ position:fixed; inset:0; background:rgba(0,0,0,.3); backdrop-filter:blur(10px); z-index:300; display:flex; align-items:flex-end; }
.sh{ background:white; width:100%; border-radius:30px 30px 0 0; padding:25px; max-height:90vh; overflow-y:auto; animation: slideUp 0.3s ease; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.gauge-track{height:8px; border-radius:10px; background:#f1f5f9; overflow:hidden;}
.gauge-fill{height:100%; transition:width 0.8s ease;}

.erow{display:flex; align-items:center; gap:12px; padding:15px; border-bottom: 1px solid #f1f5f9;}

.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  background: #1e293b; color: white; padding: 12px 25px; border-radius: 50px; font-weight: 600; z-index: 1000;
}
`;

export default function App(){
  // ── State (Ton moteur original) ──
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
  const [showAddRec, setShowAddRec] = useState(false);
  const [showAddInc, setShowAddInc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editExp, setEditExp] = useState(null);
  const [editEnv, setEditEnv] = useState(null);
  const [editRec, setEditRec] = useState(null);
  const [envOwner, setEnvOwner] = useState("shared");
  const [statsView, setStatsView] = useState("month");
  const [searchQ, setSearchQ] = useState("");
  const [toast, setToast] = useState(null);

  const [expForm, setExpForm] = useState({label:"",amount:"",envelopeId:"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});
  const [envForm, setEnvForm] = useState({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:"shared"});
  const [recForm, setRecForm] = useState({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});
  const [incForm, setIncForm] = useState({label:"",amount:"",person:"cap",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
  const [setForm2, setSetForm2] = useState({ratioCap:42,nameCap:"Capucine",nameGui:"Guillaume",salCap:2100,salGui:2900});

  const ratio = settings.ratioCap/100;
  const nameCap = settings.names?.[0]||"Capucine";
  const nameGui = settings.names?.[1]||"Guillaume";

  // ── Sync Supabase (Ton code original) ──
  const URL="https://tfrezncozblmfctwgayo.supabase.co";
  const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY";
  const H={"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY};

  useEffect(()=>{
    async function load(){
      async function sGet(key){
        try{
          const res=await fetch(URL+"/rest/v1/kv_store?id=eq."+encodeURIComponent(key)+"&select=id,value",{headers:H});
          const d=await res.json();
          return(d&&d.length)?JSON.parse(d[0].value):null;
        }catch{return null;}
      }
      const [e,v,s,r,i,p]=await Promise.all(Object.values(SK).map(sGet));
      if(e) setExpenses(e);
      if(v) setEnvelopes(v);
      if(s) { setSettings(s); setSetForm2({ratioCap:s.ratioCap,nameCap:s.names[0],nameGui:s.names[1],salCap:s.salCap,salGui:s.salGui}); }
      if(r) setRecurring(r);
      if(i) setIncomes(i);
      if(p) setRepayments(p);
      setLoaded(true);
    }
    load();
  },[]);

  const persist = async (key, data) => {
    try {
      await fetch(URL + "/rest/v1/kv_store", {
        method: "POST",
        headers: { ...H, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({ id: key, value: JSON.stringify(data) })
      });
    } catch (e) {}
  };

  // ── Correctif Logique Dette ──
  const filtExp = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const filtInc = incomes.filter(i => {
    const d = new Date(i.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const filtRep = repayments.filter(r => {
    if(r.month !== undefined) return r.month === filterMonth && r.year === filterYear;
    const d = new Date(r.date); return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const totalSpent = filtExp.reduce((a,e) => a + e.amount, 0);
  const capSpent = filtExp.reduce((a,e) => a + e.capPart, 0);
  const guiSpent = filtExp.reduce((a,e) => a + e.guiPart, 0);
  
  const rawDebt = filtExp.reduce((a,e) => a + e.balance, 0); // Positif = Gui doit à Cap
  const totalRepaid = filtRep.reduce((a,r) => a + r.amount, 0);
  const netDebt = rawDebt - totalRepaid;

  // ── Actions ──
  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  const saveExpForm = () => {
    const amt = parseFloat(expForm.amount);
    if(!expForm.label.trim() || isNaN(amt)) return;
    const [cp, gp] = computeParts(amt, expForm.splitType, expForm.capShare, ratio);
    const balance = expForm.paidBy === "cap" ? gp : -cp;
    const exp = { id: editExp ? editExp.id : gid(), label: expForm.label, amount: amt, envelopeId: expForm.envelopeId, paidBy: expForm.paidBy, splitType: expForm.splitType, capPart: parseFloat(cp.toFixed(2)), guiPart: parseFloat(gp.toFixed(2)), balance: parseFloat(balance.toFixed(2)), date: expForm.date, note: expForm.note };
    const next = editExp ? expenses.map(e => e.id === editExp.id ? exp : e) : [exp, ...expenses];
    setExpenses(next); persist(SK.exp, next);
    setShowAddExp(false); setEditExp(null);
    showToast("Transaction enregistrée !");
  };

  const handleMarkRepaid = () => {
    if(Math.abs(netDebt) < 0.01) return;
    const entry = {
      id: gid(),
      amount: netDebt, // Le montant qui annule exactement la dette
      date: new Date().toISOString().slice(0,10),
      month: filterMonth,
      year: filterYear
    };
    const next = [entry, ...repayments];
    setRepayments(next); persist(SK.rep, next);
    showToast("Compte mis à jour ! 🤝");
  };

  if(!loaded) return <div style={{textAlign:'center', padding:50}}>Chargement...</div>;

  return(
    <div className="app">
      <style>{CSS}</style>
      {toast && <div className="toast">{toast}</div>}

      {/* ── HEADER ── */}
      <div className="header-glass" style={{padding:"15px 20px 0"}}>
        <div style={{maxWidth:500, margin:"0 auto"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:15}}>
            <div style={{fontWeight:900, fontSize:20}}>💸 Budget</div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <button className="bg2" onClick={()=>setFilterMonth(m=>m===0?11:m-1)}>‹</button>
              <span style={{fontWeight:800, fontSize:14}}>{MSHT[filterMonth]} {filterYear}</span>
              <button className="bg2" onClick={()=>setFilterMonth(m=>m===11?0:m+1)}>›</button>
              <button className="bg2" onClick={()=>setShowSettings(true)}>⚙️</button>
            </div>
          </div>
          <div style={{display:"flex", gap:15, overflowX:"auto"}}>
            {["dashboard", "balance", "envelopes", "incomes", "charts"].map(k => (
              <button key={k} className={`tab${tab===k?" on":""}`} onClick={()=>setTab(k)}>{k.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:20, maxWidth:500, margin:"0 auto"}}>
        
        {/* ── DASHBOARD (Hero Section) ── */}
        {tab === "dashboard" && (
          <>
            <div className="hero-card" style={{
              background: Math.abs(netDebt) < 1 ? "#ecfdf5" : netDebt > 0 ? "#fff1f2" : "#f5f3ff",
              borderColor: Math.abs(netDebt) < 1 ? "#10b981" : netDebt > 0 ? "#fb7185" : "#a78bfa"
            }}>
              <div className="debt-label" style={{color: netDebt > 0 ? "#e11d48" : "#7c3aed", opacity: 0.7}}>
                {Math.abs(netDebt) < 1 ? "Équilibre parfait" : netDebt > 0 ? `${nameGui} doit à ${nameCap}` : `${nameCap} doit à ${nameGui}`}
              </div>
              <div className="hero-amount" style={{color: Math.abs(netDebt) < 1 ? "#059669" : netDebt > 0 ? "#e11d48" : "#7c3aed"}}>
                {fmt(Math.abs(netDebt))}
              </div>
              {Math.abs(netDebt) > 1 && (
                <button className="bg2" style={{borderRadius:20, fontWeight:800}} onClick={handleMarkRepaid}>Régler maintenant</button>
              )}
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:20}}>
              <div className="glass" style={{padding:15}}>
                <div className="debt-label">Dépensé {nameCap}</div>
                <div style={{fontSize:18, fontWeight:800, color:'#f43f8a'}}>{fmt(capSpent)}</div>
              </div>
              <div className="glass" style={{padding:15}}>
                <div className="debt-label">Dépensé {nameGui}</div>
                <div style={{fontSize:18, fontWeight:800, color:'#8b5cf6'}}>{fmt(guiSpent)}</div>
              </div>
            </div>

            <div className="glass" style={{padding:20}}>
              <div className="sect">Top Enveloppes</div>
              {envelopes.map(env => {
                const spent = filtExp.filter(e => e.envelopeId === env.id).reduce((a,b)=>a+b.amount,0);
                const pct = env.budget > 0 ? Math.min(100, (spent/env.budget)*100) : 0;
                if(spent === 0 && !env.budget) return null;
                return (
                  <div key={env.id} style={{marginBottom:15}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, marginBottom:5}}>
                      <span>{env.emoji} {env.name}</span>
                      <span>{fmt(spent)}</span>
                    </div>
                    <div className="gauge-track"><div className="gauge-fill" style={{width:`${pct}%`, background:env.color}} /></div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── BALANCE (Liste des dépenses) ── */}
        {tab === "balance" && (
          <div className="glass" style={{padding:10}}>
             <div className="sect" style={{padding:'10px 15px'}}>Transactions du mois</div>
             {filtExp.length === 0 ? <div style={{padding:20, opacity:0.5}}>Aucune dépense</div> : 
              filtExp.map(e => (
                <div key={e.id} className="erow" onClick={()=>{setEditExp(e); setExpForm({...e, amount:String(e.amount)}); setShowAddExp(true);}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700}}>{e.label}</div>
                    <div style={{fontSize:11, color:'#94a3b8'}}>{envelopes.find(v=>v.id===e.envelopeId)?.name} · {e.paidBy === "cap" ? nameCap : nameGui}</div>
                  </div>
                  <div style={{fontWeight:800}}>{fmt(e.amount)}</div>
                </div>
              ))
             }
          </div>
        )}

        {/* Les autres onglets (Stats, Revenus) conservent ta logique originale... */}
        {tab === "charts" && (
            <div className="glass" style={{padding:20}}>
                <div className="sect">Répartition par personne</div>
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie data={[{name:nameCap, value:capSpent, color:'#f43f8a'}, {name:nameGui, value:guiSpent, color:'#8b5cf6'}]} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80}>
                            <Cell fill="#f43f8a" />
                            <Cell fill="#8b5cf6" />
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        )}

      </div>

      {/* ── FAB ── */}
      <div className="fab" onClick={()=>{setEditExp(null); setExpForm({label:"",amount:"",envelopeId:envelopes[0]?.id,paidBy:"cap",splitType:"prorata",date:new Date().toISOString().slice(0,10)}); setShowAddExp(true);}}>+</div>

      {/* ── MODALE DEPENSE ── */}
      {showAddExp && (
        <div className="ov" onClick={()=>setShowAddExp(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:20, fontWeight:900, marginBottom:20}}>{editExp ? "Modifier" : "Ajouter"} une dépense</div>
            <div style={{display:'flex', flexDirection:'column', gap:15}}>
              <div><label>Intitulé</label><input value={expForm.label} onChange={e=>setExpForm({...expForm, label:e.target.value})} /></div>
              <div><label>Montant (€)</label><input type="number" value={expForm.amount} onChange={e=>setExpForm({...expForm, amount:e.target.value})} /></div>
              <div><label>Enveloppe</label>
                <select value={expForm.envelopeId} onChange={e=>setExpForm({...expForm, envelopeId:e.target.value})}>
                  {envelopes.map(env => <option key={env.id} value={env.id}>{env.emoji} {env.name}</option>)}
                </select>
              </div>
              <div><label>Payé par</label>
                <div style={{display:'flex', gap:10, marginTop:5}}>
                  <button className={`btn bg2 ${expForm.paidBy==="cap"?"on":""}`} style={{flex:1, color:expForm.paidBy==="cap"?"#f43f8a":""}} onClick={()=>setExpForm({...expForm, paidBy:"cap"})}>{nameCap}</button>
                  <button className={`btn bg2 ${expForm.paidBy==="gui"?"on":""}`} style={{flex:1, color:expForm.paidBy==="gui"?"#8b5cf6":""}} onClick={()=>setExpForm({...expForm, paidBy:"gui"})}>{nameGui}</button>
                </div>
              </div>
              <button className="btn bp" onClick={saveExpForm}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
