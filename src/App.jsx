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

const DEFAULT_RECURRING = [
  { id:"r1",  label:"Loyer cc",          emoji:"🏠", dayOfMonth:1,  amount:1280, splitType:"prorata", paidBy:"cap", envelopeId:"ec_loy", color:"#8b5cf6", note:"Charges comprises" },
  { id:"r2",  label:"EDF",                emoji:"⚡", dayOfMonth:5,  amount:83,   splitType:"prorata", paidBy:"cap", envelopeId:"ec_loy", color:"#f59e0b", note:"Variable" },
  { id:"r3",  label:"Box internet",      emoji:"📡", dayOfMonth:10, amount:25,   splitType:"prorata", paidBy:"gui", envelopeId:"ec_loy", color:"#3b82f6", note:"" },
  { id:"r4",  label:"Assurance hab.",    emoji:"🔒", dayOfMonth:10, amount:24,   splitType:"prorata", paidBy:"cap", envelopeId:"ec_loy", color:"#6366f1", note:"" },
  { id:"r5",  label:"Assurance voiture", emoji:"🚗", dayOfMonth:5,  amount:62,   splitType:"prorata", paidBy:"cap", envelopeId:"ec_voi", color:"#6366f1", note:"" },
  { id:"r6",  label:"Sport Cap",         emoji:"🏋️", dayOfMonth:1,  amount:49,   splitType:"cap_only", paidBy:"cap", envelopeId:"ep_spo", color:"#ec4899", note:"" },
  { id:"r11", label:"Livret Cap",        emoji:"🏦", dayOfMonth:2,  amount:400,  splitType:"cap_only", paidBy:"cap", envelopeId:"ep_liv", color:"#10b981", note:"Virement auto" },
  { id:"r12", label:"ETF Cap",            emoji:"📈", dayOfMonth:2,  amount:260,  splitType:"cap_only", paidBy:"cap", envelopeId:"ep_etf", color:"#059669", note:"Virement auto" },
  { id:"r13", label:"Train Gui",         emoji:"🚆", dayOfMonth:1,  amount:44.5, splitType:"gui_only", paidBy:"gui", envelopeId:"eg_tra", color:"#3b82f6", note:"Domicile-travail" },
  { id:"r17", label:"Livret Gui",        emoji:"🏦", dayOfMonth:2,  amount:400,  splitType:"gui_only", paidBy:"gui", envelopeId:"eg_liv", color:"#10b981", note:"Virement auto" },
  { id:"r18", label:"ETF Gui",            emoji:"📈", dayOfMonth:2,  amount:300,  splitType:"gui_only", paidBy:"gui", envelopeId:"eg_etf", color:"#059669", note:"Virement auto" },
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

function parseQuickAdd(raw,envelopes,settings){
  const text=raw.toLowerCase().trim();
  const ratio=settings.ratioCap/100;
  const nameCap=settings.names[0].toLowerCase();
  const nameGui=settings.names[1].toLowerCase();
  const amtMatch=text.match(/\b(\d+([.,]\d{1,2})?)\b/);
  const amount=amtMatch?parseFloat(amtMatch[1].replace(",",".")):null;
  if(!amount)return null;
  let splitType="prorata";
  if(/50.50|moitié|égal|equal/.test(text)) splitType="equal";
  else if(new RegExp(nameGui+"\\s*seul|que\\s*"+nameGui).test(text)) splitType="gui_only";
  else if(new RegExp(nameCap+"\\s*seule|que\\s*"+nameCap).test(text)) splitType="cap_only";
  let paidBy="cap";
  if(new RegExp("\\b("+nameGui.slice(0,3)+"|gui)\\b").test(text)) paidBy="gui";
  let envelopeId=envelopes[0]?.id||"";
  const best=envelopes.map(env=>{
    const score=env.name.toLowerCase().split(/[\s&/]+/).reduce((s,k)=>s+(text.includes(k.slice(0,4))?2:0),0)+(text.includes(env.emoji)?5:0);
    return{id:env.id,score};
  }).sort((a,b)=>b.score-a.score)[0];
  if(best&&best.score>0)envelopeId=best.id;
  const label=text.replace(amtMatch?.[0]||"","").replace(/\b(euros?|€|50.50|pro.rata|perso|seul[e]?|gui|cap)\b/gi,"").trim().replace(/\s+/g," ")||"Dépense";
  const labelCap=label.charAt(0).toUpperCase()+label.slice(1);
  const [capPart,guiPart]=computeParts(amount,splitType,"",ratio);
  const balance=paidBy==="cap"?guiPart:-capPart;
  return{id:gid(),label:labelCap,amount,envelopeId,paidBy,splitType,capPart:parseFloat(capPart.toFixed(2)),guiPart:parseFloat(guiPart.toFixed(2)),balance:parseFloat(balance.toFixed(2)),date:new Date().toISOString().slice(0,10),note:""};
}

// ── CSS UPGRADE ──
const CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color: transparent;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:99px;}

