import { useState, useEffect, useCallback } from "react";

// ─── Group Color Palette (two-tone per group by index) ───────────────────────
const GROUP_PALETTES = [
  { bg:"#e6f1fb", border:"#b5d4f4", text:"#0c447c", accent:"#185fa5", icon:"#378add", header:"#dbeafe" },
  { bg:"#e1f5ee", border:"#9fe1cb", text:"#085041", accent:"#0f6e56", icon:"#1d9e75", header:"#d1fae5" },
  { bg:"#faeeda", border:"#fac775", text:"#633806", accent:"#854f0b", icon:"#ba7517", header:"#fef3c7" },
  { bg:"#fbeaf0", border:"#f4c0d1", text:"#4b1528", accent:"#993556", icon:"#d4537e", header:"#fce7f3" },
  { bg:"#eeedfe", border:"#cecbf6", text:"#26215c", accent:"#534ab7", icon:"#7f77dd", header:"#ede9fe" },
  { bg:"#faece7", border:"#f5c4b3", text:"#4a1b0c", accent:"#993c1d", icon:"#d85a30", header:"#ffedd5" },
];
const getGroupPalette = (groupId, groups) => {
  const idx = groups.findIndex(g => g.id === groupId);
  return GROUP_PALETTES[idx % GROUP_PALETTES.length];
};

// ─── Seed Data ───────────────────────────────────────────────────────────────
const SEED_GROUPS = [
  { id: "g1", name: "AM Service", type: "group", order: 0 },
  { id: "g2", name: "PM Service", type: "group", order: 1 },
  { id: "g3", name: "Sunday School", type: "group", order: 2 },
];
const SEED_CLASSES = [
  { id: "c1", name: "Main Church", groupId: "g1", order: 0 },
  { id: "c2", name: "Main Church", groupId: "g2", order: 0 },
  { id: "c3", name: "1st Grade", groupId: "g3", order: 0 },
  { id: "c4", name: "2nd Grade", groupId: "g3", order: 1 },
  { id: "c5", name: "3rd Grade", groupId: "g3", order: 2 },
];
const SEED_PEOPLE = [
  { id: "p1", name: "Alice Johnson", phone: "555-1001", email: "alice@example.com", address: "123 Oak St", parent: "", notes: "Worship team lead", classIds: ["c1", "c2"] },
  { id: "p2", name: "Bob Smith", phone: "555-1002", email: "bob@example.com", address: "456 Maple Ave", parent: "", notes: "", classIds: ["c1"] },
  { id: "p3", name: "Carol White", phone: "555-1003", email: "carol@example.com", address: "789 Pine Rd", parent: "", notes: "Pianist", classIds: ["c1", "c2"] },
  { id: "p4", name: "David Brown", phone: "555-1004", email: "david@example.com", address: "321 Elm St", parent: "", notes: "", classIds: ["c1"] },
  { id: "p5", name: "Emma Davis", phone: "555-1005", email: "emma@example.com", address: "654 Cedar Ln", parent: "Alice Johnson", notes: "", classIds: ["c3"] },
  { id: "p6", name: "Frank Miller", phone: "555-1006", email: "", address: "987 Birch Blvd", parent: "", notes: "Usher", classIds: ["c1"] },
  { id: "p7", name: "Grace Wilson", phone: "555-1007", email: "grace@example.com", address: "135 Walnut Dr", parent: "Bob Smith", notes: "", classIds: ["c3", "c4"] },
  { id: "p8", name: "Henry Moore", phone: "555-1008", email: "", address: "246 Spruce Way", parent: "", notes: "", classIds: ["c2"] },
  { id: "p9", name: "Iris Taylor", phone: "555-1009", email: "iris@example.com", address: "357 Ash Ct", parent: "Carol White", notes: "", classIds: ["c4"] },
  { id: "p10", name: "James Anderson", phone: "555-1010", email: "james@example.com", address: "468 Poplar Pl", parent: "", notes: "Elder", classIds: ["c1", "c2"] },
  { id: "p11", name: "Karen Thomas", phone: "555-1011", email: "karen@example.com", address: "579 Hickory Rd", parent: "David Brown", notes: "", classIds: ["c5"] },
  { id: "p12", name: "Leo Jackson", phone: "555-1012", email: "", address: "680 Magnolia St", parent: "", notes: "", classIds: ["c1"] },
];

const today = new Date();
const fmt = (d) => d.toISOString().split("T")[0];
const sunday = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return fmt(d);
};

const SEED_SESSIONS = [
  { id: "s1", classId: "c1", date: sunday(), visitors: 5 },
  { id: "s2", classId: "c2", date: sunday(), visitors: 3 },
  { id: "s3", classId: "c3", date: sunday(), visitors: 1 },
  { id: "s4", classId: "c4", date: sunday(), visitors: 0 },
  { id: "s5", classId: "c5", date: sunday(), visitors: 2 },
  { id: "s6", classId: "c1", date: sunday(-1), visitors: 4 },
  { id: "s7", classId: "c2", date: sunday(-1), visitors: 2 },
];
const SEED_RECORDS = [
  { id: "r1", sessionId: "s1", personId: "p1", present: true },
  { id: "r2", sessionId: "s1", personId: "p2", present: true },
  { id: "r3", sessionId: "s1", personId: "p3", present: true },
  { id: "r4", sessionId: "s1", personId: "p4", present: false },
  { id: "r5", sessionId: "s1", personId: "p6", present: true },
  { id: "r6", sessionId: "s1", personId: "p10", present: true },
  { id: "r7", sessionId: "s1", personId: "p12", present: true },
  { id: "r8", sessionId: "s2", personId: "p3", present: true },
  { id: "r9", sessionId: "s2", personId: "p8", present: true },
  { id: "r10", sessionId: "s2", personId: "p10", present: true },
  { id: "r11", sessionId: "s3", personId: "p5", present: true },
  { id: "r12", sessionId: "s3", personId: "p7", present: true },
  { id: "r13", sessionId: "s4", personId: "p7", present: false },
  { id: "r14", sessionId: "s4", personId: "p9", present: true },
  { id: "r15", sessionId: "s5", personId: "p11", present: true },
  { id: "r16", sessionId: "s6", personId: "p1", present: true },
  { id: "r17", sessionId: "s6", personId: "p2", present: false },
  { id: "r18", sessionId: "s6", personId: "p3", present: true },
  { id: "r19", sessionId: "s6", personId: "p6", present: true },
  { id: "r20", sessionId: "s7", personId: "p3", present: true },
  { id: "r21", sessionId: "s7", personId: "p10", present: true },
];

