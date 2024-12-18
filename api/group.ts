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

// Обработка шагов для добавления группы
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
		await ctx.reply("✨ Введите описание группы:")
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

			await bot.api.sendMessage(
				CHANNEL_ID,
				`🍀 **Название:** ${groupData.name}\n♨ **Формат:** ${groupData.format}\n👥 **Сообщество:** ${groupData.community}\n✨ **Описание:** ${groupData.description}\n🌐 **Ссылка:** ${groupData.link}`,
				{ parse_mode: "Markdown" },
			)

			// Успешное добавление
			await ctx.reply("**Группа успешно добавлена** 🎉\nВернуться в меню /start", {
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
