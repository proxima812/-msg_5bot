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
// Интерфейсы для типов
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

// Пишешь idшники каналов, куда постить автоматом записи.
// const CHANNEL_IDS = ["channel_id_1", "channel_id_2", "channel_id_3"]

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
			.url("🌐 Сайт, где будет ваша группа", "https://ppros.vercel.app/")
			.row()
			.text("🔍 Поиск по сообществу", "search_community")
			.text("⏰ Поиск по времени", "search_time")
			.row()
			.text("🔸 Вся информация о боте 🔸", "show_text")
			.row()
			.text("♨ Поиск по формату", "search_format"),
	})
})

// Обработка команды /add_group
bot.on("callback_query", async ctx => {
	const data = ctx.callbackQuery.data
	// Информация о боте и остальное
	if (data === "show_text") {
		await ctx.answerCallbackQuery()
		await ctx.reply(
			"Бот постит группы на канале (-100238792451), что это говорит вам?\n\n- Это значит, что он может сразу в несколько каналов присылать информацию, так как он не привязан к одному каналу.\n\nПодробная информация об этом можете узнать у меня, и возможно, подключить бота к себе на канал.\n\nКонтакт: @legion_free\n\nИсходный код проекта https://github.com/proxima812/-msg_5bot",
			{ parse_mode: "HTML" },
		)
	}
	// Добавить группу
	if (data === "add_group") {
		await ctx.answerCallbackQuery()
		await ctx.reply("🍀 Введите название группы:")
		ctx.session.step = "name" // Переход к следующему шагу
	}
})
// Из БД выложить сразу все группы в канале, которые есть БД
// bot.command("show_groups", async ctx => {
// 	// Проверка на ID администратора
// 	if (ctx.from.id !== 5522146122) {
// 		await ctx.reply("У вас нет прав для использования этой команды.")
// 		return
// 	}
// 	// Получаем все группы из базы данных
// 	const { data, error } = await supabase.from("groups").select("*")
// 	if (error || !data || data.length === 0) {
// 		await ctx.reply("В базе данных нет групп.")
// 		return
// 	}
// 	// Отправляем информацию о группах в канал
// 	for (const group of data) {
// 		await bot.api.sendMessage(
// 			CHANNEL_ID,
// 			`🍀 *Название:* ${group.name}\n♨ *Формат:* ${group.format}\n👥 *Сообщество:* ${group.community}\n\n✨ *Описание:* ${group.description}\n\n🛜 *Контакт:* ${group.contact}\n🌐 *Ссылка:* ${group.link}`,
// 			{ parse_mode: "Markdown" },
// 		)
// 	}

// 	// Цикл для отправки сообщения в каждый канал
// 	// for (const channelId of CHANNEL_IDS) {
// 	// 	await bot.api.sendMessage(channelId, `🍀 *Название:* ${channelId.name}\n♨ *Формат:* ${channelId.format}\n👥 *Сообщество:* ${channelId.community}\n\n✨ *Описание:* ${channelId.description}\n\n🛜 *Контакт:* ${channelId.contact}\n🌐 *Ссылка:* ${channelId.link}`, { parse_mode: "Markdown" })
// 	// }

// 	await ctx.reply("Все группы были отправлены в канал(-ы).")
// })

