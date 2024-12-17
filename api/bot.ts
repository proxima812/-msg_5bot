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
  // Запрашиваем у пользователя все данные в одном сообщении
  await ctx.reply(
    "Пожалуйста, напишите информацию о группе в следующем формате:\n" +
    "Группа (Аббревиатура) или полное название [пробел] Формат [пробел] Краткое описание (до 110 символов) [пробел] Ссылка на группу\n" +
    "Пример:\nГруппа АА Спикерская Нужные ведущие https://t.me/link-group"
  )
})

// Обработчик текста, который приходит после команды /add_group
bot.on("message:text", async ctx => {
  // Проверяем, что это не команда /add_group
  if (!ctx.message.text.startsWith("/add_group")) {
    return
  }

  // Убираем команду /add_group и получаем данные
  const userMessage = ctx.message.text.replace("/add_group", "").trim()

  // Проверяем, что сообщение состоит из 4 частей, разделенных пробелами
  const parts = userMessage.split(" ")

  if (parts.length !== 4) {
    await ctx.reply(
      "Неверный формат. Пожалуйста, используйте следующий формат:\n" +
      "Группа (Аббревиатура) или полное название [пробел] Формат [пробел] Краткое описание (до 110 символов) [пробел] Ссылка на группу"
    )
    return
  }

  const [groupName, format, description, link] = parts

  // Проверяем, что описание не превышает 110 символов
  if (description.length > 110) {
    await ctx.reply("Описание не должно превышать 110 символов.")
    return
  }

  // Проверка формата ссылки (обязательно, чтобы ссылка начиналась с https://t.me/)
  const regex = /^https:\/\/t\.me\/[a-zA-Z0-9_]+(\/\d+)?$/
  if (!regex.test(link)) {
    await ctx.reply("Ссылка должна быть в формате: https://t.me/КАНАЛ/НОМЕР_ПОСТА")
    return
  }

  const userId = ctx.from.id

  try {
    // Добавляем группу в базу данных Supabase
    const { data, error } = await supabase
      .from("groups")
      .insert([{ name: groupName, format, desc: description, link, userId }])

    if (error) {
      console.error("Ошибка добавления группы в БД:", error)
      await ctx.reply("Произошла ошибка при добавлении группы.")
      return
    }

    // Успешное добавление
    await ctx.reply("Группа успешно добавлена!")
    // Публикуем сообщение в канал
    await bot.api.sendMessage(CHANNEL_ID, `Новая группа:\n${groupName}\nФормат: ${format}\nОписание: ${description}\nСсылка: ${link}`)
  } catch (err) {
    console.error("Ошибка при добавлении группы:", err)
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.")
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

bot.on("callback_query", async ctx => {
	const data = ctx.callbackQuery.data
	const userId = ctx.from.id

	if (data === "add_group") {
		// Запрос на добавление новой группы
		await ctx.answerCallbackQuery()
		await ctx.reply(
			"Чтобы добавить группу, напишите всю информацию в таком виде:\n" +
				"- группа (Аббревиатура) либо полное название\n" +
				"- формат\n" +
				"- Краткое описание до 110 символов\n" +
				"- ссылка на группу\n\n" +
				"Пример:\n" +
				"Группа АА Спикерская Нужные ведущие https://t.me/link-group",
			{ parse_mode: "Markdown" },
		)

		const keyboard = new InlineKeyboard().text("⬅️ Назад", "main_menu")
		await ctx.reply("Вернуться в главное меню:", {
			reply_markup: keyboard,
		})
	} else if (data === "view_groups") {
		// Получаем группы пользователя
		const groups = await getUserGroups(userId) // аналог getUserCards, только для групп
		const keyboard = new InlineKeyboard()

		if (groups.length === 0) {
			// Если у пользователя нет групп
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
		// Обработка неизвестных команд
		await ctx.answerCallbackQuery({ text: "Неизвестная команда." })
	}
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
