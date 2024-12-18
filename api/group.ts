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
		contact?: string
	}
	step?: string
}

type MyContext = Context & SessionFlavor<SessionData>

const bot = new Bot<MyContext>(token)
const CHANNEL_ID = "-1002387924511"

// Middleware for session handling
bot.use(session({ initial: (): SessionData => ({ groupData: {} }) }))

bot.command("start", async ctx => {
	ctx.session.step = undefined
	await ctx.reply("Добро пожаловать! Выберите действие:", {
		reply_markup: new InlineKeyboard()
			.text("🔥 Добавить группу 🔥", "add_group")
			.row()
			.url("👥 Канал, где будет ваша группа", "https://t.me/trust_unity")
			.row()
			.url("🌐 Сайт, где будет ваша группа", "https://example.com"),
	})
})

bot.command("add_group", async ctx => {
	if (!ctx.session.groupData) {
		ctx.session.groupData = {}
	}
	await ctx.reply("🍀 Введите название группы:")
	ctx.session.step = "name"
})

bot.on("message:text", async ctx => {
	if (ctx.message.text.startsWith("/")) return

	const step = ctx.session.step
	const keyboard = new InlineKeyboard().text("Пропустить", "skip")

	if (step === "name") {
		ctx.session.groupData.name = ctx.message.text.trim()
		ctx.session.step = "format"
		await ctx.reply("♨ Введите формат группы:", { reply_markup: keyboard })
	} else if (step === "format") {
		ctx.session.groupData.format = ctx.message.text.trim() || "Не указано"
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
			"🌐 Ссылка на группу:\n👉 Если Telegram, то пишите @Название\n👉 Если другие ссылки, то начинайте с https://",
			{ reply_markup: keyboard, parse_mode: "Markdown" },
		)
	} else if (step === "link") {
		ctx.session.groupData.link = ctx.message.text.trim() || "Не указано"
		ctx.session.step = "contact"
		await ctx.reply(
			"📞 Укажите контактное лицо: ПГ/ПГО/Куратор группы (или напишите 'Не указано'):",
			{ reply_markup: keyboard },
		)
	} else if (step === "contact") {
		ctx.session.groupData.contact = ctx.message.text.trim() || "Не указано"

		const groupData = ctx.session.groupData

		try {
			const { data, error } = await supabase.from("groups").insert([
				{
					name: groupData.name,
					format: groupData.format,
					community: groupData.community,
					description: groupData.description,
					link: groupData.link,
					contact: groupData.contact,
					created_at: new Date().toISOString(),
				},
			])

			if (error) {
				console.error("Ошибка добавления группы в БД:", error)
				await ctx.reply("Произошла ошибка при добавлении группы.")
				return
			}

			await ctx.reply("**Группа успешно добавлена** 🎉", {
				parse_mode: "Markdown",
				reply_markup: new InlineKeyboard().url(
					"👀 Посмотреть",
					"https://t.me/trust_unity",
				),
			})

			await bot.api.sendMessage(
				CHANNEL_ID,
				`🍀 **Название:** ${groupData.name}\n♨ **Формат:** ${groupData.format}\n👥 **Сообщество:** ${groupData.community}\n✨ **Описание:** ${groupData.description}\n🌐 **Ссылка:** ${groupData.link}\n📞 **Контакт:** ${groupData.contact}`,
				{ parse_mode: "Markdown" },
			)

			ctx.session.groupData = {}
			ctx.session.step = undefined
		} catch (err) {
			console.error("Ошибка при добавлении группы:", err)
			await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
		}
	}
})

bot.on("callback_query:data", async ctx => {
	const data = ctx.callbackQuery.data
	if (data === "skip") {
		const step = ctx.session.step

		if (step === "format") {
			ctx.session.groupData.format = "Не указано"
			ctx.session.step = "community"
			await ctx.reply("👥 Введите сообщество группы:")
		} else if (step === "link") {
			ctx.session.groupData.link = "Не указано"
			ctx.session.step = "contact"
			await ctx.reply(
				"📞 Укажите контактное лицо: ПГ/ПГО/Куратор группы (или напишите 'Не указано'):",
			)
		} else if (step === "contact") {
			ctx.session.groupData.contact = "Не указано"
			ctx.session.step = undefined
			await ctx.reply("Процесс заполнения завершён.")
		}
		await ctx.answerCallbackQuery()
	}
})

export default webhookCallback(bot, "http")
