import { store } from "./storage";
import type { MonitorRun } from "./types";

export async function latestRun(): Promise<MonitorRun | null> {
  try {
    return (await store().list<MonitorRun>("runs", { limit: 1 }))[0] || null;
  } catch (e) {
    console.error("[data] latestRun 실패", (e as Error).message);
    return null;
  }
}
