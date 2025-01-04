import { autoRetry } from "@grammyjs/auto-retry"
import { hydrateReply, parseMode, type ParseModeFlavor } from "@grammyjs/parse-mode"
import { limit } from "@grammyjs/ratelimiter"
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
bot.use(
	hydrateReply,
	limit({
		// Разрешите обрабатывать только 3 сообщения каждые 2 секунды.
		timeFrame: 10000,
		limit: 6,
		// Эта функция вызывается при превышении лимита.
		onLimitExceeded: async ctx => {
			await ctx.reply(
				"Пожалуйста, воздержитесь от отправки слишком большого количества запросов!",
			)
		},
		keyGenerator: ctx => {
			return ctx.from?.id.toString()
		},
	}),
) // для гидратирования ответов
bot.api.config.use(
	parseMode("Markdown"),
	autoRetry({
		maxRetryAttempts: 2,
		maxDelaySeconds: 10,
		rethrowInternalServerErrors: true,
		rethrowHttpErrors: true,
	}),
) // для установки режима парсинга по умолчанию

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
		message: "♨ Введите формат группы:",
		next: "description",
	},
	description: {
		message: "✨ Введите описание группы:",
		next: "link",
	},
	link: {
		message:
			"👉 Если Telegram, то пишите *@Название*\n👉 Если другие ссылки, то начинайте с *https://*",
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
			// .text("🔎 Просмотр групп", "view_groups")
			// .text("🗑 Удалить группу", "delete_group")
			// .row()
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
	// if (data === "view_groups") {
	// 	await viewGroups(ctx)
	// }
	// if (data === "delete_group") {
	// 	ctx.session.step = "delete"
	// 	await ctx.reply("Введите ID группы, которую хотите удалить:")
	// }
})

function escapeMarkdown(text: string): string {
	return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")
}

// async function viewGroups(ctx: MyContext) {
// 	try {
// 		const { data, error } = await supabase.from("groups").select("*")
// 		if (error) throw error

// 		if (data && data.length > 0) {
// 			let message = "📝 Список групп:\n"
// 			data.forEach((group: GroupData, index) => {
// 				message += `\n*${index + 1}* - ${group.name} (ID: ${group.id})`
// 			})
// 			await ctx.reply(message, { parse_mode: "Markdown" })
// 		} else {
// 			await ctx.reply("Группы не найдены.")
// 		}
// 	} catch (error) {
// 		console.error("Ошибка при получении групп:", error)
// 		await ctx.reply("Произошла ошибка при получении групп.")
// 	}
// }

bot.on("message:text", async ctx => {
	const step = ctx.session.step

	if (!step || !(step in steps)) return

	const currentStep = steps[step]

	// if (step === "delete") {
	// 	const groupId = ctx.message.text.trim()

	// 	try {
	// 		const { data, error } = await supabase.from("groups").delete().eq("id", groupId)

	// 		if (error) throw error

	// 		if (data && data.length > 0) {
	// 			await ctx.reply(`Группа с ID ${groupId} успешно удалена.`)
	// 		} else {
	// 			await ctx.reply("Группа с таким ID не найдена.")
	// 		}
	// 	} catch (error) {
	// 		console.error("Ошибка при удалении группы:", error)
	// 		await ctx.reply("Произошла ошибка при удалении группы.")
	// 	}

	// 	ctx.session.step = undefined
	// }

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
