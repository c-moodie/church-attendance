import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "./supabase.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const GLOBAL_FONT = "'Inter', system-ui, -apple-system, sans-serif";

const GROUP_PALETTES = [
  { bg:"#e6f1fb", border:"#b5d4f4", text:"#0c447c", accent:"#185fa5", header:"#dbeafe" },
  { bg:"#e1f5ee", border:"#9fe1cb", text:"#085041", accent:"#0f6e56", header:"#d1fae5" },
  { bg:"#faeeda", border:"#fac775", text:"#633806", accent:"#854f0b", header:"#fef3c7" },
  { bg:"#fbeaf0", border:"#f4c0d1", text:"#4b1528", accent:"#993556", header:"#fce7f3" },
  { bg:"#eeedfe", border:"#cecbf6", text:"#26215c", accent:"#534ab7", header:"#ede9fe" },
  { bg:"#faece7", border:"#f5c4b3", text:"#4a1b0c", accent:"#993c1d", header:"#ffedd5" },
];
const getGroupPalette = (groupId, groups) => {
  const idx = groups.findIndex(g => g.id === groupId);
  return GROUP_PALETTES[Math.max(0, idx) % GROUP_PALETTES.length];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2, 10);
const fmt  = (d) => d.toISOString().split("T")[0];
const todayDate = new Date();
const sunday = (offset = 0) => {
  const d = new Date(todayDate);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return fmt(d);
};
const fullName   = (p) => p ? `${p.firstName||p.first_name||""} ${p.lastName||p.last_name||""}`.trim() || p.name || "" : "";
const initials   = (p) => { const f=(p.firstName||p.first_name||"")[0]||""; const l=(p.lastName||p.last_name||"")[0]||""; return (f+l).toUpperCase()||"?"; };
const sortKey    = (p) => `${(p.lastName||p.last_name||"").toLowerCase()} ${(p.firstName||p.first_name||"").toLowerCase()}`;
const weekStartFromDate = (iso) => { const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); return d; };
const weekEndFromDate   = (iso) => { const d=weekStartFromDate(iso); d.setDate(d.getDate()+6); d.setHours(23,59,59,999); return d; };
const isoToDisplay = (iso) => new Date(iso+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

// ─── DB helpers — map DB snake_case ↔ app camelCase ──────────────────────────
const mapPerson  = (r) => r ? ({
  id: r.id, firstName: r.first_name, lastName: r.last_name,
  phone: r.phone, email: r.email, address: r.address, notes: r.notes,
  householdId: r.household_id, householdRole: r.household_role,
  classIds: r.class_ids || []
}) : null;
const mapGroup   = (r) => r ? ({ id:r.id, name:r.name, order:r.order }) : null;
const mapClass   = (r) => r ? ({ id:r.id, name:r.name, groupId:r.group_id, order:r.order }) : null;
const mapSession = (r) => r ? ({ id:r.id, classId:r.class_id, date:r.date, visitors:r.visitors }) : null;
const mapRecord  = (r) => r ? ({ id:r.id, sessionId:r.session_id, personId:r.person_id, present:r.present }) : null;

// ─── Shared UI ────────────────────────────────────────────────────────────────
function PageHeader({ title, actions }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:10}}>
      <h2 style={{fontSize:22,fontWeight:700,margin:0,color:"var(--color-text-primary)"}}>{title}</h2>
      {actions && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{actions}</div>}
    </div>
  );
}
function Modal({title,children,onClose,maxWidth=480}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
        <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid #e8edf5",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#fff",zIndex:1}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:700,color:"#1a2744"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#8896b0",fontSize:20,lineHeight:1}}><i className="ti ti-x"/></button>
        </div>
        <div style={{padding:"1.25rem 1.5rem",background:"#fff"}}>{children}</div>
      </div>
    </div>
  );
}
function Confirm({msg,onConfirm,onClose,confirmLabel="Delete"}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:12,padding:"1.5rem",maxWidth:380,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <p style={{margin:"0 0 1.25rem",fontSize:15,color:"#1a2744",lineHeight:1.55}}>{msg}</p>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 16px",border:"1px solid #dde3ee",background:"#f4f6fb",borderRadius:8,cursor:"pointer",color:"#1a2744",fontSize:14}}>Cancel</button>
          <button onClick={onConfirm} style={{padding:"8px 16px",background:"#e24b4a",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
function Empty({msg}) {
  return (
    <div style={{textAlign:"center",padding:"3rem 1rem",color:"var(--color-text-secondary)"}}>
      <i className="ti ti-inbox" style={{fontSize:36,display:"block",marginBottom:"0.5rem"}}/>
      <p style={{margin:0,fontSize:14}}>{msg}</p>
    </div>
  );
}
function Spinner() {
  return <div style={{textAlign:"center",padding:"3rem",color:"#8896b0",fontSize:14}}>Loading…</div>;
}
function GroupBadge({groupId,groups,label}) {
  const pal=getGroupPalette(groupId,groups);
  return <span style={{fontSize:11,padding:"2px 8px",background:pal.bg,color:pal.text,borderRadius:4,border:`1px solid ${pal.border}`,fontWeight:500}}>{label}</span>;
}
function StatCard({label,total,members,visitors,groupId,groups}) {
  const pal=groupId?getGroupPalette(groupId,groups):null;
  const accent=pal?pal.accent:"#3b5bdb";
  return (
    <div style={{background:"var(--color-background-primary)",border:`1px solid ${pal?pal.border:"var(--color-border-tertiary)"}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{background:pal?pal.header:"var(--color-background-primary)",borderBottom:`3px solid ${accent}`,padding:"0.75rem 1.25rem 0.6rem"}}>
        <p style={{fontSize:13,color:pal?pal.text:"var(--color-text-secondary)",margin:0,fontWeight:600}}>{label}</p>
      </div>
      <div style={{padding:"0.75rem 1.25rem 1rem"}}>
        <p style={{fontSize:28,fontWeight:700,margin:"0 0 6px",color:"var(--color-text-primary)",lineHeight:1}}>{total}</p>
        <div style={{display:"flex",gap:12,fontSize:12}}>
          <span style={{color:"var(--color-text-secondary)"}}><strong style={{color:"var(--color-text-primary)"}}>{members}</strong> members</span>
          <span style={{color:"var(--color-text-secondary)"}}><strong style={{color:accent}}>{visitors}</strong> visitors</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed,  setAuthed]  = useState(false);
  const [page,    setPage]    = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // All shared state — loaded once from Supabase, then kept in sync
  const [groups,       setGroups]       = useState([]);
  const [classes,      setClasses]      = useState([]);
  const [people,       setPeople]       = useState([]);
  const [sessions,     setSessions]     = useState([]);
  const [records,      setRecords]      = useState([]);
  const [deletedNames, setDeletedNames] = useState({});

  // Check for existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      if (!session) setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
      if (!session) { setLoading(false); setGroups([]); setClasses([]); setPeople([]); setSessions([]); setRecords([]); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load everything when authenticated
  useEffect(() => {
    if (!authed) return;
    (async () => {
      setLoading(true);
      const [g, cl, p, s, r, dn] = await Promise.all([
        supabase.from("groups").select("*").order("order"),
        supabase.from("classes").select("*").order("order"),
        supabase.from("people").select("*"),
        supabase.from("sessions").select("*"),
        supabase.from("records").select("*"),
        supabase.from("deleted_names").select("*"),
      ]);
      setGroups((g.data||[]).map(mapGroup));
      setClasses((cl.data||[]).map(mapClass));
      setPeople((p.data||[]).map(mapPerson));
      setSessions((s.data||[]).map(mapSession));
      setRecords((r.data||[]).map(mapRecord));
      const dnMap = {};
      (dn.data||[]).forEach(x => { dnMap[x.person_id] = x.display_name; });
      setDeletedNames(dnMap);
      setLoading(false);
    })();
  }, [authed]);

  if (!authed && !loading) return <Login onLogin={() => setAuthed(true)} />;

  const navItems = [
    { id:"dashboard",  icon:"ti-dashboard",      label:"Dashboard"  },
    { id:"attendance", icon:"ti-clipboard-check", label:"Attendance" },
    { id:"people",     icon:"ti-users",           label:"People"     },
    { id:"groups",     icon:"ti-layout-list",     label:"Groups"     },
    { id:"history",    icon:"ti-history",         label:"History"    },
  ];

  const ctx = { groups, setGroups, classes, setClasses, people, setPeople,
                sessions, setSessions, records, setRecords, deletedNames, setDeletedNames };

  const SidebarNav = ({ onNav }) => (
    <nav style={{padding:"0.75rem 0.5rem",flex:1}}>
      {navItems.map(n => (
        <button key={n.id} onClick={() => { setPage(n.id); onNav?.(); }} style={{
          display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",
          borderRadius:8,border:"none",cursor:"pointer",marginBottom:2,
          background: page===n.id ? "rgba(59,91,219,0.25)" : "transparent",
          color: page===n.id ? "#7b9fff" : "rgba(255,255,255,0.65)",
          fontSize:14,fontWeight: page===n.id ? 600 : 400,transition:"all 0.15s",
        }}>
          <i className={`ti ${n.icon}`} style={{fontSize:17,width:20,textAlign:"center"}}/>
          {n.label}
        </button>
      ))}
    </nav>
  );
  const LogoBlock = () => (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:34,height:34,borderRadius:"50%",background:"#3b5bdb",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <i className="ti ti-building-church" style={{color:"#fff",fontSize:18}}/>
      </div>
      <div>
        <div style={{color:"#fff",fontWeight:700,fontSize:14,lineHeight:1.2}}>Church</div>
        <div style={{color:"rgba(255,255,255,0.5)",fontSize:11}}>Attendance</div>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--color-background-tertiary)",fontFamily:GLOBAL_FONT}}>
      <aside style={{width:220,background:"#1a2744",display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto"}} className="desktop-sidebar">
        <div style={{padding:"1.5rem 1.25rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.08)"}}><LogoBlock/></div>
        <SidebarNav/>
        <div style={{padding:"1rem 1.25rem",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          <button onClick={() => supabase.auth.signOut()} style={{display:"flex",alignItems:"center",gap:8,color:"rgba(255,255,255,0.45)",background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"6px 0"}}>
            <i className="ti ti-logout" style={{fontSize:16}}/>Sign out
          </button>
        </div>
      </aside>

      {navOpen && <div onClick={() => setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:40}}/>}
      <aside style={{position:"fixed",left:0,top:0,bottom:0,width:220,background:"#1a2744",zIndex:50,transform:navOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.25s",display:"flex",flexDirection:"column"}} className="mobile-drawer">
        <div style={{padding:"1.5rem 1.25rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <LogoBlock/>
            <button onClick={() => setNavOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:20}}><i className="ti ti-x"/></button>
          </div>
        </div>
        <SidebarNav onNav={() => setNavOpen(false)}/>
      </aside>

      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <header style={{background:"#1a2744",padding:"0.75rem 1rem",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:30}} className="mobile-header">
          <button onClick={() => setNavOpen(true)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",fontSize:24,padding:"2px",lineHeight:1}}>
            <i className="ti ti-menu-2"/>
          </button>
          <span style={{color:"#fff",fontWeight:600,fontSize:15}}>{navItems.find(n=>n.id===page)?.label}</span>
        </header>
        <main style={{flex:1,padding:"1.5rem",maxWidth:1100,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
          {loading ? <Spinner/> : <>
            {page==="dashboard"  && <Dashboard  {...ctx} setPage={setPage}/>}
            {page==="attendance" && <AttendancePage {...ctx}/>}
            {page==="people"     && <PeoplePage  {...ctx}/>}
            {page==="groups"     && <GroupsPage  {...ctx}/>}
            {page==="history"    && <HistoryPage {...ctx}/>}
          </>}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @media(min-width:768px){.mobile-header{display:none!important}.mobile-drawer{display:none!important}}
        @media(max-width:767px){.desktop-sidebar{display:none!important}}
        *{box-sizing:border-box;font-family:'Inter',system-ui,sans-serif}
        button:focus-visible{outline:2px solid #3b5bdb;outline-offset:2px}
        input:focus,select:focus,textarea:focus{outline:2px solid #3b5bdb;outline-offset:0}
      `}</style>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({onLogin}) {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit = async () => {
    if (!pw) return;
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({
      email: "team@church-attendance.app",
      password: pw,
    });
    setLoading(false);
    if (error) setErr("Incorrect password.");
    else onLogin();
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1829",padding:"1rem"}}>
      <div style={{background:"#1a2744",borderRadius:16,padding:"2.5rem 2rem",width:"100%",maxWidth:380,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"#3b5bdb",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}>
            <i className="ti ti-building-church" style={{color:"#fff",fontSize:32}}/>
          </div>
          <h1 style={{color:"#fff",fontSize:22,fontWeight:700,margin:0}}>Church Attendance</h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:14,margin:"6px 0 0"}}>Sign in to continue</p>
        </div>
        <div style={{marginBottom:"1rem"}}>
          <label style={{color:"rgba(255,255,255,0.7)",fontSize:13,display:"block",marginBottom:6}}>Password</label>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter password"
            style={{width:"100%",padding:"11px 14px",borderRadius:8,border:`1px solid ${err?"#e24b4a":"rgba(255,255,255,0.15)"}`,background:"rgba(255,255,255,0.07)",color:"#fff",fontSize:15}}/>
          {err && <p style={{color:"#e24b4a",fontSize:12,margin:"6px 0 0"}}>{err}</p>}
        </div>
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:"12px",borderRadius:8,background:"#3b5bdb",border:"none",color:"#fff",fontWeight:600,fontSize:15,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({groups,classes,sessions,records,setPage}) {
  const todaySunday = sunday(0);
  const [weekAnchor,setWeekAnchor] = useState(todaySunday);
  const ws = weekStartFromDate(weekAnchor);
  const we = weekEndFromDate(weekAnchor);
  const thisSessions = sessions.filter(s => { const d=new Date(s.date+"T12:00:00"); return d>=ws&&d<=we; });
  const sortedGroups  = useMemo(() => [...groups].sort((a,b)=>a.order-b.order),  [groups]);
  const sortedClasses = useMemo(() => [...classes].sort((a,b)=>a.order-b.order), [classes]);
  const classStats = sortedClasses.map(cl => {
    const sess=thisSessions.filter(s=>s.classId===cl.id);
    const sessIds=sess.map(s=>s.id);
    const members=records.filter(r=>sessIds.includes(r.sessionId)&&r.present).length;
    const visitors=sess.reduce((a,s)=>a+(s.visitors||0),0);
    return {classId:cl.id,classNm:cl.name,groupId:cl.groupId,members,visitors,total:members+visitors};
  });
  const groupStats = sortedGroups.map(g => {
    const gClasses=classStats.filter(cs=>cs.groupId===g.id);
    const gSessIds=sessions.filter(s=>{ const d=new Date(s.date+"T12:00:00"); return gClasses.find(c=>c.classId===s.classId)&&d>=ws&&d<=we; }).map(s=>s.id);
    const unique=new Set(records.filter(r=>gSessIds.includes(r.sessionId)&&r.present).map(r=>r.personId));
    const visitors=gClasses.reduce((a,c)=>a+c.visitors,0);
    return {...g,members:unique.size,visitors,total:unique.size+visitors};
  });
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem",flexWrap:"wrap",gap:10}}>
        <h2 style={{fontSize:22,fontWeight:700,margin:0,color:"var(--color-text-primary)"}}>Dashboard</h2>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Week of</span>
          <input type="date" value={weekAnchor} onChange={e=>setWeekAnchor(e.target.value)}
            style={{padding:"6px 10px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13,cursor:"pointer"}}/>
          {weekAnchor!==todaySunday && <button onClick={()=>setWeekAnchor(todaySunday)} style={{padding:"6px 10px",fontSize:12,border:"1px solid var(--color-border-tertiary)",borderRadius:6,background:"var(--color-background-secondary)",cursor:"pointer",color:"var(--color-text-primary)"}}>This week</button>}
        </div>
      </div>
      <p style={{color:"var(--color-text-secondary)",fontSize:13,margin:"0 0 1.5rem"}}>
        {ws.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – {we.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
      </p>
      <h3 style={{fontSize:15,fontWeight:600,marginBottom:"0.75rem",color:"var(--color-text-primary)"}}>By Group</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:"2rem"}}>
        {groupStats.map(g => <StatCard key={g.id} label={g.name} total={g.total} members={g.members} visitors={g.visitors} groupId={g.id} groups={sortedGroups}/>)}
      </div>
      <h3 style={{fontSize:15,fontWeight:600,marginBottom:"0.75rem",color:"var(--color-text-primary)"}}>By Class</h3>
      <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,overflow:"hidden"}}>
        {classStats.every(cs=>cs.total===0) ? <Empty msg="No attendance recorded for this week"/> : classStats.filter(cs=>cs.total>0).map((cs,i,arr) => {
          const pal=getGroupPalette(cs.groupId,sortedGroups);
          return (
            <div key={cs.classId} style={{display:"flex",alignItems:"center",padding:"0.85rem 1.25rem",borderBottom:i<arr.length-1?"1px solid var(--color-border-tertiary)":"none",gap:12}}>
              <div style={{width:4,height:32,borderRadius:4,background:pal.accent,flexShrink:0}}/>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontWeight:500,fontSize:14,color:"var(--color-text-primary)"}}>{cs.classNm}</span>
                <GroupBadge groupId={cs.groupId} groups={sortedGroups} label={sortedGroups.find(g=>g.id===cs.groupId)?.name}/>
              </div>
              <div style={{display:"flex",gap:16,fontSize:13}}>
                <span><strong style={{color:"var(--color-text-primary)"}}>{cs.members}</strong> <span style={{color:"var(--color-text-secondary)"}}>mbr</span></span>
                <span><strong style={{color:pal.accent}}>{cs.visitors}</strong> <span style={{color:"var(--color-text-secondary)"}}>vis</span></span>
                <strong style={{color:"var(--color-text-primary)",minWidth:24,textAlign:"right"}}>{cs.total}</strong>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:"2rem",display:"flex",gap:12,flexWrap:"wrap"}}>
        <button onClick={()=>setPage("attendance")} style={{padding:"10px 20px",background:"#3b5bdb",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>
          <i className="ti ti-clipboard-check" style={{marginRight:6}}/>Take Attendance
        </button>
        <button onClick={()=>setPage("history")} style={{padding:"10px 20px",background:"var(--color-background-secondary)",color:"var(--color-text-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:8,cursor:"pointer",fontSize:14}}>
          <i className="ti ti-history" style={{marginRight:6}}/>View History
        </button>
      </div>
    </div>
  );
}

// ─── Attendance Page ──────────────────────────────────────────────────────────
function AttendancePage({groups,classes,people,sessions,setSessions,records,setRecords}) {
  const [selClass,setSelClass] = useState(() => [...classes].sort((a,b)=>a.order-b.order)[0]?.id || "");
  const [selDate, setSelDate]  = useState(fmt(new Date()));
  const [visitors,setVisitors] = useState(0);
  const [saved,   setSaved]    = useState(false);
  const [saving,  setSaving]   = useState(false);
  const sortedGroups  = useMemo(() => [...groups].sort((a,b)=>a.order-b.order),  [groups]);
  const sortedClasses = useMemo(() => [...classes].sort((a,b)=>a.order-b.order), [classes]);
  const cls = sortedClasses.find(c=>c.id===selClass);
  const grp = cls ? sortedGroups.find(g=>g.id===cls.groupId) : null;
  const pal = cls ? getGroupPalette(cls.groupId, sortedGroups) : null;

  const classMembers = useMemo(() => {
    const members = people.filter(p=>p.classIds?.includes(selClass));
    const heads   = members.filter(p=>p.householdRole==="head"||!p.householdId).sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
    const nonHeads= members.filter(p=>p.householdRole!=="head"&&p.householdId);
    const result=[]; const usedIds=new Set();
    heads.forEach(h => {
      result.push({...h,_isHead:true}); usedIds.add(h.id);
      nonHeads.filter(p=>p.householdId===h.householdId).sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).forEach(m => { result.push({...m,_isHead:false}); usedIds.add(m.id); });
    });
    nonHeads.filter(p=>!usedIds.has(p.id)).sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).forEach(p=>result.push({...p,_isHead:false}));
    return result;
  }, [people, selClass]);

  const session = sessions.find(s=>s.classId===selClass&&s.date===selDate);
  const sessionRecords = session ? records.filter(r=>r.sessionId===session.id) : [];
  const isPresent = (pid) => { if(!session) return false; const r=sessionRecords.find(r=>r.personId===pid); return r?r.present:false; };
  const presentCount = sessionRecords.filter(r=>r.present).length;
  const curVisitors  = session?.visitors||0;
  const flash = () => { setSaved(true); setTimeout(()=>setSaved(false),1500); };

  useEffect(() => { setVisitors(session?.visitors||0); }, [selClass,selDate,sessions]);

  const ensureSession = useCallback(async () => {
    let s = sessions.find(s=>s.classId===selClass&&s.date===selDate);
    if (!s) {
      const newS = { id:uid(), class_id:selClass, date:selDate, visitors:0 };
      const { data } = await supabase.from("sessions").upsert(newS).select().single();
      s = mapSession(data);
      setSessions(prev=>[...prev, s]);
    }
    return s;
  }, [selClass, selDate, sessions, setSessions]);

  const toggle = async (pid) => {
    setSaving(true);
    const s = await ensureSession();
    const ex = records.find(r=>r.sessionId===s.id&&r.personId===pid);
    const newPresent = ex ? !ex.present : true;
    const row = { id: ex?.id||uid(), session_id:s.id, person_id:pid, present:newPresent };
    await supabase.from("records").upsert(row);
    if (ex) setRecords(prev=>prev.map(r=>r.id===ex.id?{...r,present:newPresent}:r));
    else    setRecords(prev=>[...prev,{id:row.id,sessionId:s.id,personId:pid,present:true}]);
    setSaving(false); flash();
  };

  const updateVisitors = async (v) => {
    const s = await ensureSession();
    await supabase.from("sessions").update({visitors:v}).eq("id",s.id);
    setSessions(prev=>prev.map(x=>x.id===s.id?{...x,visitors:v}:x));
    setVisitors(v); flash();
  };

  const markAll = async (present) => {
    setSaving(true);
    const s = await ensureSession();
    const rows = classMembers.map(p => ({ id: records.find(r=>r.sessionId===s.id&&r.personId===p.id)?.id||uid(), session_id:s.id, person_id:p.id, present }));
    await supabase.from("records").upsert(rows);
    setRecords(prev => {
      const updated = [...prev];
      rows.forEach(row => { const idx=updated.findIndex(r=>r.sessionId===s.id&&r.personId===row.person_id); if(idx>=0) updated[idx]={...updated[idx],present}; else updated.push({id:row.id,sessionId:s.id,personId:row.person_id,present}); });
      return updated;
    });
    setSaving(false); flash();
  };

  return (
    <div>
      <PageHeader title="Take Attendance"/>
      <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,padding:"1.25rem",marginBottom:"1.25rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:"1rem"}}>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Date</label>
            <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}
              style={{width:"100%",padding:"9px 12px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14}}/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Class</label>
            <select value={selClass} onChange={e=>setSelClass(e.target.value)}
              style={{width:"100%",padding:"9px 12px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14}}>
              {sortedGroups.map(g=>(
                <optgroup key={g.id} label={g.name}>
                  {sortedClasses.filter(c=>c.groupId===g.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        {pal && cls && (
          <div style={{background:pal.header,border:`1px solid ${pal.border}`,borderRadius:8,padding:"8px 12px",marginBottom:"0.75rem",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:pal.accent}}/>
            <span style={{fontSize:13,fontWeight:600,color:pal.text}}>{cls.name}</span>
            {grp && <span style={{fontSize:12,color:pal.text,opacity:0.7}}>— {grp.name}</span>}
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <label style={{fontSize:13,color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>Visitors:</label>
            <input type="number" min={0} value={visitors} onChange={e=>updateVisitors(Math.max(0,parseInt(e.target.value)||0))}
              style={{width:70,padding:"7px 10px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14,textAlign:"center"}}/>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center"}}>
            {saving && <span style={{fontSize:13,color:"#8896b0"}}>Saving…</span>}
            {saved  && <span style={{fontSize:13,color:"#0c8c6e",fontWeight:600}}>✓ Saved</span>}
            <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{presentCount} present · {curVisitors} visitors</span>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:"1rem",alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:14,color:"var(--color-text-secondary)"}}>{classMembers.length} members</span>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>markAll(true)}  style={{padding:"6px 12px",fontSize:12,border:"1px solid var(--color-border-tertiary)",borderRadius:6,background:"var(--color-background-secondary)",cursor:"pointer",color:"var(--color-text-primary)"}}>Mark All Present</button>
          <button onClick={()=>markAll(false)} style={{padding:"6px 12px",fontSize:12,border:"1px solid var(--color-border-tertiary)",borderRadius:6,background:"var(--color-background-secondary)",cursor:"pointer",color:"var(--color-text-primary)"}}>Clear All</button>
        </div>
      </div>
      {classMembers.length===0 ? <Empty msg="No members assigned to this class"/> : (
        <div style={{display:"flex",flexDirection:"column",gap:3}}>
          {classMembers.map((person,i) => {
            const present=isPresent(person.id);
            const isHead=person._isHead||((!person.householdId));
            // Heads: darker blue bg; non-heads: white; present: green tint
            const bg = present ? "rgba(12,140,110,0.08)" : isHead ? "#f4f8ff" : "#ffffff";
            const borderColor = present ? "#a7dfcc" : isHead ? "#dce8fa" : "#eef2f8";
            return (
              <div key={person.id} onClick={()=>toggle(person.id)} style={{display:"flex",alignItems:"center",padding:isHead?"0.9rem 1.25rem":"0.7rem 1.25rem 0.7rem 2.5rem",cursor:saving?"not-allowed":"pointer",gap:14,borderRadius:10,border:`2px solid ${borderColor}`,background:bg,transition:"background 0.15s"}}>
                <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,background:present?"#0c8c6e":isHead?"#c7d8f0":"#e8edf5",display:"flex",alignItems:"center",justifyContent:"center",color:present?"#fff":isHead?"#185fa5":"#6b7a96",fontSize:13,fontWeight:700}}>
                  {initials(person)}
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontWeight:isHead?600:500,fontSize:isHead?15:14,color:"var(--color-text-primary)"}}>{fullName(person)}</p>
                  {!isHead && <p style={{margin:0,fontSize:11,color:"#8896b0"}}>{person.householdRole==="spouse"?"Spouse":"Child"}</p>}
                  {person.phone && <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{person.phone}</p>}
                </div>
                <div style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${present?"#0c8c6e":"#b0bfd6"}`,background:present?"#0c8c6e":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {present && <i className="ti ti-check" style={{color:"#fff",fontSize:14}}/>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── People Page ──────────────────────────────────────────────────────────────
function PeoplePage({groups,classes,people,setPeople,sessions,records,setRecords,deletedNames,setDeletedNames}) {
  const [search,setSearch]=useState(""); const [modal,setModal]=useState(null);
  const [delConfirm,setDelConfirm]=useState(null); const [viewPerson,setViewPerson]=useState(null);
  const sorted = useMemo(() => [...people].sort((a,b)=>sortKey(a).localeCompare(sortKey(b))), [people]);
  const filtered = sorted.filter(p => fullName(p).toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()) || (p.lastName||"").toLowerCase().includes(search.toLowerCase()));
  const households = useMemo(() => {
    const map={};
    filtered.forEach(p => { const hid=p.householdId||p.id; if(!map[hid]) map[hid]=[]; map[hid].push(p); });
    Object.values(map).forEach(arr => arr.sort((a,b) => { const aR=a.householdRole==="head"?0:a.householdRole==="spouse"?1:2; const bR=b.householdRole==="head"?0:b.householdRole==="spouse"?1:2; return aR!==bR?aR-bR:sortKey(a).localeCompare(sortKey(b)); }));
    return Object.entries(map).sort(([,a],[,b]) => { const ah=a.find(p=>p.householdRole==="head")||a[0]; const bh=b.find(p=>p.householdRole==="head")||b[0]; return sortKey(ah).localeCompare(sortKey(bh)); }).map(([hid,members])=>({hid,members}));
  }, [filtered]);

  const savePerson = async (f) => {
    const row = { id:f.id||uid(), first_name:f.firstName||"", last_name:f.lastName||"", phone:f.phone||"", email:f.email||"", address:f.address||"", notes:f.notes||"", household_id:f.householdId||"", household_role:f.householdRole||"head", class_ids:f.classIds||[] };
    await supabase.from("people").upsert(row);
    const mapped = mapPerson(row);
    if (modal.mode==="add") setPeople(prev=>[...prev,mapped]);
    else setPeople(prev=>prev.map(x=>x.id===mapped.id?mapped:x));
    setModal(null);
  };
  const del = async (id) => {
    const p=people.find(x=>x.id===id);
    if (p) {
      const name=fullName(p);
      await supabase.from("deleted_names").upsert({person_id:id,display_name:name});
      setDeletedNames(prev=>({...prev,[id]:name}));
    }
    await supabase.from("people").delete().eq("id",id);
    setPeople(prev=>prev.filter(x=>x.id!==id));
    setDelConfirm(null);
  };

  return (
    <div>
      <PageHeader title="People" actions={
        <button onClick={()=>setModal({mode:"add",person:{firstName:"",lastName:"",phone:"",email:"",address:"",notes:"",classIds:[],householdId:"",householdRole:"head"}})}
          style={{padding:"9px 18px",background:"#3b5bdb",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",gap:6}}>
          <i className="ti ti-plus"/>Add Person
        </button>
      }/>
      <div style={{position:"relative",marginBottom:"1rem"}}>
        <i className="ti ti-search" style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--color-text-tertiary)",fontSize:16}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{width:"100%",padding:"9px 12px 9px 36px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:14}}/>
      </div>
      {households.length===0 ? <Empty msg="No people found"/> : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {households.map(({hid,members}) => (
            <div key={hid} style={{background:"#f4f8ff",border:"2px solid #dce8fa",borderRadius:12,overflow:"hidden"}}>
              {members.map((p,mi) => {
                const isHead=p.householdRole==="head"||members.length===1;
                const assignedClasses=[...classes].filter(c=>p.classIds?.includes(c.id)).sort((a,b)=>{const go=groups.findIndex(g=>g.id===a.groupId)-groups.findIndex(g=>g.id===b.groupId);return go!==0?go:a.order-b.order;});
                return (
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:isHead?"0.9rem 1.25rem":"0.7rem 1.25rem 0.7rem 2.75rem",borderTop:mi>0?"1px solid #dce8fa":"none",background:isHead?"#f4f8ff":"#fff"}}>
                    <button onClick={()=>setViewPerson(p)} style={{width:isHead?44:36,height:isHead?44:36,borderRadius:"50%",background:"#c7d8f0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#185fa5",fontWeight:700,fontSize:isHead?14:12,border:"none",cursor:"pointer"}}>
                      {initials(p)}
                    </button>
                    <div style={{flex:1,minWidth:0}}>
                      <button onClick={()=>setViewPerson(p)} style={{background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left",display:"block"}}>
                        <span style={{fontWeight:isHead?600:500,fontSize:isHead?15:14,color:"var(--color-text-primary)"}}>{fullName(p)}</span>
                        {!isHead && <span style={{marginLeft:6,fontSize:11,color:"#8896b0"}}>{p.householdRole==="spouse"?"Spouse":"Child"}</span>}
                      </button>
                      <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.phone}{p.email?` · ${p.email}`:""}</p>
                      {assignedClasses.length>0 && (
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3}}>
                          {assignedClasses.map(c=><GroupBadge key={c.id} groupId={c.groupId} groups={groups} label={c.name}/>)}
                        </div>
                      )}
                    </div>
                    <div style={{display:"flex",gap:5,flexShrink:0}}>
                      <button onClick={()=>setViewPerson(p)} style={{padding:"7px",background:"white",border:"1px solid #dde3ee",borderRadius:6,cursor:"pointer",color:"#3b5bdb"}}><i className="ti ti-chart-bar" style={{fontSize:14}}/></button>
                      <button onClick={()=>setModal({mode:"edit",person:{...p}})} style={{padding:"7px",background:"white",border:"1px solid #dde3ee",borderRadius:6,cursor:"pointer",color:"#666"}}><i className="ti ti-edit" style={{fontSize:14}}/></button>
                      <button onClick={()=>setDelConfirm(p.id)} style={{padding:"7px",background:"#fcebeb",border:"1px solid #f7c1c1",borderRadius:6,cursor:"pointer",color:"#a32d2d"}}><i className="ti ti-trash" style={{fontSize:14}}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {modal && <PersonModal person={modal.person} mode={modal.mode} classes={classes} groups={groups} people={people} onSave={savePerson} onClose={()=>setModal(null)}/>}
      {delConfirm && <Confirm msg={`Remove ${fullName(people.find(p=>p.id===delConfirm))} from the people list? Their attendance history will be preserved.`} confirmLabel="Remove" onConfirm={()=>del(delConfirm)} onClose={()=>setDelConfirm(null)}/>}
      {viewPerson && <PersonAttendanceModal person={viewPerson} classes={classes} groups={groups} sessions={sessions} records={records} setRecords={setRecords} deletedNames={deletedNames} onClose={()=>setViewPerson(null)}/>}
    </div>
  );
}

function PersonAttendanceModal({person,classes,groups,sessions,records,setRecords,deletedNames,onClose}) {
  const personRecords=records.filter(r=>r.personId===person.id&&r.present);
  const attendedSessionIds=personRecords.map(r=>r.sessionId);
  const relevantSessions=sessions.filter(s=>attendedSessionIds.includes(s.id)).sort((a,b)=>b.date.localeCompare(a.date));
  const [delHist,setDelHist]=useState(null);
  const totalAttended=relevantSessions.length;
  const allSessions=sessions.filter(s=>(person.classIds||[]).some(cid=>s.classId===cid)).length;
  const pct=allSessions>0?Math.round((totalAttended/allSessions)*100):0;
  const deleteRecord = async (sessionId) => {
    await supabase.from("records").delete().eq("session_id",sessionId).eq("person_id",person.id);
    setRecords(prev=>prev.filter(r=>!(r.sessionId===sessionId&&r.personId===person.id)));
    setDelHist(null);
  };
  return (
    <Modal title={`${fullName(person)} — Attendance`} onClose={onClose}>
      <div style={{display:"grid",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[["Sessions",totalAttended,"#3b5bdb"],["Present",totalAttended,"#0c8c6e"],["Rate",`${pct}%`,pct>=75?"#0c8c6e":pct>=50?"#854f0b":"#993c1d"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{background:"#f4f7fe",borderRadius:10,padding:"0.75rem",textAlign:"center"}}>
              <p style={{margin:0,fontSize:22,fontWeight:700,color:col}}>{val}</p>
              <p style={{margin:0,fontSize:11,color:"#6b7a96",fontWeight:500}}>{lbl}</p>
            </div>
          ))}
        </div>
        <div>
          <p style={{margin:"0 0 8px",fontSize:12,fontWeight:600,color:"#6b7a96"}}>ATTENDANCE HISTORY (present only)</p>
          {relevantSessions.length===0 ? <p style={{fontSize:13,color:"#8896b0",margin:0}}>No attendance recorded yet.</p> : (
            <div style={{borderRadius:10,overflow:"hidden",border:"1px solid #e4ecfb"}}>
              {relevantSessions.map((s,i) => {
                const cls=classes.find(c=>c.id===s.classId);
                const pal=cls?getGroupPalette(cls.groupId,groups):null;
                return (
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"0.7rem 1rem",borderBottom:i<relevantSessions.length-1?"1px solid #e4ecfb":"none",background:i%2===0?"#f8faff":"#fff"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#0c8c6e",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <span style={{fontSize:13,fontWeight:500,color:"#1a2744"}}>{cls?.name||"—"}</span>
                      {pal && <span style={{marginLeft:6,fontSize:11,padding:"1px 6px",background:pal.bg,color:pal.text,borderRadius:4,border:`1px solid ${pal.border}`}}>{groups.find(g=>g.id===cls?.groupId)?.name}</span>}
                    </div>
                    <span style={{fontSize:12,color:"#8896b0"}}>{isoToDisplay(s.date)}</span>
                    <button onClick={()=>setDelHist(s.id)} style={{padding:"4px",background:"transparent",border:"none",cursor:"pointer"}}><i className="ti ti-trash" style={{fontSize:13,color:"#e24b4a"}}/></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={onClose} style={{padding:"9px 20px",background:"#3b5bdb",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>Close</button></div>
      </div>
      {delHist && <Confirm msg="Delete this attendance record?" onConfirm={()=>deleteRecord(delHist)} onClose={()=>setDelHist(null)}/>}
    </Modal>
  );
}

function PersonModal({person,mode,classes,groups,people,onSave,onClose}) {
  const [f,setF]=useState(person);
  const upd=(k,v)=>setF(prev=>({...prev,[k]:v}));
  const toggleClass=(cid)=>setF(prev=>({...prev,classIds:prev.classIds?.includes(cid)?prev.classIds.filter(x=>x!==cid):[...(prev.classIds||[]),cid]}));
  const inp={width:"100%",padding:"8px 10px",border:"1px solid #dde3ee",borderRadius:6,background:"#f8faff",color:"#1a2744",fontSize:14};
  const lbl={fontSize:12,fontWeight:500,color:"#6b7a96",display:"block",marginBottom:3};
  const existingHeads=people.filter(p=>p.householdRole==="head"&&p.id!==f.id).sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
  return (
    <Modal title={mode==="add"?"Add Person":"Edit Person"} onClose={onClose} maxWidth={520}>
      <div style={{display:"grid",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={lbl}>First Name *</label><input value={f.firstName||""} onChange={e=>upd("firstName",e.target.value)} style={inp} placeholder="First"/></div>
          <div><label style={lbl}>Last Name *</label><input value={f.lastName||""} onChange={e=>upd("lastName",e.target.value)} style={inp} placeholder="Last"/></div>
        </div>
        {[["phone","Phone"],["email","Email"],["address","Address"],["notes","Notes"]].map(([k,lb])=>(
          <div key={k}><label style={lbl}>{lb}</label>
            {k==="notes"?<textarea value={f[k]||""} onChange={e=>upd(k,e.target.value)} rows={2} style={{...inp,resize:"vertical"}}/>:<input value={f[k]||""} onChange={e=>upd(k,e.target.value)} style={inp}/>}
          </div>
        ))}
        <div style={{borderTop:"1px solid #e8edf5",paddingTop:10}}>
          <p style={{margin:"0 0 8px",fontSize:13,fontWeight:600,color:"#1a2744"}}>Household</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={lbl}>Role</label>
              <select value={f.householdRole||"head"} onChange={e=>upd("householdRole",e.target.value)} style={{...inp,background:"#f8faff"}}>
                <option value="head">Head of Household</option><option value="spouse">Spouse</option><option value="child">Child</option><option value="other">Other</option>
              </select>
            </div>
            <div><label style={lbl}>{f.householdRole==="head"?"Household ID (auto if blank)":"Link to Head"}</label>
              {f.householdRole==="head"
                ? <input value={f.householdId||""} onChange={e=>upd("householdId",e.target.value)} placeholder="e.g. h-smith" style={inp}/>
                : <select value={f.householdId||""} onChange={e=>upd("householdId",e.target.value)} style={{...inp,background:"#f8faff"}}>
                    <option value="">— Select head —</option>
                    {existingHeads.map(h=><option key={h.id} value={h.householdId||h.id}>{fullName(h)}</option>)}
                  </select>
              }
            </div>
          </div>
        </div>
        <div style={{borderTop:"1px solid #e8edf5",paddingTop:10}}>
          <label style={{...lbl,marginBottom:8}}>Assigned Classes</label>
          {[...groups].sort((a,b)=>a.order-b.order).map(g=>{
            const pal=getGroupPalette(g.id,groups);
            return (
              <div key={g.id} style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{width:8,height:8,borderRadius:"50%",background:pal.accent}}/><p style={{fontSize:12,color:pal.text,margin:0,fontWeight:600}}>{g.name}</p></div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingLeft:14}}>
                  {[...classes].filter(c=>c.groupId===g.id).sort((a,b)=>a.order-b.order).map(c=>(
                    <button key={c.id} onClick={()=>toggleClass(c.id)} style={{padding:"4px 12px",fontSize:12,borderRadius:6,cursor:"pointer",border:"1px solid",background:f.classIds?.includes(c.id)?pal.accent:pal.bg,color:f.classIds?.includes(c.id)?"#fff":pal.text,borderColor:f.classIds?.includes(c.id)?pal.accent:pal.border}}>{c.name}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
          <button onClick={onClose} style={{padding:"9px 18px",border:"1px solid #dde3ee",background:"#f4f7fe",borderRadius:8,cursor:"pointer",color:"#1a2744",fontSize:14}}>Cancel</button>
          <button onClick={()=>(f.firstName||f.lastName)?onSave({...f,householdId:f.householdId||(f.householdRole==="head"?uid():""),id:f.id||uid()}):null}
            style={{padding:"9px 18px",background:"#3b5bdb",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Groups Page ──────────────────────────────────────────────────────────────
function GroupsPage({groups,setGroups,classes,setClasses,people,setPeople}) {
  const [editItem,setEditItem]=useState(null); const [addMode,setAddMode]=useState(null);
  const [addName,setAddName]=useState(""); const [addGroupId,setAddGroupId]=useState("");
  const [delConfirm,setDelConfirm]=useState(null); const [dragging,setDragging]=useState(null); const [dragOver,setDragOver]=useState(null);
  const sortedGroups  = useMemo(()=>[...groups].sort((a,b)=>a.order-b.order),[groups]);
  const sortedClasses = useMemo(()=>[...classes].sort((a,b)=>a.order-b.order),[classes]);

  const saveEdit = async () => {
    if (!editItem) return;
    if (editItem.type==="group") { await supabase.from("groups").update({name:editItem.name}).eq("id",editItem.id); setGroups(prev=>prev.map(g=>g.id===editItem.id?{...g,name:editItem.name}:g)); }
    else { await supabase.from("classes").update({name:editItem.name}).eq("id",editItem.id); setClasses(prev=>prev.map(c=>c.id===editItem.id?{...c,name:editItem.name}:c)); }
    setEditItem(null);
  };
  const addNew = async () => {
    if (!addName.trim()) return;
    if (addMode==="group") {
      const row={id:uid(),name:addName.trim(),order:groups.length};
      await supabase.from("groups").insert(row);
      setGroups(prev=>[...prev,{id:row.id,name:row.name,order:row.order}]);
    } else {
      const gid=addGroupId||sortedGroups[0]?.id;
      const row={id:uid(),name:addName.trim(),group_id:gid,order:classes.filter(c=>c.groupId===gid).length};
      await supabase.from("classes").insert(row);
      setClasses(prev=>[...prev,{id:row.id,name:row.name,groupId:gid,order:row.order}]);
    }
    setAddName(""); setAddMode(null);
  };
  const delGroup = async (gid) => {
    await supabase.from("groups").delete().eq("id",gid);
    const cids=classes.filter(c=>c.groupId===gid).map(c=>c.id);
    setClasses(prev=>prev.filter(c=>c.groupId!==gid));
    setPeople(prev=>prev.map(p=>({...p,classIds:p.classIds?.filter(ci=>!cids.includes(ci))||[]})));
    setGroups(prev=>prev.filter(g=>g.id!==gid)); setDelConfirm(null);
  };
  const delClass = async (cid) => {
    await supabase.from("classes").delete().eq("id",cid);
    setPeople(prev=>prev.map(p=>({...p,classIds:p.classIds?.filter(ci=>ci!==cid)||[]})));
    setClasses(prev=>prev.filter(c=>c.id!==cid)); setDelConfirm(null);
  };
  const moveGroup = async (id, dir) => {
    const arr=[...sortedGroups]; const idx=arr.findIndex(g=>g.id===id); const swapIdx=idx+dir;
    if (swapIdx<0||swapIdx>=arr.length) return;
    const updates=[{id:arr[idx].id,order:arr[swapIdx].order},{id:arr[swapIdx].id,order:arr[idx].order}];
    await Promise.all(updates.map(u=>supabase.from("groups").update({order:u.order}).eq("id",u.id)));
    setGroups(prev=>prev.map(g=>{const u=updates.find(x=>x.id===g.id); return u?{...g,order:u.order}:g;}));
  };
  const moveClass = async (id, dir) => {
    const cls=classes.find(c=>c.id===id); if(!cls) return;
    const siblings=[...sortedClasses].filter(c=>c.groupId===cls.groupId);
    const idx=siblings.findIndex(c=>c.id===id); const swapIdx=idx+dir;
    if (swapIdx<0||swapIdx>=siblings.length) return;
    const updates=[{id:siblings[idx].id,order:siblings[swapIdx].order},{id:siblings[swapIdx].id,order:siblings[idx].order}];
    await Promise.all(updates.map(u=>supabase.from("classes").update({order:u.order}).eq("id",u.id)));
    setClasses(prev=>prev.map(c=>{const u=updates.find(x=>x.id===c.id); return u?{...c,order:u.order}:c;}));
  };
  const onGroupDrop = async (e, targetId) => {
    e.preventDefault(); if(!dragging||dragging.type!=="group"||dragging.id===targetId){setDragging(null);setDragOver(null);return;}
    const arr=[...sortedGroups]; const fromIdx=arr.findIndex(g=>g.id===dragging.id); const toIdx=arr.findIndex(g=>g.id===targetId);
    const item=arr.splice(fromIdx,1)[0]; arr.splice(toIdx,0,item);
    const updates=arr.map((g,i)=>({id:g.id,order:i}));
    await Promise.all(updates.map(u=>supabase.from("groups").update({order:u.order}).eq("id",u.id)));
    setGroups(prev=>prev.map(g=>{const u=updates.find(x=>x.id===g.id); return u?{...g,order:u.order}:g;}));
    setDragging(null); setDragOver(null);
  };
  const onClassDrop = async (e, targetId, groupId) => {
    e.preventDefault(); if(!dragging||dragging.type!=="class"||dragging.id===targetId||dragging.groupId!==groupId){setDragging(null);setDragOver(null);return;}
    const siblings=[...sortedClasses].filter(c=>c.groupId===groupId);
    const fromIdx=siblings.findIndex(c=>c.id===dragging.id); const toIdx=siblings.findIndex(c=>c.id===targetId);
    const item=siblings.splice(fromIdx,1)[0]; siblings.splice(toIdx,0,item);
    const updates=siblings.map((c,i)=>({id:c.id,order:i}));
    await Promise.all(updates.map(u=>supabase.from("classes").update({order:u.order}).eq("id",u.id)));
    setClasses(prev=>prev.map(c=>{const u=updates.find(x=>x.id===c.id); return u?{...c,order:u.order}:c;}));
    setDragging(null); setDragOver(null);
  };
  const btnArrow=(onClick,icon,disabled)=>(
    <button onClick={onClick} disabled={disabled} style={{padding:"4px 5px",background:"transparent",border:"none",cursor:disabled?"default":"pointer",color:"#8896b0",opacity:disabled?0.25:0.7,fontSize:13,lineHeight:1}}>
      <i className={`ti ${icon}`}/>
    </button>
  );
  return (
    <div>
      <PageHeader title="Groups & Classes" actions={<>
        <button onClick={()=>{setAddMode("class");setAddGroupId(sortedGroups[0]?.id||"");}} style={{padding:"9px 14px",background:"var(--color-background-secondary)",border:"1px solid var(--color-border-tertiary)",borderRadius:8,cursor:"pointer",fontSize:14,color:"var(--color-text-primary)"}}>+ Class</button>
        <button onClick={()=>setAddMode("group")} style={{padding:"9px 14px",background:"#3b5bdb",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>+ Group</button>
      </>}/>
      <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"-0.5rem 0 1rem"}}>Drag or use ↑↓ to reorder. Order is reflected everywhere.</p>
      {addMode && (
        <div style={{background:"var(--color-background-primary)",border:"1px solid #3b5bdb",borderRadius:12,padding:"1.25rem",marginBottom:"1rem"}}>
          <p style={{margin:"0 0 10px",fontWeight:600,fontSize:14,color:"var(--color-text-primary)"}}>New {addMode==="group"?"Group":"Class"}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input value={addName} onChange={e=>setAddName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNew()} placeholder="Name" style={{flex:1,minWidth:160,padding:"8px 12px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14}}/>
            {addMode==="class" && <select value={addGroupId} onChange={e=>setAddGroupId(e.target.value)} style={{padding:"8px 12px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-secondary)",color:"var(--color-text-primary)",fontSize:14}}>{sortedGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>}
            <button onClick={addNew} style={{padding:"8px 16px",background:"#3b5bdb",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>Add</button>
            <button onClick={()=>{setAddMode(null);setAddName("");}} style={{padding:"8px 12px",border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",borderRadius:8,cursor:"pointer",color:"var(--color-text-primary)"}}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{display:"grid",gap:14}}>
        {sortedGroups.map((g,gi) => {
          const pal=getGroupPalette(g.id,groups);
          const groupClasses=sortedClasses.filter(c=>c.groupId===g.id);
          const isDragTarget=dragOver?.type==="group"&&dragOver?.id===g.id;
          return (
            <div key={g.id} draggable onDragStart={e=>{setDragging({type:"group",id:g.id});e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.preventDefault();setDragOver({type:"group",id:g.id});}} onDragLeave={()=>setDragOver(null)} onDrop={e=>onGroupDrop(e,g.id)}
              style={{borderRadius:12,overflow:"hidden",border:`1.5px solid ${isDragTarget?"#3b5bdb":pal.border}`,opacity:dragging?.id===g.id?0.5:1,transition:"opacity 0.15s,border-color 0.15s",cursor:"grab"}}>
              <div style={{padding:"0.9rem 1.25rem",background:pal.header,borderBottom:`2px solid ${pal.border}`,display:"flex",alignItems:"center",gap:8}}>
                <i className="ti ti-grip-vertical" style={{fontSize:16,color:pal.text,opacity:0.4,cursor:"grab",flexShrink:0}}/>
                <div style={{width:28,height:28,borderRadius:8,background:pal.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><i className="ti ti-layout-list" style={{fontSize:14,color:"#fff"}}/></div>
                {editItem?.id===g.id ? <input value={editItem.name} onChange={e=>setEditItem({...editItem,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&saveEdit()} autoFocus style={{flex:1,padding:"4px 8px",border:`1px solid ${pal.border}`,borderRadius:6,background:"#fff",color:"#1a2744",fontSize:14}}/>
                  : <span style={{flex:1,fontWeight:700,fontSize:15,color:pal.text}}>{g.name}</span>}
                <span style={{fontSize:12,color:pal.text,opacity:0.7,background:pal.bg,padding:"2px 8px",borderRadius:4,border:`1px solid ${pal.border}`,flexShrink:0}}>{groupClasses.length} classes</span>
                <div style={{display:"flex",flexDirection:"column",gap:0}}>{btnArrow(e=>{e.stopPropagation();moveGroup(g.id,-1);},"ti-chevron-up",gi===0)}{btnArrow(e=>{e.stopPropagation();moveGroup(g.id,+1);},"ti-chevron-down",gi===sortedGroups.length-1)}</div>
                {editItem?.id===g.id ? <button onClick={saveEdit} style={{padding:"4px 10px",background:pal.accent,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>Save</button>
                  : <button onClick={e=>{e.stopPropagation();setEditItem({...g,type:"group"});}} style={{padding:"5px",background:"transparent",border:"none",cursor:"pointer",color:pal.text,opacity:0.6}}><i className="ti ti-edit" style={{fontSize:15}}/></button>}
                <button onClick={e=>{e.stopPropagation();setDelConfirm({type:"group",id:g.id,name:g.name});}} style={{padding:"5px",background:"transparent",border:"none",cursor:"pointer",color:"#e24b4a"}}><i className="ti ti-trash" style={{fontSize:15}}/></button>
              </div>
              {groupClasses.map((cls,ci) => {
                const isClassTarget=dragOver?.type==="class"&&dragOver?.id===cls.id;
                return (
                  <div key={cls.id} draggable onDragStart={e=>{e.stopPropagation();setDragging({type:"class",id:cls.id,groupId:g.id});e.dataTransfer.effectAllowed="move";}} onDragOver={e=>{e.stopPropagation();e.preventDefault();setDragOver({type:"class",id:cls.id});}} onDragLeave={e=>{e.stopPropagation();setDragOver(null);}} onDrop={e=>onClassDrop(e,cls.id,g.id)}
                    style={{padding:"0.7rem 1.25rem 0.7rem 1rem",borderTop:`1px solid ${pal.border}`,background:isClassTarget?"rgba(59,91,219,0.06)":pal.bg,display:"flex",alignItems:"center",gap:8,opacity:dragging?.id===cls.id?0.4:1,cursor:"grab"}}>
                    <i className="ti ti-grip-vertical" style={{fontSize:14,color:pal.text,opacity:0.3,cursor:"grab",flexShrink:0}}/>
                    <div style={{width:3,height:24,borderRadius:2,background:pal.accent,flexShrink:0,marginLeft:4}}/>
                    {editItem?.id===cls.id ? <input value={editItem.name} onChange={e=>setEditItem({...editItem,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&saveEdit()} autoFocus style={{flex:1,padding:"4px 8px",border:`1px solid ${pal.border}`,borderRadius:6,background:"#fff",color:"#1a2744",fontSize:14}}/>
                      : <span style={{flex:1,fontSize:14,color:pal.text,fontWeight:500}}>{cls.name}</span>}
                    <span style={{fontSize:12,color:pal.text,opacity:0.65,flexShrink:0}}>{people.filter(p=>p.classIds?.includes(cls.id)).length} members</span>
                    <div style={{display:"flex",flexDirection:"column",gap:0}}>{btnArrow(e=>{e.stopPropagation();moveClass(cls.id,-1);},"ti-chevron-up",ci===0)}{btnArrow(e=>{e.stopPropagation();moveClass(cls.id,+1);},"ti-chevron-down",ci===groupClasses.length-1)}</div>
                    {editItem?.id===cls.id ? <button onClick={saveEdit} style={{padding:"4px 10px",background:pal.accent,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>Save</button>
                      : <button onClick={e=>{e.stopPropagation();setEditItem({...cls,type:"class"});}} style={{padding:"5px",background:"transparent",border:"none",cursor:"pointer",color:pal.text,opacity:0.6}}><i className="ti ti-edit" style={{fontSize:15}}/></button>}
                    <button onClick={e=>{e.stopPropagation();setDelConfirm({type:"class",id:cls.id,name:cls.name});}} style={{padding:"5px",background:"transparent",border:"none",cursor:"pointer",color:"#e24b4a"}}><i className="ti ti-trash" style={{fontSize:15}}/></button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {delConfirm && <Confirm msg={`Delete "${delConfirm.name}"?${delConfirm.type==="group"?" This will also delete all classes in this group.":""}`} onConfirm={()=>delConfirm.type==="group"?delGroup(delConfirm.id):delClass(delConfirm.id)} onClose={()=>setDelConfirm(null)}/>}
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({groups,classes,people,sessions,setSessions,records,setRecords,deletedNames}) {
  const [filterDateFrom,setFilterDateFrom]=useState(""); const [filterDateTo,setFilterDateTo]=useState("");
  const [filterGroup,setFilterGroup]=useState(""); const [editSession,setEditSession]=useState(null); const [delConfirm,setDelConfirm]=useState(null);
  const filtersApplied=filterDateFrom||filterDateTo||filterGroup;
  const filteredSessions=useMemo(()=>{
    if (!filtersApplied) return [];
    return sessions.filter(s=>{
      if (filterDateFrom&&s.date<filterDateFrom) return false;
      if (filterDateTo&&s.date>filterDateTo) return false;
      if (filterGroup){const cls=classes.find(c=>c.id===s.classId); if(cls?.groupId!==filterGroup) return false;}
      return true;
    }).sort((a,b)=>b.date.localeCompare(a.date));
  },[sessions,filterDateFrom,filterDateTo,filterGroup,filtersApplied]);

  const sessionStats=(s)=>({members:records.filter(r=>r.sessionId===s.id&&r.present).length,visitors:s.visitors||0});

  const exportCsv = () => {
    const rows=[["Date","Class","Group","First Name","Last Name","Status","Visitors"]];
    filteredSessions.forEach(s=>{
      const cls=classes.find(c=>c.id===s.classId); const grp=groups.find(g=>g.id===cls?.groupId);
      const presentRecords=records.filter(r=>r.sessionId===s.id&&r.present);
      if (presentRecords.length===0&&(s.visitors||0)===0) { rows.push([s.date,cls?.name||"",grp?.name||"","","","No attendees",s.visitors||0]); }
      else { presentRecords.forEach((r,ri)=>{ const p=people.find(x=>x.id===r.personId); const fn=p?(p.firstName||""):(deletedNames[r.personId]?deletedNames[r.personId]+" (deleted)":"(deleted)"); const ln=p?(p.lastName||""):""; rows.push([s.date,cls?.name||"",grp?.name||"",fn,ln,"Present",ri===0?s.visitors||0:""]); }); }
    });
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n")); a.download="attendance-detail.csv"; a.click();
  };

  const toggleRecord = async (sessionId, personId) => {
    const ex=records.find(r=>r.sessionId===sessionId&&r.personId===personId);
    const newPresent=ex?!ex.present:true;
    const row={id:ex?.id||uid(),session_id:sessionId,person_id:personId,present:newPresent};
    await supabase.from("records").upsert(row);
    if(ex) setRecords(prev=>prev.map(r=>r.id===ex.id?{...r,present:newPresent}:r));
    else   setRecords(prev=>[...prev,{id:row.id,sessionId,personId,present:true}]);
  };

  const inp={width:"100%",padding:"8px 10px",border:"1px solid var(--color-border-tertiary)",borderRadius:8,background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontSize:13};
  return (
    <div>
      <PageHeader title="Attendance History" actions={filtersApplied && <button onClick={exportCsv} style={{padding:"9px 16px",background:"var(--color-background-secondary)",border:"1px solid var(--color-border-tertiary)",borderRadius:8,cursor:"pointer",fontSize:14,color:"var(--color-text-primary)",display:"flex",alignItems:"center",gap:6}}><i className="ti ti-download" style={{fontSize:15}}/>Export CSV</button>}/>
      <div style={{background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1rem"}}>
        <p style={{margin:"0 0 10px",fontSize:13,fontWeight:600,color:"var(--color-text-secondary)"}}>Apply filters to view records</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
          <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:3}}>From Date</label><input type="date" value={filterDateFrom} onChange={e=>setFilterDateFrom(e.target.value)} style={inp}/></div>
          <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:3}}>To Date</label><input type="date" value={filterDateTo} onChange={e=>setFilterDateTo(e.target.value)} style={inp}/></div>
          <div><label style={{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:3}}>Group</label>
            <select value={filterGroup} onChange={e=>setFilterGroup(e.target.value)} style={inp}>
              <option value="">All Groups</option>
              {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        {filtersApplied && <button onClick={()=>{setFilterDateFrom("");setFilterDateTo("");setFilterGroup("");}} style={{fontSize:12,color:"#3b5bdb",background:"none",border:"none",cursor:"pointer",marginTop:8,padding:0}}>✕ Clear all filters</button>}
      </div>
      {!filtersApplied ? (
        <div style={{textAlign:"center",padding:"3rem 1rem",color:"var(--color-text-secondary)"}}>
          <i className="ti ti-filter" style={{fontSize:40,display:"block",marginBottom:"0.75rem",opacity:0.4}}/>
          <p style={{margin:0,fontSize:15,fontWeight:500}}>Select a date range or group above to view history</p>
        </div>
      ) : filteredSessions.length===0 ? <Empty msg="No sessions found for the selected filters"/> : (
        <div style={{display:"grid",gap:8}}>
          {filteredSessions.map(s=>{
            const cls=classes.find(c=>c.id===s.classId); const grp=groups.find(g=>g.id===cls?.groupId);
            const pal=cls?getGroupPalette(cls.groupId,groups):null; const st=sessionStats(s); const isExpanded=editSession===s.id;
            const presentRecordIds=records.filter(r=>r.sessionId===s.id&&r.present).map(r=>r.personId);
            const allPresentPeople=presentRecordIds.map(pid=>{
              const p=people.find(x=>x.id===pid); if(p) return p;
              const cached=deletedNames[pid]; const parts=cached?cached.split(" "):[];
              return {id:pid,firstName:parts.slice(0,-1).join(" ")||cached||"?",lastName:parts.length>1?parts[parts.length-1]:"",_deleted:true,classIds:[]};
            });
            return (
              <div key={s.id} style={{background:"var(--color-background-primary)",border:`1.5px solid ${pal?pal.border:"var(--color-border-tertiary)"}`,borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"0.9rem 1.25rem",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",borderLeft:`4px solid ${pal?pal.accent:"#3b5bdb"}`}}>
                  <div style={{flex:1,minWidth:120}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                      <p style={{margin:0,fontWeight:600,fontSize:15,color:"var(--color-text-primary)"}}>{cls?.name}</p>
                      {grp && <GroupBadge groupId={grp.id} groups={groups} label={grp.name}/>}
                    </div>
                    <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)"}}>{isoToDisplay(s.date)}</p>
                  </div>
                  <div style={{display:"flex",gap:16,fontSize:13}}>
                    <span><strong style={{color:"var(--color-text-primary)"}}>{st.members}</strong> <span style={{color:"var(--color-text-secondary)"}}>mbr</span></span>
                    <span><strong style={{color:pal?pal.accent:"#d85a30"}}>{st.visitors}</strong> <span style={{color:"var(--color-text-secondary)"}}>vis</span></span>
                    <strong style={{color:"var(--color-text-primary)"}}>{st.members+st.visitors} total</strong>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>setEditSession(isExpanded?null:s.id)} style={{padding:"6px 12px",border:"1px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",borderRadius:6,cursor:"pointer",fontSize:12,color:"var(--color-text-primary)"}}>{isExpanded?"Close":"Edit"}</button>
                    <button onClick={()=>setDelConfirm(s.id)} style={{padding:"6px",background:"#fcebeb",border:"1px solid #f7c1c1",borderRadius:6,cursor:"pointer",color:"#a32d2d"}}><i className="ti ti-trash" style={{fontSize:14}}/></button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{borderTop:`1px solid ${pal?pal.border:"var(--color-border-tertiary)"}`,padding:"1rem 1.25rem",background:pal?pal.bg:"var(--color-background-secondary)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:"0.75rem"}}>
                      <label style={{fontSize:13,color:pal?pal.text:"var(--color-text-secondary)"}}>Visitors:</label>
                      <input type="number" min={0} value={s.visitors||0} onChange={async e=>{const v=Math.max(0,parseInt(e.target.value)||0); await supabase.from("sessions").update({visitors:v}).eq("id",s.id); setSessions(prev=>prev.map(x=>x.id===s.id?{...x,visitors:v}:x));}}
                        style={{width:70,padding:"6px 10px",border:"1px solid var(--color-border-tertiary)",borderRadius:6,background:"#fff",color:"#1a2744",fontSize:13,textAlign:"center"}}/>
                    </div>
                    <p style={{fontSize:12,fontWeight:600,color:"#6b7a96",margin:"0 0 6px"}}>PRESENT ({allPresentPeople.length})</p>
                    <div style={{display:"grid",gap:4}}>
                      {allPresentPeople.length===0 ? <p style={{fontSize:13,color:"#8896b0",margin:0}}>No members marked present.</p>
                        : allPresentPeople.map((p,i)=>(
                          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:6,background:i%2===0?"#f4f8ff":"#fff",border:"1px solid #dce8fa"}}>
                            <div style={{width:28,height:28,borderRadius:"50%",background:p._deleted?"#b0bfd6":"#0c8c6e",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:600,flexShrink:0}}>{initials(p)}</div>
                            <span style={{flex:1,fontSize:13,color:"var(--color-text-primary)"}}>
                              {fullName(p)}
                              {p._deleted && <span style={{marginLeft:5,fontSize:11,color:"#a32d2d",background:"#fcebeb",border:"1px solid #f7c1c1",borderRadius:4,padding:"1px 5px"}}>deleted</span>}
                            </span>
                            {!p._deleted && <button onClick={()=>toggleRecord(s.id,p.id)} style={{padding:"4px 8px",fontSize:11,border:"1px solid #f7c1c1",background:"#fcebeb",borderRadius:5,cursor:"pointer",color:"#a32d2d"}}>Remove</button>}
                          </div>
                        ))
                      }
                    </div>
                    <div style={{marginTop:10}}>
                      {(()=>{const absentMembers=people.filter(p=>p.classIds?.includes(s.classId)&&!allPresentPeople.find(pp=>pp.id===p.id)); if(absentMembers.length===0) return null; return (
                        <details><summary style={{fontSize:12,color:"#3b5bdb",cursor:"pointer",userSelect:"none"}}>+ Add member as present ({absentMembers.length} absent)</summary>
                          <div style={{marginTop:6,display:"grid",gap:3}}>
                            {absentMembers.sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).map(p=>(
                              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,background:"#f8faff",border:"1px solid #dce8fa"}}>
                                <span style={{flex:1,fontSize:13,color:"#1a2744"}}>{fullName(p)}</span>
                                <button onClick={()=>toggleRecord(s.id,p.id)} style={{padding:"3px 10px",fontSize:11,border:"1px solid #b5d4f4",background:"#e6f1fb",borderRadius:5,cursor:"pointer",color:"#0c447c"}}>Mark Present</button>
                              </div>
                            ))}
                          </div>
                        </details>
                      );})()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {delConfirm && <Confirm msg="Delete this entire attendance session and all its records?" onConfirm={async()=>{await supabase.from("sessions").delete().eq("id",delConfirm); setRecords(prev=>prev.filter(r=>r.sessionId!==delConfirm)); setSessions(prev=>prev.filter(s=>s.id!==delConfirm)); setDelConfirm(null);}} onClose={()=>setDelConfirm(null)}/>}
    </div>
  );
}
