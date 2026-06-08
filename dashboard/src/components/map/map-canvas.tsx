'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { APIProvider, Map, useMap, Marker } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { MapPin, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { MapTypeToggle, type MapType } from './map-type-toggle';

export interface PondMapItem {
  id: string;
  name: string;
  farmerName: string;
  lat: number;
  lng: number;
  type: 'GROW_OUT' | 'HATCHERY' | 'NURSERY' | 'BROODSTOCK';
  alertStatus: 'normal' | 'critical';
  district: string;
  species: string;
  system: 'Extensive' | 'Semi-Intensive' | 'Intensive' | 'RAS' | 'Biofloc' | 'Cages' | 'Earthen';
  ownerType: string;
  waterSource: string;
  areaHectares: number;
  photos: string[];
  alertReason?: string;
}

interface MapCanvasProps {
  ponds: PondMapItem[];
  selectedPondId: string | null;
  onSelectPond: (pond: PondMapItem | null) => void;
  showHeatmap: boolean;
  selectedDistrict: string;
}

const BIHAR_CENTER = { lat: 25.85, lng: 85.15 };
const BIHAR_DEFAULT_ZOOM = 7.8;

/**
 * Approximate centroids for every district in Bihar.
 * Used by MapController to smoothly fly the camera when an admin filters by
 * district. If a new district appears that's not in this map, we fall back
 * to the centroid of the visible ponds — so the UX never breaks.
 *
 * Zoom level 11 frames a typical district + its immediate neighbours;
 * dense urban districts (Patna) and large rural ones (Rohtas) use the same
 * level because we always want a comparable view scale for the eye.
 */
const DISTRICT_COORDINATES: Record<string, { center: { lat: number; lng: number }; zoom: number }> = {
  Araria:         { center: { lat: 26.149, lng: 87.516 }, zoom: 11 },
  Arwal:          { center: { lat: 25.247, lng: 84.683 }, zoom: 11 },
  Aurangabad:     { center: { lat: 24.752, lng: 84.374 }, zoom: 11 },
  Banka:          { center: { lat: 24.886, lng: 86.922 }, zoom: 11 },
  Begusarai:      { center: { lat: 25.418, lng: 86.130 }, zoom: 11 },
  Bhagalpur:      { center: { lat: 25.244, lng: 86.972 }, zoom: 11 },
  Bhojpur:        { center: { lat: 25.557, lng: 84.671 }, zoom: 11 },
  Buxar:          { center: { lat: 25.561, lng: 83.978 }, zoom: 11 },
  Darbhanga:      { center: { lat: 26.154, lng: 85.892 }, zoom: 11 },
  'East Champaran': { center: { lat: 26.647, lng: 84.916 }, zoom: 11 },
  Gaya:           { center: { lat: 24.796, lng: 85.008 }, zoom: 11 },
  Gopalganj:      { center: { lat: 26.467, lng: 84.435 }, zoom: 11 },
  Jamui:          { center: { lat: 24.927, lng: 86.222 }, zoom: 11 },
  Jehanabad:      { center: { lat: 25.213, lng: 84.987 }, zoom: 11 },
  Kaimur:         { center: { lat: 25.038, lng: 83.610 }, zoom: 11 },
  Katihar:        { center: { lat: 25.539, lng: 87.582 }, zoom: 11 },
  Khagaria:       { center: { lat: 25.502, lng: 86.466 }, zoom: 11 },
  Kishanganj:     { center: { lat: 26.103, lng: 87.946 }, zoom: 11 },
  Lakhisarai:     { center: { lat: 25.176, lng: 86.094 }, zoom: 11 },
  Madhepura:      { center: { lat: 25.917, lng: 86.793 }, zoom: 11 },
  Madhubani:      { center: { lat: 26.349, lng: 86.072 }, zoom: 11 },
  Munger:         { center: { lat: 25.376, lng: 86.475 }, zoom: 11 },
  Muzaffarpur:    { center: { lat: 26.122, lng: 85.391 }, zoom: 11 },
  Nalanda:        { center: { lat: 25.198, lng: 85.523 }, zoom: 11 },
  Nawada:         { center: { lat: 24.886, lng: 85.541 }, zoom: 11 },
  Patna:          { center: { lat: 25.611, lng: 85.144 }, zoom: 11 },
  Purnia:         { center: { lat: 25.778, lng: 87.475 }, zoom: 11 },
  Rohtas:         { center: { lat: 24.949, lng: 84.034 }, zoom: 11 },
  Saharsa:        { center: { lat: 25.881, lng: 86.605 }, zoom: 11 },
  Samastipur:     { center: { lat: 25.864, lng: 85.781 }, zoom: 11 },
  Saran:          { center: { lat: 25.781, lng: 84.749 }, zoom: 11 },
  Sheikhpura:     { center: { lat: 25.137, lng: 85.851 }, zoom: 11 },
  Sheohar:        { center: { lat: 26.520, lng: 85.291 }, zoom: 11 },
  Sitamarhi:      { center: { lat: 26.594, lng: 85.487 }, zoom: 11 },
  Siwan:          { center: { lat: 26.220, lng: 84.355 }, zoom: 11 },
  Supaul:         { center: { lat: 26.126, lng: 86.604 }, zoom: 11 },
  Vaishali:       { center: { lat: 25.685, lng: 85.214 }, zoom: 11 },
  'West Champaran': { center: { lat: 27.103, lng: 84.392 }, zoom: 11 },
};

