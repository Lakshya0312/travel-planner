import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const INTERESTS = ["🍜 Food", "🏛 History", "🌿 Nature", "🎭 Nightlife", "🛍 Shopping", "🎨 Art", "🏄 Adventure", "🧘 Wellness"];
const STYLES = ["🎒 Backpacking", "🏨 Luxury", "🚶 Slow Travel", "⚡ Fast-Paced", "👨‍👩‍👧 Family"];
const CURRENCY_SYMBOLS = { AED:"د.إ", AUD:"A$", BRL:"R$", CAD:"C$", CHF:"Fr", CNY:"¥", CZK:"Kč", DKK:"kr", EUR:"€", GBP:"£", HKD:"HK$", IDR:"Rp", INR:"₹", JPY:"¥", KRW:"₩", MXN:"$", MYR:"RM", NOK:"kr", NZD:"NZ$", PHP:"₱", PLN:"zł", SAR:"﷼", SEK:"kr", SGD:"S$", THB:"฿", TRY:"₺", TWD:"NT$", USD:"$", VND:"₫", ZAR:"R" };
const SAMPLE_DESTINATIONS = ["Tokyo", "Paris", "Kyoto", "Bali", "New York", "Rome", "Bangkok", "Barcelona", "London", "Dubai", "Singapore", "Lisbon"];
const TRAVELER_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "8+"];

