require("dotenv").config()
import { createClient } from "@supabase/supabase-js"
import { Bot, InlineKeyboard, webhookCallback } from "grammy"

const supabase = createClient(
	"https://fkwivycaacgpuwfvozlp.supabase.co", // URL вашего проекта Supabase
	process.env.SP_API_SECRET, // Ваш ключ API Supabase
)

const token = process.env.TOKEN
if (!token) throw new Error("TOKEN is unset")

const bot = new Bot(token)

// -1002387924511
const CHANNEL_ID = "-1002387924511" // ID канала, куда бот будет отправлять сообщения

// Команда /add_card
bot.command("add_card", async ctx => {
	const userMessage = ctx.message.text.replace("/add_card", "").trim()

	// Проверяем, что сообщение соответствует формату ссылки
	const regex = /^https:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)$/
	const match = userMessage.match(regex)

	if (!match) {
		await ctx.reply(
			"Неверный формат. Используйте:\n`/add_card https://t.me/КАНАЛ/НОМЕР_ПОСТА`",
			{ parse_mode: "Markdown" },
		)
		return
	}

	const userId = ctx.from.id

	try {
		// Добавляем карточку в базу данных
		const { data, error } = await supabase
			.from("posts")
			.insert([{ desc: userMessage, userId }])

		if (error) {
			console.error("Ошибка добавления карточки в БД:", error)
			await ctx.reply("Произошла ошибка при добавлении карточки.")
			return
		}

		// Успешное добавление
		await ctx.reply("Карточка успешно добавлена!")

		// Публикуем карточку в канал
		await bot.api.sendMessage(CHANNEL_ID, `Новая пост:\n${userMessage}`)
	} catch (err) {
		console.error("Ошибка при добавлении карточки:", err)
		await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
	}
})
// Команда /add_group
bot.command("add_group", async ctx => {
	const userMessage = ctx.message.text.replace("/add_group", "").trim()

	// Проверяем, что сообщение соответствует формату ссылки
	const regex = /^https:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)$/
	const match = userMessage.match(regex)

	if (!match) {
		await ctx.reply(
			"Неверный формат. Используйте:\n`/add_card https://t.me/КАНАЛ/НОМЕР_ПОСТА`",
			{ parse_mode: "Markdown" },
		)
		return
	}

	const userId = ctx.from.id

	try {
		// Добавляем карточку в базу данных
		const { data, error } = await supabase
			.from("posts")
			.insert([{ desc: userMessage, userId }])

		if (error) {
			console.error("Ошибка добавления карточки в БД:", error)
			await ctx.reply("Произошла ошибка при добавлении карточки.")
			return
		}

		// Успешное добавление
		await ctx.reply("Карточка успешно добавлена!")

		// Публикуем карточку в канал
		await bot.api.sendMessage(CHANNEL_ID, `Новая пост:\n${userMessage}`)
	} catch (err) {
		console.error("Ошибка при добавлении карточки:", err)
		await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
	}
})

// Функция для удаления карточки из Supabase
async function deleteCard(cardId) {
	const { data, error } = await supabase.from("posts").delete().eq("id", cardId) // Удаляем карточку с соответствующим id

	if (error) {
		console.error("Ошибка при удалении карточки:", error)
		return false
	}
	return true
}
// Функция для удаления группы из Supabase
async function deleteGroup(groupId) {
	const { data, error } = await supabase.from("groups").delete().eq("id", groupId) // Удаляем карточку с соответствующим id

	if (error) {
		console.error("Ошибка при удалении карточки:", error)
		return false
	}
	return true
}
// Обработчик команды /start
bot.command("start", async ctx => {
	const userId = ctx.from.id

	// Создаем клавиатуру
	const keyboard = new InlineKeyboard()

	// Добавляем кнопку "Добавить карточку"
	keyboard.text("Добавить карточку", "add_card")
	keyboard.row()

	// Добавляем кнопку "Добавить группу"
	keyboard.text("Добавить группу", "add_group")
	keyboard.row()

	// keyboard.text("Добавить группу", "add_group")
	// keyboard.row()

	// Добавляем кнопку "Посмотреть свои карточки"
	keyboard.text("Посмотреть свои карточки", "view_cards")
	keyboard.row()

	// Добавляем кнопку "Посмотреть свои группы"
	keyboard.text("Посмотреть свои группы", "view_groups")
	keyboard.row()

	// Отправляем сообщение с клавиатурой
	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard, // Передаем клавиатуру
	})
})