/**
 * MapController — drives the camera in response to district filter changes.
 *
 * Belt-and-suspenders approach:
 *   1. If the map isn't ready (no projection yet), we wait for the `idle`
 *      event and apply the target once. This catches the race where the
 *      user changes mapType (forcing a Map remount) and immediately picks
 *      a district before tiles are loaded.
 *   2. Once ready, we call setCenter + setZoom directly *and* call
 *      setOptions with the same values. Either alone has been observed to
 *      silently no-op in some Google Maps JS API versions when called
 *      mid-tween. Calling both guarantees the camera move lands.
 *
 * `ponds` is read via ref so changes to the filtered pond array don't
 * fire this effect — only an actual district change should.
 */
function MapController({ selectedDistrict, ponds }: { selectedDistrict: string; ponds: PondMapItem[] }) {
  const map = useMap();
  const pondsRef = useRef(ponds);
  pondsRef.current = ponds;

  useEffect(() => {
    if (!map) return;

    const resolveTarget = (): { center: { lat: number; lng: number }; zoom: number } | null => {
      if (selectedDistrict === 'all') {
        return { center: BIHAR_CENTER, zoom: BIHAR_DEFAULT_ZOOM };
      }
      const coords = DISTRICT_COORDINATES[selectedDistrict];
      if (coords) return coords;
      const validPonds = pondsRef.current.filter(
        (p) => typeof p.lat === 'number' && typeof p.lng === 'number',
      );
      if (validPonds.length === 0) return null;
      const avgLat = validPonds.reduce((s, p) => s + p.lat, 0) / validPonds.length;
      const avgLng = validPonds.reduce((s, p) => s + p.lng, 0) / validPonds.length;
      return { center: { lat: avgLat, lng: avgLng }, zoom: 11 };
    };

    const target = resolveTarget();
    if (!target) return;

    const apply = () => {
      try {
        map.setCenter(target.center);
        map.setZoom(target.zoom);
        map.setOptions({ center: target.center, zoom: target.zoom });
      } catch (e) {
        // Map may not be fully initialised yet — fall through to listener path
        // eslint-disable-next-line no-console
        console.warn('[MapController] direct setCenter/setZoom failed, retrying on idle', e);
      }
    };

    // First call — synchronous attempt right now.
    apply();

    // Safety net: if the map wasn't ready (e.g. just remounted via key={mapType}),
    // also queue a one-shot idle listener that re-applies once tiles settle.
    const g = (window as any).google;
    if (g?.maps?.event) {
      const idleListener = map.addListener('idle', () => {
        apply();
        g.maps.event.removeListener(idleListener);
      });
      return () => g.maps.event.removeListener(idleListener);
    }
  }, [map, selectedDistrict]);

  return null;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let stateGeoJsonCache: any = null;
let districtsGeoJsonCache: any = null;

function BiharBorders() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let active = true;
    const addedFeatures: any[] = [];

    const loadBorders = async () => {
      try {
        if (!stateGeoJsonCache) {
          const res = await fetch('/data/bihar_state.geojson');
          stateGeoJsonCache = await res.json();
        }

        if (!active) return;

        const stateFeatures = map.data.addGeoJson(stateGeoJsonCache);
        stateFeatures.forEach((feature) => {
          addedFeatures.push(feature);
          map.data.overrideStyle(feature, {
            strokeColor: '#0ea5e9',
            strokeWeight: 3.5,
            strokeOpacity: 0.95,
            fillColor: 'transparent',
            fillOpacity: 0,
            clickable: false,
          });
        });

        if (!districtsGeoJsonCache) {
          const res = await fetch('/data/bihar_districts.geojson');
          districtsGeoJsonCache = await res.json();
        }

        if (!active) return;

        const districtFeatures = map.data.addGeoJson(districtsGeoJsonCache);
        districtFeatures.forEach((feature) => {
          addedFeatures.push(feature);
          map.data.overrideStyle(feature, {
            strokeColor: '#38bdf8',
            strokeWeight: 1.2,
            strokeOpacity: 0.55,
            fillColor: 'transparent',
            fillOpacity: 0,
            clickable: false,
          });
        });
      } catch (err) {
        console.error('Failed to load Bihar map boundaries:', err);
      }
    };

    loadBorders();

    return () => {
      active = false;
      addedFeatures.forEach((feature) => {
        try {
          map.data.remove(feature);
        } catch (err) {
          // Handled internally
        }
      });
    };
  }, [map]);

  return null;
}

