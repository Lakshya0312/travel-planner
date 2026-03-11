import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const DAY_COLORS = ["#d4af64", "#6fa8d4", "#a8d46f", "#d46fa8", "#6fd4c8", "#d4906f", "#9b6fd4"];

export default function MapView({ itinerary, form, onBack }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);

  const getStopsForDay = (day) => {
    if (!day) return [];
    const stops = [];
    if (day.morning?.activity) stops.push({ label: "Morning", icon: "🌅", name: day.morning.activity, tip: day.morning.tip, duration: day.morning.duration, type: "activity" });
    if (day.lunch?.name) stops.push({ label: "Lunch", icon: "🥢", name: day.lunch.name, tip: day.lunch.note, type: "food", cuisine: day.lunch.cuisine, price: day.lunch.priceRange });
    if (day.afternoon?.activity) stops.push({ label: "Afternoon", icon: "☀️", name: day.afternoon.activity, tip: day.afternoon.tip, duration: day.afternoon.duration, type: "activity" });
    if (day.dinner?.name) stops.push({ label: "Dinner", icon: "🍽", name: day.dinner.name, tip: day.dinner.note, type: "food", cuisine: day.dinner.cuisine, price: day.dinner.priceRange });
    if (day.evening?.activity) stops.push({ label: "Evening", icon: "🌙", name: day.evening.activity, tip: day.evening.tip, duration: day.evening.duration, type: "activity" });
    return stops;
  };

  const geocode = async (placeName, destination) => {
    try {
      const query = `${placeName}, ${destination}`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { "User-Agent": "TravelPlannerApp/1.0" } }
      );
      const data = await res.json();
      if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch (e) {}
    return null;
  };

  const loadDayOnMap = async (L, map, dayIndex) => {
    setLoading(true);
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer);
    });

    const day = itinerary.days?.[dayIndex];
    if (!day) { setLoading(false); return; }

    const stops = getStopsForDay(day);
    const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
    const coords = [];

    let baseCoords = await geocode(form.destination, "");

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      let latlng = await geocode(stop.name, form.destination);
      if (!latlng && baseCoords) {
        latlng = [
          baseCoords[0] + (Math.random() - 0.5) * 0.04,
          baseCoords[1] + (Math.random() - 0.5) * 0.04,
        ];
      }
      if (!latlng) continue;
      coords.push(latlng);

      const markerIcon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#0a0a0f;box-shadow:0 3px 12px rgba(0,0,0,0.5);font-family:Georgia,serif;">${i + 1}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20],
      });

      L.marker(latlng, { icon: markerIcon }).addTo(map).bindPopup(`
        <div style="font-family:Georgia,serif;min-width:190px;">
          <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${color};margin-bottom:5px;">${stop.icon} ${stop.label}</div>
          <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:#f0ede8;">${stop.name}</div>
          ${stop.duration ? `<div style="font-size:12px;color:rgba(240,237,232,0.5);margin-bottom:3px;">⏱ ${stop.duration}</div>` : ""}
          ${stop.cuisine ? `<div style="font-size:12px;color:rgba(240,237,232,0.5);margin-bottom:3px;">${stop.cuisine} · ${stop.price}</div>` : ""}
          ${stop.tip ? `<div style="font-size:12px;color:rgba(240,237,232,0.55);margin-top:7px;padding-top:7px;border-top:1px solid rgba(240,237,232,0.1);font-style:italic;">💡 ${stop.tip}</div>` : ""}
        </div>
      `, { className: "custom-popup", maxWidth: 260 });
    }

    if (coords.length > 1) {
      L.polyline(coords, { color, weight: 2.5, opacity: 0.65, dashArray: "7, 9" }).addTo(map);
    }
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 15 });
    } else if (baseCoords) {
      map.setView(baseCoords, 13);
    }
    setLoading(false);
  };

  useEffect(() => {
    const initMap = async () => {
      const L = await import("leaflet");
      delete L.Icon.Default.prototype._getIconUrl;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, { center: [20, 0], zoom: 2, zoomControl: false });

      // Free OpenStreetMap dark tiles - no key needed
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInstanceRef.current = map;
      await loadDayOnMap(L, map, 0);
    };
    initMap();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const update = async () => {
      const L = await import("leaflet");
      await loadDayOnMap(L, mapInstanceRef.current, activeDay);
    };
    update();
  }, [activeDay]);

  const day = itinerary.days?.[activeDay];
  const stops = getStopsForDay(day);
  const color = DAY_COLORS[activeDay % DAY_COLORS.length];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#f0ede8", fontFamily: "'Crimson Pro', Georgia, serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cormorant+Garamond:wght@300;400;600&display=swap');
        * { box-sizing: border-box; }
        .custom-popup .leaflet-popup-content-wrapper { background: #1a1a22 !important; border: 1px solid rgba(240,237,232,0.1) !important; border-radius: 6px !important; box-shadow: 0 6px 24px rgba(0,0,0,0.6) !important; color: #f0ede8 !important; padding: 0 !important; }
        .custom-popup .leaflet-popup-content { margin: 14px 16px !important; }
        .custom-popup .leaflet-popup-tip { background: #1a1a22 !important; }
        .custom-popup .leaflet-popup-close-button { color: rgba(240,237,232,0.4) !important; top: 8px !important; right: 10px !important; }
        .leaflet-control-zoom a { background: #1a1a22 !important; color: #f0ede8 !important; border-color: rgba(240,237,232,0.12) !important; }
        .leaflet-control-zoom a:hover { background: #2a2a32 !important; }
        .leaflet-control-attribution { background: rgba(10,10,15,0.75) !important; color: rgba(240,237,232,0.25) !important; font-size: 10px !important; }
        .leaflet-control-attribution a { color: rgba(240,237,232,0.35) !important; }
        .day-tab-m { transition: all .2s !important; cursor: pointer !important; }
        .stop-row:hover { background: rgba(240,237,232,0.05) !important; }
        .stop-row { transition: background .15s !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "rgba(10,10,15,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(240,237,232,0.07)", zIndex: 1000, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.4)", fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif", cursor: "pointer", padding: 0 }}>← Back</button>
          <div style={{ width: 1, height: 20, background: "rgba(240,237,232,0.1)" }} />
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 300 }}>{form.destination}</span>
          <span style={{ color: "rgba(240,237,232,0.3)", fontSize: "0.8rem", fontStyle: "italic" }}>Map View</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {itinerary.days?.map((d, i) => (
            <button key={i} className="day-tab-m" onClick={() => setActiveDay(i)}
              style={{ background: activeDay === i ? `${DAY_COLORS[i % DAY_COLORS.length]}20` : "transparent", border: `1px solid ${activeDay === i ? DAY_COLORS[i % DAY_COLORS.length] : "rgba(240,237,232,0.1)"}`, color: activeDay === i ? DAY_COLORS[i % DAY_COLORS.length] : "rgba(240,237,232,0.4)", padding: "7px 16px", borderRadius: 2, fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "'Crimson Pro', serif" }}>
              Day {d.day}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "calc(100vh - 61px)" }}>
        {/* Sidebar */}
        <div style={{ width: 280, background: "#0d0d12", borderRight: "1px solid rgba(240,237,232,0.06)", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 18px 10px" }}>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.25em", textTransform: "uppercase", color, marginBottom: 4 }}>Day {activeDay + 1}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 300, lineHeight: 1.3, color: "#f0ede8" }}>{day?.theme}</div>
          </div>
          <div style={{ flex: 1, padding: "4px 10px 16px" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px", color: "rgba(240,237,232,0.4)", fontSize: "0.85rem" }}>
                <span style={{ width: 14, height: 14, border: `1px solid ${color}44`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />
                Locating places...
              </div>
            ) : stops.map((stop, i) => (
              <div key={i} className="stop-row" style={{ display: "flex", gap: 10, padding: "10px 8px", borderRadius: 3, marginBottom: 2 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#0a0a0f", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(212,175,100,0.5)", marginBottom: 2 }}>{stop.icon} {stop.label}</div>
                  <div style={{ fontSize: "0.9rem", color: "#f0ede8", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stop.name}</div>
                  {stop.duration && <div style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.3)", marginTop: 1 }}>⏱ {stop.duration}</div>}
                  {stop.cuisine && <div style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.3)", marginTop: 1 }}>{stop.cuisine} · {stop.price}</div>}
                </div>
              </div>
            ))}
          </div>
          {day?.transport && (
            <div style={{ margin: "0 10px 12px", padding: "10px 12px", background: "rgba(240,237,232,0.03)", border: "1px solid rgba(240,237,232,0.06)", borderRadius: 3 }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(240,237,232,0.25)", marginBottom: 4 }}>Transport</div>
              <div style={{ fontSize: "0.82rem", color: "rgba(240,237,232,0.45)", lineHeight: 1.4 }}>🚇 {day.transport}</div>
            </div>
          )}
          {day?.budget && (
            <div style={{ margin: "0 10px 16px", padding: "10px 12px", background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 3 }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: `${color}88`, marginBottom: 4 }}>Day Budget</div>
              <div style={{ fontSize: "0.9rem", color }}>💰 {day.budget}</div>
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          {loading && (
            <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "rgba(10,10,15,0.9)", border: "1px solid rgba(240,237,232,0.1)", borderRadius: 3, padding: "10px 18px", fontSize: "0.8rem", color: "rgba(240,237,232,0.6)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, border: `1px solid ${color}44`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />
              Finding locations...
            </div>
          )}
          <div style={{ position: "absolute", bottom: 40, right: 56, zIndex: 998, background: "rgba(10,10,15,0.8)", backdropFilter: "blur(6px)", border: "1px solid rgba(240,237,232,0.07)", borderRadius: 3, padding: "8px 12px", fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", pointerEvents: "none" }}>
            Click a pin for details
          </div>
        </div>
      </div>
    </div>
  );
}
