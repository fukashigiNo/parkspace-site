/** Коды ошибок предметной области. Тексты для пользователя — в presentation. */
export type PeriodError = "invalid" | "past" | "endBeforeStart" | "tooShort";
export type PlateError = "plateEmpty" | "plateTooLong" | "plateChars";

export type BookingError =
  | PeriodError
  | PlateError
  | "spotNotFound"
  | "spotClosed"
  | "conflict"
  | "bookingNotFound"
  | "notOwner"
  | "cancelOnlyUpcoming"
  | "completeOnlyActive";
