import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  Download,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Package,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Truck,
  Users,
  X,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

const demoUsers = {
  FARMER: {
    name: "Asha Kumari",
    state: "Jharkhand",
    district: "Khunti",
    phone: "9876543210",
  },
  OFFICER: {
    name: "Ravi Verma",
    state: "Jharkhand",
    district: "Ranchi",
    phone: "9876543211",
  },
  DISTRIBUTOR: {
    name: "Kunal Agrawal",
    state: "Jharkhand",
    district: "Ranchi",
    phone: "9876543213",
  },
  ADMIN: {
    name: "Nisha Sinha",
    state: "Jharkhand",
    district: "Ranchi",
    phone: "9876543212",
  },
};
const initialBookings = [
  {
    id: 1,
    token: "KS-8F4D2A",
    farmer: "Asha Kumari",
    crop: "Paddy",
    quantity: 35,
    unit: "quintal",
    centre: "Ranchi Central",
    date: "02 Sep 2026 · 09:30 AM",
    position: 4,
    wait: 32,
    status: "WAITING",
    grade: null,
    payment: "PENDING",
  },
  {
    id: 2,
    token: "KS-7B1C90",
    farmer: "Vikram Oraon",
    crop: "Maize",
    quantity: 18,
    unit: "quintal",
    centre: "Ranchi Central",
    date: "02 Sep 2026 · 10:00 AM",
    position: 5,
    wait: 41,
    status: "WAITING",
    grade: null,
    payment: "PENDING",
  },
  {
    id: 3,
    token: "KS-2E6A11",
    farmer: "Sunita Devi",
    crop: "Paddy",
    quantity: 26,
    unit: "quintal",
    centre: "Khunti Collection",
    date: "02 Sep 2026 · 09:00 AM",
    position: 2,
    wait: 16,
    status: "PROCUREMENT_COMPLETED",
    grade: "A",
    payment: "COMPLETED",
  },
];
const centres = [
  {
    name: "Ranchi Central",
    code: "JH-RNC-01",
    district: "Ranchi",
    load: 68,
    queue: 4,
    wait: 32,
    coords: [23.3441, 85.3096],
    categories: ["Paddy / Rice", "Maize", "Wheat", "Pulses"],
    status: "Open",
  },
  {
    name: "Khunti Collection",
    code: "JH-KHT-02",
    district: "Khunti",
    load: 42,
    queue: 2,
    wait: 16,
    coords: [23.076, 85.278],
    categories: ["Paddy / Rice", "Pulses"],
    status: "Open",
  },
  {
    name: "Hazaribagh Mandi",
    code: "JH-HZB-04",
    district: "Hazaribagh",
    load: 88,
    queue: 9,
    wait: 74,
    coords: [23.9966, 85.3691],
    categories: ["Paddy / Rice", "Maize", "Mustard"],
    status: "Busy",
  },
];
const crops = [
  {
    name: "Paddy",
    variety: "Swarna",
    stock: 950,
    unit: "quintal",
    price: 2320,
    category: "Cereals",
  },
  {
    name: "Maize",
    variety: "Hybrid 909",
    stock: 420,
    unit: "quintal",
    price: 2180,
    category: "Cereals",
  },
  {
    name: "Arhar Dal",
    variety: "Desi",
    stock: 180,
    unit: "quintal",
    price: 6400,
    category: "Pulses",
  },
];
const cropOptions = ["Paddy", "Maize", "Wheat", "Bajra", "Jowar", "Ragi", "Barley", "Arhar Dal", "Moong Dal", "Urad Dal", "Masoor Dal", "Chana", "Groundnut", "Mustard", "Soybean", "Sunflower", "Cotton", "Sugarcane", "Potato", "Onion", "Tomato", "Chilli", "Turmeric", "Ginger", "Garlic"];
const procurementCommodities = ["Paddy / Rice", "Wheat", "Maize", "Pulses", "Cotton", "Mustard"];
const stateOptions = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Jammu and Kashmir"];
const stateFromCoordinates = ({ latitude, longitude }) => latitude > 21 && latitude < 26 && longitude > 83 && longitude < 88 ? "Jharkhand" : latitude > 17 && latitude < 21 && longitude > 72 && longitude < 80 ? "Maharashtra" : latitude > 29 && longitude > 73 && longitude < 80 ? "Punjab" : latitude > 24 && latitude < 31 && longitude > 77 && longitude < 84 ? "Uttar Pradesh" : "Jharkhand";
const marketCrops = cropOptions.map((name, index) => ({ name, variety: index % 2 ? "Farm grade" : "State verified", stock: 80 + index * 18, unit: "quintal", price: 1800 + index * 175, category: index % 3 === 0 ? "Cereals" : index % 3 === 1 ? "Pulses" : "Oilseeds" }));
const statusLabel = {
  WAITING: "Waiting",
  FARMER_VERIFIED: "Verified",
  WEIGHING: "Weighing",
  QUALITY_CHECK: "Quality check",
  QUALITY_FAILED: "Quality failed",
  PROCUREMENT_COMPLETED: "Procurement done",
  PAYMENT_PROCESSING: "Payment processing",
  PAYMENT_COMPLETED: "Paid",
};
const steps = [
  "BOOKED",
  "FARMER_VERIFIED",
  "WEIGHING",
  "QUALITY_CHECK",
  "PROCUREMENT_COMPLETED",
  "PAYMENT_PROCESSING",
  "PAYMENT_COMPLETED",
];
const chartData = [
  { day: "26 Aug", value: 18 },
  { day: "27 Aug", value: 25 },
  { day: "28 Aug", value: 31 },
  { day: "29 Aug", value: 22 },
  { day: "30 Aug", value: 39 },
  { day: "31 Aug", value: 34 },
  { day: "01 Sep", value: 46 },
];
const chartRanges = {
  "7 days": chartData,
  Month: [
    { day: "01 Aug", value: 120 }, { day: "05 Aug", value: 148 }, { day: "10 Aug", value: 132 },
    { day: "15 Aug", value: 176 }, { day: "20 Aug", value: 204 }, { day: "25 Aug", value: 238 }, { day: "31 Aug", value: 264 },
  ],
  Quarter: [
    { day: "Jun", value: 520 }, { day: "Jul", value: 680 }, { day: "Aug", value: 842 },
  ],
};
const notify = (title, message, type = "Queue") => ({
  id: Date.now(),
  title,
  message,
  type,
  time: "Just now",
});
const rolePath = (role, page) => {
  const base = role === "FARMER" ? "/farmer" : role === "OFFICER" ? "/officer" : role === "ADMIN" ? "/admin" : "/distributor";
  const pagePath = { overview: "dashboard", history: "procurement", book: "book", queue: "queue", harvest: "harvest", centres: "centres", stock: "stock", orders: "orders" }[page] || "dashboard";
  return `${base}/${pagePath}`;
};
const pageFromPath = (pathname) => {
  const value = pathname.split("/").filter(Boolean).pop();
  return { dashboard: "overview", procurement: "history", book: "book", queue: "queue", harvest: "harvest", centres: "centres", stock: "stock", orders: "orders" }[value] || "overview";
};

