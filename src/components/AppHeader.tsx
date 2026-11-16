import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ParkingSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getRepository } from "@/data/bookingRepository";

const navCls =
  "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <ParkingSquare className="size-6 text-primary" aria-hidden /> ParkSpace
        </Link>
        <nav aria-label="Основная навигация" className="flex gap-1">
          <Link to="/" className={navCls} activeOptions={{ exact: true }} activeProps={{ className: "bg-accent text-accent-foreground" }}>Парковка</Link>
          <Link to="/bookings" className={navCls} activeProps={{ className: "bg-accent text-accent-foreground" }}>Мои бронирования</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Демо: данные хранятся в этом браузере</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">Сбросить демоданные</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Сбросить демоданные?</AlertDialogTitle>
                <AlertDialogDescription>Все ваши бронирования в этом браузере будут удалены, демонстрационное расписание создастся заново.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={() => { getRepository().reset(); toast.success("Демоданные сброшены"); }}>Сбросить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <p className="px-3 pb-1 text-[11px] text-muted-foreground sm:hidden">Демо: данные хранятся в этом браузере</p>
    </header>
  );
}
