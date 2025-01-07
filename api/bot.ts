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
	userId?: number // Добавлено поле
	messageId?: number // Для хранения message_id в канале
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

// Вывод групп текущего пользователя с клавиатурой:
bot.command("my_groups", async ctx => {
	const userId = ctx.from?.id
	try {
		const { data, error } = await supabase
			.from("groups")
			.select("id, name, messageId")
			.eq("userId", userId)

		if (error) throw error

		if (data && data.length > 0) {
			const keyboard = new InlineKeyboard()

			data.forEach(group => {
				keyboard.text(`🗑 Удалить - ${group.name}`, `delete_group_${group.id}`).row()
			})

			await ctx.reply("📝 Ваши группы:", {
				reply_markup: keyboard,
			})
		} else {
			await ctx.reply("У вас ещё нет добавленных групп.")
		}
	} catch (error) {
		console.error("Ошибка при получении групп:", error)
		await ctx.reply("Произошла ошибка при получении ваших групп.")
	}
})

// Удаление группы:
bot.command("delete_group", async ctx => {
	const userId = ctx.from?.id
	const groupId = ctx.message.text.split(" ")[1] // Ожидается /delete_group <id>

	if (!groupId) {
		return ctx.reply("Введите ID группы, которую хотите удалить.")
	}

	try {
		const { data, error } = await supabase
			.from("groups")
			.select("messageId")
			.eq("id", groupId)
			.eq("userId", userId)
			.single()

		if (error || !data) {
			return ctx.reply(
				"Группа с указанным ID не найдена или вы не являетесь её создателем.",
			)
		}

		// Удаление из БД
		await supabase.from("groups").delete().eq("id", groupId).eq("userId", userId)

		// Удаление сообщения из канала
		await bot.api.deleteMessage(CHANNEL_ID, data.messageId)

		await ctx.reply("Группа успешно удалена.")
	} catch (error) {
		console.error("Ошибка при удалении группы:", error)
		await ctx.reply("Произошла ошибка при удалении группы.")
	}
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
	if (data.startsWith("delete_group_")) {
		const groupId = data.replace("delete_group_", "")

		try {
			// Получаем информацию о группе из БД
			const { data: groupData, error: fetchError } = await supabase
				.from("groups")
				.select("messageId")
				.eq("id", groupId)
				.single()

			if (fetchError || !groupData) {
				await ctx.reply("Ошибка: группа не найдена.")
				return
			}

			// Удаляем сообщение из канала
			const { messageId } = groupData
			if (messageId) {
				try {
					await bot.api.deleteMessage(CHANNEL_ID, messageId)
				} catch (deleteError) {
					console.error("Ошибка при удалении сообщения из канала:", deleteError)
				}
			}

			// Удаляем группу из базы данных
			const { error: deleteError } = await supabase
				.from("groups")
				.delete()
				.eq("id", groupId)

			if (deleteError) throw deleteError

			await ctx.reply(`Группа успешно удалена.`)
		} catch (error) {
			console.error("Ошибка при удалении группы:", error)
			await ctx.reply("Произошла ошибка при удалении группы.")
		}
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
		const userId = ctx.from?.id

		// Формирование сообщения
		const message =
			`🍀 *Название:* ${escapeMarkdown(name)}\n` +
			(community ? `👥 *Сообщество:* ${escapeMarkdown(community)}\n` : "") +
			(time ? `⏰ *Время:* ${escapeMarkdown(time)}\n` : "") +
			(format ? `♨ *Формат:* ${escapeMarkdown(format)}\n` : "") +
			(description ? `\n✨ *Описание:* ${escapeMarkdown(description)}\n\n` : "") +
			(contact ? `🛜 *Контакт:* ${escapeMarkdown(contact)}\n` : "") +
			(link ? `🌐 *Ссылка:* ${escapeMarkdown(link)}` : "")

		try {
			// Отправка сообщения в канал
			const sentMessage = await bot.api.sendMessage(CHANNEL_ID, message, {
				parse_mode: "Markdown",
			})

			// Сохранение данных в БД
			await supabase.from("groups").insert([
				{
					name,
					community,
					time,
					format,
					description,
					link,
					contact,
					userId,
					messageId: sentMessage.message_id, // Сохраняем message_id
				},
			])

			// Уведомление об успешном добавлении
			await ctx.reply("*Группа успешно добавлена 🎉*\nВернуться в меню /start", {
				reply_markup: new InlineKeyboard().url("Смотреть", "https://t.me/trust_unity"),
			})

			// Сброс сессии
			resetSession(ctx)
		} catch (error) {
			console.error("Ошибка при добавлении группы:", error)
			await ctx.reply("Произошла ошибка. Попробуйте позже.")
		}
	}
})

export default webhookCallback(bot, "https")
