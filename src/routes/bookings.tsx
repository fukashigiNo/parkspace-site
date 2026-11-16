import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard } from "@/components/my-bookings/BookingCard";
import { useBookings, useNow } from "@/hooks/use-bookings";
import { ME } from "@/data/bookingRepository";
import { bookingView } from "@/domain/booking";
import type { BookingView } from "@/domain/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "Мои бронирования — ParkSpace" },
      { name: "description", content: "Предстоящие, активные и завершённые бронирования парковочных мест в ParkSpace." },
      { property: "og:title", content: "Мои бронирования — ParkSpace" },
      { property: "og:description", content: "Управляйте бронированиями: отмена и завершение парковки." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingsPage,
});

const TABS: { v: BookingView; label: string; empty: string }[] = [
  { v: "upcoming", label: "Предстоящие", empty: "Нет предстоящих бронирований" },
  { v: "active", label: "Активные", empty: "Сейчас нет активных бронирований" },
  { v: "completed", label: "Завершённые", empty: "Завершённых бронирований пока нет" },
  { v: "cancelled", label: "Отменённые", empty: "Отменённых бронирований нет" },
];

function BookingsPage() {
  const now = useNow(30_000);
  const all = useBookings();
  const [tab, setTab] = useState<BookingView>("upcoming");

  if (now === null) return <div className="p-8 text-muted-foreground" role="status">Загрузка…</div>;
  const mine = all.filter((b) => b.ownerId === ME).sort((a, b) => b.startAt - a.startAt);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Мои бронирования</h1>
        <Button asChild variant="outline" size="sm" className="rounded-lg"><Link to="/">Забронировать место</Link></Button>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as BookingView)}>
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-xl">
          {TABS.map((t) => {
            const n = mine.filter((b) => bookingView(b, now) === t.v).length;
            return <TabsTrigger key={t.v} value={t.v} className="rounded-lg">{t.label} ({n})</TabsTrigger>;
          })}
        </TabsList>
        {TABS.map((t) => {
          const list = mine.filter((b) => bookingView(b, now) === t.v);
          return (
            <TabsContent key={t.v} value={t.v} className="mt-4 space-y-3">
              {list.length === 0 ? (
                <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">{t.empty}</p>
              ) : (
                list.map((b) => <BookingCard key={b.id} booking={b} now={now} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
