import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// -------------------------------------------------------------------------
// Category icon config – colour + emoji per POI type
// -------------------------------------------------------------------------

export const CATEGORY_STYLES: Record<string, { color: string; emoji: string }> = {
  grocery:       { color: "#10b981", emoji: "🛒" },
  restaurant:    { color: "#f59e0b", emoji: "🍽" },
  pharmacy:      { color: "#ef4444", emoji: "💊" },
  healthcare:    { color: "#ef4444", emoji: "🏥" },
  park:          { color: "#22c55e", emoji: "🌳" },
  gym:           { color: "#3b82f6", emoji: "💪" },
  bank:          { color: "#8b5cf6", emoji: "🏦" },
  school:        { color: "#6366f1", emoji: "🎓" },
  transit:       { color: "#06b6d4", emoji: "🚌" },
  bar:           { color: "#ec4899", emoji: "🍺" },
  entertainment: { color: "#a855f7", emoji: "🎬" },
};

export const DEFAULT_STYLE = { color: "#6b7280", emoji: "📍" };

// -------------------------------------------------------------------------
// Leaflet icon helpers (cached so we never recreate the same icon)
// -------------------------------------------------------------------------

const iconCache = new Map<string, L.DivIcon>();

function getMarkerIcon(category: string): L.DivIcon {
  if (iconCache.has(category)) return iconCache.get(category)!;

  const { color, emoji } = CATEGORY_STYLES[category] || DEFAULT_STYLE;
  const icon = L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;
      background:${color};
      border:2.5px solid rgba(255,255,255,0.95);
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    ">
      <span style="transform:rotate(45deg);font-size:14px">${emoji}</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  iconCache.set(category, icon);
  return icon;
}

const CENTER_ICON = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;
    background:#0f172a;
    border:3px solid #34d399;
    border-radius:50%;
    box-shadow:0 0 10px rgba(52,211,153,0.6);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// -------------------------------------------------------------------------
// Fit map to radius circle on mount
// -------------------------------------------------------------------------

function FitCircle({ center, radiusMeters }: { center: { lat: number; lng: number }; radiusMeters: number }) {
  const map = useMap();
  useEffect(() => {
    const latOffset = radiusMeters / 111000;
    const lngOffset = radiusMeters / (111000 * Math.cos((center.lat * Math.PI) / 180));
    map.fitBounds(
      L.latLngBounds(
        [center.lat - latOffset, center.lng - lngOffset],
        [center.lat + latOffset, center.lng + lngOffset]
      ),
      { padding: [40, 40] }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

interface POIMapProps {
  center: { lat: number; lng: number };
  pois: Array<{
    id: string;
    name: string;
    category: string;
    distance?: number;
    coordinates?: { lat: number; lng: number };
    address?: string;
  }>;
  radiusMiles: number;
}

export default function POIMap({ center, pois, radiusMiles }: POIMapProps) {
  const mappablePois = pois.filter(
    (p) => p.coordinates?.lat != null && p.coordinates?.lng != null
  );

  const radiusMeters = radiusMiles * 1609.34;

  return (
    <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "400px" }}
        className="w-full rounded-lg border border-white/10"
      >
        <FitCircle center={center} radiusMeters={radiusMeters} />

        {/* Dark basemap – free, attribution-only license */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Dashed radius ring */}
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusMeters}
          pathOptions={{
            color: "#34d399",
            fillColor: "#34d399",
            fillOpacity: 0.07,
            weight: 2,
            dashArray: "8 6",
          }}
        />

        {/* Centre pin (search location) */}
        <Marker position={[center.lat, center.lng]} icon={CENTER_ICON} />

        {/* POI markers */}
        {mappablePois.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.coordinates!.lat, poi.coordinates!.lng]}
            icon={getMarkerIcon(poi.category)}
          >
            <Popup>
              <div className="text-sm min-w-[130px]">
                <div className="font-semibold text-gray-800">{poi.name}</div>
                <div className="text-gray-500 capitalize">{poi.category}</div>
                {poi.distance != null && (
                  <div className="text-gray-500">{poi.distance.toFixed(2)} mi</div>
                )}
                <a
                  href={poi.address
                    ? `https://www.google.com/maps/search/?q=${encodeURIComponent(`${poi.name}, ${poi.address}`)}`
                    : `https://www.google.com/maps/?q=${poi.coordinates!.lat},${poi.coordinates!.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs mt-1 inline-block"
                >
                  Open in Google Maps →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
