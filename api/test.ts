import { Bot } from "grammy"
import { createClient } from "@supabase/supabase-js"
import { session } from "@grammyjs/session" // Подключаем плагин для сессий

const supabase = createClient(
	"https://fkwivycaacgpuwfvozlp.supabase.co",
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrd2l2eWNhYWNncHV3ZnZvemxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MDc4MTEsImV4cCI6MjA0OTQ4MzgxMX0.44dYay0RWos4tqwuj6H-ylqN4TrAIabeQLNzBn6Xuy0",
)

const bot = new Bot("7695527442:AAF3oZNuZjMMBpKe4TvrIz_YNtBcVivH9os")

// Подключаем middleware для сессий
bot.use(session())

// Главное меню
async function showMainMenu(ctx) {
	const keyboard = new InlineKeyboard()
		.text("Добавить инфо о группе", "add_group")
		.row()
		.text("Посмотреть группы", "view_groups")

	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard,
	})
}

// Обработчик команды /start
bot.command("start", async ctx => {
	await showMainMenu(ctx)
})

// Обработчик команды /add_group
bot.command("add_group", async ctx => {
	// Инициализация сессии, если ее еще нет
	if (!ctx.session) {
		ctx.session = {}
	}

	ctx.session.step = "name" // Устанавливаем этап
	await ctx.reply("Введите название группы:")
})

// Обработчик для текста сообщений
bot.on("message:text", async ctx => {
	if (!ctx.session) {
		ctx.session = {} // Инициализируем сессию, если она не существует
	}

	const { session } = ctx

	// Если пользователь на этапе ввода названия группы
	if (session.step === "name") {
		session.groupName = ctx.message.text // Сохраняем название
		await ctx.reply(
			`Вы указали название: ${session.groupName}. Теперь выберите формат группы.`,
		)

		const formatKeyboard = new InlineKeyboard()
			.text("По темам", "format_themes")
			.text("Медитация", "format_meditation")
			.text("Спикерская", "format_speaker")
			.text("Вопрос&Ответ", "format_q_and_a")
			.text("Для новичков", "format_for_newcomers")
			.text("От 5 лет чистоты/трезвости/ясности", "format_5_years")
			.text("Прочее", "format_other")

		await ctx.reply("Выберите формат группы:", {
			reply_markup: formatKeyboard,
		})

		session.step = "format" // Переходим к следующему этапу
	}

	// Если пользователь на этапе выбора формата
	else if (session.step === "format") {
		session.groupFormat = ctx.message.text // Сохраняем формат
		await ctx.reply(
			`Вы выбрали формат: ${session.groupFormat}. Теперь введите ссылку на группу или сайт.`,
		)

		session.step = "link" // Переходим к следующему этапу
	}

	// Если пользователь на этапе ввода ссылки
	else if (session.step === "link") {
		session.groupLink = ctx.message.text // Сохраняем ссылку
		await ctx.reply("Теперь введите краткое описание группы:")

		session.step = "description" // Переходим к следующему этапу
	}

	// Если пользователь на этапе ввода описания
	else if (session.step === "description") {
		session.groupDescription = ctx.message.text // Сохраняем описание

		// Вставляем данные в Supabase
		const { data, error } = await supabase.from("groups").insert([
			{
				name: session.groupName,
				format: session.groupFormat,
				link: session.groupLink,
				description: session.groupDescription,
			},
		])

		if (error) {
			console.error("Ошибка при добавлении группы в Supabase:", error.message)
			ctx.reply("Произошла ошибка при добавлении информации о группе.")
			return
		}

		console.log("Группа добавлена:", session.groupName)
		await ctx.reply("Информация о группе успешно добавлена!")

		// Возвращаем пользователя в главное меню
		await showMainMenu(ctx)
		session.step = undefined // Сбрасываем состояние
	}
})

bot.start()
