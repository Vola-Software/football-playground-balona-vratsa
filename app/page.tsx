import CalendarWithBooking from "@/components/calendar-with-booking";

export const metadata = {
  title: "Балона Враца — Резервации на игрища",
};

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">
          Наличност на игрищата
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Изберете дата и резервирайте вашия час
        </p>
      </div>
      <CalendarWithBooking />
    </div>
  );
}
