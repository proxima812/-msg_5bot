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
const CHANNEL_ID = "-1002387924511" // ID канала, куда бот будет отправлять сообщения

// Обработчик команды /add_group
bot.command("add_group", async ctx => {
	const userId = ctx.from.id

	// Начинаем с первого вопроса
	await ctx.reply("Введите название группы (Аббревиатура или полное название):")

	// Сохраняем состояние пользователя в контексте
	ctx.session = { userId, step: 1 }
})

// Обработчик на текстовые сообщения
bot.on("message:text", async ctx => {
	const { session } = ctx
	const userId = ctx.from.id

	if (!session || session.userId !== userId) return

	// Шаг 1: Название группы
	if (session.step === 1) {
		const groupName = ctx.message.text.trim()

		// Переходим к следующему вопросу
		session.groupName = groupName
		session.step = 2
		await ctx.reply("Введите формат группы (например, Спикерская):")
		return
	}

	// Шаг 2: Формат
	if (session.step === 2) {
		const format = ctx.message.text.trim()

		// Переходим к следующему вопросу
		session.format = format
		session.step = 3
		await ctx.reply("Введите описание группы (до 110 символов):")
		return
	}

	// Шаг 3: Описание
	if (session.step === 3) {
		const description = ctx.message.text.trim()

		// Проверяем, что описание не больше 110 символов
		if (description.length > 110) {
			await ctx.reply("Описание не должно превышать 110 символов. Попробуйте снова.")
			return
		}

		// Переходим к следующему вопросу
		session.description = description
		session.step = 4
		await ctx.reply("Введите ссылку на группу (например, https://t.me/your_group):")
		return
	}

	// Шаг 4: Ссылка
	if (session.step === 4) {
		const link = ctx.message.text.trim()

		// Проверка формата ссылки
		const regex = /^https:\/\/t\.me\/[a-zA-Z0-9_]+(\/\d+)?$/
		if (!regex.test(link)) {
			await ctx.reply(
				"Ссылка должна быть в формате: https://t.me/КАНАЛ/НОМЕР_ПОСТА. Попробуйте снова.",
			)
			return
		}

		// Сохраняем данные в базу данных
		try {
			const { error } = await supabase
				.from("groups")
				.insert([
					{
						name: session.groupName,
						format: session.format,
						desc: session.description,
						link,
						userId,
					},
				])

			if (error) {
				console.error("Ошибка добавления группы в БД:", error)
				await ctx.reply("Произошла ошибка при добавлении группы.")
				return
			}

			// Успешное добавление
			await ctx.reply("Группа успешно добавлена!")
			await bot.api.sendMessage(
				CHANNEL_ID,
				`Новая группа:\n${session.groupName}\nФормат: ${session.format}\nОписание: ${session.description}\nСсылка: ${link}`,
			)
		} catch (err) {
			console.error("Ошибка при добавлении группы:", err)
			await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
		}

		// Завершаем сессию
		delete ctx.session
	}
})

// Обработчик команды /start
bot.command("start", async ctx => {
	const keyboard = new InlineKeyboard()
		.text("Добавить группу", "add_group")
		.row()
		.text("Посмотреть группы", "view_groups")

	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard, // Передаем клавиатуру
	})
})

// Функция для получения групп пользователя из Supabase
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

// Обработчик нажатия на кнопки
bot.on("callback_query", async ctx => {
	const data = ctx.callbackQuery.data
	const userId = ctx.from.id

	if (data === "view_groups") {
		// Получаем группы пользователя
		const groups = await getUserGroups(userId)
		const keyboard = new InlineKeyboard()

		if (groups.length === 0) {
			await ctx.answerCallbackQuery()
			await ctx.reply("У вас нет групп.")
			const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
			await ctx.reply("Вернуться в главное меню:", {
				reply_markup: keyboard,
			})
			return
		}

		// Выводим все группы пользователя
		groups.forEach(group => {
			const shortDesc =
				group.name.length > 30 ? `${group.name.slice(0, 30)}...` : group.name
			keyboard.text(`#${group.id}: ${shortDesc}`, `view_group_${group.id}`).row()
		})

		await ctx.answerCallbackQuery()
		await ctx.reply("Ваши группы:", {
			reply_markup: keyboard,
		})
	} else if (data === "main_menu") {
		// Переход в главное меню
		await ctx.answerCallbackQuery()
		await showMainMenu(ctx)
	} else {
		await ctx.answerCallbackQuery({ text: "Неизвестная команда." })
	}
})

// Главное меню
async function showMainMenu(ctx) {
	const keyboard = new InlineKeyboard()
		.text("Добавить группу", "add_group")
		.row()
		.text("Посмотреть группы", "view_groups")

	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard,
	})
}

export default webhookCallback(bot, "http")
