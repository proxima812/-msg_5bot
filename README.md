Этот репозиторий содержит исходный код для Telegram-бота, предназначенного для добавления, поиска и отображения информации о группах. Бот использует Supabase для хранения данных и Telegram API для взаимодействия с пользователями. Он предоставляет функционал для администраторов и обычных пользователей, а также интегрируется с Vercel для хостинга.

Бот написан с использованием [**grammy.js**](https://grammy.dev/) для взаимодействия с Telegram API, [**Supabase**](https://supabase.com/) в качестве базы данных для хранения информации о группах, а серверные функции развернуты на платформе [**Vercel**](https://vercel.com/) для обработки запросов и управления данными.

## Важно!

Для использования бота и доступа к его функциям необходимо настроить аутентификацию на стороне **Supabase**. Это включает в себя получение API-ключа и установку необходимых прав доступа, чтобы бот мог взаимодействовать с базой данных и обрабатывать запросы.
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Структура проекта

Проект организован следующим образом:

```
/api
  └── /group.ts      # Обработчик API для группы
.env                 # Файл с переменными окружения (например, токен бота и ключ API Supabase)
.gitignore           # Список файлов и папок, которые не должны попадать в репозиторий
curl.txt             # Пример использования cURL для взаимодействия с API
package-lock.json    # Автогенерируемый файл зависимостей
package.json         # Список зависимостей и скриптов для проекта
README.md            # Документация по проекту
tsconfig.json        # Конфигурация TypeScript
vercel.json          # Конфигурация для развертывания на Vercel
```

## Настройка и запуск

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/proxima812/-msg_5bot
```

### 2. Установите зависимости

```bash
npm install
```

### 3. Настройте переменные окружения

Создайте файл `.env` в корне проекта и добавьте следующие строки:

```bash
TOKEN=your-telegram-bot-token
SP_API_SECRET=your-supabase-api-key
```

Замените `your-telegram-bot-token` на токен вашего Telegram-бота, а `your-supabase-api-key` — на API-ключ Supabase.

### 4. Настройте Supabase

В вашем проекте Supabase создайте таблицу `groups` с такими колонками:

- **name**: строка
- **format**: строка
- **community**: строка
- **description**: строка
- **contact**: строка
- **link**: строка
- **time**: строка
- **created_at**: timestamp (по умолчанию `NOW()`)

Убедитесь, что у вашего проекта есть соответствующие права для чтения и записи данных.

### 5. Запуск бота

После настройки переменных окружения и Supabase, запустите бота:

- **Скомпилируйте код, выполнив команду**
```bash
npx tsc
```

- **Далее в папке /build/bot.js**

```bash
node bot.js
```

### 6. Использование на Vercel (опционально)

Если вы хотите развернуть бота на Vercel, используйте конфигурацию в файле `vercel.json`, о которой будет сказано ниже.

## Файлы конфигурации

### `vercel.json`

Файл `vercel.json` используется для настройки серверных функций на платформе Vercel, где будет размещен ваш бот. В данном случае в файле указана настройка для функции, которая обрабатывает API-запросы, связанные с ботом.

```json
{
  "functions": {
    "api/bot.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

- **`api/bot.ts`** — это путь к файлу, который будет обработчиком для API-запросов.
- **`memory`** — количество памяти, выделяемое для выполнения функции. В данном случае установлено на 1024 МБ.
- **`maxDuration`** — максимальное время выполнения функции в секундах (в данном случае 10 секунд). Это означает, что если выполнение функции занимает более 10 секунд, оно будет прервано.

Этот файл настраивает серверную функцию для обработки запросов, которые приходят от Telegram API и взаимодействуют с вашим ботом.

### `tsconfig.json`

Файл конфигурации TypeScript. Он содержит настройки компилятора TypeScript, чтобы правильно транслировать код из TypeScript в JavaScript и обеспечить корректную работу с модулями.

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "commonjs",
    "rootDir": "./api",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "outDir": "./build",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

- **`target`**: указывает на целевую версию JavaScript, на которую будет компилироваться TypeScript. В данном случае это **ES2019**.
- **`module`**: используется для указания системы модулей. В данном случае это **commonjs**.
- **`rootDir`**: указывает на корневую директорию исходных файлов TypeScript. В данном случае это папка `./api`.
- **`moduleResolution`**: указывает на способ разрешения модулей. В данном случае используется **node**, что означает, что модули будут разрешаться как в Node.js.
- **`resolveJsonModule`**: разрешает импорт JSON-файлов.
- **`outDir`**: указывает директорию для скомпилированных файлов. В данном случае это папка `./build`.
- **`allowSyntheticDefaultImports`** и **`esModuleInterop`**: обеспечивают корректную работу с импортами в стиле ES.
- **`strict`**: включает строгую проверку типов в TypeScript.
- **`skipLibCheck`**: пропускает проверку типов в библиотеках.

Этот файл настраивает TypeScript для правильной компиляции вашего кода и гарантирует корректную работу с модулями и типами.

## Развертывание на Vercel

Чтобы развернуть бота на Vercel, выполните следующие шаги:

1. Создайте новый проект на Vercel, подключив его к вашему репозиторию GitHub.
2. Убедитесь, что Vercel автоматически использует ваш `vercel.json` файл для настройки функций.
3. В настройках проекта на Vercel добавьте переменные окружения, соответствующие вашему токену Telegram и ключу API Supabase.
4. Разверните проект и получите URL для API, который будет использоваться для обработки запросов.

## Логика работы бота

1. **Добавление группы**: Бот проводит пользователя через серию шагов для ввода информации о группе (название, сообщество, время, формат, описание, ссылка и контакт).
2. **Поиск групп**: Пользователь может искать группы по сообществу, времени или формату.
3. **Отправка данных в канал**: Администраторы могут получить все группы из базы данных и отправить их в канал Telegram с помощью команды `/show_groups`.

## Заключение

Это основной набор инструкций для использования и развертывания GroupBot. Бот предоставляет гибкие возможности для работы с данными групп, а также использует Vercel для хостинга серверных функций.

Если у вас возникнут вопросы или проблемы, не стесняйтесь создать issue в репозитории или задать вопрос.