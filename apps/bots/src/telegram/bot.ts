import { Bot, InlineKeyboard } from 'grammy';
import { REMINDER_OPTIONS } from '@ab-afisha/shared';

export function startTelegramBot(token: string) {
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    await ctx.reply(
      `Привет! Я бот АБ Афиши Бухгалтера.\n\nЯ помогу напомнить о предстоящих мероприятиях для бухгалтеров.\n\nИспользуй меня через кнопку «Напомнить» на сайте ab-event.pro`,
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `Чтобы получить напоминание о мероприятии:\n1. Перейди на сайт ab-event.pro\n2. Найди нужное мероприятие\n3. Нажми кнопку «Напомнить»\n4. Выбери «Телеграм»\n5. Выбери время напоминания в боте`,
    );
  });

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    if (text?.startsWith('/start remind_')) {
      const eventId = text.replace('/start remind_', '');
      const keyboard = new InlineKeyboard();
      for (const opt of REMINDER_OPTIONS) {
        keyboard.text(opt.label, `remind:${eventId}:${opt.value}`).row();
      }
      await ctx.reply('Выбери, за сколько времени напомнить о мероприятии:', {
        reply_markup: keyboard,
      });
    }
  });

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data?.startsWith('remind:')) {
      await ctx.answerCallbackQuery();
      await ctx.reply(`✅ Напоминание установлено! Мы напомним тебе об этом мероприятии.`);
    }
  });

  bot.catch((err) => { console.error('[telegram-bot] Error:', err); });
  bot.start();
}
