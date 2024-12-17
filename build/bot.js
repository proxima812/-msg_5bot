"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const supabase_js_1 = require("@supabase/supabase-js");
const grammy_1 = require("grammy");
const supabase = (0, supabase_js_1.createClient)("https://fkwivycaacgpuwfvozlp.supabase.co", // URL вашего проекта Supabase
process.env.SP_API_SECRET);
const token = process.env.TOKEN;
if (!token)
    throw new Error("TOKEN is unset");
const bot = new grammy_1.Bot(token);
// -1002387924511
const CHANNEL_ID = "-1002387924511"; // ID канала, куда бот будет отправлять сообщения
// Команда /add_card
bot.command("add_card", async (ctx) => {
    const userMessage = ctx.message.text.replace("/add_card", "").trim();
    // Проверяем, что сообщение соответствует формату ссылки
    const regex = /^https:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)$/;
    const match = userMessage.match(regex);
    if (!match) {
        await ctx.reply("Неверный формат. Используйте:\n`/add_card https://t.me/КАНАЛ/НОМЕР_ПОСТА`", { parse_mode: "Markdown" });
        return;
    }
    const userId = ctx.from.id;
    try {
        // Добавляем карточку в базу данных
        const { data, error } = await supabase
            .from("posts")
            .insert([{ desc: userMessage, userId }]);
        if (error) {
            console.error("Ошибка добавления карточки в БД:", error);
            await ctx.reply("Произошла ошибка при добавлении карточки.");
            return;
        }
        // Успешное добавление
        await ctx.reply("Карточка успешно добавлена!");
        // Публикуем карточку в канал
        await bot.api.sendMessage(CHANNEL_ID, `Новая пост:\n${userMessage}`);
    }
    catch (err) {
        console.error("Ошибка при добавлении карточки:", err);
        await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.");
    }
});
// Функция для удаления карточки из Supabase
async function deleteCard(cardId) {
    const { data, error } = await supabase.from("posts").delete().eq("id", cardId); // Удаляем карточку с соответствующим id
    if (error) {
        console.error("Ошибка при удалении карточки:", error);
        return false;
    }
    return true;
}
async function deleteGroup(cardId) {
    const { data, error } = await supabase.from("posts").delete().eq("id", groupId); // Удаляем карточку с соответствующим id
    if (error) {
        console.error("Ошибка при удалении группы:", error);
        return false;
    }
    return true;
}
// Обработчик команды /start
bot.command("start", async (ctx) => {
    const userId = ctx.from.id;
    // Создаем клавиатуру
    const keyboard = new grammy_1.InlineKeyboard();
    // Добавляем кнопку "Добавить карточку"
    keyboard.text("Добавить карточку", "add_card");
    keyboard.row();
    // keyboard.text("Добавить группу", "add_group")
    // keyboard.row()
    // Добавляем кнопку "Посмотреть свои карточки"
    keyboard.text("Посмотреть свои карточки", "view_cards");
    keyboard.row();
    // Отправляем сообщение с клавиатурой
    await ctx.reply("Выберите действие:", {
        reply_markup: keyboard, // Передаем клавиатуру
    });
});
// Главное меню
async function showMainMenu(ctx) {
    const keyboard = new grammy_1.InlineKeyboard()
        .text("Добавить карточку", "add_card")
        // .text("Добавить группу", "add_group")
        .row()
        .text("Посмотреть карточки", "view_cards");
    await ctx.reply("Выберите действие:", {
        reply_markup: keyboard,
    });
}
// Обработчик нажатия на кнопки
bot.on("callback_query", async (ctx) => {
    try {
        const data = ctx.callbackQuery.data;
        if (data === "add_card") {
            // Ответ на запрос
            await ctx.answerCallbackQuery();
            // Показываем сообщение с инструкцией
            await ctx.reply("Чтобы добавить карточку, напишите команду:\n`/add_card https://t.me/КАНАЛ/НОМЕР_ПОСТА`", { parse_mode: "Markdown" });
            // Кнопка "Назад"
            const keyboard = new grammy_1.InlineKeyboard().text("⬅️ Назад", "main_menu");
            await ctx.reply("Вернуться в главное меню:", {
                reply_markup: keyboard,
            });
        }
        else if (data === "view_cards") {
            const userId = ctx.from.id;
            // Получаем карточки пользователя из Supabase
            const cards = await getUserCards(userId);
            // Если у пользователя нет карточек
            if (cards.length === 0) {
                await ctx.answerCallbackQuery();
                await ctx.reply("У вас нет карточек.");
                // Кнопка "Назад"
                const keyboard = new grammy_1.InlineKeyboard().text("⬅️ Назад", "main_menu");
                await ctx.reply("Вернуться в главное меню:", {
                    reply_markup: keyboard,
                });
                return;
            }
            // Создаем клавиатуру для отображения карточек
            const keyboard = new grammy_1.InlineKeyboard();
            cards.forEach(card => {
                const formattedDesc = card.desc.replace(/^https?:\/\/t\.me\//, "t.me/");
                // Сокращаем текст, если он слишком длинный
                const shortDesc = formattedDesc.length > 30 ? `${formattedDesc.slice(0, 30)}...` : formattedDesc;
                keyboard.text(`#${card.id}: ${shortDesc}`, `view_card_${card.id}`);
                keyboard.text("🗑 Удалить", `delete_card_${card.id}`).row();
            });
            // Добавляем кнопку "Назад"
            keyboard.text("⬅️ Назад", "main_menu");
            // Отправляем сообщение с клавиатурой
            await ctx.answerCallbackQuery();
            await ctx.reply("Ваши карточки:", {
                reply_markup: keyboard,
            });
        }
        else if (data === "main_menu") {
            // Возврат в главное меню
            await ctx.answerCallbackQuery();
            await showMainMenu(ctx);
        }
        else if (data.startsWith("delete_card_")) {
            const cardId = data.replace("delete_card_", "");
            // Удаляем карточку из базы данных
            const { error } = await supabase.from("posts").delete().eq("id", cardId);
            if (error) {
                console.error("Ошибка при удалении карточки:", error);
                await ctx.answerCallbackQuery({ text: "Ошибка при удалении карточки." });
                return;
            }
            // Успешное удаление
            await ctx.answerCallbackQuery({ text: "Карточка успешно удалена." });
            await ctx.reply(`Карточка с ID ${cardId} была удалена.`);
        }
        else {
            await ctx.answerCallbackQuery({ text: "Неизвестная команда." });
        }
    }
    catch (error) {
        console.error("Ошибка в обработке callback_query:", error);
        try {
            await ctx.answerCallbackQuery({ text: "Произошла ошибка. Попробуйте позже." });
        }
        catch (e) {
            console.error("Ошибка при ответе на callback_query:", e);
        }
    }
});
// Обработчик нажатия на кнопки удаления
bot.callbackQuery(/delete_card_(\d+)/, async (ctx) => {
    const userId = ctx.from.id;
    const cardId = ctx.match[1];
    // Проверка, что карточка принадлежит текущему пользователю
    const cards = await getUserCards(userId);
    const card = cards.find(card => card.id.toString() === cardId.toString());
    if (!card) {
        await ctx.answerCallbackQuery("Эта карточка не принадлежит вам.");
        return;
    }
    // Удаление карточки
    const success = await deleteCard(cardId);
    if (success) {
        await ctx.answerCallbackQuery("Карточка успешно удалена!");
        await ctx.editMessageText(`Карточка ${cardId} была удалена.`);
    }
    else {
        await ctx.answerCallbackQuery("Произошла ошибка при удалении карточки.");
    }
});
// Обработчик нажатия на кнопку "Посмотреть карточку"
bot.callbackQuery(/view_card_(\d+)/, async (ctx) => {
    const cardId = ctx.match[1];
    // Получаем информацию о карточке
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", cardId)
        .single(); // Получаем карточку с конкретным id
    if (error || !data) {
        await ctx.answerCallbackQuery("Карточка не найдена.");
        return;
    }
    await ctx.answerCallbackQuery(); // Отвечаем на запрос (удаляем загрузочный индикатор)
    const shortDesc = data.desc.replace(/^https?:\/\/t\.me\//, "t.me/");
    await ctx.reply(`#${data.id}:\n${shortDesc}`);
});
// Обработчик команды /add_card
bot.on("message:text", async (ctx) => {
    // Проверка, что сообщение начинается с команды /add_card
    if (!ctx.message.text.startsWith("/add_card")) {
        return; // Прерываем выполнение, если не команда /add_card
    }
    // Убираем команду из текста и извлекаем URL
    const userMessage = ctx.message.text.replace("/add_card", "").trim(); // Убираем команду /add_card из текста
    // Проверка формата сообщения с помощью регулярного выражения
    const regex = /^https:\/\/t\.me\/([a-zA-Z0-9_]+)\/(\d+)$/; // Паттерн для проверки формата https://t.me/КАНАЛ/НОМЕР
    const match = userMessage.match(regex);
    if (!match) {
        // Если формат не совпадает, отправляем сообщение об ошибке
        ctx.reply("Неверный формат сообщения. Пожалуйста, используйте формат: https://t.me/КАНАЛ/НОМЕР. Например: https://t.me/trust_unity/8");
        return;
    }
    const userId = ctx.message.from.id; // ID пользователя
    try {
        // Вставка данных в Supabase
        const { data, error } = await supabase
            .from("posts") // Убедитесь, что у вас есть таблица 'posts'
            .insert([
            {
                desc: userMessage,
                userId: userId,
            },
        ]);
        if (error) {
            console.error("Ошибка при добавлении записи в Supabase:", error.message);
            ctx.reply("Произошла ошибка при добавлении карточки.");
            return;
        }
        console.log("Карточка добавлена с сообщением:", userMessage);
        ctx.reply("Ваше сообщение было добавлено как карточка!");
    }
    catch (error) {
        console.error("Ошибка при работе с Supabase:", error);
        ctx.reply("Произошла ошибка при добавлении карточки.");
    }
});
// Функция для получения карточек пользователя из Supabase
async function getUserCards(userId) {
    const { data, error } = await supabase
        .from("posts")
        .select("id, desc")
        .eq("userId", userId);
    if (error) {
        console.error("Ошибка при получении карточек:", error);
        return [];
    }
    return data || [];
}
exports.default = (0, grammy_1.webhookCallback)(bot, "http");