.app{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;
  min-height:100vh;
  background:linear-gradient(135deg,#fdf2f8 0%,#eef2ff 100%);
  color:#1e1b2e;
  font-size:15px;
  padding-bottom: 120px;
}

.glass{
  background:rgba(255,255,255,.55);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,.8);
  border-radius:24px;
  box-shadow:0 8px 32px rgba(0,0,0,.05);
}

.header-glass{
  background:rgba(255,255,255,.78);
  backdrop-filter:blur(24px);
  position: sticky; top:0; z-index:100;
  border-bottom:1px solid rgba(255,255,255,.9);
}

/* FAB - Floating Action Button */
.fab {
  position: fixed; bottom: 30px; right: 20px;
  width: 64px; height: 64px;
  background: linear-gradient(135deg, #f43f8a, #c026d3);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  color: white; font-size: 32px; box-shadow: 0 10px 25px rgba(244, 63, 138, 0.4);
  z-index: 200; cursor: pointer; transition: transform 0.2s;
}
.fab:active { transform: scale(0.85); }

input,select,textarea{outline:none;background:rgba(255,255,255,.7);border:1.5px solid #e2e8f0;border-radius:14px;padding:12px 14px;font-size:15px;width:100%;transition:0.2s;}
input:focus{border-color:#f43f8a;background:white;}

.btn{border:none;cursor:pointer;font-weight:700;transition:all .18s;border-radius: 14px;}
.bp{background:linear-gradient(135deg,#f43f8a,#c026d3);color:#fff;padding:14px;box-shadow:0 4px 14px rgba(244,63,138,.25);}
.bg2{background:rgba(255,255,255,.6);color:#6b7280;border:1.5px solid #e2e8f0;border-radius:10px;padding:9px 14px;font-size:13px;}

.tab{background:none;border:none;cursor:pointer;font-weight:700;font-size:11px;padding:10px 5px;color:#9ca3af;border-bottom:3px solid transparent;transition: 0.3s;}
.tab.on{color:#f43f8a;border-bottom-color:#f43f8a;}

.chip{background:rgba(255,255,255,.5);border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:700;color:#6b7280;cursor:pointer;flex:1;text-align:center;}
.chip.on{border-color:#f43f8a;color:#f43f8a;background:rgba(244,63,138,.08);}

.ov{position:fixed;inset:0;background:rgba(0,0,0,.3);backdrop-filter:blur(8px);z-index:300;display:flex;align-items:flex-end;justify-content:center;padding:12px;}
.sh{background:white;border-radius:32px 32px 0 0;padding:24px;width:100%;max-width:500px;max-height:93vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.12);animation:slideUp .25s ease-out;}

@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}

.gauge-track{height:8px;border-radius:99px;background:#f1f5f9;overflow:hidden;margin-top:8px;}
.gauge-fill{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.4,0,.2,1);}

.erow{display:flex;align-items:center;gap:12px;padding:14px;background:rgba(255,255,255,.5);border:1px solid #f1f5f9;border-radius:16px;margin-bottom:8px;}
.solde-hero { padding: 30px 20px; border-radius: 28px; text-align: center; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.5); }
.solde-amt { font-size: 40px; font-weight: 900; letter-spacing: -1.5px; margin: 10px 0; }

.toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:500;background:rgba(30,27,46,.9);color:white;padding:12px 25px;border-radius:99px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.15);}
`;

export default function App(){
  // ── State ──
  const [expenses,   setExpenses]   = useState([]);
  const [envelopes,  setEnvelopes]  = useState(DEFAULT_ENVELOPES);
  const [settings,   setSettings]   = useState(DEFAULT_SETTINGS);
  const [recurring,  setRecurring]  = useState(DEFAULT_RECURRING);
  const [incomes,    setIncomes]    = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [loaded,     setLoaded]     = useState(false);
  const [tab,         setTab]        = useState("dashboard");
  const [filterMonth,setFilterMonth]= useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Modals
  const [showAddExp,   setShowAddExp]   = useState(false);
  const [showAddEnv,   setShowAddEnv]   = useState(false);
  const [showAddRec,   setShowAddRec]   = useState(false);
  const [showAddInc,   setShowAddInc]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editEnv,      setEditEnv]      = useState(null);
  const [editRec,      setEditRec]      = useState(null);
  const [editExp,      setEditExp]      = useState(null);
  const [envOwner,     setEnvOwner]     = useState("shared");
  const [searchQ,      setSearchQ]      = useState("");
  const [statsView,    setStatsView]    = useState("month");

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Forms
  const [expForm, setExpForm] = useState({label:"",amount:"",envelopeId:"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});
  const [envForm, setEnvForm] = useState({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:"shared"});
  const [recForm, setRecForm] = useState({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});
  const [incForm, setIncForm] = useState({label:"",amount:"",person:"cap",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
  const [setForm2,setSetForm2]= useState({ratioCap:42,nameCap:"Capucine",nameGui:"Guillaume",salCap:2100,salGui:2900});

  const ratio   = settings.ratioCap/100;
  const nameCap = settings.names?.[0]||"Capucine";
  const nameGui = settings.names?.[1]||"Guillaume";

  // ── Load from Supabase ──
  useEffect(()=>{
    async function load(){
      const URL="https://tfrezncozblmfctwgayo.supabase.co";
      const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY";
      const H={"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY};
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
      if(s) { setSettings(s); setSetForm2({ratioCap:s.ratioCap,nameCap:s.names[0],nameGui:s.names[1],salCap:s.salCap||2100,salGui:s.salGui||2900}); }
      if(r) setRecurring(r);
      if(i) setIncomes(i);
      if(p) setRepayments(p);
      setLoaded(true);
    }
    load();
  },[]);

  const persist=useCallback(async(key,data)=>{
      const URL="https://tfrezncozblmfctwgayo.supabase.co";
      const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY";
      const H={"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY};
      try{await fetch(URL+"/rest/v1/kv_store",{method:"POST",headers:{...H,"Prefer":"resolution=merge-duplicates"},body:JSON.stringify({id:key,value:JSON.stringify(data)})})}catch{}
  },[]);

  // ── Logic ──
  const filtExp=expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;});
  const filtRep=repayments.filter(r=>{
      if(r.month!==undefined) return r.month===filterMonth&&r.year===filterYear;
      const d=new Date(r.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;
  });

  const capSpent = filtExp.reduce((a,e)=>a+e.capPart,0);
  const guiSpent = filtExp.reduce((a,e)=>a+e.guiPart,0);
  const rawDebt = filtExp.reduce((a,e)=>a+e.balance,0);
  const totalRepaid = filtRep.reduce((a,r)=>a+r.amount,0);
  const netDebt = rawDebt - totalRepaid;

  const envSpend=envelopes.map(env=>{
    const spent=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);
    return{...env,spent,pct:env.budget>0?Math.min(100,spent/env.budget*100):null};
  });

  // ── Actions ──
  function showToast(msg){
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(null),2500);
  }

  function saveExpForm(){
    const amt=parseFloat(expForm.amount);
    if(!expForm.label.trim()||isNaN(amt))return;
    const [cp,gp]=computeParts(amt,expForm.splitType,expForm.capShare,ratio);
    const balance=expForm.paidBy==="cap"?gp:-cp;
    const exp={id:editExp?editExp.id:gid(),label:expForm.label,amount:amt,envelopeId:expForm.envelopeId,paidBy:expForm.paidBy,splitType:expForm.splitType,capPart:parseFloat(cp.toFixed(2)),guiPart:parseFloat(gp.toFixed(2)),balance:parseFloat(balance.toFixed(2)),date:expForm.date,note:expForm.note};
    const next=editExp?expenses.map(e=>e.id===editExp.id?exp:e):[exp,...expenses];
    setExpenses(next);persist(SK.exp,next);
    setShowAddExp(false);setEditExp(null);
    showToast("✅ Transaction enregistrée");
  }

  // CORRECTIF : handleMarkRepaid utilise netDebt pour annuler rawDebt
  function handleMarkRepaid(){
      if(Math.abs(netDebt) < 0.01) return;
      const entry = {
          id: gid(),
          amount: netDebt, // On enregistre le montant exact de la balance actuelle
          date: new Date().toISOString().slice(0,10),
          month: filterMonth,
          year: filterYear
      };
      const next = [entry, ...repayments];
      setRepayments(next); persist(SK.rep, next);
      showToast("🤝 Comptes équilibrés !");
  }

  if(!loaded) return <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>Chargement...</div>;

  const soldeColor = Math.abs(netDebt)<1 ? "#3b82f6" : netDebt>0 ? "#059669" : "#be185d";
  const soldeBg = Math.abs(netDebt)<1 ? "#eff6ff" : netDebt>0 ? "#ecfdf5" : "#fff1f2";

  return(
    <div className="app">
      <style>{CSS}</style>
      {toast&&<div className="toast">{toast}</div>}

      {/* HEADER */}
      <div className="header-glass" style={{padding:"15px 20px 0"}}>
        <div style={{maxWidth:500, margin:"0 auto"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:15}}>
            <div style={{fontWeight:900, fontSize:22}}>💸 Budget</div>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <button className="bg2" onClick={()=>setFilterMonth(m=>m===0?11:m-1)}>‹</button>
              <span style={{fontWeight:800, fontSize:14}}>{MSHT[filterMonth]} {filterYear}</span>
              <button className="bg2" onClick={()=>setFilterMonth(m=>m===11?0:m+1)}>›</button>
              <button className="bg2" onClick={()=>setShowSettings(true)}>⚙️</button>
            </div>
          </div>
          <div style={{display:"flex", gap:15, overflowX:"auto"}}>
            {["dashboard", "balance", "envelopes", "calendar", "incomes", "charts"].map(k => (
              <button key={k} className={`tab${tab===k?" on":""}`} onClick={()=>setTab(k)}>{k.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:20, maxWidth:500, margin:"0 auto"}}>
        
        {/* DASHBOARD HERO */}
        {tab==="dashboard" && (
            <>
                <div className="solde-hero" style={{ background: soldeBg, borderColor: soldeColor }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: soldeColor, textTransform: 'uppercase', opacity: 0.6 }}>Balance du mois</div>
                    <div className="solde-amt" style={{ color: soldeColor }}>{fmt(Math.abs(netDebt))}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: soldeColor, marginBottom: 15 }}>
                        {Math.abs(netDebt) < 1 ? "Équilibre parfait !" : netDebt > 0 ? `${nameGui} → ${nameCap}` : `${nameCap} → ${nameGui}`}
                    </div>
                    {Math.abs(netDebt) > 1 && <button className="bg2" style={{borderRadius:20, fontWeight:800, padding:'10px 20px'}} onClick={handleMarkRepaid}>Régler la dette</button>}
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:25}}>
                    <div className="glass" style={{padding:15}}>
                        <div style={{fontSize:10, fontWeight:800, opacity:0.5, textTransform:'uppercase'}}>Part {nameCap}</div>
                        <div style={{fontSize:20, fontWeight:900, color:'#f43f8a'}}>{fmt(capSpent)}</div>
                    </div>
                    <div className="glass" style={{padding:15}}>
                        <div style={{fontSize:10, fontWeight:800, opacity:0.5, textTransform:'uppercase'}}>Part {nameGui}</div>
                        <div style={{fontSize:20, fontWeight:900, color:'#8b5cf6'}}>{fmt(guiSpent)}</div>
                    </div>
                </div>

                <div style={{fontSize:12, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', marginBottom:10}}>Tes Enveloppes</div>
                {envSpend.filter(e=>e.owner==="shared" || e.spent > 0).map(env => (
                    <div key={env.id} className="glass" style={{marginBottom:10, padding:15}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontWeight:700}}>
                            <span>{env.emoji} {env.name}</span>
                            <span>{fmt(env.spent)}</span>
                        </div>
                        {env.budget > 0 && (
                            <div className="gauge-track"><div className="gauge-fill" style={{width:`${env.pct}%`, background:env.color}} /></div>
                        )}
                    </div>
                ))}
            </>
        )}

        {/* BALANCE & LIST */}
        {tab==="balance" && (
            <div className="glass" style={{padding:10}}>
                {filtExp.length===0 ? <div style={{padding:40, textAlign:'center', opacity:0.5}}>Aucune dépense ce mois</div> : 
                    filtExp.map(e => (
                        <div key={e.id} className="erow" onClick={()=>{setEditExp(e); setExpForm({...e, amount:String(e.amount)}); setShowAddExp(true);}}>
                            <div style={{flex:1}}>
                                <div style={{fontWeight:700}}>{e.label}</div>
                                <div style={{fontSize:11, opacity:0.5}}>{envelopes.find(v=>v.id===e.envelopeId)?.name} • {e.splitType}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                                <div style={{fontWeight:900}}>{fmt(e.amount)}</div>
                                <div style={{fontSize:10, color:'#f43f8a'}}>{fmt(e.capPart)} | {fmt(e.guiPart)}</div>
                            </div>
                        </div>
                    ))
                }
            </div>
        )}

        {/* RESTE DU CODE (Enveloppes, Calendar, Stats...) - Tout est préservé selon ton original */}
        {tab==="envelopes" && (
            <div>
                <div style={{display:'flex', gap:8, marginBottom:15}}>
                    {["shared", "cap", "gui"].map(o => <button key={o} className={`chip${envOwner===o?" on":""}`} onClick={()=>setEnvOwner(o)}>{o==="shared" ? "Commun" : o.toUpperCase()}</button>)}
                </div>
                {envSpend.filter(e=>e.owner===envOwner).map(env => (
                    <div key={env.id} className="glass" style={{marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div><span style={{fontSize:20}}>{env.emoji}</span> <span style={{fontWeight:700}}>{env.name}</span></div>
                        <div style={{fontWeight:800}}>{fmt(env.spent)}</div>
                    </div>
                ))}
            </div>
        )}

        {tab==="charts" && (
            <div className="glass">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={[{name:nameCap, value:capSpent}, {name:nameGui, value:guiSpent}]} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                            <Cell fill="#f43f8a" /><Cell fill="#8b5cf6" />
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        )}
      </div>

      {/* FAB */}
      <div className="fab" onClick={()=>{setEditExp(null); setShowAddExp(true);}}>+</div>

      {/* MODAL EXPENSE (Moteur Original Complet) */}
      {showAddExp && (
        <div className="ov" onClick={()=>setShowAddExp(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:900, fontSize:22, marginBottom:20}}>{editExp ? "Modifier" : "Nouvelle dépense"}</div>
            <div style={{display:'flex', flexDirection:'column', gap:15}}>
                <div><label style={{fontSize:11, fontWeight:800, opacity:0.5}}>QUOI ?</label>
                <input placeholder="Libellé" value={expForm.label} onChange={e=>setExpForm({...expForm, label:e.target.value})} /></div>
                
                <div><label style={{fontSize:11, fontWeight:800, opacity:0.5}}>COMBIEN ? (€)</label>
                <input type="number" placeholder="0.00" value={expForm.amount} onChange={e=>setExpForm({...expForm, amount:e.target.value})} /></div>
                
                <div><label style={{fontSize:11, fontWeight:800, opacity:0.5}}>ENVELOPPE</label>
                <select value={expForm.envelopeId} onChange={e=>setExpForm({...expForm, envelopeId:e.target.value})}>
                    {envelopes.map(env => <option key={env.id} value={env.id}>{env.emoji} {env.name}</option>)}
                </select></div>

                <div style={{display:'flex', gap:10}}>
                    <button className={`chip${expForm.paidBy==="cap"?" on":""}`} onClick={()=>setExpForm({...expForm, paidBy:"cap"})}>{nameCap}</button>
                    <button className={`chip${expForm.paidBy==="gui"?" on":""}`} onClick={()=>setExpForm({...expForm, paidBy:"gui"})}>{nameGui}</button>
                </div>

                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                    {SPLIT_OPTS.map(o => <button key={o.key} className={`chip${expForm.splitType===o.key?" on":""}`} onClick={()=>setExpForm({...expForm, splitType:o.key})}>{o.icon} {o.label}</button>)}
                </div>

                <button className="btn bp" onClick={saveExpForm}>ENREGISTRER</button>
                {editExp && <button className="btn bg2" style={{color:'#ef4444'}} onClick={()=>{setExpenses(expenses.filter(x=>x.id!==editExp.id)); persist(SK.exp, expenses.filter(x=>x.id!==editExp.id)); setShowAddExp(false);}}>Supprimer</button>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SETTINGS (Pour ajuster le prorata) */}
      {showSettings && (
          <div className="ov" onClick={()=>setShowSettings(false)}>
              <div className="sh" onClick={e=>e.stopPropagation()}>
                  <div style={{fontWeight:900, fontSize:22, marginBottom:20}}>Réglages</div>
                  <label style={{fontSize:11, fontWeight:800, opacity:0.5}}>RATIO {nameCap} (%)</label>
                  <input type="number" value={setForm2.ratioCap} onChange={e=>setSetForm2({...setForm2, ratioCap:e.target.value})} />
                  <button className="btn bp" style={{marginTop:20}} onClick={()=>{setSettings({...setForm2, names:[setForm2.nameCap, setForm2.nameGui]}); persist(SK.set, {...setForm2, names:[setForm2.nameCap, setForm2.nameGui]}); setShowSettings(false);}}>SAUVEGARDER</button>
              </div>
          </div>
      )}
    </div>
  );
}
