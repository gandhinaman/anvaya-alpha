import { useTelemetry } from "@/hooks/useTelemetry";

export function TelemetryProvider() {
  useTelemetry();
  return null;
}
