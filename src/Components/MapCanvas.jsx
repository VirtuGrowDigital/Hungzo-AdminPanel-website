import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Thin Leaflet wrapper used by the zone editor, serviceability checker and
 * demand heatmap. OpenStreetMap tiles — no API key required.
 *
 * Props
 *  center/zoom        initial view ([lat, lng])
 *  markers            [{ lat, lng, label, color, radiusKm? }]
 *  polygons           [{ id, coordinates: [[lng,lat],...], color, label, dashed }]
 *  drawPoints         [[lng,lat], ...] the polygon currently being drawn
 *  onMapClick(latlng) called with { lat, lng }
 *  onVertexDrag(i, latlng)
 *  heatCells          [{ lat, lng, count }]
 *  fitKey             change this to re-fit the view to the drawn content
 */
export default function MapCanvas({
  center = [26.2183, 78.1828],
  zoom = 12,
  markers = [],
  polygons = [],
  drawPoints = [],
  onMapClick,
  onVertexDrag,
  heatCells = [],
  fitKey = "",
  view = null,
  height = "520px",
  className = "",
}) {
  const nodeRef = useRef(null);
  const viewRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const clickRef = useRef(onMapClick);
  const dragRef = useRef(onVertexDrag);

  useEffect(() => {
    clickRef.current = onMapClick;
    dragRef.current = onVertexDrag;
  }, [onMapClick, onVertexDrag]);

  useEffect(() => {
    if (mapRef.current || !nodeRef.current) return;

    const map = L.map(nodeRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", (event) => {
      clickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    // Container size is unknown on first paint inside flex layouts.
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Imperative view changes (search result, "jump to city", zoom presets).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !view) return;
    if (viewRef.current === view.key) return;
    viewRef.current = view.key;
    map.setView([view.lat, view.lng], view.zoom ?? map.getZoom(), { animate: true });
  }, [view]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds = [];

    polygons.forEach((polygon) => {
      const latlngs = (polygon.coordinates || []).map(([lng, lat]) => [lat, lng]);
      if (latlngs.length < 3) return;
      const shape = L.polygon(latlngs, {
        color: polygon.color || "#0f766e",
        weight: 2,
        dashArray: polygon.dashed ? "6 6" : undefined,
        fillOpacity: polygon.fillOpacity ?? 0.12,
      }).addTo(layer);
      if (polygon.label) shape.bindTooltip(polygon.label, { sticky: true });
      latlngs.forEach((point) => bounds.push(point));
    });

    markers.forEach((marker) => {
      if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return;
      const point = [marker.lat, marker.lng];
      L.circleMarker(point, {
        radius: 7,
        color: marker.color || "#0369a1",
        fillColor: marker.color || "#0369a1",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(layer)
        .bindTooltip(marker.label || "", { permanent: false });

      if (marker.radiusKm > 0) {
        L.circle(point, {
          radius: marker.radiusKm * 1000,
          color: marker.color || "#0369a1",
          weight: 1,
          dashArray: "4 6",
          fillOpacity: 0.05,
        }).addTo(layer);
      }
      bounds.push(point);
    });

    const maxCount = heatCells.reduce((max, cell) => Math.max(max, cell.count || 0), 0);
    heatCells.forEach((cell) => {
      if (!Number.isFinite(cell.lat) || !Number.isFinite(cell.lng)) return;
      const intensity = maxCount ? (cell.count || 0) / maxCount : 0;
      L.circleMarker([cell.lat, cell.lng], {
        radius: 6 + intensity * 16,
        color: "#dc2626",
        weight: 1,
        fillColor: "#ef4444",
        fillOpacity: 0.25 + intensity * 0.5,
      })
        .addTo(layer)
        .bindTooltip(`${cell.count} request${cell.count === 1 ? "" : "s"}`);
      bounds.push([cell.lat, cell.lng]);
    });

    if (drawPoints.length) {
      const latlngs = drawPoints.map(([lng, lat]) => [lat, lng]);
      if (latlngs.length >= 3) {
        L.polygon(latlngs, {
          color: "#b45309",
          weight: 2,
          fillOpacity: 0.15,
        }).addTo(layer);
      } else if (latlngs.length === 2) {
        L.polyline(latlngs, { color: "#b45309", weight: 2 }).addTo(layer);
      }

      latlngs.forEach((point, index) => {
        const handle = L.marker(point, {
          draggable: true,
          icon: L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:9999px;background:#b45309;border:2px solid white;box-shadow:0 0 0 1px #b45309"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        }).addTo(layer);
        handle.bindTooltip(`Point ${index + 1}`);
        handle.on("dragend", (event) => {
          const { lat, lng } = event.target.getLatLng();
          dragRef.current?.(index, { lat, lng });
        });
        bounds.push(point);
      });
    }

    if (bounds.length && fitKey) {
      try {
        map.fitBounds(L.latLngBounds(bounds).pad(0.2));
      } catch {
        /* ignore invalid bounds */
      }
    }
  }, [markers, polygons, drawPoints, heatCells, fitKey]);

  return (
    <div
      ref={nodeRef}
      className={`w-full overflow-hidden rounded-2xl border border-slate-200 ${className}`}
      style={{ height }}
    />
  );
}