/**
 * HeatmapOverlay — density visualization of ecological alert hotspots.
 *
 * History: we initially used google.maps.visualization.HeatmapLayer. Google
 * deprecated and removed that class in Maps JavaScript API v3.65, which
 * caused the constructor to throw — presenting as a "black screen" because
 * the React tree below the throw never rendered the satellite tiles.
 *
 * Current implementation: deck.gl's HeatmapLayer mounted via a
 * GoogleMapsOverlay. deck.gl is the official Google-recommended migration
 * path from the removed visualization library, and it's from the same
 * vis.gl team that maintains our @vis.gl/react-google-maps. The visual
 * result is a smooth green→yellow→red density gradient rendered on a
 * WebGL canvas overlaid on the Google Map.
 *
 * Color ramp tuples are [r, g, b, alpha (0–255)]. We keep alpha low at the
 * green end so cool zones blend into the basemap, then ramp up toward red
 * so hot zones dominate.
 */
const HEATMAP_COLOR_RANGE: [number, number, number, number][] = [
  [0, 200, 100, 60],    // green — low alpha, blends with map
  [120, 220, 80, 110],  // yellow-green
  [220, 220, 60, 150],  // yellow
  [240, 160, 40, 180],  // orange
  [230, 70, 40, 210],   // red-orange
  [200, 30, 30, 230],   // red
];

/** Heatmap kernel radius (in screen pixels). deck.gl handles dissipation. */
const HEATMAP_RADIUS_PIXELS = 55;

