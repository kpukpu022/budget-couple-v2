import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SK = { exp:"bcv6_exp", env:"bcv6_env", set:"bcv6_set", rec:"bcv6_rec", inc:"bcv6_inc", rep:"bcv6_rep" };
const MSHT = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const EMOJIS = ["🛒","🏠","🍽️","🚆","👩","👨","💊","📦","✈️","🎬","☕","🎮","💄","🐶","🌿","🎁","⚡","💧","📱","🏋️","🎵","🧴","🏥","🎓","👗","🍷","🎯","🏖️","⛽","☁️","🤖","🏦","📈","🍫","🍔","🚗","🔒","📡","💰"];
const SPLIT_OPTS = [
  {key:"prorata",icon:"⚖️",label:"Pro rata"},
  {key:"equal",icon:"🤝",label:"50/50"},
  {key:"cap_only",icon:"👩",label:"Cap seule"},
  {key:"gui_only",icon:"👨",label:"Gui seul"},
  {key:"custom",icon:"✏️",label:"Perso"},
];
const INC_TYPES = [
  {key:"salary",label:"Salaire",emoji:"💼"},
  {key:"variable",label:"Vente / Variable",emoji:"📈"},
  {key:"refund",label:"Remboursement",emoji:"↩️"},
  {key:"other",label:"Autre",emoji:"💰"},
];
const DEFAULT_SETTINGS = {ratioCap:42, names:["Capucine","Guillaume"], salCap:2100, salGui:2900};
const DEFAULT_ENVELOPES = [
  {id:"ec_loy",name:"Loyer + charges",emoji:"🏠",color:"#8b5cf6",budget:1412,owner:"shared"},
  {id:"ec_voi",name:"Assurance voiture",emoji:"🚗",color:"#6366f1",budget:62,owner:"shared"},
  {id:"ec_ess",name:"Essence",emoji:"⛽",color:"#f59e0b",budget:120,owner:"shared"},
  {id:"ec_cou",name:"Courses frigo",emoji:"🛒",color:"#f43f8a",budget:400,owner:"shared"},
  {id:"ep_spo",name:"Sport",emoji:"🏋️",color:"#ec4899",budget:49,owner:"cap"},
  {id:"ep_abo",name:"Abonnements Cap",emoji:"📱",color:"#f43f8a",budget:31,owner:"cap"},
  {id:"ep_liv",name:"Livret Cap",emoji:"🏦",color:"#10b981",budget:400,owner:"cap"},
  {id:"ep_etf",name:"ETF Cap",emoji:"📈",color:"#059669",budget:260,owner:"cap"},
  {id:"ep_sna",name:"Snacks Cap",emoji:"🍫",color:"#f97316",budget:20,owner:"cap"},
  {id:"ep_lib",name:"Liberté Cap",emoji:"🎯",color:"#c026d3",budget:400,owner:"cap"},
  {id:"eg_tra",name:"Train",emoji:"🚆",color:"#3b82f6",budget:44.5,owner:"gui"},
  {id:"eg_abo",name:"Abonnements Gui",emoji:"📱",color:"#6366f1",budget:31,owner:"gui"},
  {id:"eg_liv",name:"Livret Gui",emoji:"🏦",color:"#10b981",budget:400,owner:"gui"},
  {id:"eg_etf",name:"ETF Gui",emoji:"📈",color:"#059669",budget:300,owner:"gui"},
  {id:"eg_sna",name:"Snacks Gui",emoji:"🍔",color:"#f97316",budget:40,owner:"gui"},
  {id:"eg_lib",name:"Liberté Gui",emoji:"🎯",color:"#14b8a6",budget:750,owner:"gui"},
];
const DEFAULT_RECURRING = [
  {id:"r1",label:"Loyer cc",emoji:"🏠",dayOfMonth:1,amount:1280,splitType:"prorata",paidBy:"cap",envelopeId:"ec_loy",color:"#8b5cf6"},
  {id:"r2",label:"EDF",emoji:"⚡",dayOfMonth:5,amount:83,splitType:"prorata",paidBy:"cap",envelopeId:"ec_loy",color:"#f59e0b"},
  {id:"r3",label:"Box internet",emoji:"📡",dayOfMonth:10,amount:25,splitType:"prorata",paidBy:"gui",envelopeId:"ec_loy",color:"#3b82f6"},
  {id:"r4",label:"Assurance hab.",emoji:"🔒",dayOfMonth:10,amount:24,splitType:"prorata",paidBy:"cap",envelopeId:"ec_loy",color:"#6366f1"},
  {id:"r5",label:"Assurance voiture",emoji:"🚗",dayOfMonth:5,amount:62,splitType:"prorata",paidBy:"cap",envelopeId:"ec_voi",color:"#6366f1"},
  {id:"r6",label:"Sport Cap",emoji:"🏋️",dayOfMonth:1,amount:49,splitType:"cap_only",paidBy:"cap",envelopeId:"ep_spo",color:"#ec4899"},
  {id:"r7",label:"Claude AI",emoji:"🤖",dayOfMonth:5,amount:20,splitType:"cap_only",paidBy:"cap",envelopeId:"ep_abo",color:"#f43f8a"},
  {id:"r8",label:"Apple Music Cap",emoji:"🎵",dayOfMonth:5,amount:4.99,splitType:"cap_only",paidBy:"cap",envelopeId:"ep_abo",color:"#f43f8a"},
  {id:"r9",label:"Apple Cloud Cap",emoji:"☁️",dayOfMonth:5,amount:2.99,splitType:"cap_only",paidBy:"cap",envelopeId:"ep_abo",color:"#f43f8a"},
  {id:"r10",label:"Google Cloud",emoji:"☁️",dayOfMonth:5,amount:2.99,splitType:"cap_only",paidBy:"cap",envelopeId:"ep_abo",color:"#f43f8a"},
  {id:"r11",label:"Livret Cap",emoji:"🏦",dayOfMonth:2,amount:400,splitType:"cap_only",paidBy:"cap",envelopeId:"ep_liv",color:"#10b981"},
  {id:"r12",label:"ETF Cap",emoji:"📈",dayOfMonth:2,amount:260,splitType:"cap_only",paidBy:"cap",envelopeId:"ep_etf",color:"#059669"},
  {id:"r13",label:"Train Gui",emoji:"🚆",dayOfMonth:1,amount:44.5,splitType:"gui_only",paidBy:"gui",envelopeId:"eg_tra",color:"#3b82f6"},
  {id:"r14",label:"Forfait Gui",emoji:"📱",dayOfMonth:5,amount:15.99,splitType:"gui_only",paidBy:"gui",envelopeId:"eg_abo",color:"#6366f1"},
  {id:"r15",label:"Apple Cloud Gui",emoji:"☁️",dayOfMonth:5,amount:9.99,splitType:"gui_only",paidBy:"gui",envelopeId:"eg_abo",color:"#6366f1"},
  {id:"r16",label:"Apple Music Gui",emoji:"🎵",dayOfMonth:5,amount:4.99,splitType:"gui_only",paidBy:"gui",envelopeId:"eg_abo",color:"#6366f1"},
  {id:"r17",label:"Livret Gui",emoji:"🏦",dayOfMonth:2,amount:400,splitType:"gui_only",paidBy:"gui",envelopeId:"eg_liv",color:"#10b981"},
  {id:"r18",label:"ETF Gui",emoji:"📈",dayOfMonth:2,amount:300,splitType:"gui_only",paidBy:"gui",envelopeId:"eg_etf",color:"#059669"},
];

