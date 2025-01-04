"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_mode_1 = require("@grammyjs/parse-mode");
const supabase_js_1 = require("@supabase/supabase-js");
const grammy_1 = require("grammy");
const supabase = (0, supabase_js_1.createClient)("https://fkwivycaacgpuwfvozlp.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrd2l2eWNhYWNncHV3ZnZvemxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5MDc4MTEsImV4cCI6MjA0OTQ4MzgxMX0.44dYay0RWos4tqwuj6H-ylqN4TrAIabeQLNzBn6Xuy0");
const token = "6466826269:AAFQTbGr3xPJ2ik9u0X2Yat3Vi6Urcr0aPw";
if (!token)
    throw new Error("TOKEN is unset");
const bot = new grammy_1.Bot(token);
const CHANNEL_ID = "-1002167754817";
// Используем сессии и настройку парсинга Markdown
bot.use((0, grammy_1.session)({ initial: () => ({ groupData: {} }) }));
bot.use(parse_mode_1.hydrateReply);
bot.api.config.use((0, parse_mode_1.parseMode)("Markdown"));
// Сброс данных сессии
const resetSession = (ctx) => {
    ctx.session.groupData = {};
    ctx.session.step = undefined;
};
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
        validate: (text) => /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/.test(text) ||
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
        message: "👉 Если Telegram, то пишите *@Название*\n👉 Если другие ссылки, то начинайте с *https://*",
        next: "contact",
    },
    contact: {
        message: "🛜 Введите контакт (ПГ / ПГО / Любой другой контакт для связи):",
        next: null,
    },
};
// Команды для начала
bot.command("start", async (ctx) => {
    resetSession(ctx);
    await ctx.reply("Добро пожаловать! Выберите действие:", {
        reply_markup: new grammy_1.InlineKeyboard()
            .text("🔥 Добавить группу 🔥", "add_group")
            .row()
            .text("🔎 Просмотр групп", "view_groups")
            .row()
            .text("🗑 Удалить группу", "delete_group")
            .row()
            .url("👥 Канал, где будет ваша группа", "https://t.me/trust_unity")
            .row()
            .url("🌐 Сайт, где будет ваша группа", "https://ppros.vercel.app/")
            .row()
            .text("🔸 Вся информация о боте 🔸", "show_text"),
    });
});
// Обработчик нажатий на инлайн-кнопки
bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data === "show_text") {
        await ctx.answerCallbackQuery();
        await ctx.reply("Бот постит группы на канале (-100238792451), что это говорит вам?\n\n- Это значит, что он может сразу в несколько каналов присылать информацию, так как он не привязан к одному каналу.\n\nПодробная информация об этом можете узнать у меня, и возможно, подключить бота к себе на канал.\n\nКонтакт: @legion_free\n\nИсходный код проекта https://github.com/proxima812/-msg_5bot", { parse_mode: "HTML" });
    }
    if (data === "add_group") {
        resetSession(ctx);
        ctx.session.step = "name";
        await ctx.reply(steps.name.message);
    }
    if (data === "view_groups") {
        await viewGroups(ctx);
    }
    if (data === "delete_group") {
        ctx.session.step = "delete";
        await ctx.reply("Введите ID группы, которую хотите удалить:");
    }
});
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
// Функция для просмотра всех групп
async function viewGroups(ctx) {
    try {
        const { data, error } = await supabase.from("groups").select("*");
        if (error)
            throw error;
        if (data && data.length > 0) {
            let message = "📝 Список групп:\n";
            data.forEach((group, index) => {
                message += `\n*${index + 1}* - ${group.name} (ID: ${group.id})`;
            });
            await ctx.reply(message, { parse_mode: "Markdown" });
        }
        else {
            await ctx.reply("Группы не найдены.");
        }
    }
    catch (error) {
        console.error("Ошибка при получении групп:", error);
        await ctx.reply("Произошла ошибка при получении групп.");
    }
}
// Функция для удаления группы
bot.on("message:text", async (ctx) => {
    const step = ctx.session.step;
    if (step === "delete") {
        const groupId = ctx.message.text.trim();
        try {
            const { data, error } = await supabase.from("groups").delete().eq("id", groupId);
            if (error)
                throw error;
            if (data && data.length > 0) {
                await ctx.reply(`Группа с ID ${groupId} успешно удалена.`);
            }
            else {
                await ctx.reply("Группа с таким ID не найдена.");
            }
        }
        catch (error) {
            console.error("Ошибка при удалении группы:", error);
            await ctx.reply("Произошла ошибка при удалении группы.");
        }
        ctx.session.step = undefined;
    }
    // Прочие шаги добавления группы
    const currentStep = steps[step];
    if (!step || !(step in steps))
        return;
    if (currentStep.validate) {
        const validationResult = currentStep.validate(ctx.message.text.trim());
        if (validationResult !== true) {
            await ctx.reply(validationResult);
            return;
        }
    }
    ctx.session.groupData[step] = ctx.message.text.trim();
    ctx.session.step = currentStep.next;
    if (currentStep.next) {
        await ctx.reply(steps[currentStep.next].message);
    }
    else {
        const { name, community, time, format, description, link, contact } = ctx.session.groupData;
        const message = `🍀 *Название:* ${escapeMarkdown(name)}\n` +
            (community ? `👥 *Сообщество:* ${escapeMarkdown(community)}\n` : "") +
            (time ? `⏰ *Время:* ${escapeMarkdown(time)}\n` : "") +
            (format ? `♨ *Формат:* ${escapeMarkdown(format)}\n` : "") +
            (description ? `✨ *Описание:* ${escapeMarkdown(description)}\n` : "") +
            (contact ? `🛜 *Контакт:* ${escapeMarkdown(contact)}\n` : "") +
            (link ? `🌐 *Ссылка:* ${escapeMarkdown(link)}` : "");
        try {
            const { error } = await supabase
                .from("groups")
                .insert([{ name, community, time, format, description, link, contact }]);
            if (error)
                throw error;
            await bot.api.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" });
            await ctx.reply("*Группа успешно добавлена 🎉*\nВернуться в меню /start", {
                reply_markup: new grammy_1.InlineKeyboard().url("Смотреть", "https://t.me/trust_unity"),
            });
            ctx.session.groupData = {};
            ctx.session.step = undefined;
        }
        catch (error) {
            console.error("Ошибка при добавлении группы:", error);
            await ctx.reply("Произошла ошибка. Попробуйте позже.");
        }
    }
});
bot.start();
