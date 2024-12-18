require("dotenv").config()
import { createClient } from "@supabase/supabase-js"
import {
	Bot,
	Context,
	InlineKeyboard,
	session,
	SessionFlavor,
	webhookCallback,
} from "grammy"

const supabase = createClient(
	"https://fkwivycaacgpuwfvozlp.supabase.co",
	process.env.SP_API_SECRET,
)

const token = process.env.TOKEN
if (!token) throw new Error("TOKEN is unset")

interface SessionData {
	groupData: {
		name?: string
		format?: string
		community?: string
		description?: string
		link?: string
	}
	step?: string
}

type MyContext = Context & SessionFlavor<SessionData>

const bot = new Bot<MyContext>(token)
const CHANNEL_ID = "-1002387924511"

// Middleware для сессий
bot.use(session({ initial: (): SessionData => ({ groupData: {} }) }))

bot.command("start", async ctx => {
	// Сбрасываем состояние шага, чтобы начать процесс заново
	ctx.session.step = undefined

	// Полный сброс сессии
	// ctx.session = { groupData: {}, step: undefined }

	// Приветственное сообщение и главное меню
	await ctx.reply("Добро пожаловать! Выберите действие:", {
		reply_markup: new InlineKeyboard()
			.text("🔥 Добавить группу 🔥", "add_group")
			.row()
			.url("👥 Канал, где будет ваша группа", "https://t.me/trust_unity")
			.row()
			.url("🌐 Сайт, где будет ваша группа", "https://example.com"),
		// .text("Посмотреть группы", "view_groups"),
	})
})

// Команда /add_group с промежуточным сохранением данных
bot.command("add_group", async ctx => {
	if (!ctx.session.groupData) {
		ctx.session.groupData = {}
	}
	// ctx.session.groupData = {}
	await ctx.reply("🍀 Введите название группы:")
	ctx.session.step = "name"
})

bot.command("show_groups", async ctx => {
	// Проверка на ID администратора
	if (ctx.from.id !== 5522146122) {
		await ctx.reply("У вас нет прав для использования этой команды.")
		return
	}

	// Получаем все группы из базы данных
	const { data, error } = await supabase.from("groups").select("*")

	if (error || !data || data.length === 0) {
		await ctx.reply("В базе данных нет групп.")
		return
	}

	// Отправляем информацию о группах в канал
	for (const group of data) {
		await bot.api.sendMessage(
			CHANNEL_ID,
			`🍀 **Название:** ${group.name}\n♨ **Формат:** ${group.format}\n👥 **Сообщество:** ${group.community}\n✨ **Описание:** ${group.description}\n🌐 **Ссылка:** ${group.link}`,
			{ parse_mode: "Markdown" },
		)
	}

	await ctx.reply("Все группы были отправлены в канал..")
})