const fmt = n => `${Number(n||0).toFixed(2)} €`;
const gid = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36);

function computeParts(amt, splitType, capShare, ratio){
  const t = parseFloat(amt)||0;
  if(splitType==="prorata") return [t*ratio, t*(1-ratio)];
  if(splitType==="equal")   return [t/2, t/2];
  if(splitType==="cap_only") return [t, 0];
  if(splitType==="gui_only") return [0, t];
  if(splitType==="custom"){const c=parseFloat(capShare)||0; return [c,t-c];}
  return [t*ratio, t*(1-ratio)];
}

function parseQuickIncome(raw, settings){
  const text = raw.toLowerCase().trim();
  if(!/^[+]|^(rev|ven|sal|remb|bonus|prime|vrac|vite|free)/.test(text)) return null;
  const m = text.match(/\b(\d+([.,]\d{1,2})?)\b/);
  const amount = m ? parseFloat(m[1].replace(",",".")) : null;
  if(!amount) return null;
  const nameGui = settings.names[1].toLowerCase();
  const person = new RegExp("\\b("+nameGui.slice(0,3)+"|gui)\\b").test(text) ? "gui" : "cap";
  const labelRaw = text.replace(m[0],"").replace(/\b(\+|euros?|€|gui|cap|rev|ven|sal|remb)\b/gi,"").trim();
  const label = labelRaw.charAt(0).toUpperCase()+labelRaw.slice(1)||"Revenu";
  const type = /sal/.test(text)?"salary":/remb/.test(text)?"refund":/ven|vrac|vite/.test(text)?"variable":"other";
  return {_isIncome:true, id:gid(), label, amount, person, type, date:new Date().toISOString().slice(0,10), note:""};
}

function parseQuickAdd(raw, envelopes, settings){
  const text = raw.toLowerCase().trim();
  const ratio = settings.ratioCap/100;
  const nameGui = settings.names[1].toLowerCase();
  const m = text.match(/\b(\d+([.,]\d{1,2})?)\b/);
  const amount = m ? parseFloat(m[1].replace(",",".")) : null;
  if(!amount) return null;
  let splitType = "prorata";
  if(/50.50|moitié|égal|equal/.test(text)) splitType="equal";
  else if(new RegExp(nameGui+"\\s*seul").test(text)) splitType="gui_only";
  const paidBy = new RegExp("\\b("+nameGui.slice(0,3)+"|gui)\\b").test(text) ? "gui" : "cap";
  const best = envelopes.map(env=>{
    const score = env.name.toLowerCase().split(/[\s&/]+/).reduce((s,k)=>s+(text.includes(k.slice(0,4))?2:0),0)+(text.includes(env.emoji)?5:0);
    return {id:env.id, score};
  }).sort((a,b)=>b.score-a.score)[0];
  const envelopeId = best&&best.score>0 ? best.id : envelopes[0]?.id||"";
  const labelRaw = text.replace(m[0],"").replace(/\b(euros?|€|50.50|gui|cap|seul[e]?)\b/gi,"").trim();
  const label = labelRaw.charAt(0).toUpperCase()+labelRaw.slice(1)||"Dépense";
  const [cp,gp] = computeParts(amount, splitType, "", ratio);
  return {id:gid(), label, amount, envelopeId, paidBy, splitType, capPart:parseFloat(cp.toFixed(2)), guiPart:parseFloat(gp.toFixed(2)), balance:paidBy==="cap"?gp:-cp, date:new Date().toISOString().slice(0,10), note:""};
}

// ── CSS — EXACTEMENT ton design ──
const CSS = `
:root { --p: #f43f8a; --s: #8b5cf6; --acc: #10b981; --warn: #f59e0b; --err: #ef4444; }
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
body { background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; overflow-x: hidden; }
.app { min-height: 100vh; background: linear-gradient(135deg, #fdf2f8 0%, #eef2ff 100%); padding-bottom: 140px; }
.glass { background: rgba(255,255,255,0.65); backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,0.8); border-radius: 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); padding: 22px; transition: 0.3s ease; }
.header { background: rgba(255,255,255,0.82); backdrop-filter: blur(25px); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 18px 20px 0; }
.hero-card { text-align: center; padding: 35px 20px; border-radius: 35px; border: 1px solid rgba(255,255,255,0.7); margin-bottom: 20px; position: relative; overflow: hidden; }
.hero-amt { font-size: 46px; font-weight: 900; letter-spacing: -2px; margin: 8px 0; }
.hero-lbl { font-size: 11px; font-weight: 800; text-transform: uppercase; opacity: 0.5; letter-spacing: 1.5px; }
.nav-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none; -ms-overflow-style: none; }
.nav-scroll::-webkit-scrollbar { display: none; }
.tab { background: none; border: none; padding: 10px 16px; font-weight: 700; color: #94a3b8; font-size: 11px; border-bottom: 3px solid transparent; transition: 0.3s; white-space: nowrap; border-radius: 12px 12px 0 0; cursor: pointer; }
.tab.on { color: var(--p); border-bottom-color: var(--p); background: rgba(244,63,138,0.05); }
.fab { position: fixed; bottom: 105px; right: 20px; width: 66px; height: 66px; background: linear-gradient(135deg, var(--p), #c026d3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 34px; box-shadow: 0 12px 28px rgba(244,63,138,0.4); z-index: 200; cursor: pointer; transition: 0.2s cubic-bezier(0.175,0.885,0.32,1.275); border: none; }
.fab:active { transform: scale(0.88) rotate(90deg); }
.fab-inc { position: fixed; bottom: 115px; right: 96px; width: 50px; height: 50px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 8px 20px rgba(16,185,129,0.4); z-index: 200; cursor: pointer; border: none; }
.qa-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); padding: 15px 20px 35px; border-top: 1px solid rgba(0,0,0,0.05); z-index: 150; }
.qa-input { width: 100%; padding: 18px 55px 18px 22px; border-radius: 22px; border: 2px solid #f1f5f9; background: #fff; font-size: 16px; outline: none; box-shadow: 0 4px 15px rgba(0,0,0,0.03); font-family: inherit; }
.qa-input:focus { border-color: var(--p); box-shadow: 0 4px 20px rgba(244,63,138,0.1); }
.qa-hint { font-size: 10px; color: #c4b5d5; text-align: center; margin-bottom: 8px; font-weight: 600; }
.qa-preview { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; padding: 8px 12px; background: rgba(255,255,255,0.9); border: 1px solid rgba(244,63,138,0.12); border-radius: 16px; }
.qa-tag { padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 700; }
.ov { position: fixed; inset: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(8px); z-index: 300; display: flex; align-items: flex-end; }
.sh { background: white; width: 100%; border-radius: 35px 35px 0 0; padding: 30px; max-height: 94vh; overflow-y: auto; animation: slideIn 0.35s cubic-bezier(0,0.5,0.5,1); box-shadow: 0 -10px 40px rgba(0,0,0,0.1); }
@keyframes slideIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
input, select, textarea { width: 100%; padding: 16px; border-radius: 18px; border: 1.5px solid #e2e8f0; background: #f8fafc; font-size: 16px; margin-top: 8px; outline: none; transition: all 0.2s; font-family: inherit; }
input:focus, select:focus { border-color: var(--p); background: white; box-shadow: 0 0 0 4px rgba(244,63,138,0.08); }
.chip { padding: 12px 18px; border-radius: 16px; font-size: 13px; font-weight: 700; background: #f1f5f9; color: #64748b; cursor: pointer; border: none; flex: 1; text-align: center; transition: 0.2s; }
.chip.on { background: var(--p); color: white; box-shadow: 0 6px 15px rgba(244,63,138,0.25); }
.chip.acc.on { background: var(--acc); box-shadow: 0 6px 15px rgba(16,185,129,0.25); }
.chip-sm { padding: 8px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; background: #f1f5f9; color: #64748b; cursor: pointer; border: none; text-align: center; transition: 0.2s; }
.chip-sm.on { background: var(--p); color: white; }
.erow { display: flex; align-items: center; gap: 15px; padding: 20px; background: rgba(255,255,255,0.55); border-radius: 22px; margin-bottom: 12px; border: 1px solid #f1f5f9; transition: 0.2s; cursor: pointer; }
.erow:active { transform: scale(0.98); background: white; }
.gauge { height: 12px; border-radius: 10px; background: #f1f5f9; overflow: hidden; margin-top: 12px; }
.gauge-bar { height: 100%; transition: width 1s cubic-bezier(0.34,1.56,0.64,1); }
.toast { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: #1e293b; color: white; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 14px; z-index: 1000; box-shadow: 0 15px 35px rgba(0,0,0,0.25); animation: toastIn 0.3s ease; white-space: nowrap; }
@keyframes toastIn { from { transform: translate(-50%,-20px); opacity: 0; } to { transform: translate(-50%,0); opacity: 1; } }
.bg2 { background: rgba(255,255,255,0.7); border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 7px 11px; cursor: pointer; font-size: 14px; color: #64748b; font-family: inherit; font-weight: 700; }
.env-card { padding: 18px; background: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.85); border-left: 4px solid transparent; border-radius: 20px; margin-bottom: 12px; }
.otab { background: rgba(255,255,255,0.6); border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 9px 15px; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; flex: 1; text-align: center; }
.otab.on { border-color: var(--p); color: var(--p); background: rgba(244,63,138,0.06); }
.sect { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin: 16px 0 10px; }
.inc-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
.inc-row:last-child { border-bottom: none; }
.rep-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
`;

