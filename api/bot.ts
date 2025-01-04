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

interface GroupData {
	name?: string
	format?: string
	community?: string
	description?: string
	link?: string
	time?: string
	contact?: string
}

interface SessionData {
	groupData: GroupData
	step?: string
}

type MyContext = Context & SessionFlavor<SessionData> & ParseModeFlavor

const bot = new Bot<MyContext>(token)
const CHANNEL_ID = "-1002387924511"

bot.use(session({ initial: (): SessionData => ({ groupData: {} }) })) // для сессий
bot.use(hydrateReply) // для гидратирования ответов
bot.api.config.use(parseMode("Markdown")) // для установки режима парсинга по умолчанию

const resetSession = (ctx: MyContext) => {
	ctx.session.groupData = {}
	ctx.session.step = undefined
}

const steps = {
	name: {
		message: "🍀 Введите название группы:",
		next: "community",
	},
	community: {
		message: "👥 Сообщество (Аббревиатура):",
		next: "time",
	},
	time: {
		message: "⏰ Введите время (в формате 00:00):",
		validate: (text: string) =>
			/^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/.test(text) ||
			"❌ Введите время в формате 00:00.",
		next: "format",
	},
	format: {
		message: "♨ Введите формат группы:\n\n❌ _(Если нет информации, пишите -)_",
		next: "description",
	},
	description: {
		message: "✨ Введите описание группы:\n\n❌ _(Если нет информации, пишите -)_",
		next: "link",
	},
	link: {
		message:
			"👉 Если Telegram, то пишите *@Название*\n👉 Если другие ссылки, то начинайте с *https://*\n\n❌ _(Если нет информации, пишите -)_",
		next: "contact",
	},
	contact: {
		message: "🛜 Введите контакт (ПГ / ПГО / Любой другой контакт для связи):",
		next: null,
	},
}

bot.command("start", async ctx => {
	resetSession(ctx)
	await ctx.reply("Добро пожаловать! Выберите действие:", {
		reply_markup: new InlineKeyboard()
			.text("🔥 Добавить группу 🔥", "add_group")
			.row()
			.url("👥 Канал, где будет ваша группа", "https://t.me/trust_unity")
			.row()
			.url("🌐 Сайт, где будет ваша группа", "https://ppros.vercel.app/")
			.row()
			.text("🔸 Вся информация о боте 🔸", "show_text"),
	})
})

bot.on("callback_query:data", async ctx => {
	const data = ctx.callbackQuery.data
	if (data === "show_text") {
		await ctx.answerCallbackQuery()
		await ctx.reply(
			"Бот постит группы на канале (-100238792451), что это говорит вам?\n\n- Это значит, что он может сразу в несколько каналов присылать информацию, так как он не привязан к одному каналу.\n\nПодробная информация об этом можете узнать у меня, и возможно, подключить бота к себе на канал.\n\nКонтакт: @legion_free\n\nИсходный код проекта https://github.com/proxima812/-msg_5bot",
			{ parse_mode: "HTML" },
		)
	}
	if (data === "add_group") {
		resetSession(ctx)
		ctx.session.step = "name"
		await ctx.reply(steps.name.message)
	}
})

function escapeMarkdown(text: string): string {
	return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")
}

bot.on("message:text", async ctx => {
	const step = ctx.session.step

	if (!step || !(step in steps)) return

	const currentStep = steps[step]

	if (currentStep.validate) {
		const validationResult = currentStep.validate(ctx.message.text.trim())
		if (validationResult !== true) {
			await ctx.reply(validationResult as string)
			return
		}
	}

	ctx.session.groupData[step] = ctx.message.text.trim()
	ctx.session.step = currentStep.next

	if (currentStep.next) {
		await ctx.reply(steps[currentStep.next].message)
	} else {
		const { name, community, time, format, description, link, contact } =
			ctx.session.groupData

		const message =
			`🍀 *Название:* ${escapeMarkdown(name)}\n` +
			(community ? `👥 *Сообщество:* ${escapeMarkdown(community)}\n` : "") +
			(time ? `⏰ *Время:* ${escapeMarkdown(time)}\n` : "") +
			(format ? `♨ *Формат:* ${escapeMarkdown(format)}\n` : "") +
			(description ? `✨ *Описание:* ${escapeMarkdown(description)}\n` : "") +
			(contact ? `🛜 *Контакт:* ${escapeMarkdown(contact)}\n` : "") +
			(link ? `🌐 *Ссылка:* ${escapeMarkdown(link)}` : "")

		try {
			await supabase
				.from("groups")
				.insert([{ name, community, time, format, description, link, contact }])

			await bot.api.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" })

			await ctx.reply("*Группа успешно добавлена 🎉*\nВернуться в меню /start", {
				reply_markup: new InlineKeyboard().url("Смотреть", "https://t.me/trust_unity"),
			})

			ctx.session.groupData = {}
			ctx.session.step = undefined
		} catch (error) {
			console.error("Ошибка при добавлении группы:", error)
			await ctx.reply("Произошла ошибка. Попробуйте позже.")
		}
	}
})

export default webhookCallback(bot, "https")
