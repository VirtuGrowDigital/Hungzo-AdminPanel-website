import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Crosshair, MapPinned } from "lucide-react";
import {
  AdminHero,
  AdminPage,
  AdminPanel,
  AdminSectionTitle,
} from "../../Components/AdminPrimitives";
import {
  Button,
  Field,
  InlineAlert,
  Select,
  StatusPill,
  TextInput,
} from "../../Components/MulticityUI";
import MapCanvas from "../../Components/MapCanvas";
import { useLocations } from "../../Context/LocationProvider";
import { checkServiceability, idOf, listZones } from "../../Api/multicity";

/**
 * Calls the same public endpoint the customer app calls, so what you see
 * here is exactly what a customer standing at that point would get.
 */
export default function ServiceabilityCheck() {
  const { warehouses, cityName } = useLocations();
  const [point, setPoint] = useState(null);
  const [fulfillmentType, setFulfillmentType] = useState("DELIVERY");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [zones, setZones] = useState([]);
  const [manual, setManual] = useState({ lat: "", lng: "" });

  useEffect(() => {
    listZones().then((res) => {
      if (res.ok) setZones(res.data?.zones || []);
    });
  }, []);

  const polygons = useMemo(
    () =>
      zones.map((zone) => ({
        id: idOf(zone._id),
        coordinates: zone.boundary?.coordinates?.[0] || [],
        color: zone.status === "live" ? "#0f766e" : "#94a3b8",
        dashed: zone.status !== "live",
        label: `${zone.name} · ${zone.status}`,
      })),
    [zones],
  );

  const markers = useMemo(() => {
    const list = warehouses
      .map((warehouse) => {
        const coordinates = warehouse.location?.location?.coordinates || [];
        return {
          lat: coordinates[1],
          lng: coordinates[0],
          label: warehouse.name,
          color: "#1d4ed8",
          radiusKm:
            warehouse.serviceMode === "zones"
              ? 0
              : warehouse.serviceArea?.deliveryRadiusKm || 0,
        };
      })
      .filter((marker) => Number.isFinite(marker.lat));

    if (point) {
      list.push({
        lat: point.lat,
        lng: point.lng,
        label: "Test point",
        color: "#dc2626",
      });
    }
    return list;
  }, [warehouses, point]);

  const runCheck = async (coordinates) => {
    if (!coordinates) return;
    setChecking(true);
    const res = await checkServiceability({
      lat: coordinates.lat,
      lng: coordinates.lng,
      fulfillmentType,
    });
    setChecking(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setResult(res.data);
  };

  const handleMapClick = (coordinates) => {
    setPoint(coordinates);
    setManual({
      lat: coordinates.lat.toFixed(6),
      lng: coordinates.lng.toFixed(6),
    });
    runCheck(coordinates);
  };

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Multi-city"
        title="Serviceability tester"
        description="Click anywhere on the map to see exactly what a customer standing there would get: serviceable or not, which store, whether it's open, and the fees that apply."
        icon={Crosshair}
        accent="cyan"
        meta="Test before you go live"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <AdminPanel>
          <AdminSectionTitle
            title="Map"
            description="Solid outline = live zone, dashed = draft/paused. Circles are radius fallbacks."
          />
          <div className="p-4">
            <MapCanvas
              center={[26.2183, 78.1828]}
              zoom={11}
              polygons={polygons}
              markers={markers}
              onMapClick={handleMapClick}
              fitKey={zones.length ? "zones" : ""}
              height="560px"
            />
          </div>
        </AdminPanel>

        <div className="space-y-5">
          <AdminPanel>
            <AdminSectionTitle title="Test a point" />
            <div className="space-y-3 p-4">
              <Field label="Fulfilment type">
                <Select
                  value={fulfillmentType}
                  onChange={(e) => setFulfillmentType(e.target.value)}
                >
                  <option value="DELIVERY">Delivery</option>
                  <option value="SELF_PICKUP">Self pickup</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <TextInput
                    value={manual.lat}
                    onChange={(e) =>
                      setManual({ ...manual, lat: e.target.value })
                    }
                  />
                </Field>
                <Field label="Longitude">
                  <TextInput
                    value={manual.lng}
                    onChange={(e) =>
                      setManual({ ...manual, lng: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Button
                variant="success"
                className="w-full"
                disabled={checking}
                onClick={() => {
                  const lat = Number(manual.lat);
                  const lng = Number(manual.lng);
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    toast.error("Enter valid coordinates");
                    return;
                  }
                  setPoint({ lat, lng });
                  runCheck({ lat, lng });
                }}
              >
                <MapPinned className="h-4 w-4" />
                {checking ? "Checking..." : "Check location"}
              </Button>
            </div>
          </AdminPanel>

          {result ? (
            <AdminPanel>
              <AdminSectionTitle
                title="Result"
                description={`Matched via ${result.matchSource}`}
              />
              <div className="space-y-3 p-4 text-sm">
                <InlineAlert
                  tone={
                    result.canPlaceOrder
                      ? "success"
                      : result.isServiceable
                        ? "warn"
                        : "error"
                  }
                >
                  <div className="font-semibold">
                    {result.canPlaceOrder
                      ? "Orders accepted here"
                      : result.isServiceable
                        ? "Serviceable, but not accepting orders right now"
                        : "Not serviceable"}
                  </div>
                  {result.message ? (
                    <div className="mt-1">{result.message}</div>
                  ) : null}
                  <div className="mt-1 text-xs opacity-80">
                    Code: {result.code || "—"}
                  </div>
                </InlineAlert>

                <dl className="space-y-2">
                  <Row label="City">
                    {result.city ? (
                      <span className="flex items-center gap-2">
                        {result.city.name}{" "}
                        <StatusPill value={result.city.status} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </Row>
                  <Row label="Zone">
                    {result.zone?.name || "— (radius match)"}
                  </Row>
                  <Row label="Warehouse">
                    {result.warehouse
                      ? `${result.warehouse.name} (${result.warehouse.distanceInKm ?? "?"} km)`
                      : "—"}
                  </Row>
                  <Row label="Open now">{result.isOpenNow ? "Yes" : "No"}</Row>
                  {result.operationalState ? (
                    <Row label="Hours today">
                      {result.operationalState.openTime
                        ? `${result.operationalState.openTime} – ${result.operationalState.closeTime}`
                        : result.operationalState.reason}
                    </Row>
                  ) : null}
                  {result.nearestWarehouse ? (
                    <Row label="Nearest store">
                      {result.nearestWarehouse.name} ·{" "}
                      {result.nearestWarehouse.distanceInKm} km away (outside
                      its {result.nearestWarehouse.radiusKm} km radius)
                    </Row>
                  ) : null}
                </dl>

                {result.config ? (
                  <div className="rounded-2xl border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Effective charges ({result.config.source})
                    </p>
                    <dl className="space-y-1 text-sm">
                      <Row label="Delivery fee">
                        ₹{result.config.deliveryFee}
                      </Row>
                      <Row label="Free above">
                        {result.config.freeDeliveryAbove
                          ? `₹${result.config.freeDeliveryAbove}`
                          : "—"}
                      </Row>
                      <Row label="Min order">
                        ₹{result.config.minOrderValue}
                      </Row>
                      <Row label="Handling fee">
                        ₹{result.config.platformFee}
                      </Row>
                      <Row label="COD">
                        {result.config.codEnabled
                          ? result.config.codMaxValue
                            ? `Up to ₹${result.config.codMaxValue}`
                            : "Enabled"
                          : "Disabled"}
                      </Row>
                      <Row label="ETA">
                        {result.config.etaMinutes
                          ? `${result.config.etaMinutes} min`
                          : "—"}
                      </Row>
                    </dl>
                  </div>
                ) : null}

                {result.warehouse ? (
                  <p className="text-xs text-slate-400">
                    Fulfilled from {cityName(result.city?.id)} ·{" "}
                    {result.warehouse.warehouseId}
                  </p>
                ) : null}
              </div>
            </AdminPanel>
          ) : (
            <AdminPanel>
              <div className="p-6 text-sm text-slate-500">
                Click the map or enter coordinates to run a check.
              </div>
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminPage>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}
