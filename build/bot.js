"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
const parse_mode_1 = require("@grammyjs/parse-mode")
const supabase_js_1 = require("@supabase/supabase-js")
const grammy_1 = require("grammy")
const supabase = (0, supabase_js_1.createClient)(
	"https://fkwivycaacgpuwfvozlp.supabase.co",
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrd2l2eWNhYWNncHV3ZnZvemxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MDc4MTEsImV4cCI6MjA0OTQ4MzgxMX0.44dYay0RWos4tqwuj6H-ylqN4TrAIabeQLNzBn6Xuy0",
)
const token = "7930164051:AAHF4GdP_jpjOiBl6ZCA1gY8HJZ-VH3A520"
if (!token) throw new Error("TOKEN is unset")
const bot = new grammy_1.Bot(token)
const CHANNEL_ID = "-1002387924511"
// Пишешь idшники каналов, куда постить автоматом записи.
// const CHANNEL_IDS = ["channel_id_1", "channel_id_2", "channel_id_3"]
// Устанавливаем плагины
bot.use((0, grammy_1.session)({ initial: () => ({ groupData: {} }) })) // для сессий
bot.use(parse_mode_1.hydrateReply) // для гидратирования ответов
bot.api.config.use((0, parse_mode_1.parseMode)("Markdown")) // для установки режима парсинга по умолчанию
// Команда /start для приветствия и начала процесса добавления группы
bot.command("start", async ctx => {
	// Сбрасываем состояние шага
	ctx.session.step = undefined
	// Приветственное сообщение с кнопками
	await ctx.reply("Добро пожаловать! Выберите действие:", {
		reply_markup: new grammy_1.InlineKeyboard()
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
			"Бот постит группы на канале (-100238792451), что это говорит вам?\n\n- Это значит, что он может сразу в несколько каналов присылать информацию, так как он не привязан к одному каналу.\n\nПодробная информация об этом можете узнать у меня, и возможно, подключить бота к себе на канал.\n\nКонтакт: @legion_free \n\nИскодный код проекта https://github.com/proxima812/-msg_5bot",
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
	// Поиск по формату
	if (data === "search_format") {
		await ctx.answerCallbackQuery()
		ctx.session.step = "search_format" // Устанавливаем шаг для поиска

		// Получение данных из таблицы groups format
		const { data: formats, error } = await supabase
			.from("groups") // Название таблицы
			.select("format") // Поле с форматами

		if (error) {
			console.error("Ошибка получения форматов:", error)
			await ctx.reply("❌ Ошибка получения форматов. Попробуйте позже.")
		} else {
			// Убираем дубли и объединяем форматы в строку через запятую
			const uniqueFormats = [...new Set(formats.map(f => f.format))]
			const formatsList = uniqueFormats.join(", ")
			await ctx.reply(
				`👉 Доступные форматы для поиска:\n\n${formatsList}\n\n♨ Введите название формата для поиска:`,
			)
		}
	}
})
// Из БД выложить сразу все группы в канале, которые есть БД
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
			`🍀 *Название:* ${group.name}\n♨ *Формат:* ${group.format}\n👥 *Сообщество:* ${group.community}\n\n✨ *Описание:* ${group.description}\n\n🛜 *Контакт:* ${group.contact}\n🌐 *Ссылка:* ${group.link}`,
			{ parse_mode: "Markdown" },
		)
	}
	// Цикл для отправки сообщения в каждый канал
	// for (const channelId of CHANNEL_IDS) {
	// 	await bot.api.sendMessage(channelId, `🍀 *Название:* ${channelId.name}\n♨ *Формат:* ${channelId.format}\n👥 *Сообщество:* ${channelId.community}\n\n✨ *Описание:* ${channelId.description}\n\n🛜 *Контакт:* ${channelId.contact}\n🌐 *Ссылка:* ${channelId.link}`, { parse_mode: "Markdown" })
	// }
	await ctx.reply("Все группы были отправлены в канал(-ы).")
})

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
	else if (step === "search_format") {
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
// старый код
// bot.on("message:text", async ctx => {
// 	const step = ctx.session.step
// 	// Поиск по сообществу
// 	if (step === "search_community") {
// 		const community = ctx.message.text.trim()
// 		try {
// 			const { data, error } = await supabase
// 				.from("groups")
// 				.select("*")
// 				.ilike("community", `%${community}%`)
// 			if (error || !data.length) {
// 				await ctx.reply("🔍 Сообщество не найдено.")
// 			} else {
// 				for (const group of data) {
// 					await ctx.reply(
// 						`🍀 *Название:* ${group.name}\n👥 *Сообщество:* ${group.community}`,
// 						{ parse_mode: "Markdown" },
// 					)
// 				}
// 			}
// 		} catch (error) {
// 			console.error("Ошибка при поиске сообщества:", error)
// 			await ctx.reply("Произошла ошибка при поиске. Попробуйте позже.")
// 		}
// 		// Предложение выполнить еще один поиск
// 		await ctx.reply("Найти еще группы по времени или же по сообществу?", {
// 			reply_markup: new InlineKeyboard()
// 				.text("🔍 Поиск по сообществу", "search_community")
// 				.row()
// 				.text("⏰ Поиск по времени", "search_time"),
// 		})
// 		ctx.session.step = undefined // Сбрасываем шаг
// 	}
// 	// Поиск по формату
// 	if (step === "search_format") {
// 		const format = ctx.message.text.trim()
// 		try {
// 			const { data, error } = await supabase
// 				.from("groups")
// 				.select("*")
// 				.ilike("format", `%${format}%`)
// 			if (error || !data.length) {
// 				await ctx.reply("🔍 Сообщество не найдено.")
// 			} else {
// 				for (const group of data) {
// 					await ctx.reply(
// 						`🍀 *Название:* ${group.name}\n👥 *Сообщество:* ${group.community}`,
// 						{ parse_mode: "Markdown" },
// 					)
// 				}
// 			}
// 		} catch (error) {
// 			console.error("Ошибка при поиске сообщества:", error)
// 			await ctx.reply("Произошла ошибка при поиске. Попробуйте позже.")
// 		}
// 		// Предложение выполнить еще один поиск
// 		await ctx.reply("Найти еще группы по времени, по сообществу или же по формату?", {
// 			reply_markup: new InlineKeyboard()
// 				.text("🔍 Поиск по сообществу", "search_community")
// 				.text("⏰ Поиск по времени", "search_time")
// 				.row()
// 				.text("♨ Поиск по формату", "search_format"),
// 		})
// 		ctx.session.step = undefined // Сбрасываем шаг
// 	}
// 	// Поиск по времени
// 	else if (step === "search_time") {
// 		const time = ctx.message.text.trim()
// 		try {
// 			const { data, error } = await supabase.from("groups").select("*").eq("time", time)
// 			if (error || !data.length) {
// 				await ctx.reply("🔍 Группы с таким временем не найдены.")
// 			} else {
// 				for (const group of data) {
// 					await ctx.reply(`🍀 *Название:* ${group.name}\n⏰ *Время:* ${group.time}`, {
// 						parse_mode: "Markdown",
// 					})
// 				}
// 			}
// 		} catch (error) {
// 			console.error("Ошибка при поиске по времени:", error)
// 			await ctx.reply("Произошла ошибка при поиске. Попробуйте позже.")
// 		}
// 		// Предложение выполнить еще один поиск
// 		await ctx.reply("Найти еще группы по времени или же по сообществу?", {
// 			reply_markup: new InlineKeyboard()
// 				.text("🔍 Поиск по сообществу", "search_community")
// 				.row()
// 				.text("⏰ Поиск по времени", "search_time"),
// 		})
// 		ctx.session.step = undefined // Сбрасываем шаг
// 	}
// 	// Пошаговая логика заполнения данных
// 	else if (step === "name") {
// 		ctx.session.groupData.name = ctx.message.text.trim()
// 		ctx.session.step = "community"
// 		await ctx.reply("👥 Сообщество (Аббревиатура):")
// 	} else if (step === "community") {
// 		const community = ctx.message.text.trim()
// 		// Если введено "-", пропускаем этот шаг
// 		if (community !== "-") {
// 			ctx.session.groupData.community = community
// 		}
// 		ctx.session.step = "time"
// 		await ctx.reply("⏰ Введите время (в формате 00:00):")
// 	} else if (step === "time") {
// 		const time = ctx.message.text.trim()
// 		// Проверка на корректность формата времени (например, 00:00)
// 		const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/
// 		if (!timeRegex.test(time)) {
// 			await ctx.reply("❌ Ошибка! Введите время в формате 00:00.")
// 			return
// 		}
// 		ctx.session.groupData.time = time
// 		ctx.session.step = "format"
// 		await ctx.reply("♨ Введите формат группы:\n\n❌ _(Если нет информации, пишите -)_")
// 	} else if (step === "format") {
// 		const format = ctx.message.text.trim()
// 		// Если введено "-", пропускаем этот шаг
// 		if (format !== "-") {
// 			ctx.session.groupData.format = format
// 		}
// 		ctx.session.step = "description"
// 		await ctx.reply("✨ Введите описание группы:\n\n❌ _(Если нет информации, пишите -)_")
// 	} else if (step === "description") {
// 		const description = ctx.message.text.trim()
// 		// Если введено "-", пропускаем этот шаг
// 		if (description !== "-") {
// 			ctx.session.groupData.description = description
// 		}
// 		ctx.session.step = "link"
// 		await ctx.reply(
// 			"Ссылка на группу:\n👉 Если *Telegram*, то пишите *@Название*\n👉 Если другие ссылки, то начинайте с *https://*\n\n❌ _(Если нет информации, пишите -)_",
// 		)
// 	} else if (step === "link") {
// 		const link = ctx.message.text.trim()
// 		// Если введено "-", пропускаем этот шаг
// 		if (link !== "-") {
// 			ctx.session.groupData.link = link
// 		}
// 		ctx.session.step = "contact"
// 		await ctx.reply("🛜 Введите контакт *(ПГ / ПГО / Любой другой контакт для связи):*")
// 	} else if (step === "contact") {
// 		const contact = ctx.message.text.trim()
// 		// Если введено "-", пропускаем этот шаг
// 		if (contact !== "-") {
// 			ctx.session.groupData.contact = contact
// 		}
// 		const groupData = ctx.session.groupData
// 		// Проверяем, что все необходимые данные заполнены
// 		if (!groupData.name) {
// 			await ctx.reply("Ошибка: название группы не указано.")
// 			return
// 		}
// 		// Если какое-то обязательное поле не заполнено, завершаем процесс с ошибкой
// 		if (!groupData.name || !groupData.community || !groupData.contact) {
// 			await ctx.reply("Ошибка: не все обязательные поля заполнены.")
// 			return
// 		}
// 		// Функция для экранирования текста для Markdown
// 		function escapeMarkdown(text) {
// 			return text
// 				.replace(/_/g, "\\_") // Экранируем _
// 				.replace(/\*/g, "\\*") // Экранируем *
// 				.replace(/\[/g, "\\[") // Экранируем [
// 				.replace(/]/g, "\\]") // Экранируем ]
// 				.replace(/\(/g, "\\(") // Экранируем (
// 				.replace(/\)/g, "\\)") // Экранируем )
// 				.replace(/~/g, "\\~") // Экранируем ~
// 				.replace(/`/g, "\\`") // Экранируем `
// 				.replace(/>/g, "\\>") // Экранируем >
// 				.replace(/#/g, "\\#") // Экранируем #
// 				.replace(/\+/g, "\\+") // Экранируем +
// 				.replace(/-/g, "\\-") // Экранируем -
// 				.replace(/=/g, "\\=") // Экранируем =
// 				.replace(/\|/g, "\\|") // Экранируем |
// 				.replace(/\./g, ".") // Не экранируем точку
// 				.replace(/!/g, "\\!") // Экранируем !
// 		}
// 		// Формируем сообщение для отправки в канал с проверкой на "-"
// 		let message = `🍀 *Название:* ${escapeMarkdown(groupData.name)}\n\n`
// 		if (groupData.community && groupData.community !== "-") {
// 			message += `👥 *Сообщество:* ${escapeMarkdown(groupData.community)}\n`
// 		}
// 		if (groupData.time && groupData.time !== "-") {
// 			message += `⏰ *Время:* ${escapeMarkdown(groupData.time)}\n`
// 		}
// 		if (groupData.format && groupData.format !== "-") {
// 			message += `♨ *Формат:* ${escapeMarkdown(groupData.format)}\n`
// 		}
// 		if (groupData.description && groupData.description !== "-") {
// 			message += `\n✨ *Описание:* ${escapeMarkdown(groupData.description)}\n\n`
// 		}
// 		if (groupData.contact && groupData.contact !== "-") {
// 			message += `🛜 *Контакт:* ${escapeMarkdown(groupData.contact)}\n`
// 		}
// 		if (groupData.link && groupData.link !== "-") {
// 			message += `🌐 *Ссылка:* ${escapeMarkdown(groupData.link)}`
// 		}
// 		try {
// 			// Сохранение данных в Supabase
// 			const { data, error } = await supabase.from("groups").insert([
// 				{
// 					name: groupData.name,
// 					format: groupData.format,
// 					community: groupData.community,
// 					description: groupData.description,
// 					contact: groupData.contact,
// 					link: groupData.link,
// 					time: groupData.time, // Добавили время
// 					created_at: new Date().toISOString(),
// 				},
// 			])
// 			if (error) {
// 				console.error("Ошибка добавления группы в БД:", error)
// 				await ctx.reply("Произошла ошибка при добавлении группы.")
// 				return
// 			}
// 			// Отправляем сообщение в канал
// 			await bot.api.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" })
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
// Вынести функцию экранирования Markdown
function escapeMarkdown(text) {
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
		validate: text =>
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
			await ctx.reply(validationResult)
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
				reply_markup: new grammy_1.InlineKeyboard().text("⬅ Назад", "/start"),
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
// exports.default = (0, grammy_1.webhookCallback)(bot, "https");
bot.start()
