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

	if (data === "show_text") {
		await ctx.answerCallbackQuery()
		await ctx.reply(
			"Бот постит группы на канале (-100238792451), что это говорит вам?\n\n- Это значит, что он может сразу в несколько каналов присылать информацию, так как он не привязан к одному каналу.\n\nПодробная информация об этом можете узнать у меня, и возможно, подключить бота к себе на канал.\n\nКонтакт: @legion_free",
			{ parse_mode: "HTML" },
		)
	}

	// Добавить группу
	if (data === "add_group") {
		await ctx.answerCallbackQuery()
		await ctx.reply("🍀 Введите название группы:")
		ctx.session.step = "name" // Переход к следующему шагу
	}
	// Поиск по сообществу
	if (data === "search_community") {
		await ctx.answerCallbackQuery()
		ctx.session.step = "search_community" // Устанавливаем шаг для поиска
		await ctx.reply("🔍 Введите название сообщества для поиска:")
	}

	// Поиск по времени
	if (data === "search_time") {
		await ctx.answerCallbackQuery()
		ctx.session.step = "search_time" // Устанавливаем шаг для поиска
		await ctx.reply("🔍 Введите время для поиска (формат 00:00):")
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

	// Цикл для отправки сообщения в каждый канал
	// for (const channelId of CHANNEL_IDS) {
	// 	await bot.api.sendMessage(channelId, message, { parse_mode: "Markdown" })
	// }

	await ctx.reply("Все группы были отправлены в канал..")
})

// Новый код
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
	// Пошаговая логика заполнения данных
	else if (step === "name") {
		ctx.session.groupData.name = ctx.message.text.trim()
		ctx.session.step = "community"
		await ctx.reply("👥 Сообщество (Аббревиатура):")
	} else if (step === "community") {
		const community = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (community !== "-") {
			ctx.session.groupData.community = community
		}
		ctx.session.step = "time"
		await ctx.reply("⏰ Введите время (в формате 00:00):")
	} else if (step === "time") {
		const time = ctx.message.text.trim()

		// Проверка на корректность формата времени (например, 00:00)
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/
		if (!timeRegex.test(time)) {
			await ctx.reply("❌ Ошибка! Введите время в формате 00:00.")
			return
		}

		ctx.session.groupData.time = time
		ctx.session.step = "format"
		await ctx.reply("♨ Введите формат группы:\n\n❌ _(Если нет информации, пишите -)_")
	} else if (step === "format") {
		const format = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (format !== "-") {
			ctx.session.groupData.format = format
		}
		ctx.session.step = "description"
		await ctx.reply("✨ Введите описание группы:\n\n❌ _(Если нет информации, пишите -)_")
	} else if (step === "description") {
		const description = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (description !== "-") {
			ctx.session.groupData.description = description
		}
		ctx.session.step = "link"
		await ctx.reply(
			"Ссылка на группу:\n👉 Если *Telegram*, то пишите *@Название*\n👉 Если другие ссылки, то начинайте с *https://*\n\n❌ _(Если нет информации, пишите -)_",
		)
	} else if (step === "link") {
		const link = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (link !== "-") {
			ctx.session.groupData.link = link
		}
		ctx.session.step = "contact"
		await ctx.reply("🛜 Введите контакт *(ПГ / ПГО / Любой другой контакт для связи):*")
	} else if (step === "contact") {
		const contact = ctx.message.text.trim()
		// Если введено "-", пропускаем этот шаг
		if (contact !== "-") {
			ctx.session.groupData.contact = contact
		}

		const groupData = ctx.session.groupData

		// Проверяем, что все необходимые данные заполнены
		if (!groupData.name) {
			await ctx.reply("Ошибка: название группы не указано.")
			return
		}

		// Если какое-то обязательное поле не заполнено, завершаем процесс с ошибкой
		if (!groupData.name || !groupData.community || !groupData.contact) {
			await ctx.reply("Ошибка: не все обязательные поля заполнены.")
			return
		}

		// Функция для экранирования текста для Markdown
		function escapeMarkdown(text) {
			return text
				.replace(/_/g, "\\_") // Экранируем _
				.replace(/\*/g, "\\*") // Экранируем *
				.replace(/\[/g, "\\[") // Экранируем [
				.replace(/]/g, "\\]") // Экранируем ]
				.replace(/\(/g, "\\(") // Экранируем (
				.replace(/\)/g, "\\)") // Экранируем )
				.replace(/~/g, "\\~") // Экранируем ~
				.replace(/`/g, "\\`") // Экранируем `
				.replace(/>/g, "\\>") // Экранируем >
				.replace(/#/g, "\\#") // Экранируем #
				.replace(/\+/g, "\\+") // Экранируем +
				.replace(/-/g, "\\-") // Экранируем -
				.replace(/=/g, "\\=") // Экранируем =
				.replace(/\|/g, "\\|") // Экранируем |
				.replace(/\./g, "\\.") // Экранируем .
				.replace(/!/g, "\\!") // Экранируем !
		}

		// Формируем сообщение для отправки в канал с проверкой на "-"
		let message = `🍀 *Название:* ${escapeMarkdown(groupData.name)}\n\n`

		if (groupData.community && groupData.community !== "-") {
			message += `👥 *Сообщество:* ${escapeMarkdown(groupData.community)}\n`
		}
		if (groupData.time && groupData.time !== "-") {
			message += `⏰ *Время:* ${escapeMarkdown(groupData.time)}\n`
		}
		if (groupData.format && groupData.format !== "-") {
			message += `♨ *Формат:* ${escapeMarkdown(groupData.format)}\n`
		}
		if (groupData.description && groupData.description !== "-") {
			message += `\n✨ *Описание:* ${escapeMarkdown(groupData.description)}\n\n`
		}
		if (groupData.contact && groupData.contact !== "-") {
			message += `🛜 *Контакт:* ${escapeMarkdown(groupData.contact)}\n`
		}
		if (groupData.link && groupData.link !== "-") {
			message += `🌐 *Ссылка:* ${escapeMarkdown(groupData.link)}`
		}

		// // Формируем строку с хэштегами
		// let hashtags = "\n\n"
		// if (groupData.format && groupData.format !== "-") {
		// 	hashtags += `#${groupData.format}, `
		// }
		// if (groupData.community && groupData.community !== "-") {
		// 	hashtags += `#${groupData.community}, `
		// }
		// if (groupData.time && groupData.time !== "-") {
		// 	hashtags += `#${groupData.time.replace(":", "_")}, `
		// }

		// // Убираем лишнюю запятую и пробел в конце строки с хэштегами
		// hashtags = hashtags.trim().replace(/,$/, "")

		// // Добавляем хэштеги к сообщению
		// message += hashtags

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
					time: groupData.time, // Добавили время
					created_at: new Date().toISOString(),
				},
			])

			if (error) {
				console.error("Ошибка добавления группы в БД:", error)
				await ctx.reply("Произошла ошибка при добавлении группы.")
				return
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
