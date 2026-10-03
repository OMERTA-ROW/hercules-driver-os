import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrentLoad, useVehicles } from "@/lib/live";
import type { BolIntent } from "@/lib/bol-intents";

export type BolItem = {
  description: string;
  handlingUnits: string;
  weight: string;
  weightUnit: "lb" | "kg";
};

export type BolDraft = {
  id: string | null;
  loadId: string | null;
  loadReference: string;
  carrierName: string;
  vehicleUnit: string;
  shipperName: string;
  shipperAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  pickupDetails: string;
  deliveryDetails: string;
  items: BolItem[];
  freightInstructions: string;
  status: "draft" | "reviewed";
  updatedAt: string | null;
};

export type BolView = "edit" | "review" | "print" | "email" | null;
export type BolResult = { ok: boolean; message: string };

const emptyItem = (): BolItem => ({ description: "", handlingUnits: "", weight: "", weightUnit: "lb" });

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseDraft(row: {
  id: string;
  load_id: string | null;
  load_reference: string | null;
  status: string;
  updated_at: string;
  bol_data: unknown;
}): BolDraft {
  const data = row.bol_data && typeof row.bol_data === "object" ? (row.bol_data as Record<string, unknown>) : {};
  const rawItems = Array.isArray(data["items"]) ? data["items"] : [];
  const items = rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      description: asText(item["description"]),
      handlingUnits: asText(item["handlingUnits"]),
      weight: asText(item["weight"]),
      weightUnit: item["weightUnit"] === "kg" ? "kg" as const : "lb" as const,
    }));
  return {
    id: row.id,
    loadId: row.load_id,
    loadReference: row.load_reference ?? "",
    carrierName: asText(data["carrierName"]),
    vehicleUnit: asText(data["vehicleUnit"]),
    shipperName: asText(data["shipperName"]),
    shipperAddress: asText(data["shipperAddress"]),
    consigneeName: asText(data["consigneeName"]),
    consigneeAddress: asText(data["consigneeAddress"]),
    pickupDetails: asText(data["pickupDetails"]),
    deliveryDetails: asText(data["deliveryDetails"]),
    items: items.length ? items : [emptyItem()],
    freightInstructions: asText(data["freightInstructions"]),
    status: row.status === "reviewed" ? "reviewed" : "draft",
    updatedAt: row.updated_at,
  };
}

export function missingBolFields(draft: BolDraft) {
  const missing: string[] = [];
  if (!draft.shipperName.trim()) missing.push("shipper name");
  if (!draft.shipperAddress.trim()) missing.push("shipper address");
  if (!draft.consigneeName.trim()) missing.push("consignee name");
  if (!draft.consigneeAddress.trim()) missing.push("consignee address");
  if (!draft.pickupDetails.trim()) missing.push("pickup details");
  if (!draft.deliveryDetails.trim()) missing.push("delivery details");
  if (!draft.items.some((item) => item.description.trim())) missing.push("item description");
  if (!draft.items.some((item) => item.handlingUnits.trim())) missing.push("handling units/count");
  if (!draft.items.some((item) => item.weight.trim())) missing.push("freight weight");
  return missing;
}

type BolContextValue = {
  draft: BolDraft | null;
  view: BolView;
  busy: boolean;
  error: string | null;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  setDraft: (draft: BolDraft) => void;
  setView: (view: BolView) => void;
  setEmailTo: (value: string) => void;
  setEmailSubject: (value: string) => void;
  setEmailBody: (value: string) => void;
  handleCommand: (intent: BolIntent) => Promise<BolResult>;
  save: () => Promise<BolResult>;
  close: () => void;
};

const BolContext = createContext<BolContextValue | null>(null);

