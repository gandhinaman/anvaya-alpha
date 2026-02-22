import { useState, useEffect, useRef } from "react";
import {
  Phone, Mic, MessageCircle, Heart, Activity, Pill,
  Home, Bell, Settings, ChevronRight, Play, Pause,
  Circle, User, LogOut, Headphones, Brain, Check, Menu, X,
  TrendingUp, Zap, BarChart2, PhoneOff
} from "lucide-react";
import SathiChat from "./sathi/SathiChat";
import MemoryRecorder from "./sathi/MemoryRecorder";
import { supabase } from "@/integrations/supabase/client";
import { useParentData } from "@/hooks/useParentData";

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 1200 });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth });
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return size;
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; overflow-x: hidden; }
  button { font-family: 'DM Sans', sans-serif; }
  input  { font-family: 'DM Sans', sans-serif; }

  @keyframes breathe {
    0%,100% { transform:scale(1); box-shadow:0 0 60px 20px rgba(6,78,59,.35),0 0 120px 40px rgba(6,78,59,.15); }
    50%      { transform:scale(1.08); box-shadow:0 0 80px 30px rgba(6,78,59,.5),0 0 160px 60px rgba(6,78,59,.2); }
  }
  @keyframes breatheX {
    0%,100% { transform:scale(1.35); box-shadow:0 0 100px 40px rgba(6,78,59,.5),0 0 200px 80px rgba(6,78,59,.25); }
    50%      { transform:scale(1.48); box-shadow:0 0 130px 50px rgba(6,78,59,.65),0 0 240px 100px rgba(6,78,59,.3); }
  }
  @keyframes waveBar {
    0%,100% { height:6px; }
    50%      { height:var(--mh); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
  @keyframes pring {
    0%  { transform:scale(.93); opacity:.7; }
    70% { transform:scale(1.13); opacity:0; }
    100%{ transform:scale(1.13); opacity:0; }
  }
  @keyframes chartGrow {
    from { transform: scaleY(0); }
    to   { transform: scaleY(1); }
  }
  @keyframes callPulse {
    0%   { transform:scale(1); box-shadow:0 0 0 0 rgba(5,150,105,.5); }
    70%  { transform:scale(1.05); box-shadow:0 0 0 30px rgba(5,150,105,0); }
    100% { transform:scale(1); box-shadow:0 0 0 0 rgba(5,150,105,0); }
  }
  @keyframes dotBounce {
    0%,80%,100% { transform:translateY(0); }
    40% { transform:translateY(-6px); }
  }

  .orb       { animation: breathe 4s ease-in-out infinite; }
  .orb-rec   { animation: breatheX 4s ease-in-out infinite; }
  .fadein    { animation: fadeIn .35s ease forwards; }

  .pring::before {
    content:''; position:absolute; inset:-14px; border-radius:50%;
    border:2px solid rgba(6,78,59,.4); animation:pring 2.6s ease-out infinite;
  }

  .glass {
    background:rgba(249,249,247,.08); backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,.1); border-radius:24px;
  }
  .gcard {
    background:rgba(255,255,255,0.72);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,0.55);
    border-radius:20px;
    box-shadow:0 8px 32px rgba(6,78,59,0.06);
  }
  .gtxt {
    background:linear-gradient(135deg,#064E3B 0%,#0d7a5f 50%,#059669 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }

  .s1{animation:fadeUp .5s ease .05s both;} .s2{animation:fadeUp .5s ease .12s both;}
  .s3{animation:fadeUp .5s ease .19s both;} .s4{animation:fadeUp .5s ease .26s both;}
  .s5{animation:fadeUp .5s ease .33s both;} .s6{animation:fadeUp .5s ease .40s both;}
  .s7{animation:fadeUp .5s ease .47s both;} .s8{animation:fadeUp .5s ease .54s both;}

  .scr::-webkit-scrollbar{width:4px;}
  .scr::-webkit-scrollbar-track{background:transparent;}
  .scr::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:4px;}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// SATHI COMPONENTS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

function Waveform() {
  const bars = [12,24,18,36,28,42,32,46,38,30,24,42,28,36,20,46,30,38,24,36];
  return (
    <div style={{display:"flex",alignItems:"center",gap:3,height:52}}>
      {bars.map((h,i)=>(
        <div key={i} style={{
          width:3,borderRadius:4,background:"rgba(249,249,247,.9)",minHeight:4,
          "--mh":`${h}px`,
          animation:`waveBar ${.6+(i%5)*.15}s ease-in-out ${i*.06}s infinite`
        }}/>
      ))}
    </div>
  );
}

function AudioPlayer({color="#4F46E5", audioUrl=null}) {
  const [playing,setPlaying]=useState(false);
  const [progress,setProgress]=useState(0);
  const [duration,setDuration]=useState(0);
  const audioRef=useRef(null);

  useEffect(()=>{
    if(!audioUrl) return;
    const a=new Audio(audioUrl);
    audioRef.current=a;
    a.addEventListener("loadedmetadata",()=>setDuration(a.duration));
    a.addEventListener("timeupdate",()=>{if(a.duration)setProgress((a.currentTime/a.duration)*100);});
    a.addEventListener("ended",()=>{setPlaying(false);setProgress(0);});
    return()=>{a.pause();a.src="";};
  },[audioUrl]);

  const toggle=()=>{
    if(!audioRef.current&&!audioUrl){
      // fallback mock behavior
      setPlaying(p=>!p);
      return;
    }
    if(!audioRef.current) return;
    if(playing){audioRef.current.pause();}else{audioRef.current.play();}
    setPlaying(p=>!p);
  };

  // Mock fallback for no audio
  useEffect(()=>{
    if(audioUrl||!playing) return;
    const t=setInterval(()=>setProgress(p=>p>=100?(setPlaying(false),0):p+.5),80);
    return()=>clearInterval(t);
  },[playing,audioUrl]);

  const seek=(e)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const pct=((e.clientX-r.left)/r.width)*100;
    setProgress(pct);
    if(audioRef.current&&audioRef.current.duration){audioRef.current.currentTime=(pct/100)*audioRef.current.duration;}
  };

  const fmt=(s)=>{const m=Math.floor(s/60);return`${m}:${String(Math.floor(s%60)).padStart(2,"0")}`;};

  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <button onClick={toggle} style={{
        width:36,height:36,borderRadius:"50%",background:color,
        border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
      }}>
        {playing?<Pause size={13} color="#fff" fill="#fff"/>:<Play size={13} color="#fff" fill="#fff"/>}
      </button>
      <div style={{flex:1,height:4,background:"#E5E7EB",borderRadius:4,cursor:"pointer"}} onClick={seek}>
        <div style={{height:"100%",width:`${progress}%`,background:color,borderRadius:4,transition:"width .1s"}}/>
      </div>
      <span style={{fontSize:11,color:"#6b6b6b",flexShrink:0}}>{duration?fmt(duration):"—"}</span>
    </div>
  );
}

