export type DocTypeId =
  "bol" | "ratecon" | "pod" | "fuel" | "scale" | "lumper" | "repair" | "other";

export const docTypes: { id: DocTypeId; label: string; short: string }[] = [
  { id: "bol", label: "Bill of Lading (BOL)", short: "BOL" },
  { id: "ratecon", label: "Rate confirmation", short: "Rate con" },
  { id: "pod", label: "Proof of delivery (POD)", short: "POD" },
  { id: "fuel", label: "Fuel receipt", short: "Fuel" },
  { id: "scale", label: "Scale ticket", short: "Scale" },
  { id: "lumper", label: "Lumper receipt", short: "Lumper" },
  { id: "repair", label: "Repair invoice", short: "Repair" },
  { id: "other", label: "Other", short: "Other" },
];

export function docTypeLabel(id: DocTypeId) {
  return docTypes.find((t) => t.id === id)?.label ?? "Other";
}

export type DocStatus = "Pending" | "Uploaded" | "Sent";

export type DocSet = {
  id: string;
  load: string;
  type: DocTypeId;
  date: string;
  note?: string;
  pages: number;
  status: DocStatus;
  sentTo?: string;
};

/** Loads a driver can tag documents to (mock). */
export const docLoads = ["LD-88214", "LD-88190", "LD-88171", "LD-88144"];

export const docSets: DocSet[] = [
  {
    id: "DOC-3312",
    load: "LD-88214",
    type: "bol",
    date: "Sep 3, 2026",
    pages: 2,
    status: "Uploaded",
    note: "Signed at dock 14, seal intact",
  },
  {
    id: "DOC-3313",
    load: "LD-88214",
    type: "scale",
    date: "Sep 3, 2026",
    pages: 1,
    status: "Pending",
  },
  {
    id: "DOC-3301",
    load: "LD-88190",
    type: "pod",
    date: "Sep 1, 2026",
    pages: 3,
    status: "Sent",
    sentTo: "Apex Factoring",
  },
  {
    id: "DOC-3299",
    load: "LD-88190",
    type: "ratecon",
    date: "Aug 31, 2026",
    pages: 1,
    status: "Sent",
    sentTo: "Coastline Logistics (broker)",
  },
  {
    id: "DOC-3288",
    load: "LD-88171",
    type: "fuel",
    date: "Aug 29, 2026",
    pages: 4,
    status: "Uploaded",
    note: "Four stops, one week",
  },
  {
    id: "DOC-3275",
    load: "LD-88144",
    type: "lumper",
    date: "Aug 27, 2026",
    pages: 1,
    status: "Sent",
    sentTo: "billing@apexfactoring.com",
  },
];

export const sendTargets = [
  { id: "email", label: "Email a copy", detail: "Sends to an address you type in" },
  { id: "broker", label: "Push to broker", detail: "Coastline Logistics document portal" },
  { id: "factoring", label: "Push to factoring company", detail: "Apex Factoring — funding queue" },
];

/** One-time in-app purchase that unlocks document upload permanently. */
export const DOC_UPLOAD_PRICE = 5;
