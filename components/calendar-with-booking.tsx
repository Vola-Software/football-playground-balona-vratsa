"use client";

import { useState } from "react";
import CalendarView from "./calendar-view";
import BookingModal from "./booking-modal";

interface SlotTarget {
  fieldId: string;
  fieldName: string;
  hour: number;
  date: string;
}

export default function CalendarWithBooking() {
  const [target, setTarget] = useState<SlotTarget | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleBookSlot(
    fieldId: string,
    fieldName: string,
    hour: number,
    date: string
  ) {
    setTarget({ fieldId, fieldName, hour, date });
  }

  function handleSuccess() {
    setTarget(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <CalendarView
        onBookSlot={handleBookSlot}
        refreshKey={refreshKey}
      />
      {target && (
        <BookingModal
          fieldId={target.fieldId}
          fieldName={target.fieldName}
          hour={target.hour}
          date={target.date}
          onClose={() => setTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
