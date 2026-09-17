import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import type { ConfigAtelie } from "./availability";

export async function getSettings() {
  const [existente] = await db.select().from(settings).where(eq(settings.id, "default"));
  if (existente) return existente;
  const [novo] = await db.insert(settings).values({ id: "default" }).returning();
  return novo;
}

export async function getConfigAtelie(): Promise<ConfigAtelie> {
  const s = await getSettings();
  return {
    openDays: s.openDays,
    openHour: s.openHour,
    closeHour: s.closeHour,
    slotMinutes: s.slotMinutes,
    slotCapacity: s.slotCapacity,
    minNoticeHours: s.minNoticeHours,
    bookingHorizonDays: s.bookingHorizonDays,
    closedDates: s.closedDates,
  };
}
