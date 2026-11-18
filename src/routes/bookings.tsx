import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "@/presentation/pages/BookingsPage";

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