// ─── Storage ─────────────────────────────────────────────────────────────────
const load = (key, seed) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : seed; }
  catch { return seed; }
};
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Page Switcher ────────────────────────────────────────────────────────────
function PageSwitcher({ page, setPage, navItems }) {
  const [open, setOpen] = useState(false);
  const current = navItems.find(n => n.id === page);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          border: "1px solid var(--color-border-tertiary)",
          background: "var(--color-background-secondary)",
          color: "var(--color-text-primary)", cursor: "pointer", fontSize: 13, fontWeight: 500
        }}
      >
        <i className={`ti ${current?.icon}`} style={{ fontSize: 15 }} />
        {current?.label}
        <i className="ti ti-chevron-down" style={{ fontSize: 13, marginLeft: 2 }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: 10, overflow: "hidden", minWidth: 180,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)"
          }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => { setPage(n.id); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "10px 14px", border: "none", cursor: "pointer",
                background: page === n.id ? "#e6f1fb" : "transparent",
                color: page === n.id ? "#185fa5" : "var(--color-text-primary)",
                fontSize: 14, fontWeight: page === n.id ? 500 : 400,
                borderBottom: "1px solid var(--color-border-tertiary)"
              }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: 16, width: 20, textAlign: "center" }} />
                {n.label}
                {page === n.id && <i className="ti ti-check" style={{ marginLeft: "auto", fontSize: 14, color: "#185fa5" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
function PageHeader({ title, page, setPage, navItems, actions }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>{title}</h2>
        <PageSwitcher page={page} setPage={setPage} navItems={navItems} />
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("ca_auth") === "1");
  const [page, setPage] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  const [groups, setGroups] = useState(() => load("ca_groups", SEED_GROUPS));
  const [classes, setClasses] = useState(() => load("ca_classes", SEED_CLASSES));
  const [people, setPeople] = useState(() => load("ca_people", SEED_PEOPLE));
  const [sessions, setSessions] = useState(() => load("ca_sessions", SEED_SESSIONS));
  const [records, setRecords] = useState(() => load("ca_records", SEED_RECORDS));

  useEffect(() => save("ca_groups", groups), [groups]);
  useEffect(() => save("ca_classes", classes), [classes]);
  useEffect(() => save("ca_people", people), [people]);
  useEffect(() => save("ca_sessions", sessions), [sessions]);
  useEffect(() => save("ca_records", records), [records]);

  const ctx = { groups, setGroups, classes, setClasses, people, setPeople, sessions, setSessions, records, setRecords };

  if (!authed) return <Login onLogin={() => { sessionStorage.setItem("ca_auth", "1"); setAuthed(true); }} />;

  const navItems = [
    { id: "dashboard", icon: "ti-dashboard", label: "Dashboard" },
    { id: "attendance", icon: "ti-clipboard-check", label: "Attendance" },
    { id: "people", icon: "ti-users", label: "People" },
    { id: "groups", icon: "ti-layout-list", label: "Groups" },
    { id: "history", icon: "ti-history", label: "History" },
    { id: "settings", icon: "ti-settings", label: "Settings" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>
      {/* Sidebar desktop */}
      <aside style={{ width: 220, background: "#1a2744", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }} className="desktop-sidebar">
        <div style={{ padding: "1.5rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#3b5bdb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-building-church" style={{ color: "#fff", fontSize: 18 }} />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>Church</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Attendance</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "0.75rem 0.5rem", flex: 1 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px",
              borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2,
              background: page === n.id ? "rgba(59,91,219,0.25)" : "transparent",
              color: page === n.id ? "#7b9fff" : "rgba(255,255,255,0.65)",
              fontSize: 14, fontWeight: page === n.id ? 500 : 400, transition: "all 0.15s"
            }}>
              <i className={`ti ${n.icon}`} style={{ fontSize: 17, width: 20, textAlign: "center" }} />
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => { sessionStorage.removeItem("ca_auth"); setAuthed(false); }} style={{
            display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.45)",
            background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "6px 0"
          }}>
            <i className="ti ti-logout" style={{ fontSize: 16 }} />Sign out
          </button>
        </div>
      </aside>

      {navOpen && <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />}
      <aside style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 220, background: "#1a2744", zIndex: 50,
        transform: navOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s", display: "flex", flexDirection: "column"
      }} className="mobile-drawer">
        <div style={{ padding: "1.5rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#3b5bdb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-building-church" style={{ color: "#fff", fontSize: 18 }} />
              </div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Church Attendance</div>
            </div>
            <button onClick={() => setNavOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 20 }}>
              <i className="ti ti-x" />
            </button>
          </div>
        </div>
        <nav style={{ padding: "0.75rem 0.5rem", flex: 1 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setNavOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
              borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2,
              background: page === n.id ? "rgba(59,91,219,0.25)" : "transparent",
              color: page === n.id ? "#7b9fff" : "rgba(255,255,255,0.65)",
              fontSize: 14, fontWeight: page === n.id ? 500 : 400,
            }}>
              <i className={`ti ${n.icon}`} style={{ fontSize: 17, width: 20, textAlign: "center" }} />
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ background: "#1a2744", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 30 }} className="mobile-header">
          <button onClick={() => setNavOpen(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: 22, padding: "2px", lineHeight: 1 }}>
            <i className="ti ti-menu-2" />
          </button>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 15, flex: 1 }}>{navItems.find(n => n.id === page)?.label}</span>
          {/* Mobile page switcher */}
          <MobilePageSwitcher page={page} setPage={setPage} navItems={navItems} />
        </header>

        <main style={{ flex: 1, padding: "1.5rem", maxWidth: 1100, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {page === "dashboard" && <Dashboard {...ctx} setPage={setPage} navItems={navItems} />}
          {page === "attendance" && <AttendancePage {...ctx} setPage={setPage} navItems={navItems} />}
          {page === "people" && <PeoplePage {...ctx} setPage={setPage} navItems={navItems} />}
          {page === "groups" && <GroupsPage {...ctx} setPage={setPage} navItems={navItems} />}
          {page === "history" && <HistoryPage {...ctx} setPage={setPage} navItems={navItems} />}
          {page === "settings" && <SettingsPage {...ctx} setPage={setPage} navItems={navItems} setGroups={setGroups} setClasses={setClasses} setPeople={setPeople} setSessions={setSessions} setRecords={setRecords} />}
        </main>
      </div>

      <style>{`
        @media(min-width:768px){.mobile-header{display:none!important}.mobile-drawer{display:none!important}}
        @media(max-width:767px){.desktop-sidebar{display:none!important}}
        *{box-sizing:border-box}
        button:focus-visible{outline:2px solid #3b5bdb;outline-offset:2px}
        input:focus{outline:2px solid #3b5bdb;outline-offset:0}
        select:focus{outline:2px solid #3b5bdb}
      `}</style>
    </div>
  );
}