// Главное меню
async function showMainMenu(ctx) {
	const keyboard = new InlineKeyboard()
		.text("Добавить карточку", "add_card")
		.text("Добавить группу", "add_group")
		.row()
		.text("Посмотреть карточки", "view_cards")
		.text("Посмотреть карточки", "view_groups")

	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard,
	})
}

// Обработчик нажатия на кнопки
bot.on("callback_query", async ctx => {
	try {
		const data = ctx.callbackQuery.data

		if (data === "add_card") {
			// Ответ на запрос
			await ctx.answerCallbackQuery()

			// Показываем сообщение с инструкцией
			await ctx.reply(
				"Чтобы добавить карточку, напишите команду:\n`/add_card https://t.me/КАНАЛ/НОМЕР_ПОСТА`",
				{ parse_mode: "Markdown" },
			)

			// Кнопка "Назад"
			const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
			await ctx.reply("Вернуться в главное меню:", {
				reply_markup: keyboard,
			})
		} else if (data === "view_cards") {
			const userId = ctx.from.id

			// Получаем карточки пользователя из Supabase
			const cards = await getUserCards(userId)

			// Если у пользователя нет карточек
			if (cards.length === 0) {
				await ctx.answerCallbackQuery()
				await ctx.reply("У вас нет карточек.")

				// Кнопка "Назад"
				const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
				await ctx.reply("Вернуться в главное меню:", {
					reply_markup: keyboard,
				})
				return
			}

			// Создаем клавиатуру для отображения карточек
			const keyboard = new InlineKeyboard()
			cards.forEach(card => {
				const formattedDesc = card.desc.replace(/^https?:\/\/t\.me\//, "t.me/")

				// Сокращаем текст, если он слишком длинный
				const shortDesc =
					formattedDesc.length > 30 ? `${formattedDesc.slice(0, 30)}...` : formattedDesc

				keyboard.text(`#${card.id}: ${shortDesc}`, `view_card_${card.id}`)
				keyboard.text("🗑 Удалить", `delete_card_${card.id}`).row()
			})

			// Добавляем кнопку "Назад"
			keyboard.text("⬅️ Назад", "main_menu")

			// Отправляем сообщение с клавиатурой
			await ctx.answerCallbackQuery()
			await ctx.reply("Ваши карточки:", {
				reply_markup: keyboard,
			})
		} else if (data === "main_menu") {
			// Возврат в главное меню
			await ctx.answerCallbackQuery()
			await showMainMenu(ctx)
		} else if (data.startsWith("delete_card_")) {
			const cardId = data.replace("delete_card_", "")

			// Удаляем карточку из базы данных
			const { error } = await supabase.from("posts").delete().eq("id", cardId)

			if (error) {
				console.error("Ошибка при удалении карточки:", error)
				await ctx.answerCallbackQuery({ text: "Ошибка при удалении карточки." })
				return
			}

			// Успешное удаление
			await ctx.answerCallbackQuery({ text: "Карточка успешно удалена." })
			await ctx.reply(`Карточка с ID ${cardId} была удалена.`)
		} else {
			await ctx.answerCallbackQuery({ text: "Неизвестная команда." })
		}
	} catch (error) {
		console.error("Ошибка в обработке callback_query:", error)
		try {
			await ctx.answerCallbackQuery({ text: "Произошла ошибка. Попробуйте позже." })
		} catch (e) {
			console.error("Ошибка при ответе на callback_query:", e)
		}
	}
})

// Обработчик нажатия на кнопки
bot.on("callback_query", async ctx => {
	try {
		const data = ctx.callbackQuery.data

		if (data === "add_group") {
			// Ответ на запрос
			await ctx.answerCallbackQuery()

			// Показываем сообщение с инструкцией
			await ctx.reply(
				"Чтобы добавить карточку, напишите команду:\n`/add_card https://t.me/КАНАЛ/НОМЕР_ПОСТА`",
				{ parse_mode: "Markdown" },
			)

			// Кнопка "Назад"
			const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
			await ctx.reply("Вернуться в главное меню:", {
				reply_markup: keyboard,
			})
		} else if (data === "view_groups") {
			const userId = ctx.from.id

			// Получаем карточки пользователя из Supabase
			const cards = await getUserGroups(userId)

			// Если у пользователя нет карточек
			if (cards.length === 0) {
				await ctx.answerCallbackQuery()
				await ctx.reply("У вас нет групп.")

				// Кнопка "Назад"
				const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
				await ctx.reply("Вернуться в главное меню:", {
					reply_markup: keyboard,
				})
				return
			}

			// Создаем клавиатуру для отображения карточек
			const keyboard = new InlineKeyboard()
			cards.forEach(group => {
				const formattedDesc = group.desc.replace(/^https?:\/\/t\.me\//, "t.me/")

				// Сокращаем текст, если он слишком длинный
				const shortDesc =
					formattedDesc.length > 30 ? `${formattedDesc.slice(0, 30)}...` : formattedDesc

				keyboard.text(`#${group.id}: ${shortDesc}`, `view_group_${group.id}`)
				keyboard.text("🗑 Удалить", `delete_group_${group.id}`).row()
			})

			// Добавляем кнопку "Назад"
			keyboard.text("⬅️ Назад", "main_menu")

			// Отправляем сообщение с клавиатурой
			await ctx.answerCallbackQuery()
			await ctx.reply("Ваши группы:", {
				reply_markup: keyboard,
			})
		} else if (data === "main_menu") {
			// Возврат в главное меню
			await ctx.answerCallbackQuery()
			await showMainMenu(ctx)
		} else if (data.startsWith("delete_group_")) {
			const groupId = data.replace("delete_group_", "")

			// Удаляем карточку из базы данных
			const { error } = await supabase.from("groups").delete().eq("id", groupId)

			if (error) {
				console.error("Ошибка при удалении группы:", error)
				await ctx.answerCallbackQuery({ text: "Ошибка при удалении группы." })
				return
			}

			// Успешное удаление
			await ctx.answerCallbackQuery({ text: "Группа успешно удалена." })
			await ctx.reply(`Группа с ID ${groupId} была удалена.`)
		} else {
			await ctx.answerCallbackQuery({ text: "Неизвестная команда." })
		}
	} catch (error) {
		console.error("Ошибка в обработке callback_query:", error)
		try {
			await ctx.answerCallbackQuery({ text: "Произошла ошибка. Попробуйте позже." })
		} catch (e) {
			console.error("Ошибка при ответе на callback_query:", e)
		}
	}
})

// Обработчик нажатия на кнопки удаления
bot.callbackQuery(/delete_card_(\d+)/, async ctx => {
	const userId = ctx.from.id
	const cardId = ctx.match[1]

	// Проверка, что карточка принадлежит текущему пользователю
	const cards = await getUserCards(userId)

	const card = cards.find(card => card.id.toString() === cardId.toString())

	if (!card) {
		await ctx.answerCallbackQuery("Эта карточка не принадлежит вам.")
		return
	}

	// Удаление карточки
	const success = await deleteCard(cardId)

	if (success) {
		await ctx.answerCallbackQuery("Карточка успешно удалена!")
		await ctx.editMessageText(`Карточка ${cardId} была удалена.`)
	} else {
		await ctx.answerCallbackQuery("Произошла ошибка при удалении карточки.")
	}
})

bot.callbackQuery(/delete_group_(\d+)/, async ctx => {
	const userId = ctx.from.id
	const groupId = ctx.match[1]

	// Проверка, что карточка принадлежит текущему пользователю
	const groups = await getUserGroups(userId)

	const group = groups.find(group => group.id.toString() === groupId.toString())

	if (!group) {
		await ctx.answerCallbackQuery("Эта группа не принадлежит вам.")
		return
	}

	// Удаление карточки
	const success = await deleteGroup(groupId)

	if (success) {
		await ctx.answerCallbackQuery("Группа успешно удалена!")
		await ctx.editMessageText(`Группа ${cardId} была удалена.`)
	} else {
		await ctx.answerCallbackQuery("Произошла ошибка при удалении группы.")
	}
})

// Обработчик нажатия на кнопку "Посмотреть карточку"
bot.callbackQuery(/view_card_(\d+)/, async ctx => {
	const cardId = ctx.match[1]

	// Получаем информацию о карточке
	const { data, error } = await supabase
		.from("posts")
		.select("*")
		.eq("id", cardId)
		.single() // Получаем карточку с конкретным id

	if (error || !data) {
		await ctx.answerCallbackQuery("Карточка не найдена.")
		return
	}

	await ctx.answerCallbackQuery() // Отвечаем на запрос (удаляем загрузочный индикатор)
	const shortDesc = data.desc.replace(/^https?:\/\/t\.me\//, "t.me/")
	await ctx.reply(`#${data.id}:\n${shortDesc}`)
})

bot.callbackQuery(/view_groups_(\d+)/, async ctx => {
	const groupId = ctx.match[1]

	// Получаем информацию о карточке
	const { data, error } = await supabase
		.from("groups")
		.select("*")
		.eq("id", groupId)
		.single() // Получаем карточку с конкретным id

	if (error || !data) {
		await ctx.answerCallbackQuery("Группа не найдена.")
		return
	}

	await ctx.answerCallbackQuery() // Отвечаем на запрос (удаляем загрузочный индикатор)
	const shortDesc = data.desc.replace(/^https?:\/\/t\.me\//, "t.me/")
	await ctx.reply(`#${data.id}:\n${shortDesc}`)
})

// Обработчик команды /add_card
bot.on("message:text", async ctx => {
	// Проверка, что сообщение начинается с команды /add_card
	if (!ctx.message.text.startsWith("/add_card")) {
		return // Прерываем выполнение, если не команда /add_card
	}

	// Убираем команду из текста и извлекаем URL
	const userMessage = ctx.message.text.replace("/add_card", "").trim() // Убираем команду /add_card из текста

	// Проверка формата сообщения с помощью регулярного выражения
	const regex = /^https:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)$/ // Паттерн для проверки формата https://t.me/КАНАЛ/НОМЕР
	const match = userMessage.match(regex)

	if (!match) {
		// Если формат не совпадает, отправляем сообщение об ошибке
		ctx.reply(
			"Неверный формат сообщения. Пожалуйста, используйте формат: https://t.me/КАНАЛ/НОМЕР. Например: https://t.me/trust_unity/8",
		)
		return
	}

	const userId = ctx.message.from.id // ID пользователя

	try {
		// Вставка данных в Supabase
		const { data, error } = await supabase
			.from("posts") // Убедитесь, что у вас есть таблица 'posts'
			.insert([
				{
					desc: userMessage, // Сообщение пользователя (ссылка)
					userId: userId,
				},
			])

		if (error) {
			console.error("Ошибка при добавлении записи в Supabase:", error.message)
			ctx.reply("Произошла ошибка при добавлении карточки.")
			return
		}

		console.log("Карточка добавлена с сообщением:", userMessage)
		ctx.reply("Ваше сообщение было добавлено как карточка!")
	} catch (error) {
		console.error("Ошибка при работе с Supabase:", error)
		ctx.reply("Произошла ошибка при добавлении карточки.")
	}
})

// Обработчик команды /add_group
bot.on("message:text", async ctx => {
	// Проверка, что сообщение начинается с команды /add_group
	if (!ctx.message.text.startsWith("/add_group")) {
		return // Прерываем выполнение, если не команда /add_group
	}

	// Убираем команду из текста и извлекаем URL
	const userMessage = ctx.message.text.replace("/add_group", "").trim() // Убираем команду /add_groupиз текста

	// Проверка формата сообщения с помощью регулярного выражения
	const regex = /^https:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)$/ // Паттерн для проверки формата https://t.me/КАНАЛ/НОМЕР
	const match = userMessage.match(regex)

	if (!match) {
		// Если формат не совпадает, отправляем сообщение об ошибке
		ctx.reply(
			"Неверный формат сообщения. Пожалуйста, используйте формат: https://t.me/КАНАЛ/НОМЕР. Например: https://t.me/trust_unity/8",
		)
		return
	}

	const userId = ctx.message.from.id // ID пользователя

	try {
		// Вставка данных в Supabase
		const { data, error } = await supabase
			.from("groups") // Убедитесь, что у вас есть таблица 'posts'
			.insert([
				{
					name: userMessage, // Сообщение пользователя (ссылка)
					userId: userId,
				},
			])

		if (error) {
			console.error("Ошибка при добавлении записи в Supabase:", error.message)
			ctx.reply("Произошла ошибка при добавлении группы.")
			return
		}

		console.log("Группа добавлена с сообщением:", userMessage)
		ctx.reply("Ваше сообщение было добавлено как Группа!")
	} catch (error) {
		console.error("Ошибка при работе с Supabase:", error)
		ctx.reply("Произошла ошибка при добавлении группы.")
	}
})

// Функция для получения карточек пользователя из Supabase
async function getUserCards(userId) {
	const { data, error } = await supabase
		.from("posts")
		.select("id, desc")
		.eq("userId", userId)

	if (error) {
		console.error("Ошибка при получении карточек:", error)
		return []
	}
	return data || []
}


async function getUserGroups(userId) {
	const { data, error } = await supabase
		.from("groups")
		.select("id, name")
		.eq("userId", userId)

	if (error) {
		console.error("Ошибка при получении групп:", error)
		return []
	}
	return data || []
}

export default webhookCallback(bot, "http")
