import { createFileRoute } from "@tanstack/react-router";
import { catalog } from "@/di/container";
import { ParkingPage } from "@/presentation/pages/ParkingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParkSpace — бронирование парковки в Шымкенте: Shymkent Plaza, MEGA Center" },
      { name: "description", content: "Выберите парковку ТРЦ Shymkent Plaza, MEGA Center или Центральную, место на 3D-схеме и забронируйте его за минуту." },
      { property: "og:title", content: "ParkSpace — бронирование парковки" },
      { property: "og:description", content: "Интерактивная 3D-схема парковки и бронирование мест по времени." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { lot?: string } =>
    typeof search["lot"] === "string" && catalog.findLot(search["lot"]) ? { lot: search["lot"] } : {},
  component: ParkingRoute,
});

function ParkingRoute() {
  const { lot } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <ParkingPage lotId={lot} onLotChange={(id) => void navigate({ search: { lot: id }, replace: true })} />;
}
