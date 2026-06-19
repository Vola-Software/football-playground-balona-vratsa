import { format, addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "./prisma";

const TZ = "Europe/Sofia";

export type SlotStatus = "FREE" | "PENDING" | "CONFIRMED" | "RECURRING";

export interface SlotInfo {
  hour: number;
  status: SlotStatus;
  bookingId: string | null;
  /** True when outside the default display window from AppSettings */
  isOutsideDefaultWindow: boolean;
}

export interface FieldAvailability {
  id: string;
  name: string;
  slots: SlotInfo[];
}

export interface AvailabilityData {
  date: string;
  isWeekend: boolean;
  displayStartHour: number;
  displayEndHour: number;
  bookingHorizonDays: number;
  horizonDate: string;
  isPast: boolean;
  isBeyondHorizon: boolean;
  fields: FieldAvailability[];
}

export async function getSlotGrid(dateStr: string): Promise<AvailabilityData> {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
  });

  const horizonDays = settings?.bookingHorizonDays ?? 14;

  // Determine day-of-week in Sofia timezone to pick display window
  const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, TZ);
  const zonedDay = toZonedTime(dayStartUtc, TZ);
  const dayOfWeek = zonedDay.getDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const displayStartHour = isWeekend
    ? (settings?.weekendDisplayStartHour ?? 9)
    : (settings?.weekdayDisplayStartHour ?? 17);
  const displayEndHour = isWeekend
    ? (settings?.weekendDisplayEndHour ?? 23)
    : (settings?.weekdayDisplayEndHour ?? 22);

  // Today and horizon in Sofia timezone
  const todaySofia = toZonedTime(new Date(), TZ);
  const todayStr = format(todaySofia, "yyyy-MM-dd");
  const horizonStr = format(addDays(todaySofia, horizonDays), "yyyy-MM-dd");

  const isPast = dateStr < todayStr;
  const isBeyondHorizon = dateStr > horizonStr;

  // Active fields
  const fields = await prisma.field.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  // UTC window for the entire selected day in Sofia time
  const dayEndUtc = fromZonedTime(`${dateStr}T23:59:59`, TZ);

  // Fetch active bookings for the day
  const bookings = await prisma.booking.findMany({
    where: {
      fieldId: { in: fields.map((f) => f.id) },
      startTime: { gte: dayStartUtc, lte: dayEndUtc },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { id: true, fieldId: true, startTime: true, status: true, recurringBookingId: true },
  });

  // Build fieldId → hour → booking lookup
  const bookingMap = new Map<
    string,
    Map<number, { id: string; status: SlotStatus }>
  >();
  for (const b of bookings) {
    const hour = toZonedTime(b.startTime, TZ).getHours();
    if (!bookingMap.has(b.fieldId)) bookingMap.set(b.fieldId, new Map());
    bookingMap.get(b.fieldId)!.set(hour, {
      id: b.id,
      status: b.recurringBookingId
        ? ("RECURRING" as SlotStatus)
        : (b.status as SlotStatus),
    });
  }

  // Build slot grid per field
  const fieldAvailability: FieldAvailability[] = fields.map((field) => {
    const fb = bookingMap.get(field.id) ?? new Map();
    const slots: SlotInfo[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const booking = fb.get(hour);
      // displayEndHour is inclusive — the last bookable slot starts at displayEndHour
      const isOutsideDefaultWindow =
        hour < displayStartHour || hour > displayEndHour;

      slots.push({
        hour,
        status: booking ? booking.status : "FREE",
        bookingId: booking?.id ?? null,
        isOutsideDefaultWindow,
      });
    }

    return { id: field.id, name: field.name, slots };
  });

  return {
    date: dateStr,
    isWeekend,
    displayStartHour,
    displayEndHour,
    bookingHorizonDays: horizonDays,
    horizonDate: horizonStr,
    isPast,
    isBeyondHorizon,
    fields: fieldAvailability,
  };
}
