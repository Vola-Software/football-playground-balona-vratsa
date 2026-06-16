-- Run this AFTER the initial Prisma migration.
-- Prisma does not support partial unique indexes natively,
-- so this must be applied manually (or as a raw migration).
--
-- Prevents double-booking the same field+slot when the booking is PENDING or CONFIRMED.
-- REJECTED and CANCELLED bookings are intentionally excluded so the slot can be re-booked.

CREATE UNIQUE INDEX IF NOT EXISTS booking_field_slot_active_unique
ON "Booking" ("fieldId", "startTime")
WHERE status IN ('PENDING', 'CONFIRMED');
