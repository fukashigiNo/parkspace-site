# ParkSpace

Бронирование парковочных мест в Шымкенте с интерактивной 3D-схемой: ТРЦ Shymkent Plaza, ТРЦ MEGA Center и Центральная парковка. После бронирования автомобиль в 3D заезжает на выбранное место.

## Стек

React 19, TanStack Start / Router, three.js (@react-three/fiber, drei), Tailwind CSS 4, Vitest.

## Запуск

```sh
npm install
npm run dev      # http://localhost:8080
```

## Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | dev-сервер |
| `npm test` | юнит-тесты |
| `npm run build` | production-сборка в `.output/` |
| `npm start` | запуск собранного сервера |

## Архитектура (Clean Architecture)

Зависимости направлены только внутрь: внешний слой знает о внутреннем, но не наоборот. Правило проверяет ESLint (`no-restricted-imports` в `eslint.config.js`).

```
presentation ─┐
              ├─► application ─► domain
infrastructure┘
        di/container.ts — единственное место, где слои соединяются
```

| Слой | Папка | Что внутри | Может импортировать |
| --- | --- | --- | --- |
| **Domain** | `src/domain/` | Сущности (`Booking`, `ParkingLot`), правила бронирования, тарифы, интервалы, часовой пояс, коды ошибок. Чистый TypeScript. | ничего |
| **Application** | `src/application/` | Порты (`BookingRepository`, `ParkingLotCatalog`, `Clock`, `IdGenerator`, `CurrentUser`), сценарии (`createBooking`, `cancelBooking`, `completeBooking`, `resetDemoData`), запросы для экранов. | domain |
| **Infrastructure** | `src/infrastructure/` | Реализации портов: localStorage, статический каталог парковок, демо-расписание, системные часы; SSR-обработка ошибок. | domain, application |
| **Presentation** | `src/presentation/`, `src/routes/` | React-страницы и компоненты, 3D-сцена, тексты и форматирование, shadcn/ui. | domain, application, `@/di` |
| **Composition root** | `src/di/container.ts` | Собирает `ParkingApp` из конкретных реализаций. | всё |

### Куда что добавлять

- **Новое правило** (например, максимальная длительность) — функция в `src/domain/booking/rules.ts` + тест рядом.
- **Новое действие пользователя** — use case в `src/application/use-cases/`, подключить в `ParkingApp.ts`.
- **Сервер вместо localStorage** — новая реализация `BookingRepository` в `src/infrastructure/persistence/` и одна строка в `src/di/container.ts`. UI и правила не меняются.
- **Новая парковка** — данные в `src/infrastructure/catalog/lots.ts`.
- **Тексты ошибок** — use cases возвращают коды (`BookingError`), русские тексты в `src/presentation/i18n/labels.ts`.

### Тесты

- `src/domain/**/*.test.ts` — правила без зависимостей.
- `src/application/**/*.test.ts` — сценарии на хранилище в памяти с подменёнными часами.
- `src/infrastructure/**/*.test.ts` — localStorage и каталог.