const API_URL = "https://tfrezncozblmfctwgayo.supabase.co/rest/v1/kv_store";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcmV6bmNvemJsbWZjdHdnYXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDUxNzcsImV4cCI6MjA4ODU4MTE3N30.VOCinZ5T4sR1eCdWpwa3S5AzZ-SfQY-l_TgegmyYxLY";
const HDRS = {"Content-Type":"application/json","apikey":API_KEY,"Authorization":"Bearer "+API_KEY};

export default function App(){
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
  const [toast,      setToast]      = useState(null);
  const [envOwner,   setEnvOwner]   = useState("shared");
  const [qaText,     setQaText]     = useState("");
  const [qaPreview,  setQaPreview]  = useState(null);

  const [showAddExp, setShowAddExp] = useState(false);
  const [showAddInc, setShowAddInc] = useState(false);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [showAddRec, setShowAddRec] = useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [editExp,    setEditExp]    = useState(null);
  const [editEnv,    setEditEnv]    = useState(null);
  const [editRec,    setEditRec]    = useState(null);

  const [expForm, setExpForm] = useState({label:"",amount:"",envelopeId:"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});
  const [incForm, setIncForm] = useState({label:"",amount:"",splitType:"cap_only",capShare:"",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
  const [envForm, setEnvForm] = useState({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:"shared"});
  const [recForm, setRecForm] = useState({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:"",color:"#f43f8a"});
  const [setForm, setSetForm] = useState({...DEFAULT_SETTINGS});

  useEffect(()=>{
    async function load(){
      try{
        const res = await fetch(`${API_URL}?select=*`, {headers:HDRS});
        const data = await res.json();
        if(Array.isArray(data)) data.forEach(d=>{
          try{
            if(d.id===SK.exp) setExpenses(JSON.parse(d.value));
            if(d.id===SK.env) setEnvelopes(JSON.parse(d.value));
            if(d.id===SK.rep) setRepayments(JSON.parse(d.value));
            if(d.id===SK.set){const s=JSON.parse(d.value);setSettings(s);setSetForm(s);}
            if(d.id===SK.rec) setRecurring(JSON.parse(d.value));
            if(d.id===SK.inc) setIncomes(JSON.parse(d.value));
          }catch{}
        });
      }catch{}
      setLoaded(true);
    }
    load();
  },[]);

  const persist = async(key, val)=>{
    try{ await fetch(API_URL,{method:"POST",headers:{...HDRS,"Prefer":"resolution=merge-duplicates"},body:JSON.stringify({id:key,value:JSON.stringify(val)})}); }catch{}
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch{}
  };

  const showT = m=>{setToast(m); setTimeout(()=>setToast(null),2500);};

  const ratio   = settings.ratioCap/100;
  const nameCap = settings.names[0];
  const nameGui = settings.names[1];
  const today   = new Date().getDate();
  const isCurMo = filterMonth===new Date().getMonth()&&filterYear===new Date().getFullYear();

  const filtExp = expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;});
  const filtInc = incomes.filter(i=>{const d=new Date(i.date);return d.getMonth()===filterMonth&&d.getFullYear()===filterYear;});
  const filtRep = repayments.filter(r=>r.month!==undefined?r.month===filterMonth&&r.year===filterYear:new Date(r.date).getMonth()===filterMonth&&new Date(r.date).getFullYear()===filterYear);

  const totalSpent = filtExp.reduce((a,e)=>a+e.amount,0);
  const capSpent   = filtExp.reduce((a,e)=>a+e.capPart,0);
  const guiSpent   = filtExp.reduce((a,e)=>a+e.guiPart,0);
  const capIncome  = filtInc.reduce((a,i)=>a+(i.capPart!==undefined?i.capPart:i.person==="cap"?i.amount:0),0);
  const guiIncome  = filtInc.reduce((a,i)=>a+(i.guiPart!==undefined?i.guiPart:i.person==="gui"?i.amount:0),0);
  const rawDebt    = filtExp.reduce((a,e)=>a+(e.balance||0),0);
  const totalRepaid= filtRep.reduce((a,r)=>a+r.amount,0);
  const netDebt    = rawDebt - totalRepaid;

  const envSpend = envelopes.map(env=>{
    const spent=filtExp.filter(e=>e.envelopeId===env.id).reduce((a,e)=>a+e.amount,0);
    return {...env, spent, pct:env.budget>0?Math.min(100,spent/env.budget*100):0};
  });
  const upcoming = recurring.filter(r=>isCurMo&&r.dayOfMonth>=today).sort((a,b)=>a.dayOfMonth-b.dayOfMonth).slice(0,4);

  useEffect(()=>{
    if(qaText.length>1){
      const inc=parseQuickIncome(qaText,settings);
      if(inc){setQaPreview(inc);return;}
      setQaPreview(parseQuickAdd(qaText,envelopes,settings));
    } else setQaPreview(null);
  },[qaText,envelopes,settings]);

  function saveExpForm(){
    const amt=parseFloat(expForm.amount);
    if(!expForm.label.trim()||isNaN(amt)||amt<=0||!expForm.envelopeId) return;
    const [cp,gp]=computeParts(amt,expForm.splitType,expForm.capShare,ratio);
    const exp={id:editExp?editExp.id:gid(),label:expForm.label,amount:amt,envelopeId:expForm.envelopeId,paidBy:expForm.paidBy,splitType:expForm.splitType,capPart:parseFloat(cp.toFixed(2)),guiPart:parseFloat(gp.toFixed(2)),balance:parseFloat((expForm.paidBy==="cap"?gp:-cp).toFixed(2)),date:expForm.date,note:expForm.note};
    const next=editExp?expenses.map(e=>e.id===editExp.id?exp:e):[exp,...expenses];
    setExpenses(next);persist(SK.exp,next);setShowAddExp(false);setEditExp(null);
    showT(editExp?"✏️ Modifiée":"✅ Ajoutée !");
  }
  function delExp(id){const n=expenses.filter(e=>e.id!==id);setExpenses(n);persist(SK.exp,n);showT("🗑️ Supprimée");}

  function submitQA(){
    if(!qaPreview) return;
    if(qaPreview._isIncome){
      const next=[qaPreview,...incomes];setIncomes(next);persist(SK.inc,next);
      showT("💰 "+qaPreview.label+" +"+fmt(qaPreview.amount));
    } else {
      const next=[qaPreview,...expenses];setExpenses(next);persist(SK.exp,next);
      showT("✅ "+qaPreview.label+" — "+fmt(qaPreview.amount));
    }
    setQaText(""); setQaPreview(null);
  }

  function addIncome(){
    const amt=parseFloat(incForm.amount);
    if(!incForm.label.trim()||isNaN(amt)||amt<=0) return;
    const [cp,gp]=computeParts(amt,incForm.splitType,incForm.capShare,ratio);
    const entry={id:gid(),label:incForm.label,amount:amt,splitType:incForm.splitType,capPart:parseFloat(cp.toFixed(2)),guiPart:parseFloat(gp.toFixed(2)),type:incForm.type,date:incForm.date,note:incForm.note};
    // Si perso → person garde pour affichage, sinon shared
    entry.person = incForm.splitType==="cap_only"?"cap":incForm.splitType==="gui_only"?"gui":"shared";
    const next=[entry,...incomes];setIncomes(next);persist(SK.inc,next);
    setShowAddInc(false);setIncForm({label:"",amount:"",splitType:"cap_only",capShare:"",type:"salary",date:new Date().toISOString().slice(0,10),note:""});
    showT("💰 Revenu ajouté !");
  }
  function delInc(id){const n=incomes.filter(i=>i.id!==id);setIncomes(n);persist(SK.inc,n);showT("🗑️ Supprimé");}

  function saveEnvForm(){
    if(!envForm.name.trim()) return;
    const entry={...envForm,budget:parseFloat(envForm.budget)||0};
    const next=editEnv?envelopes.map(e=>e.id===editEnv.id?{...e,...entry}:e):[...envelopes,{...entry,id:gid()}];
    setEnvelopes(next);persist(SK.env,next);setShowAddEnv(false);setEditEnv(null);
    showT(editEnv?"✏️ Modifiée":"✅ Enveloppe créée !");
  }
  function delEnv(id){const n=envelopes.filter(e=>e.id!==id);setEnvelopes(n);persist(SK.env,n);showT("🗑️ Supprimée");}

  function saveRecForm(){
    if(!recForm.label.trim()) return;
    const entry={...recForm,id:editRec?editRec.id:gid(),dayOfMonth:parseInt(recForm.dayOfMonth)||1,amount:parseFloat(recForm.amount)||0};
    const next=editRec?recurring.map(r=>r.id===editRec.id?entry:r):[...recurring,entry];
    setRecurring(next);persist(SK.rec,next);setShowAddRec(false);setEditRec(null);
    showT(editRec?"✏️ Modifiée":"✅ Récurrente créée !");
  }
  function delRec(id){const n=recurring.filter(r=>r.id!==id);setRecurring(n);persist(SK.rec,n);showT("🗑️ Supprimée");}

  function markRepaid(){
    if(Math.abs(netDebt)<0.1) return;
    const next=[{id:gid(),amount:netDebt,month:filterMonth,year:filterYear,date:new Date().toISOString().slice(0,10)},...repayments];
    setRepayments(next);persist(SK.rep,next);showT("🤝 Dette soldée !");
  }
  function delRepayment(id){const n=repayments.filter(r=>r.id!==id);setRepayments(n);persist(SK.rep,n);showT("🗑️ Remboursement supprimé");}

  function saveSettings2(){
    const s={ratioCap:parseInt(setForm.ratioCap)||42,names:[setForm.names?.[0]||"Capucine",setForm.names?.[1]||"Guillaume"],salCap:parseFloat(setForm.salCap)||2100,salGui:parseFloat(setForm.salGui)||2900};
    setSettings(s);persist(SK.set,s);setShowSettings(false);showT("⚙️ Sauvegardé !");
  }

  if(!loaded) return null;

  const slabel={prorata:`⚖️ ${settings.ratioCap}/${100-settings.ratioCap}`,equal:"🤝 50/50",cap_only:"👩 "+nameCap,gui_only:"👨 "+nameGui,custom:"✏️ Perso"};
  const debtColor = Math.abs(netDebt)<1?"var(--acc)":netDebt>0?"var(--p)":"var(--s)";
  const debtBg    = Math.abs(netDebt)<1?"rgba(16,185,129,0.1)":netDebt>0?"rgba(244,63,138,0.1)":"rgba(139,92,246,0.1)";
  const debtLabel = Math.abs(netDebt)<1?"Comptes à jour":netDebt>0?nameGui+" doit à "+nameCap:nameCap+" doit à "+nameGui;

  return(
    <div className="app">
      <style>{CSS}</style>
      {toast&&<div className="toast">{toast}</div>}

      {/* ── HEADER — ton design exact ── */}
      <div className="header">
        <div style={{maxWidth:500,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:15}}>
            <div style={{fontWeight:900,fontSize:24,letterSpacing:"-1.2px"}}>💸 Budget <span style={{color:"var(--p)"}}>v6</span></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button className="bg2" onClick={()=>setFilterMonth(m=>m===0?11:m-1)}>‹</button>
              <span style={{fontWeight:800,fontSize:13,minWidth:70,textAlign:"center"}}>{MSHT[filterMonth]} {filterYear}</span>
              <button className="bg2" onClick={()=>setFilterMonth(m=>m===11?0:m+1)}>›</button>
              <button className="bg2" onClick={()=>setShowSettings(true)}>⚙️</button>
            </div>
          </div>
          <div className="nav-scroll">
            {[["dashboard","ACCUEIL"],["balance","DÉPENSES"],["envelopes","ENVELOPPES"],["calendar","RÉCURRENTES"],["incomes","REVENUS"],["solde","SOLDES"],["charts","STATS"]].map(([k,l])=>(
              <button key={k} className={"tab"+(tab===k?" on":"")} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:"16px 20px 0",maxWidth:500,margin:"0 auto"}}>

        {/* ══ DASHBOARD — ton design exact ══ */}
        {tab==="dashboard"&&(<>
          <div className="hero-card glass" style={{background:debtBg,borderColor:debtColor}}>
            <div className="hero-lbl">{debtLabel}</div>
            <div className="hero-amt" style={{color:debtColor}}>{fmt(Math.abs(netDebt))}</div>
            {Math.abs(netDebt)>1&&<button className="chip on" style={{borderRadius:25,padding:"12px 25px",marginTop:8}} onClick={markRepaid}>Solder la dette</button>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15,marginBottom:25}}>
            <div className="glass" style={{padding:18}}>
              <div className="hero-lbl">Part {nameCap}</div>
              <div style={{fontSize:20,fontWeight:900,color:"var(--p)",marginTop:4}}>{fmt(capSpent)}</div>
              {capIncome>0&&<div style={{fontSize:11,color:"var(--acc)",fontWeight:700,marginTop:4}}>+{fmt(capIncome)} revenus</div>}
            </div>
            <div className="glass" style={{padding:18}}>
              <div className="hero-lbl">Part {nameGui}</div>
              <div style={{fontSize:20,fontWeight:900,color:"var(--s)",marginTop:4}}>{fmt(guiSpent)}</div>
              {guiIncome>0&&<div style={{fontSize:11,color:"var(--acc)",fontWeight:700,marginTop:4}}>+{fmt(guiIncome)} revenus</div>}
            </div>
          </div>

          <div className="hero-lbl" style={{marginBottom:12}}>Budget Commun ({settings.ratioCap}%)</div>
          {envSpend.filter(e=>e.owner==="shared").map(env=>(
            <div key={env.id} className="glass" style={{marginBottom:12,padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontWeight:800}}>
                <span style={{fontSize:16}}>{env.emoji} {env.name}</span>
                <span style={{color:env.spent>env.budget&&env.budget>0?"var(--err)":"inherit"}}>{fmt(env.spent)}</span>
              </div>
              {env.budget>0&&<>
                <div className="gauge"><div className="gauge-bar" style={{width:`${env.pct}%`,background:env.spent>env.budget?"var(--err)":env.color}}/></div>
                <div style={{fontSize:10,marginTop:8,opacity:0.5,fontWeight:800}}>{Math.round(env.pct)}% de {fmt(env.budget)}</div>
              </>}
            </div>
          ))}

          {upcoming.length>0&&<>
            <div className="hero-lbl" style={{marginBottom:12,marginTop:8}}>À venir</div>
            {upcoming.map(r=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:r.color+"12",borderRadius:18,marginBottom:10,border:"1px solid "+r.color+"22"}}>
                <span style={{fontSize:20}}>{r.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{r.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{fmt(r.amount)} · j.{r.dayOfMonth}</div>
                </div>
                <span style={{fontSize:11,fontWeight:800,color:r.color,background:r.color+"18",padding:"3px 10px",borderRadius:99}}>{r.dayOfMonth-today===0?"Auj.":r.dayOfMonth-today===1?"Dem.":"J+"+(r.dayOfMonth-today)}</span>
              </div>
            ))}
          </>}
        </>)}

        {/* ══ DÉPENSES — ton design exact ══ */}
        {tab==="balance"&&(
          <div className="glass" style={{padding:10}}>
            {filtExp.length===0
              ?<div style={{padding:60,textAlign:"center",opacity:0.4,fontWeight:800}}>AUCUNE DÉPENSE</div>
              :filtExp.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>(
                <div key={e.id} className="erow" onClick={()=>{setEditExp(e);setExpForm({...e,amount:String(e.amount)});setShowAddExp(true);}}>
                  <div style={{fontSize:24,width:45,height:45,background:"rgba(0,0,0,0.03)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{envelopes.find(v=>v.id===e.envelopeId)?.emoji||"📦"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:15}}>{e.label}</div>
                    <div style={{fontSize:11,opacity:0.5,fontWeight:700}}>{e.paidBy.toUpperCase()} · {slabel[e.splitType]}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,color:e.paidBy==="cap"?"var(--p)":"var(--s)"}}>{fmt(e.amount)}</div>
                    <div style={{fontSize:10,fontWeight:800,opacity:0.3}}>{e.date.split("-").reverse().slice(0,2).join("/")}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ══ ENVELOPPES ══ */}
        {tab==="envelopes"&&(<>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {["shared","cap","gui"].map(o=>(
              <button key={o} className={"otab"+(envOwner===o?" on":"")} onClick={()=>setEnvOwner(o)}>
                {o==="shared"?"🤝 COMMUN":o==="cap"?"👩 "+nameCap:"👨 "+nameGui}
              </button>
            ))}
          </div>
          {envSpend.filter(e=>e.owner===envOwner).map(env=>(
            <div key={env.id} className="env-card" style={{borderLeftColor:env.color}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:13,background:env.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{env.emoji}</div>
                  <div>
                    <div style={{fontWeight:800,fontSize:15}}>{env.name}</div>
                    <div style={{fontSize:11,opacity:0.5,fontWeight:800,marginTop:2}}>BUDGET: {env.budget?fmt(env.budget):"NON DÉFINI"}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <div style={{fontWeight:900,fontSize:18,color:env.spent>env.budget&&env.budget>0?"var(--err)":env.color}}>{fmt(env.spent)}</div>
                  <div style={{display:"flex",gap:5}}>
                    <button style={{background:"rgba(0,0,0,0.04)",border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:13}} onClick={()=>{setEditEnv(env);setEnvForm({name:env.name,emoji:env.emoji,color:env.color,budget:env.budget||"",owner:env.owner});setShowAddEnv(true);}}>✏️</button>
                    <button style={{background:"rgba(244,63,138,0.06)",border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer",fontSize:13,color:"var(--p)"}} onClick={()=>delEnv(env.id)}>🗑️</button>
                  </div>
                </div>
              </div>
              {env.budget>0&&<div className="gauge" style={{marginTop:12}}><div className="gauge-bar" style={{width:`${Math.min(100,env.pct)}%`,background:env.pct>90?"var(--err)":env.pct>70?"var(--warn)":env.color}}/></div>}
            </div>
          ))}
          <button className="chip" style={{width:"100%",marginTop:8,padding:13}} onClick={()=>{setEditEnv(null);setEnvForm({name:"",emoji:"🛒",color:"#f43f8a",budget:"",owner:envOwner});setShowAddEnv(true);}}>+ Nouvelle enveloppe</button>
        </>)}

        {/* ══ RÉCURRENTES ══ */}
        {tab==="calendar"&&(<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:12,color:"#94a3b8",fontWeight:700}}>Total : <b style={{color:"#1e293b"}}>{fmt(recurring.reduce((a,r)=>a+r.amount,0))}/mois</b></span>
            <button className="chip on" style={{flex:"none",padding:"9px 16px",fontSize:12}} onClick={()=>{setEditRec(null);setRecForm({label:"",emoji:"⚡",dayOfMonth:1,amount:"",splitType:"prorata",paidBy:"cap",envelopeId:envelopes[0]?.id||"",color:"#f43f8a"});setShowAddRec(true);}}>+ Ajouter</button>
          </div>
          {[...recurring].sort((a,b)=>a.dayOfMonth-b.dayOfMonth).map(r=>{
            const [cp,gp]=computeParts(r.amount,r.splitType,"",ratio);
            return(
              <div key={r.id} style={{display:"flex",gap:12,padding:"14px 16px",background:r.color+"0e",borderRadius:18,border:"1px solid "+r.color+"22",borderLeft:"3px solid "+r.color,marginBottom:10,alignItems:"center"}}>
                <div style={{width:42,height:42,borderRadius:12,background:r.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{r.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14}}>{r.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>j.{r.dayOfMonth} · {slabel[r.splitType]}</div>
                  <div style={{fontSize:11,marginTop:2}}><span style={{color:"var(--p)",fontWeight:700}}>{fmt(cp)}</span><span style={{color:"#e5e7eb"}}> · </span><span style={{color:"var(--s)",fontWeight:700}}>{fmt(gp)}</span></div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:900,color:r.color}}>{fmt(r.amount)}</div>
                  <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"flex-end"}}>
                    <button style={{background:"rgba(0,0,0,0.04)",border:"none",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:12}} onClick={()=>{setEditRec(r);setRecForm({...r});setShowAddRec(true);}}>✏️</button>
                    <button style={{background:"rgba(244,63,138,0.06)",border:"none",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:12,color:"var(--p)"}} onClick={()=>delRec(r.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>)}

        {/* ══ REVENUS ══ */}
        {tab==="incomes"&&(<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15,marginBottom:20}}>
            {[[nameCap,"var(--p)",capIncome],[nameGui,"var(--s)",guiIncome]].map(([name,color,inc])=>(
              <div key={name} className="glass" style={{padding:18,borderTop:"3px solid "+color}}>
                <div className="hero-lbl">{name}</div>
                <div style={{fontSize:22,fontWeight:900,color,marginTop:4}}>{fmt(inc)}</div>
              </div>
            ))}
          </div>
          <div className="glass" style={{padding:12}}>
            {filtInc.length===0
              ?<div style={{padding:50,textAlign:"center",opacity:0.4,fontWeight:800}}>AUCUN REVENU CE MOIS</div>
              :filtInc.map(i=>{
                const t=INC_TYPES.find(x=>x.key===i.type)||INC_TYPES[3];
                return(
                  <div key={i.id} className="inc-row">
                    <div style={{width:40,height:40,borderRadius:11,background:"rgba(16,185,129,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{t.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14}}>{i.label}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>
                        {i.splitType==="prorata"?"⚖️ Pro rata":i.splitType==="equal"?"🤝 50/50":i.splitType==="gui_only"?"👨 "+nameGui:"👩 "+nameCap}
                        {" · "}{i.date}
                      </div>
                      {i.splitType!=="cap_only"&&i.splitType!=="gui_only"&&i.capPart!==undefined&&(
                        <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>
                          <span style={{color:"var(--p)",fontWeight:700}}>+{fmt(i.capPart)}</span> · <span style={{color:"var(--s)",fontWeight:700}}>+{fmt(i.guiPart)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:900,color:"var(--acc)",fontSize:15}}>+{fmt(i.amount)}</span>
                      <button style={{background:"rgba(244,63,138,0.06)",border:"none",borderRadius:8,padding:"5px 8px",cursor:"pointer",fontSize:12,color:"var(--p)"}} onClick={()=>delInc(i.id)}>🗑️</button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </>)}

        {/* ══ SOLDES ══ */}
        {tab==="solde"&&(<>
          <div className="hero-card glass" style={{background:debtBg,borderColor:debtColor}}>
            <div className="hero-lbl">{debtLabel}</div>
            <div className="hero-amt" style={{color:debtColor}}>{fmt(Math.abs(netDebt))}</div>
            {rawDebt!==netDebt&&<div style={{fontSize:11,opacity:0.5,fontWeight:700,marginBottom:8}}>Brut {fmt(Math.abs(rawDebt))} · Remboursé {fmt(totalRepaid)}</div>}
            {Math.abs(netDebt)>0.1&&<button className="chip on" style={{borderRadius:25,padding:"12px 25px"}} onClick={markRepaid}>✅ Solder · {fmt(Math.abs(netDebt))}</button>}
          </div>

          {envSpend.filter(e=>Math.abs(filtExp.filter(x=>x.envelopeId===e.id).reduce((a,x)=>a+x.balance,0))>0.01).map(env=>{
            const bal=filtExp.filter(e2=>e2.envelopeId===env.id).reduce((a,e2)=>a+e2.balance,0);
            return(
              <div key={env.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"rgba(255,255,255,0.6)",borderRadius:18,marginBottom:10,border:"1px solid rgba(255,255,255,0.85)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:22}}>{env.emoji}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{env.name}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{bal>0?nameGui+" → "+nameCap:nameCap+" → "+nameGui}</div>
                  </div>
                </div>
                <span style={{fontWeight:900,fontSize:16,color:bal>0?"#059669":"#be185d"}}>{fmt(Math.abs(bal))}</span>
              </div>
            );
          })}

          {repayments.length>0&&(
            <div className="glass" style={{padding:"14px 18px",marginTop:8}}>
              <div className="sect" style={{marginTop:0}}>Historique</div>
              {repayments.slice(0,8).map(r=>(
                <div key={r.id} className="rep-row">
                  <span style={{fontSize:12,color:"#94a3b8"}}>{r.date}</span>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:13,fontWeight:800,color:"var(--acc)"}}>✅ {fmt(r.amount)}</span>
                    <button style={{background:"rgba(244,63,138,0.06)",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:12,color:"var(--p)"}} onClick={()=>delRepayment(r.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ══ STATS ══ */}
        {tab==="charts"&&(<>
          <div className="glass" style={{marginBottom:20,padding:25}}>
            <div className="hero-lbl" style={{marginBottom:20}}>Répartition Réelle</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={[{name:nameCap,value:capSpent},{name:nameGui,value:guiSpent}]} dataKey="value" innerRadius={75} outerRadius={95} paddingAngle={8} cornerRadius={12}>
                  <Cell fill="var(--p)"/><Cell fill="var(--s)"/>
                </Pie>
                <Tooltip formatter={v=>fmt(v)}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",justifyContent:"space-around",marginTop:25}}>
              <div style={{textAlign:"center"}}><div className="hero-lbl">{nameCap}</div><div style={{fontWeight:900,fontSize:20,color:"var(--p)"}}>{Math.round(capSpent/(totalSpent||1)*100)}%</div></div>
              <div style={{textAlign:"center"}}><div className="hero-lbl">{nameGui}</div><div style={{fontWeight:900,fontSize:20,color:"var(--s)"}}>{Math.round(guiSpent/(totalSpent||1)*100)}%</div></div>
            </div>
          </div>
          <div className="glass" style={{padding:22}}>
            <div className="hero-lbl" style={{marginBottom:14}}>Par enveloppe</div>
            {envSpend.filter(e=>e.spent>0).sort((a,b)=>b.spent-a.spent).map(env=>(
              <div key={env.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:13,fontWeight:700}}>{env.emoji} {env.name}</span>
                  <span style={{fontSize:13,fontWeight:900,color:env.color}}>{fmt(env.spent)}</span>
                </div>
                {env.budget>0&&<div className="gauge"><div className="gauge-bar" style={{width:`${Math.min(100,env.pct)}%`,background:env.pct>90?"var(--err)":env.color}}/></div>}
              </div>
            ))}
          </div>
        </>)}
      </div>

      {/* ── FABs ── */}
      <button className="fab-inc" onClick={()=>setShowAddInc(true)}>💰</button>
      <button className="fab" onClick={()=>{setEditExp(null);setExpForm({label:"",amount:"",envelopeId:envelopes[0]?.id||"",paidBy:"cap",splitType:"prorata",capShare:"",date:new Date().toISOString().slice(0,10),note:""});setShowAddExp(true);}}>+</button>

      {/* ── QUICK ADD BAR — ton design exact ── */}
      <div className="qa-bar">
        <div style={{position:"relative",maxWidth:500,margin:"0 auto"}}>
          {qaPreview&&(
            <div className="qa-preview">
              {qaPreview._isIncome
                ?<><span>💰</span><span className="qa-tag" style={{background:"rgba(0,0,0,0.05)",color:"#374151"}}>{qaPreview.label}</span><span className="qa-tag" style={{background:"rgba(16,185,129,0.12)",color:"var(--acc)",fontWeight:800}}>+{fmt(qaPreview.amount)}</span><span className="qa-tag" style={{background:"rgba(16,185,129,0.07)",color:"#059669"}}>{qaPreview.person==="cap"?"👩 "+nameCap:qaPreview.person==="gui"?"👨 "+nameGui:"🤝 Partagé"}</span></>
                :<><span className="qa-tag" style={{background:"rgba(0,0,0,0.05)",color:"#374151"}}>{qaPreview.label}</span><span className="qa-tag" style={{background:"rgba(244,63,138,0.11)",color:"var(--p)"}}>{fmt(qaPreview.amount)}</span><span className="qa-tag" style={{background:"rgba(139,92,246,0.11)",color:"var(--s)"}}>{slabel[qaPreview.splitType]}</span></>
              }
            </div>
          )}
          {!qaPreview&&<div className="qa-hint">💸 "courses 47" · "loyer 800 gui" · "café 12 50/50" &nbsp;|&nbsp; 💰 "+vente 150" · "+salaire 2100"</div>}
          <input className="qa-input" placeholder='Taper "Lidl 54 50/50" ou "+vente 80" + Entrée' value={qaText} onChange={e=>setQaText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") submitQA();}}/>
          <div style={{position:"absolute",right:20,top:"50%",transform:"translateY(-50%)",fontSize:20,cursor:"pointer"}} onClick={()=>qaPreview?submitQA():null}>{qaPreview?"✅":"✨"}</div>
        </div>
      </div>

      {/* ══ MODAL DÉPENSE — ton design exact ══ */}
      {showAddExp&&(
        <div className="ov" onClick={()=>{setShowAddExp(false);setEditExp(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:900,fontSize:26,marginBottom:25,letterSpacing:"-1px"}}>{editExp?"Modifier":"Nouvelle dépense"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div><label className="hero-lbl">Libellé</label>
              <input placeholder="Quoi ?" value={expForm.label} onChange={e=>setExpForm({...expForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
                <div><label className="hero-lbl">Montant (€)</label>
                <input type="number" placeholder="0.00" value={expForm.amount} onChange={e=>setExpForm({...expForm,amount:e.target.value})}/></div>
                <div><label className="hero-lbl">Date</label>
                <input type="date" value={expForm.date} onChange={e=>setExpForm({...expForm,date:e.target.value})}/></div>
              </div>
              <div><label className="hero-lbl">Enveloppe cible</label>
              <select value={expForm.envelopeId} onChange={e=>setExpForm({...expForm,envelopeId:e.target.value})}>
                {["shared","cap","gui"].map(owner=>{
                  const grp=envelopes.filter(v=>v.owner===owner);
                  if(!grp.length) return null;
                  return <optgroup key={owner} label={owner==="shared"?"🤝 Commun":owner==="cap"?"👩 "+nameCap:"👨 "+nameGui}>
                    {grp.map(env=><option key={env.id} value={env.id}>{env.emoji} {env.name}</option>)}
                  </optgroup>;
                })}
              </select></div>
              <div><label className="hero-lbl">Qui a payé ?</label>
              <div style={{display:"flex",gap:10,marginTop:10}}>
                <button className={"chip"+(expForm.paidBy==="cap"?" on":"")} onClick={()=>setExpForm({...expForm,paidBy:"cap"})}>{nameCap}</button>
                <button className={"chip"+(expForm.paidBy==="gui"?" on":"")} onClick={()=>setExpForm({...expForm,paidBy:"gui"})}>{nameGui}</button>
              </div></div>
              <div><label className="hero-lbl">Mode de répartition</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                {SPLIT_OPTS.map(o=><button key={o.key} className={"chip"+(expForm.splitType===o.key?" on":"")} style={{flex:"none"}} onClick={()=>setExpForm({...expForm,splitType:o.key})}>{o.icon} {o.label}</button>)}
              </div>
              {expForm.splitType==="custom"&&<input type="number" placeholder={"Part de "+nameCap+" (€)"} value={expForm.capShare} onChange={e=>setExpForm({...expForm,capShare:e.target.value})} style={{marginTop:12}}/>}
              </div>
              <button className="chip on" style={{marginTop:15,padding:20,fontSize:16}} onClick={saveExpForm}>ENREGISTRER</button>
              {editExp&&<button className="chip" style={{background:"#fee2e2",color:"var(--err)"}} onClick={()=>{delExp(editExp.id);setShowAddExp(false);}}>SUPPRIMER</button>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL REVENU ══ */}
      {showAddInc&&(
        <div className="ov" onClick={()=>setShowAddInc(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:900,fontSize:26,marginBottom:25,letterSpacing:"-1px"}}>💰 Nouveau revenu</div>
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div><label className="hero-lbl">Libellé</label>
              <input placeholder="ex: Salaire, Vente Vinted…" value={incForm.label} onChange={e=>setIncForm({...incForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
                <div><label className="hero-lbl">Montant (€)</label>
                <input type="number" placeholder="0.00" value={incForm.amount} onChange={e=>setIncForm({...incForm,amount:e.target.value})}/></div>
                <div><label className="hero-lbl">Date</label>
                <input type="date" value={incForm.date} onChange={e=>setIncForm({...incForm,date:e.target.value})}/></div>
              </div>
              <div><label className="hero-lbl">Répartition du revenu</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                <button className={"chip acc"+(incForm.splitType==="cap_only"?" on":"")} style={{flex:"none"}} onClick={()=>setIncForm({...incForm,splitType:"cap_only"})}>👩 {nameCap} seule</button>
                <button className={"chip acc"+(incForm.splitType==="gui_only"?" on":"")} style={{flex:"none"}} onClick={()=>setIncForm({...incForm,splitType:"gui_only"})}>👨 {nameGui} seul</button>
                <button className={"chip acc"+(incForm.splitType==="equal"?" on":"")} style={{flex:"none"}} onClick={()=>setIncForm({...incForm,splitType:"equal"})}>🤝 50/50</button>
                <button className={"chip acc"+(incForm.splitType==="prorata"?" on":"")} style={{flex:"none"}} onClick={()=>setIncForm({...incForm,splitType:"prorata"})}>⚖️ Pro rata</button>
                <button className={"chip acc"+(incForm.splitType==="custom"?" on":"")} style={{flex:"none"}} onClick={()=>setIncForm({...incForm,splitType:"custom"})}>✏️ Perso</button>
              </div>
              {incForm.splitType==="custom"&&<input type="number" placeholder={"Part de "+nameCap+" (€)"} value={incForm.capShare} onChange={e=>setIncForm({...incForm,capShare:e.target.value})} style={{marginTop:12}}/>}
              {(incForm.splitType==="prorata"||incForm.splitType==="equal")&&incForm.amount&&(
                <div style={{marginTop:10,fontSize:12,color:"#94a3b8",display:"flex",gap:12}}>
                  {(()=>{const [cp,gp]=computeParts(parseFloat(incForm.amount)||0,incForm.splitType,"",ratio); return <><span style={{color:"var(--p)",fontWeight:700}}>👩 +{fmt(cp)}</span><span style={{color:"var(--s)",fontWeight:700}}>👨 +{fmt(gp)}</span></>})()}
                </div>
              )}
              </div>
              <div><label className="hero-lbl">Type</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                {INC_TYPES.map(t=><button key={t.key} className={"chip acc"+(incForm.type===t.key?" on":"")} style={{flex:"none"}} onClick={()=>setIncForm({...incForm,type:t.key})}>{t.emoji} {t.label}</button>)}
              </div></div>
              <button className="chip acc on" style={{marginTop:15,padding:20,fontSize:16}} onClick={addIncome}>ENREGISTRER</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ENVELOPPE ══ */}
      {showAddEnv&&(
        <div className="ov" onClick={()=>{setShowAddEnv(false);setEditEnv(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:900,fontSize:26,marginBottom:25,letterSpacing:"-1px"}}>{editEnv?"Modifier":"Nouvelle enveloppe"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div><label className="hero-lbl">Nom</label>
              <input placeholder="ex: Restos" value={envForm.name} onChange={e=>setEnvForm({...envForm,name:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
                <div><label className="hero-lbl">Budget €</label>
                <input type="number" placeholder="0" value={envForm.budget} onChange={e=>setEnvForm({...envForm,budget:e.target.value})}/></div>
                <div><label className="hero-lbl">Emoji</label>
                <select value={envForm.emoji} onChange={e=>setEnvForm({...envForm,emoji:e.target.value})}>
                  {EMOJIS.map(em=><option key={em} value={em}>{em}</option>)}
                </select></div>
              </div>
              <div><label className="hero-lbl">Propriétaire</label>
              <div style={{display:"flex",gap:10,marginTop:10}}>
                {["shared","cap","gui"].map(o=><button key={o} className={"chip"+(envForm.owner===o?" on":"")} onClick={()=>setEnvForm({...envForm,owner:o})}>{o==="shared"?"🤝":o==="cap"?"👩":"👨"} {o==="shared"?"Commun":o==="cap"?nameCap:nameGui}</button>)}
              </div></div>
              <button className="chip on" style={{marginTop:15,padding:20,fontSize:16}} onClick={saveEnvForm}>ENREGISTRER</button>
              {editEnv&&<button className="chip" style={{background:"#fee2e2",color:"var(--err)"}} onClick={()=>{delEnv(editEnv.id);setShowAddEnv(false);}}>SUPPRIMER</button>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL RÉCURRENTE ══ */}
      {showAddRec&&(
        <div className="ov" onClick={()=>{setShowAddRec(false);setEditRec(null);}}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:900,fontSize:26,marginBottom:25,letterSpacing:"-1px"}}>{editRec?"Modifier":"Nouvelle récurrente"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div><label className="hero-lbl">Libellé</label>
              <input placeholder="ex: Loyer, EDF…" value={recForm.label} onChange={e=>setRecForm({...recForm,label:e.target.value})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:15}}>
                <div><label className="hero-lbl">Montant €</label>
                <input type="number" placeholder="0.00" value={recForm.amount} onChange={e=>setRecForm({...recForm,amount:e.target.value})}/></div>
                <div><label className="hero-lbl">Jour du mois</label>
                <input type="number" min="1" max="31" value={recForm.dayOfMonth} onChange={e=>setRecForm({...recForm,dayOfMonth:e.target.value})}/></div>
              </div>
              <div><label className="hero-lbl">Répartition</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
                {SPLIT_OPTS.map(o=><button key={o.key} className={"chip"+(recForm.splitType===o.key?" on":"")} style={{flex:"none"}} onClick={()=>setRecForm({...recForm,splitType:o.key})}>{o.icon} {o.label}</button>)}
              </div></div>
              <div><label className="hero-lbl">Enveloppe</label>
              <select value={recForm.envelopeId} onChange={e=>setRecForm({...recForm,envelopeId:e.target.value})}>
                {envelopes.map(env=><option key={env.id} value={env.id}>{env.emoji} {env.name}</option>)}
              </select></div>
              <button className="chip on" style={{marginTop:15,padding:20,fontSize:16}} onClick={saveRecForm}>ENREGISTRER</button>
              {editRec&&<button className="chip" style={{background:"#fee2e2",color:"var(--err)"}} onClick={()=>{delRec(editRec.id);setShowAddRec(false);}}>SUPPRIMER</button>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL RÉGLAGES — ton design exact ══ */}
      {showSettings&&(
        <div className="ov" onClick={()=>setShowSettings(false)}>
          <div className="sh" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:900,fontSize:26,marginBottom:25}}>Réglages Globaux</div>
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div><label className="hero-lbl">Ratio {nameCap} (%)</label>
              <input type="number" value={setForm.ratioCap} onChange={e=>setSetForm({...setForm,ratioCap:parseInt(e.target.value)})}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label className="hero-lbl">Salaire {nameCap}</label>
                <input type="number" value={setForm.salCap} onChange={e=>setSetForm({...setForm,salCap:parseInt(e.target.value)})}/></div>
                <div><label className="hero-lbl">Salaire {nameGui}</label>
                <input type="number" value={setForm.salGui} onChange={e=>setSetForm({...setForm,salGui:parseInt(e.target.value)})}/></div>
              </div>
              <button className="chip on" style={{padding:20}} onClick={saveSettings2}>SAUVEGARDER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
