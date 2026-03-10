import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// ── Storage keys ──
const SK = { exp:"bcv6_exp", env:"bcv6_env", set:"bcv6_set", rec:"bcv6_rec", inc:"bcv6_inc", rep:"bcv6_rep" };

// ── Constants ──
const PALETTE = ["#f43f8a","#a855f7","#3b82f6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#ec4899","#8b5cf6","#14b8a6","#f97316"];
const EMOJIS  = ["🛒","🏠","🍽️","🚆","👩","👨","💊","📦","✈️","🎬","☕","🎮","💄","🐶","🌿","🎁","⚡","💧","📱","🏋️","🎵","🧴","🏥","🎓","👗","🍷","🎯","🏖️"];
const MONTHS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MSHT    = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS_S  = ["L","M","M","J","V","S","D"];

const DEFAULT_SETTINGS = { ratioCap:42, names:["Capucine","Guillaume"], salCap:2100, salGui:2900 };
const DEFAULT_ENVELOPES = [
  // 🤝 POT COMMUN — pro rata 42/58
  { id:"ec_loy", name:"Loyer + charges",  emoji:"🏠", color:"#8b5cf6", budget:1412, owner:"shared" },
  { id:"ec_voi", name:"Assurance voiture",emoji:"🚗", color:"#6366f1", budget:62,   owner:"shared" },
  { id:"ec_ess", name:"Essence",          emoji:"⛽", color:"#f59e0b", budget:120,  owner:"shared" },
  { id:"ec_cou", name:"Courses frigo",    emoji:"🛒", color:"#f43f8a", budget:400,  owner:"shared" },
  // 👩 CAPUCINE — fixes
  { id:"ep_spo", name:"Sport",            emoji:"🏋️", color:"#ec4899", budget:49,   owner:"cap"    },
  { id:"ep_abo", name:"Abonnements Cap",  emoji:"📱", color:"#f43f8a", budget:31,   owner:"cap"    },
  // 👩 CAPUCINE — épargne
  { id:"ep_liv", name:"Livret Cap",       emoji:"🏦", color:"#10b981", budget:400,  owner:"cap"    },
  { id:"ep_etf", name:"ETF Cap",          emoji:"📈", color:"#059669", budget:260,  owner:"cap"    },
  // 👩 CAPUCINE — plaisir
  { id:"ep_sna", name:"Snacks Cap",       emoji:"🍫", color:"#f97316", budget:20,   owner:"cap"    },
  { id:"ep_lib", name:"Liberté Cap",      emoji:"🎯", color:"#c026d3", budget:400,  owner:"cap"    },
  // 👨 GUILLAUME — fixes
  { id:"eg_tra", name:"Train",            emoji:"🚆", color:"#3b82f6", budget:44.5, owner:"gui"    },
  { id:"eg_abo", name:"Abonnements Gui",  emoji:"📱", color:"#6366f1", budget:31,   owner:"gui"    },
  // 👨 GUILLAUME — épargne
  { id:"eg_liv", name:"Livret Gui",       emoji:"🏦", color:"#10b981", budget:400,  owner:"gui"    },
  { id:"eg_etf", name:"ETF Gui",          emoji:"📈", color:"#059669", budget:300,  owner:"gui"    },
  // 👨 GUILLAUME — plaisir
  { id:"eg_sna", name:"Snacks Gui",       emoji:"🍔", color:"#f97316", budget:40,   owner:"gui"    },
  { id:"eg_lib", name:"Liberté Gui",      emoji:"🎯", color:"#14b8a6", budget:750,  owner:"gui"    },
];
const DEFAULT_RECURRING = [
  // 🤝 POT COMMUN (virements auto j.1)
  { id:"r1",  label:"Loyer cc",          emoji:"🏠", dayOfMonth:1,  amount:1280, splitType:"prorata", paidBy:"cap", envelopeId:"ec_loy", color:"#8b5cf6", note:"Charges comprises" },
  { id:"r2",  label:"EDF",               emoji:"⚡", dayOfMonth:5,  amount:83,   splitType:"prorata", paidBy:"cap", envelopeId:"ec_loy", color:"#f59e0b", note:"Variable" },
  { id:"r3",  label:"Box internet",      emoji:"📡", dayOfMonth:10, amount:25,   splitType:"prorata", paidBy:"gui", envelopeId:"ec_loy", color:"#3b82f6", note:"" },
  { id:"r4",  label:"Assurance hab.",    emoji:"🔒", dayOfMonth:10, amount:24,   splitType:"prorata", paidBy:"cap", envelopeId:"ec_loy", color:"#6366f1", note:"" },
  { id:"r5",  label:"Assurance voiture", emoji:"🚗", dayOfMonth:5,  amount:62,   splitType:"prorata", paidBy:"cap", envelopeId:"ec_voi", color:"#6366f1", note:"" },
  // 👩 CAP fixes
  { id:"r6",  label:"Sport Cap",         emoji:"🏋️", dayOfMonth:1,  amount:49,   splitType:"cap_only", paidBy:"cap", envelopeId:"ep_spo", color:"#ec4899", note:"" },
  { id:"r7",  label:"Claude AI",         emoji:"🤖", dayOfMonth:5,  amount:20,   splitType:"cap_only", paidBy:"cap", envelopeId:"ep_abo", color:"#f43f8a", note:"" },
  { id:"r8",  label:"Apple Music Cap",   emoji:"🎵", dayOfMonth:5,  amount:4.99, splitType:"cap_only", paidBy:"cap", envelopeId:"ep_abo", color:"#f43f8a", note:"" },
  { id:"r9",  label:"Apple Cloud Cap",   emoji:"☁️", dayOfMonth:5,  amount:2.99, splitType:"cap_only", paidBy:"cap", envelopeId:"ep_abo", color:"#f43f8a", note:"" },
  { id:"r10", label:"Google Cloud Cap",  emoji:"☁️", dayOfMonth:5,  amount:2.99, splitType:"cap_only", paidBy:"cap", envelopeId:"ep_abo", color:"#f43f8a", note:"" },
  // 👩 CAP épargne
  { id:"r11", label:"Livret Cap",        emoji:"🏦", dayOfMonth:2,  amount:400,  splitType:"cap_only", paidBy:"cap", envelopeId:"ep_liv", color:"#10b981", note:"Virement auto" },
  { id:"r12", label:"ETF Cap",           emoji:"📈", dayOfMonth:2,  amount:260,  splitType:"cap_only", paidBy:"cap", envelopeId:"ep_etf", color:"#059669", note:"Virement auto" },
  // 👨 GUI fixes
  { id:"r13", label:"Train Gui",         emoji:"🚆", dayOfMonth:1,  amount:44.5, splitType:"gui_only", paidBy:"gui", envelopeId:"eg_tra", color:"#3b82f6", note:"Domicile-travail" },
  { id:"r14", label:"Forfait téléphone", emoji:"📱", dayOfMonth:5,  amount:15.99,splitType:"gui_only", paidBy:"gui", envelopeId:"eg_abo", color:"#6366f1", note:"" },
  { id:"r15", label:"Apple Cloud Gui",   emoji:"☁️", dayOfMonth:5,  amount:9.99, splitType:"gui_only", paidBy:"gui", envelopeId:"eg_abo", color:"#6366f1", note:"" },
  { id:"r16", label:"Apple Music Gui",   emoji:"🎵", dayOfMonth:5,  amount:4.99, splitType:"gui_only", paidBy:"gui", envelopeId:"eg_abo", color:"#6366f1", note:"" },
  // 👨 GUI épargne
  { id:"r17", label:"Livret Gui",        emoji:"🏦", dayOfMonth:2,  amount:400,  splitType:"gui_only", paidBy:"gui", envelopeId:"eg_liv", color:"#10b981", note:"Virement auto" },
  { id:"r18", label:"ETF Gui",           emoji:"📈", dayOfMonth:2,  amount:300,  splitType:"gui_only", paidBy:"gui", envelopeId:"eg_etf", color:"#059669", note:"Virement auto" },
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
const daysInMonth    = (m,y) => new Date(y,m+1,0).getDate();
const firstDayOfMonth= (m,y) => { let d=new Date(y,m,1).getDay(); return d===0?6:d-1; };

function computeParts(amt,splitType,capShare,ratio){
  if(splitType==="prorata")  return [amt*ratio,     amt*(1-ratio)];
  if(splitType==="equal")    return [amt/2,          amt/2];
  if(splitType==="cap_only") return [amt,            0];
  if(splitType==="gui_only") return [0,              amt];
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
  else if(/perso\s*gui|gui\s*perso/.test(text)) splitType="gui_only";
  else if(/perso\s*cap|cap\s*perso/.test(text)) splitType="cap_only";
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

// ── CSS ──
const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:99px;}

.app{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  min-height:100vh;
  background:linear-gradient(135deg,#e0e7ff 0%,#fce7f3 40%,#dbeafe 75%,#ede9fe 100%);
  background-attachment:fixed;
  color:#1e1b2e;
  font-size:15px;
}
.blob1{position:fixed;top:-120px;left:-80px;width:420px;height:420px;background:radial-gradient(circle,#f43f8a44 0%,transparent 70%);border-radius:50%;pointer-events:none;z-index:0;}
.blob2{position:fixed;bottom:-100px;right:-100px;width:380px;height:380px;background:radial-gradient(circle,#8b5cf644 0%,transparent 70%);border-radius:50%;pointer-events:none;z-index:0;}
.blob3{position:fixed;top:40%;left:60%;width:280px;height:280px;background:radial-gradient(circle,#3b82f622 0%,transparent 70%);border-radius:50%;pointer-events:none;z-index:0;}

.glass{background:rgba(255,255,255,.55);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.8);border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,.06);}
.glass-sm{background:rgba(255,255,255,.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.75);border-radius:14px;}
.header-glass{background:rgba(255,255,255,.78);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,.9);box-shadow:0 2px 16px rgba(0,0,0,.05);}

input,select,textarea{outline:none;background:rgba(255,255,255,.65);border:1.5px solid rgba(255,255,255,.9);border-radius:12px;padding:12px 14px;color:#1e1b2e;font-family:inherit;font-size:15px;width:100%;transition:all .2s;backdrop-filter:blur(8px);}
input:focus,select:focus,textarea:focus{border-color:#f43f8a;background:rgba(255,255,255,.88);box-shadow:0 0 0 3px rgba(244,63,138,.1);}
input::placeholder,textarea::placeholder{color:#c4b5d5;}
select option{background:#fff;color:#1e1b2e;}

.btn{border:none;cursor:pointer;font-family:inherit;font-weight:600;transition:all .18s;letter-spacing:-.01em;}
.bp{background:linear-gradient(135deg,#f43f8a,#c026d3);color:#fff;border-radius:12px;padding:12px 20px;font-size:14px;box-shadow:0 4px 14px rgba(244,63,138,.25);}
.bp:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(244,63,138,.32);}
.bp:active{transform:scale(.97);box-shadow:none;}
.bg2{background:rgba(255,255,255,.6);color:#6b7280;border:1.5px solid rgba(255,255,255,.9);border-radius:10px;padding:9px 14px;font-size:13px;backdrop-filter:blur(8px);}
.bg2:hover{background:rgba(255,255,255,.85);color:#374151;}
.bsm{padding:6px 10px!important;font-size:12px!important;border-radius:8px!important;}
.del{background:none;border:none;color:#d1d5db;cursor:pointer;font-size:13px;padding:4px 6px;border-radius:6px;transition:all .15s;}
.del:hover{color:#f43f8a;background:rgba(244,63,138,.08);}

.tab{background:none;border:none;cursor:pointer;font-family:inherit;font-weight:600;font-size:11px;padding:10px 1px;color:#9ca3af;transition:color .15s;border-bottom:2px solid transparent;white-space:nowrap;flex-shrink:0;letter-spacing:.02em;}
.tab.on{color:#f43f8a;border-bottom-color:#f43f8a;}
.tab:hover:not(.on){color:#6b7280;}

.chip{background:rgba(255,255,255,.5);border:1.5px solid rgba(255,255,255,.8);border-radius:10px;padding:8px 13px;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer;transition:all .15s;backdrop-filter:blur(8px);}
.chip.on{border-color:#f43f8a;color:#f43f8a;background:rgba(244,63,138,.08);}

.ov{position:fixed;inset:0;background:rgba(30,27,46,.45);backdrop-filter:blur(10px);z-index:300;display:flex;align-items:flex-end;justify-content:center;padding:12px;animation:fadeIn .2s ease;}
.sh{background:rgba(255,255,255,.96);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border:1px solid rgba(255,255,255,1);border-radius:26px;padding:24px;width:100%;max-width:500px;max-height:93vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.12);animation:slideUp .25s cubic-bezier(.34,1.56,.64,1);}

@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes toastIn{from{transform:translateY(-20px) scale(.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes toastOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.9)}}

.fl{display:flex;flex-direction:column;gap:6px;}
.fl label{font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;}

.gauge-track{height:8px;border-radius:99px;background:rgba(0,0,0,.07);overflow:hidden;}
.gauge-fill{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.4,0,.2,1);}

.erow{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.85);border-radius:13px;transition:all .15s;backdrop-filter:blur(10px);}
.erow:hover{background:rgba(255,255,255,.78);transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.06);}

.env-card{padding:14px 16px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.85);border-radius:16px;cursor:pointer;border-left:4px solid transparent;margin-bottom:9px;transition:all .15s;backdrop-filter:blur(10px);}
.env-card:hover{background:rgba(255,255,255,.75);transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.07);}

.otab{background:rgba(255,255,255,.5);border:1.5px solid rgba(255,255,255,.8);border-radius:10px;padding:7px 13px;font-size:12px;font-weight:600;color:#6b7280;cursor:pointer;transition:all .15s;backdrop-filter:blur(8px);}
.otab.on{border-color:#f43f8a;color:#f43f8a;background:rgba(244,63,138,.07);}

.sect{font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:.14em;text-transform:uppercase;margin:12px 0 7px 1px;}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;}
.divider{height:1px;background:rgba(0,0,0,.06);margin:16px 0;}

.toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:500;background:rgba(30,27,46,.9);backdrop-filter:blur(16px);color:white;padding:12px 20px;border-radius:99px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.15);white-space:nowrap;}
.toast.in{animation:toastIn .3s cubic-bezier(.34,1.56,.64,1) forwards;}
.toast.out{animation:toastOut .3s ease forwards;}

.qa-wrap{position:fixed;bottom:0;left:0;right:0;z-index:100;padding:8px 14px 24px;background:linear-gradient(0deg,rgba(224,231,255,.96) 55%,transparent);}
.qa-input{width:100%;background:rgba(255,255,255,.88);backdrop-filter:blur(20px);border:2px solid rgba(255,255,255,1);border-radius:16px;padding:14px 52px 14px 18px;color:#1e1b2e;font-family:inherit;font-size:15px;outline:none;transition:all .2s;box-shadow:0 4px 20px rgba(0,0,0,.07);}
.qa-input:focus{border-color:#f43f8a;box-shadow:0 4px 20px rgba(244,63,138,.14);}
.qa-input::placeholder{color:#c4b5d5;}
.qa-btn{position:absolute;right:18px;top:50%;transform:translateY(-52%);background:linear-gradient(135deg,#f43f8a,#c026d3);border:none;border-radius:11px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;box-shadow:0 3px 10px rgba(244,63,138,.3);transition:all .15s;}
.qa-btn:hover{transform:translateY(-54%) scale(1.05);}
.qa-prev{background:rgba(255,255,255,.82);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.9);border-radius:13px;padding:9px 14px;margin-bottom:7px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,.05);}
.qa-tag{padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;}
.hint{font-size:11px;color:#c4b5d5;text-align:center;margin-bottom:5px;}

.solde-pos{background:linear-gradient(135deg,rgba(16,185,129,.14) 0%,rgba(5,150,105,.07) 100%);border:1px solid rgba(16,185,129,.25);border-radius:20px;padding:18px 20px;}
.solde-neg{background:linear-gradient(135deg,rgba(244,63,138,.11) 0%,rgba(192,38,211,.06) 100%);border:1px solid rgba(244,63,138,.22);border-radius:20px;padding:18px 20px;}
.solde-zero{background:linear-gradient(135deg,rgba(59,130,246,.11) 0%,rgba(99,102,241,.06) 100%);border:1px solid rgba(59,130,246,.22);border-radius:20px;padding:18px 20px;}

.cal-cell{min-height:52px;border-radius:8px;padding:3px;background:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.6);cursor:pointer;transition:all .15s;}
.cal-cell:hover{background:rgba(255,255,255,.6);}
.cal-cell.tod{border-color:rgba(244,63,138,.5);background:rgba(244,63,138,.08);}
.rdot{width:100%;border-radius:3px;padding:1px 3px;font-size:8px;font-weight:700;margin-bottom:1px;overflow:hidden;white-space:nowrap;}

.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 20px;gap:10px;}
.empty-icon{font-size:40px;opacity:.4;}
.empty-text{font-size:14px;color:#9ca3af;text-align:center;line-height:1.5;}

.stat-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.05);}
.stat-row:last-child{border-bottom:none;}

.inc-row{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid rgba(0,0,0,.05);}
.inc-row:last-child{border-bottom:none;}

.search-wrap{position:relative;margin-bottom:10px;}
.search-input{padding-left:36px!important;}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;}

.eg{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;}
.eo{border:2px solid transparent;background:rgba(255,255,255,.5);border-radius:7px;padding:5px;font-size:16px;cursor:pointer;text-align:center;transition:all .15s;}
.eo:hover{background:rgba(255,255,255,.8);}
.eo.on{border-color:#f43f8a;background:rgba(244,63,138,.08);}
.cd{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .15s;flex-shrink:0;}
.cd.on{border-color:white;transform:scale(1.25);box-shadow:0 0 0 2px rgba(0,0,0,.2);}
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
  const [tab,        setTab]        = useState("dashboard");
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
  const [calView,      setCalView]      = useState("list");
  const [selDay,       setSelDay]       = useState(null);
  const [searchQ,      setSearchQ]      = useState("");
  const [statsView,    setStatsView]    = useState("month");

  // Toast
  const [toast,      setToast]      = useState(null);
  const [toastState, setToastState] = useState("in");
  const toastTimer = useRef(null);

  // Quick add
  const [qaText,    setQaText]    = useState("");
  const [qaPreview, setQaPreview] = useState(null);
  const qaRef = useRef(null);

  // Forms
  const [expForm, setExpForm] = useState({label:"",amount:"",envelopeId:"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});
  const [envForm, setEnvForm] = useState({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:"shared"});
  const [recForm, setRecForm] = useState({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});
  const [incForm, setIncForm] = useState({label:"",amount:"",person:"cap",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
  const [setForm2,setSetForm2]= useState({ratioCap:42,nameCap:"Capucine",nameGui:"Guillaume",salCap:2100,salGui:2900});

  const ratio   = settings.ratioCap/100;
  const nameCap = settings.names?.[0]||"Capucine";
  const nameGui = settings.names?.[1]||"Guillaume";
  const today   = new Date().getDate();
  const isCurMo = filterMonth===new Date().getMonth()&&filterYear===new Date().getFullYear();
  const monthKey= `${filterYear}-${String(filterMonth+1).padStart(2,"0")}`;

  // ── Load from Supabase ──
  useEffect(()=>{
    async function load(){
      try{
        const res=await Promise.allSettled(Object.values(SK).map(k=>window.storage.get(k,true)));
        const parse=r=>r.status==="fulfilled"&&r.value?.value?JSON.parse(r.value.value):null;
        const [e,v,s,r,i,p]=res.map(parse);
        if(e)setExpenses(e); if(v)setEnvelopes(v);
        if(s){setSettings(s);setSetForm2({ratioCap:s.ratioCap,nameCap:s.names[0],nameGui:s.names[1],salCap:s.salCap||2100,salGui:s.salGui||2900});}
        if(r)setRecurring(r); if(i)setIncomes(i); if(p)setRepayments(p);
      }catch{}
      setLoaded(true);
    }
    load();
  },[]);

  const persist=useCallback(async(key,data)=>{try{await window.storage.set(key,JSON.stringify(data),true);}catch{}},[]);

  // Quick add parse
  useEffect(()=>{
    if(qaText.length>2) setQaPreview(parseQuickAdd(qaText,envelopes,settings));
    else setQaPreview(null);
  },[qaText,envelopes,settings]);

  // Toast helper
  function showToast(msg){
    clearTimeout(toastTimer.current);
    setToast(msg); setToastState("in");
    toastTimer.current=setTimeout(()=>{
      setToastState("out");
      setTimeout(()=>setToast(null),300);
    },2200);
  }

  // ── Derived ──
  const filtExp=expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;});
  const filtInc=incomes.filter(i=>{const d=new Date(i.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;});
  const searchedExp=searchQ.trim()?filtExp.filter(e=>e.label.toLowerCase().includes(searchQ.toLowerCase())||envelopes.find(v=>v.id===e.envelopeId)?.name.toLowerCase().includes(searchQ.toLowerCase())):filtExp;

  const totalSpent  =filtExp.reduce((a,e)=>a+e.amount,0);
  const capSpent    =filtExp.reduce((a,e)=>a+e.capPart,0);
  const guiSpent    =filtExp.reduce((a,e)=>a+e.guiPart,0);
  const capIncome   =filtInc.filter(i=>i.person==="cap").reduce((a,i)=>a+i.amount,0);
  const guiIncome   =filtInc.filter(i=>i.person==="gui").reduce((a,i)=>a+i.amount,0);
  const capBalance  =capIncome-capSpent;
  const guiBalance  =guiIncome-guiSpent;
  const rawDebt     =filtExp.reduce((a,e)=>a+e.balance,0);
  const repaidThisMonth=repayments.filter(r=>{const d=new Date(r.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;}).reduce((a,r)=>a+r.amount,0);
  const netDebt     =rawDebt-repaidThisMonth;

  const envSpend=envelopes.map(env=>{
    const spent=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);
    return{...env,spent,pct:env.budget>0?Math.min(115,spent/env.budget*100):null};
  });

  const urgentRec=recurring.filter(r=>isCurMo&&r.dayOfMonth>=today&&r.dayOfMonth-today<=3);
  const debtByEnv=envelopes.map(env=>{const bal=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.balance,0);return{...env,balance:parseFloat(bal.toFixed(2))};}).filter(e=>Math.abs(e.balance)>0.01);
  const pieShared=envelopes.filter(e=>e.owner==="shared").map(env=>{const v=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);return{name:env.name,value:parseFloat(v.toFixed(2)),color:env.color};}).filter(e=>e.value>0);
  const pieCap   =envelopes.filter(e=>e.owner==="cap"   ).map(env=>{const v=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);return{name:env.name,value:parseFloat(v.toFixed(2)),color:env.color};}).filter(e=>e.value>0);
  const pieGui   =envelopes.filter(e=>e.owner==="gui"   ).map(env=>{const v=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);return{name:env.name,value:parseFloat(v.toFixed(2)),color:env.color};}).filter(e=>e.value>0);

  const last6=Array.from({length:6},(_,i)=>{
    const d=new Date(filterYear,filterMonth-5+i,1);
    const m=d.getMonth(),y=d.getFullYear();
    const total=expenses.filter(e=>{const dd=new Date(e.date);return dd.getMonth()===m&&dd.getFullYear()===y;}).reduce((a,e)=>a+e.amount,0);
    return{name:MSHT[m],total:parseFloat(total.toFixed(2)),month:m,year:y};
  });

  const recByDay={},expByDay={};
  recurring.forEach(r=>{if(!recByDay[r.dayOfMonth])recByDay[r.dayOfMonth]=[];recByDay[r.dayOfMonth].push(r);});
  filtExp.forEach(e=>{const d=new Date(e.date).getDate();if(!expByDay[d])expByDay[d]=[];expByDay[d].push(e);});
  const upcoming=recurring.filter(r=>isCurMo&&r.dayOfMonth>=today).sort((a,b)=>a.dayOfMonth-b.dayOfMonth).slice(0,4);

  const slabel={prorata:`⚖️ ${settings.ratioCap}/${100-settings.ratioCap}`,equal:"🤝 50/50",cap_only:`👩 ${nameCap}`,gui_only:`👨 ${nameGui}`,custom:"✏️ Perso"};
  const ownerLabel={shared:"🤝 Commun",cap:`👩 ${nameCap}`,gui:`👨 ${nameGui}`};
  const soldeClass=Math.abs(netDebt)<0.01?"solde-zero":netDebt>0?"solde-pos":"solde-neg";
  const soldeColor=Math.abs(netDebt)<0.01?"#3b82f6":netDebt>0?"#059669":"#be185d";

  // ── Budget widget ──
  const SAL_CAP = settings.salCap||2100;
  const SAL_GUI = settings.salGui||2900;
  // Part de chaque personne dans chaque enveloppe selon le owner + splitType des dépenses
  // Budget alloué = somme des budgets des enveloppes (part perso)
  const capBudgetAlloc = envelopes.reduce((a,env)=>{
    if(env.owner==="cap") return a+env.budget;
    if(env.owner==="shared") return a+Math.round(env.budget*ratio);
    return a;
  },0);
  const guiBudgetAlloc = envelopes.reduce((a,env)=>{
    if(env.owner==="gui") return a+env.budget;
    if(env.owner==="shared") return a+Math.round(env.budget*(1-ratio));
    return a;
  },0);
  const capBudgetReste  = SAL_CAP - capBudgetAlloc;
  const guiBudgetReste  = SAL_GUI - guiBudgetAlloc;

  // ── Actions ──
  function addExpense(data){const next=[data,...expenses];setExpenses(next);persist(SK.exp,next);}
  function saveExpForm(){
    const amt=parseFloat(expForm.amount);
    if(!expForm.label.trim()||isNaN(amt)||amt<=0||!expForm.envelopeId)return;
    const [cp,gp]=computeParts(amt,expForm.splitType,expForm.capShare,ratio);
    const balance=expForm.paidBy==="cap"?gp:-cp;
    const exp={id:editExp?editExp.id:gid(),label:expForm.label,amount:amt,envelopeId:expForm.envelopeId,paidBy:expForm.paidBy,splitType:expForm.splitType,capPart:parseFloat(cp.toFixed(2)),guiPart:parseFloat(gp.toFixed(2)),balance:parseFloat(balance.toFixed(2)),date:expForm.date,note:expForm.note};
    const next=editExp?expenses.map(e=>e.id===editExp.id?exp:e):[exp,...expenses];
    setExpenses(next);persist(SK.exp,next);
    setShowAddExp(false);setEditExp(null);
    setExpForm({label:"",amount:"",envelopeId:"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});
    showToast(editExp?"✏️ Dépense modifiée":"✅ Dépense ajoutée !");
  }
  function openEditExp(e){setEditExp(e);setExpForm({label:e.label,amount:String(e.amount),envelopeId:e.envelopeId,paidBy:e.paidBy,splitType:e.splitType,capShare:"",date:e.date,note:e.note||""});setShowAddExp(true);}
  function delExp(id){const n=expenses.filter(e=>e.id!==id);setExpenses(n);persist(SK.exp,n);showToast("🗑️ Dépense supprimée");}
  function submitQA(){if(!qaPreview)return;addExpense(qaPreview);showToast(`✅ ${qaPreview.label} — ${fmt(qaPreview.amount)} ajouté !`);setQaText("");setQaPreview(null);}

  function submitEnv(){
    if(!envForm.name.trim())return;
    const entry={...envForm,budget:parseFloat(envForm.budget)||0};
    const next=editEnv?envelopes.map(e=>e.id===editEnv.id?{...e,...entry}:e):[...envelopes,{...entry,id:gid()}];
    setEnvelopes(next);persist(SK.env,next);setShowAddEnv(false);setEditEnv(null);
    setEnvForm({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:"shared"});
    showToast(editEnv?"✏️ Enveloppe modifiée":"✅ Enveloppe créée !");
  }
  function delEnv(id){const n=envelopes.filter(e=>e.id!==id);setEnvelopes(n);persist(SK.env,n);showToast("🗑️ Enveloppe supprimée");}

  function submitRec(){
    if(!recForm.label.trim())return;
    const entry={...recForm,id:editRec?editRec.id:gid(),dayOfMonth:parseInt(recForm.dayOfMonth)||1,amount:parseFloat(recForm.amount)||0};
    const next=editRec?recurring.map(r=>r.id===editRec.id?entry:r):[...recurring,entry];
    setRecurring(next);persist(SK.rec,next);setShowAddRec(false);setEditRec(null);
    setRecForm({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});
    showToast(editRec?"✏️ Récurrente modifiée":"✅ Récurrente créée !");
  }
  function delRec(id){const n=recurring.filter(r=>r.id!==id);setRecurring(n);persist(SK.rec,n);showToast("🗑️ Récurrente supprimée");}

  function addIncome(){
    const amt=parseFloat(incForm.amount);
    if(!incForm.label.trim()||isNaN(amt)||amt<=0)return;
    const entry={id:gid(),...incForm,amount:amt};
    const next=[entry,...incomes];setIncomes(next);persist(SK.inc,next);
    setShowAddInc(false);setIncForm({label:"",amount:"",person:"cap",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
    showToast("💰 Revenu ajouté !");
  }
  function delInc(id){const n=incomes.filter(i=>i.id!==id);setIncomes(n);persist(SK.inc,n);showToast("🗑️ Revenu supprimé");}
  function markRepaid(amount){
    const entry={id:gid(),amount,date:new Date().toISOString().slice(0,10)};
    const next=[entry,...repayments];setRepayments(next);persist(SK.rep,next);
    showToast("✅ Remboursement enregistré !");
  }
  function saveSettings(){
    const s={ratioCap:parseInt(setForm2.ratioCap)||42,names:[setForm2.nameCap,setForm2.nameGui],salCap:parseFloat(setForm2.salCap)||2100,salGui:parseFloat(setForm2.salGui)||2900};
    setSettings(s);persist(SK.set,s);setShowSettings(false);showToast("⚙️ Réglages sauvegardés !");
  }

  // ── Loading ──
  if(!loaded)return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#e0e7ff,#fce7f3,#dbeafe)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:28}}>💸</div>
      <div style={{fontSize:14,color:"#9ca3af",fontFamily:"system-ui"}}>Chargement…</div>
    </div>
  );

  // ── Sub-components ──
  const MiniPie=({data,title,accentColor})=>{
    if(!data.length)return<div style={{color:"#9ca3af",fontSize:12,textAlign:"center",padding:"12px 0"}}>Aucune dépense</div>;
    const total=data.reduce((a,d)=>a+d.value,0);
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:14,color:accentColor||"#374151"}}>{title}</span>
          <span style={{fontSize:13,fontWeight:600,color:"#6b7280",marginLeft:"auto"}}>{fmt(total)}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <ResponsiveContainer width={100} height={100}>
            <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={26} outerRadius={46} paddingAngle={3} dataKey="value">
              {data.map((d,i)=><Cell key={i} fill={d.color}/>)}
            </Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"rgba(255,255,255,.97)",border:"1px solid rgba(0,0,0,.08)",borderRadius:10,fontFamily:"inherit",fontSize:12}}/></PieChart>
          </ResponsiveContainer>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
            {data.map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:99,background:d.color}}/><span style={{fontSize:12,color:"#6b7280"}}>{d.name}</span></div>
                <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── BudgetBar ──
  const BudgetBar=({person})=>{
    const isCap=person==="cap";
    const sal    = isCap?SAL_CAP:SAL_GUI;
    const alloc  = isCap?capBudgetAlloc:guiBudgetAlloc;
    const spent  = isCap?capSpent:guiSpent;
    const reste  = sal-alloc;
    const color  = isCap?"#f43f8a":"#8b5cf6";
    const name   = isCap?nameCap:nameGui;
    const allocPct  = Math.min(100,alloc/sal*100);
    const spentPct  = Math.min(allocPct,spent/sal*100);
    const restePct  = Math.max(0,100-allocPct);
    const overBudget= spent>alloc;
    const overPct   = overBudget?Math.min(100,(spent-alloc)/sal*100):0;
    return(
      <div style={{background:"rgba(255,255,255,.55)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,.8)",borderRadius:16,padding:"14px 16px",borderTop:`3px solid ${color}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:14,color}}>{isCap?"👩":"👨"} {name}</span>
          <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>Salaire <span style={{color:"#374151",fontWeight:700}}>{fmt(sal)}</span></span>
        </div>
        {/* Barre stackée */}
        <div style={{height:12,borderRadius:99,background:"rgba(0,0,0,.07)",overflow:"hidden",display:"flex",marginBottom:10}}>
          {/* Dépensé */}
          <div style={{width:`${spentPct}%`,background:`linear-gradient(90deg,${color}cc,${color})`,borderRadius:"99px 0 0 99px",transition:"width .8s cubic-bezier(.4,0,.2,1)",flexShrink:0}}/>
          {/* Alloué restant (budgeté mais pas encore dépensé) */}
          <div style={{width:`${Math.max(0,allocPct-spentPct-overPct)}%`,background:`${color}28`,transition:"width .8s",flexShrink:0}}/>
          {/* Dépassement */}
          {overBudget&&<div style={{width:`${overPct}%`,background:"#ef4444",borderRadius:"0 99px 99px 0",flexShrink:0}}/>}
          {/* Reste non alloué */}
          <div style={{flex:1,background:"rgba(16,185,129,.15)",borderRadius:restePct>0?"0 99px 99px 0":0}}/>
        </div>
        {/* Légende */}
        <div style={{display:"flex",gap:0}}>
          {[
            ["Dépensé",fmt(spent),color],
            ["Budgeté",fmt(alloc),`${color}88`],
            ["Libre",fmt(Math.max(0,reste)),"#10b981"],
          ].map(([l,v,c],i)=>(
            <div key={l} style={{flex:1,borderLeft:i>0?"1px solid rgba(0,0,0,.06)":undefined,paddingLeft:i>0?10:0}}>
              <div style={{fontSize:9,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>{l}</div>
              <div style={{fontSize:13,fontWeight:700,color:c,marginTop:2}}>{v}</div>
            </div>
          ))}
        </div>
        {overBudget&&<div style={{marginTop:8,fontSize:12,color:"#ef4444",fontWeight:600,background:"rgba(239,68,68,.08)",borderRadius:8,padding:"5px 10px"}}>⚠️ Dépassement de {fmt(spent-alloc)} ce mois !</div>}
        {reste>0&&spent===0&&<div style={{marginTop:8,fontSize:12,color:"#9ca3af",background:"rgba(255,255,255,.5)",borderRadius:8,padding:"5px 10px"}}>💡 {fmt(reste)} non alloués — pense à ajuster tes enveloppes</div>}
      </div>
    );
  };

  const Gauge=({env,onClick})=>{
    const sp=envSpend.find(e=>e.id===env.id)||{spent:0,pct:null};
    const over=sp.pct>100,warn=sp.pct>85;
    const color=over?"#ef4444":warn?"#f97316":env.color;
    return(
      <div className="env-card" style={{borderLeftColor:env.color}} onClick={onClick}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:42,height:42,borderRadius:12,background:env.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,flexShrink:0}}>{env.emoji}</div>
            <div>
              <div style={{fontWeight:600,fontSize:15,color:"#1e1b2e"}}>{env.name}</div>
              <div style={{fontSize:12,color:"#9ca3af",marginTop:1}}>{ownerLabel[env.owner]}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            {over&&<div className="badge" style={{background:"#ef444415",color:"#ef4444",marginBottom:3,fontSize:10}}>⚠️ Dépassé</div>}
            <span style={{fontSize:11,color:"#d1d5db"}}>détail →</span>
          </div>
        </div>
        {env.budget>0?(
          <div style={{marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <div><span style={{fontSize:16,fontWeight:700,color}}>{fmt(sp.spent)}</span><span style={{fontSize:13,color:"#9ca3af"}}> / {fmt(env.budget)}</span></div>
              <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99,background:color+"18",color}}>{Math.round(sp.pct||0)}%</span>
            </div>
            <div className="gauge-track"><div className="gauge-fill" style={{width:`${Math.min(100,sp.pct||0)}%`,background:`linear-gradient(90deg,${color}bb,${color})`}}/></div>
          </div>
        ):<div style={{marginTop:8,fontSize:13,color:"#9ca3af"}}>{fmt(sp.spent)} · <span style={{color:"#d1d5db"}}>pas de limite</span></div>}
      </div>
    );
  };

  const EnvPicker=({value,onChange})=>(
    <div>{["shared","cap","gui"].map(o=>{
      const envs=envelopes.filter(e=>e.owner===o);
      if(!envs.length)return null;
      return(
        <div key={o} style={{marginBottom:8}}>
          <div style={{fontSize:9,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>{ownerLabel[o]}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {envs.map(env=>(
              <button key={env.id} style={{background:value===env.id?env.color+"15":"rgba(255,255,255,.5)",border:`1.5px solid ${value===env.id?env.color:"rgba(255,255,255,.8)"}`,color:value===env.id?env.color:"#6b7280",borderRadius:9,padding:"6px 10px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all .15s",backdropFilter:"blur(8px)"}} onClick={()=>onChange(env.id)}>
                {env.emoji} {env.name}
              </button>
            ))}
          </div>
        </div>
      );
    })}</div>
  );

  // ── RENDER ──
  return(
    <div className="app">
      <style>{CSS}</style>
      <div className="blob1"/><div className="blob2"/><div className="blob3"/>

      {/* TOAST */}
      {toast&&<div className={`toast ${toastState}`}>{toast}</div>}

      {/* ── HEADER ── */}
      <div className="header-glass" style={{padding:"14px 16px 0",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:520,margin:"0 auto",position:"relative",zIndex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
            <div style={{fontWeight:800,fontSize:17,letterSpacing:"-.02em",color:"#1e1b2e"}}>
              💸 <span style={{background:"linear-gradient(90deg,#f43f8a,#8b5cf6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{nameCap} & {nameGui}</span>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {/* Month selector */}
              <div style={{display:"flex",alignItems:"center",gap:2,background:"rgba(255,255,255,.7)",backdropFilter:"blur(8px)",borderRadius:10,border:"1px solid rgba(255,255,255,.9)",overflow:"hidden"}}>
                <button onClick={()=>{setSelDay(null);filterMonth===0?setFilterMonth(11)||setFilterYear(y=>y-1):setFilterMonth(m=>m-1);}} style={{border:"none",background:"none",cursor:"pointer",padding:"5px 8px",fontSize:16,color:"#9ca3af",fontWeight:700,lineHeight:1}}>‹</button>
                <span style={{fontSize:12,color:"#374151",fontWeight:700,minWidth:68,textAlign:"center"}}>{MSHT[filterMonth]} {filterYear}</span>
                <button onClick={()=>{setSelDay(null);filterMonth===11?setFilterMonth(0)||setFilterYear(y=>y+1):setFilterMonth(m=>m+1);}} style={{border:"none",background:"none",cursor:"pointer",padding:"5px 8px",fontSize:16,color:"#9ca3af",fontWeight:700,lineHeight:1}}>›</button>
              </div>
              <button className="btn bg2 bsm" onClick={()=>setShowSettings(true)}>⚙️</button>
            </div>
          </div>
          <div style={{display:"flex",gap:12,overflowX:"auto",borderBottom:"1px solid rgba(0,0,0,.06)"}}>
            {[
              ["dashboard","🏠","Accueil",false],
              ["envelopes","✉️","Enveloppes",false],
              ["calendar","📅","Calendrier",urgentRec.length>0],
              ["balance","⚖️","Soldes",Math.abs(netDebt)>0.01],
              ["incomes","💰","Revenus",false],
              ["charts","📊","Stats",false],
            ].map(([k,ic,label,dot])=>(
              <button key={k} className={`tab${tab===k?" on":""}`} onClick={()=>setTab(k)} style={{display:"flex",alignItems:"center",gap:3}}>
                {ic} <span style={{fontSize:10}}>{label}</span>
                {dot&&<span style={{width:6,height:6,borderRadius:99,background:"#f43f8a",display:"inline-block",marginLeft:1}}/>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:"14px 16px 120px",maxWidth:520,margin:"0 auto",position:"relative",zIndex:1}}>

        {/* ═══ DASHBOARD ═══ */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* ── HERO : solde + barre budget ── */}
            <div className={soldeClass} style={{position:"relative",overflow:"hidden"}}>
              <div style={{fontSize:10,color:soldeColor,fontWeight:700,textTransform:"uppercase",letterSpacing:".14em",marginBottom:6}}>
                {MONTHS[filterMonth]} {filterYear}
              </div>
              {Math.abs(netDebt)<0.01
                ?<div style={{fontWeight:700,fontSize:19,color:"#3b82f6",marginBottom:10}}>🎉 Tout est équilibré !</div>
                :netDebt>0
                  ?<div style={{marginBottom:10}}><span style={{fontWeight:600,fontSize:13,color:"#059669"}}>{nameGui} doit </span><span style={{fontWeight:800,fontSize:26,color:"#059669",letterSpacing:"-.03em"}}>{fmt(netDebt)}</span><span style={{fontWeight:600,fontSize:13,color:"#059669"}}> à {nameCap}</span></div>
                  :<div style={{marginBottom:10}}><span style={{fontWeight:600,fontSize:13,color:"#be185d"}}>{nameCap} doit </span><span style={{fontWeight:800,fontSize:26,color:"#be185d",letterSpacing:"-.03em"}}>{fmt(Math.abs(netDebt))}</span><span style={{fontWeight:600,fontSize:13,color:"#be185d"}}> à {nameGui}</span></div>
              }
              {/* Barre budget stackée compacte */}
              <div style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,color:"#6b7280",fontWeight:600}}>Budget couple · {fmt(totalSpent)} dépensés</span>
                  <span style={{fontSize:11,color:"#9ca3af"}}>{fmt(capSpent+guiSpent)} / {fmt(SAL_CAP+SAL_GUI)}</span>
                </div>
                <div style={{height:8,borderRadius:99,background:"rgba(0,0,0,.07)",overflow:"hidden",display:"flex"}}>
                  <div style={{width:`${Math.min(100,(capSpent/(SAL_CAP+SAL_GUI))*100)}%`,background:"linear-gradient(90deg,#f43f8acc,#f43f8a)",transition:"width .8s",flexShrink:0,borderRadius:"99px 0 0 99px"}}/>
                  <div style={{width:`${Math.min(100,(guiSpent/(SAL_CAP+SAL_GUI))*100)}%`,background:"linear-gradient(90deg,#8b5cf6cc,#8b5cf6)",transition:"width .8s",flexShrink:0}}/>
                  <div style={{flex:1,background:"rgba(16,185,129,.18)",borderRadius:"0 99px 99px 0"}}/>
                </div>
                <div style={{display:"flex",gap:10,marginTop:5}}>
                  <span style={{fontSize:10,color:"#f43f8a",fontWeight:600}}>● {nameCap} {fmt(capSpent)}</span>
                  <span style={{fontSize:10,color:"#8b5cf6",fontWeight:600}}>● {nameGui} {fmt(guiSpent)}</span>
                  <span style={{fontSize:10,color:"#10b981",fontWeight:600,marginLeft:"auto"}}>Libre {fmt(Math.max(0,SAL_CAP+SAL_GUI-capBudgetAlloc-guiBudgetAlloc))}</span>
                </div>
              </div>
            </div>

            {/* ── 2 MINI-CARTES perso ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {person:"cap", name:nameCap, color:"#f43f8a", sal:SAL_CAP, alloc:capBudgetAlloc, spent:capSpent},
                {person:"gui", name:nameGui, color:"#8b5cf6", sal:SAL_GUI, alloc:guiBudgetAlloc, spent:guiSpent},
              ].map(({person,name,color,sal,alloc,spent})=>{
                const reste=sal-alloc;
                const overBudget=spent>alloc;
                const spentPct=Math.min(100,spent/sal*100);
                const allocPct=Math.min(100,alloc/sal*100);
                return(
                  <div key={person} style={{background:"rgba(255,255,255,.55)",backdropFilter:"blur(16px)",border:`1px solid rgba(255,255,255,.85)`,borderRadius:18,padding:"14px 14px 12px",borderTop:`3px solid ${color}`,cursor:"pointer"}} onClick={()=>{setEnvOwner(person);setTab("envelopes");}}>
                    <div style={{fontWeight:700,fontSize:13,color,marginBottom:10}}>{person==="cap"?"👩":"👨"} {name}</div>
                    {/* mini barre */}
                    <div style={{height:6,borderRadius:99,background:"rgba(0,0,0,.07)",overflow:"hidden",display:"flex",marginBottom:8}}>
                      <div style={{width:`${spentPct}%`,background:`linear-gradient(90deg,${color}99,${color})`,transition:"width .8s",flexShrink:0,borderRadius:"99px 0 0 99px"}}/>
                      <div style={{width:`${Math.max(0,allocPct-spentPct)}%`,background:`${color}22`,flexShrink:0}}/>
                      <div style={{flex:1,background:"rgba(16,185,129,.15)",borderRadius:"0 99px 99px 0"}}/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:11,color:"#9ca3af"}}>Dépensé</span>
                        <span style={{fontSize:12,fontWeight:700,color:overBudget?"#ef4444":color}}>{fmt(spent)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:11,color:"#9ca3af"}}>Budgeté</span>
                        <span style={{fontSize:12,fontWeight:600,color:"#6b7280"}}>{fmt(alloc)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",paddingTop:3,borderTop:"1px solid rgba(0,0,0,.05)"}}>
                        <span style={{fontSize:11,color:"#6b7280",fontWeight:600}}>Libre</span>
                        <span style={{fontSize:13,fontWeight:800,color:reste>=0?"#10b981":"#ef4444"}}>{fmt(Math.max(0,reste))}</span>
                      </div>
                    </div>
                    {overBudget&&<div style={{fontSize:10,color:"#ef4444",fontWeight:600,marginTop:6,background:"rgba(239,68,68,.07)",borderRadius:6,padding:"3px 7px"}}>⚠️ +{fmt(spent-alloc)}</div>}
                  </div>
                );
              })}
            </div>

            {/* ── CTA ── */}
            <button className="btn bp" style={{width:"100%",fontSize:15,padding:"13px"}} onClick={()=>setShowAddExp(true)}>+ Ajouter une dépense</button>

            {/* ── ENVELOPPES compactes ── */}
            <div className="glass" style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div className="sect" style={{margin:0}}>Enveloppes</div>
                <button className="btn bg2 bsm" onClick={()=>setTab("envelopes")} style={{fontSize:11}}>Tout voir →</button>
              </div>
              {envSpend.filter(e=>e.spent>0||e.budget>0).length===0
                ?<div className="empty-state" style={{padding:"20px 0"}}><div className="empty-icon" style={{fontSize:28}}>✨</div><div className="empty-text">Aucune dépense ce mois</div></div>
                :<div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {envSpend.filter(e=>e.spent>0||e.budget>0).map(env=>{
                    const over=env.pct>100, warn=env.pct>85;
                    const barColor=over?"#ef4444":warn?"#f97316":env.color;
                    return(
                      <div key={env.id} style={{cursor:"pointer"}} onClick={()=>{setEnvOwner(env.owner);setTab("envelopes");}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:14}}>{env.emoji}</span>
                            <span style={{fontSize:13,fontWeight:600,color:"#1e1b2e"}}>{env.name}</span>
                            <span style={{fontSize:10,color:"#d1d5db"}}>{env.owner==="shared"?"🤝":env.owner==="cap"?"👩":"👨"}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            {over&&<span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>⚠️</span>}
                            <span style={{fontSize:12,fontWeight:700,color:barColor}}>
                              {fmt(env.spent)}
                              {env.budget>0&&<span style={{color:"#d1d5db",fontWeight:400}}> / {fmt(env.budget)}</span>}
                            </span>
                          </div>
                        </div>
                        {env.budget>0&&(
                          <div style={{height:4,borderRadius:99,background:"rgba(0,0,0,.06)",overflow:"hidden"}}>
                            <div style={{width:`${Math.min(100,env.pct||0)}%`,height:"100%",borderRadius:99,background:"linear-gradient(90deg,"+barColor+"88,"+barColor+")",transition:"width .8s"}}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          </div>
        )}

        {/* ═══ ENVELOPES ═══ */}
        {tab==="envelopes"&&(
          <div>
            {/* Budget summary */}
            {envOwner==="cap"&&<div style={{marginBottom:12}}><BudgetBar person="cap"/></div>}
            {envOwner==="gui"&&<div style={{marginBottom:12}}><BudgetBar person="gui"/></div>}
            {envOwner==="shared"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <BudgetBar person="cap"/>
                <BudgetBar person="gui"/>
              </div>
            )}
            <div style={{display:"flex",gap:7,marginBottom:14}}>
              {["shared","cap","gui"].map(o=><button key={o} className={`otab${envOwner===o?" on":""}`} onClick={()=>setEnvOwner(o)}>{o==="shared"?"🤝 Commun":o==="cap"?`👩 ${nameCap}`:`👨 ${nameGui}`}</button>)}
            </div>
            {envSpend.filter(e=>e.owner===envOwner).length===0
              ?<div className="glass" style={{padding:20}}><div className="empty-state"><div className="empty-icon">📂</div><div className="empty-text">Aucune enveloppe</div></div></div>
              :envSpend.filter(e=>e.owner===envOwner).map(env=>(
                <div key={env.id} className="env-card" style={{borderLeftColor:env.color}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:42,height:42,borderRadius:12,background:env.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:21}}>{env.emoji}</div>
                      <div>
                        <div style={{fontWeight:600,fontSize:15,color:"#1e1b2e"}}>{env.name}</div>
                        {env.budget>0
                          ?<div style={{fontSize:12,color:env.pct>90?"#ef4444":"#9ca3af",marginTop:1}}>{fmt(env.spent)} / {fmt(env.budget)}</div>
                          :<div style={{fontSize:12,color:"#9ca3af",marginTop:1}}>{fmt(env.spent)} · pas de limite</div>
                        }
                      </div>
                    </div>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      {env.pct>90&&<span className="badge" style={{background:"#ef444415",color:"#ef4444"}}>⚠️</span>}
                      <button className="btn bg2 bsm" onClick={()=>{setEditEnv(env);setEnvForm({name:env.name,emoji:env.emoji,color:env.color,budget:env.budget||"",owner:env.owner});setShowAddEnv(true);}}>✏️</button>
                      <button className="btn bg2 bsm" style={{color:"#f43f8a"}} onClick={()=>delEnv(env.id)}>🗑️</button>
                    </div>
                  </div>
                  {env.budget>0&&(
                    <div style={{marginTop:10}}>
                      <div className="gauge-track"><div className="gauge-fill" style={{width:`${Math.min(100,env.pct||0)}%`,background:`linear-gradient(90deg,${env.pct>90?"#ef4444bb":env.pct>70?"#f97316bb":env.color+"bb"},${env.pct>90?"#ef4444":env.pct>70?"#f97316":env.color})`}}/></div>
                    </div>
                  )}
                </div>
              ))
            }
            <button className="btn bp" style={{width:"100%",marginTop:8}} onClick={()=>{setEditEnv(null);setEnvForm({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:envOwner});setShowAddEnv(true);}}>+ Nouvelle enveloppe</button>
          </div>
        )}

        {/* ═══ CALENDAR ═══ */}
        {tab==="calendar"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <button className={`otab${calView==="list"?" on":""}`} onClick={()=>setCalView("list")}>📋 Liste</button>
              <button className={`otab${calView==="grid"?" on":""}`} onClick={()=>setCalView("grid")}>📅 Grille</button>
              <div style={{flex:1}}/>
              <div style={{fontSize:13,color:"#6b7280",fontWeight:600}}>Total : <span style={{color:"#f43f8a"}}>{fmt(recurring.reduce((a,r)=>a+r.amount,0))}</span>/mois</div>
              <button className="btn bp bsm" onClick={()=>{setEditRec(null);setRecForm({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});setShowAddRec(true);}}>+ Ajouter</button>
            </div>

            {calView==="list"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...recurring].sort((a,b)=>a.dayOfMonth-b.dayOfMonth).map(r=>{
                  const [cp,gp]=computeParts(r.amount,r.splitType,"",ratio);
                  const dl=isCurMo?r.dayOfMonth-today:null;
                  return(
                    <div key={r.id} style={{display:"flex",gap:10,padding:"14px 16px",background:`linear-gradient(135deg,${r.color}0e,${r.color}05)`,borderRadius:16,border:`1px solid ${r.color}22`,borderLeft:`3px solid ${r.color}`,backdropFilter:"blur(10px)",alignItems:"center"}}>
                      <div style={{width:42,height:42,borderRadius:11,background:r.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{r.emoji}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:15,color:"#1e1b2e"}}>{r.label}</div>
                        <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>Chaque j.{r.dayOfMonth} · {slabel[r.splitType]}</div>
                        <div style={{fontSize:11,marginTop:2}}><span style={{color:"#f43f8a",fontWeight:600}}>{fmt(cp)}</span><span style={{color:"#d1d5db"}}> · </span><span style={{color:"#8b5cf6",fontWeight:600}}>{fmt(gp)}</span></div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontWeight:700,fontSize:16,color:r.color}}>{fmt(r.amount)}</div>
                        {dl!==null&&<span className="badge" style={{background:dl<=0?"#ef444415":dl<=3?r.color+"18":"rgba(0,0,0,.05)",color:dl<=0?"#ef4444":dl<=3?r.color:"#9ca3af",fontSize:11,marginTop:4,display:"block"}}>{dl<0?"Passé":dl===0?"Auj.":dl===1?"Dem.":`J+${dl}`}</span>}
                        <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"flex-end"}}>
                          <button className="btn bg2 bsm" onClick={()=>{setEditRec(r);setRecForm({...r,amount:r.amount});setShowAddRec(true);}}>✏️</button>
                          <button className="btn bg2 bsm" style={{color:"#f43f8a"}} onClick={()=>delRec(r.id)}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!recurring.length&&<div className="glass" style={{padding:20}}><div className="empty-state"><div className="empty-icon">📅</div><div className="empty-text">Aucune récurrente</div></div></div>}
              </div>
            )}

            {calView==="grid"&&(
              <div className="glass" style={{padding:14}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
                  {DAYS_S.map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,color:"#9ca3af",fontWeight:700,padding:"3px 0"}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                  {Array.from({length:firstDayOfMonth(filterMonth,filterYear)},(_,i)=><div key={`e${i}`} style={{minHeight:48}}/>)}
                  {Array.from({length:daysInMonth(filterMonth,filterYear)},(_,i)=>{
                    const day=i+1,recs=recByDay[day]||[],exps=expByDay[day]||[],isT=isCurMo&&day===today;
                    return(
                      <div key={day} className={`cal-cell${isT?" tod":""}`} onClick={()=>setSelDay(selDay===day?null:day)}>
                        <div style={{fontSize:9,fontWeight:700,color:isT?"#f43f8a":"#6b7280",textAlign:"right",paddingRight:2,marginBottom:1}}>{day}</div>
                        {recs.map(r=><div key={r.id} className="rdot" style={{background:r.color+"22",color:r.color}}>{r.emoji}</div>)}
                        {exps.length>0&&<div style={{width:"100%",height:2,background:"rgba(59,130,246,.3)",borderRadius:2,marginTop:1}}/>}
                      </div>
                    );
                  })}
                </div>
                {selDay&&(
                  <div style={{marginTop:12,background:"rgba(255,255,255,.6)",borderRadius:12,padding:12,border:"1px solid rgba(255,255,255,.8)"}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#6b7280",marginBottom:8}}>{selDay} {MONTHS[filterMonth]}</div>
                    {(recByDay[selDay]||[]).map(r=>{const[cp,gp]=computeParts(r.amount,r.splitType,"",ratio);return(
                      <div key={r.id} style={{padding:"9px 11px",background:r.color+"0e",borderRadius:10,border:`1px solid ${r.color}22`,marginBottom:6}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:14,color:r.color}}>{r.emoji} {r.label}</span><span style={{fontWeight:700,fontSize:14,color:"#1e1b2e"}}>{fmt(r.amount)}</span></div>
                        <div style={{fontSize:11,marginTop:2}}><span style={{color:"#f43f8a",fontWeight:600}}>{fmt(cp)}</span><span style={{color:"#d1d5db"}}> · </span><span style={{color:"#8b5cf6",fontWeight:600}}>{fmt(gp)}</span></div>
                      </div>
                    );})}
                    {(expByDay[selDay]||[]).map(e=>{const env=envelopes.find(v=>v.id===e.envelopeId);return(
                      <div key={e.id} style={{padding:"9px 11px",background:"rgba(255,255,255,.5)",borderRadius:10,border:"1px solid rgba(255,255,255,.8)",marginBottom:6,cursor:"pointer"}} onClick={()=>openEditExp(e)}>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:14,color:"#1e1b2e"}}>{env?.emoji} {e.label}</span><span style={{fontWeight:700,fontSize:14,color:"#1e1b2e"}}>{fmt(e.amount)}</span></div>
                        <div style={{fontSize:11,marginTop:2}}><span style={{color:"#f43f8a",fontWeight:600}}>{fmt(e.capPart)}</span><span style={{color:"#d1d5db"}}> · </span><span style={{color:"#8b5cf6",fontWeight:600}}>{fmt(e.guiPart)}</span></div>
                      </div>
                    );})}
                    {!(recByDay[selDay]?.length)&&!(expByDay[selDay]?.length)&&<div style={{color:"#9ca3af",fontSize:13}}>Rien ce jour</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ BALANCE ═══ */}
        {tab==="balance"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className={soldeClass}>
              <div style={{fontSize:10,color:soldeColor,fontWeight:700,textTransform:"uppercase",letterSpacing:".14em",marginBottom:8}}>Solde net {MONTHS[filterMonth]} {filterYear}</div>
              {Math.abs(netDebt)<0.01
                ?<div style={{fontWeight:700,fontSize:20,color:"#3b82f6",marginBottom:12}}>🎉 Tout à jour !</div>
                :netDebt>0
                  ?<div style={{fontWeight:800,fontSize:22,color:"#059669",letterSpacing:"-.02em",marginBottom:12}}>{nameGui} → {nameCap} · {fmt(netDebt)}</div>
                  :<div style={{fontWeight:800,fontSize:22,color:"#be185d",letterSpacing:"-.02em",marginBottom:12}}>{nameCap} → {nameGui} · {fmt(Math.abs(netDebt))}</div>
              }
              {rawDebt!==netDebt&&<div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>Brut {fmt(Math.abs(rawDebt))} · Remboursé {fmt(repaidThisMonth)}</div>}
              {Math.abs(netDebt)>0.01&&<button className="btn bp" style={{width:"100%"}} onClick={()=>markRepaid(Math.abs(netDebt))}>✅ Marquer remboursé · {fmt(Math.abs(netDebt))}</button>}
            </div>

            {debtByEnv.length>0&&(
              <div className="glass" style={{padding:16}}>
                <div className="sect" style={{margin:"0 0 10px"}}>Détail par enveloppe</div>
                {debtByEnv.map(env=>(
                  <div key={env.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid rgba(0,0,0,.05)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:17}}>{env.emoji}</span><div><div style={{fontWeight:600,fontSize:13}}>{env.name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{env.balance>0?`${nameGui} → ${nameCap}`:`${nameCap} → ${nameGui}`}</div></div></div>
                    <span style={{fontWeight:700,fontSize:14,color:env.balance>0?"#059669":"#be185d"}}>{fmt(Math.abs(env.balance))}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="glass" style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div className="sect" style={{margin:0}}>Dépenses — {MSHT[filterMonth]} {filterYear}</div>
                <button className="btn bp bsm" onClick={()=>setShowAddExp(true)}>+ Ajouter</button>
              </div>
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Rechercher…" value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
              </div>
              {searchedExp.length===0
                ?<div className="empty-state"><div className="empty-icon">💫</div><div className="empty-text">{searchQ?"Aucun résultat":"Aucune dépense ce mois"}</div></div>
                :(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {searchedExp.map(e=>{
                      const env=envelopes.find(v=>v.id===e.envelopeId);
                      return(
                        <div key={e.id} className="erow">
                          <div style={{width:36,height:36,borderRadius:10,background:(env?.color||"#999")+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{env?.emoji||"📦"}</div>
                          <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>openEditExp(e)}>
                            <div style={{fontWeight:600,fontSize:14,color:"#1e1b2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</div>
                            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{e.date} · {slabel[e.splitType]}</div>
                            <div style={{fontSize:11,marginTop:1}}><span style={{color:"#f43f8a",fontWeight:600}}>{fmt(e.capPart)}</span><span style={{color:"#d1d5db"}}> · </span><span style={{color:"#8b5cf6",fontWeight:600}}>{fmt(e.guiPart)}</span></div>
                          </div>
                          <div style={{fontWeight:700,fontSize:14,color:"#1e1b2e",flexShrink:0,marginRight:6}}>{fmt(e.amount)}</div>
                          <button className="btn bg2 bsm" onClick={()=>openEditExp(e)}>✏️</button>
                          <button className="del" onClick={()=>delExp(e.id)}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>

            {repayments.length>0&&(
              <div className="glass" style={{padding:16}}>
                <div className="sect" style={{margin:"0 0 10px"}}>Historique remboursements</div>
                {repayments.slice(0,8).map(r=>(
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(0,0,0,.05)"}}>
                    <span style={{fontSize:12,color:"#9ca3af"}}>{r.date}</span>
                    <span style={{fontSize:12,fontWeight:700,color:"#10b981"}}>✅ {fmt(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ INCOMES ═══ */}
        {tab==="incomes"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["cap",nameCap,"#f43f8a",capIncome,capSpent,capBalance],["gui",nameGui,"#8b5cf6",guiIncome,guiSpent,guiBalance]].map(([k,name,color,inc,sp,bal])=>(
                <div key={k} className="glass-sm" style={{padding:14,borderTop:`3px solid ${color}`}}>
                  <div style={{fontWeight:700,fontSize:13,color,marginBottom:10}}>{name}</div>
                  <div className="stat-row"><span style={{fontSize:12,color:"#9ca3af"}}>Revenus</span><span style={{fontSize:13,fontWeight:700,color:"#10b981"}}>{fmt(inc)}</span></div>
                  <div className="stat-row"><span style={{fontSize:12,color:"#9ca3af"}}>Dépenses</span><span style={{fontSize:13,fontWeight:700,color}}>{fmt(sp)}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between",paddingTop:6}}>
                    <span style={{fontSize:12,color:"#6b7280",fontWeight:600}}>Reste</span>
                    <span style={{fontSize:15,fontWeight:800,color:bal>=0?"#10b981":"#f43f8a"}}>{fmt(bal)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="glass" style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div className="sect" style={{margin:0}}>Revenus {MSHT[filterMonth]} {filterYear}</div>
                <button className="btn bp bsm" onClick={()=>setShowAddInc(true)}>+ Ajouter</button>
              </div>
              {filtInc.length===0
                ?<div className="empty-state"><div className="empty-icon">💸</div><div className="empty-text">Aucun revenu saisi ce mois.<br/>Ajoute vos salaires !</div></div>
                :filtInc.map(i=>{const t=INC_TYPES.find(x=>x.key===i.type)||INC_TYPES[3];return(
                  <div key={i.id} className="inc-row">
                    <div style={{width:38,height:38,borderRadius:10,background:i.person==="cap"?"rgba(244,63,138,.12)":"rgba(139,92,246,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{t.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14,color:"#1e1b2e"}}>{i.label}</div>
                      <div style={{fontSize:12,color:"#9ca3af",marginTop:1}}>{i.date} · {i.person==="cap"?`👩 ${nameCap}`:`👨 ${nameGui}`}</div>
                    </div>
                    <div style={{fontWeight:700,fontSize:15,color:"#10b981",marginRight:8}}>{fmt(i.amount)}</div>
                    <button className="del" onClick={()=>delInc(i.id)}>✕</button>
                  </div>
                );})
              }
            </div>
          </div>
        )}

        {/* ═══ CHARTS ═══ */}
        {tab==="charts"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:8}}>
              <button className={`otab${statsView==="month"?" on":""}`} style={{flex:1}} onClick={()=>setStatsView("month")}>📅 Ce mois</button>
              <button className={`otab${statsView==="year"?" on":""}`}  style={{flex:1}} onClick={()=>setStatsView("year")}>📆 Tendance</button>
            </div>

            {statsView==="month"&&(
              <>
                <div className="glass" style={{padding:20}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#1e1b2e",marginBottom:18}}>Répartition {MONTHS[filterMonth]} {filterYear}</div>
                  <MiniPie data={pieShared} title="🤝 Dépenses communes" accentColor="#374151"/>
                  <div className="divider"/>
                  <MiniPie data={pieCap} title={`👩 ${nameCap}`} accentColor="#f43f8a"/>
                  <div className="divider"/>
                  <MiniPie data={pieGui} title={`👨 ${nameGui}`} accentColor="#8b5cf6"/>
                  <div style={{marginTop:18,padding:"14px 16px",background:"rgba(255,255,255,.5)",borderRadius:13,border:"1px solid rgba(255,255,255,.8)"}}>
                    <div className="sect" style={{margin:"0 0 10px"}}>Résumé du mois</div>
                    {[["Total dépensé",fmt(totalSpent),"#374151"],[`Part ${nameCap}`,fmt(capSpent),"#f43f8a"],[`Part ${nameGui}`,fmt(guiSpent),"#8b5cf6"]].map(([l,v,c])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(0,0,0,.05)"}}>
                        <span style={{fontSize:13,color:"#6b7280"}}>{l}</span>
                        <span style={{fontSize:14,fontWeight:700,color:c}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {filtExp.length>0&&(
                  <div className="glass" style={{padding:16}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#374151",marginBottom:12}}>Par enveloppe</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={envSpend.filter(e=>e.spent>0).map(e=>({name:e.name,v:e.spent,color:e.color}))} margin={{left:-18,bottom:28}}>
                        <XAxis dataKey="name" tick={{fontSize:8,fill:"#9ca3af"}} angle={-30} textAnchor="end" interval={0}/>
                        <YAxis tick={{fontSize:9,fill:"#9ca3af"}}/>
                        <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"rgba(255,255,255,.97)",border:"1px solid rgba(0,0,0,.08)",borderRadius:10,fontFamily:"inherit",fontSize:12}}/>
                        <Bar dataKey="v" radius={[5,5,0,0]}>{envSpend.filter(e=>e.spent>0).map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {statsView==="year"&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["📊 Total",fmt(last6.reduce((a,h)=>a+h.total,0)),"#374151"],["📈 Moy.",fmt(last6.reduce((a,h)=>a+h.total,0)/Math.max(last6.filter(h=>h.total>0).length,1)),"#3b82f6"],[`👩 ${nameCap}`,fmt(last6.reduce((a,h)=>a+(h.month===filterMonth&&h.year===filterYear?capSpent:0),0)+capSpent),"#f43f8a"],[`👨 ${nameGui}`,fmt(last6.reduce((a,h)=>a+(h.month===filterMonth&&h.year===filterYear?guiSpent:0),0)+guiSpent),"#8b5cf6"]].map(([l,v,c])=>(
                    <div key={l} className="glass-sm" style={{padding:"14px 16px",borderTop:`3px solid ${c}`}}>
                      <div style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{l}</div>
                      <div style={{fontSize:20,fontWeight:800,color:c,letterSpacing:"-.02em"}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="glass" style={{padding:16}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1e1b2e",marginBottom:14}}>Tendance 6 mois</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={last6}>
                      <XAxis dataKey="name" tick={{fontSize:10,fill:"#9ca3af"}}/>
                      <YAxis tick={{fontSize:9,fill:"#9ca3af"}}/>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"rgba(255,255,255,.97)",border:"1px solid rgba(0,0,0,.08)",borderRadius:10,fontFamily:"inherit",fontSize:12}}/>
                      <Line type="monotone" dataKey="total" stroke="#f43f8a" strokeWidth={2.5} dot={{fill:"#f43f8a",strokeWidth:0,r:3}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass" style={{padding:16}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1e1b2e",marginBottom:12}}>Détail mensuel</div>
                  {[...last6].reverse().map(h=>{
                    const isCur=h.month===filterMonth&&h.year===filterYear;
                    return(
                      <div key={h.name+h.year} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(0,0,0,.05)"}}>
                        <div style={{width:38,height:38,borderRadius:10,background:isCur?"rgba(244,63,138,.12)":"rgba(255,255,255,.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isCur?"#f43f8a":"#6b7280",border:isCur?"1px solid rgba(244,63,138,.2)":"1px solid rgba(255,255,255,.8)",flexShrink:0}}>{h.name}</div>
                        <div style={{flex:1}}><div style={{fontSize:13,color:"#6b7280"}}>{h.year}</div></div>
                        <div style={{fontWeight:700,fontSize:15,color:isCur?"#f43f8a":"#1e1b2e"}}>{fmt(h.total)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {filtExp.length===0&&statsView==="month"&&<div style={{textAlign:"center",color:"#9ca3af",padding:"40px 0",fontSize:14}}>Pas de données ce mois</div>}
          </div>
        )}
      </div>

      {/* ══ QUICK ADD BAR ══ */}
      <div className="qa-wrap">
        {qaPreview&&(
          <div className="qa-prev">
            <span style={{fontSize:11,color:"#d1d5db"}}>→</span>
            <span className="qa-tag" style={{background:"rgba(0,0,0,.06)",color:"#374151"}}>{qaPreview.label}</span>
            <span className="qa-tag" style={{background:"rgba(244,63,138,.11)",color:"#f43f8a"}}>{fmt(qaPreview.amount)}</span>
            <span className="qa-tag" style={{background:(envelopes.find(e=>e.id===qaPreview.envelopeId)?.color||"#555")+"15",color:envelopes.find(e=>e.id===qaPreview.envelopeId)?.color||"#555"}}>
              {envelopes.find(e=>e.id===qaPreview.envelopeId)?.emoji} {envelopes.find(e=>e.id===qaPreview.envelopeId)?.name}
            </span>
            <span className="qa-tag" style={{background:"rgba(139,92,246,.11)",color:"#8b5cf6"}}>{slabel[qaPreview.splitType]}</span>
          </div>
        )}
        {!qaPreview&&<div className="hint">ex : "courses 47" · "café 12 50/50" · "loyer 800 gui"</div>}
        <div style={{position:"relative"}}>
          <input ref={qaRef} className="qa-input" placeholder='✨ Ajoute vite… "courses 47"' value={qaText} onChange={e=>setQaText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitQA();}}/>
          <button className="qa-btn" onClick={()=>qaPreview?submitQA():setShowAddExp(true)}>{qaPreview?"✓":"＋"}</button>
        </div>
      </div>

      {/* ══ MODAL : EXPENSE ══ */}
      {showAddExp&&(
        <div className="ov" onClick={()=>{setShowAddExp(false);setEditExp(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,color:"#1e1b2e",letterSpacing:"-.01em",marginBottom:18}}>{editExp?"✏️ Modifier":"➕ Nouvelle dépense"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div className="fl"><label>Intitulé</label><input placeholder="ex: Courses Lidl…" value={expForm.label} onChange={e=>setExpForm({...expForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="fl"><label>Montant €</label><input type="number" placeholder="0.00" value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})}/></div>
                <div className="fl"><label>Date</label><input type="date" value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})}/></div>
              </div>
              <div className="fl"><label>Enveloppe</label><EnvPicker value={expForm.envelopeId} onChange={v=>setExpForm({...expForm,envelopeId:v})}/></div>
              <div className="fl"><label>Payé par</label>
                <div style={{display:"flex",gap:8}}>
                  {[["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${expForm.paidBy===k?" on":""}`} style={{flex:1}} onClick={()=>setExpForm({...expForm,paidBy:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Répartition</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {SPLIT_OPTS.map(s=><button key={s.key} className={`chip${expForm.splitType===s.key?" on":""}`} onClick={()=>setExpForm({...expForm,splitType:s.key})}>{s.icon} {s.label}</button>)}
                </div>
                {expForm.splitType==="prorata"&&expForm.amount&&<div style={{fontSize:12,color:"#9ca3af",marginTop:5}}>{nameCap} {fmt(+expForm.amount*ratio)} · {nameGui} {fmt(+expForm.amount*(1-ratio))}</div>}
                {expForm.splitType==="custom"&&<input type="number" placeholder={`Part de ${nameCap} (€)`} value={expForm.capShare} onChange={e=>setExpForm({...expForm,capShare:e.target.value})} style={{marginTop:8}}/>}
              </div>
              <div className="fl"><label>Note (optionnel)</label><input placeholder="ex: avec les parents…" value={expForm.note} onChange={e=>setExpForm({...expForm,note:e.target.value})}/></div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn bp" style={{flex:1}} onClick={saveExpForm}>{editExp?"Sauvegarder":"Ajouter"}</button>
                <button className="btn bg2" onClick={()=>{setShowAddExp(false);setEditExp(null);}}>Annuler</button>
              </div>
              {editExp&&<button className="btn" style={{background:"rgba(244,63,138,.07)",color:"#f43f8a",border:"1px solid rgba(244,63,138,.18)",borderRadius:11,padding:"11px",fontSize:13,width:"100%",marginTop:4,fontWeight:600}} onClick={()=>{delExp(editExp.id);setShowAddExp(false);setEditExp(null);}}>🗑️ Supprimer cette dépense</button>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : INCOME ══ */}
      {showAddInc&&(
        <div className="ov" onClick={()=>setShowAddInc(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,color:"#1e1b2e",letterSpacing:"-.01em",marginBottom:18}}>💰 Nouveau revenu</div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div className="fl"><label>Intitulé</label><input placeholder="ex: Salaire avril…" value={incForm.label} onChange={e=>setIncForm({...incForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="fl"><label>Montant €</label><input type="number" placeholder="0.00" value={incForm.amount} onChange={e=>setIncForm({...incForm,amount:e.target.value})}/></div>
                <div className="fl"><label>Date</label><input type="date" value={incForm.date} onChange={e=>setIncForm({...incForm,date:e.target.value})}/></div>
              </div>
              <div className="fl"><label>Pour qui</label>
                <div style={{display:"flex",gap:8}}>
                  {[["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${incForm.person===k?" on":""}`} style={{flex:1}} onClick={()=>setIncForm({...incForm,person:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Type</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {INC_TYPES.map(t=><button key={t.key} className={`chip${incForm.type===t.key?" on":""}`} onClick={()=>setIncForm({...incForm,type:t.key})}>{t.emoji} {t.label}</button>)}
                </div>
              </div>
              <div className="fl"><label>Note</label><input placeholder="optionnel" value={incForm.note} onChange={e=>setIncForm({...incForm,note:e.target.value})}/></div>
              <div style={{display:"flex",gap:10}}>
                <button className="btn bp" style={{flex:1}} onClick={addIncome}>Ajouter</button>
                <button className="btn bg2" onClick={()=>setShowAddInc(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : ENVELOPE ══ */}
      {showAddEnv&&(
        <div className="ov" onClick={()=>{setShowAddEnv(false);setEditEnv(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,color:"#1e1b2e",letterSpacing:"-.01em",marginBottom:18}}>{editEnv?"Modifier enveloppe":"Nouvelle enveloppe"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div className="fl"><label>Nom</label><input placeholder="ex: Vacances, Loisirs…" value={envForm.name} onChange={e=>setEnvForm({...envForm,name:e.target.value})}/></div>
              <div className="fl"><label>Espace</label>
                <div style={{display:"flex",gap:7}}>
                  {[["shared","🤝 Commun"],["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${envForm.owner===k?" on":""}`} style={{flex:1,fontSize:12}} onClick={()=>setEnvForm({...envForm,owner:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Emoji</label><div className="eg">{EMOJIS.map(em=><div key={em} className={`eo${envForm.emoji===em?" on":""}`} onClick={()=>setEnvForm({...envForm,emoji:em})}>{em}</div>)}</div></div>
              <div className="fl"><label>Couleur</label><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PALETTE.map(c=><div key={c} className={`cd${envForm.color===c?" on":""}`} style={{background:c}} onClick={()=>setEnvForm({...envForm,color:c})}/>)}</div></div>
              <div className="fl"><label>Budget mensuel €</label><input type="number" placeholder="0 = pas de limite" value={envForm.budget} onChange={e=>setEnvForm({...envForm,budget:e.target.value})}/></div>
              <div style={{display:"flex",gap:10}}>
                <button className="btn bp" style={{flex:1}} onClick={submitEnv}>{editEnv?"Sauvegarder":"Créer"}</button>
                <button className="btn bg2" onClick={()=>{setShowAddEnv(false);setEditEnv(null);}}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : RECURRING ══ */}
      {showAddRec&&(
        <div className="ov" onClick={()=>{setShowAddRec(false);setEditRec(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,color:"#1e1b2e",letterSpacing:"-.01em",marginBottom:18}}>{editRec?"Modifier récurrente":"Nouvelle récurrente"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div className="fl"><label>Nom</label><input placeholder="ex: EDF, Netflix…" value={recForm.label} onChange={e=>setRecForm({...recForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="fl"><label>Montant estimé €</label><input type="number" value={recForm.amount} onChange={e=>setRecForm({...recForm,amount:e.target.value})}/></div>
                <div className="fl"><label>Jour du mois</label><input type="number" min="1" max="31" value={recForm.dayOfMonth} onChange={e=>setRecForm({...recForm,dayOfMonth:e.target.value})}/></div>
              </div>
              <div className="fl"><label>Emoji</label><div className="eg">{EMOJIS.map(em=><div key={em} className={`eo${recForm.emoji===em?" on":""}`} onClick={()=>setRecForm({...recForm,emoji:em})}>{em}</div>)}</div></div>
              <div className="fl"><label>Couleur</label><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PALETTE.map(c=><div key={c} className={`cd${recForm.color===c?" on":""}`} style={{background:c}} onClick={()=>setRecForm({...recForm,color:c})}/>)}</div></div>
              <div className="fl"><label>Enveloppe</label><EnvPicker value={recForm.envelopeId} onChange={v=>setRecForm({...recForm,envelopeId:v})}/></div>
              <div className="fl"><label>Payé par</label>
                <div style={{display:"flex",gap:8}}>
                  {[["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${recForm.paidBy===k?" on":""}`} style={{flex:1}} onClick={()=>setRecForm({...recForm,paidBy:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Répartition</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {SPLIT_OPTS.map(s=><button key={s.key} className={`chip${recForm.splitType===s.key?" on":""}`} onClick={()=>setRecForm({...recForm,splitType:s.key})}>{s.icon} {s.label}</button>)}
                </div>
              </div>
              <div className="fl"><label>Note</label><input placeholder="ex: variable selon saison…" value={recForm.note} onChange={e=>setRecForm({...recForm,note:e.target.value})}/></div>
              <div style={{display:"flex",gap:10}}>
                <button className="btn bp" style={{flex:1}} onClick={submitRec}>{editRec?"Sauvegarder":"Créer"}</button>
                <button className="btn bg2" onClick={()=>{setShowAddRec(false);setEditRec(null);}}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : SETTINGS ══ */}
      {showSettings&&(
        <div className="ov" onClick={()=>setShowSettings(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700,fontSize:18,color:"#1e1b2e",letterSpacing:"-.01em",marginBottom:18}}>⚙️ Réglages</div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="fl"><label>Prénom 1</label><input value={setForm2.nameCap} onChange={e=>setSetForm2({...setForm2,nameCap:e.target.value})}/></div>
                <div className="fl"><label>Prénom 2</label><input value={setForm2.nameGui} onChange={e=>setSetForm2({...setForm2,nameGui:e.target.value})}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div className="fl"><label>Salaire {setForm2.nameCap} €</label><input type="number" placeholder="2200" value={setForm2.salCap||""} onChange={e=>setSetForm2({...setForm2,salCap:e.target.value})}/></div>
                <div className="fl"><label>Salaire {setForm2.nameGui} €</label><input type="number" placeholder="2900" value={setForm2.salGui||""} onChange={e=>setSetForm2({...setForm2,salGui:e.target.value})}/></div>
              </div>
              <div className="fl">
                <label>Part de {setForm2.nameCap} (pro rata %)</label>
                <input type="number" min="0" max="100" value={setForm2.ratioCap} onChange={e=>setSetForm2({...setForm2,ratioCap:e.target.value})}/>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:4}}>{setForm2.nameCap} {setForm2.ratioCap}% · {setForm2.nameGui} {100-(parseInt(setForm2.ratioCap)||0)}%</div>
              </div>
              <div style={{background:"rgba(255,255,255,.5)",border:"1px solid rgba(255,255,255,.8)",borderRadius:12,padding:"12px 14px",fontSize:13,color:"#6b7280",lineHeight:1.7,backdropFilter:"blur(8px)"}}>
                ℹ️ Les données sont partagées via Supabase — les deux téléphones se synchronisent en temps réel.
              </div>
              <div style={{display:"flex",gap:10}}>
                <button className="btn bp" style={{flex:1}} onClick={saveSettings}>Sauvegarder</button>
                <button className="btn bg2" onClick={()=>setShowSettings(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
