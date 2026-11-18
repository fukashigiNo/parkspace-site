import type { BookingView } from "@/domain/booking/Booking";
import type { BookingError } from "@/domain/booking/errors";
import type { SpotType } from "@/domain/parking/ParkingLot";
import { PLATE_MAX } from "@/domain/booking/rules";

export const SPOT_TYPE_LABEL: Record<SpotType, string> = {
  standard: "Стандартное",
  ev: "Для электромобиля",
  accessible: "Для маломобильных водителей",
  family: "Семейное (с детьми)",
};

export const STATUS_LABEL = {
  available: "Доступно",
  unavailable: "Недоступно в выбранное время",
  closed: "Закрыто",
  selected: "Выбрано",
} as const;

export const VIEW_LABEL: Record<BookingView, string> = {
  upcoming: "Предстоящее",
  active: "Активное",
  completed: "Завершено",
  cancelled: "Отменено",
};

export const BOOKING_ERROR_TEXT: Record<BookingError, string> = {
  invalid: "Укажите корректные дату и время",
  past: "Начало не может быть в прошлом",
  endBeforeStart: "Окончание должно быть позже начала",
  tooShort: "Минимальная длительность — 30 минут",
  plateEmpty: "Укажите госномер автомобиля",
  plateTooLong: `Госномер не длиннее ${PLATE_MAX} символов`,
  plateChars: "Используйте буквы, цифры, пробел или дефис",
  spotNotFound: "Место не найдено",
  spotClosed: "Место закрыто администрацией",
  conflict: "Это место уже забронировали на выбранное время. Выберите другое место или период.",
  bookingNotFound: "Бронирование не найдено",
  notOwner: "Это бронирование принадлежит другому водителю",
  cancelOnlyUpcoming: "Отменить можно только предстоящее бронирование",
  completeOnlyActive: "Завершить можно только активное бронирование",
};
