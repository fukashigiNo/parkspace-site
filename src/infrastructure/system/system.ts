import type { Clock, CurrentUser, IdGenerator } from "@/application/ports/system";

export const systemClock: Clock = { now: () => Date.now() };

let counter = 0;
export const cryptoIds: IdGenerator = {
  next: () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}-${++counter}`,
};

/** В демо без авторизации пользователь один */
export const DEMO_USER_ID = "demo-user";
export const demoUser: CurrentUser = { id: () => DEMO_USER_ID };
