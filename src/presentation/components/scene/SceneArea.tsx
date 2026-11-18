import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Box, Moon, RotateCcw, Sun, Video } from "lucide-react";
import { Button } from "@/presentation/ui/button";
import { cn } from "@/presentation/lib/utils";
import type { SceneProps } from "./ParkingScene";
import { SPOT_TYPE_LABEL, STATUS_LABEL } from "@/presentation/i18n/labels";

const ParkingScene = lazy(() => import("./ParkingScene"));

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Ночь в Шымкенте: с 19:00 до 6:00 по Asia/Almaty */
function isNightInLot(): boolean {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Almaty" }).format(new Date()));
  return h >= 19 || h < 6;
}

type Props = Omit<SceneProps, "view" | "onReady" | "night" | "follow"> & { onFail: () => void; animating: boolean };

export function SceneArea({ onFail, animating, ...props }: Props) {
  const [view, setView] = useState<SceneProps["view"]>({ mode: "reset", n: 0 });
  const [ready, setReady] = useState(false);
  const [night, setNight] = useState(false);
  const [follow, setFollow] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverSpot = hoverId ? props.spots.find((s) => s.id === hoverId) : undefined;
  const hoverDisplay = hoverSpot ? props.display[hoverSpot.id] : undefined;
  useEffect(() => {
    if (!hasWebGL()) onFail();
    setNight(isNightInLot());
  }, [onFail]);

  return (
    <div className="relative h-[52vh] min-h-[340px] w-full overflow-hidden rounded-2xl border bg-muted lg:h-[600px]" data-scene-ready={ready ? "" : undefined}>
      <SceneBoundary onError={onFail}>
        <Suspense fallback={<SceneLoading />}>
          <ParkingScene {...props} view={view} night={night} follow={follow} onReady={() => setReady(true)} onHoverSpot={setHoverId} />
        </Suspense>
      </SceneBoundary>
      <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="secondary" className="rounded-lg shadow-soft" onClick={() => setView((v) => ({ mode: "reset", n: v.n + 1 }))}>
          <RotateCcw aria-hidden /> <span className="hidden sm:inline">Сбросить вид</span>
        </Button>
        <Button size="sm" variant="secondary" className="rounded-lg shadow-soft" onClick={() => setView((v) => ({ mode: "top", n: v.n + 1 }))}>
          <Box aria-hidden /> <span className="hidden sm:inline">Вид сверху</span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-lg shadow-soft"
          aria-pressed={night}
          aria-label={night ? "Дневной режим" : "Ночной режим"}
          onClick={() => setNight((n) => !n)}
        >
          {night ? <Sun aria-hidden /> : <Moon aria-hidden />}
        </Button>
      </div>
      {hoverSpot && hoverDisplay && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl border bg-card/95 px-3 py-2 text-xs shadow-soft backdrop-blur" aria-hidden>
          <div className="text-base font-bold">{hoverSpot.code}</div>
          <div className="text-muted-foreground">{SPOT_TYPE_LABEL[hoverSpot.type]}</div>
          <div className="font-medium">{STATUS_LABEL[hoverDisplay.status]}</div>
        </div>
      )}
      {animating && (
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card/95 px-3 py-2 text-sm shadow-soft backdrop-blur" role="status">
          <span className="flex items-center gap-2 font-medium">
            <span className="size-2 animate-pulse rounded-full bg-amber-500" aria-hidden /> Автомобиль едет к вашему месту…
          </span>
          <button
            type="button"
            onClick={() => setFollow((f) => !f)}
            aria-pressed={follow}
            className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs", follow ? "bg-primary text-primary-foreground" : "bg-muted")}
          >
            <Video className="size-3.5" aria-hidden /> Следить камерой
          </button>
        </div>
      )}
    </div>
  );
}

function SceneLoading() {
  return (
    <div className="flex h-full items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        Загружаем 3D-схему парковки…
      </div>
    </div>
  );
}
