import { useEffect } from "react";
import { setVoiceSnapshot } from "@/lib/voice";
import { useAlertRows, useAvailableLoads, useCurrentLoad, useHours } from "@/lib/live";

/**
 * Keeps the voice brain pointed at the driver's real rows. Mounted once, so
 * HERCULES answers from live data or plainly says it has none.
 */
export function LiveVoiceBridge() {
  const { hours } = useHours();
  const { load } = useCurrentLoad();
  const board = useAvailableLoads();
  const alerts = useAlertRows();

  useEffect(() => {
    setVoiceSnapshot({
      hours,
      currentLoad: load,
      loads: board.data ?? [],
      alerts: alerts.data ?? [],
    });
  }, [hours, load, board.data, alerts.data]);

  return null;
}
