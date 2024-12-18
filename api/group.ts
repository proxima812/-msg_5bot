require("dotenv").config()
import { hydrateReply, parseMode, type ParseModeFlavor } from "@grammyjs/parse-mode"
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

// type MyContext = Context & SessionFlavor<SessionData>
type MyContext = Context & SessionFlavor<SessionData> & ParseModeFlavor

const bot = new Bot<MyContext>(token)
const CHANNEL_ID = "-1002387924511"

// Middleware для сессий
// bot.use(session({ initial: (): SessionData => ({ groupData: {} }) }))

// Устанавливаем плагины
bot.use(session({ initial: (): SessionData => ({ groupData: {} }) })) // для сессий
bot.use(hydrateReply) // для гидратирования ответов
bot.api.config.use(parseMode("Markdown")) // для установки режима парсинга по умолчанию

// Команда /start для приветствия и начала процесса добавления группы
bot.command("start", async ctx => {
	// Сбрасываем состояние шага
	ctx.session.step = undefined

	// Приветственное сообщение с кнопками
	await ctx.reply("Добро пожаловать! Выберите действие:", {
		reply_markup: new InlineKeyboard()
			.text("🔥 Добавить группу 🔥", "add_group")
			.row()
			.url("👥 Канал, где будет ваша группа", "https://t.me/trust_unity")
			.row()
			.url("🌐 Сайт, где будет ваша группа", "https://example.com"),
	})
})

// Обработка команды /add_group
bot.on("callback_query", async ctx => {
	const data = ctx.callbackQuery.data

	if (data === "add_group") {
		await ctx.answerCallbackQuery()
		await ctx.reply("🍀 Введите название группы:")
		ctx.session.step = "name" // Переход к следующему шагу
	}
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
		)
	}

	await ctx.reply("Все группы были отправлены в канал..")
})

// Обработка шагов для добавления группы
// bot.on("message:text", async ctx => {
// 	if (ctx.message.text.startsWith("/")) return

// 	const step = ctx.session.step

// 	if (step === "name") {
// 		ctx.session.groupData.name = ctx.message.text.trim()
// 		ctx.session.step = "format"
// 		await ctx.reply("♨ Введите формат группы:")
// 	} else if (step === "format") {
// 		ctx.session.groupData.format = ctx.message.text.trim()
// 		ctx.session.step = "community"
// 		await ctx.reply("👥 Введите сообщество группы:")
// 	} else if (step === "community") {
// 		ctx.session.groupData.community = ctx.message.text.trim()
// 		ctx.session.step = "description"
// 		await ctx.reply("✨ Введите описание группы:")
// 	} else if (step === "description") {
// 		ctx.session.groupData.description = ctx.message.text.trim()
// 		ctx.session.step = "link"
// 		await ctx.reply(
// 			"Ссылка на группу:\n👉 Если Telegram, то пишите @Название\n👉 Если другие ссылки, то начинайте с https://",
// 		)
// 	} else if (step === "link") {
// 		ctx.session.groupData.link = ctx.message.text.trim()

// 		const groupData = ctx.session.groupData

// 		try {
// 			// Сохранение данных в Supabase
// 			const { data, error } = await supabase.from("groups").insert([
// 				{
// 					name: groupData.name,
// 					format: groupData.format,
// 					community: groupData.community,
// 					description: groupData.description,
// 					link: groupData.link,
// 					created_at: new Date().toISOString(),
// 				},
// 			])

// 			if (error) {
// 				console.error("Ошибка добавления группы в БД:", error)
// 				await ctx.reply("Произошла ошибка при добавлении группы.")
// 				return
// 			}

// 			await bot.api.sendMessage(
// 				CHANNEL_ID,
// 				`🍀 *Название:* ${groupData.name}\n♨ *Формат:* ${groupData.format}\n👥 *Сообщество:* ${groupData.community}\n✨ *Описание:* ${groupData.description}\n🌐 *Ссылка:* ${groupData.link}`,
// 			)