export function BolProvider({ children }: { children: ReactNode }) {
  const { account, userId } = useAuth();
  const { load } = useCurrentLoad();
  const vehicles = useVehicles();
  const [draft, setDraft] = useState<BolDraft | null>(null);
  const [view, setView] = useState<BolView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("Bill of Lading draft");
  const [emailBody, setEmailBody] = useState("Please review the attached Bill of Lading draft. Unknown fields require confirmation.");

  useEffect(() => {
    setDraft(null);
    setView(null);
    setError(null);
  }, [userId]);

  const loadLatest = useCallback(async (): Promise<BolDraft | null> => {
    if (!userId) return null;
    const { data, error: readError } = await supabase
      .from("documents")
      .select("id, load_id, load_reference, status, updated_at, bol_data")
      .eq("owner_id", userId)
      .eq("kind", "bol_draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) throw readError;
    return data ? parseDraft(data) : null;
  }, [userId]);

  const createDraft = useCallback((): BolDraft => {
    const activeVehicle = vehicles.data?.find((vehicle) => vehicle.id === load?.vehicle_id) ?? vehicles.data?.find((vehicle) => vehicle.active);
    const origin = [load?.origin_city, load?.origin_state].filter(Boolean).join(", ");
    const destination = [load?.dest_city, load?.dest_state].filter(Boolean).join(", ");
    return {
      id: null,
      loadId: load?.id ?? null,
      loadReference: load?.reference ?? "",
      carrierName: account?.company?.name ?? "",
      vehicleUnit: activeVehicle?.unit_number ?? activeVehicle?.label ?? "",
      shipperName: "",
      shipperAddress: origin,
      consigneeName: "",
      consigneeAddress: destination,
      pickupDetails: load?.pickup_at ? new Date(load.pickup_at).toLocaleString() : "",
      deliveryDetails: load?.deliver_at ? new Date(load.deliver_at).toLocaleString() : "",
      items: [{
        description: load?.commodity ?? "",
        handlingUnits: "",
        weight: load?.weight_lb ? String(load.weight_lb) : "",
        weightUnit: "lb",
      }],
      freightInstructions: load?.notes ?? "",
      status: "draft",
      updatedAt: null,
    };
  }, [account?.company?.name, load, vehicles.data]);

  const handleCommand = useCallback(async (intent: BolIntent): Promise<BolResult> => {
    if (!userId) return { ok: false, message: "Sign in first so I can use only your loads and documents." };
    setBusy(true);
    setError(null);
    try {
      const existing = draft ?? await loadLatest();
      if (intent === "create") {
        const next = existing ?? createDraft();
        setDraft(next);
        setView("edit");
        const missing = missingBolFields(next);
        return { ok: true, message: missing.length ? `I opened a BOL draft using only your saved load and equipment. I still need ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", and a few more fields" : ""}.` : "Your BOL draft is ready to review. Nothing has been signed, sent, or printed." };
      }
      if (!existing) return { ok: false, message: "You do not have a saved BOL draft yet. Say “create a BOL” to start one." };
      setDraft(existing);
      if (intent === "open") setView("review");
      if (intent === "print") setView("print");
      if (intent === "email") {
        setEmailSubject(`BOL draft${existing.loadReference ? ` — ${existing.loadReference}` : ""}`);
        setView("email");
      }
      return {
        ok: true,
        message: intent === "print"
          ? "I opened the print preview. Review it, then choose Print to open your device’s system print dialog."
          : intent === "email"
            ? "I opened an email draft. No mail provider is connected, so nothing can be sent from Hercules."
            : "I opened your latest BOL draft for review. Unknown fields stay marked, and signature lines remain unsigned.",
      };
    } catch (caught) {
      console.error("[bol] command failed", caught);
      setError("Your BOL draft could not be read. Nothing was changed.");
      return { ok: false, message: "Your BOL draft could not be read. Nothing was changed." };
    } finally {
      setBusy(false);
    }
  }, [createDraft, draft, loadLatest, userId]);

  const save = useCallback(async (): Promise<BolResult> => {
    if (!userId || !draft) return { ok: false, message: "Sign in and open a BOL draft first." };
    setBusy(true);
    setError(null);
    const bolData = {
      carrierName: draft.carrierName,
      vehicleUnit: draft.vehicleUnit,
      shipperName: draft.shipperName,
      shipperAddress: draft.shipperAddress,
      consigneeName: draft.consigneeName,
      consigneeAddress: draft.consigneeAddress,
      pickupDetails: draft.pickupDetails,
      deliveryDetails: draft.deliveryDetails,
      items: draft.items,
      freightInstructions: draft.freightInstructions,
    };
    const base = {
      owner_id: userId,
      load_id: draft.loadId,
      load_reference: draft.loadReference || null,
      kind: "bol_draft",
      title: draft.loadReference ? `BOL draft — ${draft.loadReference}` : "BOL draft",
      status: "draft",
      page_count: 1,
      bol_data: bolData,
    };
    const request = draft.id
      ? supabase.from("documents").update(base).eq("id", draft.id).eq("owner_id", userId).select("id, load_id, load_reference, status, updated_at, bol_data").single()
      : supabase.from("documents").insert(base).select("id, load_id, load_reference, status, updated_at, bol_data").single();
    const { data, error: saveError } = await request;
    setBusy(false);
    if (saveError || !data) {
      console.error(`[bol] save failed: ${saveError?.message ?? "no row returned"}`);
      setError("The BOL draft did not save. Nothing was finalized or sent.");
      return { ok: false, message: "The BOL draft did not save. Nothing was finalized or sent." };
    }
    setDraft(parseDraft(data));
    return { ok: true, message: "BOL draft saved to your documents. It is still unsigned and has not been sent or printed." };
  }, [draft, userId]);

  const value = useMemo<BolContextValue>(() => ({
    draft, view, busy, error, emailTo, emailSubject, emailBody,
    setDraft, setView, setEmailTo, setEmailSubject, setEmailBody,
    handleCommand, save,
    close: () => setView(null),
  }), [draft, view, busy, error, emailTo, emailSubject, emailBody, handleCommand, save]);

  return <BolContext.Provider value={value}>{children}</BolContext.Provider>;
}

export function useBol() {
  const context = useContext(BolContext);
  if (!context) throw new Error("useBol must be used inside BolProvider");
  return context;
}