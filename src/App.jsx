import { useState, useEffect, useCallback, useMemo } from "react";

const GLOBAL_FONT = "'Inter', system-ui, -apple-system, sans-serif";

// ─── Group Color Palette ─────────────────────────────────────────────────────
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
const today = new Date();
const sunday = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return fmt(d);
};
// full name from person object
const fullName = (p) => p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.name || "" : "";
// initials
const initials = (p) => {
  const f = (p.firstName || "")[0] || "";
  const l = (p.lastName  || "")[0] || "";
  return (f + l).toUpperCase() || (p.name || "?")[0].toUpperCase();
};
// sort key: lastName, firstName
const sortKey = (p) => `${(p.lastName||"").toLowerCase()} ${(p.firstName||"").toLowerCase()}`;

const weekStartFromDate = (iso) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0,0,0,0);
  return d;
};
const weekEndFromDate = (iso) => {
  const d = weekStartFromDate(iso);
  d.setDate(d.getDate() + 6);
  d.setHours(23,59,59,999);
  return d;
};
const isoToDisplay = (iso) => new Date(iso + "T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});

// ─── Seed Data ───────────────────────────────────────────────────────────────
const SEED_GROUPS = [
  { id:"g1", name:"AM Service",    type:"group", order:0 },
  { id:"g2", name:"PM Service",    type:"group", order:1 },
  { id:"g3", name:"Sunday School", type:"group", order:2 },
];
const SEED_CLASSES = [
  { id:"c1", name:"Main Church", groupId:"g1", order:0 },
  { id:"c2", name:"Main Church", groupId:"g2", order:0 },
  { id:"c3", name:"1st Grade",   groupId:"g3", order:0 },
  { id:"c4", name:"2nd Grade",   groupId:"g3", order:1 },
  { id:"c5", name:"3rd Grade",   groupId:"g3", order:2 },
];
// Updated seed with firstName/lastName/householdId/role
const SEED_PEOPLE = [
  { id:"p1",  firstName:"Alice",  lastName:"Johnson",  phone:"555-1001", email:"alice@example.com",  address:"123 Oak St",      notes:"Worship team lead", classIds:["c1","c2"], householdId:"h1", householdRole:"head"   },
  { id:"p2",  firstName:"Bob",    lastName:"Smith",    phone:"555-1002", email:"bob@example.com",    address:"456 Maple Ave",   notes:"",                  classIds:["c1"],       householdId:"h2", householdRole:"head"   },
  { id:"p3",  firstName:"Carol",  lastName:"White",    phone:"555-1003", email:"carol@example.com",  address:"789 Pine Rd",     notes:"Pianist",           classIds:["c1","c2"], householdId:"h3", householdRole:"head"   },
  { id:"p4",  firstName:"David",  lastName:"Brown",    phone:"555-1004", email:"david@example.com",  address:"321 Elm St",      notes:"",                  classIds:["c1"],       householdId:"h4", householdRole:"head"   },
  { id:"p5",  firstName:"Emma",   lastName:"Johnson",  phone:"555-1005", email:"emma@example.com",   address:"123 Oak St",      notes:"",                  classIds:["c3"],       householdId:"h1", householdRole:"child"  },
  { id:"p6",  firstName:"Frank",  lastName:"Miller",   phone:"555-1006", email:"",                   address:"987 Birch Blvd",  notes:"Usher",             classIds:["c1"],       householdId:"h5", householdRole:"head"   },
  { id:"p7",  firstName:"Grace",  lastName:"Smith",    phone:"555-1007", email:"grace@example.com",  address:"456 Maple Ave",   notes:"",                  classIds:["c3","c4"], householdId:"h2", householdRole:"child"  },
  { id:"p8",  firstName:"Henry",  lastName:"Moore",    phone:"555-1008", email:"",                   address:"246 Spruce Way",  notes:"",                  classIds:["c2"],       householdId:"h6", householdRole:"head"   },
  { id:"p9",  firstName:"Iris",   lastName:"White",    phone:"555-1009", email:"iris@example.com",   address:"789 Pine Rd",     notes:"",                  classIds:["c4"],       householdId:"h3", householdRole:"child"  },
  { id:"p10", firstName:"James",  lastName:"Anderson", phone:"555-1010", email:"james@example.com",  address:"468 Poplar Pl",   notes:"Elder",             classIds:["c1","c2"], householdId:"h7", householdRole:"head"   },
  { id:"p11", firstName:"Karen",  lastName:"Brown",    phone:"555-1011", email:"karen@example.com",  address:"321 Elm St",      notes:"",                  classIds:["c5"],       householdId:"h4", householdRole:"child"  },
  { id:"p12", firstName:"Leo",    lastName:"Jackson",  phone:"555-1012", email:"",                   address:"680 Magnolia St", notes:"",                  classIds:["c1"],       householdId:"h8", householdRole:"head"   },
];
const SEED_SESSIONS = [
  { id:"s1", classId:"c1", date:sunday(),   visitors:5 },
  { id:"s2", classId:"c2", date:sunday(),   visitors:3 },
  { id:"s3", classId:"c3", date:sunday(),   visitors:1 },
  { id:"s4", classId:"c4", date:sunday(),   visitors:0 },
  { id:"s5", classId:"c5", date:sunday(),   visitors:2 },
  { id:"s6", classId:"c1", date:sunday(-1), visitors:4 },
  { id:"s7", classId:"c2", date:sunday(-1), visitors:2 },
];
const SEED_RECORDS = [
  { id:"r1",  sessionId:"s1", personId:"p1",  present:true  },
  { id:"r2",  sessionId:"s1", personId:"p2",  present:true  },
  { id:"r3",  sessionId:"s1", personId:"p3",  present:true  },
  { id:"r4",  sessionId:"s1", personId:"p4",  present:false },
  { id:"r5",  sessionId:"s1", personId:"p6",  present:true  },
  { id:"r6",  sessionId:"s1", personId:"p10", present:true  },
  { id:"r7",  sessionId:"s1", personId:"p12", present:true  },
  { id:"r8",  sessionId:"s2", personId:"p3",  present:true  },
  { id:"r9",  sessionId:"s2", personId:"p8",  present:true  },
  { id:"r10", sessionId:"s2", personId:"p10", present:true  },
  { id:"r11", sessionId:"s3", personId:"p5",  present:true  },
  { id:"r12", sessionId:"s3", personId:"p7",  present:true  },
  { id:"r13", sessionId:"s4", personId:"p7",  present:false },
  { id:"r14", sessionId:"s4", personId:"p9",  present:true  },
  { id:"r15", sessionId:"s5", personId:"p11", present:true  },
  { id:"r16", sessionId:"s6", personId:"p1",  present:true  },
  { id:"r17", sessionId:"s6", personId:"p2",  present:false },
  { id:"r18", sessionId:"s6", personId:"p3",  present:true  },
  { id:"r19", sessionId:"s6", personId:"p6",  present:true  },
  { id:"r20", sessionId:"s7", personId:"p3",  present:true  },
  { id:"r21", sessionId:"s7", personId:"p10", present:true  },
];

// ─── Storage ─────────────────────────────────────────────────────────────────
const load = (key, seed) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : seed; } catch { return seed; } };
const save = (key, val)  => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── Shared UI ───────────────────────────────────────────────────────────────
function PageHeader({ title, actions }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem", flexWrap:"wrap", gap:10 }}>
      <h2 style={{ fontSize:22, fontWeight:700, margin:0, color:"var(--color-text-primary)" }}>{title}</h2>
      {actions && <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{actions}</div>}
    </div>
  );
}

function Modal({ title, children, onClose, maxWidth=480 }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#ffffff", borderRadius:16, width:"100%", maxWidth, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ padding:"1.25rem 1.5rem", borderBottom:"1px solid #e8edf5", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#ffffff", zIndex:1 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1a2744" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#8896b0", fontSize:20, lineHeight:1 }}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding:"1.25rem 1.5rem", background:"#ffffff" }}>{children}</div>
      </div>
    </div>
  );
}