// Обработка сообщений пользователя для заполнения данных группы
bot.on("message:text", async ctx => {
	if (ctx.message.text.startsWith("/")) return

	const step = ctx.session.step

	if (step === "name") {
		ctx.session.groupData.name = ctx.message.text.trim()
		ctx.session.step = "format"
		await ctx.reply("♨ Введите формат группы:")
	} else if (step === "format") {
		ctx.session.groupData.format = ctx.message.text.trim()
		ctx.session.step = "community"
		await ctx.reply("👥 Введите сообщество группы:")
	} else if (step === "community") {
		ctx.session.groupData.community = ctx.message.text.trim()
		ctx.session.step = "description"
		await ctx.reply("✨ Введите описание группы:\n(Без Premium Эмоджи!)")
	} else if (step === "description") {
		ctx.session.groupData.description = ctx.message.text.trim()
		ctx.session.step = "link"
		await ctx.reply(
			"Ссылка на группу:\n👉 Если Telegram, то пишите @Название\n👉 Если другие ссылки, то начинайте с https://",
			{ parse_mode: "Markdown" },
		)
	} else if (step === "link") {
		ctx.session.groupData.link = ctx.message.text.trim()

		const groupData = ctx.session.groupData

		try {
			// Сохранение данных в Supabase
			const { data, error } = await supabase.from("groups").insert([
				{
					name: groupData.name,
					format: groupData.format,
					community: groupData.community,
					description: groupData.description,
					link: groupData.link,
					created_at: new Date().toISOString(),
				},
			])

			if (error) {
				console.error("Ошибка добавления группы в БД:", error)
				await ctx.reply("Произошла ошибка при добавлении группы.")
				return
			}

			// Успешное добавление
			await ctx.reply("**Группа успешно добавлена** 🎉", {
				parse_mode: "Markdown",
				reply_markup: new InlineKeyboard().url(
					"👀 Посмотреть",
					"https://t.me/trust_unity",
				),
			})

			// Публикуем информацию о группе в канал
			await bot.api.sendMessage(
				CHANNEL_ID,
				`🍀 **Название:** ${groupData.name}\n♨ **Формат:** ${groupData.format}\n👥 **Сообщество:** ${groupData.community}\n✨ **Описание:** ${groupData.description}\n🌐 **Ссылка:** ${groupData.link}`,
				{ parse_mode: "Markdown" },
			)

			// Очистка данных сессии
			ctx.session.groupData = {}
			ctx.session.step = undefined
		} catch (err) {
			console.error("Ошибка при добавлении группы:", err)
			await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
		}
	}
})


// Главное меню
async function showMainMenu(ctx: MyContext) {
	const keyboard = new InlineKeyboard()
		.text("Добавить группу", "add_group")
		.row()
		.text("Посмотреть группы", "view_groups")

	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard,
	})
}

// Обработчик нажатия на кнопки
// bot.on("callback_query", async ctx => {
// 	const data = ctx.callbackQuery.data

// 	if (data === "add_group") {
// 		await ctx.answerCallbackQuery()
// 		await ctx.reply("Чтобы добавить группу, используйте команду /add_group")

// 		const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
// 		await ctx.reply("Вернуться в главное меню:", {
// 			reply_markup: keyboard,
// 		})
// 	} else if (data === "view_groups") {
// 		const userId = ctx.from.id

// 		// Получаем группы пользователя из Supabase
// 		const { data, error } = await supabase
// 			.from("groups")
// 			.select("*")
// 			.eq("user_id", userId)

// 		if (error || !data || data.length === 0) {
// 			await ctx.answerCallbackQuery()
// 			await ctx.reply("У вас нет добавленных групп.")

// 			const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
// 			await ctx.reply("Вернуться в главное меню:", {
// 				reply_markup: keyboard,
// 			})
// 			return
// 		}

// 		const keyboard = new InlineKeyboard()
// 		data.forEach(group => {
// 			const shortDesc =
// 				group.name.length > 30 ? `${group.name.slice(0, 30)}...` : group.name
// 			keyboard.text(`#${group.id}: ${shortDesc}`, `view_group_${group.id}`).row()
// 		})
// 		keyboard.text("⬅️ Назад", "main_menu")

// 		await ctx.answerCallbackQuery()
// 		await ctx.reply("Ваши группы:", {
// 			reply_markup: keyboard,
// 		})
// 	} else if (data === "main_menu") {
// 		await ctx.answerCallbackQuery()
// 		await showMainMenu(ctx)
// 	} else if (data.startsWith("view_group_")) {
// 		const groupId = data.replace("view_group_", "")

// 		const { data, error } = await supabase
// 			.from("groups")
// 			.select("*")
// 			.eq("id", groupId)
// 			.single()

// 		if (error || !data) {
// 			await ctx.answerCallbackQuery("Группа не найдена.")
// 			return
// 		}

// 		await ctx.answerCallbackQuery()
// 		await ctx.reply(
// 			`#${data.id}:\nНазвание: ${data.name}\nФормат: ${data.format}\nСообщество: ${data.community}\nОписание: ${data.description}\nСсылка: ${data.link}`,
// 		)
// 	} else {
// 		await ctx.answerCallbackQuery({ text: "Неизвестная команда." })
// 	}
// })

export default webhookCallback(bot, "http")