function HeatmapOverlay({ points }: { points: { lat: number; lng: number; weight: number }[] }) {
  const map = useMap();
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);

  // Stable dep so identical point-sets don't rebuild the WebGL overlay.
  const pointsKey = useMemo(
    () => points.map((p) => `${p.lat},${p.lng},${p.weight}`).join('|'),
    [points],
  );

  useEffect(() => {
    if (!map) {
      // eslint-disable-next-line no-console
      console.log('[Heatmap] skipped — map not ready');
      return;
    }
    if (points.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[Heatmap] skipped — no critical points in current filter');
      return;
    }

    try {
      const layer = new HeatmapLayer({
        id: 'critical-alerts-heatmap',
        data: points,
        getPosition: (d: { lat: number; lng: number }) => [d.lng, d.lat],
        getWeight: (d: { weight: number }) => d.weight,
        radiusPixels: HEATMAP_RADIUS_PIXELS,
        intensity: 1,
        threshold: 0.05,    // Hide cells with negligible weight — cleaner edges.
        colorRange: HEATMAP_COLOR_RANGE,
        aggregation: 'SUM',
      });

      const overlay = new GoogleMapsOverlay({ layers: [layer] });
      overlay.setMap(map as any);
      overlayRef.current = overlay;

      // eslint-disable-next-line no-console
      console.log(`[Heatmap] mounted via deck.gl with ${points.length} point(s)`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Heatmap] failed to create deck.gl overlay:', err);
      overlayRef.current = null;
    }

    return () => {
      if (overlayRef.current) {
        try {
          overlayRef.current.setMap(null);
          overlayRef.current.finalize();
        } catch {
          // ignore cleanup races
        }
        overlayRef.current = null;
      }
    };
    // pointsKey is a primitive that mirrors `points` — see useMemo above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey]);

  return null;
}

// Marker Color Map based on pond category
const PIN_COLORS = {
  GROW_OUT: '#1565C0',   // Indigo
  HATCHERY: '#34D399',   // Emerald
  NURSERY: '#00B0FF',    // Teal
  BROODSTOCK: '#9C27B0', // Purple
};

export function MapCanvas({ ponds, selectedPondId, onSelectPond, showHeatmap, selectedDistrict }: MapCanvasProps) {
  const [mapType, setMapType] = useState<MapType>('hybrid');

  if (!API_KEY) {
    return <MissingApiKey />;
  }

  // Filter out critical points for the heatmap overlay.
  // Memoized so the inner HeatmapOverlay's effect doesn't tear down and
  // rebuild the layer on every parent render — that was causing the
  // black-screen flash when toggling the heatmap on.
  const heatmapPoints = useMemo(
    () =>
      ponds
        .filter((p) => p.alertStatus === 'critical')
        .map((p) => ({
          lat: p.lat,
          lng: p.lng,
          weight: 3, // higher weight for critical points
        })),
    [ponds],
  );

  return (
    <div className="relative h-full w-full">
      <APIProvider apiKey={API_KEY} libraries={['places']}>
        <Map
          key={mapType}
          defaultCenter={BIHAR_CENTER}
          defaultZoom={BIHAR_DEFAULT_ZOOM}
          mapTypeId={mapType}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl
          zoomControlOptions={{ position: 9 } as any}
          fullscreenControl
          fullscreenControlOptions={{ position: 9 } as any}
          mapTypeControl={false}
          streetViewControl={false}
          style={{ width: '100%', height: '100%' }}
          minZoom={5}
          maxZoom={20}
        >
          {/* Controls the pan and zoom programmatically */}
          <MapController selectedDistrict={selectedDistrict} ponds={ponds} />

          {/* Overlay Bihar state and district boundaries */}
          <BiharBorders />

          {/* Renders Heatmap Overlay when toggled */}
          {showHeatmap && heatmapPoints.length > 0 && (
            <HeatmapOverlay points={heatmapPoints} />
          )}

          {/* Pond markers.
              When the heatmap overlay is active, markers fade to 0.35 opacity
              and lose their stroke so the density gradient reads as the
              dominant visual — but the marker remains clickable so an admin
              can still drill into a hotspot's underlying pond. The currently
              selected pond ignores the fade so the inspection drawer's
              anchor never disappears.
          */}
          {ponds.map((pond) => {
            let color = PIN_COLORS[pond.type];
            if (pond.type === 'GROW_OUT') {
              if (pond.system === 'RAS') {
                color = '#F59E0B'; // Amber
              } else if (pond.system === 'Biofloc') {
                color = '#EC4899'; // Pink
              } else if (pond.system === 'Cages') {
                color = '#06B6D4'; // Cyan
              } else if (pond.system === 'Earthen') {
                color = '#3B82F6'; // Blue
              }
            }
            const isSelected = selectedPondId === pond.id;
            const faded = showHeatmap && !isSelected;

            return (
              <Marker
                key={pond.id}
                position={{ lat: pond.lat, lng: pond.lng }}
                title={`${pond.name} - ${pond.farmerName}`}
                onClick={() => onSelectPond(pond)}
                zIndex={isSelected ? 999 : faded ? 1 : 10}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: color,
                  fillOpacity: faded ? 0.35 : 1.0,
                  strokeWeight: isSelected ? 3.0 : faded ? 0.6 : 1.5,
                  strokeColor: isSelected ? '#ff4081' : '#ffffff',
                  strokeOpacity: faded ? 0.5 : 1.0,
                  scale: isSelected ? 1.8 : faded ? 1.1 : 1.4,
                  anchor: { x: 12, y: 22 } as any,
                }}
              />
            );
          })}
        </Map>
      </APIProvider>

      {/* Glass layer toggle — top-left, above the map */}
      <div className="pointer-events-auto absolute left-4 top-4 z-10">
        <MapTypeToggle value={mapType} onChange={setMapType} />
      </div>

      {/* Map Legend — bottom-left, absolute overlay */}
      <div className="pointer-events-auto absolute bottom-8 left-4 z-10">
        <GlassCard className="p-3.5 space-y-2.5 text-xs w-[240px] border-glass-border/30 shadow-glow">
          <div className="font-bold text-ink-primary uppercase tracking-wider text-[10px] border-b border-glass-border/30 pb-1.5 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-teal-400" />
            Atlas Legend
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: '#10B981' }} />
              <span className="text-ink-secondary text-[11px]">Hatchery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: '#8B5CF6' }} />
              <span className="text-ink-secondary text-[11px]">Nursery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: '#D946EF' }} />
              <span className="text-ink-secondary text-[11px]">Broodstock</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: '#3B82F6' }} />
              <span className="text-ink-secondary text-[11px]">Earthen Pond Growout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: '#F59E0B' }} />
              <span className="text-ink-secondary text-[11px]">RAS Growout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: '#EC4899' }} />
              <span className="text-ink-secondary text-[11px]">Biofloc Growout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: '#06B6D4' }} />
              <span className="text-ink-secondary text-[11px]">Cage Growout</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function MissingApiKey() {
  return (
    <div className="grid h-full w-full place-items-center px-6">
      <GlassCard className="max-w-md p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-severity-warning/10 text-severity-warning">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-secondary">
              Map disabled
            </div>
            <div className="text-lg font-bold text-ink-primary">
              No Google Maps key configured
            </div>
          </div>
        </div>
        <p className="text-base leading-relaxed text-ink-secondary">
          Set{' '}
          <span className="rounded bg-glass-strong px-1.5 py-0.5 font-mono text-sm">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </span>{' '}
          in <span className="font-mono">dashboard/.env.local</span>, then
          restart{' '}
          <span className="font-mono">npm run dev</span>. The key must have
          Maps JavaScript API enabled and{' '}
          <span className="font-mono">localhost:3001</span> on the referrer
          allowlist.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-glass-border bg-glass-subtle p-3 text-sm text-ink-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
          <span>
            See <span className="font-mono">dashboard/SECURITY.md</span> for
            the recommended restrictions.
          </span>
        </div>
      </GlassCard>
    </div>
  );
}