// 			// Успешное добавление
// 			await ctx.reply("*Группа успешно добавлена* 🎉\nВернуться в меню /start", {
// 				parse_mode: "Markdown",
// 				reply_markup: new InlineKeyboard().url(
// 					"👀 Посмотреть",
// 					"https://t.me/trust_unity",
// 				),
// 			})

// 			// Очистка данных сессии
// 			ctx.session.groupData = {}
// 			ctx.session.step = undefined
// 		} catch (err) {
// 			console.error("Ошибка при добавлении группы:", err)
// 			await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
// 		}
// 	}
// })

bot.on("message:text", async ctx => {
	if (ctx.message.text.startsWith("/")) return

	const step = ctx.session.step

	if (step === "name") {
		ctx.session.groupData.name = ctx.message.text.trim()
		ctx.session.step = "format"
		await ctx.reply("♨ Введите формат группы:\n\n❌‼ _(Если нет информации, пишите -)_")
	} else if (step === "format") {
		const format = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (format !== "-") {
			ctx.session.groupData.format = format
		}
		ctx.session.step = "community"
		await ctx.reply("👥 Введите сообщество группы:")
	} else if (step === "community") {
		const community = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (community !== "-") {
			ctx.session.groupData.community = community
		}
		ctx.session.step = "description"
		await ctx.reply(
			"✨ Введите описание группы:\n\n❌‼ _(Если нет информации, пишите -)_",
		)
	} else if (step === "description") {
		const description = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (description !== "-") {
			ctx.session.groupData.description = description
		}
		ctx.session.step = "link"
		await ctx.reply(
			"Ссылка на группу:\n👉 Если *Telegram*, то пишите *@Название*\n👉 Если другие ссылки, то начинайте с *https://*\n\n❌‼ _(Если нет информации, пишите -)_",
		)
	} else if (step === "contact") {
		const contact = ctx.message.text.trim()
		ctx.session.groupData.contact = contact
		ctx.session.step = "link"
		await ctx.reply("🛜 *Контакты:* (ПГ/ПГО/ Куратор группы.)")
	} else if (step === "link") {
		const link = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (link !== "-") {
			ctx.session.groupData.link = link
		}

		const groupData = ctx.session.groupData

		try {
			// Сохранение данных в Supabase
			const { data, error } = await supabase.from("groups").insert([
				{
					name: groupData.name,
					format: groupData.format,
					community: groupData.community,
					description: groupData.description,
					contact: groupData.contact,
					link: groupData.link,
					created_at: new Date().toISOString(),
				},
			])

			if (error) {
				console.error("Ошибка добавления группы в БД:", error)
				await ctx.reply("Произошла ошибка при добавлении группы.")
				return
			}

			// Формируем сообщение для отправки в канал с проверкой на "-".
			let message = `🍀 *Название:* ${groupData.name}\n`

			if (groupData.format && groupData.format !== "-") {
				message += `♨ *Формат:* ${groupData.format}\n`
			}
			if (groupData.community) {
				message += `👥 *Сообщество:* ${groupData.community}\n`
			}
			if (groupData.description && groupData.description !== "-") {
				message += `✨ *Описание:* ${groupData.description}\n`
			}
			if (groupData.contact) {
				message += `🛜 *Контакт:* ${groupData.contact}`
			}
			if (groupData.link && groupData.link !== "-") {
				message += `🌐 *Ссылка:* ${groupData.link}`
			}

			// Отправляем сообщение в канал
			await bot.api.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" })

			// Успешное добавление
			await ctx.reply("*Группа успешно добавлена* 🎉\nВернуться в меню /start", {
				parse_mode: "Markdown",
				reply_markup: new InlineKeyboard().url(
					"👀 Посмотреть",
					"https://t.me/trust_unity",
				),
			})

			// Очистка данных сессии
			ctx.session.groupData = {}
			ctx.session.step = undefined
		} catch (err) {
			console.error("Ошибка при добавлении группы:", err)
			await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
		}
	}
})

export default webhookCallback(bot, "http")
