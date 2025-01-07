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
			.text("🔎 Мои группы/Удалить", "my_groups")
			.row()
			.url("👥 Канал, где будет ваша группа", "https://t.me/trust_unity")
			.row()
			.url("🌐 Сайт, где будет ваша группа", "https://ppros.vercel.app/")
			.row()
			.text("🔸 Вся информация о боте 🔸", "show_text"),
	})
})

// Функция для создания клавиатуры с сообществами из БД
async function createCommunityKeyboard() {
	const { data, error } = await supabase
		.from("groups")
		.select("community")
		.distinct()

	if (error) {
		console.error("Ошибка при получении сообществ:", error)
		return new InlineKeyboard().text("Ошибка", "error")
	}

	// Создаем кнопки для каждого сообщества
	const keyboard = new InlineKeyboard()
	data.forEach((group, index) => {
		if (group.community) {
			keyboard.text(group.community, `community_${group.community}`)
		}
		if ((index + 1) % 2 === 0) {
			keyboard.row()
		}
	})

	// Добавляем пустую строку, если кнопок нечетное количество
	if (data.length % 2 !== 0) {
		keyboard.row()
	}

	return keyboard
}

// Функция для фильтрации групп по сообществу
async function filterGroupsByCommunity(ctx, community) {
	try {
		const { data, error } = await supabase
			.from("groups")
			.select("name, messageId")
			.eq("community", community)

		if (error) throw error

		if (data && data.length > 0) {
			const keyboard = new InlineKeyboard()

			data.forEach((group, index) => {
				keyboard.text(group.name, `send_group_${group.messageId}`)
				if ((index + 1) % 2 === 0) {
					keyboard.row()
				}
			})

			if (data.length % 2 !== 0) {
				keyboard.row()
			}

			await ctx.reply(`Группы из сообщества "${community}":`, {
				reply_markup: keyboard,
			})
		} else {
			await ctx.reply(`Нет групп в сообществе "${community}".`)
		}
	} catch (error) {
		console.error("Ошибка при фильтрации групп:", error)
		await ctx.reply("Произошла ошибка при фильтрации групп.")
	}
}

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
	// Обработка "Мои группы/Удалить"
	if (data === "my_groups") {
		const userId = ctx.from?.id
		try {
			const { data, error } = await supabase
				.from("groups")
				.select("id, name, messageId")
				.eq("userId", userId)

			if (error) throw error
			if (data && data.length > 0) {
				const keyboard = new InlineKeyboard()

				data.forEach((group, index) => {
					keyboard.text(`🗑 - ${group.name}`, `delete_group_${group.id}`)
					// Добавляем новую строку после каждой второй кнопки
					if ((index + 1) % 2 === 0) {
						keyboard.row()
					}
				})
				// Если кнопок нечетное количество, добавляем последнюю строку
				if (data.length % 2 !== 0) {
					keyboard.row()
				}
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

			const { messageId } = groupData

			// Удаляем сообщение из канала, если оно существует
			if (messageId) {
				try {
					await bot.api.deleteMessage(CHANNEL_ID, messageId)
				} catch (deleteError) {
					console.error("Ошибка при удалении сообщения из канала:", deleteError)
					await ctx.reply(
						"Не удалось удалить сообщение из канала, но группа будет удалена.",
					)
				}
			}

			// Удаляем группу из базы данных
			const { error: deleteError } = await supabase
				.from("groups")
				.delete()
				.eq("id", groupId)

			if (deleteError) throw deleteError

			await ctx.reply("Группа успешно удалена.")
		} catch (error) {
			console.error("Ошибка при удалении группы:", error)
			await ctx.reply("Произошла ошибка при удалении группы.")
		}
	}

	// 1. Обработка нажатия на "Добавить чат, как рассылку"
	if (data === "add_broadcast_chat") {
		await ctx.answerCallbackQuery()
		await ctx.reply("Введите ID чата или канала, чтобы добавить его в рассылку.")
		// Сохраняем состояние, чтобы знать, что ожидаем от пользователя ID канала
		ctx.session.step = "add_broadcast_chat"
	}

	// 2. Обработка нажатия на "Фильтр выводимых групп"
	if (data === "filter_groups") {
		await ctx.answerCallbackQuery()
		await ctx.reply("Выберите сообщество, по которому хотите фильтровать группы:", {
			reply_markup: await createCommunityKeyboard(),
		})
	}

	// 3. Обработка выбора сообщества
	if (data.startsWith("community_")) {
		const community = data.replace("community_", "")
		// Фильтруем группы по выбранному сообществу
		await filterGroupsByCommunity(ctx, community)
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
  
  
  if (ctx.session.step === "add_broadcast_chat") {
		const chatId = ctx.message.text.trim()

		try {
			// Сохраняем ID чата в таблицу groupsList
			const { error } = await supabase.from("groupsList").insert([{ idGroup: chatId }])

			if (error) throw error

			await ctx.reply(`Чат ${chatId} успешно добавлен в рассылку!`)
		} catch (error) {
			console.error("Ошибка при добавлении чата в рассылку:", error)
			await ctx.reply("Произошла ошибка при добавлении чата. Попробуйте позже.")
		}

		// Сбрасываем состояние после обработки
		ctx.session.step = undefined
	}
})

bot.on("chat_member", async ctx => {
	// Проверяем, что бот был добавлен в группу или канал
	const newStatus = ctx.chatMember.new_chat_member.status
	const isBotAdded = newStatus === "administrator"

	if (isBotAdded && ctx.chatMember.from) {
		const userId = ctx.chatMember.from.id // ID пользователя, добавившего бота
		const chatId = ctx.chatMember.chat.id // ID группы или канала

		// Создаем клавиатуру
		const keyboard = new InlineKeyboard().text("Настроить меня", "setup")

		// Отправляем личное сообщение пользователю с клавиатурой
		try {
			await bot.api.sendMessage(
				userId,
				`Приветствую, ${ctx.chatMember.from.first_name}! Чтобы я мог работать, дайте мне права администратора: удаление/изменения сообщений.\n\nИнформация о боте @legion_free, также (НК Действия https://t.me/+unxSBy-6XyNTMy)`,
				{
					reply_markup: keyboard,
				},
			)
		} catch (error) {
			console.error("Ошибка при отправке сообщения пользователю:", error)
		}

		// Сохраняем информацию о группе в БД
		try {
			const { error } = await supabase.from("groupsList").insert([{ idGroup: chatId }])

			if (error) throw error
		} catch (dbError) {
			console.error("Ошибка при сохранении информации о группе:", dbError)
		}
	}
})

export default webhookCallback(bot, "https")
