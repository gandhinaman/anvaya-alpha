import { useState, useEffect, useRef } from "react";
import {
  Phone, Mic, MessageCircle, Heart, Activity,
  Home, Bell, Settings, ChevronRight, Play, Pause, BookOpen,
  Circle, User, LogOut, Headphones, Brain, Check, Menu, X,
  TrendingUp, Zap, BarChart2, PhoneOff, AlertTriangle, ShieldCheck,
  Loader2, Link2, BellRing, Copy, Send, Sparkles
} from "lucide-react";
import LovedOneChat from "./loved-one/LovedOneChat";
import MemoryRecorder from "./loved-one/MemoryRecorder";
import MemoryLog from "./loved-one/MemoryLog";
import { supabase } from "@/integrations/supabase/client";
import { useParentData } from "@/hooks/useParentData";
import { useStreak } from "@/hooks/useStreak";
import { trackEvent } from "@/hooks/useTelemetry";

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
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; overflow-x: hidden; }
  button { font-family: 'DM Sans', sans-serif; }
  input  { font-family: 'DM Sans', sans-serif; }

  @keyframes breathe {
    0%,100% { transform:scale(1); box-shadow:0 0 60px 20px rgba(44,24,16,.35),0 0 120px 40px rgba(44,24,16,.15); }
    50%      { transform:scale(1.08); box-shadow:0 0 80px 30px rgba(44,24,16,.5),0 0 160px 60px rgba(44,24,16,.2); }
  }
  @keyframes breatheX {
    0%,100% { transform:scale(1.1); box-shadow:0 0 60px 20px rgba(44,24,16,.35),0 0 100px 40px rgba(44,24,16,.15); }
    50%      { transform:scale(1.18); box-shadow:0 0 80px 30px rgba(44,24,16,.45),0 0 130px 50px rgba(44,24,16,.2); }
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
    0%   { transform:scale(1); box-shadow:0 0 0 0 rgba(198,139,89,.5); }
    70%  { transform:scale(1.05); box-shadow:0 0 0 30px rgba(198,139,89,0); }
    100% { transform:scale(1); box-shadow:0 0 0 0 rgba(198,139,89,0); }
  }
  @keyframes dotBounce {
    0%,80%,100% { transform:translateY(0); }
    40% { transform:translateY(-6px); }
  }
  @keyframes spin {
    from { transform:rotate(0deg); }
    to { transform:rotate(360deg); }
  }

  .orb       { animation: breathe 4s ease-in-out infinite; }
  .orb-rec   { animation: breatheX 4s ease-in-out infinite; }
  .fadein    { animation: fadeIn .35s ease forwards; }

  .pring::before {
    content:''; position:absolute; inset:-14px; border-radius:50%;
    border:2px solid rgba(93,64,55,.4); animation:pring 2.6s ease-out infinite;
  }

  .glass {
    background:rgba(255,248,240,.08); backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,248,240,.1); border-radius:24px;
  }
  .gcard {
    background:rgba(255,255,255,0.72);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,0.55);
    border-radius:20px;
    box-shadow:0 8px 32px rgba(62,39,35,0.06);
  }
  .gtxt {
    background:linear-gradient(135deg,#3E2723 0%,#5D4037 50%,#8D6E63 100%);
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
        {playing?<Pause size={13} color="#FFF8F0" fill="#FFF8F0"/>:<Play size={13} color="#FFF8F0" fill="#FFF8F0"/>}
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
  const [phase, setPhase] = useState("calling");
  const [childPhone, setChildPhone] = useState(null);
  const [timer, setTimer] = useState(0);
  const channelRef = useRef(null);

  // Fetch linked caregiver's phone number
  useEffect(() => {
    if (!linkedUserId) return;
    supabase.from("profiles").select("phone").eq("id", linkedUserId).maybeSingle()
      .then(({ data }) => {
        if (data?.phone) setChildPhone(data.phone);
      });
  }, [linkedUserId]);

  useEffect(() => {
    if (!open) { setPhase("calling"); setTimer(0); return; }

    // If we have a phone number, initiate a real phone call
    if (childPhone) {
      // Clean up the phone number for tel: link
      const cleanPhone = childPhone.replace(/\s+/g, "");
      window.location.href = `tel:${cleanPhone}`;
      // Close the overlay after a brief delay to let the dialer open
      setTimeout(() => onClose(), 1500);
      return;
    }

    // Fallback: in-app notification to caregiver
    if (linkedUserId) {
      const ch = supabase.channel(`user:${linkedUserId}`);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ch.send({ type: "broadcast", event: "incoming_call", payload: { from_name: fromName || "Parent", from_id: userId } });
        }
      });
      channelRef.current = ch;
    }
    const t = setTimeout(() => setPhase("connected"), 3000);
    return () => { clearTimeout(t); if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; } };
  }, [open, linkedUserId, childPhone]);

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
      background: "linear-gradient(160deg,#1A0F0A 0%,#2C1810 50%,#3E2723 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24
    }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "linear-gradient(135deg,#C68B59,#8D6E63)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: phase === "calling" ? "callPulse 1.5s ease-in-out infinite" : "none",
        boxShadow: phase === "connected" ? "0 0 40px rgba(198,139,89,.4)" : undefined,
        transition: "box-shadow .5s"
      }}>
        <Phone size={40} color="#FFF8F0" />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#FFF8F0", fontWeight: 600 }}>
          {childPhone
            ? (lang === "en" ? `Calling ${fromName || "…"}` : `${fromName || ""} को कॉल कर रहे हैं…`)
            : phase === "calling"
            ? (lang === "en" ? `Calling ${fromName || "…"}` : `${fromName || ""} को कॉल कर रहे हैं…`)
            : (lang === "en" ? "Connected" : "कनेक्टेड")}
        </div>
        {!childPhone && phase === "calling" ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: "rgba(255,248,240,.5)",
                animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`
              }} />
            ))}
          </div>
        ) : !childPhone ? (
          <div style={{ color: "rgba(255,248,240,.6)", fontSize: 18, marginTop: 8, fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
            {fmt(timer)}
          </div>
        ) : (
          <div style={{ color: "rgba(255,248,240,.5)", fontSize: 14, marginTop: 8 }}>
            {lang === "en" ? "Opening phone dialer…" : "फ़ोन डायलर खुल रहा है…"}
          </div>
        )}
      </div>

      <button onClick={endCall} style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "#DC2626", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 24px rgba(220,38,38,.4)", marginTop: 20
      }}>
        <PhoneOff size={26} color="#FFF8F0" />
      </button>
      <span style={{ color: "rgba(255,248,240,.4)", fontSize: 12 }}>
        {lang === "en" ? "End Call" : "कॉल समाप्त करें"}
      </span>
    </div>
  );
}

function LovedOneScreen({inPanel=false, userId:propUserId=null, linkedUserId:propLinkedUserId=null, fullName:propFullName=null, savedLang=null}) {
  const {w}=useWindowSize();
  const [lang,setLang]=useState(savedLang||"en");
  const [linkedName, setLinkedName]=useState(null);
  const [autoUserId, setAutoUserId]=useState(null);
  const [autoLinkedUserId, setAutoLinkedUserId]=useState(null);
  const [autoFullName, setAutoFullName]=useState(propFullName || null);

  const userId = propUserId || autoUserId;
  const linkedUserId = propLinkedUserId || autoLinkedUserId;
  const fullName = autoFullName || propFullName;

  // Auto-fetch profile from auth when no props provided
  useEffect(()=>{
    if(propUserId) return;
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user) return;
      setAutoUserId(user.id);
      supabase.from("profiles").select("full_name,linked_user_id,language").eq("id",user.id).maybeSingle()
        .then(({data})=>{
          if(data){
            if(data.full_name) setAutoFullName(data.full_name);
            if(data.linked_user_id) setAutoLinkedUserId(data.linked_user_id);
            if(data.language) setLang(data.language);
          }
        });
    });
  },[propUserId]);

  // Mic permission is now requested once at app startup in App.tsx

  // Broadcast presence so care partner can see loved one is online
  useEffect(() => {
    if (!userId) return;
    const presenceCh = supabase.channel(`presence:${userId}`);
    presenceCh.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceCh.track({ online: true, lastSeen: new Date().toISOString() });
      }
    });
    return () => { supabase.removeChannel(presenceCh); };
  }, [userId]);

  // Fetch linked user's name
  useEffect(()=>{
    if(!linkedUserId) return;
    supabase.from("profiles").select("full_name").eq("id",linkedUserId).maybeSingle()
      .then(({data})=>{ if(data?.full_name) setLinkedName(data.full_name); });
  },[linkedUserId]);
  const { current: streakDays, longest: longestStreak, recordedToday: streakRecordedToday } = useStreak(userId);
  const [rec,setRec]=useState(false);
  const [overlay,setOverlay]=useState(false);
  const [overlayPhase,setOverlayPhase]=useState("ask"); // ask | alerting | confirmed
  const [chatOpen,setChatOpen]=useState(false);
  const [memoryOpen,setMemoryOpen]=useState(false);
  const [callOpen,setCallOpen]=useState(false);
  const [memoryLogOpen,setMemoryLogOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [inp,setInp]=useState("");
  const [pendingChatMsg, setPendingChatMsg]=useState(null);
  const [linkCode,setLinkCode]=useState(null);
  const [showCode,setShowCode]=useState(false);
  const [codeCopied,setCodeCopied]=useState(false);
  const isMock = inPanel;
  const [newIllness, setNewIllness]=useState("");
  const [illnessDropOpen, setIllnessDropOpen]=useState(false);
  const [locationDropOpen, setLocationDropOpen]=useState(false);
  const [profileSaving, setProfileSaving]=useState(false);
  const [newInterest, setNewInterest]=useState("");
  const [seniorUnreadHearts, setSeniorUnreadHearts]=useState(0);
  const [seniorUnreadComments, setSeniorUnreadComments]=useState(0);
  const seniorUnreadCount = seniorUnreadHearts + seniorUnreadComments;

  // Fetch unread comment/reaction count for senior
  useEffect(()=>{
    if(!userId) return;
    const fetchUnread = async ()=>{
      const { data: prof } = await supabase.from("profiles").select("memories_last_viewed_at").eq("id",userId).maybeSingle();
      const cutoff = prof?.memories_last_viewed_at || "1970-01-01T00:00:00Z";
      
      const { data: mems } = await supabase.from("memories").select("id").eq("user_id",userId);
      if(!mems?.length){ setSeniorUnreadHearts(0); setSeniorUnreadComments(0); return; }
      const ids = mems.map(m=>m.id);
      
      const [{ count: cmtCount },{ count: rxnCount }] = await Promise.all([
        supabase.from("memory_comments").select("*",{count:"exact",head:true}).in("memory_id",ids).gt("created_at",cutoff),
        supabase.from("memory_reactions").select("*",{count:"exact",head:true}).in("memory_id",ids).gt("created_at",cutoff),
      ]);
      setSeniorUnreadComments(cmtCount||0);
      setSeniorUnreadHearts(rxnCount||0);
    };
    fetchUnread();

    const ch = supabase.channel("senior-unread-rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"memory_comments"},()=>fetchUnread())
      .on("postgres_changes",{event:"*",schema:"public",table:"memory_reactions"},()=>fetchUnread())
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[userId]);

  // Mark memories viewed when senior opens Memory Log
  const openMemoryLog = async ()=>{
    setMemoryLogOpen(true);
    if(userId){
      await supabase.from("profiles").update({memories_last_viewed_at:new Date().toISOString()}).eq("id",userId);
      setSeniorUnreadHearts(0);
      setSeniorUnreadComments(0);
    }
  };

  // Profile state
  const [profileData, setProfileData] = useState({
    age: null, health_issues: [], language: "en", interests: [], location: "",
    full_name: "", linked_user_id: null, religion: "", avatar_url: "", gender: ""
  });
  const avatarInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Load profile data from DB
  useEffect(()=>{
    if(!userId) return;
    supabase.from("profiles").select("full_name,age,language,health_issues,interests,location,linked_user_id,religion,avatar_url,gender")
      .eq("id",userId).maybeSingle().then(({data})=>{
        if(data) setProfileData({
          full_name: data.full_name||"", age: data.age, language: data.language||"en",
          health_issues: data.health_issues||[], interests: data.interests||[],
          location: data.location||"", linked_user_id: data.linked_user_id,
          religion: data.religion||"", avatar_url: data.avatar_url||"", gender: data.gender||""
        });
      });
  },[userId]);

  // Save profile to DB
  const saveProfile = async ()=>{
    if(!userId) return;
    setProfileSaving(true);
    try {
      await supabase.from("profiles").update({
        full_name: profileData.full_name||null,
        age: profileData.age,
        language: profileData.language,
        health_issues: profileData.health_issues,
        interests: profileData.interests,
        location: profileData.location||null,
        religion: profileData.religion||null,
        avatar_url: profileData.avatar_url||null,
        gender: profileData.gender||null,
      }).eq("id",userId);
      // Sync name to greeting immediately
      if(profileData.full_name) setAutoFullName(profileData.full_name);
    } catch(e){ console.error("Save profile error:",e); }
    setProfileSaving(false);
  };

  // Upload avatar
  const handleAvatarUpload = async (e)=>{
    const file = e.target.files?.[0];
    if(!file || !userId) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${userId}/profile.${ext}`;
      const { error: upErr } = await supabase.storage.from("memories").upload(path, file, { upsert: true });
      if(upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("memories").getPublicUrl(path);
      setProfileData(p=>({...p, avatar_url: publicUrl}));
    } catch(err){ console.error("Avatar upload error:",err); }
    setAvatarUploading(false);
  };
  // Memory of the Day prompt
  const [memoryOfDay, setMemoryOfDay] = useState(null);
  useEffect(() => {
    const loadPrompt = async () => {
      try {
        const { MEMORY_PROMPTS } = await import("@/lib/memoryPrompts");
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const idx = dayOfYear % MEMORY_PROMPTS.length;
        setMemoryOfDay(MEMORY_PROMPTS[idx]);
      } catch {}
    };
    loadPrompt();
  }, []);

  const addInterest = () => {
    if (!newInterest.trim()) return;
    setProfileData(prev => ({ ...prev, interests: [...prev.interests, newInterest.trim()] }));
    setNewInterest("");
  };

  const removeInterest = (idx) => {
    setProfileData(prev => ({ ...prev, interests: prev.interests.filter((_, i) => i !== idx) }));
  };

  const COMMON_LOCATIONS = [
    // India
    "Mumbai, India","Delhi, India","Bengaluru, India","Hyderabad, India","Chennai, India","Kolkata, India","Pune, India","Ahmedabad, India","Jaipur, India","Lucknow, India",
    "Chandigarh, India","Bhopal, India","Indore, India","Nagpur, India","Vadodara, India","Coimbatore, India","Kochi, India","Thiruvananthapuram, India","Visakhapatnam, India","Patna, India",
    "Guwahati, India","Dehradun, India","Shimla, India","Mysuru, India","Mangaluru, India","Surat, India","Rajkot, India","Agra, India","Varanasi, India","Amritsar, India",
    // USA
    "New York, USA","Los Angeles, USA","Chicago, USA","Houston, USA","San Francisco, USA","Seattle, USA","Boston, USA","Miami, USA","Dallas, USA","Atlanta, USA",
    "Washington DC, USA","Denver, USA","Phoenix, USA","San Diego, USA","Philadelphia, USA","Austin, USA","Portland, USA","Las Vegas, USA","Minneapolis, USA","Detroit, USA",
    // Canada
    "Toronto, Canada","Vancouver, Canada","Montreal, Canada","Calgary, Canada","Ottawa, Canada","Edmonton, Canada","Winnipeg, Canada",
    // UK & Ireland
    "London, UK","Manchester, UK","Birmingham, UK","Edinburgh, UK","Glasgow, UK","Liverpool, UK","Bristol, UK","Leeds, UK","Dublin, Ireland",
    // Europe
    "Paris, France","Berlin, Germany","Munich, Germany","Frankfurt, Germany","Amsterdam, Netherlands","Brussels, Belgium","Zurich, Switzerland","Geneva, Switzerland",
    "Vienna, Austria","Rome, Italy","Milan, Italy","Madrid, Spain","Barcelona, Spain","Lisbon, Portugal","Stockholm, Sweden","Copenhagen, Denmark",
    "Oslo, Norway","Helsinki, Finland","Prague, Czech Republic","Warsaw, Poland","Budapest, Hungary","Athens, Greece","Istanbul, Turkey",
    // Middle East
    "Dubai, UAE","Abu Dhabi, UAE","Riyadh, Saudi Arabia","Jeddah, Saudi Arabia","Doha, Qatar","Kuwait City, Kuwait","Muscat, Oman","Bahrain",
    "Gaza, Palestine","Ramallah, Palestine","Nablus, Palestine","Hebron, Palestine","Bethlehem, Palestine","Jenin, Palestine","Tulkarm, Palestine","Jericho, Palestine",
    // Asia
    "Singapore","Tokyo, Japan","Osaka, Japan","Seoul, South Korea","Beijing, China","Shanghai, China","Hong Kong","Taipei, Taiwan",
    "Bangkok, Thailand","Jakarta, Indonesia","Kuala Lumpur, Malaysia","Manila, Philippines","Ho Chi Minh City, Vietnam","Hanoi, Vietnam",
    // South Asia
    "Kathmandu, Nepal","Dhaka, Bangladesh","Colombo, Sri Lanka","Islamabad, Pakistan","Karachi, Pakistan","Lahore, Pakistan","Kabul, Afghanistan",
    // Oceania
    "Sydney, Australia","Melbourne, Australia","Brisbane, Australia","Perth, Australia","Auckland, New Zealand","Wellington, New Zealand",
    // Africa
    "Cairo, Egypt","Lagos, Nigeria","Nairobi, Kenya","Cape Town, South Africa","Johannesburg, South Africa","Accra, Ghana","Addis Ababa, Ethiopia","Casablanca, Morocco",
    // Latin America
    "Mexico City, Mexico","São Paulo, Brazil","Rio de Janeiro, Brazil","Buenos Aires, Argentina","Santiago, Chile","Lima, Peru","Bogotá, Colombia","Medellín, Colombia"
  ];
  const filteredLocations = profileData.location
    ? COMMON_LOCATIONS.filter(l => l.toLowerCase().includes(profileData.location.toLowerCase()))
    : COMMON_LOCATIONS;

  const COMMON_CONDITIONS = [
    "Diabetes (Type 1)","Diabetes (Type 2)","Hypertension","High Cholesterol","Arthritis","Osteoarthritis","Rheumatoid Arthritis",
    "Asthma","COPD","Heart Disease","Coronary Artery Disease","Atrial Fibrillation","Heart Failure",
    "Stroke","Parkinson's Disease","Alzheimer's Disease","Dementia","Depression","Anxiety","Insomnia",
    "Thyroid Disorder","Hypothyroidism","Hyperthyroidism","Osteoporosis","Kidney Disease","Liver Disease",
    "Cancer","Anemia","Cataracts","Glaucoma","Hearing Loss","Back Pain","Sciatica","Migraine",
    "Epilepsy","Gout","Psoriasis","Eczema","Ulcer","GERD","IBS","Prostate Issues","Urinary Incontinence"
  ];
  const filteredConditions = newIllness
    ? COMMON_CONDITIONS.filter(c => c.toLowerCase().includes(newIllness.toLowerCase()) && !profileData.health_issues.includes(c))
    : COMMON_CONDITIONS.filter(c => !profileData.health_issues.includes(c));

  const addIllness = (val) => {
    const v = val || newIllness.trim();
    if (!v) return;
    setProfileData(prev => ({ ...prev, health_issues: [...prev.health_issues, v] }));
    setNewIllness("");
    setIllnessDropOpen(false);
  };

  const removeIllness = (idx) => {
    setProfileData(prev => ({ ...prev, health_issues: prev.health_issues.filter((_, i) => i !== idx) }));
  };

  // ─── VOICE CONVERSATION STATE ──────────────────────────────────────────
  const [voicePhase, setVoicePhase] = useState("idle"); // idle | listening | thinking | speaking
  const [voiceText, setVoiceText] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const orbDebugQueueRef = useRef([]);
  const orbDebugFlushTimeoutRef = useRef(null);
  const orbDebugFlushingRef = useRef(false);
  const orbDebugSessionRef = useRef(`orb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const voiceHistoryRef = useRef([]); // conversation history for context

  const flushOrbDebugLogs = async () => {
    if (orbDebugFlushingRef.current || orbDebugQueueRef.current.length === 0) return;

    orbDebugFlushingRef.current = true;
    const entries = orbDebugQueueRef.current.splice(0, orbDebugQueueRef.current.length);

    try {
      const { error } = await supabase.functions.invoke("orb-debug", {
        body: {
          entries,
          userId,
          linkedUserId,
          route: typeof window !== "undefined" ? window.location.pathname : "/loved-one",
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("[orb-debug] failed to persist logs", error);
    } finally {
      orbDebugFlushingRef.current = false;
      if (orbDebugQueueRef.current.length > 0) {
        void flushOrbDebugLogs();
      }
    }
  };

  const addDebug = (message, extra = {}) => {
    const entry = {
      ts: new Date().toISOString(),
      sessionId: orbDebugSessionRef.current,
      userId: userId || null,
      linkedUserId: linkedUserId || null,
      lang,
      phase: voicePhase,
      message,
      extra,
    };

    console.log("[orb-debug]", entry);
    orbDebugQueueRef.current.push(entry);

    if (orbDebugQueueRef.current.length >= 5) {
      if (orbDebugFlushTimeoutRef.current) {
        clearTimeout(orbDebugFlushTimeoutRef.current);
        orbDebugFlushTimeoutRef.current = null;
      }
      void flushOrbDebugLogs();
      return;
    }

    if (!orbDebugFlushTimeoutRef.current) {
      orbDebugFlushTimeoutRef.current = window.setTimeout(() => {
        orbDebugFlushTimeoutRef.current = null;
        void flushOrbDebugLogs();
      }, 400);
    }
  };

  // Load today's conversation history for voice context
  useEffect(() => {
    if (!userId) return;
    const loadVoiceHistory = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
          .from("conversations")
          .select("messages")
          .eq("user_id", userId)
          .gte("created_at", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (data?.messages && Array.isArray(data.messages)) {
          voiceHistoryRef.current = data.messages;
        }
      } catch {
        // No history yet
      }
    };
    loadVoiceHistory();
  }, [userId]);

  // ─── PROACTIVE CONTEXT (injected into first voice turn, NOT auto-spoken) ───
  const proactiveContextRef = useRef(null);

  useEffect(() => {
    if (!userId || inPanel) return;
    const buildContext = async () => {
      try {
        // 1. Last memory time
        const { data: lastMemory } = await supabase
          .from("memories").select("created_at").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const lastRecordedAt = lastMemory?.created_at ? new Date(lastMemory.created_at) : null;
        const hoursAgo = lastRecordedAt ? (Date.now() - lastRecordedAt.getTime()) / (1000 * 60 * 60) : 999;

        // 2. Unread reactions/comments
        const { data: prof } = await supabase.from("profiles").select("memories_last_viewed_at").eq("id", userId).maybeSingle();
        const cutoff = prof?.memories_last_viewed_at || "1970-01-01T00:00:00Z";
        const { data: mems } = await supabase.from("memories").select("id, title").eq("user_id", userId);
        const memIds = (mems || []).map(m => m.id);
        const memTitleMap = Object.fromEntries((mems || []).map(m => [m.id, m.title || "a story"]));

        let ctx = "";
        if (memIds.length > 0) {
          const [{ data: reactions }, { data: comments }] = await Promise.all([
            supabase.from("memory_reactions").select("memory_id").in("memory_id", memIds).gt("created_at", cutoff),
            supabase.from("memory_comments").select("memory_id, author_name").in("memory_id", memIds).gt("created_at", cutoff),
          ]);
          const heartCount = reactions?.length || 0;
          const commentCount = comments?.length || 0;
          if (heartCount > 0 || commentCount > 0) {
            const reactedTitles = [...new Set((reactions || []).map(r => memTitleMap[r.memory_id]))].slice(0, 2);
            const commenterName = comments?.[0]?.author_name || linkedName || "Family";
            ctx += `\n- Unread: ${heartCount} heart(s) and ${commentCount} comment(s) from ${commenterName}`;
            if (reactedTitles.length) ctx += ` on "${reactedTitles.join('", "')}"`;
            ctx += ". Warmly mention this when natural in your first reply.";
          }
        }
        if (hoursAgo > 24) {
          const days = Math.floor(hoursAgo / 24);
          ctx += `\n- Last memory recorded: ${days} day(s) ago. If natural, gently suggest recording a new story.`;
        }
        proactiveContextRef.current = ctx || null;
      } catch (err) {
        console.error("Proactive context error:", err);
      }
    };
    buildContext();
  }, [userId, linkedName]);

  const speechRecRef = useRef(null);
  const wavRecorderRef = useRef(null);
  const lastTapRef = useRef(0);

  // Ref for a pre-warmed Audio element (survives across TTS calls)
  const preWarmedAudioRef = useRef(null);

  const startVoiceConversation = async () => {
    if (voicePhase === "listening") {
      // Stop listening
      if (speechRecRef.current) {
        speechRecRef.current.stop();
      }
      if (wavRecorderRef.current) {
        addDebug("Stopping WAV fallback");
        const { base64, byteLength } = wavRecorderRef.current.stop();
        wavRecorderRef.current = null;
        setRec(false);
        addDebug("WAV recording stopped", { byteLength });
        if (byteLength < 5000) {
          addDebug("WAV recording too short", { byteLength });
          setVoiceText(lang === "hi" ? "कुछ सुनाई नहीं दिया" : "Too short. Tap and try again.");
          setTimeout(() => { setVoicePhase("idle"); setVoiceText(""); }, 2000);
          return;
        }
        setVoiceText(lang === "hi" ? "प्रोसेस हो रहा है…" : "Processing speech…");
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          addDebug("Sending WAV to Sarvam STT", { byteLength, languageCode: lang === "hi" ? "hi-IN" : "en-IN" });
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/sarvam-stt`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
              body: JSON.stringify({ audioBase64: base64, contentType: "audio/wav", languageCode: lang === "hi" ? "hi-IN" : "en-IN" }),
            }
          );
          const data = await res.json();
          addDebug("Sarvam STT completed", { ok: res.ok, transcriptLength: data.transcript?.trim()?.length || 0, error: data.error || null });
          if (!res.ok) throw new Error(data.error || "STT failed");
          if (data.transcript?.trim()) {
            addDebug("Sarvam transcript captured", { transcript: data.transcript.trim() });
            sendVoiceToLLM(data.transcript.trim());
          } else {
            addDebug("Sarvam returned empty transcript");
            setVoiceText(lang === "hi" ? "कुछ सुनाई नहीं दिया" : "Couldn't hear anything. Tap and try again.");
            setTimeout(() => { setVoicePhase("idle"); setVoiceText(""); }, 2500);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Sarvam STT error:", err);
          addDebug(`Sarvam STT error: ${message}`);
          setVoiceText(lang === "hi" ? "पहचान में समस्या हुई" : "Speech recognition failed. Try again.");
          setTimeout(() => { setVoicePhase("idle"); setVoiceText(""); }, 2000);
        }
      }
      return;
    }
    if (voicePhase !== "idle") {
      stopVoiceConversation();
      return;
    }

    // Guard: if stuck in a non-idle state for >15s, force reset
    // (This handles sporadic stuck states on iOS)
    setTimeout(() => {
      if (voicePhase === "listening" && !speechRecRef.current && !wavRecorderRef.current) {
        console.warn("Orb stuck in listening — force resetting");
        stopVoiceConversation();
      }
    }, 15000);

    // Unlock audio + pre-warm AudioContext on iOS — only once
    if (!preWarmedAudioRef.current) {
      try {
        const { unlockAudio } = await import("@/lib/audioUnlock");
        preWarmedAudioRef.current = await unlockAudio();
      } catch (e) {
        console.warn("Audio unlock failed:", e);
      }
    }
    // Pre-warm AudioContext during STT so TTS playback has zero cold-start
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        await audioContextRef.current.resume();
      } catch {}
    }

    // Try Web Speech API first (works on desktop Chrome, Android Chrome)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    addDebug(`SpeechRecognition available: ${!!SpeechRecognition}`);
    
    if (SpeechRecognition) {
      setVoicePhase("listening");
      setVoiceText("");
      setVoiceResponse("");
      setRec(true);

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;
        speechRecRef.current = recognition;
        addDebug(`Created recognition, lang=${recognition.lang}`);

        let finalTranscript = "";
        let silenceTimer = null;
        let gotAnyResult = false;
        const startTime = Date.now();

        recognition.onresult = (event) => {
          gotAnyResult = true;
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
              addDebug(`Final: "${event.results[i][0].transcript}" (conf: ${event.results[i][0].confidence.toFixed(2)})`);
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (interim) addDebug(`Interim: "${interim}"`);
          setVoiceText(finalTranscript || interim || (lang === "hi" ? "सुन रहा हूँ…" : "Listening…"));
          // Auto-stop after 3.5s of silence
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            addDebug("Silence timeout — stopping");
            try { recognition.stop(); } catch (e) {}
          }, 3500);
        };

        recognition.onend = () => {
          const elapsed = Date.now() - startTime;
          addDebug(`onend fired after ${elapsed}ms, gotResult=${gotAnyResult}, final="${finalTranscript}"`);
          setRec(false);
          speechRecRef.current = null;
          // If ended very quickly (<2s) with no results, Web Speech API likely
          // doesn't work in this environment — fall back to WAV + Sarvam STT
          if (!gotAnyResult && elapsed < 2000) {
            addDebug("Quick fail — falling back to WAV");
            setVoicePhase("listening");
            setRec(true);
            startWavFallback();
            return;
          }
          if (finalTranscript.trim()) {
            sendVoiceToLLM(finalTranscript.trim());
          } else {
            addDebug("No transcript captured");
            setVoiceText(lang === "hi" ? "कुछ सुनाई नहीं दिया, फिर कोशिश करें" : "Couldn't hear anything. Tap and try again.");
            setTimeout(() => { setVoicePhase("idle"); setVoiceText(""); }, 2500);
          }
        };

        recognition.onerror = (event) => {
          addDebug(`onerror: ${event.error}`);
          // If Web Speech API fails, fall back to WAV recording
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setRec(false);
            speechRecRef.current = null;
            setVoiceText(lang === "hi" ? "माइक्रोफ़ोन एक्सेस नहीं मिला" : "Microphone access denied.");
            setTimeout(() => { setVoicePhase("idle"); setVoiceText(""); }, 2500);
          } else {
            addDebug("Falling back to WAV recording");
            speechRecRef.current = null;
            startWavFallback();
          }
        };

        recognition.onaudiostart = () => addDebug("audiostart");
        recognition.onsoundstart = () => addDebug("soundstart");
        recognition.onspeechstart = () => addDebug("speechstart");
        recognition.onspeechend = () => addDebug("speechend");
        recognition.onsoundend = () => addDebug("soundend");
        recognition.onaudioend = () => addDebug("audioend");

        recognition.start();
        addDebug("recognition.start() called");
      } catch (err) {
        addDebug(`SpeechRecognition error: ${err.message}`);
        startWavFallback();
      }
    } else {
      // No Web Speech API — use WAV recording + Sarvam STT
      setVoicePhase("listening");
      setVoiceText("");
      setVoiceResponse("");
      setRec(true);
      startWavFallback();
    }
  };

  const startWavFallback = async () => {
    addDebug("Starting WAV fallback");
    try {
      const { startWavRecording } = await import("@/lib/wavRecorder.js");
      const recorder = await startWavRecording();
      wavRecorderRef.current = recorder;
      addDebug("WAV recorder started");
      setVoiceText(lang === "hi" ? "बोलिए… फिर गोले को दबाएं" : "Speak now… tap orb when done");

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (wavRecorderRef.current) {
          addDebug("WAV auto-stop triggered at 30s");
          startVoiceConversation(); // triggers the stop path
        }
      }, 30000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("WAV recording error:", err);
      addDebug(`WAV recording error: ${message}`);
      setRec(false);
      setVoiceText(lang === "hi" ? "माइक्रोफ़ोन एक्सेस नहीं मिला" : "Microphone access denied.");
      setTimeout(() => { setVoicePhase("idle"); setVoiceText(""); }, 2000);
    }
  };

  // ─── CLIENT-SIDE INTENT ROUTER ──────────────────────────────────────
  // Fast regex matcher — skips LLM round-trip for clear app-action intents
  const matchIntent = (transcript) => {
    const t = transcript.toLowerCase().trim();
    const patterns = {
      record_memory: [
        /record\s*(a\s*)?memory/i, /record\s*(a\s*)?story/i, /save\s*(a\s*)?(memory|story)/i,
        /मेमोरी\s*रिकॉर्ड/i, /कहानी\s*रिकॉर्ड/i, /याद\s*रिकॉर्ड/i, /रिकॉर्ड\s*कर/i,
        /i\s*want\s*to\s*record/i, /let\s*me\s*record/i, /start\s*record/i,
      ],
      open_memory_log: [
        /show\s*(me\s*)?(my\s*)?(stories|memories|recordings)/i, /memory\s*log/i, /my\s*stories/i,
        /मेरी\s*कहानि/i, /मेरी\s*यादें/i, /कहानियाँ\s*दिखा/i, /मेमोरी\s*लॉग/i,
      ],
      open_chat: [
        /open\s*chat/i, /text\s*chat/i, /type\s*(instead|to\s*ela)/i,
        /चैट\s*खोल/i, /टाइप\s*कर/i,
      ],
      call_family: [
        /call\s*(my\s*)?(family|daughter|son|child|beta|beti)/i, /phone\s*(my\s*)?family/i,
        /फ़?ोन\s*कर/i, /कॉल\s*कर/i, /परिवार\s*को\s*(फ़?ोन|कॉल)/i,
      ],
    };
    for (const [action, regexes] of Object.entries(patterns)) {
      if (regexes.some(r => r.test(t))) return action;
    }
    return null;
  };

  const handleIntentAction = async (action, transcript) => {
    // Brief confirmation + trigger UI
    const confirmations = {
      record_memory: { en: "Sure, opening the recorder!", hi: "ज़रूर, रिकॉर्डर खोल रही हूँ!" },
      open_memory_log: { en: "Here are your stories!", hi: "आपकी कहानियाँ दिखा रही हूँ!" },
      open_chat: { en: "Opening the chat for you!", hi: "चैट खोल रही हूँ!" },
      call_family: { en: "Calling your family now!", hi: "परिवार को कॉल कर रही हूँ!" },
    };
    const msg = confirmations[action]?.[lang] || confirmations[action]?.en || "Sure!";
    setVoiceResponse(msg);

    // Save to history
    voiceHistoryRef.current = [
      ...voiceHistoryRef.current,
      { role: "user", content: transcript },
      { role: "assistant", content: msg },
    ];

    // Speak confirmation, then trigger action after TTS
    speakResponse(msg, () => {
      setTimeout(() => {
        if (action === "record_memory") setMemoryOpen(true);
        else if (action === "open_memory_log") openMemoryLog();
        else if (action === "open_chat") { setPendingChatMsg(null); setChatOpen(true); }
        else if (action === "call_family") setCallOpen(true);
      }, 300);
    });
  };

  const sendVoiceToLLM = async (text) => {
    // ── STEP 1: Fast intent check (<10ms) ──
    const intent = matchIntent(text);
    if (intent) {
      handleIntentAction(intent, text);
      return;
    }

    setVoicePhase("thinking");
    setVoiceText(text);

    const userMsg = { role: "user", content: text };
    const history = [...voiceHistoryRef.current, userMsg];

    // Build system prompt — inject proactive context on first turn only
    const actionTagInstructions = `

APP FEATURES (you know about these features in the app — suggest them naturally when relevant):
- "Record a Memory" — the user can record a voice or video story for their family.
- "Memory Log" — browse past recordings and see family reactions/comments.
- "Ask Ela" (text chat) — for typing instead of talking.
- "Call Family" — to call their linked care partner.

IMPORTANT — ACTION TAGS:
When the user clearly wants to use one of these features (e.g. "I want to record a memory", "show me my stories", "record a memory for me please", "call my daughter"), include the appropriate tag at the END of your response:
[ACTION:record_memory] — to open the memory recorder
[ACTION:open_memory_log] — to open the memory log
[ACTION:open_chat] — to open text chat
[ACTION:call_family] — to call their care partner
Only use ONE action tag per response. Keep your spoken response brief and natural alongside it.`;

    let systemOverride = (lang === "hi"
      ? "You are Ela, a warm AI companion for elderly Indian users. Respond ONLY in Hindi. CRITICAL: Keep responses to 2-3 SHORT sentences maximum — this will be read aloud, so brevity is essential. Be warm but very concise. Never give medical diagnoses."
      : "You are Ela, a warm AI companion for elderly Indian users. Respond ONLY in English. CRITICAL: Keep responses to 2-3 SHORT sentences maximum — this will be read aloud, so brevity is essential. Be warm but very concise. Never give medical diagnoses.") + actionTagInstructions;

    if (voiceHistoryRef.current.length === 0 && proactiveContextRef.current) {
      systemOverride += `\n\nCONVERSATION CONTEXT (use naturally, don't recite):${proactiveContextRef.current}`;
      proactiveContextRef.current = null; // Only inject once
    }

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            messages: history.map(m => ({ role: m.role, content: m.content })),
            userId,
            system: systemOverride,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to get response");

      // ── SENTENCE-LEVEL STREAMING TTS ──
      // Buffer tokens until sentence boundary, fire TTS per sentence for low latency
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let fullResponse = "";
      let sentenceBuffer = "";
      const sentenceQueue = [];
      let ttsPlaying = false;
      let streamDone = false;
      let pendingAction = null;

      // Sentence boundary regex (English + Hindi)
      const sentenceEnd = /[.?!।]\s*$/;

      const { streamTTS } = await import("@/lib/streamingTTS");
      const ctx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;

      const playNextSentence = () => {
        if (sentenceQueue.length === 0) {
          ttsPlaying = false;
          if (streamDone) {
            setVoicePhase("idle");
            ttsAudioRef.current = null;
            // Trigger pending action after all TTS finishes
            if (pendingAction) {
              setTimeout(() => {
                if (pendingAction === "record_memory") setMemoryOpen(true);
                else if (pendingAction === "open_memory_log") openMemoryLog();
                else if (pendingAction === "open_chat") { setPendingChatMsg(null); setChatOpen(true); }
                else if (pendingAction === "call_family") setCallOpen(true);
              }, 500);
            }
          }
          return;
        }
        ttsPlaying = true;
        const sentence = sentenceQueue.shift();
        const controller = streamTTS({
          text: sentence,
          lang,
          audioContext: ctx,
          onStart: () => setVoicePhase("speaking"),
          onEnd: () => playNextSentence(),
          onError: (err) => {
            console.error("Sentence TTS error:", err);
            // Fallback: speak with browser
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
            utterance.rate = 0.95;
            utterance.onend = () => playNextSentence();
            utterance.onerror = () => playNextSentence();
            window.speechSynthesis.speak(utterance);
          },
        });
        ttsAudioRef.current = controller;
      };

      const enqueueSentence = (text) => {
        const cleaned = text.replace(/\[ACTION:\w+\]/g, "").trim();
        if (cleaned) {
          sentenceQueue.push(cleaned);
          if (!ttsPlaying) playNextSentence();
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullResponse += parsed.text;
              sentenceBuffer += parsed.text;
              setVoiceResponse(fullResponse.replace(/\[ACTION:\w+\]/g, "").trim());

              // Check for sentence boundary
              if (sentenceEnd.test(sentenceBuffer)) {
                enqueueSentence(sentenceBuffer);
                sentenceBuffer = "";
              }
            }
          } catch {}
        }
      }

      // Flush remaining buffer
      if (sentenceBuffer.trim()) {
        enqueueSentence(sentenceBuffer);
      }

      // Parse action tags from full response
      const actionMatch = fullResponse.match(/\[ACTION:(\w+)\]/);
      if (actionMatch) {
        pendingAction = actionMatch[1];
        fullResponse = fullResponse.replace(/\[ACTION:\w+\]/g, "").trim();
        setVoiceResponse(fullResponse);
      }

      streamDone = true;

      // Save to conversation history (without action tags)
      voiceHistoryRef.current = [...history, { role: "assistant", content: fullResponse }];

      // If no sentences were queued (empty response), go idle
      if (!ttsPlaying && sentenceQueue.length === 0) {
        setVoicePhase("idle");
      }
    } catch (err) {
      console.error("Voice LLM error:", err);
      const errorText = lang === "hi" ? "क्षमा करें, कुछ गड़बड़ हो गई।" : "Sorry, something went wrong.";
      setVoiceResponse(errorText);
      speakResponse(errorText);
    }
  };

  const ttsAudioRef = useRef(null);
  const audioContextRef = useRef(null);

  const speakResponse = async (text, onEndCallback) => {
    setVoicePhase("speaking");

    // Stop any previous audio
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.stop(); } catch {}
      ttsAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    const handleEnd = () => {
      setVoicePhase("idle");
      ttsAudioRef.current = null;
      if (onEndCallback) onEndCallback();
    };

    try {
      const { streamTTS } = await import("@/lib/streamingTTS");
      const ctx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;

      const controller = streamTTS({
        text,
        lang,
        audioContext: ctx,
        onStart: () => setVoicePhase("speaking"),
        onEnd: handleEnd,
        onError: (err) => {
          console.error("Streaming TTS error, falling back to browser speech:", err);
          ttsAudioRef.current = null;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
          utterance.rate = 0.95;
          utterance.pitch = 1;
          synthRef.current = utterance;
          utterance.onend = handleEnd;
          utterance.onerror = handleEnd;
          window.speechSynthesis.speak(utterance);
        },
      });
      ttsAudioRef.current = controller;
    } catch (err) {
      console.error("TTS error, falling back to browser speech:", err);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      synthRef.current = utterance;
      utterance.onend = handleEnd;
      utterance.onerror = handleEnd;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopVoiceConversation = () => {
    if (speechRecRef.current) {
      try { speechRecRef.current.stop(); } catch {}
      speechRecRef.current = null;
    }
    if (wavRecorderRef.current) {
      try { wavRecorderRef.current.stop(); } catch {}
      if (wavRecorderRef.current?.stream) {
        wavRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      wavRecorderRef.current = null;
    }
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.stop(); } catch {}
      ttsAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setRec(false);
    setVoicePhase("idle");
    setVoiceText("");
    setVoiceResponse("");
  };

  // Load linking code
  useEffect(()=>{
    if(!userId||inPanel) return;
    supabase.functions.invoke("link-account",{body:{action:"get-code"}})
      .then(({data})=>{if(data?.code) setLinkCode(data.code);});
  },[userId]);

  // Persist language
  const switchLang = async (l) => {
    setLang(l);
    if(userId && !inPanel) {
      await supabase.from("profiles").update({language:l}).eq("id",userId);
    }
  };

  const TRIGGER_WORDS = ["help","pain","fall","scared","emergency","chest","dizzy"];
  const checkTrigger = (text) => {
    const lower = text.toLowerCase();
    return TRIGGER_WORDS.some(w => lower.includes(w));
  };

  const handleEmergencyCall = async () => {
    setOverlayPhase("alerting");
    if (linkedUserId) {
      const ch = supabase.channel(`user:${linkedUserId}`);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          ch.send({ type: "broadcast", event: "emergency", payload: { from: fullName || "Parent", from_id: userId, timestamp: new Date().toISOString() } });
          setTimeout(() => supabase.removeChannel(ch), 1000);
        }
      });
    }
    if (userId) {
      await supabase.from("health_events").insert({
        user_id: userId,
        event_type: "emergency_triggered",
        value: { timestamp: new Date().toISOString() },
      });
    }
    setTimeout(() => setOverlayPhase("confirmed"), 1500);
  };

  const closeOverlay = () => {
    setOverlay(false);
    setOverlayPhase("ask");
    setInp("");
  };

  const copyCode = () => {
    if(linkCode) { navigator.clipboard.writeText(linkCode).catch(()=>{}); setCodeCopied(true); setTimeout(()=>setCodeCopied(false),2000); }
  };

  const wrap = isMock
    ? {width:360,height:760,position:"relative",overflow:"hidden",
       background:"linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
       borderRadius:36,boxShadow:"0 32px 64px rgba(0,0,0,.5)",flexShrink:0,display:"flex",flexDirection:"column"}
    : {width:"100%",height:"100dvh",maxHeight:"100dvh",position:"relative",overflowX:"hidden",overflowY:"auto",
       background:"linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
       display:"flex",flexDirection:"column",
       paddingTop:"env(safe-area-inset-top, 0px)",paddingBottom:"env(safe-area-inset-bottom, 0px)",
       WebkitOverflowScrolling:"touch"};

  return (
    <div style={wrap}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse at 20% 20%,rgba(198,139,89,.06) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(141,110,99,.06) 0%,transparent 60%)"}}/>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"0 18px"}}>
        <div style={{width:48}}/>
        <div style={{background:"rgba(255,248,240,.1)",borderRadius:100,border:"1px solid rgba(255,248,240,.15)",padding:4,display:"flex",gap:3}}>
          {["en","hi"].map(l=>(
            <button key={l} onClick={()=>switchLang(l)} style={{
              padding:"8px 20px",borderRadius:100,border:"none",cursor:"pointer",fontSize:16,fontWeight:600,
              background:lang===l?"rgba(255,248,240,.25)":"transparent",
              color:lang===l?"#FFF8F0":"rgba(255,248,240,.55)",transition:"all .3s"
            }}>{l==="en"?"English":"हिंदी"}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setProfileOpen(true)} style={{
            width:48,height:48,borderRadius:14,border:"1.5px solid rgba(255,248,240,.18)",
            background:"rgba(255,248,240,.08)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
          }} title={lang==="en"?"My Profile":"मेरी प्रोफ़ाइल"}>
            <User size={20} color="rgba(255,248,240,.6)"/>
          </button>
          {!inPanel && (
            <button onClick={async()=>{await supabase.auth.signOut();window.location.href="/login";}} style={{
              width:48,height:48,borderRadius:14,border:"1.5px solid rgba(255,248,240,.18)",
              background:"rgba(255,248,240,.08)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
            }} title="Sign out">
              <LogOut size={20} color="rgba(255,248,240,.6)"/>
            </button>
          )}
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"rgba(255,248,240,.45)",letterSpacing:"0.3em",fontWeight:400}}>ANVAYA</div>
        {voicePhase==="idle" && fullName && (
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMock?20:24,color:"rgba(255,248,240,.7)",fontWeight:400,marginTop:8,letterSpacing:"0.02em"}}>
            {lang==="en"?`Namaste ${fullName.split(" ")[0]}, how are you feeling today?`:`नमस्ते ${fullName.split(" ")[0]} जी, आज आप कैसा महसूस कर रहे हैं?`}
          </div>
        )}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMock?40:48,color:"#FFF8F0",fontWeight:600,letterSpacing:"0.05em",marginTop:voicePhase==="idle"&&fullName?4:2}}>
          {lang==="en"?"Ela":"एला"}
        </div>
        {voicePhase==="idle"&&<div style={{fontSize:16,color:"rgba(255,248,240,.55)",marginTop:5}}>
          {lang==="en"?"Your trusted companion":"आपका विश्वसनीय साथी"}
        </div>}
      </div>

      <div style={{display:"flex",justifyContent:"center",marginTop:voicePhase!=="idle"?16:isMock?36:48,transition:"margin .5s ease",flexShrink:0}}>
        <div style={{position:"relative"}} className="pring">
          <div
            onClick={() => { const now=Date.now(); if(now-lastTapRef.current<400)return; lastTapRef.current=now; startVoiceConversation(); }}
            className={voicePhase==="listening"?"orb-rec":voicePhase==="speaking"?"orb-rec":"orb"}
            style={{
              width:voicePhase!=="idle"?(isMock?120:140):(isMock?160:180),
              height:voicePhase!=="idle"?(isMock?120:140):(isMock?160:180),
              borderRadius:"50%",
              background: voicePhase==="listening"
                ? "radial-gradient(circle at 40% 35%,#E8C9A0 0%,#C68B59 40%,#8D6E63 80%,#5D4037 100%)"
                : voicePhase==="thinking"
                ? "radial-gradient(circle at 40% 35%,#FFF8F0 0%,#E8C9A0 30%,#D4A574 60%,#C68B59 100%)"
                : voicePhase==="speaking"
                ? "radial-gradient(circle at 40% 35%,#D7CCC8 0%,#BCAAA4 35%,#A1887F 65%,#8D6E63 100%)"
                : "radial-gradient(circle at 40% 35%,#E8C9A0 0%,#D4A574 30%,#C68B59 55%,#8D6E63 80%,#5D4037 100%)",
              position:"relative",cursor:"pointer",transition:"all .5s ease",
              WebkitTapHighlightColor:"transparent",
              touchAction:"manipulation",
              boxShadow: voicePhase!=="idle"
                ? "0 0 40px 10px rgba(212,165,116,.25), 0 0 80px 30px rgba(198,139,89,.1)"
                : "0 0 50px 12px rgba(198,139,89,.2), 0 0 100px 30px rgba(141,110,99,.08)"
            }}
          >
            <div style={{position:"absolute",inset:6,borderRadius:"50%",
              background:"radial-gradient(circle at 30% 25%,rgba(255,255,255,.22) 0%,rgba(255,255,255,.06) 40%,transparent 70%)",
              border:"1px solid rgba(255,248,240,.12)"}}/>
            <div style={{position:"absolute",inset:0,borderRadius:"50%",
              background:"radial-gradient(circle at 65% 70%,rgba(255,248,240,.08) 0%,transparent 50%)"}}/>
            {voicePhase==="listening"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Waveform/></div>}
            {voicePhase==="thinking"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Loader2 size={28} color="rgba(255,248,240,.85)" style={{animation:"spin 1.2s linear infinite"}}/>
            </div>}
            {voicePhase==="speaking"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Headphones size={28} color="rgba(255,248,240,.85)"/>
            </div>}
          </div>
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:12,padding:"0 28px",minHeight:40}}>
        {voicePhase==="listening"&&(
          <p style={{color:"rgba(255,248,240,.8)",fontSize:16,lineHeight:1.5,animation:"fadeUp .4s ease both",fontWeight:500}}>
            {voiceText||(lang==="en"?"Listening…":"सुन रहा हूँ…")}
          </p>
        )}
        {voicePhase==="thinking"&&(
          <p style={{color:"rgba(255,248,240,.6)",fontSize:15,lineHeight:1.5,animation:"fadeUp .4s ease both"}}>
            {lang==="en"?`"${voiceText}" — thinking…`:`"${voiceText}" — सोच रहा हूँ…`}
          </p>
        )}
        {voicePhase==="speaking"&&(
          <p className="scr" style={{color:"rgba(255,248,240,.8)",fontSize:15,lineHeight:1.6,animation:"fadeUp .4s ease both",maxHeight:70,overflowY:"auto"}}>
            {voiceResponse}
          </p>
        )}
        {voicePhase==="idle"&&(
          <p style={{color:"rgba(255,248,240,.6)",fontSize:16,lineHeight:1.5,fontWeight:500}}>
            {seniorUnreadCount > 0
              ? (lang==="en"
                ? `💛 You have ${seniorUnreadCount} new reaction${seniorUnreadCount>1?"s":""} from family!`
                : `💛 परिवार से ${seniorUnreadCount} नई प्रतिक्रिया${seniorUnreadCount>1?"एँ":""}!`)
              : (lang==="en"?"Tap the orb to talk to Ela":"एला से बात करने के लिए ऑर्ब टैप करें")}
          </p>
        )}
      </div>

      <div style={{padding:"12px 18px 0"}}>
        <div style={{background:"rgba(255,248,240,.1)",border:"1.5px solid rgba(255,248,240,.15)",borderRadius:16,padding:"10px 10px 10px 18px",display:"flex",alignItems:"center",gap:8}}>
          <input value={inp} onChange={e=>{setInp(e.target.value);if(checkTrigger(e.target.value)){setOverlay(true);setOverlayPhase("ask");}}}
            onKeyDown={e=>{if(e.key==="Enter"&&inp.trim()){const q=inp.trim();setInp("");setPendingChatMsg(q);setChatOpen(true);}}}  
            placeholder={lang==="en"?"Type anything… say 'help' if in trouble":"कुछ भी लिखें… मुश्किल में 'help' बोलें"}
            style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#FFF8F0",fontSize:17}}/>
          <button onClick={()=>{if(inp.trim()){const q=inp.trim();setInp("");setPendingChatMsg(q);setChatOpen(true);}}} style={{
            width:48,height:48,borderRadius:14,border:"none",flexShrink:0,cursor:inp.trim()?"pointer":"default",
            background:inp.trim()?"linear-gradient(135deg,#C68B59,#8D6E63)":"rgba(255,248,240,.06)",
            display:"flex",alignItems:"center",justifyContent:"center",
            transition:"all .2s",
            boxShadow:inp.trim()?"0 4px 14px rgba(198,139,89,.35)":"none"
          }}>
            <Send size={20} color={inp.trim()?"#FFF8F0":"rgba(255,248,240,.25)"}/>
          </button>
        </div>
      </div>

      {/* Linking code card */}
      {linkCode && !linkedUserId && !isMock && (
        <div style={{margin:"0 16px 6px",padding:"10px 14px",background:"rgba(255,248,240,.08)",border:"1px solid rgba(255,248,240,.12)",borderRadius:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:10,color:"rgba(255,248,240,.4)",marginBottom:3}}>{lang==="en"?"Your linking code":"आपका लिंकिंग कोड"}</div>
              <div style={{fontSize:22,fontWeight:700,color:"#D4A574",letterSpacing:"0.15em",fontFamily:"'DM Sans',sans-serif"}}>{linkCode}</div>
            </div>
            <button onClick={copyCode} style={{background:"rgba(255,248,240,.1)",border:"1px solid rgba(255,248,240,.15)",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#FFF8F0",fontSize:11,display:"flex",alignItems:"center",gap:5}}>
              {codeCopied?<><Check size={13}/>Copied</>:<><Copy size={13}/>Copy</>}
            </button>
          </div>
          <div style={{fontSize:10,color:"rgba(255,248,240,.35)",marginTop:5}}>{lang==="en"?"Share this code with your child to link accounts":"अपने बच्चे को यह कोड दें"}</div>
        </div>
      )}

      {/* ─── MEMORY OF THE DAY ─── */}
      {memoryOfDay && voicePhase === "idle" && (
        <div style={{margin:"0 16px 4px",padding:"14px 16px",background:"rgba(255,248,240,.06)",
          border:"1.5px solid rgba(255,248,240,.1)",borderRadius:20,animation:"fadeUp .6s ease .15s both"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <Sparkles size={18} color="#C68B59"/>
            <span style={{color:"#FFF8F0",fontSize:16,fontWeight:600}}>
              {lang==="en"?"Memory of the Day":"आज की याद"}
            </span>
          </div>
          <p style={{color:"rgba(255,248,240,.7)",fontSize:14,lineHeight:1.6,margin:0}}>
            {lang==="hi" ? memoryOfDay.hi : memoryOfDay.en}
          </p>
          <button onClick={()=>setMemoryOpen(true)} style={{
            marginTop:10,padding:"10px 18px",borderRadius:14,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#C68B59,#8D6E63)",color:"#FFF8F0",fontSize:14,fontWeight:600,
            boxShadow:"0 4px 14px rgba(198,139,89,.35)"
          }}>
            {lang==="en"?"Record this story":"यह कहानी रिकॉर्ड करें"}
          </button>
        </div>
      )}

      {/* ─── RECORDING STREAK ─── */}
      {streakDays > 0 && voicePhase === "idle" && (
        <div style={{margin:"0 16px 4px",padding:"14px 18px",
          background:"rgba(255,248,240,.08)",border:"1.5px solid rgba(255,248,240,.12)",
          borderRadius:20,animation:"fadeUp .6s ease .08s both",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>🔥</span>
            <div>
              <div style={{color:"#FFF8F0",fontSize:22,fontWeight:800,lineHeight:1}}>
                {streakDays}
                <span style={{fontSize:13,fontWeight:500,color:"rgba(255,248,240,.55)",marginLeft:5}}>
                  {streakDays===1?(lang==="en"?"day streak":"दिन का स्ट्रीक"):(lang==="en"?"day streak":"दिन का स्ट्रीक")}
                </span>
              </div>
              <div style={{fontSize:11,color:"rgba(255,248,240,.4)",marginTop:2}}>
                {streakRecordedToday
                  ?(lang==="en"?"Recorded today ✓":"आज रिकॉर्ड किया ✓")
                  :(lang==="en"?"Record today to keep it going!":"आज रिकॉर्ड करें!")}
              </div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:"rgba(255,248,240,.35)"}}>{lang==="en"?"Best":"सबसे अच्छा"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#C68B59"}}>{longestStreak}</div>
          </div>
        </div>
      )}

      <div style={{padding:"16px 16px",display:"flex",flexDirection:"column",gap:14,flex:1,justifyContent:"flex-end"}}>
        {[
          {icon:<Mic size={24} color="#FFF8F0"/>,label:lang==="en"?"Record a Memory":"यादें रिकॉर्ड करें",sub:lang==="en"?"Your voice, preserved forever":"आपकी आवाज़, सदा के लिए",acc:"#C68B59",fn:()=>{setMemoryOpen(true);try{const{trackEvent}=require("@/hooks/useTelemetry");trackEvent("record_memory");}catch(e){}}},
          {icon:<BookOpen size={24} color="#FFF8F0"/>,label:lang==="en"?"Memory Log":"यादों की डायरी",sub:lang==="en"?"Your memories & family comments":"आपकी यादें और परिवार की टिप्पणियाँ",acc:"#C68B59",fn:()=>{openMemoryLog();try{const{trackEvent}=require("@/hooks/useTelemetry");trackEvent("open_memory_log");}catch(e){}},badge:seniorUnreadCount,badgeHearts:seniorUnreadHearts,badgeComments:seniorUnreadComments},
          {icon:<MessageCircle size={24} color="#FFF8F0"/>,label:lang==="en"?"Ask Ela":"एला से पूछें",sub:lang==="en"?"Stories · Conversations · Wisdom":"कहानियाँ · बातचीत · ज्ञान",acc:"#C68B59",fn:()=>{setChatOpen(true);try{const{trackEvent}=require("@/hooks/useTelemetry");trackEvent("open_chat");}catch(e){}}},
          {icon:<Phone size={24} color="#FFF8F0"/>,label:lang==="en"?`Call ${linkedName||"Family"}`:`${linkedName||"परिवार"} को कॉल करें`,sub:linkedName||"Family",acc:"#C68B59",fn:()=>{setCallOpen(true);try{const{trackEvent}=require("@/hooks/useTelemetry");trackEvent("call_family");}catch(e){}}},
        ].map((c,i)=>(
          <button key={i} onClick={c.fn} className="glass" style={{
            display:"flex",alignItems:"center",gap:14,padding:"16px 18px",
            border:"1.5px solid rgba(255,248,240,.12)",cursor:"pointer",
            animation:`fadeUp .7s ease ${.1+i*.12}s both`,width:"100%",textAlign:"left",
            borderRadius:20,position:"relative"
          }}>
            <div style={{width:52,height:52,borderRadius:14,flexShrink:0,background:c.acc,
              display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${c.acc}55`}}>
              {c.icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#FFF8F0",fontSize:17,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.label}</div>
              <div style={{color:"rgba(255,248,240,.55)",fontSize:14,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.sub}</div>
            </div>
            {c.badge > 0 && (
              <span style={{
                position:"absolute",top:8,right:12,
                background:"linear-gradient(135deg, #E8403F, #C62828)",color:"#FFF",fontSize:10,fontWeight:700,
                borderRadius:100,display:"flex",alignItems:"center",gap:6,
                padding:"3px 8px",boxShadow:"0 2px 8px rgba(220,38,38,.4)"
              }}>
                {(c.badgeHearts||0) > 0 && <span style={{display:"flex",alignItems:"center",gap:2}}>
                  <Heart size={10} fill="#FFF" stroke="none"/>{c.badgeHearts}
                </span>}
                {(c.badgeComments||0) > 0 && <span style={{display:"flex",alignItems:"center",gap:2}}>
                  <MessageCircle size={10} fill="#FFF" stroke="none"/>{c.badgeComments}
                </span>}
              </span>
            )}
            <ChevronRight size={18} color="rgba(255,248,240,.4)"/>
          </button>
        ))}
        <div style={{height:"env(safe-area-inset-bottom,14px)"}}/>
      </div>

      {overlay&&(
        <div className="fadein" style={{
          position:"absolute",inset:0,borderRadius:isMock?36:0,
          background:overlayPhase==="confirmed"?"rgba(26,15,10,.95)":"rgba(26,15,10,.88)",backdropFilter:"blur(20px)",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:32,gap:20,zIndex:10,transition:"background .5s"
        }}>
          {overlayPhase==="ask"&&(<>
            <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(255,248,240,.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Heart size={26} color="#FFF8F0"/>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#FFF8F0",fontWeight:400,lineHeight:1.3}}>
                {lang==="en"?"I heard you.":"मैंने सुना।"}
              </div>
              <div style={{color:"rgba(255,248,240,.6)",fontSize:14,marginTop:7,lineHeight:1.6}}>
                {lang==="en"?<>Should I call <strong style={{color:"#FFF8F0"}}>{linkedName||"your caregiver"}</strong>?</>:<>क्या मैं <strong style={{color:"#FFF8F0"}}>{linkedName||"आपके caregiver"}</strong> को बुलाऊँ?</>}
              </div>
            </div>
            <button onClick={handleEmergencyCall} style={{
              width:"100%",padding:"17px",borderRadius:18,border:"none",cursor:"pointer",
              background:"linear-gradient(135deg,#C68B59,#8D6E63)",
              color:"#FFF8F0",fontSize:18,fontWeight:700,
              boxShadow:"0 8px 28px rgba(198,139,89,.45)",letterSpacing:"0.02em"
            }}>✓ {lang==="en"?"Yes, Call Now":"हाँ, अभी कॉल करें"}</button>
            <button onClick={closeOverlay} style={{
              background:"transparent",border:"1px solid rgba(255,248,240,.15)",
              color:"rgba(255,248,240,.48)",padding:"10px 28px",borderRadius:100,cursor:"pointer",fontSize:13
            }}>{lang==="en"?"Not now":"अभी नहीं"}</button>
          </>)}

          {overlayPhase==="alerting"&&(<>
            <div style={{width:70,height:70,borderRadius:"50%",background:"rgba(198,139,89,.2)",display:"flex",alignItems:"center",justifyContent:"center",animation:"callPulse 1.5s ease-in-out infinite"}}>
              <Phone size={30} color="#FFF8F0"/>
            </div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#FFF8F0",fontWeight:400,textAlign:"center"}}>
              {lang==="en"?`Alerting ${linkedName||"caregiver"}…`:`${linkedName||"caregiver"} को सूचित कर रहे हैं…`}
            </div>
            <div style={{display:"flex",gap:4}}>
              {[0,1,2].map(i=>(<div key={i} style={{width:8,height:8,borderRadius:"50%",background:"rgba(255,248,240,.5)",animation:`dotBounce 1.2s ease-in-out ${i*.2}s infinite`}}/>))}
            </div>
          </>)}

          {overlayPhase==="confirmed"&&(<>
            <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(198,139,89,.25)",display:"flex",alignItems:"center",justifyContent:"center",animation:"callPulse 2s ease-in-out infinite"}}>
              <Check size={36} color="#FFF8F0"/>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#FFF8F0",fontWeight:400,lineHeight:1.4}}>
                {lang==="en"?`${linkedName||"Caregiver"} has been alerted.`:`${linkedName||"Caregiver"} को सूचित कर दिया गया।`}
              </div>
              <div style={{color:"rgba(212,165,116,.8)",fontSize:14,marginTop:8}}>
                {lang==="en"?"Help is coming.":"मदद आ रही है।"}
              </div>
            </div>
            <button onClick={closeOverlay} style={{
              marginTop:16,background:"transparent",border:"1px solid rgba(255,248,240,.2)",
              color:"rgba(255,248,240,.6)",padding:"12px 32px",borderRadius:100,cursor:"pointer",fontSize:13
            }}>{lang==="en"?"Close":"बंद करें"}</button>
          </>)}
        </div>
      )}

      <LovedOneChat open={chatOpen} onClose={()=>{setChatOpen(false);setPendingChatMsg(null);}} lang={lang} userId={userId} initialMessage={pendingChatMsg} onInitialMessageConsumed={()=>setPendingChatMsg(null)}/>
      <MemoryRecorder open={memoryOpen} onClose={()=>setMemoryOpen(false)} lang={lang} userId={userId} linkedName={linkedName}/>
      <CallOverlay open={callOpen} onClose={()=>setCallOpen(false)} lang={lang} userId={userId} linkedUserId={linkedUserId} fromName={linkedName||"Child"}/>
      <MemoryLog open={memoryLogOpen} onClose={()=>setMemoryLogOpen(false)} lang={lang} userId={userId}/>

      {/* ─── PROFILE OVERLAY ─── */}
      {profileOpen && (
        <div style={{
          position:"absolute",inset:0,borderRadius:isMock?36:0,
          background:"linear-gradient(160deg,#1A0F0A 0%,#2C1810 40%,#3E2723 70%,#2A1B14 100%)",
          zIndex:50,display:"flex",flexDirection:"column",overflow:"hidden"
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid rgba(255,248,240,.1)"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#FFF8F0",fontWeight:600}}>
              {lang==="en"?"My Profile":"मेरी प्रोफ़ाइल"}
            </div>
            <button onClick={()=>{saveProfile();setProfileOpen(false);}} style={{
              width:48,height:48,borderRadius:14,border:"1.5px solid rgba(255,248,240,.18)",
              background:"rgba(255,248,240,.08)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"
            }}>
              <X size={22} color="#FFF8F0"/>
            </button>
          </div>

          <div className="scr" style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:20}}>

            {/* Profile Photo */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div onClick={()=>avatarInputRef.current?.click()} style={{
                width:90,height:90,borderRadius:"50%",overflow:"hidden",cursor:"pointer",
                border:"3px solid rgba(198,139,89,.4)",background:"rgba(255,248,240,.08)",
                display:"flex",alignItems:"center",justifyContent:"center",position:"relative"
              }}>
                {profileData.avatar_url ? (
                  <img src={profileData.avatar_url} alt="Profile" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                ) : (
                  <User size={36} color="rgba(255,248,240,.4)"/>
                )}
                {avatarUploading && <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}><Loader2 size={24} color="#FFF8F0" style={{animation:"spin 1s linear infinite"}}/></div>}
              </div>
              <button onClick={()=>avatarInputRef.current?.click()} style={{
                fontSize:13,color:"#C68B59",background:"none",border:"none",cursor:"pointer",fontWeight:600
              }}>{lang==="en"?"Change Photo":"फ़ोटो बदलें"}</button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{display:"none"}}/>
            </div>

            {/* Name */}
            <div>
              <label style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:6,display:"block"}}>
                {lang==="en"?"Full Name":"पूरा नाम"}
              </label>
              <input value={profileData.full_name} onChange={e=>setProfileData(p=>({...p,full_name:e.target.value}))}
                style={{width:"100%",padding:"14px 16px",borderRadius:14,border:"1.5px solid rgba(255,248,240,.15)",
                  background:"rgba(255,248,240,.06)",color:"#FFF8F0",fontSize:18,outline:"none"}}/>
            </div>

            {/* Age */}
            <div>
              <label style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:6,display:"block"}}>
                {lang==="en"?"Age":"उम्र"}
              </label>
              <input type="number" value={profileData.age||""} onChange={e=>setProfileData(p=>({...p,age:parseInt(e.target.value)||null}))}
                placeholder={lang==="en"?"Enter your age":"अपनी उम्र लिखें"}
                style={{width:"100%",padding:"14px 16px",borderRadius:14,border:"1.5px solid rgba(255,248,240,.15)",
                  background:"rgba(255,248,240,.06)",color:"#FFF8F0",fontSize:18,outline:"none"}}/>
            </div>

            {/* Location */}
            <div>
              <label style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:6,display:"block"}}>
                {lang==="en"?"Location":"स्थान"}
              </label>
              <div style={{position:"relative"}}>
                <input value={profileData.location} onChange={e=>{setProfileData(p=>({...p,location:e.target.value}));setLocationDropOpen(true);}}
                  onFocus={()=>setLocationDropOpen(true)}
                  placeholder={lang==="en"?"Search city or town":"शहर खोजें"}
                  style={{width:"100%",padding:"14px 16px",borderRadius:14,border:"1.5px solid rgba(255,248,240,.15)",
                    background:"rgba(255,248,240,.06)",color:"#FFF8F0",fontSize:18,outline:"none"}}/>
                {locationDropOpen && filteredLocations.length > 0 && (
                  <div className="scr" style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,marginTop:4,
                    maxHeight:180,overflowY:"auto",borderRadius:14,border:"1.5px solid rgba(255,248,240,.15)",
                    background:"rgba(30,18,12,.97)",backdropFilter:"blur(16px)"}}>
                    {filteredLocations.slice(0,12).map(loc=>(
                      <button key={loc} onClick={()=>{setProfileData(p=>({...p,location:loc}));setLocationDropOpen(false);}}
                        style={{display:"block",width:"100%",textAlign:"left",padding:"12px 16px",border:"none",
                          background:"transparent",color:"#FFF8F0",fontSize:15,cursor:"pointer",
                          borderBottom:"1px solid rgba(255,248,240,.06)"}}>
                        {loc}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{v:"en",l:"English"},{v:"hi",l:"हिंदी"},{v:"bn",l:"বাংলা"},{v:"ta",l:"தமிழ்"},{v:"te",l:"తెలుగు"},{v:"mr",l:"मराठी"},{v:"gu",l:"ગુજરાતી"},{v:"kn",l:"ಕನ್ನಡ"}].map(opt=>(
                  <button key={opt.v} onClick={()=>{setProfileData(p=>({...p,language:opt.v}));switchLang(opt.v);}}
                    style={{padding:"10px 18px",borderRadius:100,border:`1.5px solid ${profileData.language===opt.v?"#C68B59":"rgba(255,248,240,.15)"}`,
                      background:profileData.language===opt.v?"rgba(198,139,89,.2)":"rgba(255,248,240,.06)",
                      color:profileData.language===opt.v?"#C68B59":"rgba(255,248,240,.6)",fontSize:15,fontWeight:600,cursor:"pointer"}}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <label style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:6,display:"block"}}>
                {lang==="en"?"Gender":"लिंग"}
              </label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Male","Female","Non-binary","Prefer not to say"].map(g=>(
                  <button key={g} onClick={()=>setProfileData(p=>({...p,gender:g}))}
                    style={{padding:"10px 18px",borderRadius:100,border:`1.5px solid ${profileData.gender===g?"#C68B59":"rgba(255,248,240,.15)"}`,
                      background:profileData.gender===g?"rgba(198,139,89,.2)":"rgba(255,248,240,.06)",
                      color:profileData.gender===g?"#C68B59":"rgba(255,248,240,.6)",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Religion */}
            <div>
              <label style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:6,display:"block"}}>
                {lang==="en"?"Religion / Faith":"धर्म"}
              </label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Hindu","Muslim","Christian","Sikh","Buddhist","Jain","Jewish","Other","Prefer not to say"].map(r=>(
                  <button key={r} onClick={()=>setProfileData(p=>({...p,religion:r}))}
                    style={{padding:"10px 18px",borderRadius:100,border:`1.5px solid ${profileData.religion===r?"#C68B59":"rgba(255,248,240,.15)"}`,
                      background:profileData.religion===r?"rgba(198,139,89,.2)":"rgba(255,248,240,.06)",
                      color:profileData.religion===r?"#C68B59":"rgba(255,248,240,.6)",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Health Issues / Illnesses */}
            <div>
              <label style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:6,display:"block"}}>
                {lang==="en"?"Health Conditions":"स्वास्थ्य समस्याएं"}
              </label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
                {profileData.health_issues.map((h,i)=>(
                  <span key={i} style={{padding:"8px 14px",borderRadius:100,background:"rgba(198,139,89,.15)",color:"#C68B59",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    {h}
                    <button onClick={()=>removeIllness(i)} style={{background:"none",border:"none",cursor:"pointer",color:"#C68B59",fontSize:16,padding:0,lineHeight:1}}>×</button>
                  </span>
                ))}
              </div>
              <div style={{position:"relative"}}>
                <div style={{display:"flex",gap:8}}>
                  <input value={newIllness} onChange={e=>{setNewIllness(e.target.value);setIllnessDropOpen(true);}}
                    onFocus={()=>setIllnessDropOpen(true)}
                    onKeyDown={e=>{if(e.key==="Enter"){addIllness();}}}
                    placeholder={lang==="en"?"Search condition…":"बीमारी खोजें…"}
                    style={{flex:1,padding:"12px 16px",borderRadius:14,border:"1.5px solid rgba(255,248,240,.15)",
                      background:"rgba(255,248,240,.06)",color:"#FFF8F0",fontSize:16,outline:"none"}}/>
                  <button onClick={()=>addIllness()} style={{padding:"12px 20px",borderRadius:14,border:"none",
                    background:"rgba(198,139,89,.25)",color:"#C68B59",fontSize:14,fontWeight:700,cursor:"pointer"}}>+</button>
                </div>
                {illnessDropOpen && filteredConditions.length > 0 && (
                  <div className="scr" style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,marginTop:4,
                    maxHeight:180,overflowY:"auto",borderRadius:14,border:"1.5px solid rgba(255,248,240,.15)",
                    background:"rgba(30,18,12,.97)",backdropFilter:"blur(16px)"}}>
                    {filteredConditions.slice(0,10).map(c=>(
                      <button key={c} onClick={()=>addIllness(c)}
                        style={{display:"block",width:"100%",textAlign:"left",padding:"12px 16px",border:"none",
                          background:"transparent",color:"#FFF8F0",fontSize:15,cursor:"pointer",
                          borderBottom:"1px solid rgba(255,248,240,.06)"}}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Medications section removed — legacy-first pivot */}

            {/* Interests */}
            <div>
              <label style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:6,display:"block"}}>
                {lang==="en"?"Interests & Hobbies":"रुचियाँ और शौक"}
              </label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
                {profileData.interests.map((h,i)=>(
                  <span key={i} style={{padding:"8px 14px",borderRadius:100,background:"rgba(141,110,99,.2)",color:"#D4A574",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    {h}
                    <button onClick={()=>removeInterest(i)} style={{background:"none",border:"none",cursor:"pointer",color:"#D4A574",fontSize:16,padding:0,lineHeight:1}}>×</button>
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input value={newInterest} onChange={e=>setNewInterest(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")addInterest();}}
                  placeholder={lang==="en"?"e.g. Gardening, Music, Cooking":"जैसे बागवानी, संगीत, खाना बनाना"}
                  style={{flex:1,padding:"12px 16px",borderRadius:14,border:"1.5px solid rgba(255,248,240,.15)",
                    background:"rgba(255,248,240,.06)",color:"#FFF8F0",fontSize:16,outline:"none"}}/>
                <button onClick={addInterest} style={{padding:"12px 20px",borderRadius:14,border:"none",
                  background:"rgba(141,110,99,.25)",color:"#D4A574",fontSize:14,fontWeight:700,cursor:"pointer"}}>+</button>
              </div>
            </div>

            {/* Linking Code */}
            {linkCode && (
              <div style={{padding:"16px",background:"rgba(255,248,240,.06)",borderRadius:16,border:"1px solid rgba(255,248,240,.1)"}}>
                <div style={{fontSize:13,color:"rgba(255,248,240,.5)",fontWeight:600,marginBottom:8}}>
                  {lang==="en"?"Care Partner Linking Code":"केयर पार्टनर लिंकिंग कोड"}
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:28,fontWeight:700,color:"#D4A574",letterSpacing:"0.2em"}}>{linkCode}</div>
                  <button onClick={copyCode} style={{background:"rgba(255,248,240,.1)",border:"1px solid rgba(255,248,240,.15)",borderRadius:10,padding:"10px 16px",cursor:"pointer",color:"#FFF8F0",fontSize:13,display:"flex",alignItems:"center",gap:5}}>
                    {codeCopied?<><Check size={14}/>Copied</>:<><Copy size={14}/>Copy</>}
                  </button>
                </div>
                <div style={{fontSize:12,color:"rgba(255,248,240,.35)",marginTop:6}}>
                  {lang==="en"?"Share with your child to connect accounts":"अपने बच्चे को यह कोड दें"}
                </div>
              </div>
            )}

            {/* Save button */}
            <button onClick={()=>{saveProfile();setProfileOpen(false);}} style={{
              padding:"18px",borderRadius:18,border:"none",cursor:"pointer",
              background:"linear-gradient(135deg,#C68B59,#8D6E63)",
              color:"#FFF8F0",fontSize:18,fontWeight:700,
              boxShadow:"0 8px 28px rgba(198,139,89,.35)",marginBottom:20
            }}>
              {profileSaving ? (lang==="en"?"Saving…":"सहेज रहा हूँ…") : (lang==="en"?"Save Profile":"प्रोफ़ाइल सहेजें")}
            </button>

            <div style={{height:"env(safe-area-inset-bottom,20px)"}}/>
          </div>
        </div>
      )}
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

// ─── CARE PARTNER DASHBOARD ───────────────────────────────────────────────────
function CarePartnerDashboard({inPanel=false, profileId=null}) {
  const {w}=useWindowSize();
  const isMobile = !inPanel && w < 768;
  const [nav,setNav]=useState("home");
  const [drawer,setDrawer]=useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [emergency, setEmergency] = useState(null); // { from, timestamp }
  const [callOpen, setCallOpen] = useState(false);

  // Real data hook
  const { parentProfile, memories: realMemories, healthEvents, stats: derivedStats, loading: dataLoading, lastUpdated } = useParentData(profileId);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Play alert sound
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      // Beep pattern
      setTimeout(() => { gain.gain.value = 0; }, 200);
      setTimeout(() => { gain.gain.value = 0.3; }, 400);
      setTimeout(() => { gain.gain.value = 0; }, 600);
      setTimeout(() => { gain.gain.value = 0.3; }, 800);
      setTimeout(() => { osc.stop(); ctx.close(); }, 1000);
    } catch (e) { /* ignore audio errors */ }
  };

  // Listen for incoming_call + emergency events via Realtime
  useEffect(() => {
    if (!profileId) return;
    const ch = supabase.channel(`user:${profileId}`)
      .on("broadcast", { event: "incoming_call" }, ({ payload }) => {
        setIncomingCall(payload);
      })
      .on("broadcast", { event: "call_ended" }, () => {
        setIncomingCall(null);
      })
      .on("broadcast", { event: "emergency" }, ({ payload }) => {
        setEmergency(payload);
        playAlertSound();
        // Send browser notification if tab is in background
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification("⚠️ Emergency Alert", {
            body: `${payload.from || "Amma"} needs help!`,
            icon: "/favicon.ico",
            requireInteraction: true,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profileId]);

  const handleMarkSafe = async () => {
    if (profileId && parentProfile) {
      await supabase.from("health_events").insert({
        user_id: parentProfile.id,
        event_type: "emergency_resolved",
        value: { resolved_by: profileId, timestamp: new Date().toISOString() },
      });
    }
    setEmergency(null);
  };

  // Settings state
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [notifPref, setNotifPref] = useState({emergency:true,memories:true,connection:true});
  const [signingOut, setSigningOut] = useState(false);

  const handleLinkAccount = async () => {
    setLinkError(""); setLinkSuccess("");
    if(linkCodeInput.length!==6){setLinkError("Please enter a 6-digit code.");return;}
    setLinkLoading(true);
    try {
      const {data,error} = await supabase.functions.invoke("link-account",{body:{action:"link",code:linkCodeInput}});
      if(error) throw error;
      if(data?.error) throw new Error(data.error);
      setLinkSuccess(`Linked to ${data.parent_name||"parent"}! Refreshing…`);
      setTimeout(()=>window.location.reload(),1500);
    } catch(e){setLinkError(e.message||"Failed to link");}
    finally{setLinkLoading(false);}
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.href="/login";
  };

  const navItems=[
    {id:"home",   icon:<Home size={17}/>,      label:"Overview"},
    {id:"memories",icon:<Headphones size={17}/>,label:"Memories"},
    {id:"health", icon:<Activity size={17}/>,  label:"Daily Rhythm"},
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
  const alerts = healthEvents.filter(e => e.event_type !== "medication_taken").slice(0,3).map(e => ({
    text: `${e.event_type.replace(/_/g," ")} recorded`,
    type: "info"
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
           <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:11,color:"rgba(6,78,59,0.35)",letterSpacing:"0.3em",fontWeight:300}}>ANVAYA</div>
           <div className="gtxt" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600}}>Care Partner</div>
        </div>
        {mobile&&<button onClick={()=>setDrawer(false)} style={{background:"transparent",border:"none",cursor:"pointer"}}><X size={18} color="#FFF8F0"/></button>}
      </div>

      {/* Parent status */}
      <div style={{padding:"12px 14px",margin:"12px 10px",background:"rgba(6,78,59,0.05)",borderRadius:14,border:"1px solid rgba(6,78,59,0.12)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#064E3B,#059669)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <User size={15} color="#FFF8F0"/>
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
        <button onClick={handleSignOut} disabled={signingOut} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",width:"100%",border:"none",background:"transparent",cursor:signingOut?"wait":"pointer",color:"#9CA3AF",fontSize:12,borderRadius:11,opacity:signingOut?.5:1}}>
          {signingOut?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<LogOut size={14}/>}{signingOut?"Signing out…":"Sign out"}
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
                {nav==="settings"?"Settings":`${parentProfile?.full_name?.split(" ")[0] || "Amma"}'s Dashboard`}
              </h1>
              <p style={{color:"#6b6b6b",fontSize:12,marginTop:3}}>
                {nav==="settings"?"Manage your account & preferences":<>
                  Staying connected with {parentProfile?.full_name || "Amma"}
                  <span style={{color:"#9CA3AF",fontSize:10,marginLeft:8}}>
                    Updated {lastUpdated.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                  </span>
                </>}
              </p>
            </div>
          </div>
          {nav!=="settings"&&<div style={{display:"flex",alignItems:"center",gap:8}}>
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
              }}>{healthEvents.length||0}</span>
            </button>
          </div>}
        </div>

        {/* No linked parent onboarding */}
        {!parentProfile && !dataLoading && nav!=="settings" && (
          <div className="gcard" style={{padding:28,textAlign:"center",marginBottom:16}}>
            <Link2 size={32} color="#064E3B" style={{margin:"0 auto 12px"}}/>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,color:"#064E3B",marginBottom:8}}>No parent linked yet</div>
            <p style={{fontSize:13,color:"#6b6b6b",lineHeight:1.6,marginBottom:16}}>
              Ask your parent to share their 6-digit linking code from the Ela app, then enter it in Settings.
            </p>
            <button onClick={()=>setNav("settings")} style={{
              padding:"12px 24px",borderRadius:14,border:"none",cursor:"pointer",
              background:"linear-gradient(135deg,#059669,#065f46)",color:"#fff",fontSize:13,fontWeight:600,
              boxShadow:"0 4px 16px rgba(5,150,105,.3)"
            }}>Go to Settings</button>
          </div>
        )}

        {/* Loading skeleton */}
        {dataLoading && nav==="home" && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 0",gap:12}}>
            <Loader2 size={28} color="#064E3B" style={{animation:"spin 1s linear infinite"}}/>
            <span style={{fontSize:13,color:"#6b6b6b"}}>Loading dashboard…</span>
          </div>
        )}

        {/* ══ SETTINGS VIEW ══ */}
        {nav==="settings"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:500}}>

            {/* Link Account */}
            <div className="gcard" style={{padding:20}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:4}}>Link Parent Account</div>
              <div style={{fontSize:11,color:"#6b6b6b",marginBottom:12}}>Enter the 6-digit code from your parent's Ela screen</div>
              {parentProfile ? (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"rgba(5,150,105,0.06)",borderRadius:12,border:"1px solid rgba(5,150,105,0.15)"}}>
                  <Check size={18} color="#059669"/>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:"#059669"}}>Linked to {parentProfile.full_name||"Parent"}</div>
                    <div style={{fontSize:10,color:"#6b6b6b",marginTop:1}}>Accounts are connected</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",gap:8}}>
                    <input value={linkCodeInput} onChange={e=>setLinkCodeInput(e.target.value.replace(/\D/g,"").slice(0,6))}
                      placeholder="000000" maxLength={6}
                      style={{flex:1,padding:"11px 14px",borderRadius:12,border:"1px solid rgba(6,78,59,0.15)",
                        fontSize:18,fontWeight:700,letterSpacing:"0.2em",textAlign:"center",
                        fontFamily:"'DM Sans',sans-serif",outline:"none",color:"#064E3B"}}/>
                    <button onClick={handleLinkAccount} disabled={linkLoading} style={{
                      padding:"11px 20px",borderRadius:12,border:"none",cursor:linkLoading?"wait":"pointer",
                      background:"linear-gradient(135deg,#059669,#065f46)",color:"#fff",fontSize:13,fontWeight:600,
                      opacity:linkLoading?.6:1,display:"flex",alignItems:"center",gap:6
                    }}>
                      {linkLoading?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:null}
                      {linkLoading?"Linking…":"Link"}
                    </button>
                  </div>
                  {linkError&&<div style={{marginTop:8,padding:"8px 12px",borderRadius:10,background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)",color:"#DC2626",fontSize:11}}>{linkError}</div>}
                  {linkSuccess&&<div style={{marginTop:8,padding:"8px 12px",borderRadius:10,background:"rgba(5,150,105,0.08)",border:"1px solid rgba(5,150,105,0.2)",color:"#059669",fontSize:11}}>{linkSuccess}</div>}
                </>
              )}
            </div>

            {/* Notification Preferences */}
            <div className="gcard" style={{padding:20}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:4}}>Notification Preferences</div>
              <div style={{fontSize:11,color:"#6b6b6b",marginBottom:12}}>Choose which notifications you receive</div>
              {[
                {key:"emergency",label:"Emergency Alerts",desc:"Critical alerts when parent needs help",icon:<AlertTriangle size={16} color="#DC2626"/>},
                {key:"memories",label:"New Memories",desc:"When a new memory is recorded",icon:<Headphones size={16} color="#B45309"/>},
                {key:"connection",label:"Connection Updates",desc:"When parent is active or shares stories",icon:<MessageCircle size={16} color="#059669"/>},
              ].map(n=>(
                <div key={n.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid rgba(6,78,59,0.06)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {n.icon}
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#1a1a1a"}}>{n.label}</div>
                      <div style={{fontSize:10,color:"#9CA3AF"}}>{n.desc}</div>
                    </div>
                  </div>
                  <button onClick={()=>setNotifPref(p=>({...p,[n.key]:!p[n.key]}))} style={{
                    width:40,height:22,borderRadius:11,border:"none",cursor:"pointer",padding:2,
                    background:notifPref[n.key]?"#059669":"#D1D5DB",transition:"background .2s",
                    display:"flex",alignItems:notifPref[n.key]?"center":"center",
                    justifyContent:notifPref[n.key]?"flex-end":"flex-start"
                  }}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"all .2s"}}/>
                  </button>
                </div>
              ))}
            </div>

            {/* Linked Parent Info */}
            {parentProfile && (
              <div className="gcard" style={{padding:20}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:12}}>Linked Parent</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#064E3B,#059669)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <User size={20} color="#FFF8F0"/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#064E3B"}}>{parentProfile.full_name||"Parent"}</div>
                    <div style={{fontSize:11,color:"#059669",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"#059669"}}/>Active
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sign Out */}
            <div className="gcard" style={{padding:20}}>
              <button onClick={handleSignOut} disabled={signingOut} style={{
                width:"100%",padding:"13px",borderRadius:14,border:"1px solid rgba(220,38,38,0.2)",
                background:"rgba(220,38,38,0.04)",color:"#DC2626",fontSize:13,fontWeight:600,
                cursor:signingOut?"wait":"pointer",opacity:signingOut?.6:1,
                display:"flex",alignItems:"center",justifyContent:"center",gap:8
              }}>
                {signingOut?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<LogOut size={14}/>}
                {signingOut?"Signing out…":"Sign Out"}
              </button>
            </div>
          </div>
        )}

        {/* ══ HOME VIEW ══ */}
        {nav==="home"&&!dataLoading&&(
          <>
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
              <div className="gcard s5" style={{padding:20}}>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Acoustic Insights</div>
                  <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>24-hour vocal and acoustic analysis</div>
                </div>
                <AcousticHeatmap/>
              </div>

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

            {/* Connection Pulse — replaced medication tracker */}
            <div className="gcard s6" style={{padding:20,marginBottom:14}}>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1a1a1a"}}>Connection Pulse</div>
                <div style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>How {parentProfile?.full_name?.split(" ")[0] || "Amma"} is staying connected</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(5,150,105,0.06)",borderRadius:12,border:"1px solid rgba(5,150,105,0.15)"}}>
                  <span style={{fontSize:18}}>📖</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#064E3B"}}>{realMemories.length} Stories Shared</div>
                    <div style={{fontSize:10,color:"#9CA3AF"}}>Total memories recorded</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(179,69,9,0.06)",borderRadius:12,border:"1px solid rgba(179,69,9,0.15)"}}>
                  <span style={{fontSize:18}}>🎙️</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#B45309"}}>{(() => {
                      const totalMin = Math.round(realMemories.reduce((s,m) => s + (m.duration_seconds || 0), 0) / 60);
                      return `${totalMin} Minutes of Legacy`;
                    })()}</div>
                    <div style={{fontSize:10,color:"#9CA3AF"}}>Family history recorded this month</div>
                  </div>
                </div>
                {realMemories.length > 0 && realMemories[0]?.emotional_tone && (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(6,78,59,0.06)",borderRadius:12,border:"1px solid rgba(6,78,59,0.15)"}}>
                    <span style={{fontSize:18}}>💛</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#064E3B"}}>{parentProfile?.full_name?.split(" ")[0] || "Amma"} is feeling {realMemories[0].emotional_tone}</div>
                      <div style={{fontSize:10,color:"#9CA3AF"}}>Based on most recent story</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Memory Archive */}
            <div className="s7">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div>
                  <h3 style={{fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{parentProfile?.full_name?.split(" ")[0] || "Amma"}'s Stories</h3>
                  <p style={{fontSize:11,color:"#6b6b6b",marginTop:2}}>Memories and moments shared with love</p>
                </div>
                <button style={{fontSize:11,fontWeight:600,color:"#064E3B",border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
                  View all <ChevronRight size={12}/>
                </button>
              </div>
              {realMemories.length === 0 ? (
                <div className="gcard" style={{padding:28,textAlign:"center"}}>
                  <Headphones size={28} color="#FFF8F0" style={{margin:"0 auto 10px"}}/>
                  <p style={{fontSize:13,color:"#6b6b6b",lineHeight:1.6}}>
                    No memories recorded yet.<br/>
                    <span style={{color:"#9CA3AF",fontSize:12}}>Tap "Record a Memory" on the Ela app to begin.</span>
                  </p>
                </div>
              ) : (
                <div style={{
                  display:"grid",
                  gridTemplateColumns:isMobile?"1fr":inPanel?"1fr":"repeat(3,1fr)",
                  gap:13
                }}>
                  {memories.map((m,i)=>(
                    <MemoryCard key={i} {...m} index={i}/>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
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

      {/* Emergency overlay — cannot be accidentally dismissed */}
      {emergency && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 100,
          background: "linear-gradient(160deg,#7F1D1D 0%,#991B1B 40%,#B91C1C 70%,#DC2626 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 32, gap: 20
        }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "callPulse 1.5s ease-in-out infinite"
          }}>
            <AlertTriangle size={42} color="#FFF8F0" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: "#fff", fontWeight: 700, lineHeight: 1.3 }}>
              ⚠️ {parentProfile?.full_name || "Amma"} needs help
            </div>
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: 14, marginTop: 10 }}>
              {emergency.timestamp ? new Date(emergency.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Just now"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16, width: "100%", maxWidth: 320 }}>
            <button onClick={() => { setEmergency(null); setCallOpen(true); }} style={{
              flex: 1, padding: "16px 0", borderRadius: 16, border: "none", cursor: "pointer",
              background: "#fff", color: "#991B1B", fontSize: 16, fontWeight: 700,
              boxShadow: "0 4px 20px rgba(0,0,0,.2)"
            }}>
              <Phone size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Call Now
            </button>
            <button onClick={handleMarkSafe} style={{
              flex: 1, padding: "16px 0", borderRadius: 16, border: "2px solid rgba(255,255,255,.3)", cursor: "pointer",
              background: "transparent", color: "#fff", fontSize: 16, fontWeight: 700
            }}>
              <ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Mark as Safe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export { LovedOneScreen, CarePartnerDashboard, fontStyle };

export default function App() {
  const {w}=useWindowSize();
  const isMobile=w<768;
  const [view,setView]=useState(isMobile?"loved-one":"both");

  useEffect(()=>{
    if(isMobile&&view==="both") setView("loved-one");
  },[isMobile]);

  const tabs=[
    {id:"loved-one",   label:"Loved One"},
    {id:"care-partner",label:"Care Partner"},
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

        {view==="loved-one"&&(
          isMobile
            ? <LovedOneScreen/>
            : <div style={{flex:1,display:"flex",justifyContent:"center",alignItems:"flex-start",overflowY:"auto",background:"linear-gradient(160deg,#111 0%,#1a1a1a 100%)",padding:"40px 20px"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                  <div style={{fontSize:10,color:"rgba(249,249,247,.28)",letterSpacing:"0.15em",fontWeight:600}}>ELA — LOVED ONE PREVIEW</div>
                  <LovedOneScreen inPanel/>
                  <div style={{padding:"6px 14px",borderRadius:100,background:"rgba(6,78,59,.2)",border:"1px solid rgba(6,78,59,.3)"}}>
                    <span style={{fontSize:11,color:"#34D399"}}>If you're in trouble, type or say "help" to Ela</span>
                  </div>
                </div>
              </div>
        )}

        {view==="care-partner"&&(
          isMobile
            ? <CarePartnerDashboard/>
            : <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{fontSize:10,color:"#6b6b6b",letterSpacing:"0.13em",fontWeight:600,textAlign:"center",padding:"9px 0",background:"#F2F4F3",flexShrink:0}}>
                  CARE PARTNER DASHBOARD
                </div>
                <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                  <CarePartnerDashboard/>
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
              <div style={{fontSize:10,color:"rgba(249,249,247,.28)",letterSpacing:"0.14em",marginBottom:14,fontWeight:600}}>ELA — LOVED ONE COMPANION</div>
              <LovedOneScreen inPanel/>
              <div style={{marginTop:14,padding:"6px 13px",borderRadius:100,background:"rgba(6,78,59,.2)",border:"1px solid rgba(6,78,59,.3)"}}>
                <span style={{fontSize:11,color:"#34D399"}}>If you're in trouble, type or say "help" to Ela</span>
              </div>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{fontSize:10,color:"#6b6b6b",letterSpacing:"0.13em",fontWeight:600,textAlign:"center",padding:"9px 0",background:"#F2F4F3",flexShrink:0}}>
                CARE PARTNER DASHBOARD
              </div>
              <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                <CarePartnerDashboard inPanel/>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
