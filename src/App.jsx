import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const INTERESTS = ["🍜 Food", "🏛 History", "🌿 Nature", "🎭 Nightlife", "🛍 Shopping", "🎨 Art", "🏄 Adventure", "🧘 Wellness"];
const STYLES = ["🎒 Backpacking", "🏨 Luxury", "🚶 Slow Travel", "⚡ Fast-Paced", "👨‍👩‍👧 Family"];
const CURRENCY_SYMBOLS = { AED:"د.إ", AUD:"A$", BRL:"R$", CAD:"C$", CHF:"Fr", CNY:"¥", CZK:"Kč", DKK:"kr", EUR:"€", GBP:"£", HKD:"HK$", IDR:"Rp", INR:"₹", JPY:"¥", KRW:"₩", MXN:"$", MYR:"RM", NOK:"kr", NZD:"NZ$", PHP:"₱", PLN:"zł", SAR:"﷼", SEK:"kr", SGD:"S$", THB:"฿", TRY:"₺", TWD:"NT$", USD:"$", VND:"₫", ZAR:"R" };

const systemPrompt = `You are an expert AI travel planner. When given travel details, generate a complete, practical trip itinerary in JSON format only. No markdown, no code blocks, no backticks, no explanation. Return only raw JSON starting with { or [ and nothing else.

CRITICAL RULES:
- NEVER repeat the same activity, place, or landmark across any day. Every activity must be unique across the entire itinerary.
- If the destination does not have enough activities for the requested number of days, suggest day trips to nearby cities, towns, villages, forts, lakes, temples, or natural attractions within 200km. For example, if planning Udaipur for 5+ days, include day trips to Kumbhalgarh, Ranakpur, Chittorgarh, Nathdwara, etc.
- Never use "N/A", "None", or leave any activity field empty. Always fill every slot with a real, specific place or experience.
- For lunch and dinner, ONLY suggest actual restaurants, cafes, dhabas, or food establishments that serve food. NEVER suggest tourist attractions, lakes, museums, temples, monuments, or any non-food venue as a meal option. If you are not sure of a specific restaurant name, suggest a well-known food street, market, or dining area instead.
- For localPhrases, provide ONLY accurate, commonly used phrases in the actual local language of the destination. Double-check translations are correct. For Indian cities use the correct regional language (e.g. Tamil for Chennai, Hindi for Delhi, Marathi for Mumbai). Include at least 5 phrases covering: hello, thank you, how much, where is, and please.

Return this exact structure:
{
  "about": "3-4 rich sentences about the destination culture and character",
  "summary": "2-3 sentence trip overview",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "dailyBudget": "estimated daily cost string",
  "bestTimeNote": "note about timing",
  "days": [
    {
      "day": 1,
      "theme": "theme title for the day",
      "morning": { "activity": "activity name", "description": "2 sentences, 30-50 words total. First sentence describes what the place/activity is. Second sentence explains what the traveler will experience or why it's special.", "tip": "practical tip max 15 words", "duration": "X hours" },
      "afternoon": { "activity": "activity name", "description": "2 sentences, 30-50 words total. First sentence describes what the place/activity is. Second sentence explains what the traveler will experience or why it's special.", "tip": "practical tip max 15 words", "duration": "X hours" },
      "evening": { "activity": "activity name", "description": "2 sentences, 30-50 words total. First sentence describes what the place/activity is. Second sentence explains what the traveler will experience or why it's special.", "tip": "practical tip max 15 words", "duration": "X hours" },
      "lunch": { "name": "real restaurant name", "cuisine": "cuisine type", "priceRange": "$/$$/$$$/$$$$", "note": "what to order" },
      "dinner": { "name": "real restaurant name", "cuisine": "cuisine type", "priceRange": "$/$$/$$$/$$$$", "note": "what to order" },
      "transport": "transport tip for the day",
      "budget": "estimated day cost"
    }
  ],
  "packingTips": ["tip1", "tip2", "tip3"],
  "localPhrases": [{"phrase": "common English phrase", "translation": "accurate local language translation", "pronunciation": "phonetic pronunciation guide"}],
  "emergencyInfo": {"localEmergency": "number", "touristHelpline": "number or N/A", "nearestHospital": "general advice"}
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

  [data-theme="dark"] {
    --cream: #171412;
    --white: rgba(240,237,232,0.03);
    --ink: #f0ede8;
    --ink-light: rgba(240,237,232,0.55);
    --ink-muted: rgba(240,237,232,0.3);
    --ink-faint: rgba(240,237,232,0.1);
    --gold: rgba(212,175,100,0.9);
    --gold-light: rgba(212,175,100,0.7);
    --gold-pale: rgba(212,175,100,0.08);
    --border: rgba(212,175,100,0.4);
    --border-strong: rgba(240,237,232,0.15);
    --shadow-sm: 0 1px 4px rgba(0,0,0,0.4);
    --shadow-md: 0 4px 20px rgba(0,0,0,0.6);
    --shadow-lg: 0 12px 48px rgba(0,0,0,0.8);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--cream); color: var(--ink); font-family: 'DM Sans', sans-serif; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

  html { transition: background-color 0.4s ease; }
  body { transition: background-color 0.4s ease, color 0.3s ease; }
  *, *::before, *::after {
    transition: background-color 0.35s ease, border-color 0.35s ease, color 0.25s ease, box-shadow 0.35s ease !important;
  }
  input, textarea, select { transition: border-color 0.18s ease, box-shadow 0.18s ease !important; }
  img { transition: none !important; }

  input, select, textarea {
    background: var(--white) !important;
    border: 1.5px solid var(--border) !important;
    color: var(--ink) !important;
    outline: none !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--gold) !important;
    box-shadow: 0 0 0 3px rgba(212,175,100,0.15) !important;
  }
  input::placeholder, textarea::placeholder { color: var(--ink-faint) !important; }
  input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
  option { background: var(--white) !important; color: var(--ink) !important; }

  .btn-primary {
    background: var(--ink) !important;
    color: var(--cream) !important;
    border: none !important;
    cursor: pointer !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: var(--shadow-md) !important; }

  .btn-gold {
    background: transparent !important;
    border: 1.5px solid var(--gold) !important;
    color: var(--gold) !important;
    cursor: pointer !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  .btn-gold:hover { background: var(--gold-pale) !important; }

  .btn-outline {
    background: transparent !important;
    border: 1.5px solid var(--border-strong) !important;
    color: var(--ink-light) !important;
    cursor: pointer !important;
    font-family: 'DM Sans', sans-serif !important;
  }
  .btn-outline:hover { border-color: var(--ink) !important; color: var(--ink) !important; }

  .tag-btn { cursor: pointer !important; }
  .tag-btn:hover { border-color: var(--gold) !important; }

  .hamburger-btn { cursor: pointer !important; }
  .hamburger-btn:hover { opacity: 0.7 !important; }

  .dropdown-menu {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    min-width: 260px;
    background: var(--cream);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 9999;
    overflow: hidden;
    animation: fadeIn .15s ease;
  }
  .menu-open .dropdown-menu { display: block !important; }
  .dropdown-item { cursor: pointer !important; }
  .dropdown-item:hover { background: var(--gold-pale) !important; }

 [data-theme="dark"] .dropdown-menu {
    background: #1f1a14 !important;
    border-color: rgba(212,175,100,0.25) !important;
    box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,100,0.1) !important;
  }
  [data-theme="dark"] .dropdown-menu .dropdown-item:hover {
    background: rgba(212,175,100,0.08) !important;
  }

  .trip-card:hover { border-color: var(--gold) !important; box-shadow: var(--shadow-md) !important; transform: translateY(-2px); }
  .trip-card { cursor: pointer !important; }

  .day-tab:hover { background: var(--gold-pale) !important; border-color: var(--gold) !important; }
  .day-tab { cursor: pointer !important; }

  .auth-tab:hover { color: var(--gold) !important; }
  .auth-tab { cursor: pointer !important; }

  .nav-link { cursor: pointer !important; }
  .nav-link:hover { color: var(--gold) !important; }

  .back-btn:hover { color: var(--gold) !important; }
  .back-btn { cursor: pointer !important; }

  .form-section { animation: fadeUp .4s ease both; }
  .traveler-opt { cursor: pointer !important; }
  .traveler-opt:hover { border-color: var(--gold) !important; }

  [data-theme="dark"] body {
    background-image: radial-gradient(ellipse at 20% 50%, rgba(212,175,100,0.03) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(212,175,100,0.02) 0%, transparent 50%);
  }

  [data-theme="dark"] .trip-card:hover {
    border-color: rgba(212,175,100,0.6) !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,100,0.15) !important;
  }
  
  @media (max-width: 768px) {
    nav { padding: 0 16px !important; height: 60px !important; }
    .form-section { animation-delay: 0s !important; }
  }
  
  .day-tabs-scroll::-webkit-scrollbar { display: none; }

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
const PIXABAY_KEY = import.meta.env.VITE_PIXABAY_KEY;
const imageCache = new Map();

function ActivityImage({ activity, destination }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cacheKey = `${activity}|${destination}`;
    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey);
      if (cached) setSrc(cached);
      else setFailed(true);
      return;
    }

    setSrc(null);
    setFailed(false);
    let cancelled = false;

    const cleanActivity = activity
      .replace(/(visit|explore|tour|trip to|walk|stroll|discover|experience)\s*/gi, "")
      .trim();

    const setAndCache = (url) => {
      imageCache.set(cacheKey, url || null);
      if (url) setSrc(url);
      else setFailed(true);
    };

    const fetchGooglePlacesImage = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const res = await fetch(`${supabaseUrl}/functions/v1/generate-itinerary/image-search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ activity: cleanActivity, destination }),
        });

        const data = await res.json();
        if (cancelled) return;

        if (data.url) setAndCache(data.url);
        else fallbackToWikipedia();
      } catch {
        if (!cancelled) fallbackToWikipedia();
      }
    };

    const fallbackToWikipedia = async () => {
      if (cancelled) return;
      try {
        const queries = [
          `${cleanActivity} ${destination}`,
          `${cleanActivity}, ${destination}`,
          cleanActivity,
        ];
        for (const query of queries) {
          if (cancelled) return;
          const searchRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json&origin=*`
          );
          const searchData = await searchRes.json();
          const titles = searchData[1] || [];
          for (const title of titles) {
            if (cancelled) return;
            const imgRes = await fetch(
              `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=800&piprop=thumbnail&format=json&origin=*`
            );
            const imgData = await imgRes.json();
            if (cancelled) return;
            const pages = Object.values(imgData?.query?.pages || {});
            const img = pages[0]?.thumbnail?.source;
            if (img && pages[0]?.pageid !== -1) { setAndCache(img); return; }
          }
        }
        fallbackToPixabay();
      } catch {
        if (!cancelled) fallbackToPixabay();
      }
    };

    const fallbackToPixabay = async () => {
      if (cancelled) return;
      try {
        const q = encodeURIComponent(`${destination} ${cleanActivity}`);
        const res = await fetch(
          `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${q}&image_type=photo&orientation=horizontal&per_page=5&safesearch=true`
        );
        const data = await res.json();
        if (cancelled) return;
        setAndCache(data?.hits?.[0]?.webformatURL || null);
      } catch {
        if (!cancelled) setAndCache(null);
      }
    };

    fetchGooglePlacesImage();
    return () => { cancelled = true; };
  }, [activity, destination]);

  if (failed || !src) return null;

  return (
    <img
      src={src}
      alt={activity}
      style={{
        width: "100%",
        height: "auto",
        maxHeight: 360,
        objectFit: "contain",
        borderRadius: 10,
        marginBottom: 14,
        display: "block",
        background: "var(--cream)",
      }}
      onError={() => setFailed(true)}
    />
  );
}
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
  const [tripSaved, setTripSaved] = useState(false);const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDarkMode(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
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
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [userCurrency, setUserCurrency] = useState("USD");
  const [userCurrencySymbol, setUserCurrencySymbol] = useState("$");
  const [budgetType, setBudgetType] = useState("daily");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [allRates, setAllRates] = useState({});

  // Refs for auto-focus
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const budgetMinRef = useRef(null);
  const budgetMaxRef = useRef(null);
  const travelersRef = useRef(null);
  const isMobile = window.innerWidth < 768;
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
      // currency symbol updates live via userCurrencySymbol state
    } catch (e) {}
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setStep("landing"); setSavedTrips([]); setMenuOpen(false); };

  const destDebounceRef = useRef(null);
  const handleDestInput = (val) => {
    setForm(f => ({ ...f, destination: val }));
    if (val.length < 1) { setShowSuggestions(false); setDestSuggestions([]); return; }
    clearTimeout(destDebounceRef.current);
    setSelectedSuggestion(-1);
    destDebounceRef.current = setTimeout(async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-itinerary/autocomplete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
          body: JSON.stringify({ input: val }),
        });
        const data = await res.json();
        setDestSuggestions(data.suggestions || []);
        setShowSuggestions((data.suggestions || []).length > 0);
      } catch {
        setShowSuggestions(false);
      }
    }, 100);
  };

  const handleDestSelect = (label) => {
    const parts = label.split(",").map(p => p.trim());
    const cleanName = parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
    setForm(f => ({ ...f, destination: cleanName }));
    setShowSuggestions(false);
    setDestSuggestions([]);
    setTimeout(() => startDateRef.current?.focus(), 50);
  };

  const handleDestKeyDown = (e) => {
    if (showSuggestions && destSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion(i => Math.min(i + 1, destSuggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && selectedSuggestion >= 0) {
        e.preventDefault();
        handleDestSelect(destSuggestions[selectedSuggestion].label);
        return;
      }
    }
    if (e.key === "Enter" || e.key === "Tab") {
      setShowSuggestions(false);
      setTimeout(() => startDateRef.current?.focus(), 50);
    }
  };

  const handleStartDateChange = (val) => { setForm(f => ({ ...f, startDate: val })); };
  const handleEndDateChange = (val) => { setForm(f => ({ ...f, endDate: val })); };

  const handleStartDateKeyDown = (e) => {
    if (e.key === "Enter" && form.startDate) endDateRef.current?.focus();
  };

  const handleEndDateKeyDown = (e) => {
    if (e.key === "Enter" && form.endDate) {
      budgetMinRef.current?.focus();
    }
  };

  const toggleInterest = (interest) => {
    setForm(f => ({ ...f, interests: f.interests.includes(interest) ? f.interests.filter(i => i !== interest) : [...f.interests, interest] }));
  };

  const getDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.min(diff + 1, 31));
  };

  const fetchRealRestaurant = async (destination, cuisine, meal, usedSet = new Set()) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-itinerary/restaurant-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
        body: JSON.stringify({ destination, cuisine, meal }),
      });
      const data = await res.json();
      const restaurants = data.restaurants || [];
      if (restaurants.length === 0) return null;

      const priceMap = { 0: "$", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

      // Find first restaurant not already used
      for (const pick of restaurants) {
        const cleanName = pick.name.split(/[|\-–(,]/)[0].trim();
        // Skip if already used or name is too long (likely concatenated)
        if (usedSet.has(cleanName)) continue;
        if (cleanName.split(" ").length > 6) continue;
        return {
          name: cleanName,
          priceRange: priceMap[pick.priceLevel] || "$$",
          address: pick.address,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const generateItinerary = async () => {
    setLoading(true);
    setError("");
    setTripSaved(false);

    const days = getDays();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const CHUNK_SIZE = 5;
    const chunks = Math.ceil(days / CHUNK_SIZE);
    let allDays = [];
    let tripMeta = null;

    try {
      for (let i = 0; i < chunks; i++) {
        const chunkStart = i * CHUNK_SIZE + 1;
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, days);
        const isFirst = i === 0;

        const userPrompt = isFirst
          ? `Plan days ${chunkStart} to ${chunkEnd} of a ${days}-day trip to ${form.destination} for ${form.travelers} traveler(s).
  Budget: ${budgetType === "daily" ? `${userCurrencySymbol}${budgetMin}–${userCurrencySymbol}${budgetMax} per day` : `${userCurrencySymbol}${budgetMin}–${userCurrencySymbol}${budgetMax} total`}. Style: ${form.style}. Interests: ${form.interests.join(", ")}.
  Dates: ${form.startDate} to ${form.endDate}. Notes: ${form.notes || "none"}.
  
  Return the FULL JSON structure as defined in your instructions including about, summary, highlights, dailyBudget, bestTimeNote, packingTips, localPhrases, emergencyInfo, and days array for days ${chunkStart} to ${chunkEnd}.
  - "about": 3-4 rich sentences about ${form.destination} culture and character.
  - "summary": 2-3 sentences tailored to this traveler's style (${form.style}) and interests.
  - Each activity "description": exactly 2 full sentences, 30-50 words total. First sentence: what the place is or what you'll do there. Second sentence: what makes it special or what the traveler will experience. Never use fragments like "Lake views. Scenic walk." — write complete, engaging sentences.
  - All fields must be populated. Do not leave any field empty.
  - IMPORTANT: Do NOT repeat any activity from previous days. Every activity must be a new, unique place not mentioned before in this itinerary.
  - If running out of activities in ${form.destination}, suggest nearby towns, villages, forts, temples, or natural sites within 200km.`
          : `Continue the ${days}-day trip to ${form.destination}.
  Budget: ${budgetType === "daily" ? `${userCurrencySymbol}${budgetMin}–${userCurrencySymbol}${budgetMax} per day` : `${userCurrencySymbol}${budgetMin}–${userCurrencySymbol}${budgetMax} total`}. Style: ${form.style}. Interests: ${form.interests.join(", ")}.

  ALREADY USED ACTIVITIES (do NOT repeat any of these):
  ${allDays.flatMap(d => [d.morning?.activity, d.afternoon?.activity, d.evening?.activity]).filter(Boolean).join(", ")}

  Return ONLY a raw JSON array (no wrapper object, no markdown) for days ${chunkStart} to ${chunkEnd}:
  [
    {
      "day": ${chunkStart},
      "theme": "theme title",
      "morning": { "activity": "name", "description": "2 full sentences 30-50 words.", "tip": "max 15 words", "duration": "X hours" },
      "afternoon": { "activity": "name", "description": "2 full sentences 30-50 words.", "tip": "max 15 words", "duration": "X hours" },
      "evening": { "activity": "name", "description": "2 full sentences 30-50 words.", "tip": "max 15 words", "duration": "X hours" },
      "lunch": { "name": "restaurant", "cuisine": "type", "priceRange": "$$", "note": "max 15 words" },
      "dinner": { "name": "restaurant", "cuisine": "type", "priceRange": "$$", "note": "max 15 words" },
      "transport": "max 15 words",
      "budget": "cost"
    }
  ]
  Generate days ${chunkStart} to ${chunkEnd} only. Raw JSON array, nothing else.`;

        const res = await fetch(`${supabaseUrl}/functions/v1/generate-itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            max_tokens: 8000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
          })
        });

        const data = await res.json();

        if (data.error) {
          const errMsg = typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error));
          const isRL = data.error.code === "rate_limit_all_models"
            || errMsg.toLowerCase().includes("rate limit")
            || res.status === 429;
          if (isRL) {
            throw new Error(errMsg);
          }
          throw new Error(`API error (chunk ${i + 1}): ${errMsg}`);
        }

        const raw = (data.content
          ? data.content.map(b => b.text || "").join("")
          : data.choices?.[0]?.message?.content || "");

        if (!raw) throw new Error(`Empty response on chunk ${i + 1}. Try again.`);
        let cleaned = raw.replace(/```json|```/g, "").trim();

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const lastBrace = cleaned.lastIndexOf(isFirst ? '}' : ']');
          if (lastBrace !== -1) cleaned = cleaned.substring(0, lastBrace + 1);
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            throw new Error(`Failed to parse chunk ${i + 1}. Try again.`);
          }
        }

        const chunkDays = isFirst ? (parsed.days || []) : (Array.isArray(parsed) ? parsed : (parsed.days || []));

        const usedRestaurants = new Set(allDays.flatMap(d => [d.lunch?.name, d.dinner?.name]).filter(Boolean));

        const enrichedDays = await Promise.all(chunkDays.map(async (day) => {
          const allActivitiesNA = ["morning", "afternoon", "evening"].every(
            t => !day[t]?.activity || day[t]?.activity?.toLowerCase() === "n/a" || day[t]?.activity?.toLowerCase() === "none"
          );

          const lunchReal = allActivitiesNA ? null : await fetchRealRestaurant(form.destination, day.lunch?.cuisine || "local", "lunch", usedRestaurants);
          if (lunchReal) usedRestaurants.add(lunchReal.name);
          const dinnerReal = allActivitiesNA ? null : await fetchRealRestaurant(form.destination, day.dinner?.cuisine || "local", "dinner", usedRestaurants);
          if (dinnerReal) usedRestaurants.add(dinnerReal.name);
          return {
            ...day,
            lunch: lunchReal ? { ...day.lunch, name: lunchReal.name, priceRange: lunchReal.priceRange } : day.lunch,
            dinner: dinnerReal ? { ...day.dinner, name: dinnerReal.name, priceRange: dinnerReal.priceRange } : day.dinner,
          };
        }));

        if (isFirst) {
          tripMeta = parsed;
          allDays = [...enrichedDays];
        } else {
          allDays = [...allDays, ...enrichedDays];
        }
      }

      setItinerary({ ...tripMeta, days: allDays });
      setActiveDay(0);
      setStep("result");
    } catch (e) {
      setError("Failed to generate itinerary: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = form.destination && form.startDate && form.endDate && budgetMin && form.style && form.interests.length > 0;

  // ─── NAVBAR ───────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 2000,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: isMobile ? "0 16px" : "0 40px", height: isMobile ? 60 : 68,
      background: darkMode ? "rgba(23,20,18,0.95)" : "rgba(250,250,248,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <span onClick={() => setStep("landing")} style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, cursor: "pointer", color: "var(--ink)", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 6 }}>
        Wander<span style={{ color: "var(--gold)" }}>AI</span>
      </span>

      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        <span className="nav-link" onClick={() => setStep("form")} style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--ink-light)", letterSpacing: "0.01em" }}>Plan a Trip</span>
        {user && <span className="nav-link" onClick={() => setStep("trips")} style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--ink-light)" }}>My Trips</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(d => !d)}
          aria-label="Toggle dark mode"
          style={{
            background: "var(--white)",
            border: "1.5px solid var(--border-strong)",
            borderRadius: 50,
            width: 64, height: 36,
            display: "flex", alignItems: "center",
            padding: "3px",
            cursor: "pointer",
            position: "relative",
            transition: "all .3s ease",
            flexShrink: 0,
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: !darkMode ? "var(--ink)" : "transparent", transition: "all .3s ease", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={!darkMode ? "var(--white)" : "var(--ink-muted)"} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: darkMode ? "rgba(212,175,100,0.2)" : "transparent", transition: "all .3s ease", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={darkMode ? "rgba(212,175,100,0.9)" : "var(--ink-muted)"} strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
        </button>

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
                <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", background: "var(--gold-pale)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: 700, color: "var(--cream)", marginBottom: 10 }}>
                    {(user?.user_metadata?.full_name || user?.email || "U")[0].toUpperCase()}
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{user?.user_metadata?.full_name || "—"}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>{user?.email}</div>
                </div>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 8 }}>Currency</div>
                  <select value={userCurrency} onChange={e => updateCurrency(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: "0.88rem" }}>
                    {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c} — {CURRENCY_SYMBOLS[c]}</option>)}
                  </select>
                </div>
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
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ flex: isMobile ? "0 0 auto" : 1, display: isMobile ? "none" : "flex", background: darkMode ? "#0f0c09" : "var(--ink)", flexDirection: "column", justifyContent: "center", padding: "80px 60px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(201,151,74,0.12)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(201,151,74,0.07)" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 20 }}>Wander AI</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: "2.8rem", lineHeight: 1.2, color: "#f0ede8", marginBottom: 20 }}>
              Your next adventure<br /><em style={{ color: "rgba(212,175,100,0.85)" }}>starts here.</em>
            </h2>
            <p style={{ color: "rgba(240,237,232,0.55)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: 340 }}>
              AI-powered itineraries crafted in seconds. From hidden gems to iconic landmarks — planned perfectly for you.
            </p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? "100px 24px 40px" : "80px 60px", background: darkMode ? "#171412" : "var(--cream)" }}>
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
              <button className="btn-primary" onClick={handleEmailAuth} disabled={authSubmitting} style={{ width: "100%", padding: "14px", borderRadius: 8, fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: darkMode ? "rgba(212,175,100,0.9) !important" : undefined, color: darkMode ? "#171412 !important" : undefined }}>
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
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "80px 16px 40px" : "100px 24px 60px", animation: "fadeUp .5s ease" }}>
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

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "80px 20px 80px" : "140px 40px 80px", animation: "fadeUp .7s ease" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 32 : 80, alignItems: "center" }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

      <div style={{ borderTop: "1px solid var(--border)", padding: isMobile ? "16px 20px" : "28px 40px", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: isMobile ? 20 : 64, color: "var(--ink-muted)", fontSize: isMobile ? "0.75rem" : "0.83rem", fontWeight: 500, position: "fixed", bottom: 0, left: 0, right: 0, background: darkMode ? "rgba(23,20,18,0.97)" : "rgba(250,250,248,0.97)", backdropFilter: "blur(12px)", zIndex: 50 }}>
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
      <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "80px 16px 60px" : "100px 24px 80px" }}>

        <div style={{ marginBottom: 48, animation: "fadeUp .4s ease" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10 }}>New Itinerary</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "clamp(28px, 4vw, 44px)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Where are you headed?</h2>
          <p style={{ color: "var(--ink-muted)", marginTop: 6, fontSize: "0.92rem" }}>Fill in your trip details and we'll plan everything.</p>
        </div>

        <div style={{ display: "grid", gap: 32 }}>

          {/* Destination */}
          <div className="form-section" style={{ animationDelay: "0.05s", position: "relative", zIndex: 10 }}>
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
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: darkMode ? "#1f1a15" : "var(--white)", border: "1.5px solid var(--border)", borderTop: "none", borderRadius: "0 0 12px 12px", zIndex: 1000, boxShadow: "var(--shadow-lg)", overflow: "hidden", marginTop: 2 }}>
                  {destSuggestions.map((d, idx) => (
                    <div key={d.placeId} onClick={() => handleDestSelect(d.label)}
                      onMouseEnter={() => setSelectedSuggestion(idx)}
                      onMouseLeave={() => setSelectedSuggestion(-1)}
                      style={{
                        padding: "12px 16px", cursor: "pointer", fontSize: "0.95rem",
                        display: "flex", alignItems: "center", gap: 10, transition: "background .1s",
                        background: selectedSuggestion === idx ? "var(--gold-pale)" : "transparent",
                        borderLeft: selectedSuggestion === idx ? "3px solid var(--gold)" : "3px solid transparent",
                      }}>
                      <span style={{ fontSize: "1rem" }}>📍</span>
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--ink)" }}>{d.label.split(",")[0]}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)" }}>{d.label.split(",").slice(1).join(",").trim()}</div>
                      </div>
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
          <div className="form-section" style={{ animationDelay: "0.15s", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 8 }}>
                Budget <span style={{ color: "var(--ink-muted)", textTransform: "none", letterSpacing: 0, fontSize: "0.78rem", fontWeight: 400 }}>({userCurrency})</span>
              </label>

              {/* Daily / Total toggle */}
              <div style={{ display: "flex", gap: 0, marginBottom: 10, border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "transparent" }}>
                {["daily", "total"].map(type => (
                  <button key={type} onClick={() => setBudgetType(type)} style={{
                    flex: 1, padding: "8px", fontSize: "0.82rem", fontWeight: 600,
                    background: budgetType === type
                      ? (darkMode ? "rgba(212,175,100,0.15)" : "var(--ink)")
                      : "transparent",
                    color: budgetType === type
                      ? (darkMode ? "var(--gold)" : "var(--cream)")
                      : "var(--ink-muted)",
                    border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    textTransform: "capitalize", transition: "all .15s",
                    borderRight: type === "daily" ? "1px solid var(--border)" : "none",
                  }}>{type}</button>
                ))}
              </div>

              {/* Min / Max inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Min", budgetMin, setBudgetMin, budgetMinRef, () => budgetMaxRef.current?.focus()],
                  ["Max", budgetMax, setBudgetMax, budgetMaxRef, () => travelersRef.current?.focus()]
                ].map(([label, val, setter, ref, onEnter]) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.7rem", color: "var(--ink-muted)", marginBottom: 4 }}>{label}</div>
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                        fontSize: "0.9rem", color: "var(--ink-muted)", pointerEvents: "none",
                      }}>{userCurrencySymbol}</span>
                      <input
                        ref={ref}
                        type="number"
                        min="0"
                        value={val}
                        onChange={e => setter(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && onEnter()}
                        placeholder="0"
                        style={{ width: "100%", padding: "10px 10px 10px 26px", borderRadius: 8, fontSize: "0.95rem" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 8 }}>Travelers</label>
              <input
                ref={travelersRef}
                type="number"
                min="1"
                max="99"
                value={form.travelers}
                onChange={e => setForm(f => ({ ...f, travelers: e.target.value }))}
                placeholder="1"
                style={{ width: "100%", padding: "14px 16px", borderRadius: 8, fontSize: "0.95rem" }}
              />
            </div>
          </div>

          {/* Interests */}
          <div className="form-section" style={{ animationDelay: "0.2s" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 12 }}>Interests</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INTERESTS.map(interest => (
                <button key={interest} className="tag-btn" onClick={() => toggleInterest(interest)} style={{
                  background: form.interests.includes(interest) ? "var(--ink)" : "transparent",
                  border: `1.5px solid ${form.interests.includes(interest) ? "var(--ink)" : "var(--border)"}`,
                  color: form.interests.includes(interest) ? "var(--cream)" : "var(--ink-light)",
                  padding: "9px 16px", borderRadius: 20, fontSize: "0.88rem", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                }}>{interest}</button>
              ))}
            </div>
          </div>

          {/* Travel Style */}
          <div className="form-section" style={{ animationDelay: "0.25s" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-light)", marginBottom: 12 }}>Travel Style</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STYLES.map(s => (
                <button key={s} className="tag-btn" onClick={() => setForm(f => ({ ...f, style: s }))} style={{
                  background: form.style === s ? "var(--gold)" : "transparent",
                  border: `1.5px solid ${form.style === s ? "var(--gold)" : "var(--border)"}`,
                  color: form.style === s ? "var(--cream)" : "var(--ink-light)",
                  padding: "9px 18px", borderRadius: 20, fontSize: "0.88rem", fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                }}>{s}</button>
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
        <div style={{ maxWidth: 940, margin: "0 auto", padding: isMobile ? "0 12px 60px" : "0 24px 80px" }}>

          {/* Hero Banner */}
          <div style={{
            background: darkMode
              ? "linear-gradient(135deg, #2a1f0e 0%, #1e1608 50%, #171412 100%)"
              : "linear-gradient(135deg, var(--ink) 0%, #2d2418 50%, #1a1008 100%)",
            borderRadius: "0 0 24px 24px",
            padding: isMobile ? "90px 20px 32px" : "120px 40px 48px",
            marginBottom: 40,
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(201,151,74,0.12)" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(201,151,74,0.06)" }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", gap: isMobile ? 16 : 0 }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 10, textShadow: "none" }}>Your Itinerary</div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "clamp(32px, 5vw, 56px)", color: "#f0ede8", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 12 }}>{form.destination}</h1>
                <p style={{ color: "rgba(240,237,232,0.6)", fontSize: "0.9rem" }}>
                  {itinerary.days?.length} days · {form.startDate} → {form.endDate} · {form.travelers} traveler{form.travelers !== "1" ? "s" : ""}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                <button className="back-btn" onClick={() => setStep("form")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontWeight: 500, display: "flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif" }}>← Replan</button>
                {!tripSaved ? (
                  <button className="btn-gold" onClick={saveTrip} disabled={savingTrip} style={{ padding: "9px 20px", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {savingTrip ? <span style={{ width: 12, height: 12, border: "2px solid rgba(201,151,74,.3)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} /> : "🔖"} Save Trip
                  </button>
                ) : (
                  <span style={{ color: "var(--gold)", fontSize: "0.82rem", fontWeight: 600 }}>✓ Saved</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: "var(--gold-pale)", border: "1.5px solid var(--gold-light)", borderRadius: 12, padding: "26px 30px", marginBottom: 28 }}>
            {itinerary.about && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>About {form.destination}</div>
                <p style={{ color: "var(--ink-light)", lineHeight: 1.85, fontSize: "0.95rem" }}>{itinerary.about}</p>
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 28, paddingTop: 18, borderTop: "1px solid var(--gold-light)" }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>Est. Daily</div>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{itinerary.dailyBudget}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>Best Time</div>
                <div style={{ color: "var(--ink-light)", fontSize: "0.9rem" }}>{itinerary.bestTimeNote}</div>
              </div>
            </div>
            {itinerary.highlights?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                {itinerary.highlights.map((h, i) => (
                  <span key={i} style={{ fontSize: "0.8rem", padding: "4px 12px", background: "var(--white)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--ink-light)", fontWeight: 500 }}>✦ {h}</span>
                ))}
              </div>
            )}
          </div>

          {/* Day tabs */}
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
                  <button onClick={() => setActiveDay((currentWeek - 1) * WEEK)} disabled={currentWeek === 0} style={{ background: "transparent", border: "1.5px solid var(--border)", borderRadius: 6, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: currentWeek === 0 ? "not-allowed" : "pointer", opacity: currentWeek === 0 ? 0.3 : 1, fontSize: "1.1rem", flexShrink: 0, transition: "all .15s", color: "var(--ink)" }}>‹</button>
                  <div style={{ display: "flex", gap: 6, flex: 1, overflowX: isMobile ? "auto" : "visible", scrollbarWidth: "none" }}>
                    {visibleDays?.map((d, i) => {
                      const dayIndex = weekStart + i;
                      return (
                        <button key={dayIndex} className="day-tab" onClick={() => setActiveDay(dayIndex)} style={{ background: activeDay === dayIndex ? (darkMode ? "rgba(212,175,100,0.15)" : "var(--ink)") : "transparent", border: `1.5px solid ${activeDay === dayIndex ? "var(--gold)" : "var(--border)"}`, color: activeDay === dayIndex ? (darkMode ? "var(--gold)" : "var(--white)") : "var(--ink-light)", padding: "9px 0", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", flex: isMobile ? "0 0 72px" : 1, textAlign: "center" }}>Day {d.day}</button>
                      );
                    })}
                  </div>
                  <button onClick={() => setActiveDay((currentWeek + 1) * WEEK)} disabled={currentWeek >= totalWeeks - 1} style={{ background: "transparent", border: "1.5px solid var(--border)", borderRadius: 6, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: currentWeek >= totalWeeks - 1 ? "not-allowed" : "pointer", opacity: currentWeek >= totalWeeks - 1 ? 0.3 : 1, fontSize: "1.1rem", flexShrink: 0, transition: "all .15s", color: "var(--ink)" }}>›</button>
                </div>
                {totalDays > WEEK && (
                  <div style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--ink-muted)", textAlign: "center" }}>Week {currentWeek + 1} of {totalWeeks}</div>
                )}
              </div>
            );
          })()}

          {day && (
            <div key={activeDay} style={{ animation: "fadeUp .35s ease" }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.6rem", color: "var(--ink)" }}>{day.theme}</h2>
                {day.transport && <p style={{ color: "var(--ink-muted)", marginTop: 6, fontSize: "0.88rem" }}>🚇 {day.transport}</p>}
                {day.budget && <p style={{ color: "var(--gold)", marginTop: 4, fontSize: "0.85rem", fontWeight: 500 }}>💰 Estimated: {day.budget}</p>}
              </div>

              <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                {timeBlocks.map(({ label, icon, data }) => data && (
                  <div key={label} style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "22px 24px", boxShadow: "var(--shadow-md)", borderLeft: "4px solid var(--gold-light)" }}>
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
                    {data.activity?.toLowerCase() !== "n/a" && data.activity?.toLowerCase() !== "none" && (
                      <ActivityImage activity={data.activity} destination={form.destination} description={data.description} />
                    )}
                    <p style={{ color: "var(--ink-light)", lineHeight: 1.7, marginBottom: 10, fontSize: "0.93rem" }}>{data.description}</p>
                    {data.tip && (
                      <div style={{ borderLeft: "3px solid var(--gold-light)", paddingLeft: 12, color: "var(--ink-muted)", fontSize: "0.84rem", fontStyle: "italic" }}>💡 {data.tip}</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 28 }}>
                {[["Lunch", day.lunch, "🥢"], ["Dinner", day.dinner, "🍽"]].map(([label, meal, icon]) => meal && meal.name?.toLowerCase() !== "none" && meal.name?.toLowerCase() !== "n/a" && (
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

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 8 }}>
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