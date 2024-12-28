# О проекте @msg_5bot
Каждый **важен** и **каждый** может нести весть в массы. Я любитель-разработчик, который может дать такой инструмент для **бесконечного количество** людей. 

Бот написан с использованием [**grammy.js**](https://grammy.dev/) для взаимодействия с Telegram API, [**Supabase**](https://supabase.com/) в качестве базы данных для хранения информации о группах, а серверные функции развернуты на платформе [**Vercel**](https://vercel.com/) для обработки запросов и управления данными.

## Порядок установок
- Регистрация аккаунтов (если нет): github, vercel, supabase.
- Создание БД и настройка.
- Создания webhook для бота на vercel.

### Github
- Видим кнопку Fork у этого репозитория - нажимаем. Он клонируется у вас в профиле.
### SupaBase
- После захода:
  - "new project"
  - Ищем слева в sidebar меню "SQL Editor"

**Нужно будет написать:**

```sql
-- 1. Создание таблицы groups
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    format TEXT,
    community TEXT,
    link TEXT,
    description TEXT,
    contact TEXT,
    time TEXT
);

-- 2. Включение Row Level Security (RLS) для таблицы groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- 3. Политики безопасности

-- Политика для вставки данных (insert)
CREATE POLICY "added groups"
ON groups
FOR INSERT
TO public
USING (true); -- Разрешить всем пользователям вставку данных

-- Политика для чтения данных (select) для всех пользователей
CREATE POLICY "all users select groups"
ON groups
FOR SELECT
TO public
USING (true); -- Разрешить всем пользователям чтение данных

-- Политика для более ограниченного доступа на чтение
CREATE POLICY "Allow read access"
ON groups
FOR SELECT
TO public
USING (true); -- Можно уточнить условия, если требуется

-- Политика с использованием функций с SECURITY DEFINER
-- (например, для проверки доступа через пользовательские функции)
CREATE POLICY "Policy with security definer functions"
ON groups
USING (true); -- Заменить true на вызов функции, если необходимо
```

### Vercel
- Нажимаем "Add New..." - "Project"
- Выбираем ваш "Forked" репозиторий, (который вы склонировали с ботом)
- Нужно будет найти "Environment Variables"
- В "EXAMPLE_NAME" нужно будет вставить сразу несколько строк.

 ```env
TOKEN=
SP_HOST=
SP_API_SECRET=
 ```

### Где брать эти значения:
- TOKEN: в telegram у @BotFather - создаете бота, далее он дает вам токен его.
- SP_HOST и SP_API_SECRET: найти их можно в supabase API settings (левая sidebar, Preject Settings, далее API)

> [!NOTE]
> SP_HOST - это URL такой вид у него "https://ВАЩ_ПРОЕКТ_КОДОВОЕ_ЗНАЧЕНИЕ.supabase.co"

> [!NOTE]
> SP_API_SECRET - это ANON key такой вид у него "123asdasdd.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imasd2l2eWNhYWNncHV3123nZvemxwIasdcm9sZSI6ImEXAMPLE!!!4iLasdajE3MzM5MDc4MTEsImV4cCI6asdTQ4MzgxMX0.44dYaasdRWoasdqwuj6H-1231231231dada"

> [!IMPORTANT]
> Далее, после того, как проект был развернут, переходим в "Dasboard" проекта. Видим "Domains". Копируем первый.

### Делай webhook на бота.

> [!WARNING]
> Примечания: "<ЗНАЧЕНИЕ>" это убираем! 

Команду совершаем в любом **браузере** в поиске.
```bash
https://api.telegram.org/bot<ВАШ_ТОКЕН_БОТА>/setWebhook?url=<АДРЕС_ПРОЕКТА_КОТОРЫЙ_ВЫ_РАЗВЕРНУЛИ>/api/group/
```

**Пример:**
```bash
https://api.telegram.org/bot123456789/setWebhook?url=https://example.com/api/group/
```

Если у вас возникнут **вопросы** или проблемы, не стесняйтесь создать **issue** в репозитории или задать вопрос.