// Mobile page switcher — compact icon grid in header
function MobilePageSwitcher({ page, setPage, navItems }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
        borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13,
        display: "flex", alignItems: "center", gap: 5
      }}>
        <i className="ti ti-layout-grid" style={{ fontSize: 16 }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100,
            background: "#1a2744", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12, overflow: "hidden", minWidth: 170,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
          }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => { setPage(n.id); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "11px 14px", border: "none", cursor: "pointer",
                background: page === n.id ? "rgba(59,91,219,0.3)" : "transparent",
                color: page === n.id ? "#7b9fff" : "rgba(255,255,255,0.7)",
                fontSize: 14, fontWeight: page === n.id ? 500 : 400,
                borderBottom: "1px solid rgba(255,255,255,0.06)"
              }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: 16, width: 18 }} />
                {n.label}
                {page === n.id && <i className="ti ti-check" style={{ marginLeft: "auto", fontSize: 13, color: "#7b9fff" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (pw === "password") onLogin();
    else { setErr(true); setTimeout(() => setErr(false), 2000); }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1829", padding: "1rem" }}>
      <div style={{ background: "#1a2744", borderRadius: 16, padding: "2.5rem 2rem", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#3b5bdb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <i className="ti ti-building-church" style={{ color: "#fff", fontSize: 32 }} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Church Attendance</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "6px 0 0" }}>Sign in to continue</p>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, display: "block", marginBottom: 6 }}>Password</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Enter password"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: `1px solid ${err ? "#e24b4a" : "rgba(255,255,255,0.15)"}`, background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 15 }} />
          {err && <p style={{ color: "#e24b4a", fontSize: 12, margin: "6px 0 0" }}>Incorrect password. Try "password".</p>}
        </div>
        <button onClick={submit} style={{ width: "100%", padding: "12px", borderRadius: 8, background: "#3b5bdb", border: "none", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
          Sign In
        </button>
      </div>
    </div>
  );
}

// ─── Group Badge ──────────────────────────────────────────────────────────────
function GroupBadge({ groupId, groups, label }) {
  const pal = getGroupPalette(groupId, groups);
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", background: pal.bg, color: pal.text, borderRadius: 4, border: `1px solid ${pal.border}`, fontWeight: 500 }}>
      {label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, total, members, visitors, accent = "#3b5bdb", groupId, groups }) {
  const pal = groupId ? getGroupPalette(groupId, groups) : null;
  const topColor = pal ? pal.accent : accent;
  const bgColor = pal ? pal.header : "var(--color-background-primary)";
  return (
    <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: bgColor, borderBottom: `3px solid ${topColor}`, padding: "0.75rem 1.25rem 0.6rem" }}>
        <p style={{ fontSize: 13, color: pal ? pal.text : "var(--color-text-secondary)", margin: 0, fontWeight: 600 }}>{label}</p>
      </div>
      <div style={{ padding: "0.75rem 1.25rem 1rem" }}>
        <p style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", color: "var(--color-text-primary)", lineHeight: 1 }}>{total}</p>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--color-text-secondary)" }}>
          <span><strong style={{ color: "var(--color-text-primary)" }}>{members}</strong> members</span>
          <span><strong style={{ color: topColor }}>{visitors}</strong> visitors</span>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ groups, classes, people, sessions, records, setPage, navItems }) {
  const ws = weekStart();
  const thisSessions = sessions.filter(s => new Date(s.date) >= ws);

  const classStats = classes.map(cl => {
    const sess = thisSessions.filter(s => s.classId === cl.id);
    const sessIds = sess.map(s => s.id);
    const memberCount = records.filter(r => sessIds.includes(r.sessionId) && r.present).length;
    const visitorCount = sess.reduce((a, s) => a + (s.visitors || 0), 0);
    return { classId: cl.id, classNm: cl.name, groupId: cl.groupId, members: memberCount, visitors: visitorCount, total: memberCount + visitorCount };
  });

  const groupStats = groups.map(g => {
    const gClasses = classStats.filter(cs => cs.groupId === g.id);
    const gSessIds = sessions.filter(s => gClasses.find(c => c.classId === s.classId) && new Date(s.date) >= ws).map(s => s.id);
    const uniquePersons = new Set(records.filter(r => gSessIds.includes(r.sessionId) && r.present).map(r => r.personId));
    const members = uniquePersons.size;
    const visitors = gClasses.reduce((a, c) => a + c.visitors, 0);
    return { ...g, members, visitors, total: members + visitors };
  });

  const allMembers = new Set();
  thisSessions.forEach(s => { records.filter(r => r.sessionId === s.id && r.present).forEach(r => allMembers.add(r.personId)); });
  const totalMembers = allMembers.size;
  const totalVisitors = thisSessions.reduce((a, s) => a + (s.visitors || 0), 0);

  return (
    <div>
      <PageHeader title="This Week" page="dashboard" setPage={setPage} navItems={navItems} />
      <p style={{ color: "var(--color-text-secondary)", fontSize: 14, margin: "-0.5rem 0 1.5rem" }}>
        Week of {ws.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: "2rem" }}>
        <StatCard label="Total Attendance" total={totalMembers + totalVisitors} members={totalMembers} visitors={totalVisitors} accent="#3b5bdb" />
        <StatCard label="Members" total={totalMembers} members={totalMembers} visitors={0} accent="#0c8c6e" />
        <StatCard label="Visitors" total={totalVisitors} members={0} visitors={totalVisitors} accent="#d85a30" />
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-primary)" }}>By Group</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: "2rem" }}>
        {groupStats.map(g => (
          <StatCard key={g.id} label={g.name} total={g.total} members={g.members} visitors={g.visitors} groupId={g.id} groups={groups} />
        ))}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-primary)" }}>By Class</h3>
      <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        {classStats.length === 0 ? <Empty msg="No attendance this week" /> : classStats.map((cs, i) => {
          const pal = getGroupPalette(cs.groupId, groups);
          return (
            <div key={cs.classId} style={{ display: "flex", alignItems: "center", padding: "0.85rem 1.25rem", borderBottom: i < classStats.length - 1 ? "1px solid var(--color-border-tertiary)" : "none", gap: 12 }}>
              <div style={{ width: 4, height: 32, borderRadius: 4, background: pal.accent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: 14, color: "var(--color-text-primary)" }}>{cs.classNm}</span>
                <GroupBadge groupId={cs.groupId} groups={groups} label={groups.find(g => g.id === cs.groupId)?.name} />
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                <span><strong style={{ color: "var(--color-text-primary)" }}>{cs.members}</strong> <span style={{ color: "var(--color-text-secondary)" }}>mbr</span></span>
                <span><strong style={{ color: pal.accent }}>{cs.visitors}</strong> <span style={{ color: "var(--color-text-secondary)" }}>vis</span></span>
                <strong style={{ color: "var(--color-text-primary)", minWidth: 24, textAlign: "right" }}>{cs.total}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "2rem", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => setPage("attendance")} style={{ padding: "10px 20px", background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          <i className="ti ti-clipboard-check" style={{ marginRight: 6 }} />Take Attendance
        </button>
        <button onClick={() => setPage("history")} style={{ padding: "10px 20px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
          <i className="ti ti-history" style={{ marginRight: 6 }} />View History
        </button>
      </div>
    </div>
  );
}

// ─── Attendance Page ──────────────────────────────────────────────────────────
function AttendancePage({ groups, classes, people, sessions, setSessions, records, setRecords, setPage, navItems }) {
  const [selClass, setSelClass] = useState(classes[0]?.id || "");
  const [selDate, setSelDate] = useState(fmt(new Date()));
  const [visitors, setVisitors] = useState(0);
  const [saved, setSaved] = useState(false);

  const cls = classes.find(c => c.id === selClass);
  const grp = cls ? groups.find(g => g.id === cls.groupId) : null;
  const pal = cls ? getGroupPalette(cls.groupId, groups) : null;
  const classMembers = people.filter(p => p.classIds?.includes(selClass));

  const session = sessions.find(s => s.classId === selClass && s.date === selDate);
  const sessionRecords = session ? records.filter(r => r.sessionId === session.id) : [];

  const isPresent = (personId) => {
    if (!session) return false;
    const r = sessionRecords.find(r => r.personId === personId);
    return r ? r.present : false;
  };

  const presentCount = sessionRecords.filter(r => r.present).length;
  const curVisitors = session?.visitors || 0;

  const ensureSession = useCallback(() => {
    let s = sessions.find(s => s.classId === selClass && s.date === selDate);
    if (!s) {
      s = { id: uid(), classId: selClass, date: selDate, visitors: 0 };
      setSessions(prev => [...prev, s]);
    }
    return s;
  }, [selClass, selDate, sessions, setSessions]);

  const toggle = (personId) => {
    const s = ensureSession();
    const existing = records.find(r => r.sessionId === s.id && r.personId === personId);
    if (existing) setRecords(prev => prev.map(r => r.id === existing.id ? { ...r, present: !r.present } : r));
    else setRecords(prev => [...prev, { id: uid(), sessionId: s.id, personId, present: true }]);
    flash();
  };

  const updateVisitors = (v) => {
    const s = ensureSession();
    setSessions(prev => prev.map(x => x.id === s.id ? { ...x, visitors: v } : x));
    setVisitors(v);
    flash();
  };

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  useEffect(() => {
    const s = sessions.find(s => s.classId === selClass && s.date === selDate);
    setVisitors(s?.visitors || 0);
  }, [selClass, selDate, sessions]);

  const markAll = (present) => {
    const s = ensureSession();
    classMembers.forEach(p => {
      const existing = records.find(r => r.sessionId === s.id && r.personId === p.id);
      if (existing) setRecords(prev => prev.map(r => r.id === existing.id ? { ...r, present } : r));
      else if (present) setRecords(prev => [...prev, { id: uid(), sessionId: s.id, personId: p.id, present: true }]);
    });
    flash();
  };

  return (
    <div>
      <PageHeader title="Take Attendance" page="attendance" setPage={setPage} navItems={navItems} />

      <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Date</label>
            <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Class</label>
            <select value={selClass} onChange={e => setSelClass(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14 }}>
              {groups.map(g => (
                <optgroup key={g.id} label={g.name}>
                  {classes.filter(c => c.groupId === g.id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Group color banner */}
        {pal && cls && (
          <div style={{ background: pal.header, border: `1px solid ${pal.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: pal.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: pal.text }}>{cls.name}</span>
            {grp && <span style={{ fontSize: 12, color: pal.text, opacity: 0.7 }}>— {grp.name}</span>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>Visitors:</label>
            <input type="number" min={0} value={visitors} onChange={e => updateVisitors(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: 70, padding: "7px 10px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, textAlign: "center" }} />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            {saved && <span style={{ color: "#0c8c6e", fontSize: 13, fontWeight: 500 }}>✓ Saved</span>}
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{presentCount} present · {curVisitors} visitors</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{classMembers.length} members</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={() => markAll(true)} style={{ padding: "6px 12px", fontSize: 12, border: "1px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-secondary)", cursor: "pointer", color: "var(--color-text-primary)" }}>Mark All Present</button>
          <button onClick={() => markAll(false)} style={{ padding: "6px 12px", fontSize: 12, border: "1px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-secondary)", cursor: "pointer", color: "var(--color-text-primary)" }}>Clear All</button>
        </div>
      </div>

      {classMembers.length === 0 ? (
        <Empty msg="No members assigned to this class" />
      ) : (
        <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          {classMembers.map((person, i) => {
            const present = isPresent(person.id);
            return (
              <div key={person.id} onClick={() => toggle(person.id)} style={{
                display: "flex", alignItems: "center", padding: "1rem 1.25rem",
                borderBottom: i < classMembers.length - 1 ? "1px solid var(--color-border-tertiary)" : "none",
                cursor: "pointer", gap: 14,
                background: present ? "rgba(12,140,110,0.06)" : "transparent", transition: "background 0.15s"
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: present ? "#0c8c6e" : "var(--color-background-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: present ? "#fff" : "var(--color-text-secondary)", fontSize: 15, fontWeight: 600, transition: "all 0.15s"
                }}>{person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)" }}>{person.name}</p>
                  {person.phone && <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{person.phone}</p>}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", border: `2px solid ${present ? "#0c8c6e" : "var(--color-border-secondary)"}`,
                  background: present ? "#0c8c6e" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0
                }}>
                  {present && <i className="ti ti-check" style={{ color: "#fff", fontSize: 14 }} />}
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
function PeoplePage({ groups, classes, people, setPeople, sessions, records, setPage, navItems }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const savePerson = (p) => {
    if (modal.mode === "add") setPeople(prev => [...prev, { ...p, id: uid() }]);
    else setPeople(prev => prev.map(x => x.id === p.id ? p : x));
    setModal(null);
  };

  const del = (id) => { setPeople(prev => prev.filter(p => p.id !== id)); setDelConfirm(null); };

  return (
    <div>
      <PageHeader
        title="People"
        page="people" setPage={setPage} navItems={navItems}
        actions={
          <button onClick={() => setModal({ mode: "add", person: { name: "", phone: "", email: "", address: "", parent: "", notes: "", classIds: [] } })}
            style={{ padding: "9px 18px", background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-plus" />Add Person
          </button>
        }
      />

      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", fontSize: 16 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }} />
      </div>

      {filtered.length === 0 ? <Empty msg="No people found" /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(p => {
            const assignedClasses = classes.filter(c => p.classIds?.includes(c.id));
            return (
              <div key={p.id} style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e6f1fb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#185fa5", fontWeight: 600, fontSize: 14 }}>
                  {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.phone}{p.email ? ` · ${p.email}` : ""}
                  </p>
                  {assignedClasses.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {assignedClasses.map(c => (
                        <GroupBadge key={c.id} groupId={c.groupId} groups={groups} label={c.name} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setModal({ mode: "edit", person: { ...p } })}
                    style={{ padding: "7px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 6, cursor: "pointer", color: "var(--color-text-secondary)" }}>
                    <i className="ti ti-edit" style={{ fontSize: 15 }} />
                  </button>
                  <button onClick={() => setDelConfirm(p.id)}
                    style={{ padding: "7px", background: "#fcebeb", border: "1px solid #f7c1c1", borderRadius: 6, cursor: "pointer", color: "#a32d2d" }}>
                    <i className="ti ti-trash" style={{ fontSize: 15 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <PersonModal person={modal.person} mode={modal.mode} classes={classes} groups={groups} onSave={savePerson} onClose={() => setModal(null)} />}
      {delConfirm && <Confirm msg={`Delete ${people.find(p => p.id === delConfirm)?.name}?`} onConfirm={() => del(delConfirm)} onClose={() => setDelConfirm(null)} />}
    </div>
  );
}

function PersonModal({ person, mode, classes, groups, onSave, onClose }) {
  const [f, setF] = useState(person);
  const upd = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const toggleClass = (cid) => {
    setF(prev => ({ ...prev, classIds: prev.classIds?.includes(cid) ? prev.classIds.filter(x => x !== cid) : [...(prev.classIds || []), cid] }));
  };
  return (
    <Modal title={mode === "add" ? "Add Person" : "Edit Person"} onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        {[["name", "Full Name *"], ["phone", "Phone"], ["email", "Email"], ["address", "Address"], ["parent", "Parent / Guardian"], ["notes", "Notes"]].map(([k, lbl]) => (
          <div key={k}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>{lbl}</label>
            {k === "notes"
              ? <textarea value={f[k] || ""} onChange={e => upd(k, e.target.value)} rows={2}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14, resize: "vertical" }} />
              : <input value={f[k] || ""} onChange={e => upd(k, e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14 }} />
            }
          </div>
        ))}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Assigned Classes</label>
          {groups.map(g => {
            const pal = getGroupPalette(g.id, groups);
            return (
              <div key={g.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: pal.accent }} />
                  <p style={{ fontSize: 12, color: pal.text, margin: 0, fontWeight: 600 }}>{g.name}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 14 }}>
                  {classes.filter(c => c.groupId === g.id).map(c => (
                    <button key={c.id} onClick={() => toggleClass(c.id)} style={{
                      padding: "4px 12px", fontSize: 12, borderRadius: 6, cursor: "pointer", border: "1px solid",
                      background: f.classIds?.includes(c.id) ? pal.accent : pal.bg,
                      color: f.classIds?.includes(c.id) ? "#fff" : pal.text,
                      borderColor: f.classIds?.includes(c.id) ? pal.accent : pal.border
                    }}>{c.name}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", borderRadius: 8, cursor: "pointer", color: "var(--color-text-primary)", fontSize: 14 }}>Cancel</button>
          <button onClick={() => f.name ? onSave(f) : null} style={{ padding: "9px 18px", background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Groups Page ──────────────────────────────────────────────────────────────
function GroupsPage({ groups, setGroups, classes, setClasses, people, setPeople, setPage, navItems }) {
  const [editItem, setEditItem] = useState(null);
  const [addMode, setAddMode] = useState(null);
  const [addName, setAddName] = useState("");
  const [addGroupId, setAddGroupId] = useState("");
  const [delConfirm, setDelConfirm] = useState(null);

  const saveEdit = () => {
    if (!editItem) return;
    if (editItem.type === "group") setGroups(prev => prev.map(g => g.id === editItem.id ? { ...g, name: editItem.name } : g));
    else setClasses(prev => prev.map(c => c.id === editItem.id ? { ...c, name: editItem.name } : c));
    setEditItem(null);
  };

  const addNew = () => {
    if (!addName.trim()) return;
    if (addMode === "group") setGroups(prev => [...prev, { id: uid(), name: addName.trim(), type: "group", order: prev.length }]);
    else setClasses(prev => [...prev, { id: uid(), name: addName.trim(), groupId: addGroupId || groups[0]?.id, order: prev.filter(c => c.groupId === addGroupId).length }]);
    setAddName(""); setAddMode(null);
  };

  const delGroup = (gid) => {
    const cids = classes.filter(c => c.groupId === gid).map(c => c.id);
    setClasses(prev => prev.filter(c => c.groupId !== gid));
    setPeople(prev => prev.map(p => ({ ...p, classIds: p.classIds?.filter(ci => !cids.includes(ci)) || [] })));
    setGroups(prev => prev.filter(g => g.id !== gid));
    setDelConfirm(null);
  };

  const delClass = (cid) => {
    setPeople(prev => prev.map(p => ({ ...p, classIds: p.classIds?.filter(ci => ci !== cid) || [] })));
    setClasses(prev => prev.filter(c => c.id !== cid));
    setDelConfirm(null);
  };

  return (
    <div>
      <PageHeader
        title="Groups & Classes"
        page="groups" setPage={setPage} navItems={navItems}
        actions={<>
          <button onClick={() => { setAddMode("class"); setAddGroupId(groups[0]?.id || ""); }}
            style={{ padding: "9px 14px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "var(--color-text-primary)" }}>
            + Class
          </button>
          <button onClick={() => setAddMode("group")}
            style={{ padding: "9px 14px", background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            + Group
          </button>
        </>}
      />

      {addMode && (
        <div style={{ background: "var(--color-background-primary)", border: "1px solid #3b5bdb", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>New {addMode === "group" ? "Group" : "Class"}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Name"
              style={{ flex: 1, minWidth: 160, padding: "8px 12px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14 }} />
            {addMode === "class" && (
              <select value={addGroupId} onChange={e => setAddGroupId(e.target.value)}
                style={{ padding: "8px 12px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 14 }}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
            <button onClick={addNew} style={{ padding: "8px 16px", background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Add</button>
            <button onClick={() => { setAddMode(null); setAddName(""); }} style={{ padding: "8px 12px", border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", borderRadius: 8, cursor: "pointer", color: "var(--color-text-primary)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {groups.map(g => {
          const pal = getGroupPalette(g.id, groups);
          return (
            <div key={g.id} style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${pal.border}` }}>
              {/* Group header — rich two-tone */}
              <div style={{ padding: "0.9rem 1.25rem", background: pal.header, borderBottom: `2px solid ${pal.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: pal.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="ti ti-layout-list" style={{ fontSize: 14, color: "#fff" }} />
                </div>
                {editItem?.id === g.id
                  ? <input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus
                      style={{ flex: 1, padding: "4px 8px", border: `1px solid ${pal.border}`, borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }} />
                  : <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: pal.text }}>{g.name}</span>
                }
                <span style={{ fontSize: 12, color: pal.text, opacity: 0.7, background: pal.bg, padding: "2px 8px", borderRadius: 4, border: `1px solid ${pal.border}` }}>
                  {classes.filter(c => c.groupId === g.id).length} classes
                </span>
                {editItem?.id === g.id
                  ? <button onClick={saveEdit} style={{ padding: "4px 10px", background: pal.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Save</button>
                  : <button onClick={() => setEditItem({ ...g, type: "group" })} style={{ padding: "5px", background: "transparent", border: "none", cursor: "pointer", color: pal.text, opacity: 0.6 }}>
                      <i className="ti ti-edit" style={{ fontSize: 15 }} />
                    </button>
                }
                <button onClick={() => setDelConfirm({ type: "group", id: g.id, name: g.name })}
                  style={{ padding: "5px", background: "transparent", border: "none", cursor: "pointer", color: "#e24b4a" }}>
                  <i className="ti ti-trash" style={{ fontSize: 15 }} />
                </button>
              </div>

              {/* Classes — lighter two-tone background */}
              {classes.filter(c => c.groupId === g.id).map((cls, i, arr) => (
                <div key={cls.id} style={{
                  padding: "0.7rem 1.25rem 0.7rem 1rem", borderTop: `1px solid ${pal.border}`,
                  background: pal.bg, display: "flex", alignItems: "center", gap: 10
                }}>
                  <div style={{ width: 3, height: 24, borderRadius: 2, background: pal.accent, flexShrink: 0, marginLeft: 8 }} />
                  {editItem?.id === cls.id
                    ? <input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus
                        style={{ flex: 1, padding: "4px 8px", border: `1px solid ${pal.border}`, borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }} />
                    : <span style={{ flex: 1, fontSize: 14, color: pal.text, fontWeight: 500 }}>{cls.name}</span>
                  }
                  <span style={{ fontSize: 12, color: pal.text, opacity: 0.65 }}>{people.filter(p => p.classIds?.includes(cls.id)).length} members</span>
                  {editItem?.id === cls.id
                    ? <button onClick={saveEdit} style={{ padding: "4px 10px", background: pal.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Save</button>
                    : <button onClick={() => setEditItem({ ...cls, type: "class" })} style={{ padding: "5px", background: "transparent", border: "none", cursor: "pointer", color: pal.text, opacity: 0.6 }}>
                        <i className="ti ti-edit" style={{ fontSize: 15 }} />
                      </button>
                  }
                  <button onClick={() => setDelConfirm({ type: "class", id: cls.id, name: cls.name })}
                    style={{ padding: "5px", background: "transparent", border: "none", cursor: "pointer", color: "#e24b4a" }}>
                    <i className="ti ti-trash" style={{ fontSize: 15 }} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {delConfirm && (
        <Confirm
          msg={`Delete "${delConfirm.name}"?${delConfirm.type === "group" ? " This will also delete all classes in this group." : ""}`}
          onConfirm={() => delConfirm.type === "group" ? delGroup(delConfirm.id) : delClass(delConfirm.id)}
          onClose={() => setDelConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({ groups, classes, people, sessions, setSessions, records, setRecords, setPage, navItems }) {
  const [filterDate, setFilterDate] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [editSession, setEditSession] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const filteredSessions = sessions.filter(s => {
    if (filterDate && s.date !== filterDate) return false;
    if (filterGroup) { const cls = classes.find(c => c.id === s.classId); if (cls?.groupId !== filterGroup) return false; }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const sessionStats = (s) => {
    const recs = records.filter(r => r.sessionId === s.id);
    return { members: recs.filter(r => r.present).length, visitors: s.visitors || 0 };
  };

  const exportCsv = () => {
    const rows = [["Date", "Class", "Group", "Members Present", "Visitors", "Total"]];
    filteredSessions.forEach(s => {
      const cls = classes.find(c => c.id === s.classId);
      const grp = groups.find(g => g.id === cls?.groupId);
      const st = sessionStats(s);
      rows.push([s.date, cls?.name || "", grp?.name || "", st.members, st.visitors, st.members + st.visitors]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "attendance.csv"; a.click();
  };

  const toggleRecord = (sessionId, personId) => {
    const existing = records.find(r => r.sessionId === sessionId && r.personId === personId);
    if (existing) setRecords(prev => prev.map(r => r.id === existing.id ? { ...r, present: !r.present } : r));
    else setRecords(prev => [...prev, { id: uid(), sessionId, personId, present: true }]);
  };

  return (
    <div>
      <PageHeader
        title="Attendance History"
        page="history" setPage={setPage} navItems={navItems}
        actions={
          <button onClick={exportCsv} style={{ padding: "9px 16px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-download" style={{ fontSize: 15 }} />Export CSV
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1rem" }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>Filter by Date</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>Filter by Group</label>
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13 }}>
            <option value="">All Groups</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>
      {filterDate && <button onClick={() => setFilterDate("")} style={{ fontSize: 12, color: "#3b5bdb", background: "none", border: "none", cursor: "pointer", marginBottom: "0.75rem", padding: 0 }}>✕ Clear date filter</button>}

      {filteredSessions.length === 0 ? <Empty msg="No sessions found" /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filteredSessions.map(s => {
            const cls = classes.find(c => c.id === s.classId);
            const grp = groups.find(g => g.id === cls?.groupId);
            const pal = cls ? getGroupPalette(cls.groupId, groups) : null;
            const st = sessionStats(s);
            const isExpanded = editSession === s.id;
            const sessionPeople = people.filter(p => p.classIds?.includes(s.classId));
            return (
              <div key={s.id} style={{ background: "var(--color-background-primary)", border: `1.5px solid ${pal ? pal.border : "var(--color-border-tertiary)"}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "0.9rem 1.25rem", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderLeft: `4px solid ${pal ? pal.accent : "#3b5bdb"}` }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)" }}>{cls?.name}</p>
                      {grp && <GroupBadge groupId={grp.id} groups={groups} label={grp.name} />}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>{new Date(s.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                    <span><strong style={{ color: "var(--color-text-primary)" }}>{st.members}</strong> <span style={{ color: "var(--color-text-secondary)" }}>mbr</span></span>
                    <span><strong style={{ color: pal ? pal.accent : "#d85a30" }}>{st.visitors}</strong> <span style={{ color: "var(--color-text-secondary)" }}>vis</span></span>
                    <strong style={{ color: "var(--color-text-primary)" }}>{st.members + st.visitors} total</strong>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditSession(isExpanded ? null : s.id)}
                      style={{ padding: "6px 12px", border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "var(--color-text-primary)" }}>
                      {isExpanded ? "Close" : "Edit"}
                    </button>
                    <button onClick={() => setDelConfirm(s.id)}
                      style={{ padding: "6px", background: "#fcebeb", border: "1px solid #f7c1c1", borderRadius: 6, cursor: "pointer", color: "#a32d2d" }}>
                      <i className="ti ti-trash" style={{ fontSize: 14 }} />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${pal ? pal.border : "var(--color-border-tertiary)"}`, padding: "1rem 1.25rem", background: pal ? pal.bg : "var(--color-background-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem" }}>
                      <label style={{ fontSize: 13, color: pal ? pal.text : "var(--color-text-secondary)" }}>Visitors:</label>
                      <input type="number" min={0} value={s.visitors || 0}
                        onChange={e => setSessions(prev => prev.map(x => x.id === s.id ? { ...x, visitors: Math.max(0, parseInt(e.target.value) || 0) } : x))}
                        style={{ width: 70, padding: "6px 10px", border: "1px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 13, textAlign: "center" }} />
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {sessionPeople.map(p => {
                        const present = records.find(r => r.sessionId === s.id && r.personId === p.id)?.present || false;
                        return (
                          <div key={p.id} onClick={() => toggleRecord(s.id, p.id)} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                            background: present ? "rgba(12,140,110,0.1)" : "var(--color-background-primary)",
                          }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: present ? "#0c8c6e" : "var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                              {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)" }}>{p.name}</span>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${present ? "#0c8c6e" : "var(--color-border-secondary)"}`, background: present ? "#0c8c6e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {present && <i className="ti ti-check" style={{ color: "#fff", fontSize: 11 }} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {delConfirm && (
        <Confirm msg="Delete this attendance session?" onConfirm={() => {
          setRecords(prev => prev.filter(r => r.sessionId !== delConfirm));
          setSessions(prev => prev.filter(s => s.id !== delConfirm));
          setDelConfirm(null);
        }} onClose={() => setDelConfirm(null)} />
      )}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsPage({ setGroups, setClasses, setPeople, setSessions, setRecords, setPage, navItems }) {
  const [resetConfirm, setResetConfirm] = useState(false);
  const doReset = () => {
    setGroups(SEED_GROUPS); setClasses(SEED_CLASSES); setPeople(SEED_PEOPLE);
    setSessions(SEED_SESSIONS); setRecords(SEED_RECORDS);
    setResetConfirm(false);
  };
  return (
    <div>
      <PageHeader title="Settings" page="settings" setPage={setPage} navItems={navItems} />
      <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1.5rem", maxWidth: 500 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 0.5rem", color: "var(--color-text-primary)" }}>Data Management</h3>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 1rem" }}>All data is stored locally in your browser. Use the export feature in History to backup attendance records.</p>
        <button onClick={() => setResetConfirm(true)} style={{ padding: "9px 18px", background: "#fcebeb", border: "1px solid #f7c1c1", borderRadius: 8, cursor: "pointer", color: "#a32d2d", fontWeight: 600, fontSize: 14 }}>
          Reset to Demo Data
        </button>
      </div>
      {resetConfirm && <Confirm msg="Reset all data to demo data? This cannot be undone." onConfirm={doReset} onClose={() => setResetConfirm(false)} />}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
function Empty({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)" }}>
      <i className="ti ti-inbox" style={{ fontSize: 36, display: "block", marginBottom: "0.5rem" }} />
      <p style={{ margin: 0, fontSize: 14 }}>{msg}</p>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--color-background-primary)", zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20, padding: "2px", lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>{children}</div>
      </div>
    </div>
  );
}

function Confirm({ msg, onConfirm, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 12, padding: "1.5rem", maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <p style={{ margin: "0 0 1.25rem", fontSize: 15, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{msg}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", borderRadius: 8, cursor: "pointer", color: "var(--color-text-primary)", fontSize: 14 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", background: "#e24b4a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