// ─── CALL OVERLAY ─────────────────────────────────────────────────────────────
function CallOverlay({ open, onClose, lang, userId, linkedUserId, fromName }) {
  const [phase, setPhase] = useState("calling"); // calling | connected
  const [timer, setTimer] = useState(0);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!open) { setPhase("calling"); setTimer(0); return; }
    // Broadcast incoming_call via Realtime
    if (linkedUserId) {
      const ch = supabase.channel(`user:${linkedUserId}`);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ch.send({ type: "broadcast", event: "incoming_call", payload: { from_name: fromName || "Parent", from_id: userId } });
        }
      });
      channelRef.current = ch;
    }
    // After 3s transition to connected
    const t = setTimeout(() => setPhase("connected"), 3000);
    return () => { clearTimeout(t); if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; } };
  }, [open, linkedUserId]);

  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setTimer(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const endCall = () => {
    if (linkedUserId && channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "call_ended", payload: { from_id: userId } });
    }
    onClose();
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!open) return null;
  return (
    <div className="fadein" style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "linear-gradient(160deg,#022c22 0%,#064E3B 50%,#065f46 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24
    }}>
      {/* Pulsing circle */}
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "linear-gradient(135deg,#059669,#065f46)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: phase === "calling" ? "callPulse 1.5s ease-in-out infinite" : "none",
        boxShadow: phase === "connected" ? "0 0 40px rgba(5,150,105,.4)" : undefined,
        transition: "box-shadow .5s"
      }}>
        <Phone size={40} color="#F9F9F7" />
      </div>

      {/* Status text */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#F9F9F7", fontWeight: 600 }}>
          {phase === "calling"
            ? (lang === "en" ? "Calling Rohan…" : "रोहन को कॉल कर रहे हैं…")
            : (lang === "en" ? "Connected" : "कनेक्टेड")}
        </div>
        {phase === "calling" ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: "rgba(249,249,247,.5)",
                animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`
              }} />
            ))}
          </div>
        ) : (
          <div style={{ color: "rgba(249,249,247,.6)", fontSize: 18, marginTop: 8, fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
            {fmt(timer)}
          </div>
        )}
      </div>

      {/* End Call button */}
      <button onClick={endCall} style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#DC2626", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 24px rgba(220,38,38,.4)", marginTop: 20
      }}>
        <PhoneOff size={26} color="#fff" />
      </button>
      <span style={{ color: "rgba(249,249,247,.4)", fontSize: 12 }}>
        {lang === "en" ? "End Call" : "कॉल समाप्त करें"}
      </span>
    </div>
  );
}

function SathiScreen({inPanel=false, userId=null, linkedUserId=null, fullName=null}) {
  const {w}=useWindowSize();
  const [lang,setLang]=useState("en");
  const [rec,setRec]=useState(false);
  const [overlay,setOverlay]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [memoryOpen,setMemoryOpen]=useState(false);
  const [callOpen,setCallOpen]=useState(false);
  const [inp,setInp]=useState("");
  const isMock = inPanel;

  const wrap = isMock
    ? {width:360,height:760,position:"relative",overflow:"hidden",
       background:"linear-gradient(160deg,#022c22 0%,#064E3B 40%,#065f46 70%,#0a3f34 100%)",
       borderRadius:36,boxShadow:"0 32px 64px rgba(0,0,0,.5)",flexShrink:0,display:"flex",flexDirection:"column"}
    : {width:"100%",minHeight:"100vh",position:"relative",overflow:"hidden",
       background:"linear-gradient(160deg,#022c22 0%,#064E3B 40%,#065f46 70%,#0a3f34 100%)",
       display:"flex",flexDirection:"column"};

  return (
    <div style={wrap}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 20% 20%,rgba(251,191,36,.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(234,88,12,.06) 0%,transparent 60%)"}}/>

      {isMock
        ? <div style={{display:"flex",justifyContent:"space-between",padding:"12px 24px 0",color:"rgba(249,249,247,.6)",fontSize:12,fontWeight:500}}>
            <span>9:41</span><span>●●●</span>
          </div>
        : <div style={{height:"env(safe-area-inset-top,20px)"}}/>
      }

      <div style={{display:"flex",justifyContent:"center",marginTop:14}}>
        <div style={{background:"rgba(249,249,247,.1)",borderRadius:100,border:"1px solid rgba(255,255,255,.15)",padding:3,display:"flex",gap:2}}>
          {["en","hi"].map(l=>(
            <button key={l} onClick={()=>setLang(l)} style={{
              padding:"5px 16px",borderRadius:100,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,
              background:lang===l?"rgba(249,249,247,.22)":"transparent",
              color:lang===l?"#F9F9F7":"rgba(249,249,247,.45)",transition:"all .3s"
            }}>{l==="en"?"English":"हिंदी"}</button>
          ))}
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:16}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,color:"rgba(249,249,247,.38)",letterSpacing:"0.3em",fontWeight:300}}>ANVAYA</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMock?36:42,color:"#F9F9F7",fontWeight:600,letterSpacing:"0.05em",marginTop:2}}>
          {lang==="en"?"Sathi":"साथी"}
        </div>
        <div style={{fontSize:12,color:"rgba(249,249,247,.4)",marginTop:3}}>
          {lang==="en"?"Your trusted companion":"आपका विश्वसनीय साथी"}
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"center",marginTop:rec?24:isMock?36:48,transition:"margin .5s ease",flexShrink:0}}>
        <div style={{position:"relative"}} className="pring">
          <div className={rec?"orb-rec":"orb"} style={{
            width:isMock?148:160,height:isMock?148:160,borderRadius:"50%",
            background:"conic-gradient(from 180deg at 50% 50%,#064E3B 0deg,#059669 90deg,#d97706 180deg,#065f46 270deg,#064E3B 360deg)",
            position:"relative",cursor:"pointer",transition:"transform .5s"
          }}>
            <div style={{position:"absolute",inset:8,borderRadius:"50%",
              background:"radial-gradient(circle at 35% 35%,rgba(255,255,255,.12) 0%,transparent 65%)",
              border:"1px solid rgba(255,255,255,.15)"}}/>
            {rec&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Waveform/></div>}
          </div>
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:18,padding:"0 36px"}}>
        <p style={{color:"rgba(249,249,247,.5)",fontSize:13,lineHeight:1.5}}>
          {rec?(lang==="en"?"Listening… share your memory":"सुन रहा हूँ…"):(lang==="en"?"Tap a card or type below":"बोलने के लिए टैप करें")}
        </p>
      </div>

      <div style={{padding:"12px 18px 0"}}>
        <div style={{background:"rgba(249,249,247,.08)",border:"1px solid rgba(255,255,255,.12)",borderRadius:14,padding:"10px 14px"}}>
          <input value={inp} onChange={e=>{setInp(e.target.value);if(e.target.value.toLowerCase().includes("help"))setOverlay(true);}}
            placeholder={lang==="en"?"Type anything… (try 'help')":"कुछ भी लिखें…"}
            style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#F9F9F7",fontSize:13}}/>
        </div>
      </div>

      <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10,flex:1,justifyContent:"flex-end"}}>
        {[
          {icon:<Phone size={19} color="#F9F9F7"/>,label:lang==="en"?"Call Son / Daughter":"बेटे को कॉल करें",sub:lang==="en"?"Rohan · Last called 2h ago":"रोहन · 2 घंटे पहले",acc:"#059669",fn:()=>setCallOpen(true)},
          {icon:<Mic size={19} color="#F9F9F7"/>,label:lang==="en"?"Record a Memory":"यादें रिकॉर्ड करें",sub:lang==="en"?"Your voice, preserved forever":"आपकी आवाज़, सदा के लिए",acc:"#d97706",fn:()=>setMemoryOpen(true)},
          {icon:<MessageCircle size={19} color="#F9F9F7"/>,label:lang==="en"?"Ask Sathi":"साथी से पूछें",sub:lang==="en"?"Health · Reminders · Stories":"स्वास्थ्य · याद · कहानियाँ",acc:"#4F46E5",fn:()=>setChatOpen(true)},
        ].map((c,i)=>(
          <button key={i} onClick={c.fn} className="glass" style={{
            display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
            border:"1px solid rgba(255,255,255,.1)",cursor:"pointer",
            animation:`fadeUp .6s ease ${.1+i*.1}s both`,width:"100%",textAlign:"left"
          }}>
            <div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:c.acc,
              display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${c.acc}55`}}>
              {c.icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#F9F9F7",fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.label}</div>
              <div style={{color:"rgba(249,249,247,.45)",fontSize:11,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.sub}</div>
            </div>
            <ChevronRight size={14} color="rgba(249,249,247,.3)"/>
          </button>
        ))}
        <div style={{height:"env(safe-area-inset-bottom,12px)"}}/>
      </div>

      {overlay&&(
        <div className="fadein" style={{
          position:"absolute",inset:0,borderRadius:isMock?36:0,
          background:"rgba(2,18,14,.88)",backdropFilter:"blur(20px)",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:32,gap:20,zIndex:10
        }}>
          <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(249,249,247,.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Heart size={26} color="#F9F9F7"/>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"#F9F9F7",fontWeight:400,lineHeight:1.3}}>I heard you.</div>
            <div style={{color:"rgba(249,249,247,.6)",fontSize:14,marginTop:7,lineHeight:1.6}}>
              Should I call <strong style={{color:"#F9F9F7"}}>Rohan</strong>?
            </div>
          </div>
          <button onClick={()=>setOverlay(false)} style={{
            width:"100%",padding:"17px",borderRadius:18,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#059669,#065f46)",
            color:"#F9F9F7",fontSize:18,fontWeight:700,
            boxShadow:"0 8px 28px rgba(5,150,105,.45)",letterSpacing:"0.02em"
          }}>✓ Yes, Call Now</button>
          <button onClick={()=>setOverlay(false)} style={{
            background:"transparent",border:"1px solid rgba(255,255,255,.15)",
            color:"rgba(249,249,247,.48)",padding:"10px 28px",borderRadius:100,cursor:"pointer",fontSize:13
          }}>Not now</button>
        </div>
      )}

      <SathiChat open={chatOpen} onClose={()=>setChatOpen(false)} lang={lang} userId={userId}/>
      <MemoryRecorder open={memoryOpen} onClose={()=>setMemoryOpen(false)} lang={lang} userId={userId}/>
      <CallOverlay open={callOpen} onClose={()=>setCallOpen(false)} lang={lang} userId={userId} linkedUserId={linkedUserId} fromName={fullName}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARDIAN COMPONENTS (new design)
