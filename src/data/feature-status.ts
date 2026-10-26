/** Audited capability directory, not paid subscriptions or provider entitlements. */
export type FeatureStatus = "Partial" | "Demo" | "Planned";
export type FeatureDestination = "/equipment" | "/navigation" | "/stops" | "/voice" | "/health" | "/documents";
export type Capability = {
  id: number;
  name: string;
  status: FeatureStatus;
  detail: string;
  limitation: string;
  destination?: FeatureDestination;
  destinationLabel?: string;
};

export const featureStatuses: readonly Capability[] = [
  { id: 2, name: "Shared vehicle profile", status: "Partial", detail: "Measured dimensions, weight, axles, trailer and hazmat can be saved to your account.", limitation: "Full routing, hazard and parts integration is pending. Account save/reload is not yet verified.", destination: "/equipment", destinationLabel: "Vehicle profile" },
  { id: 1, name: "Truck-legal routing", status: "Demo", detail: "Existing map and route previews are available; truck routes and reroutes are simulated.", limitation: "Blocked: HERE or Trimble connection and usage approval. These routes are not verified truck-legal.", destination: "/navigation", destinationLabel: "Map preview" },
  { id: 3, name: "Corridor hazards", status: "Demo", detail: "Sample clearance and road-hazard warnings appear in the map experience.", limitation: "A real corridor data source and route cache are not connected.", destination: "/navigation", destinationLabel: "Map preview" },
  { id: 4, name: "Offline trip bundle", status: "Planned", detail: "Save routes, hazards and truck stops before a trip.", limitation: "Not implemented. Offline route and map availability are not guaranteed." },
  { id: 5, name: "Drive-time & parking", status: "Demo", detail: "Existing stop previews are available, with sample parking information.", limitation: "Real HOS-aware suggestions, parking availability and booking are not connected.", destination: "/stops", destinationLabel: "Stop preview" },
  { id: 6, name: "Conversational voice tools", status: "Partial", detail: "Current-session text, supported voice input/output and Stop are available in the existing conversation.", limitation: "ElevenLabs agent tools and always-on wake word are planned. Voice depends on browser, account and credits.", destination: "/voice", destinationLabel: "Conversation" },
  { id: 7, name: "Plain-English ECU", status: "Demo", detail: "Vehicle-health and fault explanation screens exist; no live hardware readings are verified.", limitation: "Blocked: compatible J1939 hardware and protocol connection. Demo readings cannot establish safe-to-drive status.", destination: "/health", destinationLabel: "Vehicle health" },
  { id: 8, name: "Document compliance", status: "Partial", detail: "Existing account document storage and role-verification review are available.", limitation: "Automatic document reading and verified 30/14/3-day reminders are planned; compliance previews contain Demo data.", destination: "/documents", destinationLabel: "Documents" },
  { id: 9, name: "Driver alert network", status: "Planned", detail: "Voice-reported hazards shared with drivers along the same route.", limitation: "Not implemented. Current sample hazards are not community reports." },
  { id: 10, name: "Service fee ledger", status: "Planned", detail: "One view of actual HERCULES service fees charged.", limitation: "Not implemented. Existing estimates and credit usage are not an actual service-fee ledger." },
];