function Confirm({ msg, onConfirm, onClose, confirmLabel="Delete", danger=true }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div style={{ background:"#ffffff", borderRadius:12, padding:"1.5rem", maxWidth:380, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
        <p style={{ margin:"0 0 1.25rem", fontSize:15, color:"#1a2744", lineHeight:1.55 }}>{msg}</p>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 16px", border:"1px solid #dde3ee", background:"#f4f6fb", borderRadius:8, cursor:"pointer", color:"#1a2744", fontSize:14 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding:"8px 16px", background:danger?"#e24b4a":"#3b5bdb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ textAlign:"center", padding:"3rem 1rem", color:"var(--color-text-secondary)" }}>
      <i className="ti ti-inbox" style={{ fontSize:36, display:"block", marginBottom:"0.5rem" }} />
      <p style={{ margin:0, fontSize:14 }}>{msg}</p>
    </div>
  );
}

function GroupBadge({ groupId, groups, label }) {
  const pal = getGroupPalette(groupId, groups);
  return <span style={{ fontSize:11, padding:"2px 8px", background:pal.bg, color:pal.text, borderRadius:4, border:`1px solid ${pal.border}`, fontWeight:500 }}>{label}</span>;
}

function StatCard({ label, total, members, visitors, groupId, groups }) {
  const pal = groupId ? getGroupPalette(groupId, groups) : null;
  const accent = pal ? pal.accent : "#3b5bdb";
  return (
    <div style={{ background:"var(--color-background-primary)", border:`1px solid ${pal?pal.border:"var(--color-border-tertiary)"}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ background:pal?pal.header:"var(--color-background-primary)", borderBottom:`3px solid ${accent}`, padding:"0.75rem 1.25rem 0.6rem" }}>
        <p style={{ fontSize:13, color:pal?pal.text:"var(--color-text-secondary)", margin:0, fontWeight:600 }}>{label}</p>
      </div>
      <div style={{ padding:"0.75rem 1.25rem 1rem" }}>
        <p style={{ fontSize:28, fontWeight:700, margin:"0 0 6px", color:"var(--color-text-primary)", lineHeight:1 }}>{total}</p>
        <div style={{ display:"flex", gap:12, fontSize:12 }}>
          <span style={{ color:"var(--color-text-secondary)" }}><strong style={{ color:"var(--color-text-primary)" }}>{members}</strong> members</span>
          <span style={{ color:"var(--color-text-secondary)" }}><strong style={{ color:accent }}>{visitors}</strong> visitors</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed,   setAuthed]   = useState(() => sessionStorage.getItem("ca_auth") === "1");
  const [page,     setPage]     = useState("dashboard");
  const [navOpen,  setNavOpen]  = useState(false);

  const [groups,   setGroups]   = useState(() => load("ca_groups",   SEED_GROUPS));
  const [classes,  setClasses]  = useState(() => load("ca_classes",  SEED_CLASSES));
  const [people,   setPeople]   = useState(() => load("ca_people",   SEED_PEOPLE));
  const [sessions, setSessions] = useState(() => load("ca_sessions", SEED_SESSIONS));
  const [records,  setRecords]  = useState(() => load("ca_records",  SEED_RECORDS));

  useEffect(() => save("ca_groups",   groups),   [groups]);
  useEffect(() => save("ca_classes",  classes),  [classes]);
  useEffect(() => save("ca_people",   people),   [people]);
  useEffect(() => save("ca_sessions", sessions), [sessions]);
  useEffect(() => save("ca_records",  records),  [records]);

  if (!authed) return <Login onLogin={() => { sessionStorage.setItem("ca_auth","1"); setAuthed(true); }} />;

  // Settings tab removed — only 5 nav items
  const navItems = [
    { id:"dashboard",  icon:"ti-dashboard",      label:"Dashboard"  },
    { id:"attendance", icon:"ti-clipboard-check", label:"Attendance" },
    { id:"people",     icon:"ti-users",           label:"People"     },
    { id:"groups",     icon:"ti-layout-list",     label:"Groups"     },
    { id:"history",    icon:"ti-history",         label:"History"    },
  ];

  const ctx = { groups, setGroups, classes, setClasses, people, setPeople, sessions, setSessions, records, setRecords };

  const SidebarNav = ({ onNav }) => (
    <nav style={{ padding:"0.75rem 0.5rem", flex:1 }}>
      {navItems.map(n => (
        <button key={n.id} onClick={() => { setPage(n.id); onNav?.(); }} style={{
          display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px",
          borderRadius:8, border:"none", cursor:"pointer", marginBottom:2,
          background: page===n.id ? "rgba(59,91,219,0.25)" : "transparent",
          color: page===n.id ? "#7b9fff" : "rgba(255,255,255,0.65)",
          fontSize:14, fontWeight: page===n.id ? 600 : 400, transition:"all 0.15s",
        }}>
          <i className={`ti ${n.icon}`} style={{ fontSize:17, width:20, textAlign:"center" }} />
          {n.label}
        </button>
      ))}
    </nav>
  );

  const LogoBlock = () => (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:34, height:34, borderRadius:"50%", background:"#3b5bdb", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <i className="ti ti-building-church" style={{ color:"#fff", fontSize:18 }} />
      </div>
      <div>
        <div style={{ color:"#fff", fontWeight:700, fontSize:14, lineHeight:1.2 }}>Church</div>
        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11 }}>Attendance</div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--color-background-tertiary)", fontFamily:GLOBAL_FONT }}>
      <aside style={{ width:220, background:"#1a2744", display:"flex", flexDirection:"column", flexShrink:0, position:"sticky", top:0, height:"100vh", overflowY:"auto" }} className="desktop-sidebar">
        <div style={{ padding:"1.5rem 1.25rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}><LogoBlock /></div>
        <SidebarNav />
        <div style={{ padding:"1rem 1.25rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => { sessionStorage.removeItem("ca_auth"); setAuthed(false); }} style={{ display:"flex", alignItems:"center", gap:8, color:"rgba(255,255,255,0.45)", background:"none", border:"none", cursor:"pointer", fontSize:13, padding:"6px 0" }}>
            <i className="ti ti-logout" style={{ fontSize:16 }} />Sign out
          </button>
        </div>
      </aside>

      {navOpen && <div onClick={() => setNavOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:40 }} />}
      <aside style={{ position:"fixed", left:0, top:0, bottom:0, width:220, background:"#1a2744", zIndex:50, transform:navOpen?"translateX(0)":"translateX(-100%)", transition:"transform 0.25s", display:"flex", flexDirection:"column" }} className="mobile-drawer">
        <div style={{ padding:"1.5rem 1.25rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <LogoBlock />
            <button onClick={() => setNavOpen(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20 }}><i className="ti ti-x" /></button>
          </div>
        </div>
        <SidebarNav onNav={() => setNavOpen(false)} />
      </aside>

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <header style={{ background:"#1a2744", padding:"0.75rem 1rem", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:30 }} className="mobile-header">
          <button onClick={() => setNavOpen(true)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.8)", cursor:"pointer", fontSize:24, padding:"2px", lineHeight:1 }}>
            <i className="ti ti-menu-2" />
          </button>
          <span style={{ color:"#fff", fontWeight:600, fontSize:15 }}>{navItems.find(n=>n.id===page)?.label}</span>
        </header>
        <main style={{ flex:1, padding:"1.5rem", maxWidth:1100, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
          {page==="dashboard"  && <Dashboard  {...ctx} setPage={setPage} />}
          {page==="attendance" && <AttendancePage {...ctx} />}
          {page==="people"     && <PeoplePage  {...ctx} />}
          {page==="groups"     && <GroupsPage  {...ctx} />}
          {page==="history"    && <HistoryPage {...ctx} />}
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
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => { if (pw==="password") onLogin(); else { setErr(true); setTimeout(()=>setErr(false),2000); } };
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f1829", padding:"1rem" }}>
      <div style={{ background:"#1a2744", borderRadius:16, padding:"2.5rem 2rem", width:"100%", maxWidth:380, boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"#3b5bdb", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem" }}>
            <i className="ti ti-building-church" style={{ color:"#fff", fontSize:32 }} />
          </div>
          <h1 style={{ color:"#fff", fontSize:22, fontWeight:700, margin:0 }}>Church Attendance</h1>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:14, margin:"6px 0 0" }}>Sign in to continue</p>
        </div>
        <div style={{ marginBottom:"1rem" }}>
          <label style={{ color:"rgba(255,255,255,0.7)", fontSize:13, display:"block", marginBottom:6 }}>Password</label>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter password"
            style={{ width:"100%", padding:"11px 14px", borderRadius:8, border:`1px solid ${err?"#e24b4a":"rgba(255,255,255,0.15)"}`, background:"rgba(255,255,255,0.07)", color:"#fff", fontSize:15 }} />
          {err && <p style={{ color:"#e24b4a", fontSize:12, margin:"6px 0 0" }}>Incorrect password.</p>}
        </div>
        <button onClick={submit} style={{ width:"100%", padding:"12px", borderRadius:8, background:"#3b5bdb", border:"none", color:"#fff", fontWeight:600, fontSize:15, cursor:"pointer" }}>Sign In</button>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ groups, classes, sessions, records, setPage }) {
  const todaySunday = sunday(0);
  const [weekAnchor, setWeekAnchor] = useState(todaySunday);
  const ws = weekStartFromDate(weekAnchor);
  const we = weekEndFromDate(weekAnchor);
  const thisSessions = sessions.filter(s => { const d=new Date(s.date+"T12:00:00"); return d>=ws&&d<=we; });

  const classStats = classes.map(cl => {
    const sess = thisSessions.filter(s=>s.classId===cl.id);
    const sessIds = sess.map(s=>s.id);
    const members = records.filter(r=>sessIds.includes(r.sessionId)&&r.present).length;
    const visitors = sess.reduce((a,s)=>a+(s.visitors||0),0);
    return { classId:cl.id, classNm:cl.name, groupId:cl.groupId, members, visitors, total:members+visitors };
  });

  const groupStats = groups.map(g => {
    const gClasses = classStats.filter(cs=>cs.groupId===g.id);
    const gSessIds = sessions.filter(s=>{ const d=new Date(s.date+"T12:00:00"); return gClasses.find(c=>c.classId===s.classId)&&d>=ws&&d<=we; }).map(s=>s.id);
    const unique = new Set(records.filter(r=>gSessIds.includes(r.sessionId)&&r.present).map(r=>r.personId));
    const visitors = gClasses.reduce((a,c)=>a+c.visitors,0);
    return { ...g, members:unique.size, visitors, total:unique.size+visitors };
  });

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.5rem", flexWrap:"wrap", gap:10 }}>
        <h2 style={{ fontSize:22, fontWeight:700, margin:0, color:"var(--color-text-primary)" }}>Dashboard</h2>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>Week of</span>
          <input type="date" value={weekAnchor} onChange={e=>setWeekAnchor(e.target.value)}
            style={{ padding:"6px 10px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:13, cursor:"pointer" }} />
          {weekAnchor!==todaySunday && (
            <button onClick={()=>setWeekAnchor(todaySunday)} style={{ padding:"6px 10px", fontSize:12, border:"1px solid var(--color-border-tertiary)", borderRadius:6, background:"var(--color-background-secondary)", cursor:"pointer", color:"var(--color-text-primary)" }}>This week</button>
          )}
        </div>
      </div>
      <p style={{ color:"var(--color-text-secondary)", fontSize:13, margin:"0 0 1.5rem" }}>
        {ws.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – {we.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
      </p>

      <h3 style={{ fontSize:15, fontWeight:600, marginBottom:"0.75rem", color:"var(--color-text-primary)" }}>By Group</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:"2rem" }}>
        {groupStats.map(g => <StatCard key={g.id} label={g.name} total={g.total} members={g.members} visitors={g.visitors} groupId={g.id} groups={groups} />)}
      </div>

      <h3 style={{ fontSize:15, fontWeight:600, marginBottom:"0.75rem", color:"var(--color-text-primary)" }}>By Class</h3>
      <div style={{ background:"var(--color-background-primary)", border:"1px solid var(--color-border-tertiary)", borderRadius:12, overflow:"hidden" }}>
        {classStats.every(cs=>cs.total===0) ? <Empty msg="No attendance recorded for this week" /> : classStats.filter(cs=>cs.total>0).map((cs,i,arr) => {
          const pal = getGroupPalette(cs.groupId, groups);
          return (
            <div key={cs.classId} style={{ display:"flex", alignItems:"center", padding:"0.85rem 1.25rem", borderBottom:i<arr.length-1?"1px solid var(--color-border-tertiary)":"none", gap:12 }}>
              <div style={{ width:4, height:32, borderRadius:4, background:pal.accent, flexShrink:0 }} />
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontWeight:500, fontSize:14, color:"var(--color-text-primary)" }}>{cs.classNm}</span>
                <GroupBadge groupId={cs.groupId} groups={groups} label={groups.find(g=>g.id===cs.groupId)?.name} />
              </div>
              <div style={{ display:"flex", gap:16, fontSize:13 }}>
                <span><strong style={{ color:"var(--color-text-primary)" }}>{cs.members}</strong> <span style={{ color:"var(--color-text-secondary)" }}>mbr</span></span>
                <span><strong style={{ color:pal.accent }}>{cs.visitors}</strong> <span style={{ color:"var(--color-text-secondary)" }}>vis</span></span>
                <strong style={{ color:"var(--color-text-primary)", minWidth:24, textAlign:"right" }}>{cs.total}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:"2rem", display:"flex", gap:12, flexWrap:"wrap" }}>
        <button onClick={()=>setPage("attendance")} style={{ padding:"10px 20px", background:"#3b5bdb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14 }}>
          <i className="ti ti-clipboard-check" style={{ marginRight:6 }} />Take Attendance
        </button>
        <button onClick={()=>setPage("history")} style={{ padding:"10px 20px", background:"var(--color-background-secondary)", color:"var(--color-text-primary)", border:"1px solid var(--color-border-tertiary)", borderRadius:8, cursor:"pointer", fontSize:14 }}>
          <i className="ti ti-history" style={{ marginRight:6 }} />View History
        </button>
      </div>
    </div>
  );
}

// ─── Attendance Page ──────────────────────────────────────────────────────────
function AttendancePage({ groups, classes, people, sessions, setSessions, records, setRecords }) {
  const [selClass, setSelClass] = useState(classes[0]?.id || "");
  const [selDate,  setSelDate]  = useState(fmt(new Date()));
  const [visitors, setVisitors] = useState(0);
  const [saved,    setSaved]    = useState(false);

  const cls = classes.find(c=>c.id===selClass);
  const grp = cls ? groups.find(g=>g.id===cls.groupId) : null;
  const pal = cls ? getGroupPalette(cls.groupId, groups) : null;

  // Group members by household, sorted by lastName then firstName
  const classMembers = useMemo(() => {
    const members = people.filter(p=>p.classIds?.includes(selClass));
    // Build household groups: heads first, then members sorted under their head
    const heads   = members.filter(p=>p.householdRole==="head" || !p.householdId).sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
    const nonHeads= members.filter(p=>p.householdRole!=="head" && p.householdId);
    const result  = [];
    const usedIds = new Set();
    heads.forEach(h => {
      result.push({ ...h, _isHead:true });
      usedIds.add(h.id);
      nonHeads.filter(p=>p.householdId===h.householdId).sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).forEach(m => {
        result.push({ ...m, _isHead:false, _underHead:h.id });
        usedIds.add(m.id);
      });
    });
    // any non-heads whose head isn't in this class
    nonHeads.filter(p=>!usedIds.has(p.id)).sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).forEach(p=>result.push({...p,_isHead:false}));
    return result;
  }, [people, selClass]);

  const session = sessions.find(s=>s.classId===selClass&&s.date===selDate);
  const sessionRecords = session ? records.filter(r=>r.sessionId===session.id) : [];
  const isPresent = (pid) => { if (!session) return false; const r=sessionRecords.find(r=>r.personId===pid); return r?r.present:false; };
  const presentCount = sessionRecords.filter(r=>r.present).length;
  const curVisitors  = session?.visitors||0;

  const ensureSession = useCallback(() => {
    let s = sessions.find(s=>s.classId===selClass&&s.date===selDate);
    if (!s) { s={id:uid(),classId:selClass,date:selDate,visitors:0}; setSessions(prev=>[...prev,s]); }
    return s;
  },[selClass,selDate,sessions,setSessions]);

  const toggle = (pid) => {
    const s=ensureSession();
    const ex=records.find(r=>r.sessionId===s.id&&r.personId===pid);
    if (ex) setRecords(prev=>prev.map(r=>r.id===ex.id?{...r,present:!r.present}:r));
    else    setRecords(prev=>[...prev,{id:uid(),sessionId:s.id,personId:pid,present:true}]);
    flash();
  };
  const updateVisitors = (v) => { const s=ensureSession(); setSessions(prev=>prev.map(x=>x.id===s.id?{...x,visitors:v}:x)); setVisitors(v); flash(); };
  const flash = () => { setSaved(true); setTimeout(()=>setSaved(false),1500); };
  useEffect(()=>{ const s=sessions.find(s=>s.classId===selClass&&s.date===selDate); setVisitors(s?.visitors||0); },[selClass,selDate,sessions]);
  const markAll = (present) => {
    const s=ensureSession();
    classMembers.forEach(p=>{
      const ex=records.find(r=>r.sessionId===s.id&&r.personId===p.id);
      if (ex) setRecords(prev=>prev.map(r=>r.id===ex.id?{...r,present}:r));
      else if (present) setRecords(prev=>[...prev,{id:uid(),sessionId:s.id,personId:p.id,present:true}]);
    });
    flash();
  };

  // Blue-only tones: alternating slightly-off-white and soft blue
  const rowBg = (i, present) => {
    if (present) return "rgba(12,140,110,0.07)";
    return i%2===0 ? "#f4f8ff" : "#ffffff";
  };
  const rowBorder = "#dce8fa";

  return (
    <div>
      <PageHeader title="Take Attendance" />
      <div style={{ background:"var(--color-background-primary)", border:"1px solid var(--color-border-tertiary)", borderRadius:12, padding:"1.25rem", marginBottom:"1.25rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:"1rem" }}>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Date</label>
            <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontSize:14 }} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Class</label>
            <select value={selClass} onChange={e=>setSelClass(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontSize:14 }}>
              {groups.map(g=>(
                <optgroup key={g.id} label={g.name}>
                  {classes.filter(c=>c.groupId===g.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        {pal && cls && (
          <div style={{ background:pal.header, border:`1px solid ${pal.border}`, borderRadius:8, padding:"8px 12px", marginBottom:"0.75rem", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:pal.accent }} />
            <span style={{ fontSize:13, fontWeight:600, color:pal.text }}>{cls.name}</span>
            {grp && <span style={{ fontSize:12, color:pal.text, opacity:0.7 }}>— {grp.name}</span>}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <label style={{ fontSize:13, color:"var(--color-text-secondary)", whiteSpace:"nowrap" }}>Visitors:</label>
            <input type="number" min={0} value={visitors} onChange={e=>updateVisitors(Math.max(0,parseInt(e.target.value)||0))}
              style={{ width:70, padding:"7px 10px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontSize:14, textAlign:"center" }} />
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:12, alignItems:"center" }}>
            {saved && <span style={{ color:"#0c8c6e", fontSize:13, fontWeight:600 }}>✓ Saved</span>}
            <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{presentCount} present · {curVisitors} visitors</span>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:"1rem", alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:14, color:"var(--color-text-secondary)" }}>{classMembers.length} members</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          <button onClick={()=>markAll(true)}  style={{ padding:"6px 12px", fontSize:12, border:"1px solid var(--color-border-tertiary)", borderRadius:6, background:"var(--color-background-secondary)", cursor:"pointer", color:"var(--color-text-primary)" }}>Mark All Present</button>
          <button onClick={()=>markAll(false)} style={{ padding:"6px 12px", fontSize:12, border:"1px solid var(--color-border-tertiary)", borderRadius:6, background:"var(--color-background-secondary)", cursor:"pointer", color:"var(--color-text-primary)" }}>Clear All</button>
        </div>
      </div>

      {classMembers.length===0 ? <Empty msg="No members assigned to this class" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {classMembers.map((person, i) => {
            const present = isPresent(person.id);
            const isHead  = person._isHead || (!person.householdId);
            const isChild = !isHead;
            return (
              <div key={person.id} onClick={()=>toggle(person.id)} style={{
                display:"flex", alignItems:"center", padding: isChild ? "0.7rem 1.25rem 0.7rem 2.5rem" : "0.9rem 1.25rem",
                cursor:"pointer", gap:14, borderRadius:10, border:`2px solid ${present?"#a7dfcc":rowBorder}`,
                background:rowBg(i,present), transition:"background 0.15s",
              }}>
                {isChild && <div style={{ width:2, height:"100%", background:"#c7d8f0", position:"absolute", left:"1.75rem" }} />}
                <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, background:present?"#0c8c6e":"#c7d8f0", display:"flex", alignItems:"center", justifyContent:"center", color:present?"#fff":"#185fa5", fontSize:13, fontWeight:700, transition:"all 0.15s" }}>
                  {initials(person)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:isHead?600:500, fontSize:isHead?15:14, color:"var(--color-text-primary)" }}>{fullName(person)}</p>
                  {isChild && <p style={{ margin:0, fontSize:11, color:"#8896b0" }}>{person.householdRole==="spouse"?"Spouse":"Child"}</p>}
                  {person.phone && <p style={{ margin:0, fontSize:12, color:"var(--color-text-secondary)" }}>{person.phone}</p>}
                </div>
                <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${present?"#0c8c6e":"#b0bfd6"}`, background:present?"#0c8c6e":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}>
                  {present && <i className="ti ti-check" style={{ color:"#fff", fontSize:14 }} />}
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
function PeoplePage({ groups, classes, people, setPeople, sessions, records }) {
  const [search,     setSearch]     = useState("");
  const [modal,      setModal]      = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [viewPerson, setViewPerson] = useState(null);

  // Sort by lastName, firstName
  const sorted = useMemo(() => [...people].sort((a,b)=>sortKey(a).localeCompare(sortKey(b))), [people]);
  const filtered = sorted.filter(p =>
    fullName(p).toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by household for display
  const households = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const hid = p.householdId || p.id; // ungrouped people are their own "household"
      if (!map[hid]) map[hid] = [];
      map[hid].push(p);
    });
    // Sort each household: head first, then alphabetically
    Object.values(map).forEach(arr => arr.sort((a,b) => {
      const aHead = a.householdRole==="head" ? 0 : a.householdRole==="spouse" ? 1 : 2;
      const bHead = b.householdRole==="head" ? 0 : b.householdRole==="spouse" ? 1 : 2;
      return aHead!==bHead ? aHead-bHead : sortKey(a).localeCompare(sortKey(b));
    }));
    // Sort households by the head's last name
    return Object.entries(map).sort(([,a],[,b]) => {
      const ah = a.find(p=>p.householdRole==="head")||a[0];
      const bh = b.find(p=>p.householdRole==="head")||b[0];
      return sortKey(ah).localeCompare(sortKey(bh));
    }).map(([hid, members]) => ({ hid, members }));
  }, [filtered]);

  const savePerson = (p) => {
    if (modal.mode==="add") setPeople(prev=>[...prev,{...p,id:uid()}]);
    else                    setPeople(prev=>prev.map(x=>x.id===p.id?p:x));
    setModal(null);
  };
  // Delete person but KEEP records (orphaned personId in records = intentional for history)
  const del = (id) => { setPeople(prev=>prev.filter(p=>p.id!==id)); setDelConfirm(null); };

  return (
    <div>
      <PageHeader title="People" actions={
        <button onClick={()=>setModal({mode:"add",person:{firstName:"",lastName:"",phone:"",email:"",address:"",notes:"",classIds:[],householdId:"",householdRole:"head"}})}
          style={{ padding:"9px 18px", background:"#3b5bdb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14, display:"flex", alignItems:"center", gap:6 }}>
          <i className="ti ti-plus" />Add Person
        </button>
      } />

      <div style={{ position:"relative", marginBottom:"1rem" }}>
        <i className="ti ti-search" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--color-text-tertiary)", fontSize:16 }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..."
          style={{ width:"100%", padding:"9px 12px 9px 36px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:14 }} />
      </div>

      {households.length===0 ? <Empty msg="No people found" /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {households.map(({ hid, members }) => {
            const head = members.find(p=>p.householdRole==="head")||members[0];
            const isFamilyGroup = members.length > 1;
            return (
              <div key={hid} style={{ background:"#f4f8ff", border:"2px solid #dce8fa", borderRadius:12, overflow:"hidden" }}>
                {members.map((p, mi) => {
                  const isHead = p.householdRole==="head" || members.length===1;
                  const assignedClasses = classes.filter(c=>p.classIds?.includes(c.id));
                  return (
                    <div key={p.id} style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding: isHead ? "0.9rem 1.25rem" : "0.7rem 1.25rem 0.7rem 2.75rem",
                      borderTop: mi>0 ? "1px solid #dce8fa" : "none",
                      background: isHead ? "#f4f8ff" : "#ffffff",
                    }}>
                      {!isHead && <div style={{ width:16, height:1, background:"#c7d8f0", flexShrink:0, marginLeft:-20 }} />}
                      <button onClick={()=>setViewPerson(p)} style={{ width:isHead?44:36, height:isHead?44:36, borderRadius:"50%", background:"#c7d8f0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#185fa5", fontWeight:700, fontSize:isHead?14:12, border:"none", cursor:"pointer" }}>
                        {initials(p)}
                      </button>
                      <div style={{ flex:1, minWidth:0 }}>
                        <button onClick={()=>setViewPerson(p)} style={{ background:"none", border:"none", padding:0, cursor:"pointer", textAlign:"left", display:"block" }}>
                          <span style={{ fontWeight:isHead?600:500, fontSize:isHead?15:14, color:"var(--color-text-primary)" }}>{fullName(p)}</span>
                          {!isHead && <span style={{ marginLeft:6, fontSize:11, color:"#8896b0" }}>{p.householdRole==="spouse"?"Spouse":"Child"}</span>}
                        </button>
                        <p style={{ margin:0, fontSize:12, color:"var(--color-text-secondary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {p.phone}{p.email?` · ${p.email}`:""}
                        </p>
                        {assignedClasses.length>0 && (
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:3 }}>
                            {assignedClasses.map(c=><GroupBadge key={c.id} groupId={c.groupId} groups={groups} label={c.name} />)}
                          </div>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                        <button onClick={()=>setViewPerson(p)} style={{ padding:"7px", background:"white", border:"1px solid #dde3ee", borderRadius:6, cursor:"pointer", color:"#3b5bdb" }} title="Attendance">
                          <i className="ti ti-chart-bar" style={{ fontSize:14 }} />
                        </button>
                        <button onClick={()=>setModal({mode:"edit",person:{...p}})} style={{ padding:"7px", background:"white", border:"1px solid #dde3ee", borderRadius:6, cursor:"pointer", color:"#666" }}>
                          <i className="ti ti-edit" style={{ fontSize:14 }} />
                        </button>
                        <button onClick={()=>setDelConfirm(p.id)} style={{ padding:"7px", background:"#fcebeb", border:"1px solid #f7c1c1", borderRadius:6, cursor:"pointer", color:"#a32d2d" }}>
                          <i className="ti ti-trash" style={{ fontSize:14 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {modal && <PersonModal person={modal.person} mode={modal.mode} classes={classes} groups={groups} people={people} onSave={savePerson} onClose={()=>setModal(null)} />}
      {delConfirm && <Confirm
        msg={`Remove ${fullName(people.find(p=>p.id===delConfirm))} from the people list? Their attendance history will be preserved.`}
        confirmLabel="Remove"
        onConfirm={()=>del(delConfirm)} onClose={()=>setDelConfirm(null)} />}
      {viewPerson && <PersonAttendanceModal person={viewPerson} classes={classes} groups={groups} sessions={sessions} records={records} setRecords={setRecords} onClose={()=>setViewPerson(null)} />}
    </div>
  );
}

// ─── Person Attendance Modal ──────────────────────────────────────────────────
function PersonAttendanceModal({ person, classes, groups, sessions, records, setRecords, onClose }) {
  const personRecords = records.filter(r=>r.personId===person.id&&r.present); // only present
  const attendedSessionIds = personRecords.map(r=>r.sessionId);

  const relevantSessions = sessions
    .filter(s=>attendedSessionIds.includes(s.id))
    .sort((a,b)=>b.date.localeCompare(a.date));

  const [delHistConfirm, setDelHistConfirm] = useState(null);

  const deleteSessionRecord = (sessionId) => {
    setRecords(prev=>prev.filter(r=>!(r.sessionId===sessionId&&r.personId===person.id)));
    setDelHistConfirm(null);
  };

  const totalAttended = relevantSessions.length;
  const allPersonSessions = sessions.filter(s=>
    (person.classIds||[]).some(cid=>classes.find(c=>c.id===cid&&s.classId===cid))
  ).length;
  const pct = allPersonSessions>0 ? Math.round((totalAttended/allPersonSessions)*100) : 0;

  return (
    <Modal title={`${fullName(person)} — Attendance`} onClose={onClose}>
      <div style={{ display:"grid", gap:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[["Sessions",totalAttended,"#3b5bdb"],["Present",totalAttended,"#0c8c6e"],["Rate",`${pct}%`,pct>=75?"#0c8c6e":pct>=50?"#854f0b":"#993c1d"]].map(([lbl,val,col])=>(
            <div key={lbl} style={{ background:"#f4f7fe", borderRadius:10, padding:"0.75rem", textAlign:"center" }}>
              <p style={{ margin:0, fontSize:22, fontWeight:700, color:col }}>{val}</p>
              <p style={{ margin:0, fontSize:11, color:"#6b7a96", fontWeight:500 }}>{lbl}</p>
            </div>
          ))}
        </div>

        {(person.classIds||[]).length>0 && (
          <div>
            <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:600, color:"#6b7a96" }}>ASSIGNED CLASSES</p>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {classes.filter(c=>person.classIds.includes(c.id)).map(c=><GroupBadge key={c.id} groupId={c.groupId} groups={groups} label={c.name} />)}
            </div>
          </div>
        )}

        <div>
          <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:600, color:"#6b7a96" }}>ATTENDANCE HISTORY (present only)</p>
          {relevantSessions.length===0
            ? <p style={{ fontSize:13, color:"#8896b0", margin:0 }}>No attendance recorded yet.</p>
            : (
              <div style={{ borderRadius:10, overflow:"hidden", border:"1px solid #e4ecfb" }}>
                {relevantSessions.map((s,i) => {
                  const cls = classes.find(c=>c.id===s.classId);
                  const pal = cls ? getGroupPalette(cls.groupId, groups) : null;
                  return (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"0.7rem 1rem", borderBottom:i<relevantSessions.length-1?"1px solid #e4ecfb":"none", background:i%2===0?"#f8faff":"#ffffff" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:"#0c8c6e", flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:13, fontWeight:500, color:"#1a2744" }}>{cls?.name||"—"}</span>
                        {pal && <span style={{ marginLeft:6, fontSize:11, padding:"1px 6px", background:pal.bg, color:pal.text, borderRadius:4, border:`1px solid ${pal.border}` }}>{groups.find(g=>g.id===cls?.groupId)?.name}</span>}
                      </div>
                      <span style={{ fontSize:12, color:"#8896b0" }}>{isoToDisplay(s.date)}</span>
                      <button onClick={()=>setDelHistConfirm(s.id)} style={{ padding:"4px", background:"transparent", border:"none", cursor:"pointer", color:"#c4808080" }} title="Delete this record">
                        <i className="ti ti-trash" style={{ fontSize:13, color:"#e24b4a" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 20px", background:"#3b5bdb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14 }}>Close</button>
        </div>
      </div>
      {delHistConfirm && <Confirm msg="Delete this attendance record? This cannot be undone." onConfirm={()=>deleteSessionRecord(delHistConfirm)} onClose={()=>setDelHistConfirm(null)} />}
    </Modal>
  );
}

// ─── Person Edit Modal ────────────────────────────────────────────────────────
function PersonModal({ person, mode, classes, groups, people, onSave, onClose }) {
  const [f, setF] = useState(person);
  const upd = (k,v) => setF(prev=>({...prev,[k]:v}));
  const toggleClass = (cid) => setF(prev=>({...prev,classIds:prev.classIds?.includes(cid)?prev.classIds.filter(x=>x!==cid):[...(prev.classIds||[]),cid]}));

  const inp = { width:"100%", padding:"8px 10px", border:"1px solid #dde3ee", borderRadius:6, background:"#f8faff", color:"#1a2744", fontSize:14 };
  const lbl = { fontSize:12, fontWeight:500, color:"#6b7a96", display:"block", marginBottom:3 };

  // Households for linking
  const existingHeads = people.filter(p=>p.householdRole==="head"&&p.id!==f.id);

  return (
    <Modal title={mode==="add"?"Add Person":"Edit Person"} onClose={onClose} maxWidth={520}>
      <div style={{ display:"grid", gap:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label style={lbl}>First Name *</label>
            <input value={f.firstName||""} onChange={e=>upd("firstName",e.target.value)} style={inp} placeholder="First" />
          </div>
          <div>
            <label style={lbl}>Last Name *</label>
            <input value={f.lastName||""} onChange={e=>upd("lastName",e.target.value)} style={inp} placeholder="Last" />
          </div>
        </div>

        {[["phone","Phone"],["email","Email"],["address","Address"],["notes","Notes"]].map(([k,lb])=>(
          <div key={k}>
            <label style={lbl}>{lb}</label>
            {k==="notes"
              ? <textarea value={f[k]||""} onChange={e=>upd(k,e.target.value)} rows={2} style={{...inp,resize:"vertical"}} />
              : <input    value={f[k]||""} onChange={e=>upd(k,e.target.value)} style={inp} />
            }
          </div>
        ))}

        {/* Household */}
        <div style={{ borderTop:"1px solid #e8edf5", paddingTop:10 }}>
          <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:600, color:"#1a2744" }}>Household</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={lbl}>Role</label>
              <select value={f.householdRole||"head"} onChange={e=>upd("householdRole",e.target.value)} style={{...inp,background:"#f8faff"}}>
                <option value="head">Head of Household</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Household ID {f.householdRole==="head"?"(auto if blank)":"(match head)"}</label>
              {f.householdRole==="head"
                ? <input value={f.householdId||""} onChange={e=>upd("householdId",e.target.value)} placeholder="e.g. h-smith" style={inp} />
                : (
                  <select value={f.householdId||""} onChange={e=>upd("householdId",e.target.value)} style={{...inp,background:"#f8faff"}}>
                    <option value="">— Select head —</option>
                    {existingHeads.map(h=><option key={h.id} value={h.householdId||h.id}>{fullName(h)}</option>)}
                  </select>
                )
              }
            </div>
          </div>
        </div>

        {/* Assigned classes */}
        <div style={{ borderTop:"1px solid #e8edf5", paddingTop:10 }}>
          <label style={{ ...lbl, marginBottom:8 }}>Assigned Classes</label>
          {groups.map(g=>{
            const pal=getGroupPalette(g.id,groups);
            return (
              <div key={g.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:pal.accent }} />
                  <p style={{ fontSize:12, color:pal.text, margin:0, fontWeight:600 }}>{g.name}</p>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", paddingLeft:14 }}>
                  {classes.filter(c=>c.groupId===g.id).map(c=>(
                    <button key={c.id} onClick={()=>toggleClass(c.id)} style={{ padding:"4px 12px", fontSize:12, borderRadius:6, cursor:"pointer", border:"1px solid", background:f.classIds?.includes(c.id)?pal.accent:pal.bg, color:f.classIds?.includes(c.id)?"#fff":pal.text, borderColor:f.classIds?.includes(c.id)?pal.accent:pal.border }}>{c.name}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <button onClick={onClose} style={{ padding:"9px 18px", border:"1px solid #dde3ee", background:"#f4f7fe", borderRadius:8, cursor:"pointer", color:"#1a2744", fontSize:14 }}>Cancel</button>
          <button onClick={()=>(f.firstName||f.lastName)?onSave({...f,householdId:f.householdId||(f.householdRole==="head"?uid():"")}):null}
            style={{ padding:"9px 18px", background:"#3b5bdb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14 }}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Groups Page ──────────────────────────────────────────────────────────────
function GroupsPage({ groups, setGroups, classes, setClasses, people, setPeople }) {
  const [editItem,   setEditItem]   = useState(null);
  const [addMode,    setAddMode]    = useState(null);
  const [addName,    setAddName]    = useState("");
  const [addGroupId, setAddGroupId] = useState("");
  const [delConfirm, setDelConfirm] = useState(null);

  const saveEdit = () => {
    if (!editItem) return;
    if (editItem.type==="group") setGroups(prev=>prev.map(g=>g.id===editItem.id?{...g,name:editItem.name}:g));
    else                         setClasses(prev=>prev.map(c=>c.id===editItem.id?{...c,name:editItem.name}:c));
    setEditItem(null);
  };
  const addNew = () => {
    if (!addName.trim()) return;
    if (addMode==="group") setGroups(prev=>[...prev,{id:uid(),name:addName.trim(),type:"group",order:prev.length}]);
    else setClasses(prev=>[...prev,{id:uid(),name:addName.trim(),groupId:addGroupId||groups[0]?.id,order:prev.filter(c=>c.groupId===addGroupId).length}]);
    setAddName(""); setAddMode(null);
  };
  const delGroup = (gid) => {
    const cids=classes.filter(c=>c.groupId===gid).map(c=>c.id);
    setClasses(prev=>prev.filter(c=>c.groupId!==gid));
    setPeople(prev=>prev.map(p=>({...p,classIds:p.classIds?.filter(ci=>!cids.includes(ci))||[]})));
    setGroups(prev=>prev.filter(g=>g.id!==gid)); setDelConfirm(null);
  };
  const delClass = (cid) => {
    setPeople(prev=>prev.map(p=>({...p,classIds:p.classIds?.filter(ci=>ci!==cid)||[]})));
    setClasses(prev=>prev.filter(c=>c.id!==cid)); setDelConfirm(null);
  };

  return (
    <div>
      <PageHeader title="Groups & Classes" actions={<>
        <button onClick={()=>{setAddMode("class");setAddGroupId(groups[0]?.id||"");}} style={{ padding:"9px 14px", background:"var(--color-background-secondary)", border:"1px solid var(--color-border-tertiary)", borderRadius:8, cursor:"pointer", fontSize:14, color:"var(--color-text-primary)" }}>+ Class</button>
        <button onClick={()=>setAddMode("group")} style={{ padding:"9px 14px", background:"#3b5bdb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14 }}>+ Group</button>
      </>} />

      {addMode && (
        <div style={{ background:"var(--color-background-primary)", border:"1px solid #3b5bdb", borderRadius:12, padding:"1.25rem", marginBottom:"1rem" }}>
          <p style={{ margin:"0 0 10px", fontWeight:600, fontSize:14, color:"var(--color-text-primary)" }}>New {addMode==="group"?"Group":"Class"}</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <input value={addName} onChange={e=>setAddName(e.target.value)} placeholder="Name" style={{ flex:1, minWidth:160, padding:"8px 12px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontSize:14 }} />
            {addMode==="class" && <select value={addGroupId} onChange={e=>setAddGroupId(e.target.value)} style={{ padding:"8px 12px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontSize:14 }}>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>}
            <button onClick={addNew} style={{ padding:"8px 16px", background:"#3b5bdb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14 }}>Add</button>
            <button onClick={()=>{setAddMode(null);setAddName("");}} style={{ padding:"8px 12px", border:"1px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)", borderRadius:8, cursor:"pointer", color:"var(--color-text-primary)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gap:14 }}>
        {groups.map(g => {
          const pal=getGroupPalette(g.id,groups);
          return (
            <div key={g.id} style={{ borderRadius:12, overflow:"hidden", border:`1.5px solid ${pal.border}` }}>
              <div style={{ padding:"0.9rem 1.25rem", background:pal.header, borderBottom:`2px solid ${pal.border}`, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:pal.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className="ti ti-layout-list" style={{ fontSize:14, color:"#fff" }} />
                </div>
                {editItem?.id===g.id
                  ? <input value={editItem.name} onChange={e=>setEditItem({...editItem,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&saveEdit()} autoFocus style={{ flex:1, padding:"4px 8px", border:`1px solid ${pal.border}`, borderRadius:6, background:"#fff", color:"#1a2744", fontSize:14 }} />
                  : <span style={{ flex:1, fontWeight:700, fontSize:15, color:pal.text }}>{g.name}</span>
                }
                <span style={{ fontSize:12, color:pal.text, opacity:0.7, background:pal.bg, padding:"2px 8px", borderRadius:4, border:`1px solid ${pal.border}` }}>{classes.filter(c=>c.groupId===g.id).length} classes</span>
                {editItem?.id===g.id
                  ? <button onClick={saveEdit} style={{ padding:"4px 10px", background:pal.accent, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:12 }}>Save</button>
                  : <button onClick={()=>setEditItem({...g,type:"group"})} style={{ padding:"5px", background:"transparent", border:"none", cursor:"pointer", color:pal.text, opacity:0.6 }}><i className="ti ti-edit" style={{ fontSize:15 }} /></button>
                }
                <button onClick={()=>setDelConfirm({type:"group",id:g.id,name:g.name})} style={{ padding:"5px", background:"transparent", border:"none", cursor:"pointer", color:"#e24b4a" }}><i className="ti ti-trash" style={{ fontSize:15 }} /></button>
              </div>
              {classes.filter(c=>c.groupId===g.id).map(cls=>(
                <div key={cls.id} style={{ padding:"0.7rem 1.25rem 0.7rem 1rem", borderTop:`1px solid ${pal.border}`, background:pal.bg, display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:3, height:24, borderRadius:2, background:pal.accent, flexShrink:0, marginLeft:8 }} />
                  {editItem?.id===cls.id
                    ? <input value={editItem.name} onChange={e=>setEditItem({...editItem,name:e.target.value})} onKeyDown={e=>e.key==="Enter"&&saveEdit()} autoFocus style={{ flex:1, padding:"4px 8px", border:`1px solid ${pal.border}`, borderRadius:6, background:"#fff", color:"#1a2744", fontSize:14 }} />
                    : <span style={{ flex:1, fontSize:14, color:pal.text, fontWeight:500 }}>{cls.name}</span>
                  }
                  <span style={{ fontSize:12, color:pal.text, opacity:0.65 }}>{people.filter(p=>p.classIds?.includes(cls.id)).length} members</span>
                  {editItem?.id===cls.id
                    ? <button onClick={saveEdit} style={{ padding:"4px 10px", background:pal.accent, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:12 }}>Save</button>
                    : <button onClick={()=>setEditItem({...cls,type:"class"})} style={{ padding:"5px", background:"transparent", border:"none", cursor:"pointer", color:pal.text, opacity:0.6 }}><i className="ti ti-edit" style={{ fontSize:15 }} /></button>
                  }
                  <button onClick={()=>setDelConfirm({type:"class",id:cls.id,name:cls.name})} style={{ padding:"5px", background:"transparent", border:"none", cursor:"pointer", color:"#e24b4a" }}><i className="ti ti-trash" style={{ fontSize:15 }} /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {delConfirm && <Confirm msg={`Delete "${delConfirm.name}"?${delConfirm.type==="group"?" This will also delete all classes in this group.":""}`} onConfirm={()=>delConfirm.type==="group"?delGroup(delConfirm.id):delClass(delConfirm.id)} onClose={()=>setDelConfirm(null)} />}
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({ groups, classes, people, sessions, setSessions, records, setRecords }) {
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [filterGroup,    setFilterGroup]    = useState("");
  const [editSession,    setEditSession]    = useState(null);
  const [delConfirm,     setDelConfirm]     = useState(null);

  const filtersApplied = filterDateFrom || filterDateTo || filterGroup;

  const filteredSessions = useMemo(() => {
    if (!filtersApplied) return [];
    return sessions.filter(s => {
      if (filterDateFrom && s.date < filterDateFrom) return false;
      if (filterDateTo   && s.date > filterDateTo)   return false;
      if (filterGroup) { const cls=classes.find(c=>c.id===s.classId); if (cls?.groupId!==filterGroup) return false; }
      return true;
    }).sort((a,b)=>b.date.localeCompare(a.date));
  }, [sessions, filterDateFrom, filterDateTo, filterGroup, filtersApplied]);

  const sessionStats = (s) => ({ members:records.filter(r=>r.sessionId===s.id&&r.present).length, visitors:s.visitors||0 });

  const exportCsv = () => {
    // Detailed: one row per person per session
    const rows = [["Date","Class","Group","First Name","Last Name","Status","Visitors"]];
    filteredSessions.forEach(s => {
      const cls = classes.find(c=>c.id===s.classId);
      const grp = groups.find(g=>g.id===cls?.groupId);
      // Present members
      const presentRecords = records.filter(r=>r.sessionId===s.id&&r.present);
      if (presentRecords.length===0 && (s.visitors||0)===0) {
        rows.push([s.date, cls?.name||"", grp?.name||"", "", "", "No attendees", s.visitors||0]);
      } else {
        presentRecords.forEach((r,ri) => {
          const person = people.find(p=>p.id===r.personId);
          const fn = person ? person.firstName||"" : "(deleted)";
          const ln = person ? person.lastName||"" : "";
          rows.push([s.date, cls?.name||"", grp?.name||"", fn, ln, "Present", ri===0?s.visitors||0:""]);
        });
      }
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download="attendance-detail.csv"; a.click();
  };

  const toggleRecord = (sessionId, personId) => {
    const ex=records.find(r=>r.sessionId===sessionId&&r.personId===personId);
    if (ex) setRecords(prev=>prev.map(r=>r.id===ex.id?{...r,present:!r.present}:r));
    else    setRecords(prev=>[...prev,{id:uid(),sessionId,personId,present:true}]);
  };

  const inputStyle = { width:"100%", padding:"8px 10px", border:"1px solid var(--color-border-tertiary)", borderRadius:8, background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontSize:13 };

  return (
    <div>
      <PageHeader title="Attendance History" actions={
        filtersApplied && <button onClick={exportCsv} style={{ padding:"9px 16px", background:"var(--color-background-secondary)", border:"1px solid var(--color-border-tertiary)", borderRadius:8, cursor:"pointer", fontSize:14, color:"var(--color-text-primary)", display:"flex", alignItems:"center", gap:6 }}>
          <i className="ti ti-download" style={{ fontSize:15 }} />Export CSV
        </button>
      } />

      {/* Filters */}
      <div style={{ background:"var(--color-background-primary)", border:"1px solid var(--color-border-tertiary)", borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1rem" }}>
        <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:600, color:"var(--color-text-secondary)" }}>Apply filters to view records</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
          <div>
            <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:3 }}>From Date</label>
            <input type="date" value={filterDateFrom} onChange={e=>setFilterDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:3 }}>To Date</label>
            <input type="date" value={filterDateTo} onChange={e=>setFilterDateTo(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:3 }}>Group</label>
            <select value={filterGroup} onChange={e=>setFilterGroup(e.target.value)} style={inputStyle}>
              <option value="">All Groups</option>
              {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        {filtersApplied && (
          <button onClick={()=>{setFilterDateFrom("");setFilterDateTo("");setFilterGroup("");}} style={{ fontSize:12, color:"#3b5bdb", background:"none", border:"none", cursor:"pointer", marginTop:8, padding:0 }}>
            ✕ Clear all filters
          </button>
        )}
      </div>

      {!filtersApplied ? (
        <div style={{ textAlign:"center", padding:"3rem 1rem", color:"var(--color-text-secondary)" }}>
          <i className="ti ti-filter" style={{ fontSize:40, display:"block", marginBottom:"0.75rem", opacity:0.4 }} />
          <p style={{ margin:0, fontSize:15, fontWeight:500 }}>Select a date range or group above to view history</p>
        </div>
      ) : filteredSessions.length===0 ? <Empty msg="No sessions found for the selected filters" /> : (
        <div style={{ display:"grid", gap:8 }}>
          {filteredSessions.map(s => {
            const cls=classes.find(c=>c.id===s.classId);
            const grp=groups.find(g=>g.id===cls?.groupId);
            const pal=cls?getGroupPalette(cls.groupId,groups):null;
            const st=sessionStats(s);
            const isExpanded=editSession===s.id;
            // Show only present records in expanded view
            const sessionPresentPeople = people.filter(p=>records.find(r=>r.sessionId===s.id&&r.personId===p.id&&r.present));
            // Also include deleted people who were present
            const presentRecordIds = records.filter(r=>r.sessionId===s.id&&r.present).map(r=>r.personId);
            const allPresentPeople = presentRecordIds.map(pid=>people.find(p=>p.id===pid)||{id:pid,firstName:"(deleted)",lastName:"",classIds:[]});
            return (
              <div key={s.id} style={{ background:"var(--color-background-primary)", border:`1.5px solid ${pal?pal.border:"var(--color-border-tertiary)"}`, borderRadius:12, overflow:"hidden" }}>
                <div style={{ padding:"0.9rem 1.25rem", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", borderLeft:`4px solid ${pal?pal.accent:"#3b5bdb"}` }}>
                  <div style={{ flex:1, minWidth:120 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      <p style={{ margin:0, fontWeight:600, fontSize:15, color:"var(--color-text-primary)" }}>{cls?.name}</p>
                      {grp && <GroupBadge groupId={grp.id} groups={groups} label={grp.name} />}
                    </div>
                    <p style={{ margin:0, fontSize:13, color:"var(--color-text-secondary)" }}>{isoToDisplay(s.date)}</p>
                  </div>
                  <div style={{ display:"flex", gap:16, fontSize:13 }}>
                    <span><strong style={{ color:"var(--color-text-primary)" }}>{st.members}</strong> <span style={{ color:"var(--color-text-secondary)" }}>mbr</span></span>
                    <span><strong style={{ color:pal?pal.accent:"#d85a30" }}>{st.visitors}</strong> <span style={{ color:"var(--color-text-secondary)" }}>vis</span></span>
                    <strong style={{ color:"var(--color-text-primary)" }}>{st.members+st.visitors} total</strong>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setEditSession(isExpanded?null:s.id)} style={{ padding:"6px 12px", border:"1px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)", borderRadius:6, cursor:"pointer", fontSize:12, color:"var(--color-text-primary)" }}>{isExpanded?"Close":"Edit"}</button>
                    <button onClick={()=>setDelConfirm(s.id)} style={{ padding:"6px", background:"#fcebeb", border:"1px solid #f7c1c1", borderRadius:6, cursor:"pointer", color:"#a32d2d" }}><i className="ti ti-trash" style={{ fontSize:14 }} /></button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop:`1px solid ${pal?pal.border:"var(--color-border-tertiary)"}`, padding:"1rem 1.25rem", background:pal?pal.bg:"var(--color-background-secondary)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"0.75rem" }}>
                      <label style={{ fontSize:13, color:pal?pal.text:"var(--color-text-secondary)" }}>Visitors:</label>
                      <input type="number" min={0} value={s.visitors||0} onChange={e=>setSessions(prev=>prev.map(x=>x.id===s.id?{...x,visitors:Math.max(0,parseInt(e.target.value)||0)}:x))}
                        style={{ width:70, padding:"6px 10px", border:"1px solid var(--color-border-tertiary)", borderRadius:6, background:"#fff", color:"#1a2744", fontSize:13, textAlign:"center" }} />
                    </div>
                    {/* Only show present people */}
                    <p style={{ fontSize:12, fontWeight:600, color:"#6b7a96", margin:"0 0 6px" }}>PRESENT ({allPresentPeople.length})</p>
                    <div style={{ display:"grid", gap:4 }}>
                      {allPresentPeople.length===0
                        ? <p style={{ fontSize:13, color:"#8896b0", margin:0 }}>No members marked present.</p>
                        : allPresentPeople.map((p,i) => (
                          <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:6, background:i%2===0?"#f4f8ff":"#ffffff", border:"1px solid #dce8fa" }}>
                            <div style={{ width:28, height:28, borderRadius:"50%", background:"#0c8c6e", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:600, flexShrink:0 }}>
                              {initials(p)}
                            </div>
                            <span style={{ flex:1, fontSize:13, color:"var(--color-text-primary)" }}>{fullName(p)}</span>
                            <button onClick={()=>toggleRecord(s.id,p.id)} style={{ padding:"4px 8px", fontSize:11, border:"1px solid #f7c1c1", background:"#fcebeb", borderRadius:5, cursor:"pointer", color:"#a32d2d" }}>Remove</button>
                          </div>
                        ))
                      }
                    </div>
                    {/* Add absent members back */}
                    <div style={{ marginTop:10 }}>
                      {classes.find(c=>c.id===s.classId) && (() => {
                        const classId=s.classId;
                        const absentMembers=people.filter(p=>p.classIds?.includes(classId)&&!allPresentPeople.find(pp=>pp.id===p.id));
                        if (absentMembers.length===0) return null;
                        return (
                          <details>
                            <summary style={{ fontSize:12, color:"#3b5bdb", cursor:"pointer", userSelect:"none" }}>+ Add member as present ({absentMembers.length} absent)</summary>
                            <div style={{ marginTop:6, display:"grid", gap:3 }}>
                              {absentMembers.sort((a,b)=>sortKey(a).localeCompare(sortKey(b))).map(p=>(
                                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:6, background:"#f8faff", border:"1px solid #dce8fa" }}>
                                  <span style={{ flex:1, fontSize:13, color:"#1a2744" }}>{fullName(p)}</span>
                                  <button onClick={()=>toggleRecord(s.id,p.id)} style={{ padding:"3px 10px", fontSize:11, border:"1px solid #b5d4f4", background:"#e6f1fb", borderRadius:5, cursor:"pointer", color:"#0c447c" }}>Mark Present</button>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {delConfirm && <Confirm msg="Delete this entire attendance session and all its records?" onConfirm={()=>{ setRecords(prev=>prev.filter(r=>r.sessionId!==delConfirm)); setSessions(prev=>prev.filter(s=>s.id!==delConfirm)); setDelConfirm(null); }} onClose={()=>setDelConfirm(null)} />}
    </div>
  );
}