// ═══════════════════════════════════════════════════════════════════════════════

// Cognitive Ring — SVG gauge with emerald palette
function CognitiveRing({value=94}) {
  const r=56, cx=72, cy=72, circ=2*Math.PI*r;
  const offset=circ-(value/100)*circ;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <svg width={144} height={144} viewBox="0 0 144 144">
        <defs>
          <linearGradient id="crg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064E3B"/>
            <stop offset="100%" stopColor="#059669"/>
          </linearGradient>
          <filter id="crglow">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(6,78,59,0.1)" strokeWidth={11}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#crg)" strokeWidth={11}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`} filter="url(#crglow)"
          style={{transition:"stroke-dashoffset 1.2s ease"}}/>
        <text x={cx} y={cy-6} textAnchor="middle" fontSize={30} fontWeight={700} fill="#064E3B" fontFamily="DM Sans">{value}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize={11} fill="#059669" fontFamily="DM Sans" fontWeight={500}>Stable</text>
      </svg>
      <span style={{fontSize:12,color:"#6b6b6b",fontWeight:500}}>Cognitive Clarity</span>
    </div>
  );
}

// Acoustic Heatmap — 7 rows (days) × 12 cols (2-hr blocks)
function AcousticHeatmap() {
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours=["12a","2a","4a","6a","8a","10a","12p","2p","4p","6p","8p","10p"];
  const seed = (r,c) => {
    const base = [0,0,0,1,2,3,4,3,3,2,1,0];
    const v = base[c] + (Math.sin(r*3.7+c*1.3)*1.2);
    return Math.max(0,Math.min(4,Math.round(v)));
  };
  const colors = ["rgba(6,78,59,0.06)","rgba(6,78,59,0.18)","rgba(5,150,105,0.35)","rgba(5,150,105,0.6)","rgba(5,150,105,0.9)"];
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:`44px repeat(12,1fr)`,gap:3,alignItems:"center"}}>
        <div/>
        {hours.map(h=>(
          <div key={h} style={{fontSize:9,color:"#9CA3AF",textAlign:"center",fontWeight:500}}>{h}</div>
        ))}
        {days.map((day,r)=>(
          <>
            <div key={`d${r}`} style={{fontSize:10,color:"#6b6b6b",fontWeight:500,textAlign:"right",paddingRight:6}}>{day}</div>
            {hours.map((_,c)=>{
              const v=seed(r,c);
              return (
                <div key={`${r}-${c}`} style={{
                  height:18,borderRadius:4,
                  background:colors[v],
                  transition:"background .3s"
                }} title={`${day} ${hours[c]}: activity ${v}`}/>
              );
            })}
          </>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:12,justifyContent:"flex-end"}}>
        <span style={{fontSize:10,color:"#9CA3AF"}}>Less</span>
        {colors.map((c,i)=><div key={i} style={{width:12,height:12,borderRadius:3,background:c,border:"1px solid rgba(0,0,0,.06)"}}/>)}
        <span style={{fontSize:10,color:"#9CA3AF"}}>More</span>
      </div>
    </div>
  );
}

// Weekly Trend Area Chart (pure SVG — no recharts needed)
function WeeklyTrendChart() {
  const mood =  [72,78,85,80,88,92,90];
  const energy= [65,70,80,75,82,88,85];
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const W=100,H=60,pad=4;
  const toX=(i)=>pad+i*(W-pad*2)/6;
  const toY=(v)=>H-pad-((v-50)/(100-50))*(H-pad*2);
  const pathD=(arr)=>{
    const pts=arr.map((v,i)=>`${toX(i)},${toY(v)}`);
    const area=`M${toX(0)},${H} L${pts.join(" L")} L${toX(6)},${H} Z`;
    const line=`M${pts.join(" L")}`;
    return {area,line};
  };
  const m=pathD(mood), e=pathD(energy);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:120,overflow:"visible"}}>
        <defs>
          <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#064E3B" stopOpacity={0.2}/>
            <stop offset="100%" stopColor="#064E3B" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B45309" stopOpacity={0.15}/>
            <stop offset="100%" stopColor="#B45309" stopOpacity={0}/>
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[60,70,80,90,100].map(v=>(
          <line key={v} x1={pad} y1={toY(v)} x2={W-pad} y2={toY(v)}
            stroke="rgba(6,78,59,0.07)" strokeWidth={0.5} strokeDasharray="2 2"/>
        ))}
        <path d={m.area} fill="url(#mg)"/>
        <path d={e.area} fill="url(#eg)"/>
        <path d={m.line} fill="none" stroke="#064E3B" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
        <path d={e.line} fill="none" stroke="#B45309" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
        {mood.map((v,i)=>(
          <circle key={i} cx={toX(i)} cy={toY(v)} r={1.5} fill="#064E3B"/>
        ))}
        {energy.map((v,i)=>(
          <circle key={i} cx={toX(i)} cy={toY(v)} r={1.5} fill="#B45309"/>
        ))}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        {days.map(d=><span key={d} style={{fontSize:9,color:"#9CA3AF",fontWeight:500}}>{d}</span>)}
      </div>
      <div style={{display:"flex",gap:14,marginTop:8}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:16,height:2,borderRadius:2,background:"#064E3B"}}/>
          <span style={{fontSize:11,color:"#6b6b6b"}}>Mood</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:16,height:2,borderRadius:2,background:"#B45309"}}/>
          <span style={{fontSize:11,color:"#6b6b6b"}}>Energy</span>
        </div>
      </div>
    </div>
  );
}

// Memory Card
function MemoryCard({title, summary, duration, date, index=0, audioUrl=null, emotionalTone=null}) {
  const toneColors = {joyful:"#059669",nostalgic:"#B45309",peaceful:"#064E3B",concerned:"#DC2626"};
  const tone = emotionalTone || "positive";
  const toneColor = toneColors[tone.toLowerCase()] || "#059669";
  return (
    <div className="gcard" style={{
      padding:18,
      animation:`fadeUp .5s ease ${.6+index*.1}s both`
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#064E3B",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title||"Untitled Memory"}</div>
          <div style={{display:"flex",gap:6}}>
            <span style={{fontSize:10,fontWeight:600,color:"#6b6b6b",background:"rgba(6,78,59,0.07)",padding:"2px 8px",borderRadius:100}}>{date}</span>
            <span style={{fontSize:10,fontWeight:600,color:"#6b6b6b",background:"rgba(6,78,59,0.07)",padding:"2px 8px",borderRadius:100}}>{duration}</span>
          </div>
        </div>
      </div>
      <AudioPlayer color="#064E3B" audioUrl={audioUrl}/>
      {summary && <p style={{
        marginTop:10,fontStyle:"italic",
        fontFamily:"'Cormorant Garamond',serif",fontSize:14,
        color:"#6b6b6b",lineHeight:1.65,
        borderLeft:"2px solid rgba(6,78,59,0.2)",paddingLeft:10
      }}>
        "{summary}"
      </p>}
      <div style={{marginTop:10,display:"flex",alignItems:"center",gap:5}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:toneColor}}/>
        <span style={{fontSize:10,color:toneColor,fontWeight:600}}>Emotional tone: {tone.charAt(0).toUpperCase()+tone.slice(1)}</span>
      </div>
    </div>
  );
}

// ─── GUARDIAN DASHBOARD ───────────────────────────────────────────────────────
function GuardianDashboard({inPanel=false, profileId=null}) {
  const {w}=useWindowSize();
  const isMobile = !inPanel && w < 768;
  const [nav,setNav]=useState("home");
  const [drawer,setDrawer]=useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Real data hook
  const { parentProfile, memories: realMemories, medications, healthEvents, stats: derivedStats, loading: dataLoading, lastUpdated, toggleMedication } = useParentData(profileId);

  // Listen for incoming_call events via Realtime
  useEffect(() => {
    if (!profileId) return;
    const ch = supabase.channel(`user:${profileId}`)
      .on("broadcast", { event: "incoming_call" }, ({ payload }) => {
        setIncomingCall(payload);
      })
      .on("broadcast", { event: "call_ended" }, () => {
        setIncomingCall(null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profileId]);

  const navItems=[
    {id:"home",   icon:<Home size={17}/>,      label:"Overview"},
    {id:"memories",icon:<Headphones size={17}/>,label:"Memories"},
    {id:"health", icon:<Activity size={17}/>,  label:"Health"},
    {id:"alerts", icon:<Bell size={17}/>,      label:"Alerts"},
    {id:"settings",icon:<Settings size={17}/>, label:"Settings"},
  ];

  const stats=[
    {label:"Vocal Energy",  value:derivedStats.vocalEnergy.value,    icon:Mic,        color:"#064E3B", trend:derivedStats.vocalEnergy.trend},
    {label:"Cognitive Clarity",value:derivedStats.cognitiveClarity.value, icon:TrendingUp,  color:"#0d7a5f", trend:derivedStats.cognitiveClarity.trend},
    {label:"Emotional Tone",value:derivedStats.emotionalTone.value,icon:Heart,      color:"#B45309", trend:derivedStats.emotionalTone.trend},
    {label:"Activity Level",value:derivedStats.activityLevel.value, icon:Zap,         color:"#d97706", trend:derivedStats.activityLevel.trend},
  ];

  // Derive alerts from recent health events
  const alerts = healthEvents.slice(0,3).map(e => ({
    text: e.event_type === "medication_taken"
      ? `Medication taken: ${e.value?.medication_name || "Unknown"}`
      : `${e.event_type.replace(/_/g," ")} recorded`,
    type: e.event_type === "medication_taken" ? "success" : "info"
  }));
  if (alerts.length === 0) {
    alerts.push({text:"No recent events", type:"info"});
  }

  // Format memories for display
  const fmtDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff} days ago`;
  };
  const fmtDuration = (s) => s ? (s >= 60 ? `${Math.round(s/60)} min` : `${s}s`) : "—";

  const memories = realMemories.length > 0
    ? realMemories.map(m => ({
        title: m.title || "Untitled",
        date: fmtDate(m.created_at),
        duration: fmtDuration(m.duration_seconds),
        summary: m.ai_summary || m.transcript || "",
        audioUrl: m.audio_url || null,
        emotionalTone: m.emotional_tone || null,
      }))
    : [
        {title:"No memories yet", date:"—", duration:"—", summary:"Memories recorded by your parent will appear here.", audioUrl:null, emotionalTone:null},
      ];

  const Sidebar = ({mobile=false}) => (
    <div style={{
      width:mobile?"100%":210, background:"rgba(255,255,255,0.95)",
      borderRight:mobile?"none":"1px solid rgba(6,78,59,0.08)",
      display:"flex",flexDirection:"column",padding:"22px 0",
      flexShrink:0, height:"100%",
      boxShadow:mobile?"none":"2px 0 20px rgba(6,78,59,0.04)"
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 20px 18px",borderBottom:"1px solid rgba(6,78,59,0.07)"}}>
        <div>
          <div className="gtxt" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600}}>Anvaya</div>
          <div style={{fontSize:9,color:"#9CA3AF",letterSpacing:"0.14em",marginTop:1}}>GUARDIAN</div>
        </div>
        {mobile&&<button onClick={()=>setDrawer(false)} style={{background:"transparent",border:"none",cursor:"pointer"}}><X size={18} color="#9CA3AF"/></button>}
      </div>

      {/* Parent status */}
      <div style={{padding:"12px 14px",margin:"12px 10px",background:"rgba(6,78,59,0.05)",borderRadius:14,border:"1px solid rgba(6,78,59,0.12)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#064E3B,#059669)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <User size={15} color="#fff"/>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#064E3B"}}>{parentProfile?.full_name || "Parent"}</div>
            <div style={{fontSize:10,color:"#059669",display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:"#059669",display:"inline-block"}}/>
              {dataLoading ? "Loading…" : "Active"}
            </div>
          </div>
        </div>
      </div>

      <nav style={{flex:1,padding:"4px 10px",display:"flex",flexDirection:"column",gap:1}}>
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>{setNav(item.id);setDrawer(false);}} style={{
            display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
            borderRadius:11,border:"none",cursor:"pointer",textAlign:"left",width:"100%",
            background:nav===item.id?"rgba(6,78,59,0.08)":"transparent",
            color:nav===item.id?"#064E3B":"#6b6b6b",
            fontWeight:nav===item.id?700:400,fontSize:13,transition:"all .2s"
          }}>{item.icon}{item.label}</button>
        ))}
      </nav>

      <div style={{padding:"12px 10px",borderTop:"1px solid rgba(6,78,59,0.07)"}}>
        <button style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",width:"100%",border:"none",background:"transparent",cursor:"pointer",color:"#9CA3AF",fontSize:12,borderRadius:11}}>
          <LogOut size={14}/>Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{width:"100%",height:"100%",display:"flex",background:"#F2F4F3",position:"relative",overflow:"hidden"}}>

      {/* Desktop sidebar */}
      {!isMobile&&<Sidebar/>}

      {/* Mobile drawer */}
      {isMobile&&drawer&&(
        <>
          <div className="fadein" onClick={()=>setDrawer(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.35)",zIndex:40,backdropFilter:"blur(4px)"}}/>
          <div className="fadein" style={{position:"absolute",left:0,top:0,bottom:0,width:256,zIndex:50,boxShadow:"4px 0 28px rgba(0,0,0,.1)"}}>
            <Sidebar mobile/>
          </div>
        </>
      )}

      {/* Main content */}
      <div className="scr" style={{flex:1,overflowY:"auto",padding:isMobile?"14px 14px 80px":"20px 24px"}}>

        {/* Header */}
        <div className="s1" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile&&(
              <button onClick={()=>setDrawer(true)} style={{background:"transparent",border:"none",cursor:"pointer",padding:4}}>
                <Menu size={20} color="#064E3B"/>
              </button>
            )}
            <div>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?24:30,fontWeight:700,color:"#064E3B",lineHeight:1.2}}>
                Guardian Dashboard
              </h1>
              <p style={{color:"#6b6b6b",fontSize:12,marginTop:3}}>
                Monitoring {parentProfile?.full_name || "Amma"}'s wellbeing
                <span style={{color:"#9CA3AF",fontSize:10,marginLeft:8}}>
                  Updated {lastUpdated.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                </span>
              </p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button style={{
              position:"relative",width:40,height:40,borderRadius:12,border:"none",cursor:"pointer",
              background:"rgba(255,255,255,0.8)",backdropFilter:"blur(8px)",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 2px 8px rgba(6,78,59,0.1)"
            }}>
              <Bell size={16} color="#064E3B"/>
              <span style={{
                position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",
                background:"#B45309",color:"#fff",fontSize:9,fontWeight:700,
                display:"flex",alignItems:"center",justifyContent:"center"
              }}>3</span>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="s2" style={{
          display:"grid",
          gridTemplateColumns:isMobile?"1fr 1fr":inPanel?"1fr 1fr":"repeat(4,1fr)",
          gap:12,marginBottom:16
        }}>
          {stats.map((st,i)=>(
            <div key={i} className="gcard" style={{padding:16,animation:`fadeUp .5s ease ${.1+i*.07}s both`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{
                  width:36,height:36,borderRadius:10,
                  background:`${st.color}12`,
                  display:"flex",alignItems:"center",justifyContent:"center"
                }}>
                  <st.icon size={16} color={st.color}/>
                </div>
                <span style={{
                  fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:100,
                  background:`${st.color}10`,color:st.color
                }}>{st.trend}</span>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:"#1a1a1a"}}>{st.value}</div>
              <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Main bento grid */}
        <div style={{
          display:"grid",
          gridTemplateColumns:isMobile?"1fr":inPanel?"1fr":"1fr 2fr",
          gap:14,marginBottom:14
        }}>
          {/* Cognitive Vitality */}
          <div className="gcard s3" style={{padding:20}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Cognitive Vitality</div>
              <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>Real-time cognitive assessment</div>
            </div>
            <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
              <CognitiveRing value={94}/>
            </div>
            <div style={{
              display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",
              background:"rgba(5,150,105,0.06)",borderRadius:12,border:"1px solid rgba(5,150,105,0.12)"
            }}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#059669",marginTop:4,flexShrink:0}}/>
              <p style={{fontSize:11,color:"#6b6b6b",lineHeight:1.5}}>
                Pattern recognition and recall scores are within healthy range
              </p>
            </div>
          </div>

          {/* Weekly Trends */}
          <div className="gcard s4" style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Weekly Wellness Trends</div>
                <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>Mood and energy levels over the past week</div>
              </div>
              <button style={{display:"flex",alignItems:"center",gap:3,fontSize:11,fontWeight:600,color:"#064E3B",background:"transparent",border:"none",cursor:"pointer"}}>
                View all <ChevronRight size={12}/>
              </button>
            </div>
            <WeeklyTrendChart/>
          </div>
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:isMobile?"1fr":inPanel?"1fr":"2fr 1fr",
          gap:14,marginBottom:14
        }}>
          {/* Acoustic Heatmap */}
          <div className="gcard s5" style={{padding:20}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Acoustic Insights</div>
              <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>24-hour vocal and acoustic analysis</div>
            </div>
            <AcousticHeatmap/>
          </div>

          {/* Alerts */}
          <div className="gcard s6" style={{padding:20}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Recent Alerts</div>
              <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>Today's notifications</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {alerts.map((a,i)=>(
                <div key={i} className="gcard" style={{
                  padding:"10px 12px",
                  animation:`fadeUp .5s ease ${.8+i*.1}s both`,
                  background:"rgba(255,255,255,0.6)"
                }}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <div style={{
                      width:7,height:7,borderRadius:"50%",marginTop:4,flexShrink:0,
                      background:a.type==="info"?"#B45309":"#059669"
                    }}/>
                    <p style={{fontSize:11,color:"#6b6b6b",lineHeight:1.5}}>{a.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Medication Tracker */}
        <div className="gcard s6" style={{padding:20,marginBottom:14}}>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Medication Tracker</div>
            <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>Today's medications</div>
          </div>
          {medications.length === 0 ? (
            <p style={{fontSize:12,color:"#9CA3AF",fontStyle:"italic"}}>No medications configured</p>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {medications.map(med => (
                <div key={med.id} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                  background:med.taken_today?"rgba(5,150,105,0.06)":"rgba(255,255,255,0.6)",
                  borderRadius:12,border:`1px solid ${med.taken_today?"rgba(5,150,105,0.15)":"rgba(6,78,59,0.08)"}`,
                  cursor:"pointer",transition:"all .2s"
                }} onClick={() => toggleMedication(med.id, !med.taken_today)}>
                  <div style={{
                    width:22,height:22,borderRadius:6,flexShrink:0,
                    border:med.taken_today?"none":"2px solid rgba(6,78,59,0.25)",
                    background:med.taken_today?"#059669":"transparent",
                    display:"flex",alignItems:"center",justifyContent:"center"
                  }}>
                    {med.taken_today && <Check size={13} color="#fff"/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:med.taken_today?"#059669":"#1a1a1a",
                      textDecoration:med.taken_today?"line-through":"none"}}>{med.name}</div>
                    <div style={{fontSize:10,color:"#9CA3AF"}}>{med.dose||""}{med.scheduled_time?` · ${med.scheduled_time}`:""}</div>
                  </div>
                  {med.taken_today && med.last_taken && (
                    <span style={{fontSize:9,color:"#059669",fontWeight:500}}>
                      {new Date(med.last_taken).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="s7">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <h3 style={{fontSize:14,fontWeight:700,color:"#1a1a1a"}}>Memory Archive</h3>
              <p style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>AI-summarized recordings with emotional context</p>
            </div>
            <button style={{fontSize:11,fontWeight:600,color:"#064E3B",border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
              View all <ChevronRight size={12}/>
            </button>
          </div>
          <div style={{
            display:"grid",
            gridTemplateColumns:isMobile?"1fr":inPanel?"1fr":"repeat(3,1fr)",
            gap:13
          }}>
            {memories.map((m,i)=>(
              <MemoryCard key={i} {...m} index={i}/>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      {isMobile&&(
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,
          background:"rgba(255,255,255,.95)",backdropFilter:"blur(12px)",
          borderTop:"1px solid rgba(6,78,59,0.08)",
          display:"flex",justifyContent:"space-around",alignItems:"center",
          padding:"9px 0",paddingBottom:"max(9px,env(safe-area-inset-bottom))",zIndex:30
        }}>
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>setNav(item.id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              border:"none",background:"transparent",cursor:"pointer",padding:"0 6px",
              color:nav===item.id?"#064E3B":"#9CA3AF",transition:"color .2s"
            }}>
              {item.icon}
              <span style={{fontSize:9,fontWeight:nav===item.id?700:400}}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Incoming call toast */}
      {incomingCall && (
        <div className="fadein" style={{
          position: "absolute", top: 16, right: 16, zIndex: 60,
          background: "linear-gradient(135deg,#064E3B,#065f46)",
          borderRadius: 16, padding: "16px 20px", minWidth: 260,
          boxShadow: "0 8px 32px rgba(6,78,59,0.3)", border: "1px solid rgba(5,150,105,0.3)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(5,150,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Phone size={18} color="#34D399" />
            </div>
            <div>
              <div style={{ color: "#F9F9F7", fontSize: 14, fontWeight: 600 }}>
                📞 {incomingCall.from_name || "Amma"} is calling
              </div>
              <div style={{ color: "rgba(249,249,247,.5)", fontSize: 11, marginTop: 2 }}>Incoming call</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setIncomingCall(null)} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600
            }}>Answer</button>
            <button onClick={() => setIncomingCall(null)} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.12)", color: "rgba(249,249,247,.7)", fontSize: 13, fontWeight: 600
            }}>Decline</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export { SathiScreen, GuardianDashboard, fontStyle };

export default function App() {
  const {w}=useWindowSize();
  const isMobile=w<768;
  const [view,setView]=useState(isMobile?"sathi":"both");

  useEffect(()=>{
    if(isMobile&&view==="both") setView("sathi");
  },[isMobile]);

  const tabs=[
    {id:"sathi",   label:"Sathi"},
    {id:"guardian",label:"Guardian"},
    ...(!isMobile?[{id:"both",label:"Both"}]:[]),
  ];

  return (
    <div style={{minHeight:"100vh",height:"100vh",background:"#0f0f0f",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{fontStyle}</style>

      {/* Topbar */}
      <div style={{
        background:"rgba(15,15,15,.96)",backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(255,255,255,.08)",
        padding:isMobile?"11px 14px":"12px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        flexShrink:0,zIndex:200,gap:10
      }}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMobile?17:21,color:"#F9F9F7",fontWeight:600,letterSpacing:"0.02em",flexShrink:0}}>
          {isMobile?"Anvaya":"Anvaya — Design System"}
        </div>
        <div style={{display:"flex",gap:6}}>
          {tabs.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{
              padding:isMobile?"6px 13px":"7px 15px",borderRadius:100,
              border:"1px solid rgba(255,255,255,.12)",
              background:view===v.id?"#F9F9F7":"transparent",
              color:view===v.id?"#111":"rgba(249,249,247,.55)",
              fontSize:isMobile?12:13,fontWeight:500,cursor:"pointer",transition:"all .25s"
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>

        {view==="sathi"&&(
          isMobile
            ? <SathiScreen/>
            : <div style={{flex:1,display:"flex",justifyContent:"center",alignItems:"flex-start",overflowY:"auto",background:"linear-gradient(160deg,#111 0%,#1a1a1a 100%)",padding:"40px 20px"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                  <div style={{fontSize:10,color:"rgba(249,249,247,.28)",letterSpacing:"0.15em",fontWeight:600}}>SATHI — MOBILE PREVIEW</div>
                  <SathiScreen inPanel/>
                  <div style={{padding:"6px 14px",borderRadius:100,background:"rgba(6,78,59,.2)",border:"1px solid rgba(6,78,59,.3)"}}>
                    <span style={{fontSize:11,color:"#34D399"}}>Tip: type "help" in the input field</span>
                  </div>
                </div>
              </div>
        )}

        {view==="guardian"&&(
          isMobile
            ? <GuardianDashboard/>
            : <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{fontSize:10,color:"#6b6b6b",letterSpacing:"0.13em",fontWeight:600,textAlign:"center",padding:"9px 0",background:"#F2F4F3",flexShrink:0}}>
                  GUARDIAN — CHILD DASHBOARD
                </div>
                <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                  <GuardianDashboard/>
                </div>
              </div>
        )}

        {view==="both"&&!isMobile&&(
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>
            <div style={{
              width:w<1100?380:420,flexShrink:0,
              background:"linear-gradient(160deg,#111 0%,#1a1a1a 100%)",
              display:"flex",flexDirection:"column",alignItems:"center",
              padding:"28px 12px",borderRight:"1px solid rgba(255,255,255,.06)",
              overflowY:"auto"
            }}>
              <div style={{fontSize:10,color:"rgba(249,249,247,.28)",letterSpacing:"0.14em",marginBottom:14,fontWeight:600}}>SATHI — PARENT COMPANION</div>
              <SathiScreen inPanel/>
              <div style={{marginTop:14,padding:"6px 13px",borderRadius:100,background:"rgba(6,78,59,.2)",border:"1px solid rgba(6,78,59,.3)"}}>
                <span style={{fontSize:11,color:"#34D399"}}>Tip: type "help" in the input</span>
              </div>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{fontSize:10,color:"#6b6b6b",letterSpacing:"0.13em",fontWeight:600,textAlign:"center",padding:"9px 0",background:"#F2F4F3",flexShrink:0}}>
                GUARDIAN — CHILD DASHBOARD
              </div>
              <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                <GuardianDashboard inPanel/>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
