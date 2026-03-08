import { useState, useEffect, useRef } from "react";

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

export default function TravelPlanner() {
  const [step, setStep] = useState("landing");
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
  }, []);

  const handleDestInput = (val) => {
    setForm(f => ({ ...f, destination: val }));
    if (val.length > 1) {
      const filtered = SAMPLE_DESTINATIONS.filter(d => d.toLowerCase().includes(val.toLowerCase()));
      setDestSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else setShowSuggestions(false);
  };

  const toggleInterest = (interest) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest]
    }));
  };

  const getDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.min(diff + 1, 31));
  };

  const generateItinerary = async () => {
    setLoading(true);
    setError("");
    const days = getDays();
    const userPrompt = `Plan a ${days}-day trip to ${form.destination} for ${form.travelers} traveler(s).
Budget: ${form.budget}
Travel style: ${form.style}
Interests: ${form.interests.join(", ")}
Dates: ${form.startDate} to ${form.endDate}
Special notes: ${form.notes || "none"}
Generate exactly ${days} days in the itinerary.`;

    try {
      // ✅ Calls our local Express backend instead of Anthropic directly
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/claude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }]
        })
      });
      const data = await res.json();
      const raw = data.content.map(b => b.text || "").join("");
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setItinerary(parsed);
      setActiveDay(0);
      setStep("result");
    } catch (e) {
      setError("Failed to generate itinerary. Check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = form.destination && form.startDate && form.endDate && form.budget && form.style && form.interests.length > 0;

  const styles = {
    app: { minHeight: "100vh", background: "#0a0a0f", color: "#f0ede8", fontFamily: "'Crimson Pro', Georgia, serif", position: "relative", overflow: "hidden" },
    canvas: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" },
    particle: (p) => ({ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: "rgba(212,175,100,0.4)", animation: `float ${p.speed}s ease-in-out ${p.delay}s infinite alternate` }),
    inner: { position: "relative", zIndex: 1 },
  };

  const globalCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cormorant+Garamond:wght@300;400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; }
    @keyframes float { from { transform: translateY(0px) scale(1); } to { transform: translateY(-30px) scale(1.2); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
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
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(212,175,100,0.2); border-radius: 2px; }
  `;

  if (step === "landing") return (
    <div style={styles.app}>
      <style>{globalCSS}</style>
      <div style={styles.canvas}>
        {particlesRef.current.map(p => <div key={p.id} style={styles.particle(p)} />)}
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,100,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(100,160,212,0.06) 0%, transparent 70%)" }} />
      </div>
      <div style={{ ...styles.inner, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 20px", textAlign: "center", animation: "fadeIn .8s ease" }}>
        <div style={{ fontSize: 13, letterSpacing: "0.4em", color: "rgba(212,175,100,0.7)", marginBottom: 32, textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", fontStyle: "italic" }}>Powered by Claude AI</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(52px, 8vw, 96px)", lineHeight: 1, marginBottom: 16, letterSpacing: "-0.02em" }}>
          <span style={{ display: "block", color: "#f0ede8" }}>Wander</span>
          <span style={{ display: "block", color: "rgba(212,175,100,0.9)", fontStyle: "italic" }}>Intelligently.</span>
        </h1>
        <p style={{ maxWidth: 520, color: "rgba(240,237,232,0.55)", fontSize: "1.15rem", lineHeight: 1.8, marginBottom: 56, fontWeight: 300 }}>
          Stop drowning in browser tabs. Describe your dream trip — we'll craft a complete, personalized itinerary in seconds.
        </p>
        <button className="hero-btn" onClick={() => setStep("form")} style={{ background: "transparent", border: "1px solid rgba(212,175,100,0.4)", color: "#f0ede8", padding: "18px 52px", fontSize: "1rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2 }}>
          Plan My Trip
        </button>
        <div style={{ marginTop: 80, display: "flex", gap: 48, color: "rgba(240,237,232,0.3)", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", flexWrap: "wrap", justifyContent: "center" }}>
          {["Day-by-Day Plans", "Restaurant Picks", "Local Tips"].map(f => (
            <span key={f} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ color: "rgba(212,175,100,0.5)", fontSize: 18 }}>✦</span>{f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === "form") return (
    <div style={styles.app}>
      <style>{globalCSS}</style>
      <div style={{ ...styles.inner, maxWidth: 720, margin: "0 auto", padding: "40px 24px", animation: "fadeIn .5s ease" }}>
        <button className="back-btn" onClick={() => setStep("landing")} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.4)", fontSize: "0.85rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", marginBottom: 48, display: "flex", alignItems: "center", gap: 8 }}>
          ← Back
        </button>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(32px, 5vw, 52px)", marginBottom: 8 }}>Plan Your Journey</h2>
        <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.95rem", marginBottom: 48, fontStyle: "italic" }}>Tell us about your dream trip</p>

        <div style={{ display: "grid", gap: 28 }}>
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Destination</label>
            <input value={form.destination} onChange={e => handleDestInput(e.target.value)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Kyoto, Japan" style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1.05rem", fontFamily: "'Crimson Pro', serif" }} />
            {showSuggestions && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1a1a22", border: "1px solid rgba(212,175,100,0.3)", borderTop: "none", zIndex: 10, borderRadius: "0 0 2px 2px" }}>
                {destSuggestions.map(d => (
                  <div key={d} onClick={() => { setForm(f => ({ ...f, destination: d })); setShowSuggestions(false); }}
                    style={{ padding: "12px 16px", cursor: "pointer", fontSize: "0.95rem", color: "rgba(240,237,232,0.8)" }}
                    onMouseEnter={e => e.target.style.background = "rgba(212,175,100,0.1)"}
                    onMouseLeave={e => e.target.style.background = "transparent"}>
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[["Start Date", "startDate"], ["End Date", "endDate"]].map(([label, key]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>{label}</label>
                <input type="date" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }} />
              </div>
            ))}
          </div>
          {getDays() > 0 && <div style={{ fontSize: "0.85rem", color: "rgba(212,175,100,0.6)", fontStyle: "italic", marginTop: -12 }}>✦ {getDays()} day{getDays() !== 1 ? "s" : ""} planned</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Travelers</label>
              <select value={form.travelers} onChange={e => setForm(f => ({ ...f, travelers: e.target.value }))}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Daily Budget</label>
              <select value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif" }}>
                <option value="">Select...</option>
                {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 12 }}>Interests</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {INTERESTS.map(interest => (
                <button key={interest} className="tag-btn" onClick={() => toggleInterest(interest)}
                  style={{ background: form.interests.includes(interest) ? "rgba(212,175,100,0.2)" : "rgba(240,237,232,0.04)", border: `1px solid ${form.interests.includes(interest) ? "rgba(212,175,100,0.6)" : "rgba(240,237,232,0.12)"}`, color: form.interests.includes(interest) ? "rgba(212,175,100,0.9)" : "rgba(240,237,232,0.6)", padding: "10px 16px", borderRadius: 2, fontSize: "0.9rem", fontFamily: "'Crimson Pro', serif" }}>
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 12 }}>Travel Style</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {STYLES.map(s => (
                <button key={s} className="tag-btn" onClick={() => setForm(f => ({ ...f, style: s }))}
                  style={{ background: form.style === s ? "rgba(212,175,100,0.2)" : "rgba(240,237,232,0.04)", border: `1px solid ${form.style === s ? "rgba(212,175,100,0.6)" : "rgba(240,237,232,0.12)"}`, color: form.style === s ? "rgba(212,175,100,0.9)" : "rgba(240,237,232,0.6)", padding: "10px 16px", borderRadius: 2, fontSize: "0.9rem", fontFamily: "'Crimson Pro', serif" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(212,175,100,0.7)", marginBottom: 8 }}>Special Notes <span style={{ color: "rgba(240,237,232,0.3)", textTransform: "none", letterSpacing: 0, fontSize: "0.8rem" }}>(optional)</span></label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. honeymoon, dietary restrictions, mobility considerations..." rows={3}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 2, fontSize: "1rem", fontFamily: "'Crimson Pro', serif", resize: "vertical" }} />
          </div>

          {error && <div style={{ color: "#e07070", fontSize: "0.9rem", padding: "12px 16px", background: "rgba(200,80,80,0.1)", border: "1px solid rgba(200,80,80,0.2)", borderRadius: 2 }}>{error}</div>}

          <button className="gen-btn" onClick={generateItinerary} disabled={!isFormValid || loading}
            style={{ width: "100%", padding: "18px", background: "transparent", border: `1px solid ${isFormValid ? "rgba(212,175,100,0.5)" : "rgba(240,237,232,0.1)"}`, color: isFormValid ? "#f0ede8" : "rgba(240,237,232,0.3)", fontSize: "0.85rem", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "1px solid rgba(212,175,100,0.3)", borderTopColor: "rgba(212,175,100,0.8)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                Crafting your itinerary...
              </>
            ) : "Generate Itinerary ✦"}
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "result" && itinerary) {
    const day = itinerary.days?.[activeDay];
    const timeBlocks = day ? [
      { label: "Morning", icon: "🌅", data: day.morning },
      { label: "Afternoon", icon: "☀️", data: day.afternoon },
      { label: "Evening", icon: "🌙", data: day.evening }
    ] : [];

    return (
      <div style={styles.app}>
        <style>{globalCSS}</style>
        <div style={{ ...styles.inner, maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48, animation: "fadeIn .5s ease" }}>
            <div>
              <div style={{ fontSize: "0.75rem", letterSpacing: "0.3em", color: "rgba(212,175,100,0.6)", textTransform: "uppercase", marginBottom: 8 }}>Your Itinerary</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1 }}>{form.destination}</h1>
              <p style={{ color: "rgba(240,237,232,0.4)", marginTop: 6, fontStyle: "italic" }}>{itinerary.days?.length} days · {form.startDate} → {form.endDate} · {form.travelers} traveler{form.travelers > 1 ? "s" : ""}</p>
            </div>
            <button className="back-btn" onClick={() => setStep("form")} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.35)", fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>
              ← Replan
            </button>
          </div>

          <div style={{ background: "rgba(212,175,100,0.06)", border: "1px solid rgba(212,175,100,0.15)", borderRadius: 3, padding: "24px 28px", marginBottom: 32, animation: "fadeIn .5s .1s ease both" }}>
            <p style={{ color: "rgba(240,237,232,0.7)", lineHeight: 1.8, fontSize: "1.05rem", fontStyle: "italic" }}>{itinerary.summary}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(212,175,100,0.1)" }}>
              <div><span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)" }}>Est. Daily Budget</span><br /><span style={{ color: "#f0ede8" }}>{itinerary.dailyBudget}</span></div>
              <div><span style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)" }}>Timing</span><br /><span style={{ color: "#f0ede8", fontSize: "0.9rem" }}>{itinerary.bestTimeNote}</span></div>
            </div>
            {itinerary.highlights && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                {itinerary.highlights.map((h, i) => (
                  <span key={i} style={{ fontSize: "0.8rem", padding: "4px 12px", background: "rgba(240,237,232,0.05)", border: "1px solid rgba(240,237,232,0.1)", borderRadius: 1, color: "rgba(240,237,232,0.6)" }}>✦ {h}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap", animation: "fadeIn .5s .15s ease both" }}>
            {itinerary.days?.map((d, i) => (
              <button key={i} className="day-tab" onClick={() => setActiveDay(i)}
                style={{ background: activeDay === i ? "rgba(212,175,100,0.15)" : "rgba(240,237,232,0.04)", border: `1px solid ${activeDay === i ? "rgba(212,175,100,0.4)" : "rgba(240,237,232,0.1)"}`, color: activeDay === i ? "rgba(212,175,100,0.9)" : "rgba(240,237,232,0.5)", padding: "10px 18px", borderRadius: 2, fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>
                Day {d.day}
              </button>
            ))}
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
                      {data.duration && <span style={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.35)", whiteSpace: "nowrap" }}>{data.duration}</span>}
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
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.4)" }}>{meal.cuisine}</span>
                      <span style={{ color: "rgba(212,175,100,0.6)", fontSize: "0.8rem" }}>{meal.priceRange}</span>
                    </div>
                    {meal.note && <p style={{ fontSize: "0.85rem", color: "rgba(240,237,232,0.5)", fontStyle: "italic" }}>{meal.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8, animation: "fadeIn .5s .2s ease both" }}>
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
                  {itinerary.localPhrases.map((p, i) => (
                    <div key={i}>
                      <div style={{ fontSize: "0.9rem", color: "#f0ede8" }}>{p.phrase} → <span style={{ color: "rgba(212,175,100,0.8)" }}>{p.translation}</span></div>
                      <div style={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.35)", fontStyle: "italic" }}>{p.pronunciation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 40, textAlign: "center" }}>
            <button onClick={() => { setStep("form"); setItinerary(null); }}
              style={{ background: "transparent", border: "1px solid rgba(240,237,232,0.15)", color: "rgba(240,237,232,0.4)", padding: "14px 40px", fontSize: "0.8rem", letterSpacing: "0.25em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", borderRadius: 2, cursor: "pointer" }}>
              Plan Another Trip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
