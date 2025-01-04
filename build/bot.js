"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse_mode_1 = require("@grammyjs/parse-mode");
const supabase_js_1 = require("@supabase/supabase-js");
const grammy_1 = require("grammy");
const supabase = (0, supabase_js_1.createClient)("https://fkwivycaacgpuwfvozlp.supabase.co", process.env.SP_API_SECRET);
const token = process.env.TOKEN;
if (!token)
    throw new Error("TOKEN is unset");
const bot = new grammy_1.Bot(token);
const CHANNEL_ID = "-1002387924511";
bot.use((0, grammy_1.session)({ initial: () => ({ groupData: {} }) })); // для сессий
bot.use(parse_mode_1.hydrateReply); // для гидратирования ответов
bot.api.config.use((0, parse_mode_1.parseMode)("Markdown")); // для установки режима парсинга по умолчанию
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
bot.command("start", async (ctx) => {
    resetSession(ctx);
    await ctx.reply("Добро пожаловать! Выберите действие:", {
        reply_markup: new grammy_1.InlineKeyboard()
            .text("🔥 Добавить группу 🔥", "add_group")
            .row()
            .url("👥 Канал, где будет ваша группа", "https://t.me/trust_unity")
            .row()
            .url("🌐 Сайт, где будет ваша группа", "https://ppros.vercel.app/")
            .row()
            .text("🔸 Вся информация о боте 🔸", "show_text"),
    });
});
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
});
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
bot.on("message:text", async (ctx) => {
    const step = ctx.session.step;
    if (!step || !(step in steps))
        return;
    const currentStep = steps[step];
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
            await supabase
                .from("groups")
                .insert([{ name, community, time, format, description, link, contact }]);
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
exports.default = (0, grammy_1.webhookCallback)(bot, "https");
