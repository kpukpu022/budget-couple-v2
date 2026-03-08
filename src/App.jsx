import { useState, useEffect, useCallback, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const SK = { exp:"bcv5_exp", env:"bcv5_env", set:"bcv5_set", rec:"bcv5_rec", inc:"bcv5_inc", rep:"bcv5_rep" };
const PALETTE = ["#f43f8a","#a855f7","#3b82f6","#10b981","#f59e0b","#ef4444","#06b6d4","#84cc16","#ec4899","#8b5cf6","#14b8a6","#f97316"];
const EMOJIS  = ["🛒","🏠","🍽️","🚆","👩","👨","💊","📦","✈️","🎬","☕","🎮","💄","🐶","🌿","🎁","⚡","💧","📱","🏋️","🎵","🧴","🏥","🎓","👗","🍷","🎯","🏖️"];
const MONTHS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MSHT    = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS_S  = ["L","M","M","J","V","S","D"];

const DEFAULT_SETTINGS = { ratioCap:60, names:["Capucine","Guillaume"] };
const DEFAULT_ENVELOPES = [
  { id:"ec1", name:"Courses",        emoji:"🛒", color:"#f43f8a", budget:400, owner:"shared" },
  { id:"ec2", name:"Loyer & charges",emoji:"🏠", color:"#a855f7", budget:0,   owner:"shared" },
  { id:"ec3", name:"Sorties",        emoji:"🍽️", color:"#3b82f6", budget:200, owner:"shared" },
  { id:"ec4", name:"Transport",      emoji:"🚆", color:"#10b981", budget:150, owner:"shared" },
  { id:"ec5", name:"Santé",          emoji:"💊", color:"#06b6d4", budget:50,  owner:"shared" },
  { id:"ep1", name:"Mode & beauté",  emoji:"👗", color:"#ec4899", budget:80,  owner:"cap"    },
  { id:"ep2", name:"Loisirs Cap",    emoji:"🎯", color:"#f97316", budget:60,  owner:"cap"    },
  { id:"eg1", name:"Loisirs Gui",    emoji:"🎮", color:"#8b5cf6", budget:60,  owner:"gui"    },
  { id:"eg2", name:"Sport Gui",      emoji:"🏋️", color:"#14b8a6", budget:40,  owner:"gui"    },
  { id:"ea1", name:"Autre",          emoji:"📦", color:"#f59e0b", budget:0,   owner:"shared" },
];
const DEFAULT_RECURRING = [
  { id:"r1", label:"Loyer",       emoji:"🏠", dayOfMonth:1,  amount:800, splitType:"prorata", paidBy:"cap", envelopeId:"ec2", color:"#a855f7", note:"" },
  { id:"r2", label:"Facture EDF", emoji:"⚡", dayOfMonth:5,  amount:80,  splitType:"prorata", paidBy:"cap", envelopeId:"ec2", color:"#f59e0b", note:"Variable" },
  { id:"r3", label:"Internet",    emoji:"📱", dayOfMonth:10, amount:35,  splitType:"equal",   paidBy:"gui", envelopeId:"ec2", color:"#3b82f6", note:"" },
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

const fmt  = n => `${Number(n||0).toFixed(2)} €`;
const gid  = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const daysInMonth   = (m,y) => new Date(y,m+1,0).getDate();
const firstDayOfMonth=(m,y) => { let d=new Date(y,m,1).getDay(); return d===0?6:d-1; };

function computeParts(amt,splitType,capShare,ratio){
  if(splitType==="prorata")  return [amt*ratio,      amt*(1-ratio)];
  if(splitType==="equal")    return [amt/2,           amt/2];
  if(splitType==="cap_only") return [amt,             0];
  if(splitType==="gui_only") return [0,               amt];
  if(splitType==="custom")   { const c=parseFloat(capShare)||0; return [c,amt-c]; }
  return [amt*ratio,amt*(1-ratio)];
}

// Smart parser for quick add: "courses 47" / "47 loyer gui" / "café 12 50/50"
function parseQuickAdd(raw, envelopes, settings){
  const text = raw.toLowerCase().trim();
  const ratio = settings.ratioCap/100;
  const nameCap = settings.names[0].toLowerCase();
  const nameGui = settings.names[1].toLowerCase();
  
  // Extract amount
  const amtMatch = text.match(/\b(\d+([.,]\d{1,2})?)\b/);
  const amount = amtMatch ? parseFloat(amtMatch[1].replace(",",".")) : null;
  if(!amount) return null;

  // Detect split
  let splitType = "prorata";
  if(/50.50|moitié|égal|equal/.test(text)) splitType = "equal";
  else if(new RegExp(nameGui+"\\s*seul|que\\s*"+nameGui).test(text)) splitType = "gui_only";
  else if(new RegExp(nameCap+"\\s*seule|que\\s*"+nameCap).test(text)) splitType = "cap_only";
  else if(/perso\s*gui|gui\s*perso/.test(text)) splitType = "gui_only";
  else if(/perso\s*cap|cap\s*perso/.test(text)) splitType = "cap_only";

  // Detect paidBy
  let paidBy = "cap";
  if(new RegExp("\\b("+nameGui.slice(0,3)+"|gui)\\b").test(text)) paidBy = "gui";

  // Detect envelope by keyword matching
  let envelopeId = envelopes[0]?.id || "";
  const envScores = envelopes.map(env => {
    const keywords = env.name.toLowerCase().split(/[\s&/]+/);
    const score = keywords.reduce((s,k) => s + (text.includes(k.slice(0,4)) ? 2 : 0), 0)
                + (text.includes(env.emoji) ? 5 : 0);
    return { id: env.id, score };
  });
  const best = envScores.sort((a,b) => b.score-a.score)[0];
  if(best && best.score > 0) envelopeId = best.id;

  // Label = text minus amount and keywords
  const label = text
    .replace(amtMatch?.[0]||"","")
    .replace(/\b(euros?|€|50.50|pro.rata|perso|seul[e]?|gui|cap)\b/gi,"")
    .trim()
    .replace(/\s+/g," ")
    || "Dépense";

  const labelCap = label.charAt(0).toUpperCase()+label.slice(1);

  const [capPart,guiPart] = computeParts(amount,splitType,"",ratio);
  const balance = paidBy==="cap" ? guiPart : -capPart;

  return {
    id:gid(), label:labelCap, amount,
    envelopeId, paidBy, splitType,
    capPart:parseFloat(capPart.toFixed(2)),
    guiPart:parseFloat(guiPart.toFixed(2)),
    balance:parseFloat(balance.toFixed(2)),
    date:new Date().toISOString().slice(0,10), note:""
  };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Syne:wght@700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#0a0a10;}::-webkit-scrollbar-thumb{background:#2a2a3e;border-radius:2px;}
input,select,textarea{outline:none;background:#13131f;border:1.5px solid #222232;border-radius:10px;padding:10px 14px;color:#f0ecff;font-family:inherit;font-size:14px;width:100%;transition:border .15s;}
input:focus,select:focus{border-color:#f43f8a;}
.btn{border:none;cursor:pointer;font-family:inherit;font-weight:600;transition:all .15s;}
.bp{background:linear-gradient(135deg,#f43f8a,#c026d3);color:white;border-radius:12px;padding:11px 22px;font-size:14px;letter-spacing:-.01em;}
.bp:hover{opacity:.88;transform:translateY(-1px);}
.bp:active{transform:translateY(0);}
.bg{background:#151520;color:#777;border:1.5px solid #222232;border-radius:10px;padding:8px 14px;font-size:13px;}
.bg:hover{border-color:#333350;color:#ccc;}
.bsm{padding:5px 10px!important;font-size:11px!important;border-radius:7px!important;}
.card{background:#0e0e18;border:1px solid #1a1a28;border-radius:16px;}
.tab{background:none;border:none;cursor:pointer;font-family:inherit;font-weight:600;font-size:11px;padding:8px 1px;color:#444;transition:color .15s;border-bottom:2px solid transparent;white-space:nowrap;flex-shrink:0;position:relative;}
.tab.on{color:#f43f8a;border-bottom-color:#f43f8a;}
.chip{background:#151520;border:1.5px solid #222232;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600;color:#666;cursor:pointer;transition:all .15s;}
.chip.on{border-color:#f43f8a;color:#f43f8a;background:#1d0a14;}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:flex-end;justify-content:center;padding:12px;}
.sh{background:#0e0e18;border:1px solid #1a1a28;border-radius:22px;padding:22px;width:100%;max-width:500px;max-height:93vh;overflow-y:auto;}
.fl{display:flex;flex-direction:column;gap:5px;}
.fl label{font-size:10px;font-weight:700;color:#444;letter-spacing:.08em;text-transform:uppercase;}
.pb{height:5px;border-radius:99px;background:#1a1a28;overflow:hidden;}
.pf{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.4,0,.2,1);}
.erow{display:flex;align-items:center;gap:10px;padding:11px 13px;background:#0e0e18;border:1px solid #1a1a28;border-radius:12px;transition:all .15s;}
.erow:hover{border-color:#2a2a40;background:#111120;}
.del{background:none;border:none;color:#333;cursor:pointer;font-size:13px;padding:4px 6px;border-radius:6px;transition:all .15s;}
.del:hover{color:#f43f8a;background:#1d0a14;}
.eg{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;}
.eo{border:2px solid transparent;background:#151520;border-radius:7px;padding:5px;font-size:16px;cursor:pointer;text-align:center;transition:all .15s;}
.eo.on{border-color:#f43f8a;background:#1d0a14;}
.cd{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .15s;flex-shrink:0;}
.cd.on{border-color:white;transform:scale(1.25);}
.cal-cell{min-height:52px;border-radius:8px;padding:3px;background:#0a0a12;border:1px solid #131320;cursor:pointer;transition:all .15s;}
.cal-cell:hover{border-color:#252540;}
.cal-cell.tod{border-color:#f43f8a44;background:#130810;}
.rdot{width:100%;border-radius:3px;padding:1px 3px;font-size:8px;font-weight:700;margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.otab{background:#151520;border:1.5px solid #222232;border-radius:8px;padding:5px 11px;font-size:11px;font-weight:700;color:#555;cursor:pointer;transition:all .15s;}
.otab.on{border-color:#f43f8a;color:#f43f8a;background:#1d0a14;}
.sect{font-family:Syne,sans-serif;font-weight:700;font-size:11px;color:#444;letter-spacing:.1em;text-transform:uppercase;margin:12px 0 6px 2px;}
.badge{display:inline-flex;align-items:center;justify-content:center;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:800;}
.badge-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0;}

/* Quick add bar */
.qa-bar{position:fixed;bottom:0;left:0;right:0;z-index:100;padding:12px 16px 20px;background:linear-gradient(0deg,#0a0a10 70%,transparent);max-width:520px;margin:0 auto;left:50%;transform:translateX(-50%);}
.qa-input{width:100%;background:#12121e;border:1.5px solid #252535;border-radius:14px;padding:13px 50px 13px 16px;color:#f0ecff;font-family:inherit;font-size:14px;outline:none;transition:border .2s,box-shadow .2s;}
.qa-input:focus{border-color:#f43f8a;box-shadow:0 0 0 3px #f43f8a18;}
.qa-send{position:absolute;right:24px;top:50%;transform:translateY(-60%);background:linear-gradient(135deg,#f43f8a,#c026d3);border:none;border-radius:10px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;transition:opacity .15s;}
.qa-send:hover{opacity:.85;}
.qa-preview{background:#12121e;border:1px solid #252535;border-radius:12px;padding:10px 14px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.qa-tag{padding:3px 8px;border-radius:99px;font-size:11px;font-weight:700;}
.hint{font-size:10px;color:#333;text-align:center;margin-bottom:4px;}

/* Search bar */
.search-wrap{position:relative;margin-bottom:10px;}
.search-input{padding-left:34px!important;}
.search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;}

/* Stat row */
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #141422;}
.stat-row:last-child{border-bottom:none;}
`;

export default function App(){
  const [expenses,  setExpenses]  = useState([]);
  const [envelopes, setEnvelopes] = useState(DEFAULT_ENVELOPES);
  const [settings,  setSettings]  = useState(DEFAULT_SETTINGS);
  const [recurring, setRecurring] = useState(DEFAULT_RECURRING);
  const [incomes,   setIncomes]   = useState([]);
  const [repayments,setRepayments]= useState([]);
  const [loaded,    setLoaded]    = useState(false);
  const [tab,       setTab]       = useState("dashboard");
  const [filterMonth,setFilterMonth]=useState(new Date().getMonth());
  const [filterYear, setFilterYear] =useState(new Date().getFullYear());

  // Modals & UI
  const [showAddExp, setShowAddExp]  = useState(false);
  const [showAddEnv, setShowAddEnv]  = useState(false);
  const [showAddRec, setShowAddRec]  = useState(false);
  const [showAddInc, setShowAddInc]  = useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [editEnv,   setEditEnv]    = useState(null);
  const [editRec,   setEditRec]    = useState(null);
  const [editExp,   setEditExp]    = useState(null); // expense being edited
  const [envOwner,  setEnvOwner]   = useState("shared");
  const [calView,   setCalView]    = useState("list");
  const [selDay,    setSelDay]     = useState(null);
  const [searchQ,   setSearchQ]    = useState("");

  // Quick add
  const [qaText,   setQaText]    = useState("");
  const [qaPreview,setQaPreview] = useState(null);
  const qaRef = useRef(null);

  const [expForm, setExpForm] = useState({label:"",amount:"",envelopeId:"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});
  const [envForm, setEnvForm] = useState({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:"shared"});
  const [recForm, setRecForm] = useState({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});
  const [incForm, setIncForm] = useState({label:"",amount:"",person:"cap",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
  const [setForm2,setSetForm2]= useState({ratioCap:60,nameCap:"Capucine",nameGui:"Guillaume"});

  const ratio   = settings.ratioCap/100;
  const nameCap = settings.names?.[0]||"Capucine";
  const nameGui = settings.names?.[1]||"Guillaume";
  const today   = new Date().getDate();
  const isCurMo = filterMonth===new Date().getMonth()&&filterYear===new Date().getFullYear();

  useEffect(()=>{
    async function load(){
      try{
        const res=await Promise.allSettled(Object.values(SK).map(k=>window.storage.get(k,true)));
        const parse=r=>r.status==="fulfilled"&&r.value?.value?JSON.parse(r.value.value):null;
        const [e,v,s,r,i,p]=res.map(parse);
        if(e)setExpenses(e); if(v)setEnvelopes(v);
        if(s){setSettings(s);setSetForm2({ratioCap:s.ratioCap,nameCap:s.names[0],nameGui:s.names[1]});}
        if(r)setRecurring(r); if(i)setIncomes(i); if(p)setRepayments(p);
      }catch{}
      setLoaded(true);
    }
    load();
  },[]);

  const persist=useCallback(async(key,data)=>{try{await window.storage.set(key,JSON.stringify(data),true);}catch{}},[]);

  // Quick add parse on type
  useEffect(()=>{
    if(qaText.length>2){
      const p=parseQuickAdd(qaText,envelopes,settings);
      setQaPreview(p);
    } else {
      setQaPreview(null);
    }
  },[qaText,envelopes,settings]);

  // Derived
  const filtExp=expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;});
  const filtInc=incomes.filter(i=>{const d=new Date(i.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;});
  
  const searchedExp = searchQ.trim()
    ? filtExp.filter(e=>e.label.toLowerCase().includes(searchQ.toLowerCase())||envelopes.find(v=>v.id===e.envelopeId)?.name.toLowerCase().includes(searchQ.toLowerCase()))
    : filtExp;

  const totalSpent=filtExp.reduce((a,e)=>a+e.amount,0);
  const capSpent=filtExp.reduce((a,e)=>a+e.capPart,0);
  const guiSpent=filtExp.reduce((a,e)=>a+e.guiPart,0);
  const capIncome=filtInc.filter(i=>i.person==="cap").reduce((a,i)=>a+i.amount,0);
  const guiIncome=filtInc.filter(i=>i.person==="gui").reduce((a,i)=>a+i.amount,0);
  const capBalance=capIncome-capSpent;
  const guiBalance=guiIncome-guiSpent;
  const rawDebt=filtExp.reduce((a,e)=>a+e.balance,0);
  const repaidThisMonth=repayments.filter(r=>{const d=new Date(r.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;}).reduce((a,r)=>a+r.amount,0);
  const netDebt=rawDebt-repaidThisMonth;

  const envSpend=envelopes.map(env=>{
    const spent=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);
    return {...env,spent,pct:env.budget>0?Math.min(100,spent/env.budget*100):null};
  });

  // Badge: récurrentes urgentes (dans <=3 jours)
  const urgentRec=recurring.filter(r=>isCurMo&&r.dayOfMonth>=today&&r.dayOfMonth-today<=3);

  const debtByEnv=envelopes.map(env=>{
    const bal=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.balance,0);
    return {...env,balance:parseFloat(bal.toFixed(2))};
  }).filter(e=>Math.abs(e.balance)>0.01);

  const pieShared=envelopes.filter(e=>e.owner==="shared").map(env=>{const v=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);return{name:env.name,value:parseFloat(v.toFixed(2)),color:env.color};}).filter(e=>e.value>0);
  const pieCap   =envelopes.filter(e=>e.owner==="cap"   ).map(env=>{const v=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);return{name:env.name,value:parseFloat(v.toFixed(2)),color:env.color};}).filter(e=>e.value>0);
  const pieGui   =envelopes.filter(e=>e.owner==="gui"   ).map(env=>{const v=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);return{name:env.name,value:parseFloat(v.toFixed(2)),color:env.color};}).filter(e=>e.value>0);

  const last6=Array.from({length:6},(_,i)=>{
    const d=new Date(filterYear,filterMonth-5+i,1);
    const m=d.getMonth(),y=d.getFullYear();
    const total=expenses.filter(e=>{const dd=new Date(e.date);return dd.getMonth()===m&&dd.getFullYear()===y;}).reduce((a,e)=>a+e.amount,0);
    return{name:MSHT[m],total:parseFloat(total.toFixed(2))};
  });

  const recByDay={},expByDay={};
  recurring.forEach(r=>{if(!recByDay[r.dayOfMonth])recByDay[r.dayOfMonth]=[];recByDay[r.dayOfMonth].push(r);});
  filtExp.forEach(e=>{const d=new Date(e.date).getDate();if(!expByDay[d])expByDay[d]=[];expByDay[d].push(e);});
  const upcoming=recurring.filter(r=>isCurMo&&r.dayOfMonth>=today).sort((a,b)=>a.dayOfMonth-b.dayOfMonth).slice(0,4);

  // Actions
  function addExpense(data){
    const next=[data,...expenses]; setExpenses(next); persist(SK.exp,next);
  }
  function saveExpForm(){
    const amt=parseFloat(expForm.amount);
    if(!expForm.label.trim()||isNaN(amt)||amt<=0||!expForm.envelopeId)return;
    const [cp,gp]=computeParts(amt,expForm.splitType,expForm.capShare,ratio);
    const balance=expForm.paidBy==="cap"?gp:-cp;
    const exp={id:editExp?editExp.id:gid(),label:expForm.label,amount:amt,envelopeId:expForm.envelopeId,paidBy:expForm.paidBy,splitType:expForm.splitType,capPart:parseFloat(cp.toFixed(2)),guiPart:parseFloat(gp.toFixed(2)),balance:parseFloat(balance.toFixed(2)),date:expForm.date,note:expForm.note};
    const next=editExp?expenses.map(e=>e.id===editExp.id?exp:e):[exp,...expenses];
    setExpenses(next); persist(SK.exp,next);
    setShowAddExp(false); setEditExp(null);
    setExpForm({label:"",amount:"",envelopeId:"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});
  }
  function openEditExp(e){
    setEditExp(e);
    setExpForm({label:e.label,amount:String(e.amount),envelopeId:e.envelopeId,paidBy:e.paidBy,splitType:e.splitType,capShare:"",date:e.date,note:e.note||""});
    setShowAddExp(true);
  }
  function delExp(id){const n=expenses.filter(e=>e.id!==id);setExpenses(n);persist(SK.exp,n);}
  function submitQA(){
    if(!qaPreview)return;
    addExpense(qaPreview);
    setQaText(""); setQaPreview(null);
  }

  function submitEnv(){
    if(!envForm.name.trim())return;
    const entry={...envForm,budget:parseFloat(envForm.budget)||0};
    const next=editEnv?envelopes.map(e=>e.id===editEnv.id?{...e,...entry}:e):[...envelopes,{...entry,id:gid()}];
    setEnvelopes(next);persist(SK.env,next);setShowAddEnv(false);setEditEnv(null);
    setEnvForm({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:"shared"});
  }
  function delEnv(id){const n=envelopes.filter(e=>e.id!==id);setEnvelopes(n);persist(SK.env,n);}

  function submitRec(){
    if(!recForm.label.trim())return;
    const entry={...recForm,id:editRec?editRec.id:gid(),dayOfMonth:parseInt(recForm.dayOfMonth)||1,amount:parseFloat(recForm.amount)||0};
    const next=editRec?recurring.map(r=>r.id===editRec.id?entry:r):[...recurring,entry];
    setRecurring(next);persist(SK.rec,next);setShowAddRec(false);setEditRec(null);
    setRecForm({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});
  }
  function delRec(id){const n=recurring.filter(r=>r.id!==id);setRecurring(n);persist(SK.rec,n);}

  function addIncome(){
    const amt=parseFloat(incForm.amount);
    if(!incForm.label.trim()||isNaN(amt)||amt<=0)return;
    const entry={id:gid(),...incForm,amount:amt};
    const next=[entry,...incomes];setIncomes(next);persist(SK.inc,next);
    setShowAddInc(false);setIncForm({label:"",amount:"",person:"cap",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
  }
  function delInc(id){const n=incomes.filter(i=>i.id!==id);setIncomes(n);persist(SK.inc,n);}
  function markRepaid(amount){
    const entry={id:gid(),amount,date:new Date().toISOString().slice(0,10)};
    const next=[entry,...repayments];setRepayments(next);persist(SK.rep,next);
  }
  function saveSettings(){
    const s={ratioCap:parseInt(setForm2.ratioCap)||60,names:[setForm2.nameCap,setForm2.nameGui]};
    setSettings(s);persist(SK.set,s);setShowSettings(false);
  }

  const slabel={prorata:`⚖️ ${settings.ratioCap}/${100-settings.ratioCap}`,equal:"🤝 50/50",cap_only:`👩 ${nameCap}`,gui_only:`👨 ${nameGui}`,custom:"✏️ Perso"};
  const ownerLabel={shared:"🤝 Commun",cap:`👩 ${nameCap}`,gui:`👨 ${nameGui}`};

  if(!loaded) return <div style={{minHeight:"100vh",background:"#0a0a10",display:"flex",alignItems:"center",justifyContent:"center",color:"#444",fontFamily:"sans-serif",fontSize:14}}>Chargement…</div>;

  // ── Mini helpers ──
  const MiniPie=({data,title})=>{
    if(!data.length)return<div style={{color:"#333",fontSize:12,textAlign:"center",padding:"16px 0"}}>Aucune dépense</div>;
    const total=data.reduce((a,d)=>a+d.value,0);
    return(
      <div>
        <div style={{fontSize:10,fontWeight:700,color:"#444",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>{title} · <span style={{color:"#888"}}>{fmt(total)}</span></div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <ResponsiveContainer width={110} height={110}>
            <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2} dataKey="value">
              {data.map((d,i)=><Cell key={i} fill={d.color}/>)}
            </Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#13131f",border:"1px solid #252535",borderRadius:8,fontFamily:"inherit",fontSize:10}}/></PieChart>
          </ResponsiveContainer>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:3}}>
            {data.map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:6,height:6,borderRadius:99,background:d.color,flexShrink:0}}/>
                  <span style={{fontSize:11,color:"#777"}}>{d.name}</span>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:"#aaa"}}>{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const EnvList=({owner})=>{
    const list=envSpend.filter(e=>e.owner===owner);
    if(!list.length)return<div style={{color:"#333",fontSize:12,textAlign:"center",padding:"20px 0"}}>Aucune enveloppe</div>;
    return(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {list.map(env=>(
          <div key={env.id} style={{padding:"12px 14px",background:"#0e0e18",border:`1px solid ${env.color}28`,borderRadius:13,borderLeft:`3px solid ${env.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:34,height:34,borderRadius:9,background:env.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{env.emoji}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{env.name}</div>
                  {env.budget>0&&<div style={{fontSize:10,color:env.pct>90?"#f43f8a":"#444",marginTop:1}}>{fmt(env.spent)} / {fmt(env.budget)}</div>}
                  {!env.budget&&<div style={{fontSize:10,color:"#444",marginTop:1}}>{fmt(env.spent)} ce mois</div>}
                </div>
              </div>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                {env.pct>90&&<span className="badge" style={{background:"#f43f8a22",color:"#f43f8a"}}>⚠️</span>}
                <button className="btn bg bsm" onClick={()=>{setEditEnv(env);setEnvForm({name:env.name,emoji:env.emoji,color:env.color,budget:env.budget||"",owner:env.owner});setShowAddEnv(true);}}>✏️</button>
                <button className="btn bg bsm" onClick={()=>delEnv(env.id)}>🗑️</button>
              </div>
            </div>
            {env.budget>0&&<div className="pb" style={{marginTop:9}}><div className="pf" style={{width:`${env.pct}%`,background:env.pct>90?"#f43f8a":env.pct>70?"#fb923c":env.color}}/></div>}
          </div>
        ))}
        <button className="btn bg" style={{fontSize:12,padding:"8px 14px"}} onClick={()=>{setEditEnv(null);setEnvForm({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner});setShowAddEnv(true);}}>+ Enveloppe {ownerLabel[owner]}</button>
      </div>
    );
  };

  // Env picker compact
  const EnvPicker=({value,onChange})=>(
    <div>
      {["shared","cap","gui"].map(o=>{
        const envs=envelopes.filter(e=>e.owner===o);
        if(!envs.length)return null;
        return(
          <div key={o} style={{marginBottom:8}}>
            <div style={{fontSize:9,fontWeight:700,color:"#333",textTransform:"uppercase",letterSpacing:".08em",marginBottom:5}}>{ownerLabel[o]}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {envs.map(env=>(
                <button key={env.id} style={{background:value===env.id?env.color+"33":"#151520",border:`1.5px solid ${value===env.id?env.color:"#222232"}`,color:value===env.id?env.color:"#666",borderRadius:9,padding:"5px 9px",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all .15s"}} onClick={()=>onChange(env.id)}>
                  {env.emoji} {env.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:"#0a0a10",color:"#f0ecff"}}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={{background:"linear-gradient(180deg,#110818 0%,#0a0a10 100%)",padding:"16px 16px 0",position:"sticky",top:0,zIndex:50,borderBottom:"1px solid #131320"}}>
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:18,background:"linear-gradient(90deg,#f43f8a,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              💸 {nameCap} & {nameGui}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <select value={filterMonth} onChange={e=>setFilterMonth(+e.target.value)} style={{width:"auto",padding:"4px 7px",fontSize:11,borderRadius:8}}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m.slice(0,3)}</option>)}
              </select>
              <select value={filterYear} onChange={e=>setFilterYear(+e.target.value)} style={{width:"auto",padding:"4px 7px",fontSize:11,borderRadius:8}}>
                {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <button className="btn bg bsm" onClick={()=>setShowSettings(true)}>⚙️</button>
            </div>
          </div>
          <div style={{display:"flex",gap:12,marginTop:10,overflowX:"auto",paddingBottom:0}}>
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

      <div style={{padding:"14px 16px 120px",maxWidth:520,margin:"0 auto"}}>

        {/* ═══ DASHBOARD ═══ */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {/* Balance card */}
            <div style={{background:Math.abs(netDebt)<0.01?"linear-gradient(135deg,#091510,#060e0a)":netDebt>0?"linear-gradient(135deg,#091510,#060e0a)":"linear-gradient(135deg,#130910,#0d060a)",border:`1px solid ${Math.abs(netDebt)<0.01?"#163322":netDebt>0?"#163322":"#331622"}`,borderRadius:16,padding:"14px 16px"}}>
              <div style={{fontSize:9,color:"#444",fontWeight:800,textTransform:"uppercase",letterSpacing:".1em"}}>Solde du mois</div>
              {Math.abs(netDebt)<0.01
                ?<div style={{fontFamily:"Syne",fontWeight:800,fontSize:18,marginTop:4,color:"#4ade80"}}>✅ Tout équilibré !</div>
                :netDebt>0
                  ?<div style={{marginTop:3}}><span style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#4ade80"}}>{nameGui} doit </span><span style={{fontFamily:"Syne",fontWeight:800,fontSize:20,color:"#4ade80"}}>{fmt(netDebt)}</span><span style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#4ade80"}}> à {nameCap}</span></div>
                  :<div style={{marginTop:3}}><span style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#fb923c"}}>{nameCap} doit </span><span style={{fontFamily:"Syne",fontWeight:800,fontSize:20,color:"#fb923c"}}>{fmt(Math.abs(netDebt))}</span><span style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#fb923c"}}> à {nameGui}</span></div>
              }
              <div style={{display:"flex",gap:14,marginTop:10}}>
                {[["Total",fmt(totalSpent),"#555"],[nameCap,fmt(capSpent),"#f43f8a"],[nameGui,fmt(guiSpent),"#a855f7"]].map(([l,v,c])=>(
                  <div key={l}><div style={{fontSize:9,color:"#333",fontWeight:700,textTransform:"uppercase"}}>{l}</div><div style={{fontWeight:700,fontSize:13,color:c,marginTop:1}}>{v}</div></div>
                ))}
              </div>
            </div>

            {/* Income summary if set */}
            {(capIncome>0||guiIncome>0)&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["cap",nameCap,"#f43f8a",capIncome,capSpent,capBalance],["gui",nameGui,"#a855f7",guiIncome,guiSpent,guiBalance]].map(([k,name,color,inc,sp,bal])=>(
                  <div key={k} style={{background:"#0e0e18",border:`1px solid ${color}20`,borderRadius:13,padding:"10px 12px",borderTop:`2px solid ${color}`}}>
                    <div style={{fontSize:10,fontWeight:700,color,marginBottom:6}}>{name}</div>
                    <div className="stat-row"><span style={{fontSize:10,color:"#444"}}>Revenus</span><span style={{fontSize:11,fontWeight:700,color:"#4ade80"}}>{fmt(inc)}</span></div>
                    <div className="stat-row"><span style={{fontSize:10,color:"#444"}}>Dépenses</span><span style={{fontSize:11,fontWeight:700,color}}>{fmt(sp)}</span></div>
                    <div style={{paddingTop:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:10,color:"#444",fontWeight:700}}>Reste</span>
                      <span style={{fontSize:13,fontWeight:800,color:bal>=0?"#4ade80":"#f43f8a"}}>{fmt(bal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length>0&&(
              <div className="card" style={{padding:12}}>
                <div className="sect" style={{margin:"0 0 8px"}}>⏰ Prochaines récurrentes</div>
                {upcoming.map(r=>{
                  const dl=r.dayOfMonth-today;
                  const urgent=dl<=3;
                  return(
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 8px",background:urgent?"#130810":"#0e0e18",borderRadius:9,marginBottom:5,border:`1px solid ${urgent?r.color+"44":"#1a1a28"}`}}>
                      <div style={{width:30,height:30,borderRadius:7,background:r.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{r.emoji}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:12}}>{r.label}</div>
                        <div style={{fontSize:10,color:"#444",marginTop:1}}>{fmt(r.amount)}</div>
                      </div>
                      <span className="badge" style={{background:dl<=0?"#f43f8a22":dl<=3?"#fb923c22":"#1a1a28",color:dl<=0?"#f43f8a":dl<=3?"#fb923c":"#555",fontSize:10}}>
                        {dl===0?"Auj.":dl===1?"Dem.":dl<=3?`J+${dl}`:`${r.dayOfMonth} ${MSHT[filterMonth]}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Envelope bars */}
            <div className="card" style={{padding:12}}>
              <div className="sect" style={{margin:"0 0 8px"}}>Enveloppes</div>
              {envSpend.filter(e=>e.spent>0||e.budget>0).map(env=>(
                <div key={env.id} style={{marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:13}}>{env.emoji}</span>
                      <span style={{fontSize:12,fontWeight:600}}>{env.name}</span>
                      <span className="badge" style={{background:env.owner==="shared"?"#1a1a30":env.owner==="cap"?"#1d0a14":"#0d0a1d",color:env.owner==="shared"?"#7c6af7":env.owner==="cap"?"#f43f8a":"#a855f7",fontSize:8,padding:"1px 5px"}}>
                        {env.owner==="shared"?"commun":env.owner==="cap"?nameCap.slice(0,3):nameGui.slice(0,3)}
                      </span>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:env.pct>90?"#f43f8a":env.pct>70?"#fb923c":"#555"}}>{fmt(env.spent)}{env.budget>0?` / ${fmt(env.budget)}`:""}</span>
                  </div>
                  {env.budget>0&&<div className="pb"><div className="pf" style={{width:`${env.pct}%`,background:env.pct>90?"#f43f8a":env.pct>70?"#fb923c":env.color}}/></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ENVELOPES ═══ */}
        {tab==="envelopes"&&(
          <div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {["shared","cap","gui"].map(o=><button key={o} className={`otab${envOwner===o?" on":""}`} onClick={()=>setEnvOwner(o)}>{o==="shared"?"🤝 Commun":o==="cap"?`👩 ${nameCap}`:`👨 ${nameGui}`}</button>)}
            </div>
            <EnvList owner={envOwner}/>
          </div>
        )}

        {/* ═══ CALENDAR ═══ */}
        {tab==="calendar"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <button className={`otab${calView==="list"?" on":""}`} onClick={()=>setCalView("list")}>📋 Liste</button>
              <button className={`otab${calView==="grid"?" on":""}`} onClick={()=>setCalView("grid")}>📅 Grille</button>
              <div style={{flex:1}}/>
              <div style={{fontSize:11,color:"#555"}}>Total/mois : <strong style={{color:"#f43f8a"}}>{fmt(recurring.reduce((a,r)=>a+r.amount,0))}</strong></div>
              <button className="btn bp bsm" onClick={()=>{setEditRec(null);setRecForm({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a",note:""});setShowAddRec(true);}}>+ Ajouter</button>
            </div>

            {calView==="list"&&[...recurring].sort((a,b)=>a.dayOfMonth-b.dayOfMonth).map(r=>{
              const [cp,gp]=computeParts(r.amount,r.splitType,"",ratio);
              const env=envelopes.find(e=>e.id===r.envelopeId);
              const dl=isCurMo?r.dayOfMonth-today:null;
              return(
                <div key={r.id} style={{display:"flex",gap:10,padding:"11px 13px",background:"#0e0e18",border:`1px solid ${r.color}25`,borderRadius:13,borderLeft:`3px solid ${r.color}`,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:9,background:r.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{r.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:13}}>{r.label}</span>
                      {dl!==null&&<span className="badge" style={{background:dl<=0?"#f43f8a22":dl<=3?"#fb923c22":"#151520",color:dl<=0?"#f43f8a":dl<=3?"#fb923c":"#444"}}>{dl<=0?"Passé":dl===0?"Auj.":dl===1?"Dem.":dl<=3?`J+${dl}`:`J+${dl}`}</span>}
                    </div>
                    <div style={{fontSize:10,color:"#444",marginTop:2}}>Chaque <strong style={{color:"#666"}}>j.{r.dayOfMonth}</strong> · {r.paidBy==="cap"?`👩`:`👨`} · {slabel[r.splitType]}{env?` · ${env.emoji}`:""}</div>
                    <div style={{fontSize:10,marginTop:1}}><span style={{color:"#f43f8a88"}}>{nameCap} {fmt(cp)}</span> · <span style={{color:"#a855f788"}}>{nameGui} {fmt(gp)}</span></div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:800,fontSize:14,color:r.color}}>{fmt(r.amount)}</div>
                    <div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}>
                      <button className="btn bg bsm" onClick={()=>{setEditRec(r);setRecForm({...r,amount:r.amount});setShowAddRec(true);}}>✏️</button>
                      <button className="btn bg bsm" onClick={()=>delRec(r.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {calView==="list"&&!recurring.length&&<div style={{textAlign:"center",color:"#333",padding:"40px 0",fontSize:13}}>Aucune récurrente</div>}

            {calView==="grid"&&(
              <div className="card" style={{padding:11}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
                  {DAYS_S.map((d,i)=><div key={i} style={{textAlign:"center",fontSize:9,color:"#333",fontWeight:700,padding:"2px 0"}}>{d}</div>)}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                  {Array.from({length:firstDayOfMonth(filterMonth,filterYear)},(_,i)=><div key={`e${i}`} style={{minHeight:48}}/>)}
                  {Array.from({length:daysInMonth(filterMonth,filterYear)},(_,i)=>{
                    const day=i+1,recs=recByDay[day]||[],exps=expByDay[day]||[],isT=isCurMo&&day===today;
                    const urgent=recs.some(r=>isCurMo&&r.dayOfMonth-today<=3&&r.dayOfMonth>=today);
                    return(
                      <div key={day} className={`cal-cell${isT?" tod":""}`} style={urgent?{borderColor:"#f43f8a44"}:{}} onClick={()=>setSelDay(selDay===day?null:day)}>
                        <div style={{fontSize:9,fontWeight:700,color:isT?"#f43f8a":"#333",textAlign:"right",paddingRight:2,marginBottom:1}}>{day}</div>
                        {recs.map(r=><div key={r.id} className="rdot" style={{background:r.color+"28",color:r.color}}>{r.emoji}</div>)}
                        {exps.length>0&&<div style={{width:"100%",height:2,background:"#3b82f630",borderRadius:2,marginTop:1}}/>}
                      </div>
                    );
                  })}
                </div>
                {selDay&&(
                  <div style={{marginTop:10,background:"#0a0a14",borderRadius:11,padding:11,border:"1px solid #1a1a28"}}>
                    <div style={{fontWeight:700,fontSize:12,marginBottom:8,color:"#888"}}>{selDay} {MONTHS[filterMonth]}</div>
                    {(recByDay[selDay]||[]).map(r=>{
                      const[cp,gp]=computeParts(r.amount,r.splitType,"",ratio);
                      return(<div key={r.id} style={{padding:"7px 9px",background:r.color+"0e",borderRadius:9,border:`1px solid ${r.color}28`,marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:12,color:r.color}}>{r.emoji} {r.label}</span><span style={{fontWeight:700,fontSize:12}}>{fmt(r.amount)}</span></div>
                        <div style={{fontSize:10,color:"#444",marginTop:2}}>{slabel[r.splitType]} · {r.paidBy==="cap"?`👩`:``}{r.paidBy==="gui"?`👨`:``}</div>
                        <div style={{fontSize:10,marginTop:1}}><span style={{color:"#f43f8a88"}}>{fmt(cp)}</span> · <span style={{color:"#a855f788"}}>{fmt(gp)}</span></div>
                      </div>);
                    })}
                    {(expByDay[selDay]||[]).map(e=>{
                      const env=envelopes.find(v=>v.id===e.envelopeId);
                      return(<div key={e.id} style={{padding:"7px 9px",background:"#13131f",borderRadius:9,border:"1px solid #1a1a28",marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:12}}>{env?.emoji} {e.label}</span><span style={{fontWeight:700,fontSize:12}}>{fmt(e.amount)}</span></div>
                        <div style={{fontSize:10,marginTop:1}}><span style={{color:"#f43f8a88"}}>{fmt(e.capPart)}</span> · <span style={{color:"#a855f788"}}>{fmt(e.guiPart)}</span></div>
                      </div>);
                    })}
                    {!(recByDay[selDay]?.length)&&!(expByDay[selDay]?.length)&&<div style={{color:"#333",fontSize:11}}>Rien ce jour</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ BALANCE ═══ */}
        {tab==="balance"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{background:Math.abs(netDebt)<0.01?"linear-gradient(135deg,#091510,#060e0a)":netDebt>0?"linear-gradient(135deg,#091510,#060e0a)":"linear-gradient(135deg,#130910,#0d060a)",border:`1px solid ${Math.abs(netDebt)<0.01?"#163322":netDebt>0?"#163322":"#331622"}`,borderRadius:16,padding:"14px 16px"}}>
              <div style={{fontSize:9,color:"#444",fontWeight:800,textTransform:"uppercase",letterSpacing:".1em"}}>Solde net {MONTHS[filterMonth]}</div>
              {Math.abs(netDebt)<0.01
                ?<div style={{fontFamily:"Syne",fontWeight:800,fontSize:19,marginTop:4,color:"#4ade80"}}>✅ Tout à jour !</div>
                :netDebt>0
                  ?<div style={{fontFamily:"Syne",fontWeight:800,fontSize:19,marginTop:4,color:"#4ade80"}}>{nameGui} → {nameCap} · {fmt(netDebt)}</div>
                  :<div style={{fontFamily:"Syne",fontWeight:800,fontSize:19,marginTop:4,color:"#fb923c"}}>{nameCap} → {nameGui} · {fmt(Math.abs(netDebt))}</div>
              }
              {rawDebt!==netDebt&&<div style={{fontSize:10,color:"#444",marginTop:3}}>Brut {fmt(Math.abs(rawDebt))} · Remboursé {fmt(repaidThisMonth)}</div>}
              {Math.abs(netDebt)>0.01&&<button className="btn bp" style={{marginTop:10,padding:"8px 14px",fontSize:12,width:"100%"}} onClick={()=>markRepaid(Math.abs(netDebt))}>✅ Tout marquer remboursé · {fmt(Math.abs(netDebt))}</button>}
            </div>

            {debtByEnv.length>0&&(
              <div className="card" style={{padding:12}}>
                <div className="sect" style={{margin:"0 0 8px"}}>Détail par enveloppe</div>
                {debtByEnv.map(env=>(
                  <div key={env.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #0f0f1a"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:15}}>{env.emoji}</span><div><div style={{fontWeight:600,fontSize:12}}>{env.name}</div><div style={{fontSize:10,color:"#444"}}>{env.balance>0?`${nameGui} → ${nameCap}`:`${nameCap} → ${nameGui}`}</div></div></div>
                    <span style={{fontWeight:700,fontSize:13,color:env.balance>0?"#4ade80":"#fb923c"}}>{fmt(Math.abs(env.balance))}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expenses list with search */}
            <div className="card" style={{padding:12}}>
              <div className="sect" style={{margin:"0 0 8px"}}>Dépenses du mois</div>
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Rechercher une dépense…" value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
              </div>
              {searchedExp.length===0&&<div style={{color:"#333",fontSize:12,textAlign:"center",padding:"20px 0"}}>{searchQ?"Aucun résultat":"Aucune dépense"}</div>}
              {searchedExp.map(e=>{
                const env=envelopes.find(v=>v.id===e.envelopeId);
                return(
                  <div key={e.id} className="erow" style={{marginBottom:5}}>
                    <div style={{width:30,height:30,borderRadius:8,background:(env?.color||"#444")+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{env?.emoji||"📦"}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</div>
                      <div style={{fontSize:10,color:"#333",marginTop:1}}>{e.date} · {slabel[e.splitType]}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontWeight:700,fontSize:13}}>{fmt(e.amount)}</div>
                      {Math.abs(e.balance)>0.01&&<div style={{fontSize:9,color:e.balance>0?"#4ade80":"#fb923c"}}>{e.balance>0?`↑${fmt(e.balance)}`:`↓${fmt(Math.abs(e.balance))}`}</div>}
                    </div>
                    <button className="btn bg bsm" onClick={()=>openEditExp(e)}>✏️</button>
                    <button className="del" onClick={()=>delExp(e.id)}>✕</button>
                  </div>
                );
              })}
            </div>

            {repayments.length>0&&(
              <div className="card" style={{padding:12}}>
                <div className="sect" style={{margin:"0 0 8px"}}>Historique remboursements</div>
                {repayments.slice(0,8).map(r=>(
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #0f0f1a"}}>
                    <span style={{fontSize:11,color:"#555"}}>{r.date}</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#4ade80"}}>✅ {fmt(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ INCOMES ═══ */}
        {tab==="incomes"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["cap",nameCap,"#f43f8a",capIncome,capSpent,capBalance],["gui",nameGui,"#a855f7",guiIncome,guiSpent,guiBalance]].map(([k,name,color,inc,sp,bal])=>(
                <div key={k} className="card" style={{padding:12,borderTop:`2px solid ${color}`}}>
                  <div style={{fontFamily:"Syne",fontWeight:700,fontSize:12,color,marginBottom:8}}>{name}</div>
                  <div className="stat-row"><span style={{fontSize:10,color:"#444"}}>Revenus</span><span style={{fontSize:12,fontWeight:700,color:"#4ade80"}}>{fmt(inc)}</span></div>
                  <div className="stat-row"><span style={{fontSize:10,color:"#444"}}>Dépenses</span><span style={{fontSize:12,fontWeight:700,color}}>{fmt(sp)}</span></div>
                  <div style={{paddingTop:6,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:10,color:"#444",fontWeight:700}}>Reste</span>
                    <span style={{fontSize:14,fontWeight:800,color:bal>=0?"#4ade80":"#f43f8a"}}>{fmt(bal)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div className="sect" style={{margin:0}}>Revenus de {MONTHS[filterMonth]}</div>
                <button className="btn bp bsm" onClick={()=>setShowAddInc(true)}>+ Ajouter</button>
              </div>
              {filtInc.length===0&&<div style={{color:"#333",fontSize:12,textAlign:"center",padding:"20px 0"}}>Aucun revenu saisi</div>}
              {filtInc.map(i=>{
                const t=INC_TYPES.find(x=>x.key===i.type)||INC_TYPES[3];
                return(
                  <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #0f0f1a"}}>
                    <span style={{fontSize:17}}>{t.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:12}}>{i.label}</div>
                      <div style={{fontSize:10,color:"#444",marginTop:1}}>{i.date} · {i.person==="cap"?`👩 ${nameCap}`:`👨 ${nameGui}`} · {t.label}</div>
                    </div>
                    <div style={{fontWeight:700,fontSize:13,color:"#4ade80"}}>{fmt(i.amount)}</div>
                    <button className="del" onClick={()=>delInc(i.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ CHARTS ═══ */}
        {tab==="charts"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className="card" style={{padding:14}}>
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:14,marginBottom:14}}>Répartition par espace</div>
              <MiniPie data={pieShared} title="🤝 Commun"/>
              <div style={{height:1,background:"#131320",margin:"14px 0"}}/>
              <MiniPie data={pieCap} title={`👩 ${nameCap}`}/>
              <div style={{height:1,background:"#131320",margin:"14px 0"}}/>
              <MiniPie data={pieGui} title={`👨 ${nameGui}`}/>
            </div>
            {filtExp.length>0&&(
              <div className="card" style={{padding:14}}>
                <div style={{fontFamily:"Syne",fontWeight:700,fontSize:12,color:"#555",marginBottom:10,textTransform:"uppercase",letterSpacing:".07em"}}>Toutes enveloppes</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={envSpend.filter(e=>e.spent>0).map(e=>({name:e.name,v:e.spent,color:e.color}))} margin={{left:-18,bottom:28}}>
                    <XAxis dataKey="name" tick={{fontSize:8,fill:"#444"}} angle={-30} textAnchor="end" interval={0}/>
                    <YAxis tick={{fontSize:9,fill:"#444"}}/>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#13131f",border:"1px solid #1a1a28",borderRadius:8,fontFamily:"inherit",fontSize:10}}/>
                    <Bar dataKey="v" radius={[5,5,0,0]} name="Dépensé">
                      {envSpend.filter(e=>e.spent>0).map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="card" style={{padding:14}}>
              <div style={{fontFamily:"Syne",fontWeight:700,fontSize:12,color:"#555",marginBottom:10,textTransform:"uppercase",letterSpacing:".07em"}}>Tendance 6 mois</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={last6}>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:"#444"}}/>
                  <YAxis tick={{fontSize:9,fill:"#444"}}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#13131f",border:"1px solid #1a1a28",borderRadius:8,fontFamily:"inherit",fontSize:10}}/>
                  <Line type="monotone" dataKey="total" stroke="#f43f8a" strokeWidth={2.5} dot={{fill:"#f43f8a",strokeWidth:0,r:3}} activeDot={{r:5}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            {filtExp.length===0&&<div style={{textAlign:"center",color:"#333",padding:"40px 0",fontSize:13}}>Pas de données</div>}
          </div>
        )}
      </div>

      {/* ══ QUICK ADD BAR ══ */}
      <div className="qa-bar">
        {qaPreview&&(
          <div className="qa-preview">
            <span style={{fontSize:11,color:"#555",marginRight:4}}>→</span>
            <span className="qa-tag" style={{background:"#1a1a28",color:"#ccc"}}>{qaPreview.label}</span>
            <span className="qa-tag" style={{background:"#f43f8a22",color:"#f43f8a"}}>{fmt(qaPreview.amount)}</span>
            <span className="qa-tag" style={{background:(envelopes.find(e=>e.id===qaPreview.envelopeId)?.color||"#555")+"22",color:envelopes.find(e=>e.id===qaPreview.envelopeId)?.color||"#555"}}>
              {envelopes.find(e=>e.id===qaPreview.envelopeId)?.emoji} {envelopes.find(e=>e.id===qaPreview.envelopeId)?.name}
            </span>
            <span className="qa-tag" style={{background:"#a855f722",color:"#a855f7"}}>{slabel[qaPreview.splitType]}</span>
            <span className="qa-tag" style={{background:"#1a1a28",color:"#888"}}>{qaPreview.paidBy==="cap"?`👩`:`👨`}</span>
          </div>
        )}
        {!qaPreview&&<div className="hint">ex : "courses 47" · "café 12 50/50" · "loyer 800 gui"</div>}
        <div style={{position:"relative"}}>
          <input ref={qaRef} className="qa-input" placeholder="✨ Ajouter vite… ex: courses 47" value={qaText} onChange={e=>setQaText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")submitQA();}}/>
          <button className="qa-send" onClick={()=>{if(qaPreview)submitQA();else setShowAddExp(true);}}>
            {qaPreview?"✓":"＋"}
          </button>
        </div>
      </div>

      {/* ══ MODAL : EXPENSE ══ */}
      {showAddExp&&(
        <div className="ov" onClick={()=>{setShowAddExp(false);setEditExp(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16,marginBottom:14}}>{editExp?"✏️ Modifier":"➕ Nouvelle dépense"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div className="fl"><label>Intitulé</label><input placeholder="ex: Courses Lidl, Café…" value={expForm.label} onChange={e=>setExpForm({...expForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div className="fl"><label>Montant (€)</label><input type="number" placeholder="0.00" value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})}/></div>
                <div className="fl"><label>Date</label><input type="date" value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})}/></div>
              </div>
              <div className="fl"><label>Enveloppe</label><EnvPicker value={expForm.envelopeId} onChange={v=>setExpForm({...expForm,envelopeId:v})}/></div>
              <div className="fl"><label>Payé par</label>
                <div style={{display:"flex",gap:7}}>
                  {[["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${expForm.paidBy===k?" on":""}`} style={{flex:1}} onClick={()=>setExpForm({...expForm,paidBy:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Répartition</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {SPLIT_OPTS.map(s=><button key={s.key} className={`chip${expForm.splitType===s.key?" on":""}`} onClick={()=>setExpForm({...expForm,splitType:s.key})}>{s.icon} {s.label}</button>)}
                </div>
                {expForm.splitType==="prorata"&&expForm.amount&&<div style={{fontSize:10,color:"#444",marginTop:3}}>{nameCap} {fmt(+expForm.amount*ratio)} · {nameGui} {fmt(+expForm.amount*(1-ratio))}</div>}
                {expForm.splitType==="custom"&&<input type="number" placeholder={`Part de ${nameCap} (€)`} value={expForm.capShare} onChange={e=>setExpForm({...expForm,capShare:e.target.value})} style={{marginTop:6}}/>}
              </div>
              <div className="fl"><label>Note</label><input placeholder="optionnel" value={expForm.note} onChange={e=>setExpForm({...expForm,note:e.target.value})}/></div>
              <div style={{display:"flex",gap:9,marginTop:4}}>
                <button className="btn bp" style={{flex:1}} onClick={saveExpForm}>{editExp?"Sauvegarder":"Ajouter"}</button>
                <button className="btn bg" onClick={()=>{setShowAddExp(false);setEditExp(null);}}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : INCOME ══ */}
      {showAddInc&&(
        <div className="ov" onClick={()=>setShowAddInc(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16,marginBottom:14}}>💰 Nouveau revenu</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div className="fl"><label>Intitulé</label><input placeholder="ex: Salaire avril, Prime…" value={incForm.label} onChange={e=>setIncForm({...incForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div className="fl"><label>Montant (€)</label><input type="number" placeholder="0.00" value={incForm.amount} onChange={e=>setIncForm({...incForm,amount:e.target.value})}/></div>
                <div className="fl"><label>Date</label><input type="date" value={incForm.date} onChange={e=>setIncForm({...incForm,date:e.target.value})}/></div>
              </div>
              <div className="fl"><label>Pour qui</label>
                <div style={{display:"flex",gap:7}}>
                  {[["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${incForm.person===k?" on":""}`} style={{flex:1}} onClick={()=>setIncForm({...incForm,person:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Type</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {INC_TYPES.map(t=><button key={t.key} className={`chip${incForm.type===t.key?" on":""}`} onClick={()=>setIncForm({...incForm,type:t.key})}>{t.emoji} {t.label}</button>)}
                </div>
              </div>
              <div className="fl"><label>Note</label><input placeholder="optionnel" value={incForm.note} onChange={e=>setIncForm({...incForm,note:e.target.value})}/></div>
              <div style={{display:"flex",gap:9}}>
                <button className="btn bp" style={{flex:1}} onClick={addIncome}>Ajouter</button>
                <button className="btn bg" onClick={()=>setShowAddInc(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : ENVELOPE ══ */}
      {showAddEnv&&(
        <div className="ov" onClick={()=>{setShowAddEnv(false);setEditEnv(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16,marginBottom:14}}>{editEnv?"Modifier":"Nouvelle enveloppe"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div className="fl"><label>Nom</label><input placeholder="ex: Vacances, Loisirs…" value={envForm.name} onChange={e=>setEnvForm({...envForm,name:e.target.value})}/></div>
              <div className="fl"><label>Espace</label>
                <div style={{display:"flex",gap:7}}>
                  {[["shared","🤝 Commun"],["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${envForm.owner===k?" on":""}`} style={{flex:1,fontSize:11}} onClick={()=>setEnvForm({...envForm,owner:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Emoji</label><div className="eg">{EMOJIS.map(em=><div key={em} className={`eo${envForm.emoji===em?" on":""}`} onClick={()=>setEnvForm({...envForm,emoji:em})}>{em}</div>)}</div></div>
              <div className="fl"><label>Couleur</label><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PALETTE.map(c=><div key={c} className={`cd${envForm.color===c?" on":""}`} style={{background:c}} onClick={()=>setEnvForm({...envForm,color:c})}/>)}</div></div>
              <div className="fl"><label>Budget mensuel (€)</label><input type="number" placeholder="0 = pas de limite" value={envForm.budget} onChange={e=>setEnvForm({...envForm,budget:e.target.value})}/></div>
              <div style={{display:"flex",gap:9}}>
                <button className="btn bp" style={{flex:1}} onClick={submitEnv}>{editEnv?"Sauvegarder":"Créer"}</button>
                <button className="btn bg" onClick={()=>{setShowAddEnv(false);setEditEnv(null);}}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : RECURRING ══ */}
      {showAddRec&&(
        <div className="ov" onClick={()=>{setShowAddRec(false);setEditRec(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16,marginBottom:14}}>{editRec?"Modifier":"Nouvelle récurrente"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div className="fl"><label>Nom</label><input placeholder="ex: EDF, Netflix…" value={recForm.label} onChange={e=>setRecForm({...recForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div className="fl"><label>Montant estimé (€)</label><input type="number" value={recForm.amount} onChange={e=>setRecForm({...recForm,amount:e.target.value})}/></div>
                <div className="fl"><label>Jour du mois</label><input type="number" min="1" max="31" value={recForm.dayOfMonth} onChange={e=>setRecForm({...recForm,dayOfMonth:e.target.value})}/></div>
              </div>
              <div className="fl"><label>Emoji</label><div className="eg">{EMOJIS.map(em=><div key={em} className={`eo${recForm.emoji===em?" on":""}`} onClick={()=>setRecForm({...recForm,emoji:em})}>{em}</div>)}</div></div>
              <div className="fl"><label>Couleur</label><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PALETTE.map(c=><div key={c} className={`cd${recForm.color===c?" on":""}`} style={{background:c}} onClick={()=>setRecForm({...recForm,color:c})}/>)}</div></div>
              <div className="fl"><label>Enveloppe</label><EnvPicker value={recForm.envelopeId} onChange={v=>setRecForm({...recForm,envelopeId:v})}/></div>
              <div className="fl"><label>Payé par</label>
                <div style={{display:"flex",gap:7}}>
                  {[["cap",`👩 ${nameCap}`],["gui",`👨 ${nameGui}`]].map(([k,l])=>(
                    <button key={k} className={`chip${recForm.paidBy===k?" on":""}`} style={{flex:1}} onClick={()=>setRecForm({...recForm,paidBy:k})}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="fl"><label>Répartition</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {SPLIT_OPTS.map(s=><button key={s.key} className={`chip${recForm.splitType===s.key?" on":""}`} onClick={()=>setRecForm({...recForm,splitType:s.key})}>{s.icon} {s.label}</button>)}
                </div>
              </div>
              <div className="fl"><label>Note</label><input placeholder="ex: variable selon saison…" value={recForm.note} onChange={e=>setRecForm({...recForm,note:e.target.value})}/></div>
              <div style={{display:"flex",gap:9}}>
                <button className="btn bp" style={{flex:1}} onClick={submitRec}>{editRec?"Sauvegarder":"Créer"}</button>
                <button className="btn bg" onClick={()=>{setShowAddRec(false);setEditRec(null);}}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : SETTINGS ══ */}
      {showSettings&&(
        <div className="ov" onClick={()=>setShowSettings(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16,marginBottom:14}}>⚙️ Réglages</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div className="fl"><label>Prénom 1</label><input value={setForm2.nameCap} onChange={e=>setSetForm2({...setForm2,nameCap:e.target.value})}/></div>
                <div className="fl"><label>Prénom 2</label><input value={setForm2.nameGui} onChange={e=>setSetForm2({...setForm2,nameGui:e.target.value})}/></div>
              </div>
              <div className="fl">
                <label>Part de {setForm2.nameCap} (pro rata %)</label>
                <input type="number" min="0" max="100" value={setForm2.ratioCap} onChange={e=>setSetForm2({...setForm2,ratioCap:e.target.value})}/>
                <div style={{fontSize:10,color:"#333",marginTop:3}}>{setForm2.nameCap} {setForm2.ratioCap}% · {setForm2.nameGui} {100-(parseInt(setForm2.ratioCap)||0)}%</div>
              </div>
              <div style={{background:"#131320",border:"1px solid #1a1a28",borderRadius:10,padding:"10px 12px",fontSize:11,color:"#444",lineHeight:1.7}}>
                ℹ️ Données partagées. Envoie ce lien de conversation à {setForm2.nameGui} pour y accéder ensemble.
              </div>
              <div style={{display:"flex",gap:9}}>
                <button className="btn bp" style={{flex:1}} onClick={saveSettings}>Sauvegarder</button>
                <button className="btn bg" onClick={()=>setShowSettings(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