function App() {
  const [user, setUser] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("ks-user") || "null");
    return stored?.role ? stored : null;
  });
  const [bookings, setBookings] = useState(
    () =>
      JSON.parse(localStorage.getItem("ks-bookings") || "null") ||
      initialBookings,
  );
  const [notifications, setNotifications] = useState(
    () =>
      JSON.parse(localStorage.getItem("ks-notifications") || "null") || [
        notify(
          "Welcome to KisanSetu",
          "Your state procurement workspace is ready.",
          "Booking",
        ),
      ],
  );
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname));
  const [toast, setToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(
    () => localStorage.setItem("ks-bookings", JSON.stringify(bookings)),
    [bookings],
  );
  useEffect(
    () =>
      localStorage.setItem("ks-notifications", JSON.stringify(notifications)),
    [notifications],
  );
  useEffect(() => {
    if (user) localStorage.setItem("ks-user", JSON.stringify(user));
    else localStorage.removeItem("ks-user");
  }, [user]);
  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const protectedPath = /^\/(farmer|officer|admin|distributor)\//.test(window.location.pathname);
    if (!user && protectedPath) window.history.replaceState({}, "", "/login");
    if (user && !window.location.pathname.startsWith(`/${user.role.toLowerCase()}/`)) window.history.replaceState({}, "", rolePath(user.role, page));
  }, [user, page]);
  useEffect(() => {
    if (!user) return undefined;
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:4000",
      { autoConnect: false },
    );
    socket.connect();
    socket.emit("join-state", user.state);
    return () => socket.disconnect();
  }, [user]);
  const flash = (title, message) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 3200);
  };
  const addNotice = (title, message, type) =>
    setNotifications((current) => [notify(title, message, type), ...current]);
  const login = (role, registeredName, registeredPhone, registeredState) => {
    setUser({ ...demoUsers[role], name: registeredName || demoUsers[role].name, phone: registeredPhone || demoUsers[role].phone, state: registeredState || demoUsers[role].state, role });
    setPage("overview");
    window.history.pushState({}, "", rolePath(role, "overview"));
    flash("Demo session started", `Welcome, ${registeredName || demoUsers[role].name}`);
  };
  const navigatePage = (nextPage) => {
    setPage(nextPage);
    window.history.pushState({}, "", rolePath(user.role, nextPage));
  };
  const logout = () => { setUser(null); setPage("overview"); window.history.pushState({}, "", "/login"); };
  const updateBooking = (id, status, extra = {}) => {
    setBookings((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status, ...extra } : item,
      ),
    );
    const booking = bookings.find((item) => item.id === id);
    if (booking) {
      addNotice(
        "Procurement update",
        `${booking.token} is now ${statusLabel[status] || status}.`,
        status === "PAYMENT_COMPLETED" ? "Payment" : "Procurement",
      );
      flash(
        "Queue updated",
        `${booking.token} moved to ${statusLabel[status] || status}`,
      );
    }
  };
  const createBooking = (booking) => setBookings((current) => [{ ...booking, id: Date.now(), farmer: user.name, status: "BOOKED", position: current.length + 1, wait: 32, token: booking.token || `KS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, payment: "PENDING" }, ...current]);
  if (!user) return <Login onLogin={login} />;
  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        page={page}
        setPage={navigatePage}
        logout={logout}
        mobileOpen={mobileNavOpen}
        closeMobile={() => setMobileNavOpen(false)}
          onProfile={() => setProfileOpen(true)}
          onStateChange={(state) => setUser((current) => ({ ...current, state }))}
      />
      <main className="main">
        <Topbar
          user={user}
          notifications={notifications}
          onMenu={() => setMobileNavOpen(true)}
          onNotifications={() => setNotificationOpen(true)}
              onProfile={() => setProfileOpen(true)}
        />
        <div className="page-content">
          {user.role === "FARMER" && (
              <Farmer
                user={user}
              page={page}
              bookings={bookings}
              updateBooking={updateBooking}
              addNotice={addNotice}
              flash={flash}
              setPage={navigatePage}
              createBooking={createBooking}
            />
          )}
          {user.role === "OFFICER" && (
            <Officer
              page={page}
              bookings={bookings}
              updateBooking={updateBooking}
            />
          )}
          {user.role === "DISTRIBUTOR" && <Distributor page={page} setPage={navigatePage} />}
          {user.role === "ADMIN" && <Admin page={page} setPage={navigatePage} bookings={bookings} user={user} />}
        </div>
      </main>
      {mobileNavOpen && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      {notificationOpen && <NotificationPanel notifications={notifications} close={() => setNotificationOpen(false)} markRead={(id) => setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item))} />}
      {profileOpen && <ProfileModal user={user} close={() => setProfileOpen(false)} save={(profile) => { setUser((current) => ({ ...current, ...profile })); setProfileOpen(false); flash("Profile updated", "Your account details were saved."); }} />}
      {toast && (
        <div className="toast">
          <Check size={18} />
          <div>
            <b>{toast.title}</b>
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationPanel({ notifications, close, markRead }) {
  return <div className="overlay-layer"><section className="side-panel"><div className="side-panel-head"><div><p className="kicker">Inbox</p><h2>Notifications</h2></div><button className="modal-close" onClick={close}><X size={18} /></button></div><div className="notification-panel-list">{notifications.length ? notifications.map((item) => <button className={item.read ? "notification-item read" : "notification-item"} key={item.id} onClick={() => markRead(item.id)}><span className={`notice-icon ${(item.type || "Queue").toLowerCase()}`}><Bell size={15} /></span><span><b>{item.title}</b><small>{item.message}</small><time>{item.time || "Recently"}</time></span>{!item.read && <i />}</button>) : <p className="empty">No notifications yet.</p>}</div><button className="outline-button wide" onClick={() => notifications.forEach((item) => markRead(item.id))}>Mark all as read</button></section></div>;
}

function ProfileModal({ user, close, save }) {
  const [form, setForm] = useState({ name: user.name, location: user.location || "Khunti, Jharkhand", image: user.image || "" });
  const [editing, setEditing] = useState(false);
  return <div className="overlay-layer"><section className="modal profile-modal"><button className="modal-close" onClick={close}><X size={18} /></button><p className="kicker">Account settings</p><h2>Your profile</h2><div className="profile-photo-wrap"><span className="profile-photo">{form.image ? <img src={form.image} alt="Profile" /> : form.name.split(" ").map((x) => x[0]).join("")}</span>{editing && <label className="photo-button">Change photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) setForm({ ...form, image: URL.createObjectURL(file) }); }} /></label>}</div>{editing ? <><label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><div className="profile-modal-actions"><button className="outline-button" onClick={() => { setForm({ name: user.name, location: user.location || "Khunti, Jharkhand", image: user.image || "" }); setEditing(false); }}>Cancel</button><button className="primary" onClick={() => { save(form); setEditing(false); }}>Save changes</button></div></> : <><div className="profile-readonly"><div><small>Full name</small><b>{form.name}</b></div><div><small>Role</small><b>{user.role === "ADMIN" ? "Administrator" : user.role[0] + user.role.slice(1).toLowerCase()}</b></div><div><small>Location</small><b>{form.location}</b></div><div><small>State</small><b>{user.state}</b></div></div><button className="primary wide edit-profile-button" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profile</button></>}</section></div>;
}

function Login({ onLogin }) {
  const [role, setRole] = useState("FARMER");
  const [screen, setScreen] = useState("roles");
  const [mode, setMode] = useState(null);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [registerForm, setRegisterForm] = useState({ mobile: "", name: "", aadhaar: "", state: "Jharkhand", location: "" });
  const [registerError, setRegisterError] = useState("");
  const [loginPhone, setLoginPhone] = useState(demoUsers.FARMER.phone);
  const [loginError, setLoginError] = useState("");
  const roleOptions = [
    ["FARMER", "Farmer", "Manage harvest and procurement bookings", Sprout],
    ["DISTRIBUTOR", "Distributor", "List crops and track supply orders", Truck],
    ["ADMIN", "Administrator", "Monitor state-wide procurement", ShieldCheck],
  ];
  if (screen === "roles")
    return (
      <div className="login">
        <div className="login-art">
          <BrandMark />
          <div className="art-copy">
            <p className="kicker">Smart procurement network</p>
            <h1>From harvest<br /><em>to prosperity.</em></h1>
            <p>One clear path for every farmer, every centre, and every state.</p>
          </div>
          <div className="art-foot"><span><ShieldCheck size={16} /> Demo-safe workspace</span><span><MapPin size={16} /> 4 states connected</span></div>
        </div>
        <div className="login-form role-picker">
          <div className="mobile-brand brand"><span className="brand-icon"><Sprout size={20} /></span><b>Kisan<span>Setu</span></b></div>
          <p className="kicker">Welcome to KisanSetu</p>
          <h2>Choose your workspace</h2>
          <p className="subtle">Select how you use the platform to continue.</p>
          <div className="role-grid">{roleOptions.map(([value, title, description, Icon]) => <button className="role-card" key={value} onClick={() => { setRole(value); setScreen("access"); }}><span className="role-card-icon"><Icon size={20} /></span><span><b>{title}</b><small>{description}</small></span><ChevronRight size={16} /></button>)}</div>
          <p className="demo-note"><span className="dot" /> Simple demo access · no password required</p>
        </div>
      </div>
    );
  return (
    <div className="login">
      <div className="login-art">
        <div className="brand">
          <span className="brand-icon">
            <Sprout size={23} />
          </span>
          <b>
            Kisan<span>Setu</span>
          </b>
        </div>
        <div className="art-copy">
          <p className="kicker">Smart procurement network</p>
          <h1>
            From harvest
            <br />
            <em>to prosperity.</em>
          </h1>
          <p>One clear path for every farmer, every centre, and every state.</p>
        </div>
        <div className="art-foot">
          <span>
            <ShieldCheck size={16} /> Demo-safe workspace
          </span>
          <span>
            <MapPin size={16} /> 4 states connected
          </span>
        </div>
      </div>
      <div className="login-form">
        <button className="back-link login-back" onClick={() => { setScreen("roles"); setMode(null); setSent(false); }}>Back to workspaces</button>
        <div className="mobile-brand brand">
          <span className="brand-icon">
            <Sprout size={20} />
          </span>
          <b>
            Kisan<span>Setu</span>
          </b>
        </div>
        <p className="kicker">Welcome back</p>
        <h2>Sign in to your workspace</h2>
        <p className="subtle">
          Use a demo role to explore the complete procurement journey.
        </p>
        {!mode ? <div className="auth-choice"><button className="primary" onClick={() => { setMode("login"); setLoginPhone(demoUsers[role].phone); setLoginError(""); }}>Login</button><button className="outline-button" onClick={() => { setMode("register"); setSent(false); setRegisterError(""); }}>Register</button></div> : <>
        {mode === "register" && !sent && <>
        <div className="register-title"><span className="role-card-icon"><Sprout size={18} /></span><div><b>Register as {role === "FARMER" ? "Kisan Mitra" : role[0] + role.slice(1).toLowerCase()}</b><small>Create your simple demo account.</small></div></div>
        <label>Full name<input value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} placeholder="Enter your name" required /></label>
        <label>Mobile number<input type="tel" inputMode="numeric" value={registerForm.mobile} onChange={(e) => setRegisterForm({ ...registerForm, mobile: e.target.value })} placeholder="10-digit mobile number" maxLength={10} required /></label>
        <label>Aadhaar number<input type="password" inputMode="numeric" value={registerForm.aadhaar} onChange={(e) => setRegisterForm({ ...registerForm, aadhaar: e.target.value })} placeholder="12-digit Aadhaar number" maxLength={12} required /></label>
        <label>State<select value={registerForm.state} onChange={(e) => setRegisterForm({ ...registerForm, state: e.target.value })}>{stateOptions.map((state) => <option key={state}>{state}</option>)}</select></label>
        <label>Location<input value={registerForm.location} onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })} placeholder="Village or area" required /><button type="button" className="detect-location" onClick={() => { if (!navigator.geolocation) { setRegisterError("Location detection is not available on this device."); return; } navigator.geolocation.getCurrentPosition(({ coords }) => { const detectedState = stateFromCoordinates(coords); setRegisterForm({ ...registerForm, state: detectedState, location: `${detectedState} · detected location` }); }, () => setRegisterError("Location permission was not granted. You can enter it manually.")); }}>Detect my state & location</button></label>
        <button className="primary wide" onClick={() => { if (registerForm.mobile.length !== 10 || registerForm.name.trim().length < 2 || registerForm.aadhaar.length !== 12 || !registerForm.location) { setRegisterError("Complete your name, mobile, Aadhaar, state, and location first."); return; } setSent(true); setRegisterError(""); }}>Get OTP <ArrowRight size={17} /></button>
        </>}
        {mode === "register" && sent && <>
        <p className="register-identity"><b>{registerForm.name || "Kisan Mitra"}</b><span>{registerForm.mobile}</span></p>
        <label>Enter OTP<input value={otp} onChange={(e) => { setOtp(e.target.value); setRegisterError(""); }} placeholder="Enter 123456" inputMode="numeric" maxLength={6} /></label>
        <button className="primary wide" onClick={() => { if (otp !== "123456") { setRegisterError("Invalid OTP. Please enter the correct demo OTP."); return; } const saved = JSON.parse(localStorage.getItem("ks-registered-users") || "[]"); saved.push({ ...demoUsers[role], name: registerForm.name || "Kisan Mitra", phone: registerForm.mobile, state: registerForm.state, location: registerForm.location, role, aadhaar: registerForm.aadhaar }); localStorage.setItem("ks-registered-users", JSON.stringify(saved)); onLogin(role, registerForm.name || "Kisan Mitra", registerForm.mobile, registerForm.state); }}>Verify OTP & continue <ArrowRight size={17} /></button>
        </>}
        {mode === "register" && registerError && <p className="error register-error">{registerError}</p>}
        {mode === "register" && <p className="demo-note"><span className="dot" /> Demo OTP is <b>123456</b></p>}
        {mode === "login" && <>
        <label>
          Mobile number
          <div className="phone-input">
            <span>+91</span>
            <input type="tel" inputMode="numeric" value={loginPhone} onChange={(e) => { setLoginPhone(e.target.value); setLoginError(""); }} placeholder="10-digit mobile number" maxLength={10} />
          </div>
        </label>
        {sent && (
          <label>
            Demo OTP
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Try 123456"
              inputMode="numeric"
            />
          </label>
        )}
        <button
          className="primary wide"
          onClick={() => { if (!sent) { setSent(true); return; } const saved = JSON.parse(localStorage.getItem("ks-registered-users") || "[]"); const account = saved.find((item) => item.phone === loginPhone) || Object.values(demoUsers).find((item) => item.phone === loginPhone); if (!account) { setLoginError("No account found for this mobile number."); return; } if (otp !== "123456") { setLoginError("Invalid OTP. Please enter the correct demo OTP."); return; } onLogin(account.role || role, account.name, account.phone); }}
        >
          {sent ? "Enter demo workspace" : "Send demo OTP"}
          <ArrowRight size={17} />
        </button>
        <p className="demo-note">
          <span className="dot" /> Demo OTP is <b>123456</b> for every account
        </p>
        {loginError && <p className="error register-error">{loginError}</p>}
        </>}
        </>}
      </div>
    </div>
  );
}

function BrandMark() {
  return <div className="brand"><span className="brand-icon"><Sprout size={23} /></span><b>Kisan<span>Setu</span></b></div>;
}

function Sidebar({ user, page, setPage, logout, mobileOpen, closeMobile, onProfile, onStateChange }) {
  const nav =
    user.role === "FARMER"
      ? [
          ["overview", "Overview", Activity],
          ["harvest", "My harvest", Sprout],
          ["book", "Book procurement", ClipboardCheck],
          ["queue", "Live queue", ScanLine],
          ["history", "Booking history", ClipboardCheck],
        ]
      : user.role === "OFFICER"
        ? [
            ["overview", "Today at centre", Activity],
            ["queue", "Live queue", ScanLine],
          ]
        : user.role === "DISTRIBUTOR"
          ? [
              ["overview", "Overview", Activity],
              ["stock", "Crop management", Package],
              ["orders", "Orders", Truck],
            ]
          : [
              ["overview", "State overview", Activity],
              ["centres", "Centre monitoring", MapPin],
            ];
  return (
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="mobile-sidebar-head">
        <div className="brand side-brand">
          <span className="brand-icon">
            <Sprout size={20} />
          </span>
          <b>
            Kisan<span>Setu</span>
          </b>
        </div>
        <button onClick={closeMobile} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>
      <div className="brand side-brand desktop-brand">
        <span className="brand-icon">
          <Sprout size={20} />
        </span>
        <b>
          Kisan<span>Setu</span>
        </b>
      </div>
      <label className="state-switch">
        <MapPin size={15} />
        <span>
          <small>Active state</small>
          <select aria-label="Active state" value={user.state} onChange={(e) => onStateChange(e.target.value)}>
            {stateOptions.map((state) => <option value={state} key={state}>{state}</option>)}
          </select>
        </span>
        <ChevronRight size={15} />
      </label>
      <nav>
        {nav.map(([key, text, Icon]) => (
          <button
            className={page === key ? "active" : ""}
            onClick={() => {
              setPage(key);
              closeMobile();
            }}
            key={key}
          >
            <Icon size={18} />
            <span>{text}</span>
            {key === "queue" && <i>4</i>}
          </button>
        ))}
      </nav>
      <div className="side-bottom">
        <button className="settings" onClick={onProfile}>
          <Settings2 size={17} />
          Settings
        </button>
        <div className="profile" onClick={onProfile} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onProfile()}>
          <span className="avatar">
            {user.name
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </span>
          <div>
            <b>{user.name}</b>
            <small>
              {user.role === "ADMIN"
                ? "State Admin"
                : user.role[0] + user.role.slice(1).toLowerCase()}
            </small>
          </div>
          <button onClick={(e) => { e.stopPropagation(); logout(); }} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
function Topbar({ user, notifications, onMenu, onNotifications, onProfile }) {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>
      <div>
        <p className="breadcrumb">
          {user.role === "ADMIN"
            ? "Government portal"
            : `${user.role[0] + user.role.slice(1).toLowerCase()} workspace`}{" "}
          <ChevronRight size={13} /> <b>{user.district}</b>
        </p>
        <h1>
          {user.role === "FARMER"
            ? `Good morning, ${user.name}`
            : user.role === "OFFICER"
              ? "Good morning, Ravi"
              : user.role === "ADMIN"
                ? "Jharkhand at a glance"
                : "Supply desk"}
        </h1>
      </div>
      <div className="top-actions">
        <button className="icon-button" title="Search">
          <Search size={19} />
        </button>
        <button
          className="icon-button notification-button"
          title="Notifications"
          onClick={onNotifications}
        >
          <Bell size={19} />
          <i>{notifications.filter((item) => !item.read).length}</i>
        </button>
        <button className="top-avatar profile-trigger" onClick={onProfile} aria-label="Open profile">
          {user.name
            .split(" ")
            .map((x) => x[0])
            .join("")}
        </button>
      </div>
    </header>
  );
}

function Farmer({ user, page, bookings, updateBooking, addNotice, flash, setPage, createBooking }) {
  const active =
    bookings.find(
      (x) => x.farmer === user.name && x.status !== "PAYMENT_COMPLETED",
    ) || bookings[0];
  if (page === "harvest") return <Harvest setPage={setPage} flash={flash} />;
  if (page === "book")
    return <Booking user={user} setPage={setPage} addNotice={addNotice} flash={flash} createBooking={createBooking} />;
  if (page === "queue") return <Queue user={user} booking={active} />;
  if (page === "history") return <BookingHistory user={user} bookings={bookings} />;
  return (
    <>
      <Hero
        title="Your harvest, moving forward"
        text="Keep track of every step from booking to payment in one place."
        action="Book a procurement slot"
        onAction={() => setPage("book")}
      />
      <div className="stats-grid farmer-stats">
        <Stat
          icon={ClipboardCheck}
          label="Upcoming booking"
          value={active?.token || "None"}
          detail={active?.date || "Book your first slot"}
          tone="green"
        />
        <Stat
          icon={ScanLine}
          label="Queue position"
          value={`#${active?.position || 0}`}
          detail={`${active?.wait || 0} min estimated wait`}
          tone="gold"
        />
        <Stat
          icon={ShoppingBasket}
          label="This season"
          value="₹81,200"
          detail="3 procurements completed"
          tone="blue"
        />
      </div>
      <section className="panel produce-panel"><PanelTitle title="Sell your produce" link="Start procurement" onLink={() => setPage("book")} /><p className="subtle">Choose the commodity you want to sell to a government procurement centre.</p><div className="produce-tags">{procurementCommodities.map((commodity) => <span key={commodity}>{commodity}</span>)}</div></section>
      <div className="dashboard-grid">
        <section className="panel booking-panel">
          <PanelTitle
            title="Your next procurement"
            link="View live queue"
            onLink={() => setPage("queue")}
          />
          <BookingCard booking={active} />
        </section>
        <section className="panel notifications">
          <PanelTitle title="Recent updates" link="View all" />
          <NotificationList />
        </section>
      </div>
    </>
  );
}

function BookingHistory({ user, bookings }) {
  const bookingHistory = bookings.filter((booking) => booking.farmer === user.name);
  const [selectedBooking, setSelectedBooking] = useState(null);

  return (
    <>
      <Hero
        title="Booking history"
        text="Review your procurement bookings and every crop order you have placed."
      />
      <section className="panel">
        <PanelTitle title="Procurement bookings" link={`${bookingHistory.length} bookings`} />
        {bookingHistory.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Token</th><th>Crop</th><th>Centre</th><th>Appointment</th><th>Status</th><th>Details</th></tr></thead>
              <tbody>{bookingHistory.map((booking) => <tr key={booking.id}>
                <td><b>{booking.token}</b><small>{booking.bookingNumber || "Procurement booking"}</small></td>
                <td>{booking.crop}<small>{booking.quantity} {booking.unit}</small></td>
                <td>{booking.centre}</td>
                <td>{booking.date}</td>
                <td><span className={`pill ${booking.status.toLowerCase()}`}>{statusLabel[booking.status] || booking.status}</span></td>
                <td><button className="row-action" onClick={() => setSelectedBooking(booking)}>Details <ChevronRight size={14} /></button></td>
              </tr>)}</tbody>
            </table>
          </div>
        ) : <div className="empty">You have not booked a procurement slot yet.</div>}
      </section>
      {selectedBooking && <div className="modal-backdrop"><section className="modal order-detail"><button className="modal-close" onClick={() => setSelectedBooking(null)}><X size={18} /></button><p className="kicker">Procurement details</p><h2>{selectedBooking.token}</h2><p className="subtle">{selectedBooking.crop} · estimated {selectedBooking.quantity} {selectedBooking.unit}</p><div className="order-summary"><div><small>Accepted quantity</small><b>{selectedBooking.acceptedQuantity || "Pending weighing"} {selectedBooking.unit}</b></div><div><small>Procurement rate</small><b>₹{(selectedBooking.procurementRate || 0).toLocaleString()} / {selectedBooking.unit}</b></div><div><small>Amount payable to you</small><b>₹{(selectedBooking.procurementValue || 0).toLocaleString()}</b></div></div><div className="order-total"><span>Payment to farmer</span><b>{selectedBooking.payment === "COMPLETED" ? "Payment completed" : selectedBooking.payment === "PROCESSING" ? "Payment processing" : "Pending procurement"}</b></div></section></div>}
    </>
  );
}
function Hero({ title, text, action, onAction }) {
  return (
    <section className="hero">
      <div>
        <p className="kicker">Tuesday · 01 September 2026</p>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action && (
        <button className="primary" onClick={onAction}>
          {action}
          <ArrowRight size={16} />
        </button>
      )}
    </section>
  );
}
function Stat({ icon: Icon, label, value, detail, tone = "green" }) {
  return (
    <article className={`stat ${tone}`}>
      <span className="stat-icon">
        <Icon size={18} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
function PanelTitle({ title, link, onLink }) {
  return (
    <div className="panel-title">
      <div>
        <h3>{title}</h3>
      </div>
      {link && (
        <button className="text-button" onClick={onLink}>
          {link}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
function BookingCard({ booking }) {
  if (!booking) return <div className="empty">No upcoming booking yet.</div>;
  return (
    <div className="booking-card">
      <div className="token-box">
        <small>Digital token</small>
        <b>{booking.token}</b>
        <span>
          <QrCode size={14} /> Scan at centre
        </span>
      </div>
      <div className="booking-details">
        <div>
          <small>Crop</small>
          <b>
            {booking.crop} · {booking.quantity} {booking.unit}
          </b>
        </div>
        <div>
          <small>Centre</small>
          <b>
            <MapPin size={14} /> {booking.centre}
          </b>
        </div>
        <div>
          <small>Appointment</small>
          <b>
            <Clock3 size={14} /> {booking.date}
          </b>
        </div>
      </div>
      <div className="queue-strip">
        <span>
          Queue position <b>#{booking.position}</b>
        </span>
        <span>
          Est. wait <b>{booking.wait} min</b>
        </span>
      </div>
    </div>
  );
}
function Harvest({ setPage, flash }) {
  const [items, setItems] = useState([
    {
      id: 1,
      name: "Paddy",
      variety: "Swarna",
      quantity: 42,
      unit: "quintal",
      color: "yellow",
    },
    {
      id: 2,
      name: "Maize",
      variety: "Hybrid 909",
      quantity: 18,
      unit: "quintal",
      color: "orange",
    },
  ]);
  const [name, setName] = useState("");
  return (
    <>
      <Hero
        title="My harvest"
        text="Keep your available crops ready for a faster booking."
        action="Book procurement"
        onAction={() => setPage("book")}
      />
      <section className="panel">
        <PanelTitle
          title="Available to procure"
          link={`${items.length} crops`}
        />
        <div className="harvest-list">
          {items.map((item) => (
            <div className="harvest-row" key={item.id}>
              <span className={`crop-thumb ${item.color}`}>
                <Leaf size={22} />
              </span>
              <div className="harvest-name">
                <b>{item.name}</b>
                <small>{item.variety}</small>
              </div>
              <div className="quantity">
                <small>Available quantity</small>
                <b>
                  {item.quantity} {item.unit}
                </b>
              </div>
              <button
                className="ghost-button"
                onClick={() => setItems(items.filter((x) => x.id !== item.id))}
              >
                Remove
              </button>
              <button className="small-primary" onClick={() => setPage("book")}>
                Book
              </button>
            </div>
          ))}
        </div>
        <div className="add-harvest">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add crop name"
          />
          <button
            className="outline-button"
            onClick={() => {
              if (name) {
                setItems([
                  ...items,
                  {
                    id: Date.now(),
                    name,
                    variety: "New harvest",
                    quantity: 10,
                    unit: "quintal",
                    color: "green",
                  },
                ]);
                setName("");
                flash("Harvest added", `${name} is ready to book.`);
              }
            }}
          >
            <Plus size={16} /> Add crop
          </button>
        </div>
      </section>
    </>
  );
}
function Booking({ user, setPage, addNotice, flash, createBooking }) {
  const [crop, setCrop] = useState("Paddy / Rice");
  const [variety, setVariety] = useState("Swarna");
  const [quantity, setQuantity] = useState("35");
  const [unit, setUnit] = useState("quintal");
  const [centre, setCentre] = useState(centres[0].name);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingToken, setBookingToken] = useState("");
  if (confirmed)
    return (
      <section className="confirmation">
        <div className="success-mark">
          <Check size={28} />
        </div>
        <p className="kicker">Booking confirmed</p>
        <h2>Your harvest has a place in line.</h2>
        <p className="subtle">
          Show this token and QR code when you arrive at the centre.
        </p>
        <div className="ticket">
          <div className="ticket-top">
            <div>
              <small>Digital token</small>
              <strong>{bookingToken}</strong>
            </div>
            <QrPattern />
          </div>
          <div className="ticket-grid">
            <div>
              <small>Farmer</small>
              <b>{user.name}</b>
            </div>
            <div>
              <small>Crop</small>
              <b>
                {crop} · {quantity} quintal
              </b>
            </div>
            <div>
              <small>Centre</small>
              <b>{centre}</b>
            </div>
            <div>
              <small>Date & time</small>
              <b>02 Sep · 09:30 AM</b>
            </div>
            <div>
              <small>Queue position</small>
              <b>#6</b>
            </div>
            <div>
              <small>Estimated wait</small>
              <b>38 minutes</b>
            </div>
          </div>
        </div>
        <div className="confirmation-actions">
          <button className="primary" onClick={() => setPage("queue")}>
            Track live queue <ArrowRight size={16} />
          </button>
          <button className="outline-button" onClick={() => window.print()}>
            <Download size={16} /> Print ticket
          </button>
        </div>
      </section>
    );
  return (
    <>
      <div className="back-link" onClick={() => setPage("overview")}>
        <ChevronRight size={14} /> Back to overview
      </div>
      <div className="flow-heading">
        <div>
          <p className="kicker">New procurement booking</p>
          <h2>Reserve your place</h2>
          <p className="subtle">
            Choose what you are selling and reserve a government procurement slot.
          </p>
        </div>
        <span className="step-count">Step 1 of 3</span>
      </div>
      <div className="booking-layout">
        <section className="panel booking-form">
          <div className="form-step">
            <span>1</span>
            <div>
              <h3>What are you selling?</h3>
              <p>Select the commodity you want to sell to the procurement centre.</p>
            </div>
          </div>
          <label>
            Commodity
            <select value={crop} onChange={(e) => setCrop(e.target.value)}>{procurementCommodities.map((commodity) => <option value={commodity} key={commodity}>{commodity}</option>)}</select>
          </label>
          <label>
            Variety (optional)
            <input value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="e.g. Swarna" />
          </label>
          <div className="split-fields">
            <label>
              Expected quantity
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label>
              Unit
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option>quintal</option>
                <option>kg</option>
                <option>tonne</option>
              </select>
            </label>
          </div>
          <div className="form-step second">
            <span>2</span>
            <div>
              <h3>Recommended centres</h3>
              <p>Ranked by distance, queue and current load.</p>
            </div>
          </div>
          <div className="centre-options">
            {centres.filter((item) => !item.categories || item.categories.includes(crop)).map((item, index) => (
              <button
                className={
                  centre === item.name
                    ? "centre-choice selected"
                    : "centre-choice"
                }
                key={item.name}
                onClick={() => setCentre(item.name)}
              >
                <span className="radio" />
                <div>
                  <b>{item.name}</b>
                  <small>
                    {item.district} ·{" "}
                    {index === 0
                      ? "Best match for you"
                      : `${item.wait} min average wait`}
                  </small>
                </div>
                <strong>{item.load}% load</strong>
              </button>
            ))}
          </div>
          <div className="form-step second">
            <span>3</span>
            <div>
              <h3>Pick a time slot</h3>
              <p>Available slots for Wednesday, 02 September.</p>
            </div>
          </div>
          <div className="slots">
            <button className="slot selected">
              09:30 AM<small>6 places left</small>
            </button>
            <button className="slot">
              10:30 AM<small>12 places left</small>
            </button>
            <button className="slot">
              11:30 AM<small>18 places left</small>
            </button>
          </div>
          <button
            className="primary wide"
            onClick={() => {
              const token = `KS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
              setBookingToken(token);
              createBooking({ bookingNumber: `KS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, crop, variety, quantity: Number(quantity), estimatedQuantity: Number(quantity), unit, centre, date: "02 Sep 2026 · 09:30 AM", appointmentDate: "02 Sep 2026", token });
              setConfirmed(true);
              addNotice(
                "Produce sale booking confirmed",
                `Your ${crop} booking is ready for 02 September.`,
                "Booking",
              );
              flash("Procurement slot confirmed", `Your digital token is ${token}.`);
            }}
          >
            Confirm procurement booking <ArrowRight size={17} />
          </button>
        </section>
        <aside className="recommendation">
          <p className="kicker">Smart recommendation</p>
          <h3>Ranchi Central is your best match</h3>
          <p>It balances a short queue with the closest route from Khunti.</p>
          <div className="score">
            <strong>92</strong>
            <span>/ 100 match score</span>
          </div>
          <div className="score-bars">
            <span>
              <i style={{ width: "88%" }} />
              Shortest route
            </span>
            <span>
              <i style={{ width: "72%" }} />
              Low queue
            </span>
            <span>
              <i style={{ width: "95%" }} />
              Centre capacity
            </span>
          </div>
          <div className="recommendation-foot">
            <MapPin size={16} /> 24 km from your village
          </div>
        </aside>
      </div>
    </>
  );
}
function QrPattern() {
  return (
    <div className="qr-pattern">
      {Array.from({ length: 49 }, (_, index) => (
        <i
          className={index % 3 === 0 || index < 7 || index > 41 ? "on" : ""}
          key={index}
        />
      ))}
    </div>
  );
}
function Queue({ user, booking }) {
  return (
    <>
      <Hero
        title="Live queue"
        text="Your place updates as the centre moves through today's farmers."
      />
      <div className="queue-live">
        <div className="now-serving">
          <p className="kicker">
            <span className="live-dot" /> Live at Ranchi Central
          </p>
          <h2>Now serving</h2>
          <strong>KS-8F4D2A</strong>
          <span>{user.name} · Paddy</span>
        </div>
        <div className="queue-next">
          <div>
            <small>Up next</small>
            <b>KS-7B1C90</b>
            <span>Vikram Oraon · Maize</span>
          </div>
          <div className="your-place">
            <small>Your place</small>
            <strong>#{booking?.position || 4}</strong>
            <span>about {booking?.wait || 32} minutes</span>
          </div>
        </div>
      </div>
      <section className="panel timeline-panel">
        <PanelTitle title="Procurement journey" link="Payment receipt" />
        <div className="timeline">
          {steps.map((step, index) => (
            <div
              className={
                index < 2
                  ? "timeline-step done"
                  : index === 2
                    ? "timeline-step current"
                    : "timeline-step"
              }
              key={step}
            >
              <span>{index < 2 ? <Check size={14} /> : index + 1}</span>
              <div>
                <b>{step.replaceAll("_", " ")}</b>
                <small>
                  {index < 2
                    ? index === 0
                      ? "01 Sep · 08:42 AM"
                      : "01 Sep · 09:05 AM"
                    : index === 2
                      ? "In progress now"
                      : "Pending"}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Officer({ page, bookings, updateBooking }) {
  const [selected, setSelected] = useState(null);
  const waiting = bookings.filter((x) =>
    ["WAITING", "FARMER_VERIFIED", "WEIGHING", "QUALITY_CHECK"].includes(
      x.status,
    ),
  );
  if (page === "queue")
    return <OfficerQueue bookings={bookings} updateBooking={updateBooking} />;
  return (
    <>
      <Hero
        title="Centre operations"
        text="Keep today's farmer queue moving with clear, quick actions."
        action="Call next farmer"
        onAction={() => {
          const next = waiting[0];
          if (next) updateBooking(next.id, "FARMER_VERIFIED");
        }}
      />
      <div className="stats-grid">
        <Stat
          icon={ClipboardCheck}
          label="Today's bookings"
          value="28"
          detail="+12% from yesterday"
        />
        <Stat
          icon={Users}
          label="Waiting farmers"
          value={waiting.length}
          detail="At Ranchi Central"
          tone="gold"
        />
        <Stat
          icon={Check}
          label="Completed today"
          value="19"
          detail="68% of daily target"
          tone="blue"
        />
        <Stat
          icon={Clock3}
          label="Average wait"
          value="32 min"
          detail="6 min faster today"
          tone="purple"
        />
      </div>
      <div className="dashboard-grid officer-grid">
        <section className="panel">
          <PanelTitle
            title="Queue requiring action"
            link="View full queue"
            onLink={() => {}}
          />
          <QueueTable bookings={waiting.slice(0, 3)} onSelect={setSelected} />
        </section>
        <section className="panel operations-card">
          <p className="kicker">Next best action</p>
          <h3>{waiting[0]?.token || "Queue clear"}</h3>
          <p>{waiting[0]?.farmer} is ready for farmer verification.</p>
          {waiting[0] && (
            <button
              className="primary wide"
              onClick={() => updateBooking(waiting[0].id, "FARMER_VERIFIED")}
            >
              CALL NEXT FARMER <ArrowRight size={16} />
            </button>
          )}
          <div className="mini-note">
            <ShieldCheck size={16} />
            <span>All actions are logged to the state dashboard.</span>
          </div>
        </section>
      </div>
      {selected && (
        <OfficerModal
          booking={selected}
          close={() => setSelected(null)}
          updateBooking={updateBooking}
        />
      )}
    </>
  );
}
function OfficerQueue({ bookings, updateBooking }) {
  return (
    <>
      <Hero
        title="Live queue"
        text="Ranchi Central · Tuesday, 01 September"
        action="Call next farmer"
        onAction={() => {
          const next = bookings.find((x) => x.status === "WAITING");
          if (next) updateBooking(next.id, "FARMER_VERIFIED");
        }}
      />
      <section className="panel">
        <PanelTitle title="Today's queue" link="Export list" />
        <QueueTable bookings={bookings} onSelect={() => {}} />
      </section>
    </>
  );
}
function QueueTable({ bookings, onSelect }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Farmer</th>
            <th>Crop</th>
            <th>Quantity</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {bookings.map((item) => (
            <tr key={item.id}>
              <td>
                <b>{item.token}</b>
                <small>Position #{item.position}</small>
              </td>
              <td>
                <b>{item.farmer}</b>
                <small>Khunti, Jharkhand</small>
              </td>
              <td>{item.crop}</td>
              <td>
                {item.quantity} {item.unit}
              </td>
              <td>
                <span className={`pill ${item.status.toLowerCase()}`}>
                  {statusLabel[item.status]}
                </span>
              </td>
              <td>
                <button className="row-action" onClick={() => onSelect(item)}>
                  Open <ChevronRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function OfficerModal({ booking, close, updateBooking }) {
  const [weight, setWeight] = useState(booking.weighedQuantity || booking.quantity);
  const [accepted, setAccepted] = useState(booking.acceptedQuantity || booking.quantity);
  const [rate, setRate] = useState(booking.procurementRate || 2320);
  const payable = Number(accepted || 0) * Number(rate || 0);
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <button className="modal-close" onClick={close}>
          <X size={18} />
        </button>
        <p className="kicker">Procurement record</p>
        <h2>{booking.token}</h2>
        <p className="subtle">
          {booking.farmer} · {booking.crop} · estimated {booking.quantity} {booking.unit}
        </p>
        <div className="modal-actions">
          <button
            onClick={() =>
              updateBooking(booking.id, "WEIGHING", {
                weighedQuantity: Number(weight),
                quantity: Number(weight),
              })
            }
          >
            Record weighing
          </button>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <label>Accepted quantity<input type="number" min="0" value={accepted} onChange={(e) => setAccepted(e.target.value)} /></label>
          <label>Procurement rate<input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
          <p className="procurement-total">Amount payable to farmer: <b>₹{payable.toLocaleString()}</b></p>
          <button
            onClick={() =>
              updateBooking(booking.id, "QUALITY_CHECK", { grade: "A" })
            }
          >
            Grade A
          </button>
          <button
            onClick={() =>
              updateBooking(booking.id, "PROCUREMENT_COMPLETED", {
                grade: "A",
                acceptedQuantity: Number(accepted),
                procurementRate: Number(rate),
                procurementValue: payable,
              })
            }
          >
            Complete procurement
          </button>
          <button onClick={() => updateBooking(booking.id, "PAYMENT_PROCESSING", { acceptedQuantity: Number(accepted), procurementRate: Number(rate), procurementValue: payable, payment: "PROCESSING" })}>Process payment to farmer</button>
          <button onClick={() => updateBooking(booking.id, "PAYMENT_COMPLETED", { acceptedQuantity: Number(accepted), procurementRate: Number(rate), procurementValue: payable, payment: "COMPLETED" })}>Mark payment completed</button>
          <button
            className="danger-button"
            onClick={() => updateBooking(booking.id, "QUALITY_FAILED")}
          >
            Quality failed
          </button>
        </div>
      </section>
    </div>
  );
}

function Distributor({ page, setPage }) {
  const [items, setItems] = useState(crops);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [marketSearch, setMarketSearch] = useState("");
  const [form, setForm] = useState({ name: "", quantity: "", unit: "quintal", price: "", image: null });
  const addCrop = (event) => {
    event.preventDefault();
    if (!form.name || !form.quantity || !form.price || !form.image) return;
    setItems([...items, { name: form.name, variety: "Distributor listing", stock: Number(form.quantity), unit: form.unit, price: Number(form.price), category: "New listing", image: URL.createObjectURL(form.image) }]);
    setForm({ name: "", quantity: "", unit: "quintal", price: "", image: null });
  };
  if (page === "stock")
    return (
      <>
        <Hero
          title="Crop management"
          text="Keep distributor inventory visible to procurement partners."
          action="Add crop"
          onAction={() => document.getElementById("crop-name")?.focus()}
        />
        <section className="panel">
          <PanelTitle title="Active catalogue" link={`${items.length} crops`} />
          <div className="market-search catalogue-search"><Search size={17} /><input value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)} placeholder="Search your crops..." /></div>
          <form className="crop-form" onSubmit={addCrop}>
            <div className="crop-form-heading"><div><h3>Add a crop listing</h3><p>Share clear stock details with buyers.</p></div><span>All fields required</span></div>
            <div className="crop-fields"><label>Crop name<input id="crop-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paddy" required /></label><label>Quantity<input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="950" required /></label><label>Unit<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option>kg</option><option>quintal</option><option>tonne</option></select></label><label>Price per unit<input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="2320" required /></label><label className="image-field">Crop image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} required /></label><button className="primary" type="submit"><Plus size={16} /> Add crop</button></div>
          </form>
          <div className="harvest-list">
            {items.filter((item) => item.name.toLowerCase().includes(marketSearch.toLowerCase())).map((item) => (
              <div className="harvest-row" key={item.name}>
                <span className="crop-thumb green">
                  {item.image ? <img src={item.image} alt="" /> : <Leaf size={22} />}
                </span>
                <div className="harvest-name">
                  <b>{item.name}</b>
                  <small>
                    {item.variety} · {item.category}
                  </small>
                </div>
                <div className="quantity">
                  <small>Available stock</small>
                  <b>
                    {item.stock} {item.unit}
                  </b>
                </div>
                <div className="price">
                  ₹{item.price.toLocaleString()}
                  <small>/ {item.unit}</small>
                </div>
                <button className="ghost-button">Edit stock</button>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  if (page === "orders")
    return (
      <>
        <Hero
          title="Supply orders"
          text="Track orders from receipt through payment."
        />
        <section className="panel">
          <PanelTitle title="Recent orders" link="3 orders" />
          <QueueTable
            bookings={items.map((x, i) => ({
              ...x,
              id: i,
              token: `ORD-2026-10000${i + 1}`,
              farmer: "Ranchi Foods Cooperative",
              city: "Ranchi, Jharkhand",
              crop: x.name,
              quantity: 100,
              unit: x.unit,
              position: 0,
              status: i === 0 ? "WAITING" : "PROCUREMENT_COMPLETED",
            }))}
            onSelect={setSelectedOrder}
          />
          {selectedOrder && <OrderDetail order={selectedOrder} close={() => setSelectedOrder(null)} />}
        </section>
      </>
    );
  return (
    <>
      <Hero
        title="Good morning, Kunal"
        text="Your crop catalogue is reaching more farmers every day."
        action="Manage crop stock"
        onAction={() => setPage("stock")}
      />
      <div className="stats-grid">
        <Stat
          icon={Package}
          label="Pending orders"
          value="12"
          detail="4 need acceptance"
        />
        <Stat
          icon={Sprout}
          label="Active crops"
          value={items.length}
          detail="Across 3 categories"
          tone="gold"
        />
        <Stat
          icon={Truck}
          label="Completed orders"
          value="84"
          detail="This season"
          tone="blue"
        />
        <Stat
          icon={ShoppingBasket}
          label="Payments received"
          value="₹4.8L"
          detail="+18% this month"
          tone="purple"
        />
      </div>
      <section className="panel">
        <PanelTitle title="Latest orders" link="View all" />
        <QueueTable
          bookings={items.map((x, i) => ({
            ...x,
            id: i,
            token: `ORD-2026-10000${i + 1}`,
            farmer: "Ranchi Foods Cooperative",
            city: "Ranchi, Jharkhand",
            crop: x.name,
            quantity: 100,
            unit: x.unit,
            position: 0,
            status: i === 0 ? "WAITING" : "PROCUREMENT_COMPLETED",
          }))}
          onSelect={() => {}}
        />
      </section>
    </>
  );
}

function OrderDetail({ order, close }) {
  const orderSteps = ["RECEIVED", "ACCEPTED", "PROCESSING", "FULFILLED", "PAID"];
  const current = order.status === "PROCUREMENT_COMPLETED" ? 2 : 0;
  return <div className="modal-backdrop"><section className="modal order-detail"><button className="modal-close" onClick={close}><X size={18} /></button><p className="kicker">Order detail</p><h2>{order.token}</h2><p className="subtle">Received from {order.farmer}</p><div className="order-location"><MapPin size={15} /><span><b>{order.city || "Ranchi, Jharkhand"}</b><small>Delivery / pickup location</small></span></div><div className="order-summary"><div><small>Crop</small><b>{order.crop}</b></div><div><small>Quantity</small><b>{order.quantity} {order.unit}</b></div><div><small>Payment</small><b className="payment-text">{current >= 3 ? "Paid" : "Pending"}</b></div></div><div className="order-status-list">{orderSteps.map((step, index) => <div className={index <= current ? "order-status done" : "order-status"} key={step}><span>{index <= current ? <Check size={13} /> : index + 1}</span><div><b>{step}</b><small>{index <= current ? (index === current ? "Current status" : "Completed · 01 Sep 2026") : "Awaiting update"}</small></div></div>)}</div></section></div>;
}

function Admin({ page, setPage, bookings, user }) {
  const [chartRange, setChartRange] = useState("7 days");
  const stateBookings = bookings.filter((booking) => !booking.state || booking.state === user.state);
  const completed = stateBookings.filter((booking) => ["PROCUREMENT_COMPLETED", "PAYMENT_PROCESSING", "PAYMENT_COMPLETED"].includes(booking.status));
  const payments = stateBookings.filter((booking) => booking.payment === "COMPLETED");
  const centreMetrics = centres.map((centre) => {
    const centreBookings = stateBookings.filter((booking) => booking.centre === centre.name);
    const activeBookings = centreBookings.filter((booking) => ["BOOKED", "WAITING", "FARMER_VERIFIED", "WEIGHING", "QUALITY_CHECK"].includes(booking.status));
    return { ...centre, queue: centreBookings.length ? activeBookings.length : centre.queue, load: centreBookings.length ? Math.min(100, Math.round((activeBookings.length / Math.max(centre.queue, 1)) * centre.load)) : centre.load };
  });
  if (page === "centres")
    return (
      <>
        <Hero
          title="Centre monitoring"
          text="A live operational view of every procurement centre in Jharkhand."
        />
        <Map />
        <section className="panel">
          <PanelTitle title="Centre performance" link="Export report" />
          <div className="centre-grid">
            {centreMetrics.map((c) => (
              <div className="centre-card" key={c.code}>
                <div>
                  <b>{c.name}</b>
                  <small>
                    {c.code} · {c.district}
                  </small>
                </div>
                <span
                  className={
                    c.status === "Busy" ? "pill warning" : "pill success"
                  }
                >
                  {c.status}
                </span>
                <div className="load">
                  <span>
                    <i style={{ width: `${c.load}%` }} />
                  </span>
                  <b>{c.load}%</b>
                  <small>
                    {c.queue} waiting · {c.wait} min avg wait
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="kicker">State dashboard · 01 September 2026</p>
          <h2>Jharkhand at a glance</h2>
          <p className="subtle">
            A shared view of procurement health across your state.
          </p>
        </div>
        <button className="outline-button" onClick={() => setPage("centres")}>
          <MapPin size={16} /> Monitor centres
        </button>
      </div>
      <div className="stats-grid">
        <Stat
          icon={Users}
          label="Total farmers"
          value="4,862"
          detail="+8.4% this month"
        />
        <Stat
          icon={ClipboardCheck}
          label="Bookings"
          value={stateBookings.length.toLocaleString()}
          detail={`Across ${centreMetrics.length} centres`}
          tone="gold"
        />
        <Stat
          icon={Check}
          label="Completed procurement"
          value={completed.length.toLocaleString()}
          detail={`${stateBookings.length ? Math.round((completed.length / stateBookings.length) * 100) : 0}% completion rate`}
          tone="blue"
        />
        <Stat
          icon={ShoppingBasket}
          label="Payments released"
          value={`₹${stateBookings.reduce((total, booking) => total + (booking.procurementValue || 0), 0).toLocaleString()}`}
          detail={`${stateBookings.filter((booking) => booking.payment === "PROCESSING").length} payments processing`}
          tone="purple"
        />
      </div>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-title"><div><h3>Daily procurement</h3></div><select className="chart-range" aria-label="Procurement chart range" value={chartRange} onChange={(e) => setChartRange(e.target.value)}><option value="7 days">Last 7 days</option><option value="Month">This month</option><option value="Quarter">This quarter</option></select></div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartRanges[chartRange]}>
              <defs>
                <linearGradient id="procure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5a9c6b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5a9c6b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7eee8" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#84928a", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#84928a", fontSize: 11 }}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#347952"
                fill="url(#procure)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>
        <section className="panel chart-panel">
          <PanelTitle title="Crop mix" link="This month" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: "Paddy", value: 48 },
                  { name: "Maize", value: 28 },
                  { name: "Pulses", value: 16 },
                  { name: "Other", value: 8 },
                ]}
                innerRadius={58}
                outerRadius={82}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill="#347952" />
                <Cell fill="#e1ad45" />
                <Cell fill="#80a7a1" />
                <Cell fill="#d7ded7" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            <span>
              <i className="green-dot" />
              Paddy 48%
            </span>
            <span>
              <i className="gold-dot" />
              Maize 28%
            </span>
            <span>
              <i className="blue-dot" />
              Pulses 16%
            </span>
          </div>
        </section>
      </div>
      <section className="panel failure-panel">
        <PanelTitle title="Attention needed" link="Review all" />
        <div className="attention-list">
          <div>
            <span className="attention-icon orange">
              <Clock3 size={17} />
            </span>
            <b>
              142 payments processing
              <small>Average release time · 2.4 days</small>
            </b>
            <ChevronRight size={16} />
          </div>
          <div>
            <span className="attention-icon red">
              <X size={17} />
            </span>
            <b>
              36 quality failures
              <small>Moisture is the top reason this week</small>
            </b>
            <ChevronRight size={16} />
          </div>
          <div>
            <span className="attention-icon green">
              <Activity size={17} />
            </span>
            <b>
              18 centres reporting live<small>All systems operational</small>
            </b>
            <ChevronRight size={16} />
          </div>
        </div>
      </section>
    </>
  );
}
function Map() {
  const mapRef = useRef(null);
  useEffect(() => {
    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(
      [23.5, 85.3],
      7,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    centres.forEach((c) =>
      L.marker(c.coords)
        .addTo(map)
        .bindPopup(`<b>${c.name}</b><br>${c.queue} waiting · ${c.load}% load`),
    );
    return () => map.remove();
  }, []);
  return (
    <div className="map-wrap">
      <div ref={mapRef} />
    </div>
  );
}
function NotificationList() {
  return (
    <div className="notification-list">
      <div>
        <span className="notice-icon green">
          <Check size={15} />
        </span>
        <b>
          Token generated
          <small>Your booking KS-8F4D2A is confirmed for tomorrow.</small>
        </b>
        <time>2h ago</time>
      </div>
      <div>
        <span className="notice-icon gold">
          <Clock3 size={15} />
        </span>
        <b>
          Queue is moving
          <small>Ranchi Central is serving token KS-7B1C90.</small>
        </b>
        <time>4h ago</time>
      </div>
      <div>
        <span className="notice-icon blue">
          <ShoppingBasket size={15} />
        </span>
        <b>
          Payment completed
          <small>₹81,200 has been credited for your last delivery.</small>
        </b>
        <time>Yesterday</time>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
