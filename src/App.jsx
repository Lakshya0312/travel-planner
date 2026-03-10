import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const INTERESTS = ["🍜 Food", "🏛 History", "🌿 Nature", "🎭 Nightlife", "🛍 Shopping", "🎨 Art", "🏄 Adventure", "🧘 Wellness"];
const STYLES = ["🎒 Backpacking", "🏨 Luxury", "🚶 Slow Travel", "⚡ Fast-Paced", "👨‍👩‍👧 Family"];
const BUDGETS = ["< $50/day", "$50–$150/day", "$150–$300/day", "$300+/day"];
const SAMPLE_DESTINATIONS = ["Tokyo", "Paris", "Kyoto", "Bali", "New York", "Rome", "Bangkok", "Barcelona"];

const systemPrompt = `You are an expert AI travel planner. When given travel details, generate a complete, practical trip itinerary in JSON format only. No markdown, no explanation, just raw JSON.

Return this exact structure:
{
  "summary": "2-3 sentence trip overview",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "dailyBudget": "estimated daily cost string",
  "bestTimeNote": "note about timing",
  "days": [
    {
      "day": 1,
      "theme": "theme title for the day",
      "morning": { "activity": "activity name", "description": "2 sentence description", "tip": "practical tip", "duration": "X hours" },
      "afternoon": { "activity": "activity name", "description": "2 sentence description", "tip": "practical tip", "duration": "X hours" },
      "evening": { "activity": "activity name", "description": "2 sentence description", "tip": "practical tip", "duration": "X hours" },
      "lunch": { "name": "restaurant name", "cuisine": "cuisine type", "priceRange": "$/$$/$$$/$$$$", "note": "what to order" },
      "dinner": { "name": "restaurant name", "cuisine": "cuisine type", "priceRange": "$/$$/$$$/$$$$", "note": "what to order" },
      "transport": "transport tip for the day",
      "budget": "estimated day cost"
    }
  ],
  "packingTips": ["tip1", "tip2", "tip3"],
  "localPhrases": [{"phrase": "hello", "translation": "local word", "pronunciation": "pronunciation"}],
  "emergencyInfo": {"localEmergency": "number", "touristHelpline": "number or N/A", "nearestHospital": "general advice"}
}`;

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cormorant+Garamond:wght@300;400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0f; }
  @keyframes float { from { transform: translateY(0px) scale(1); } to { transform: translateY(-30px) scale(1.2); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  input, select, textarea { background: rgba(240,237,232,0.04) !important; border: 1px solid rgba(240,237,232,0.12) !important; color: #f0ede8 !important; outline: none !important; transition: border-color .2s !important; }
  input:focus, select:focus, textarea:focus { border-color: rgba(212,175,100,0.5) !important; }
  input::placeholder, textarea::placeholder { color: rgba(240,237,232,0.3) !important; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(.7); }
  option { background: #1a1a22 !important; }
  .tag-btn:hover { background: rgba(212,175,100,0.15) !important; border-color: rgba(212,175,100,0.5) !important; }
  .tag-btn { transition: all .2s !important; cursor: pointer !important; }
  .hero-btn:hover { transform: translateY(-2px); background: rgba(212,175,100,0.15) !important; }
  .hero-btn { transition: all .3s ease !important; cursor: pointer !important; }
  .gen-btn:hover:not(:disabled) { background: rgba(212,175,100,0.2) !important; }
  .gen-btn { transition: all .3s !important; cursor: pointer !important; }
  .back-btn:hover { color: rgba(212,175,100,0.8) !important; }
  .back-btn { transition: color .2s !important; cursor: pointer !important; }
  .day-tab:hover { background: rgba(212,175,100,0.1) !important; }
  .day-tab { transition: all .2s !important; cursor: pointer !important; }
  .nav-btn:hover { color: rgba(212,175,100,0.8) !important; }
  .nav-btn { transition: color .2s !important; cursor: pointer !important; }
  .trip-card:hover { border-color: rgba(212,175,100,0.3) !important; transform: translateY(-2px); }
  .trip-card { transition: all .2s !important; cursor: pointer !important; }
  .auth-tab:hover { color: #f0ede8 !important; }
  .auth-tab { transition: all .2s !important; cursor: pointer !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(212,175,100,0.2); border-radius: 2px; }
`;

const appStyle = {
  minHeight: "100vh",
  background: "#0a0a0f",
  color: "#f0ede8",
  fontFamily: "'Crimson Pro', Georgia, serif",
  position: "relative",
  overflow: "hidden"
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
  const particlesRef = useRef([]);

  useEffect(() => {
    particlesRef.current = Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 3 + 1, speed: Math.random() * 20 + 10, delay: Math.random() * 5,
    }));
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
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
      interests: form.interests, style: form.style, itinerary: itinerary
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
      else setStep("landing");
    } else {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName } } });
      if (error) setAuthError(error.message);
      else setAuthError("✅ Check your email to confirm your account!");
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setStep("landing"); setSavedTrips([]); };

  const handleDestInput = (val) => {
    setForm(f => ({ ...f, destination: val }));
    if (val.length > 1) {
      const filtered = SAMPLE_DESTINATIONS.filter(d => d.toLowerCase().includes(val.toLowerCase()));
      setDestSuggestions(filtered); setShowSuggestions(filtered.length > 0);
    } else setShowSuggestions(false);
  };

  const toggleInterest = (interest) => {
    setForm(f => ({ ...f, interests: f.interests.includes(interest) ? f.interests.filter(i => i !== interest) : [...f.interests, interest] }));
  };

  const getDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.min(diff + 1, 7));
  };

  const generateItinerary = async () => {
    setLoading(true); setError(""); setTripSaved(false);
    const days = getDays();
    const userPrompt = `Plan a ${days}-day trip to ${form.destination} for ${form.travelers} traveler(s). Budget: ${form.budget}. Travel style: ${form.style}. Interests: ${form.interests.join(", ")}. Dates: ${form.startDate} to ${form.endDate}. Special notes: ${form.notes || "none"}. Generate exactly ${days} days.`;
    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/claude`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] })
      });
      const data = await res.json();
      const raw = data.content.map(b => b.text || "").join("");
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setItinerary(parsed); setActiveDay(0); setStep("result");
    } catch (e) {
      setError("Failed to generate itinerary. Check your API key and try again.");
    } finally { setLoading(false); }
  };

  const isFormValid = form.destination && form.startDate && form.endDate && form.budget && form.style && form.interests.length > 0;

  const Navbar = () => (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", background: "rgba(10,10,15,0.85)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(240,237,232,0.06)" }}>
      <span onClick={() => setStep("landing")} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 300, cursor: "pointer", color: "#f0ede8" }}>
        Wander<span style={{ color: "rgba(212,175,100,0.8)", fontStyle: "italic" }}>AI</span>
      </span>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {user ? (
          <>
            <button className="nav-btn" onClick={() => setStep("trips")} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.5)", fontSize: "0.85rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>My Trips</button>
            <button className="nav-btn" onClick={() => setStep("profile")} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.5)", fontSize: "0.85rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>
              {user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0]}
            </button>
            <button className="nav-btn" onClick={handleSignOut} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.3)", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>Sign Out</button>
          </>
        ) : (
          <button className="hero-btn" onClick={() => setStep("auth")} style={{ background: "transparent", border: "1px solid rgba(212,175,100,0.3)", color: "#f0ede8", padding: "8px 24px", fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2 }}>Sign In</button>
        )}
      </div>
    </div>
  );

  if (authLoading) return (
    <div style={{ ...appStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{globalCSS}</style>
      <div style={{ width: 24, height: 24, border: "1px solid rgba(212,175,100,0.3)", borderTopColor: "rgba(212,175,100,0.8)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
    </div>
  );

  if (step === "auth") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 420, animation: "fadeIn .5s ease" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.5rem", marginBottom: 8, textAlign: "center" }}>{authMode === "login" ? "Welcome back" : "Create account"}</h2>
          <p style={{ color: "rgba(240,237,232,0.4)", textAlign: "center", marginBottom: 40, fontStyle: "italic" }}>{authMode === "login" ? "Sign in to access your trips" : "Start planning your adventures"}</p>
          <button className="hero-btn" onClick={handleGoogleLogin} style={{ width: "100%", padding: "14px", background: "rgba(240,237,232,0.05)", border: "1px solid rgba(240,237,232,0.15)", color: "#f0ede8", fontSize: "0.9rem", letterSpacing: "0.1em", fontFamily: "'Crimson Pro', serif", borderRadius: 2, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(240,237,232,0.1)" }} />
            <span style={{ color: "rgba(240,237,232,0.3)", fontSize: "0.8rem" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(240,237,232,0.1)" }} />
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {authMode === "signup" && <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Full name" style={{ width: "100%", padding: "13px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }} />}
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email address" style={{ width: "100%", padding: "13px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }} />
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" style={{ width: "100%", padding: "13px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }} />
            {authError && <div style={{ fontSize: "0.9rem", padding: "10px 14px", background: authError.startsWith("✅") ? "rgba(80,200,80,0.1)" : "rgba(200,80,80,0.1)", border: `1px solid ${authError.startsWith("✅") ? "rgba(80,200,80,0.2)" : "rgba(200,80,80,0.2)"}`, borderRadius: 2, color: authError.startsWith("✅") ? "#80c880" : "#e07070" }}>{authError}</div>}
            <button className="gen-btn" onClick={handleEmailAuth} disabled={authSubmitting} style={{ width: "100%", padding: "14px", background: "transparent", border: "1px solid rgba(212,175,100,0.5)", color: "#f0ede8", fontSize: "0.85rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {authSubmitting && <span style={{ width: 16, height: 16, border: "1px solid rgba(212,175,100,0.3)", borderTopColor: "rgba(212,175,100,0.8)", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />}
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </div>
          <p style={{ textAlign: "center", marginTop: 24, color: "rgba(240,237,232,0.4)", fontSize: "0.9rem" }}>
            {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span className="auth-tab" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }} style={{ color: "rgba(212,175,100,0.7)", cursor: "pointer" }}>
              {authMode === "login" ? "Sign up" : "Sign in"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  if (step === "profile") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px 60px", animation: "fadeIn .5s ease" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.5rem", marginBottom: 40 }}>Profile</h2>
        <div style={{ background: "rgba(240,237,232,0.03)", border: "1px solid rgba(240,237,232,0.08)", borderRadius: 3, padding: "32px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(212,175,100,0.15)", border: "1px solid rgba(212,175,100,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: 24 }}>
            {(user?.user_metadata?.full_name || user?.email || "U")[0].toUpperCase()}
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {[["Name", user?.user_metadata?.full_name || "—"], ["Email", user?.email], ["Trips Saved", savedTrips.length], ["Member Since", new Date(user?.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)", marginBottom: 4 }}>{label}</div>
                <div style={{ color: "#f0ede8" }}>{val}</div>
              </div>
            ))}
          </div>
          <button className="back-btn" onClick={handleSignOut} style={{ marginTop: 32, background: "transparent", border: "1px solid rgba(240,237,232,0.15)", color: "rgba(240,237,232,0.5)", padding: "12px 28px", fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2 }}>Sign Out</button>
        </div>
      </div>
    </div>
  );

  if (step === "trips") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 60px", animation: "fadeIn .5s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "2.5rem" }}>My Trips</h2>
            <p style={{ color: "rgba(240,237,232,0.4)", fontStyle: "italic", marginTop: 4 }}>{savedTrips.length} saved itinerar{savedTrips.length === 1 ? "y" : "ies"}</p>
          </div>
          <button className="hero-btn" onClick={() => setStep("form")} style={{ background: "transparent", border: "1px solid rgba(212,175,100,0.4)", color: "#f0ede8", padding: "12px 28px", fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2 }}>+ New Trip</button>
        </div>
        {savedTrips.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(240,237,232,0.3)" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>✈️</div>
            <p style={{ fontStyle: "italic" }}>No saved trips yet. Plan your first adventure!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {savedTrips.map(trip => (
              <div key={trip.id} className="trip-card" onClick={() => loadTrip(trip)} style={{ background: "rgba(240,237,232,0.03)", border: "1px solid rgba(240,237,232,0.08)", borderRadius: 3, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "1.4rem", marginBottom: 6 }}>{trip.destination}</h3>
                  <div style={{ display: "flex", gap: 16, color: "rgba(240,237,232,0.4)", fontSize: "0.85rem", flexWrap: "wrap" }}>
                    <span>📅 {trip.start_date} → {trip.end_date}</span>
                    <span>👥 {trip.travelers} traveler{trip.travelers > 1 ? "s" : ""}</span>
                    <span>💰 {trip.budget}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {(trip.interests || []).slice(0, 3).map((i, idx) => <span key={idx} style={{ fontSize: "0.75rem", padding: "3px 10px", background: "rgba(212,175,100,0.08)", border: "1px solid rgba(212,175,100,0.15)", borderRadius: 1, color: "rgba(212,175,100,0.6)" }}>{i}</span>)}
                  </div>
                </div>
                <button onClick={(e) => deleteTrip(trip.id, e)} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.2)", fontSize: "1.2rem", cursor: "pointer", padding: "8px", transition: "color .2s" }}
                  onMouseEnter={e => e.target.style.color = "#e07070"} onMouseLeave={e => e.target.style.color = "rgba(240,237,232,0.2)"}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (step === "landing") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {particlesRef.current.map(p => <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: "rgba(212,175,100,0.4)", animation: `float ${p.speed}s ease-in-out ${p.delay}s infinite alternate` }} />)}
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,100,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,160,212,0.06) 0%, transparent 70%)" }} />
      </div>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 20px", textAlign: "center", animation: "fadeIn .8s ease" }}>
        <div style={{ fontSize: 13, letterSpacing: "0.4em", color: "rgba(212,175,100,0.7)", marginBottom: 32, textTransform: "uppercase", fontStyle: "italic" }}>Powered by AI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(52px, 8vw, 96px)", lineHeight: 1, marginBottom: 16 }}>
          <span style={{ display: "block" }}>Wander</span>
          <span style={{ display: "block", color: "rgba(212,175,100,0.9)", fontStyle: "italic" }}>Intelligently.</span>
        </h1>
        <p style={{ maxWidth: 520, color: "rgba(240,237,232,0.55)", fontSize: "1.15rem", lineHeight: 1.8, marginBottom: 56, fontWeight: 300 }}>Stop drowning in browser tabs. Describe your dream trip — we'll craft a complete, personalized itinerary in seconds.</p>
        <button className="hero-btn" onClick={() => setStep("form")} style={{ background: "transparent", border: "1px solid rgba(212,175,100,0.4)", color: "#f0ede8", padding: "18px 52px", fontSize: "1rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2 }}>Plan My Trip</button>
        <div style={{ marginTop: 80, display: "flex", gap: 48, color: "rgba(240,237,232,0.3)", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", flexWrap: "wrap", justifyContent: "center" }}>
          {["Day-by-Day Plans", "Restaurant Picks", "Save & Revisit", "Share Trips"].map(f => (
            <span key={f} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><span style={{ color: "rgba(212,175,100,0.5)", fontSize: 18 }}>✦</span>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === "form") return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <Navbar />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "100px 24px 60px", animation: "fadeIn .5s ease" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(32px, 5vw, 52px)", marginBottom: 8 }}>Plan Your Journey</h2>
        <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.95rem", marginBottom: 48, fontStyle: "italic" }}>Tell us about your dream trip</p>
        <div style={{ display: "grid", gap: 28 }}>
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Destination</label>
            <input value={form.destination} onChange={e => handleDestInput(e.target.value)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} placeholder="e.g. Kyoto, Japan" style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1.05rem", fontFamily: "'Crimson Pro', serif" }} />
            {showSuggestions && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1a1a22", border: "1px solid rgba(212,175,100,0.3)", borderTop: "none", zIndex: 10, borderRadius: "0 0 2px 2px" }}>
                {destSuggestions.map(d => <div key={d} onClick={() => { setForm(f => ({ ...f, destination: d })); setShowSuggestions(false); }} style={{ padding: "12px 16px", cursor: "pointer", fontSize: "0.95rem", color: "rgba(240,237,232,0.8)" }} onMouseEnter={e => e.target.style.background = "rgba(212,175,100,0.1)"} onMouseLeave={e => e.target.style.background = "transparent"}>{d}</div>)}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[["Start Date", "startDate"], ["End Date", "endDate"]].map(([label, key]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>{label}</label>
                <input type="date" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }} />
              </div>
            ))}
          </div>
          {getDays() > 0 && <div style={{ fontSize: "0.85rem", color: "rgba(212,175,100,0.6)", fontStyle: "italic", marginTop: -12 }}>✦ {getDays()} day{getDays() !== 1 ? "s" : ""} planned</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Travelers</label>
              <select value={form.travelers} onChange={e => setForm(f => ({ ...f, travelers: e.target.value }))} style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Daily Budget</label>
              <select value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }}>
                <option value="">Select...</option>
                {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 12 }}>Interests</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {INTERESTS.map(interest => <button key={interest} className="tag-btn" onClick={() => toggleInterest(interest)} style={{ background: form.interests.includes(interest) ? "rgba(212,175,100,0.2)" : "rgba(240,237,232,0.04)", border: `1px solid ${form.interests.includes(interest) ? "rgba(212,175,100,0.6)" : "rgba(240,237,232,0.12)"}`, color: form.interests.includes(interest) ? "rgba(212,175,100,0.9)" : "rgba(240,237,232,0.6)", padding: "10px 16px", borderRadius: 2, fontSize: "0.9rem", fontFamily: "'Crimson Pro', serif" }}>{interest}</button>)}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 12 }}>Travel Style</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {STYLES.map(s => <button key={s} className="tag-btn" onClick={() => setForm(f => ({ ...f, style: s }))} style={{ background: form.style === s ? "rgba(212,175,100,0.2)" : "rgba(240,237,232,0.04)", border: `1px solid ${form.style === s ? "rgba(212,175,100,0.6)" : "rgba(240,237,232,0.12)"}`, color: form.style === s ? "rgba(212,175,100,0.9)" : "rgba(240,237,232,0.6)", padding: "10px 16px", borderRadius: 2, fontSize: "0.9rem", fontFamily: "'Crimson Pro', serif" }}>{s}</button>)}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Special Notes <span style={{ color: "rgba(240,237,232,0.3)", textTransform: "none", letterSpacing: 0, fontSize: "0.8rem" }}>(optional)</span></label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. honeymoon, dietary restrictions..." rows={3} style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif", resize: "vertical" }} />
          </div>
          {error && <div style={{ color: "#e07070", fontSize: "0.9rem", padding: "12px 16px", background: "rgba(200,80,80,0.1)", border: "1px solid rgba(200,80,80,0.2)", borderRadius: 2 }}>{error}</div>}
          <button className="gen-btn" onClick={generateItinerary} disabled={!isFormValid || loading} style={{ width: "100%", padding: "18px", background: "transparent", border: `1px solid ${isFormValid ? "rgba(212,175,100,0.5)" : "rgba(240,237,232,0.1)"}`, color: isFormValid ? "#f0ede8" : "rgba(240,237,232,0.3)", fontSize: "0.85rem", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            {loading ? <><span style={{ display: "inline-block", width: 16, height: 16, border: "1px solid rgba(212,175,100,0.3)", borderTopColor: "rgba(212,175,100,0.8)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />Crafting your itinerary...</> : "Generate Itinerary ✦"}
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "result" && itinerary) {
    const day = itinerary.days?.[activeDay];
    const timeBlocks = day ? [{ label: "Morning", icon: "🌅", data: day.morning }, { label: "Afternoon", icon: "☀️", data: day.afternoon }, { label: "Evening", icon: "🌙", data: day.evening }] : [];
    return (
      <div style={appStyle}>
        <style>{globalCSS}</style>
        <Navbar />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "100px 24px 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48, animation: "fadeIn .5s ease" }}>
            <div>
              <div style={{ fontSize: "0.75rem", letterSpacing: "0.3em", color: "rgba(212,175,100,0.6)", textTransform: "uppercase", marginBottom: 8 }}>Your Itinerary</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1 }}>{form.destination}</h1>
              <p style={{ color: "rgba(240,237,232,0.4)", marginTop: 6, fontStyle: "italic" }}>{itinerary.days?.length} days · {form.startDate} → {form.endDate} · {form.travelers} traveler{form.travelers > 1 ? "s" : ""}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              <button className="back-btn" onClick={() => setStep("form")} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.35)", fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>← Replan</button>
              {!tripSaved ? (
                <button className="hero-btn" onClick={saveTrip} disabled={savingTrip} style={{ background: "transparent", border: "1px solid rgba(212,175,100,0.4)", color: "rgba(212,175,100,0.8)", padding: "8px 20px", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  {savingTrip ? <span style={{ width: 12, height: 12, border: "1px solid rgba(212,175,100,0.3)", borderTopColor: "rgba(212,175,100,0.8)", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} /> : "🔖"} Save Trip
                </button>
              ) : <span style={{ color: "rgba(212,175,100,0.6)", fontSize: "0.8rem", fontStyle: "italic" }}>✓ Saved</span>}
            </div>
          </div>
          <div style={{ background: "rgba(212,175,100,0.06)", border: "1px solid rgba(212,175,100,0.15)", borderRadius: 3, padding: "24px 28px", marginBottom: 32 }}>
            <p style={{ color: "rgba(240,237,232,0.7)", lineHeight: 1.8, fontSize: "1.05rem", fontStyle: "italic" }}>{itinerary.summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(212,175,100,0.1)" }}>
              <div><span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)" }}>Est. Daily Budget</span><br /><span style={{ color: "#f0ede8" }}>{itinerary.dailyBudget}</span></div>
              <div><span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)" }}>Timing</span><br /><span style={{ color: "#f0ede8", fontSize: "0.9rem" }}>{itinerary.bestTimeNote}</span></div>
            </div>
            {itinerary.highlights && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>{itinerary.highlights.map((h, i) => <span key={i} style={{ fontSize: "0.8rem", padding: "4px 12px", background: "rgba(240,237,232,0.05)", border: "1px solid rgba(240,237,232,0.1)", borderRadius: 1, color: "rgba(240,237,232,0.6)" }}>✦ {h}</span>)}</div>}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
            {itinerary.days?.map((d, i) => <button key={i} className="day-tab" onClick={() => setActiveDay(i)} style={{ background: activeDay === i ? "rgba(212,175,100,0.15)" : "rgba(240,237,232,0.04)", border: `1px solid ${activeDay === i ? "rgba(212,175,100,0.4)" : "rgba(240,237,232,0.1)"}`, color: activeDay === i ? "rgba(212,175,100,0.9)" : "rgba(240,237,232,0.5)", padding: "10px 18px", borderRadius: 2, fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>Day {d.day}</button>)}
          </div>
          {day && (
            <div key={activeDay} style={{ animation: "fadeIn .4s ease" }}>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "1.8rem" }}>{day.theme}</h2>
                {day.transport && <p style={{ color: "rgba(240,237,232,0.4)", marginTop: 6, fontSize: "0.9rem" }}>🚇 {day.transport}</p>}
                {day.budget && <p style={{ color: "rgba(212,175,100,0.6)", marginTop: 4, fontSize: "0.85rem" }}>💰 Estimated: {day.budget}</p>}
              </div>
              <div style={{ display: "grid", gap: 16, marginBottom: 28 }}>
                {timeBlocks.map(({ label, icon, data }) => data && (
                  <div key={label} style={{ background: "rgba(240,237,232,0.03)", border: "1px solid rgba(240,237,232,0.08)", borderRadius: 3, padding: "22px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        <div>
                          <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)", marginBottom: 2 }}>{label}</div>
                          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "1.3rem" }}>{data.activity}</h3>
                        </div>
                      </div>
                      {data.duration && <span style={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.35)" }}>{data.duration}</span>}
                    </div>
                    <p style={{ color: "rgba(240,237,232,0.6)", lineHeight: 1.7, marginBottom: 10, fontSize: "0.95rem" }}>{data.description}</p>
                    {data.tip && <div style={{ borderLeft: "2px solid rgba(212,175,100,0.3)", paddingLeft: 12, color: "rgba(212,175,100,0.6)", fontSize: "0.85rem", fontStyle: "italic" }}>💡 {data.tip}</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
                {[["Lunch", day.lunch, "🥢"], ["Dinner", day.dinner, "🍽"]].map(([label, meal, icon]) => meal && (
                  <div key={label} style={{ background: "rgba(240,237,232,0.03)", border: "1px solid rgba(240,237,232,0.08)", borderRadius: 3, padding: "20px 22px" }}>
                    <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)", marginBottom: 8 }}>{icon} {label}</div>
                    <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "1.15rem", marginBottom: 4 }}>{meal.name}</h4>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><span style={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.4)" }}>{meal.cuisine}</span><span style={{ color: "rgba(212,175,100,0.6)", fontSize: "0.8rem" }}>{meal.priceRange}</span></div>
                    {meal.note && <p style={{ fontSize: "0.85rem", color: "rgba(240,237,232,0.5)", fontStyle: "italic" }}>{meal.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
            {itinerary.packingTips?.length > 0 && (
              <div style={{ background: "rgba(240,237,232,0.03)", border: "1px solid rgba(240,237,232,0.08)", borderRadius: 3, padding: "22px 24px" }}>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)", marginBottom: 14 }}>🎒 Packing Tips</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {itinerary.packingTips.map((t, i) => <li key={i} style={{ fontSize: "0.9rem", color: "rgba(240,237,232,0.6)", paddingLeft: 14, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "rgba(212,175,100,0.4)" }}>✦</span>{t}</li>)}
                </ul>
              </div>
            )}
            {itinerary.localPhrases?.length > 0 && (
              <div style={{ background: "rgba(240,237,232,0.03)", border: "1px solid rgba(240,237,232,0.08)", borderRadius: 3, padding: "22px 24px" }}>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)", marginBottom: 14 }}>💬 Useful Phrases</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {itinerary.localPhrases.map((p, i) => <div key={i}><div style={{ fontSize: "0.9rem", color: "#f0ede8" }}>{p.phrase} → <span style={{ color: "rgba(212,175,100,0.8)" }}>{p.translation}</span></div><div style={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.35)", fontStyle: "italic" }}>{p.pronunciation}</div></div>)}
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <button onClick={() => { setStep("form"); setItinerary(null); setTripSaved(false); }} style={{ background: "transparent", border: "1px solid rgba(240,237,232,0.15)", color: "rgba(240,237,232,0.4)", padding: "14px 40px", fontSize: "0.8rem", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2, cursor: "pointer" }}>Plan Another Trip</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
