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

// Универсальная функция для обработки команды add_card и add_group
const addItemProcess = async (ctx, tableName, messagePrefix) => {
	let step = 1
	const userId = ctx.from.id
	let groupInfo = {}

	const steps = [
		{ question: "Название группы", field: "name" },
		{
			question:
				"Выберите формат:\n1. По темам\n2. Медитация\n3. Спикерская\n4. Вопрос&Ответ\n5. Для новичков\n6. От 5 лет чистоты/трезвости/ясности\n7. Прочее",
			field: "format",
		},
		{
			question:
				"Выберите сообщество:\n1. АА\n2. АН\n3. CODA\n4. ВДА\n5. АС (сексоголики)\n6. ЛЗ (любовно-зависимые)\n7. АИЗ (интернет зависимые)\n8. DAA (химические зависимые)\n9. UAA (всех-зависимостей)\n10. Свое сообщество",
			field: "community",
		},
		{ question: "Ссылка на группу/сайт/собрание", field: "link" },
		{ question: "Краткое описание группы", field: "description" },
	]

	// Запуск процесса пошагового добавления
	const askQuestion = async () => {
		if (step > steps.length) {
			// Сохраняем данные в Supabase
			const { data, error } = await supabase.from(tableName).insert([
				{
					...groupInfo,
					userId,
				},
			])

			if (error) {
				console.error("Ошибка добавления данных в БД:", error)
				return ctx.reply("Произошла ошибка при добавлении данных.")
			}

			// Отправляем сообщение в канал
			await bot.api.sendMessage(CHANNEL_ID, `Новая запись:\n${JSON.stringify(groupInfo)}`)

			return ctx.reply("Группа успешно добавлена!")
		}

		const currentStep = steps[step - 1]
		await ctx.reply(currentStep.question)
		step++
	}

	bot.on("message:text", async ctx => {
		const userMessage = ctx.message.text.trim()

		if (groupInfo[steps[step - 1].field]) {
			// Если информация уже получена на данном шаге
			groupInfo[steps[step - 1].field] = userMessage
			await askQuestion()
		}
	})

	await askQuestion() // Инициализация первого вопроса
}

// Команда /add_group
bot.command("add_group", async ctx => {
	await addItemProcess(ctx, "groups", "add_group")
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

// Обработчик команды /start
bot.command("start", async ctx => {
	const keyboard = new InlineKeyboard()
		.text("Добавить карточку", "add_card")
		.text("Добавить группу", "add_group")
		.row()
		.text("Посмотреть карточки", "view_cards")
		.text("Посмотреть группы", "view_groups")

	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard, // Передаем клавиатуру
	})
})

// Обработчик нажатия на кнопки
bot.on("callback_query", async ctx => {
	const data = ctx.callbackQuery.data
	const userId = ctx.from.id

	if (data === "add_card") {
		await ctx.answerCallbackQuery()
		await ctx.reply(
			"Чтобы добавить карточку, напишите команду:\n`/add_card https://t.me/КАНАЛ/НОМЕР_ПОСТА`",
			{ parse_mode: "Markdown" },
		)
		const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
		await ctx.reply("Вернуться в главное меню:", {
			reply_markup: keyboard,
		})
	} else if (data === "view_cards") {
		const cards = await getUserCards(userId)
		const keyboard = new InlineKeyboard()
		if (cards.length === 0) {
			await ctx.answerCallbackQuery()
			await ctx.reply("У вас нет карточек.")
			const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
			await ctx.reply("Вернуться в главное меню:", {
				reply_markup: keyboard,
			})
			return
		}

		cards.forEach(card => {
			const shortDesc = card.desc.length > 30 ? `${card.desc.slice(0, 30)}...` : card.desc
			keyboard.text(`#${card.id}: ${shortDesc}`, `view_card_${card.id}`).row()
		})

		await ctx.answerCallbackQuery()
		await ctx.reply("Ваши карточки:", {
			reply_markup: keyboard,
		})
	} else if (data === "main_menu") {
		await ctx.answerCallbackQuery()
		await showMainMenu(ctx)
	} else {
		await ctx.answerCallbackQuery({ text: "Неизвестная команда." })
	}
})

// Главное меню
async function showMainMenu(ctx) {
	const keyboard = new InlineKeyboard()
		.text("Добавить карточку", "add_card")
		.text("Добавить группу", "add_group")
		.row()
		.text("Посмотреть карточки", "view_cards")
		.text("Посмотреть группы", "view_groups")

	await ctx.reply("Выберите действие:", {
		reply_markup: keyboard,
	})
}

export default webhookCallback(bot, "http")
