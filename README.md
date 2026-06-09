# Snippet Manager

#### REST API для управления шаблонами сообщений с умной системой тегов на NestJS.

### Стек

- **NestJS**
- **TypeScript**
- **PostgreSQL + Prisma ORM**
- **Redis**
- **Docker**
- **Swagger**
- **Socket.IO** (WebSockets)
- **Jest** (e2e тесты)
- **GitHub Actions** (CI/CD)

### Функциональность

- **JWT** аутентификация (access/refresh токены)
- Управление шаблонами (**CRUD**, публикация/снятие с публикации)
- Умная система тегов (динамическая иерархия, поиск по комбинации)
- Blacklist токенов через **Redis**
- Ролевая модель (пользователь/админ)
- Пагинация и сортировка
- Защита от **XSS** (санитизация контента)
- Rate limiting
- Уведомления в реальном времени через **WebSockets** (оповещение о публикации шаблона)

### Развертывание и запуск (docker-compose):

1. Переименовать файлы env (убрать .example) и указать значения переменных
2. Собрать и запустить приложение: `docker-compose up -d --build`

### Развертывание и запуск (localhost):

1. Переименовать файлы env (убрать .example) и указать значения переменных
2. Убедиться в наличии установленного Postgres. Или запустить в docker: `docker-compose up -d db`
3. Убедиться в наличии установленного Redis. Или запустить в docker: `docker-compose up -d redis`
4. Установить зависимости: `npm install`
5. Применить миграции: `npm run db:migrate:dev`
6. Сгенерировать клиент Prisma: `npm run db:generate`
7. Запустить приложение: `npm run start:dev`

### Тестирование:

1. Запустить приложение
2. Убедиться, что в env.test указана тестовая БД
3. Запустить тесты: `npm run test:e2e`

### CI/CD

Проект использует **GitHub Actions** для автоматической проверки качества кода. При каждом пуше в `main` и открытии Pull Request запускаются:

- **Линтинг** — проверка стиля кода
- **Сборка** — компиляция TypeScript
- **E2E-тесты** — прогон тестов с PostgreSQL и Redis

Статус последнего пайплайна: [![CI](https://github.com/oleg-insights/snippet-manager-api/actions/workflows/ci.yml/badge.svg)](https://github.com/oleg-insights/snippet-manager-api/actions/workflows/ci.yml)

### Доступные ресурсы:

- **Swagger**: `http://localhost:3000/api-docs`

### Архитектура

Подробное описание модели данных, жизненного цикла тегов, системы поиска и безопасности — в [ARCHITECTURE.md](ARCHITECTURE.md).
