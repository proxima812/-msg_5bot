## Телеграм-бот для управления группами

Этот Telegram-бот позволяет пользователям добавлять, просматривать и управлять группами. В качестве backend используется Supabase для хранения данных групп, а для взаимодействия с Telegram используется библиотека `grammy`.

### Функции:
- Добавление группы с указанием названия, формата, сообщества, описания и ссылки.
- Просмотр списка групп, добавленных пользователем.
- Все данные о группах сохраняются в базе данных Supabase.
- Информация о добавленных группах публикуется в Telegram-канал.

### Установка

1. **Клонируйте репозиторий:**
   ```bash
   git clone <url-репозитория>
   cd <каталог-репозитория>
   ```

2. **Установите зависимости:**
   ```bash
   npm install
   ```

3. **Переменные окружения:**
   Создайте файл `.env` и добавьте следующие переменные:
   ```plaintext
   TOKEN=<Ваш_токен_бота>
   SP_API_SECRET=<Ваш_API_секрет_Supabase>
   ```

4. **Запуск бота:**
   ```bash
   npm start
   ```

### Команды

- **/start** — Показать главное меню.
- **/add_group** — Начать процесс добавления новой группы.

### Структура бота

- При запуске бота пользователю показывается главное меню с возможностью добавить группу или просмотреть существующие.
- Для добавления группы, бот пошагово запрашивает название, формат, сообщество, описание и ссылку на группу.
- Все данные о группе сохраняются в базе данных Supabase.
- После успешного добавления группы, информация публикуется в канал, а данные сессии очищаются.