// Поиск сообществ
bot.on("message:text", async ctx => {
	const step = ctx.session.step
	// Поиск по сообществу
	if (step === "search_community") {
		const community = ctx.message.text.trim()

		try {
			const { data, error } = await supabase
				.from("groups")
				.select("*")
				.ilike("community", `%${community}%`)
			if (error || !data.length) {
				await ctx.reply("🔍 Сообщество не найдено.")
			} else {
				for (const group of data) {
					await ctx.reply(
						`🍀 *Название:* ${group.name}\n👥 *Сообщество:* ${group.community}`,
						{ parse_mode: "Markdown" },
					)
				}
			}
		} catch (error) {
			console.error("Ошибка при поиске сообщества:", error)
			await ctx.reply("Произошла ошибка при поиске. Попробуйте позже.")
		}

		// Предложение выполнить еще один поиск
		await ctx.reply("Найти еще группы по времени или же по сообществу?", {
			reply_markup: new InlineKeyboard()
				.text("🔍 Поиск по сообществу", "search_community")
				.row()
				.text("⏰ Поиск по времени", "search_time"),
		})

		ctx.session.step = undefined // Сбрасываем шаг
	}
	// Поиск по формату
	if (step === "search_format") {
		const format = ctx.message.text.trim()

		try {
			const { data, error } = await supabase
				.from("groups")
				.select("*")
				.ilike("format", `%${format}%`)
			if (error || !data.length) {
				await ctx.reply("🔍 Сообщество не найдено.")
			} else {
				for (const group of data) {
					await ctx.reply(
						`🍀 *Название:* ${group.name}\n👥 *Сообщество:* ${group.community}`,
						{ parse_mode: "Markdown" },
					)
				}
			}
		} catch (error) {
			console.error("Ошибка при поиске сообщества:", error)
			await ctx.reply("Произошла ошибка при поиске. Попробуйте позже.")
		}

		// Предложение выполнить еще один поиск
		await ctx.reply("Найти еще группы по времени, по сообществу или же по формату?", {
			reply_markup: new InlineKeyboard()
				.text("🔍 Поиск по сообществу", "search_community")
				.text("⏰ Поиск по времени", "search_time")
				.row()
				.text("♨ Поиск по формату", "search_format"),
		})

		ctx.session.step = undefined // Сбрасываем шаг
	}
	// Поиск по времени
	else if (step === "search_time") {
		const time = ctx.message.text.trim()

		try {
			const { data, error } = await supabase.from("groups").select("*").eq("time", time)
			if (error || !data.length) {
				await ctx.reply("🔍 Группы с таким временем не найдены.")
			} else {
				for (const group of data) {
					await ctx.reply(`🍀 *Название:* ${group.name}\n⏰ *Время:* ${group.time}`, {
						parse_mode: "Markdown",
					})
				}
			}
		} catch (error) {
			console.error("Ошибка при поиске по времени:", error)
			await ctx.reply("Произошла ошибка при поиске. Попробуйте позже.")
		}

		// Предложение выполнить еще один поиск
		await ctx.reply("Найти еще группы по времени или же по сообществу?", {
			reply_markup: new InlineKeyboard()
				.text("🔍 Поиск по сообществу", "search_community")
				.row()
				.text("⏰ Поиск по времени", "search_time"),
		})

		ctx.session.step = undefined // Сбрасываем шаг
	}
})

// Вынести функцию экранирования Markdown
function escapeMarkdown(text: string): string {
	return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&") // Экранирование специальных символов
}

// Вынести шаги в маппинг
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
			"🌐 Введите ссылку на группу (начиная с https://):\n\n❌ _(Если нет информации, пишите -)_",
		next: "contact",
	},
	contact: {
		message: "🛜 Введите контакт (ПГ / ПГО / Любой другой контакт для связи):",
		next: null,
	},
}

bot.on("message:text", async ctx => {
	const step = ctx.session.step

	if (!step || !(step in steps)) return

	const currentStep = steps[step]

	// Проверка валидации
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
		// Сборка сообщения
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
			// Сохранение в БД
			await supabase
				.from("groups")
				.insert([{ name, community, time, format, description, link, contact }])

			// Отправка сообщения
			await bot.api.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" })

			await ctx.reply("Группа успешно добавлена 🎉\nВернуться в меню /start", {
				reply_markup: new InlineKeyboard().text("⬅ Назад", "/start"),
			})

			// Очистка сессии
			ctx.session.groupData = {}
			ctx.session.step = undefined
		} catch (error) {
			console.error("Ошибка при добавлении группы:", error)
			await ctx.reply("Произошла ошибка. Попробуйте позже.")
		}
	}
})

export default webhookCallback(bot, "https")
