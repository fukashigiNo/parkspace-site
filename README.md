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

## Структура

- `src/domain/` — бизнес-правила (интервалы, тарифы, часовой пояс, валидация), без React.
- `src/data/lot.ts` — парковки и места; `src/data/bookingRepository.ts` — хранение броней (сейчас localStorage).
- `src/components/scene/` — 3D-сцена и анимация парковки.