const systemPrompt = `You are a travel planner. Return ONLY raw JSON, no markdown, no explanation.

Keep all text fields SHORT: descriptions max 1 sentence, tips max 8 words.

Return this exact structure:
{
  "summary": "1 sentence overview",
  "highlights": ["h1", "h2", "h3"],
  "dailyBudget": "cost string",
  "bestTimeNote": "short note",
  "days": [
    {
      "day": 1,
      "theme": "short title",
      "morning": { "activity": "name", "description": "1 sentence.", "tip": "short tip", "duration": "X hrs" },
      "afternoon": { "activity": "name", "description": "1 sentence.", "tip": "short tip", "duration": "X hrs" },
      "evening": { "activity": "name", "description": "1 sentence.", "tip": "short tip", "duration": "X hrs" },
      "lunch": { "name": "restaurant", "cuisine": "type", "priceRange": "$$", "note": "what to order" },
      "dinner": { "name": "restaurant", "cuisine": "type", "priceRange": "$$", "note": "what to order" },
      "transport": "short tip",
      "budget": "cost"
    }
  ],
  "packingTips": ["tip1", "tip2", "tip3"],
  "localPhrases": [{"phrase": "word", "translation": "local", "pronunciation": "how"}],
  "emergencyInfo": {"localEmergency": "number", "touristHelpline": "N/A", "nearestHospital": "advice"}
}`;

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --cream: #FAFAF8;
    --white: #FFFFFF;
    --ink: #1A1A1A;
    --ink-light: #4A4A4A;
    --ink-muted: #8A8A8A;
    --ink-faint: #C4C4C4;
    --gold: #C9974A;
    --gold-light: #F0DDB8;
    --gold-pale: #FDF6EB;
    --border: #E8E4DE;
    --border-strong: #D0C9BE;
    --shadow-sm: 0 1px 4px rgba(26,26,26,0.07);
    --shadow-md: 0 4px 20px rgba(26,26,26,0.10);
    --shadow-lg: 0 12px 48px rgba(26,26,26,0.13);
    --radius: 8px;
    --radius-lg: 16px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--cream); color: var(--ink); font-family: 'DM Sans', sans-serif; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

  input, select, textarea {
    background: var(--white) !important;
    border: 1.5px solid var(--border) !important;
    color: var(--ink) !important;
    outline: none !important;
    transition: border-color .18s, box-shadow .18s !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--gold) !important;
    box-shadow: 0 0 0 3px rgba(201,151,74,0.12) !important;
  }
  input::placeholder, textarea::placeholder { color: var(--ink-faint) !important; }
  input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
  option { background: var(--white) !important; color: var(--ink) !important; }

  .btn-primary {
    background: var(--ink) !important;
    color: var(--white) !important;
    border: none !important;
    transition: all .2s !important;
    cursor: pointer !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  .btn-primary:hover { background: #2d2d2d !important; transform: translateY(-1px); box-shadow: var(--shadow-md) !important; }

  .btn-gold {
    background: transparent !important;
    border: 1.5px solid var(--gold) !important;
    color: var(--gold) !important;
    transition: all .2s !important;
    cursor: pointer !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  .btn-gold:hover { background: var(--gold-pale) !important; }

  .btn-outline {
    background: transparent !important;
    border: 1.5px solid var(--border-strong) !important;
    color: var(--ink-light) !important;
    transition: all .2s !important;
    cursor: pointer !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  .btn-outline:hover { border-color: var(--ink) !important; color: var(--ink) !important; }

  .tag-btn { transition: all .18s !important; cursor: pointer !important; }
  .tag-btn:hover { border-color: var(--gold) !important; }

  .hamburger-btn { cursor: pointer !important; transition: all .2s !important; }
  .hamburger-btn:hover { opacity: 0.7 !important; }

  .dropdown-menu {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    min-width: 260px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    overflow: hidden;
    animation: fadeIn .15s ease;
  }
  .menu-open .dropdown-menu { display: block !important; }
  .dropdown-item { transition: background .12s !important; cursor: pointer !important; }
  .dropdown-item:hover { background: var(--cream) !important; }

  .trip-card:hover { border-color: var(--gold) !important; box-shadow: var(--shadow-md) !important; transform: translateY(-2px); }
  .trip-card { transition: all .2s !important; cursor: pointer !important; }

  .day-tab:hover { background: var(--gold-pale) !important; border-color: var(--gold) !important; }
  .day-tab { transition: all .18s !important; cursor: pointer !important; }

  .auth-tab:hover { color: var(--gold) !important; }
  .auth-tab { transition: color .15s !important; cursor: pointer !important; }

  .nav-link { transition: color .15s !important; cursor: pointer !important; }
  .nav-link:hover { color: var(--gold) !important; }

  .back-btn:hover { color: var(--gold) !important; }
  .back-btn { transition: color .2s !important; cursor: pointer !important; }

  .form-section { animation: fadeUp .4s ease both; }
  .traveler-opt { transition: all .18s !important; cursor: pointer !important; }
  .traveler-opt:hover { border-color: var(--gold) !important; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--cream); }
  ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
`;

const appStyle = {
  minHeight: "100vh",
  background: "var(--cream)",
  color: "var(--ink)",
  fontFamily: "'DM Sans', sans-serif",
};

export default function TravelPlanner() {
  const [step, setStep] = useState("landing");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [savedTrips, setSavedTrips] = useState([]);
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({
    destination: "", startDate: "", endDate: "", budget: "",
    interests: [], style: "", travelers: "1", notes: ""
  });
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState("");
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userCurrency, setUserCurrency] = useState("USD");
  const [userCurrencySymbol, setUserCurrencySymbol] = useState("$");
  const [budgetOptions, setBudgetOptions] = useState(["< $50/day", "$50–$150/day", "$150–$300/day", "$300+/day"]);
  const [allRates, setAllRates] = useState({});

  // Refs for auto-focus
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const budgetRef = useRef(null);
  const travelersRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();
        const currency = ipData.currency || "USD";
        const ratesRes = await fetch(`https://api.frankfurter.app/latest?from=USD`);
        const ratesData = await ratesRes.json();
        const rate = ratesData.rates[currency] || 1;
        const sym = CURRENCY_SYMBOLS[currency] || currency + " ";
        setUserCurrency(currency);
        setUserCurrencySymbol(sym);
        const r50 = Math.round((50 * rate) / 50) * 50;
        const r150 = Math.round((150 * rate) / 50) * 50;
        const r300 = Math.round((300 * rate) / 50) * 50;
        setBudgetOptions([`< ${sym}${r50}/day`, `${sym}${r50}–${sym}${r150}/day`, `${sym}${r150}–${sym}${r300}/day`, `${sym}${r300}+/day`]);
        setAllRates(ratesData.rates);
      } catch (e) {}
    };
    detectCurrency();
  }, []);

  useEffect(() => { if (user) loadSavedTrips(); }, [user]);

  const loadSavedTrips = async () => {
    const { data, error } = await supabase.from("itineraries").select("*").order("created_at", { ascending: false });
    if (!error) setSavedTrips(data || []);
  };

  const saveTrip = async () => {
    if (!user) { setStep("auth"); return; }
    setSavingTrip(true);
    const { error } = await supabase.from("itineraries").insert({
      user_id: user.id, destination: form.destination, start_date: form.startDate,
      end_date: form.endDate, travelers: form.travelers, budget: form.budget,
      interests: form.interests, style: form.style, itinerary
    });
    setSavingTrip(false);
    if (!error) { setTripSaved(true); loadSavedTrips(); }
  };

  const deleteTrip = async (id, e) => {
    e.stopPropagation();
    await supabase.from("itineraries").delete().eq("id", id);
    loadSavedTrips();
  };

  const loadTrip = (trip) => {
    setForm({ destination: trip.destination, startDate: trip.start_date, endDate: trip.end_date, travelers: trip.travelers, budget: trip.budget, interests: trip.interests || [], style: trip.style, notes: "" });
    setItinerary(trip.itinerary);
    setActiveDay(0);
    setTripSaved(true);
    setStep("result");
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  const handleEmailAuth = async () => {
    setAuthError("");
    setAuthSubmitting(true);
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) setAuthError(error.message);
      else { setStep("landing"); setMenuOpen(false); }
    } else {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName } } });
      if (error) setAuthError(error.message);
      else setAuthError("✅ Check your email to confirm your account!");
    }
    setAuthSubmitting(false);
  };

  const updateCurrency = async (currency) => {
    try {
      const rate = allRates[currency] || 1;
      const sym = CURRENCY_SYMBOLS[currency] || currency + " ";
      setUserCurrency(currency);
      setUserCurrencySymbol(sym);
      const r50 = Math.round((50 * rate) / 50) * 50;
      const r150 = Math.round((150 * rate) / 50) * 50;
      const r300 = Math.round((300 * rate) / 50) * 50;
      setBudgetOptions([`< ${sym}${r50}/day`, `${sym}${r50}–${sym}${r150}/day`, `${sym}${r150}–${sym}${r300}/day`, `${sym}${r300}+/day`]);
    } catch (e) {}
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setStep("landing"); setSavedTrips([]); setMenuOpen(false); };

  const handleDestInput = (val) => {
    setForm(f => ({ ...f, destination: val }));
    if (val.length > 1) {
      const filtered = SAMPLE_DESTINATIONS.filter(d => d.toLowerCase().includes(val.toLowerCase()));
      setDestSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else setShowSuggestions(false);
  };

  const handleDestSelect = (d) => {
    setForm(f => ({ ...f, destination: d }));
    setShowSuggestions(false);
    setTimeout(() => startDateRef.current?.focus(), 50);
  };

  const handleDestKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      setShowSuggestions(false);
      setTimeout(() => startDateRef.current?.focus(), 50);
    }
  };

  const handleStartDateChange = (val) => {
    setForm(f => ({ ...f, startDate: val }));
  };

  const handleEndDateChange = (val) => {
    setForm(f => ({ ...f, endDate: val }));
  };

  const handleStartDateKeyDown = (e) => {
    if (e.key === "Enter" && form.startDate) {
      endDateRef.current?.focus();
    }
  };

  const handleEndDateKeyDown = (e) => {
    if (e.key === "Enter" && form.endDate) {
      budgetRef.current?.focus();
    }
  };

  const handleBudgetChange = (val) => {
    setForm(f => ({ ...f, budget: val }));
    setTimeout(() => travelersRef.current?.focus(), 50);
  };

  const toggleInterest = (interest) => {
    setForm(f => ({ ...f, interests: f.interests.includes(interest) ? f.interests.filter(i => i !== interest) : [...f.interests, interest] }));
  };

  const getDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.min(diff + 1, 15));
  };

  const generateItinerary = async () => {
    setLoading(true); setError(""); setTripSaved(false);
    const days = getDays();
    const maxTokens = Math.min(2000 + (days * 900), 8000);
    const userPrompt = `Plan a ${days}-day trip to ${form.destination} for ${form.travelers} traveler(s). Budget: ${form.budget}. Style: ${form.style}. Interests: ${form.interests.join(", ")}. Dates: ${form.startDate} to ${form.endDate}. Notes: ${form.notes || "none"}. Generate exactly ${days} days. Be concise — all descriptions must be 1 sentence only.`;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-itinerary`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] })
      });
      const data = await res.json();
      const raw = data.content.map(b => b.text || "").join("");
      let cleaned = raw.replace(/```json|```/g, "").trim();

      // If JSON is truncated, attempt to close it gracefully
      if (!cleaned.endsWith("}")) {
        const lastGoodDay = cleaned.lastIndexOf("},");
        if (lastGoodDay !== -1) {
          cleaned = cleaned.substring(0, lastGoodDay + 1) + "]}";
        }
      }

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (jsonErr) {
        throw new Error(`Itinerary was too long and got cut off. Try selecting fewer days (7 or under) or simplify your interests.`);
      }

      setItinerary(parsed); setActiveDay(0); setStep("result");
    } catch (e) {
      setError("Failed to generate itinerary: " + (e?.message || String(e)));
    } finally { setLoading(false); }
  };

  const isFormValid = form.destination && form.startDate && form.endDate && form.budget && form.style && form.interests.length > 0;

  // ─── NAVBAR ───────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0 40px", height: 68,
      background: "rgba(250,250,248,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Logo */}
      <span onClick={() => setStep("landing")} style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, cursor: "pointer", color: "var(--ink)", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 6 }}>
        Wander<span style={{ color: "var(--gold)" }}>AI</span>
      </span>

      {/* Center links */}
      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        <span className="nav-link" onClick={() => setStep("form")} style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--ink-light)", letterSpacing: "0.01em" }}>Plan a Trip</span>
        {user && <span className="nav-link" onClick={() => setStep("trips")} style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--ink-light)" }}>My Trips</span>}
      </div>

      {/* Hamburger menu */}
      <div ref={menuRef} className={`account-dropdown ${menuOpen ? "menu-open" : ""}`} style={{ position: "relative" }}>
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(o => !o)}
          style={{ background: "none", border: "1.5px solid var(--border-strong)", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4, alignItems: "center", justifyContent: "center", width: 44, height: 40 }}
          aria-label="Menu"
        >
          {[0,1,2].map(i => (
            <span key={i} style={{ display: "block", width: 18, height: 1.5, background: "var(--ink)", borderRadius: 2, transition: "all .2s" }} />
          ))}
        </button>

        <div className="dropdown-menu" style={{ minWidth: 280 }}>
          {user ? (
            <>
              {/* User info */}
              <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", background: "var(--gold-pale)" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: 700, color: "var(--white)", marginBottom: 10 }}>
                  {(user?.user_metadata?.full_name || user?.email || "U")[0].toUpperCase()}
                </div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{user?.user_metadata?.full_name || "—"}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>{user?.email}</div>
              </div>

              {/* Currency */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 8 }}>Currency</div>
                <select value={userCurrency} onChange={e => updateCurrency(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: "0.88rem" }}>
                  {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c} — {CURRENCY_SYMBOLS[c]}</option>)}
                </select>
              </div>

              {/* Actions */}
              <div className="dropdown-item" onClick={() => { setStep("trips"); setMenuOpen(false); }} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--ink-light)", fontSize: "0.88rem", fontWeight: 500, borderBottom: "1px solid var(--border)" }}>
                <span>🔖</span> Saved Trips
              </div>
              <div className="dropdown-item" onClick={() => { setStep("form"); setMenuOpen(false); }} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--ink-light)", fontSize: "0.88rem", fontWeight: 500, borderBottom: "1px solid var(--border)" }}>
                <span>✈️</span> New Trip
              </div>
              <div className="dropdown-item" onClick={handleSignOut} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, color: "#D44", fontSize: "0.88rem", fontWeight: 500 }}>
                <span>🚪</span> Sign Out
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: 4 }}>Welcome to WanderAI</div>
                <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)" }}>Sign in to save and revisit your trips.</div>
              </div>
              <div className="dropdown-item" onClick={() => { setStep("auth"); setAuthMode("login"); setMenuOpen(false); }} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--ink)", fontSize: "0.88rem", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
                Sign In
              </div>
              <div className="dropdown-item" onClick={() => { setStep("auth"); setAuthMode("signup"); setMenuOpen(false); }} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--ink-light)", fontSize: "0.88rem", fontWeight: 500 }}>
                Create Account
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ ...appStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <style>{globalCSS}</style>
      <div style={{ width: 28, height: 28, border: "2px solid var(--border)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
    </div>
  );

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  if (step === "auth") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Left panel */}
        <div style={{ flex: 1, background: "var(--ink)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 60px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(201,151,74,0.12)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(201,151,74,0.07)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 20 }}>WanderAI</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: "2.8rem", lineHeight: 1.2, color: "var(--white)", marginBottom: 20 }}>
              Your next adventure<br /><em style={{ color: "var(--gold-light)" }}>starts here.</em>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 340 }}>
              AI-powered itineraries crafted in seconds. From hidden gems to iconic landmarks — planned perfectly for you.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 60px" }}>
          <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp .5s ease" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.9rem", marginBottom: 6, color: "var(--ink)" }}>
              {authMode === "login" ? "Welcome back" : "Get started"}
            </h3>
            <p style={{ color: "var(--ink-muted)", marginBottom: 32, fontSize: "0.9rem" }}>
              {authMode === "login" ? "Sign in to access your trips" : "Create your account to begin"}
            </p>

            <button className="btn-outline" onClick={handleGoogleLogin} style={{ width: "100%", padding: "13px", borderRadius: 8, fontSize: "0.9rem", fontWeight: 500, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ color: "var(--ink-faint)", fontSize: "0.8rem" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {authMode === "signup" && (
                <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Full name" style={{ width: "100%", padding: "13px 16px", borderRadius: 8, fontSize: "0.95rem" }} />
              )}
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email address" style={{ width: "100%", padding: "13px 16px", borderRadius: 8, fontSize: "0.95rem" }} />
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" style={{ width: "100%", padding: "13px 16px", borderRadius: 8, fontSize: "0.95rem" }} />
              {authError && (
                <div style={{ fontSize: "0.87rem", padding: "10px 14px", background: authError.startsWith("✅") ? "rgba(34,197,94,0.08)" : "rgba(220,38,38,0.08)", border: `1px solid ${authError.startsWith("✅") ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.2)"}`, borderRadius: 6, color: authError.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
                  {authError}
                </div>
              )}
              <button className="btn-primary" onClick={handleEmailAuth} disabled={authSubmitting} style={{ width: "100%", padding: "14px", borderRadius: 8, fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {authSubmitting && <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />}
                {authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </div>

            <p style={{ textAlign: "center", marginTop: 20, color: "var(--ink-muted)", fontSize: "0.88rem" }}>
              {authMode === "login" ? "New to WanderAI? " : "Already have an account? "}
              <span className="auth-tab" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }} style={{ color: "var(--gold)", fontWeight: 600, cursor: "pointer" }}>
                {authMode === "login" ? "Sign up free" : "Sign in"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── SAVED TRIPS ──────────────────────────────────────────────────────────
  if (step === "trips") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "100px 24px 60px", animation: "fadeUp .5s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>Your Collection</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "2.4rem", color: "var(--ink)" }}>Saved Trips</h2>
            <p style={{ color: "var(--ink-muted)", marginTop: 4, fontSize: "0.9rem" }}>{savedTrips.length} saved itinerar{savedTrips.length === 1 ? "y" : "ies"}</p>
          </div>
          <button className="btn-primary" onClick={() => setStep("form")} style={{ padding: "12px 24px", borderRadius: 8, fontSize: "0.88rem", fontWeight: 600 }}>+ New Trip</button>
        </div>

        {savedTrips.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--ink-muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>✈️</div>
            <p style={{ fontSize: "1rem", marginBottom: 20 }}>No saved trips yet.</p>
            <button className="btn-gold" onClick={() => setStep("form")} style={{ padding: "12px 28px", borderRadius: 8, fontSize: "0.88rem", fontWeight: 600 }}>Plan your first trip</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {savedTrips.map(trip => (
              <div key={trip.id} className="trip-card" onClick={() => loadTrip(trip)} style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "22px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "var(--shadow-sm)" }}>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.25rem", marginBottom: 6, color: "var(--ink)" }}>{trip.destination}</h3>
                  <div style={{ display: "flex", gap: 16, color: "var(--ink-muted)", fontSize: "0.83rem", flexWrap: "wrap", marginBottom: 10 }}>
                    <span>📅 {trip.start_date} → {trip.end_date}</span>
                    <span>👥 {trip.travelers} traveler{trip.travelers > 1 ? "s" : ""}</span>
                    <span>💰 {trip.budget}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(trip.interests || []).slice(0, 4).map((interest, idx) => (
                      <span key={idx} style={{ fontSize: "0.75rem", padding: "3px 10px", background: "var(--gold-pale)", border: "1px solid var(--gold-light)", borderRadius: 4, color: "var(--gold)", fontWeight: 500 }}>{interest}</span>
                    ))}
                  </div>
                </div>
                <button onClick={(e) => deleteTrip(trip.id, e)} style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: "1.1rem", cursor: "pointer", padding: 8, borderRadius: 6, transition: "all .15s" }}
                  onMouseEnter={e => e.target.style.color = "#dc2626"} onMouseLeave={e => e.target.style.color = "var(--ink-faint)"}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── LANDING ──────────────────────────────────────────────────────────────
  if (step === "landing") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />

      {/* Hero */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "140px 40px 80px", animation: "fadeUp .7s ease" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--gold-pale)", border: "1px solid var(--gold-light)", borderRadius: 20, padding: "5px 14px", marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", display: "inline-block" }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--gold)", letterSpacing: "0.05em" }}>AI-Powered Travel Planning</span>
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "clamp(42px, 5vw, 62px)", lineHeight: 1.1, color: "var(--ink)", marginBottom: 22, letterSpacing: "-0.02em" }}>
              Plan trips that<br /><em style={{ color: "var(--gold)", fontStyle: "italic" }}>feel crafted,</em><br />not generated.
            </h1>
            <p style={{ fontSize: "1.05rem", color: "var(--ink-light)", lineHeight: 1.75, marginBottom: 40, maxWidth: 440, fontWeight: 300 }}>
              Describe your dream getaway — dates, vibe, budget — and receive a complete, day-by-day itinerary in seconds.
            </p>
            <div style={{ display: "flex", gap: 14 }}>
              <button className="btn-primary" onClick={() => setStep("form")} style={{ padding: "15px 36px", borderRadius: 8, fontSize: "0.95rem", fontWeight: 600 }}>
                Start Planning
              </button>
              {!user && (
                <button className="btn-outline" onClick={() => setStep("auth")} style={{ padding: "15px 28px", borderRadius: 8, fontSize: "0.95rem", fontWeight: 500 }}>
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Feature cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { icon: "🗓", title: "Day-by-day Plans", desc: "Morning, afternoon & evening activities planned" },
              { icon: "🍽", title: "Restaurant Picks", desc: "Curated lunch and dinner recommendations" },
              { icon: "🔖", title: "Save & Revisit", desc: "Store your itineraries for future reference" },
              { icon: "🌍", title: "Any Destination", desc: "Cities, beaches, mountains — anywhere" },
            ].map((f, i) => (
              <div key={i} style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "20px", boxShadow: "var(--shadow-sm)", animation: `fadeUp .5s ease ${i * 0.1}s both` }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--ink)", marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "28px 40px", display: "flex", justifyContent: "center", gap: 64, color: "var(--ink-muted)", fontSize: "0.83rem", fontWeight: 500 }}>
        {["Free to use", "No account required to plan", "Powered by advanced AI"].map(t => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--gold)" }}>✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  );

  // ─── LOADING SCREEN ───────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...appStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 28 }}>
      <style>{globalCSS}</style>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div style={{ position: "absolute", inset: 0, border: "1.5px solid var(--border)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", inset: 0, border: "1.5px solid transparent", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>✈️</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.6rem", color: "var(--ink)", marginBottom: 8 }}>Crafting your itinerary</div>
        <div style={{ color: "var(--ink-muted)", fontSize: "0.9rem" }}>Planning the perfect trip to {form.destination}…</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {["Researching places", "Finding restaurants", "Building schedule"].map((label, i) => (
          <div key={i} style={{ fontSize: "0.75rem", padding: "5px 12px", background: "var(--gold-pale)", border: "1px solid var(--gold-light)", borderRadius: 4, color: "var(--gold)", fontWeight: 500, animation: `shimmer 1.5s ease ${i * 0.3}s infinite` }}>{label}</div>
        ))}
      </div>
    </div>
  );

  // ─── FORM ─────────────────────────────────────────────────────────────────
  if (step === "form") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "100px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48, animation: "fadeUp .4s ease" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>New Itinerary</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "clamp(28px, 4vw, 44px)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Where are you headed?</h2>
          <p style={{ color: "var(--ink-muted)", marginTop: 6, fontSize: "0.92rem" }}>Fill in your trip details and we'll plan everything.</p>
        </div>

        <div style={{ display: "grid", gap: 32 }}>

          {/* Destination */}
          <div className="form-section" style={{ animationDelay: "0.05s" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 8 }}>Destination</label>
            <div style={{ position: "relative" }}>
              <input
                value={form.destination}
                onChange={e => handleDestInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={handleDestKeyDown}
                placeholder="e.g. Kyoto, Japan"
                style={{ width: "100%", padding: "14px 16px", borderRadius: 8, fontSize: "1rem" }}
              />
              {showSuggestions && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--white)", border: "1.5px solid var(--border)", borderTop: "none", borderRadius: "0 0 8px 8px", zIndex: 10, boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
                  {destSuggestions.map(d => (
                    <div key={d} onClick={() => handleDestSelect(d)} style={{ padding: "12px 16px", cursor: "pointer", fontSize: "0.95rem", color: "var(--ink-light)", transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--cream)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      📍 {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="form-section" style={{ animationDelay: "0.1s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Start Date", "startDate", startDateRef, handleStartDateChange, handleStartDateKeyDown], ["End Date", "endDate", endDateRef, handleEndDateChange, handleEndDateKeyDown]].map(([label, key, ref, onChange, onKeyDown]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 8 }}>{label}</label>
                  <input
                    type="date"
                    ref={ref}
                    value={form[key]}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    style={{ width: "100%", padding: "14px 16px", borderRadius: 8, fontSize: "0.95rem" }}
                  />
                </div>
              ))}
            </div>
            {getDays() > 0 && (
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold-pale)", border: "1px solid var(--gold-light)", borderRadius: 6, padding: "5px 12px" }}>
                <span style={{ color: "var(--gold)", fontWeight: 600, fontSize: "0.85rem" }}>✦ {getDays()} day{getDays() !== 1 ? "s" : ""} planned</span>
              </div>
            )}
          </div>

          {/* Budget & Travelers */}
          <div className="form-section" style={{ animationDelay: "0.15s", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 8 }}>
                Daily Budget {userCurrency !== "USD" && <span style={{ color: "var(--ink-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.78rem", fontWeight: 400 }}>({userCurrency})</span>}
              </label>
              <select
                ref={budgetRef}
                value={form.budget}
                onChange={e => handleBudgetChange(e.target.value)}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 8, fontSize: "0.95rem" }}
              >
                <option value="">Select budget…</option>
                {budgetOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 8 }}>Travelers</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TRAVELER_OPTIONS.map(n => (
                  <button
                    key={n}
                    className="traveler-opt"
                    onClick={() => setForm(f => ({ ...f, travelers: n }))}
                    ref={n === "1" ? travelersRef : null}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 6,
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      background: form.travelers === n ? "var(--ink)" : "var(--white)",
                      border: `1.5px solid ${form.travelers === n ? "var(--ink)" : "var(--border)"}`,
                      color: form.travelers === n ? "var(--white)" : "var(--ink-light)",
                      transition: "all .15s",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="form-section" style={{ animationDelay: "0.2s" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 12 }}>Interests</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INTERESTS.map(interest => (
                <button key={interest} className="tag-btn" onClick={() => toggleInterest(interest)} style={{
                  background: form.interests.includes(interest) ? "var(--ink)" : "var(--white)",
                  border: `1.5px solid ${form.interests.includes(interest) ? "var(--ink)" : "var(--border)"}`,
                  color: form.interests.includes(interest) ? "var(--white)" : "var(--ink-light)",
                  padding: "9px 16px", borderRadius: 20, fontSize: "0.88rem", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Travel Style */}
          <div className="form-section" style={{ animationDelay: "0.25s" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 12 }}>Travel Style</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STYLES.map(s => (
                <button key={s} className="tag-btn" onClick={() => setForm(f => ({ ...f, style: s }))} style={{
                  background: form.style === s ? "var(--gold)" : "var(--white)",
                  border: `1.5px solid ${form.style === s ? "var(--gold)" : "var(--border)"}`,
                  color: form.style === s ? "var(--white)" : "var(--ink-light)",
                  padding: "9px 18px", borderRadius: 20, fontSize: "0.88rem", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-section" style={{ animationDelay: "0.3s" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 8 }}>
              Special Notes <span style={{ color: "var(--ink-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.8rem", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. honeymoon trip, vegetarian only, avoid tourist traps…"
              rows={3}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 8, fontSize: "0.95rem", resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: "0.88rem", padding: "12px 16px", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8 }}>
              {error}
            </div>
          )}

          <div className="form-section" style={{ animationDelay: "0.35s" }}>
            <button
              className="btn-primary"
              onClick={generateItinerary}
              disabled={!isFormValid || loading}
              style={{
                width: "100%", padding: "17px", borderRadius: 8,
                fontSize: "0.95rem", fontWeight: 600,
                opacity: isFormValid ? 1 : 0.45,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              {loading ? (
                <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />Crafting your itinerary…</>
              ) : (
                <>Generate Itinerary →</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── RESULT ───────────────────────────────────────────────────────────────
  if (step === "result" && itinerary) {
    const day = itinerary.days?.[activeDay];
    const timeBlocks = day ? [
      { label: "Morning", icon: "🌅", data: day.morning },
      { label: "Afternoon", icon: "☀️", data: day.afternoon },
      { label: "Evening", icon: "🌙", data: day.evening },
    ] : [];

    return (
      <div style={appStyle}>
        <style>{globalCSS}</style>
        <Navbar />
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "100px 24px 80px" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 44, animation: "fadeUp .5s ease" }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>Your Itinerary</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "clamp(32px, 5vw, 52px)", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{form.destination}</h1>
              <p style={{ color: "var(--ink-muted)", marginTop: 8, fontSize: "0.9rem" }}>
                {itinerary.days?.length} days · {form.startDate} → {form.endDate} · {form.travelers} traveler{form.travelers !== "1" ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              <button className="back-btn" onClick={() => setStep("form")} style={{ background: "none", border: "none", color: "var(--ink-muted)", fontSize: "0.85rem", fontWeight: 500, display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>← Replan</button>
              {!tripSaved ? (
                <button className="btn-gold" onClick={saveTrip} disabled={savingTrip} style={{ padding: "9px 20px", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  {savingTrip ? <span style={{ width: 12, height: 12, border: "2px solid rgba(201,151,74,.3)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} /> : "🔖"} Save Trip
                </button>
              ) : (
                <span style={{ color: "var(--gold)", fontSize: "0.82rem", fontWeight: 600 }}>✓ Saved</span>
              )}
            </div>
          </div>

          {/* Summary card */}
          <div style={{ background: "var(--gold-pale)", border: "1.5px solid var(--gold-light)", borderRadius: 12, padding: "26px 30px", marginBottom: 28 }}>
            <p style={{ color: "var(--ink-light)", lineHeight: 1.8, fontSize: "1rem", marginBottom: 18, fontStyle: "italic" }}>{itinerary.summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 28, paddingTop: 18, borderTop: "1px solid var(--gold-light)" }}>
              <div><div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>Est. Daily</div><div style={{ fontWeight: 600, color: "var(--ink)" }}>{itinerary.dailyBudget}</div></div>
              <div><div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>Best Time</div><div style={{ color: "var(--ink-light)", fontSize: "0.9rem" }}>{itinerary.bestTimeNote}</div></div>
            </div>
            {itinerary.highlights?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                {itinerary.highlights.map((h, i) => (
                  <span key={i} style={{ fontSize: "0.8rem", padding: "4px 12px", background: "var(--white)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--ink-light)", fontWeight: 500 }}>✦ {h}</span>
                ))}
              </div>
            )}
          </div>

          {/* Day tabs — week view with pagination */}
          {(() => {
            const WEEK = 7;
            const totalDays = itinerary.days?.length || 0;
            const totalWeeks = Math.ceil(totalDays / WEEK);
            const currentWeek = Math.floor(activeDay / WEEK);
            const weekStart = currentWeek * WEEK;
            const weekEnd = Math.min(weekStart + WEEK, totalDays);
            const visibleDays = itinerary.days?.slice(weekStart, weekEnd);

            return (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Prev week arrow */}
                  <button
                    onClick={() => setActiveDay(weekStart - WEEK)}
                    disabled={currentWeek === 0}
                    style={{
                      background: "var(--white)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 6,
                      width: 36, height: 36,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: currentWeek === 0 ? "not-allowed" : "pointer",
                      opacity: currentWeek === 0 ? 0.35 : 1,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                      transition: "all .15s",
                    }}
                  >‹</button>

                  {/* Visible day tabs */}
                  <div style={{ display: "flex", gap: 6, flex: 1 }}>
                    {visibleDays?.map((d, i) => {
                      const dayIndex = weekStart + i;
                      return (
                        <button key={dayIndex} className="day-tab" onClick={() => setActiveDay(dayIndex)} style={{
                          background: activeDay === dayIndex ? "var(--ink)" : "var(--white)",
                          border: `1.5px solid ${activeDay === dayIndex ? "var(--ink)" : "var(--border)"}`,
                          color: activeDay === dayIndex ? "var(--white)" : "var(--ink-light)",
                          padding: "9px 0", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                          flex: 1, textAlign: "center",
                        }}>Day {d.day}</button>
                      );
                    })}
                  </div>

                  {/* Next week arrow */}
                  <button
                    onClick={() => setActiveDay(weekStart + WEEK)}
                    disabled={currentWeek >= totalWeeks - 1}
                    style={{
                      background: "var(--white)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 6,
                      width: 36, height: 36,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: currentWeek >= totalWeeks - 1 ? "not-allowed" : "pointer",
                      opacity: currentWeek >= totalWeeks - 1 ? 0.35 : 1,
                      fontSize: "0.9rem",
                      flexShrink: 0,
                      transition: "all .15s",
                    }}
                  >›</button>
                </div>

                {/* Week indicator — only shown if more than 7 days */}
                {totalDays > WEEK && (
                  <div style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--ink-muted)", textAlign: "center" }}>
                    Week {currentWeek + 1} of {totalWeeks}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Day content */}
          {day && (
            <div key={activeDay} style={{ animation: "fadeUp .35s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.6rem", color: "var(--ink)" }}>{day.theme}</h2>
                {day.transport && <p style={{ color: "var(--ink-muted)", marginTop: 6, fontSize: "0.88rem" }}>🚇 {day.transport}</p>}
                {day.budget && <p style={{ color: "var(--gold)", marginTop: 4, fontSize: "0.85rem", fontWeight: 500 }}>💰 Estimated: {day.budget}</p>}
              </div>

              <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                {timeBlocks.map(({ label, icon, data }) => data && (
                  <div key={label} style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--gold-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{icon}</div>
                        <div>
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 2 }}>{label}</div>
                          <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.15rem", color: "var(--ink)" }}>{data.activity}</h3>
                        </div>
                      </div>
                      {data.duration && <span style={{ fontSize: "0.78rem", color: "var(--ink-muted)", background: "var(--cream)", padding: "3px 8px", borderRadius: 4, flexShrink: 0 }}>{data.duration}</span>}
                    </div>
                    <p style={{ color: "var(--ink-light)", lineHeight: 1.7, marginBottom: 10, fontSize: "0.93rem" }}>{data.description}</p>
                    {data.tip && (
                      <div style={{ borderLeft: "3px solid var(--gold-light)", paddingLeft: 12, color: "var(--ink-muted)", fontSize: "0.84rem", fontStyle: "italic" }}>💡 {data.tip}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Meals */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                {[["Lunch", day.lunch, "🥢"], ["Dinner", day.dinner, "🍽"]].map(([label, meal, icon]) => meal && (
                  <div key={label} style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "20px 22px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 10 }}>{icon} {label}</div>
                    <h4 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.1rem", marginBottom: 6, color: "var(--ink)" }}>{meal.name}</h4>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>{meal.cuisine}</span>
                      <span style={{ color: "var(--gold)", fontSize: "0.82rem", fontWeight: 600 }}>{meal.priceRange}</span>
                    </div>
                    {meal.note && <p style={{ fontSize: "0.83rem", color: "var(--ink-muted)", fontStyle: "italic" }}>{meal.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
            {itinerary.packingTips?.length > 0 && (
              <div style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 14 }}>🎒 Packing Tips</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {itinerary.packingTips.map((t, i) => (
                    <li key={i} style={{ fontSize: "0.88rem", color: "var(--ink-light)", paddingLeft: 16, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: "var(--gold)", fontWeight: 600 }}>·</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {itinerary.localPhrases?.length > 0 && (
              <div style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 14 }}>💬 Useful Phrases</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {itinerary.localPhrases.map((p, i) => (
                    <div key={i}>
                      <div style={{ fontSize: "0.88rem", color: "var(--ink)", fontWeight: 500 }}>{p.phrase} → <span style={{ color: "var(--gold)", fontWeight: 600 }}>{p.translation}</span></div>
                      <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)", fontStyle: "italic" }}>{p.pronunciation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 48, textAlign: "center" }}>
            <button className="btn-outline" onClick={() => { setStep("form"); setItinerary(null); setTripSaved(false); }} style={{ padding: "14px 40px", borderRadius: 8, fontSize: "0.88rem", fontWeight: 500 }}>
              Plan Another Trip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}