const RSS_FEEDS = [
  "https://www.digi24.ro/rss",
  "https://hotnews.ro/feed",
  "https://sibiunews.net/feed/",
  "https://adevarul.ro/rss/index",
  "https://rss.stirileprotv.ro/",
  "https://www.ziare.com/rss/actualitate.xml",
  "https://jurnalul.ro/rss",
  "https://www.gsp.ro/rss.xml",
  "https://www.ct100.ro/feed/",
  "https://www.biziday.ro/feed/",
  "https://newsbucuresti.ro/feed/",
  "https://b365.ro/feed/",
  //"http://www.tvr.ro/rss/stiri.xml",
  "https://gokid.ro/feed/",
  "https://www.businessmagazin.ro/rss-feed.xml",
  "https://economedia.ro/feed",

  // ДОДАТКОВІ ДЖЕРЕЛА
  "https://www.romania-actualitati.ro/rss",
  "https://ziare.com/feed/",
 // "https://www.mediafax.ro/rss",
  "https://euronews.ro/rss",
  "https://observatornews.ro/rss",
  "https://www.news.ro/rss",
  "https://www.edupedu.ro/feed",
  // "https://www.rador.ro/feed",
  //"https://www.cotidianul.ro/feed",
  "https://citate.juridice.ro/feed",
  //"https://www.profit.ro/rss",
  "https://buletin.de/feed",
  "https://www.libertatea.ro/feed",
  "https://www.zf.ro/rss",
  "https://www.bursa.ro/titluri-bursa.xml",
  // "https://www.economica.net/feed",
  // "https://ziarullumina.ro/rss",
  // "https://basilica.ro/feed/",
  "https://www.newsbucovina.ro/feed",
  // "https://www.ziaruldeiasi.ro/rss",
  // "https://www.stiridecluj.ro/rss.xml",
  // "https://bizbrasov.ro/feed/",
  // "https://zch.ro/feed/",
  // "https://observatorconstanta.ro/rss",
  // "https://www.ctnews.ro/feed/",
  // "https://www.idevice.ro/feed/",
  "https://www.romania-insider.com/feed",
  // "https://www.radioromaniacultural.ro/rss"
];

const GEMINI_MODEL = "gemini-3.1-flash-lite";

const CHECK_EVERYTHING_LIMIT = 10;
const RSS_CHECK_LIMIT = 10

// Слоти публікації.
// 09:25 навмисно немає, як ти просила.
const PUBLISH_SLOTS = [
  "08:25",
  "10:25",
  "11:25",
  "12:25",
  "13:25",
  "14:25",
  "15:25",
  "16:25",
  "17:25",
  "18:25",
  "19:25",
  "20:25",
  "21:25",
  "22:00"
];

const TIMEZONE = "Europe/Bucharest";

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === "GET") {
        return new Response(
          "🇷🇴 Romania News Bot працює!"
        );
      }

      if (request.method !== "POST") {
        return new Response("OK");
      }

      const update = await request.json();

      // ==========================================
      // ЗВИЧАЙНІ ПОВІДОМЛЕННЯ
      // ==========================================

      if (update.message) {
        const chatId = update.message.chat.id;

        if (
          String(chatId) !==
          String(env.ADMIN_ID)
        ) {
          return new Response("OK");
        }

        let command =
          update.message.text || "";

        if (command === "🧪 Тест") {
          command = "/test";
        }

        if (command === "🔄 Повторна перевірка") {
          command = "/recheck";
        }

        if (command === "📰 Перевірити зараз") {
          command = "/check";
        }

        if (command === "/start") {
          await setBotCommands(env.BOT_TOKEN);

          const keyboard = {
            keyboard: [
              [
                {
                  text: "📰 Перевірити зараз"
                },
                {
                  text: "🔄 Повторна перевірка"
                }
              ],
              [
                {
                  text: "🧪 Тест"
                }
              ]
            ],
            resize_keyboard: true
          };

          await sendMessage(
            env.BOT_TOKEN,
            chatId,

            "🇷🇴 <b>Romania News Bot</b>\n\n" +
            "Обери потрібну дію:",

            keyboard
          );
        }

        if (command === "/recheck") {

          await sendMessage(
            env.BOT_TOKEN,
            chatId,
            "🔄 <b>Починаю повторну перевірку RSS...</b>\n\n" +
            "Збираю всі матеріали, які раніше були пропущені."
          );

          // Уся довга робота — у фоні.
          ctx.waitUntil(
            (async () => {

              try {

                const news =
                  await collectNewsForRecheck(env);

                if (!news || news.length === 0) {

                  await sendMessage(
                    env.BOT_TOKEN,
                    chatId,
                    "✅ <b>Нових матеріалів для повторної перевірки немає.</b>"
                  );

                  return;
                }

                // Зберігаємо ВСЮ чергу.
                await env.NEWS_KV.put(
                  "recheck:queue",
                  JSON.stringify(news),
                  {
                    expirationTtl:
                      60 * 60 * 24 * 2
                  }
                );

                await env.NEWS_KV.put(
                  "recheck:position",
                  "0",
                  {
                    expirationTtl:
                      60 * 60 * 24 * 2
                  }
                );

                await env.NEWS_KV.put(
                  "recheck:found",
                  "0",
                  {
                    expirationTtl:
                      60 * 60 * 24 * 2
                  }
                );

                await env.NEWS_KV.put(
                  "recheck:checked",
                  "0",
                  {
                    expirationTtl:
                      60 * 60 * 24 * 2
                  }
                );

                await env.NEWS_KV.put(
                  "recheck:active",
                  "1",
                  {
                    expirationTtl:
                      60 * 60 * 24 * 2
                  }
                );

                await sendMessage(
                  env.BOT_TOKEN,
                  chatId,

                  "📰 <b>Чергу створено!</b>\n\n" +
                  "Зібрано матеріалів: <b>" +
                  news.length +
                  "</b>\n\n" +
                  "🔄 Бот тепер автоматично перевірятиме їх частинами.\n" +
                  "Тобі нічого натискати більше не потрібно."
                );

                // Запускаємо першу частину у фоні.
                await processRecheckBatch(env);

              } catch (error) {

                console.error(
                  "RECHECK START ERROR:",
                  error
                );

                await sendMessage(
                  env.BOT_TOKEN,
                  chatId,

                  "❌ <b>Помилка повторної перевірки:</b>\n\n" +
                  "<code>" +
                  escapeHTML(
                    error.message ||
                    String(error)
                  ) +
                  "</code>"
                );
              }

            })()
          );

          // Telegram отримує відповідь одразу.
          return new Response("OK");
        }

        // ==========================================
        // ТЕСТ БОТА
        // ==========================================
        // ==========================================
        // ПЕРЕВІРКА НОВИХ НОВИН
        // ==========================================

        if (command === "/check") {

          // ВАЖЛИВО:
          // довгу перевірку запускаємо у фоні,
          // щоб Telegram одразу отримав відповідь OK.
          ctx.waitUntil(
            (async () => {

              try {

                await runAutomaticBot(env);

                await sendMessage(
                  env.BOT_TOKEN,
                  chatId,

                  "✅ <b>Перевірку завершено.</b>"
                );

              } catch (error) {

                console.error(
                  "MANUAL CHECK ERROR:",
                  error
                );

                await sendMessage(
                  env.BOT_TOKEN,
                  chatId,

                  "❌ <b>Помилка:</b>\n\n" +
                  "<code>" +
                  escapeHTML(
                    error.message ||
                    String(error)
                  ) +
                  "</code>"
                );

              }

            })()
          );

          // Telegram отримує відповідь одразу.
          return new Response("OK");
        }

        if (command === "/test") {

          await sendMessage(
            env.BOT_TOKEN,
            chatId,
            "🧪 <b>Починаю тест...</b>\n\n" +
            "Перевіряю RSS → повний текст → Gemini → новини."
          );

          try {

            const news =
              await collectNewNews(env);

            if (news.length === 0) {
              return new Response("OK");
            }

            let checked = 0;
            let found = 0;

            for (const item of news) {

              if (
                checked >= CHECK_EVERYTHING_LIMIT
              ) {
                break;
              }

              checked++;

              await sendMessage(
                env.BOT_TOKEN,
                chatId,

                "🤖 <b>Перевіряю новину " +
                checked +
                " з " +
                news.length +
                "...</b>\n\n" +

                "🇷🇴 " +
                escapeHTML(item.source) +
                "\n" +

                escapeHTML(item.title)
              );

              // ==========================================
              // ПОВНИЙ ТЕКСТ СТАТТІ
              // ==========================================

              try {

                const articleText =
                  await getArticleText(
                    item.link
                  );

                if (articleText) {
                  item.description =
                    articleText;
                }

              } catch (error) {

                console.error(
                  "ARTICLE TEXT ERROR:",
                  error
                );

              }

              // ==========================================
              // GEMINI
              // ==========================================

              let aiResult;

              try {

                aiResult =
                  await rewriteWithGemini(
                    env.GEMINI_API_KEY,
                    item
                  );

              } catch (error) {

                console.error(
                  "GEMINI ERROR:",
                  error
                );

                await sendMessage(
                  env.BOT_TOKEN,
                  chatId,

                  "⚠️ Помилка Gemini:\n\n" +
                  "<code>" +
                  escapeHTML(
                    error.message ||
                    String(error)
                  ) +
                  "</code>"
                );

                continue;
              }

              if (!aiResult) {
                continue;
              }

              // ==========================================
              // НЕ РУМУНІЯ
              // ==========================================

              if (
                aiResult.isRomania !== true
              ) {

                continue;
              }

              // ==========================================
              // ЗНАЙШЛИ ПІДХОДЯЩУ
              // ==========================================

              found++;

              await sendMessage(
                env.BOT_TOKEN,
                chatId,

                "✅ <b>Знайдено новину для Румунії!</b>\n\n" +
                escapeHTML(item.title)
              );

              // ==========================================
              // ГОТОВА НОВИНА
              // ==========================================

              const prepared = {

                id:
                  item.id,

                title:
                  aiResult.title,

                text:
                  aiResult.text,

                emoji:
                  aiResult.emoji ||
                  "🇷🇴",

                image:
                  item.image ||
                  "",

                link:
                  item.link ||
                  "",

                source:
                  item.source,

                status:
                  "pending",

                createdAt:
                  Date.now()
              };

              // ==========================================
              // КАРТИНКА ЗІ СТАТТІ
              // ==========================================


              if (
                prepared.link &&
                (
                  !prepared.image ||
                  shouldPreferOgImage(
                    prepared.link
                  )
                )
              ) {

                const ogImage =
                  await getOgImage(
                    prepared.link
                  );

                if (ogImage) {
                  prepared.image =
                    ogImage;
                }
              }

              // ==========================================
              // ЗБЕРІГАЄМО
              // ==========================================

              await env.NEWS_KV.put(
                "news:" +
                prepared.id,

                JSON.stringify(
                  prepared
                ),

                {
                  expirationTtl:
                    60 * 60 * 24 * 30
                }
              );

              // ==========================================
              // ВІДПРАВЛЯЄМО НОВИНУ
              // + ОКРЕМО ДЖЕРЕЛО
              // ==========================================

              await sendPreparedNews(
                env,
                prepared
              );

              await sleep(1200);
            }

            // ==========================================
            // ЗАВЕРШЕННЯ ТЕСТУ
            // ==========================================

            await sendMessage(
              env.BOT_TOKEN,
              chatId,

              "🏁 <b>Перевірку завершено.</b>\n\n" +
              "Перевірено: <b>" +
              checked +
              "</b>\n" +
              "Знайдено відповідних новин: <b>" +
              found +
              "</b>"
            );

          } catch (error) {

            console.error(
              "TEST ERROR:",
              error
            );

            await sendMessage(
              env.BOT_TOKEN,
              chatId,

              "❌ <b>Помилка тесту:</b>\n\n" +
              "<code>" +
              escapeHTML(
                error.message ||
                String(error)
              ) +
              "</code>"
            );
          }
        }


        return new Response("OK");
      }

      // ==========================================
      // КНОПКИ
      // ==========================================

      if (update.callback_query) {
        const query =
          update.callback_query;

        const chatId =
          query.message.chat.id;

        const data =
          query.data;

        if (
          String(chatId) !==
          String(env.ADMIN_ID)
        ) {
          return new Response("OK");
        }

        await answerCallback(
          env.BOT_TOKEN,
          query.id
        );

        // ----------------------------------------
        // ПІДТВЕРДИТИ НОВИНУ
        // ----------------------------------------

        if (
          data.startsWith("approve:")
        ) {
          const id =
            data.substring(8);

          await approveNews(
            env,
            chatId,
            id
          );

          return new Response("OK");
        }

        // ----------------------------------------
        // ВІДХИЛИТИ
        // ----------------------------------------

        if (
          data.startsWith("reject:")
        ) {
          const id =
            data.substring(7);

          await rejectNews(
            env,
            chatId,
            id
          );

          return new Response("OK");
        }

        // ----------------------------------------
        // ОПУБЛІКУВАТИ ЗАРАЗ
        // ----------------------------------------

        if (
          data.startsWith("publishnow:")
        ) {

          const id =
            data.substring(11);

          await publishNewsNow(
            env,
            chatId,
            id
          );

          return new Response("OK");
        }


        // ----------------------------------------
        // ВИБІР ЧАСУ
        // ----------------------------------------

        if (
          data.startsWith("slot:")
        ) {
          const parts =
            data.substring(5).split("|");

          const id =
            parts[0];

          const slot =
            parts[1];

          await scheduleNews(
            env,
            chatId,
            id,
            slot
          );

          return new Response("OK");
        }

        // ----------------------------------------
        // СКАСУВАТИ ВИБІР ЧАСУ
        // ----------------------------------------

        if (
          data.startsWith("cancel:")
        ) {
          const id =
            data.substring(7);

          await sendMessage(
            env.BOT_TOKEN,
            chatId,
            "❌ Вибір скасовано."
          );

          return new Response("OK");
        }
      }

      return new Response("OK");

    } catch (error) {
      console.error(
        "FETCH ERROR:",
        error
      );

      return new Response(
        "Internal error",
        {
          status: 500
        }
      );
    }
  },


  // ==========================================
  // CRON
  // ==========================================

  // ==========================================
  // CRON
  // ==========================================

  async scheduled(event, env, ctx) {

    ctx.waitUntil(
      (async () => {

        try {

          // ==========================================
          // 1. СПОЧАТКУ ЗАВЖДИ ПЕРЕВІРЯЄМО НОВІ RSS
          // ==========================================

          await runAutomaticBot(env);


          // ==========================================
          // 2. ПОТІМ — СТАРА RECHECK-ЧЕРГА
          // ==========================================

          const recheckActive =
            await env.NEWS_KV.get(
              "recheck:active"
            );

          if (recheckActive === "1") {

            await processRecheckBatch(
              env
            );

          }

        } catch (error) {

          console.error(
            "CRON ERROR:",
            error
          );

        }

      })()
    );

  }
};


// ==================================================
// АВТОМАТИЧНИЙ ЦИКЛ
// ==================================================

async function runAutomaticBot(env) {

  try {

    // 1. Спочатку публікуємо те,
    //    чий час уже настав.
    await publishDueNews(env);

    // 2. Потім перевіряємо RSS.
    const news =
      await collectNewNews(env);

    if (
      !news ||
      news.length === 0
    ) {
      return;
    }

    let processed = 0;
    let checked = 0;
    let found = 0;
    let rejected = 0;
    let errors = 0;

    for (const item of news) {

      if (
        processed >=
        CHECK_EVERYTHING_LIMIT
      ) {
        break;
      }

      processed++;
      checked++;

            // ==========================================
      // ЗАХИСТ ВІД ТОЧНОГО ДУБЛЯ URL
      // ТА ПАРАЛЕЛЬНИХ CRON
      // ==========================================

      let processingKey = "";

      try {

        const exactUrlSeen =
          await isExactUrlSeen(
            env,
            item.link
          );

        if (exactUrlSeen) {

          console.log(
            "EXACT URL ALREADY SEEN:",
            item.link
          );

          await markNewsSeen(
            env,
            item.id
          );

          continue;
        }


        const alreadyProcessing =
          await isNewsProcessing(
            env,
            item
          );

        if (alreadyProcessing) {

          console.log(
            "NEWS ALREADY PROCESSING:",
            item.link
          );

          continue;
        }


        processingKey =
          await lockNewsProcessing(
            env,
            item
          );

      } catch (error) {

        console.error(
          "PROCESSING LOCK ERROR:",
          error
        );

        // Якщо lock не спрацював,
        // не викидаємо новину.
      }

      // ==========================================
      // ПОВНИЙ ТЕКСТ СТАТТІ
      // ==========================================

      let articleText = "";

      try {

        articleText =
          await getArticleText(
            item.link
          );

      } catch (error) {

        errors++;

        console.error(
          "ARTICLE TEXT ERROR:",
          error?.message || error
        );

        await unlockNewsProcessing(
          env,
          processingKey
        );

        continue;
      }


      if (articleText) {

        item.description =
          articleText;
      }

      // ==========================================
      // GEMINI
      // ==========================================

      let aiResult;

      try {

        aiResult =
          await rewriteWithGemini(
            env.GEMINI_API_KEY,
            item
          );

      } catch (error) {

        errors++;

        console.error(
          "GEMINI ERROR:",
          error?.message || error
        );

        await unlockNewsProcessing(
          env,
          processingKey
        );

        continue;
      }

      if (!aiResult) {

        await unlockNewsProcessing(
          env,
          processingKey
        );

        continue;
      }

      // ==========================================
      // НЕ РУМУНІЯ
      // ==========================================

      if (
        aiResult.isRomania !== true
      ) {

        rejected++;

        await markNewsSeen(
          env,
          item.id
        );

        await markExactUrlSeen(
          env,
          item.link
        );

        await unlockNewsProcessing(
          env,
          processingKey
        );

        continue;
      }


      // ==========================================
      // ГОТОВА НОВИНА
      // ==========================================

      const id =
        item.id;

      const prepared = {

        id,

        title:
          aiResult.title,

        text:
          aiResult.text,

        emoji:
          aiResult.emoji ||
          "🇷🇴",

        image:
          item.image ||
          "",

        link:
          item.link ||
          "",

        source:
          item.source,

        status:
          "pending",

        createdAt:
          Date.now()
      };


      // ==========================================
      // ПЕРЕВІРЯЄМО:
      // ІНША ПОДІЯ ЧИ ДУБЛЬ
      // ==========================================

      const relation = {
        relation: "different"
      };


      // ==========================================
      // ТА САМА ПОДІЯ
      // І НІЧОГО НОВОГО НЕМАЄ
      // ==========================================

      if (
        relation.relation ===
        "same_no_new_details"
      ) {

        console.log(
          "DUPLICATE WITHOUT NEW DETAILS:",
          prepared.title
        );

        await markNewsSeen(
          env,
          item.id
        );

        await markExactUrlSeen(
          env,
          item.link
        );

        await unlockNewsProcessing(
          env,
          processingKey
        );

        continue;
      }


      // ==========================================
      // ТА САМА ПОДІЯ,
      // АЛЕ НОВЕ ДЖЕРЕЛО МАЄ ВАЖЛИВІ ДЕТАЛІ
      // ==========================================

      let isUpdate = false;

      if (
        relation.relation ===
        "same_with_new_details"
      ) {

        isUpdate = true;

        if (relation.title) {

          prepared.title =
            lowercaseRussiaTerms(
              relation.title
            );
        }

        if (relation.text) {

          prepared.text =
            lowercaseRussiaTerms(
              relation.text
            );
        }

        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,

          "🔄 <b>Знайдено важливе доповнення до попередньої новини.</b>"
        );
      }


      // ==========================================
      // КАРТИНКА
      // ==========================================

      if (
        item.link &&
        (
          !prepared.image ||
          shouldPreferOgImage(
            item.link
          )
        )
      ) {

        try {

          const ogImage =
            await getOgImage(
              item.link
            );

          if (ogImage) {
            prepared.image =
              ogImage;
          }

        } catch (error) {

          console.error(
            "OG IMAGE ERROR:",
            error
          );

          // Стару RSS-картинку НЕ стираємо.
        }
      }


      // ==========================================
      // ЗБЕРІГАЄМО ГОТОВУ ВЕРСІЮ
      // ==========================================

      await env.NEWS_KV.put(
        "news:" + id,

        JSON.stringify(
          prepared
        ),

        {
          expirationTtl:
            60 * 60 * 24 * 30
        }
      );


      // ==========================================
      // НАДСИЛАЄМО ТОБІ
      // ==========================================

      try {

        await sendPreparedNews(
          env,
          prepared
        );

      } catch (error) {

        errors++;

        console.error(
          "SEND PREPARED NEWS ERROR:",
          error
        );

        // Не ставимо seen.
        // Бот зможе повторити спробу.

        await unlockNewsProcessing(
          env,
          processingKey
        );

        continue;
      }


      // ==========================================
      // ЗАПАМ'ЯТОВУЄМО ПОДІЮ
      // ДЛЯ МАЙБУТНІХ ДУБЛІВ
      // ==========================================

      if (
        isUpdate &&
        relation.matchedId
      ) {

        await updateRecentNewsEvent(
          env,
          relation.matchedId,
          prepared
        );

      } else {

        await rememberRecentNews(
          env,
          prepared
        );
      }


      // ==========================================
      // УСПІШНО ОБРОБЛЕНО
      // ==========================================

      found++;

      await markNewsSeen(
        env,
        item.id
      );

      await markExactUrlSeen(
        env,
        item.link
      );

      await unlockNewsProcessing(
        env,
        processingKey
      );


      // Невелика пауза між AI-запитами.
      await sleep(1200); 
    
    }

    // ==========================================
    // ЗВІТ ПРО АВТОМАТИЧНУ ПЕРЕВІРКУ
    // ==========================================

    await sendMessage(
      env.BOT_TOKEN,
      env.ADMIN_ID,

      "🏁 <b>Автоматичну перевірку RSS завершено.</b>\n\n" +

      "📰 Зібрано матеріалів: <b>" +
      news.length +
      "</b>\n" +

      "🤖 Перевірено: <b>" +
      checked +
      "</b>\n" +

      "🇷🇴 Підходящих новин: <b>" +
      found +
      "</b>\n" +

      "❌ Не про Румунію: <b>" +
      rejected +
      "</b>\n" +

      "⚠️ Помилок: <b>" +
      errors +
      "</b>"
    );

  } catch (error) {

    console.error(
      "CRON ERROR:",
      error
    );

  }
}

// ==================================================
// ПОВТОРНА ПЕРЕВІРКА ЧЕРЕЗ ЧЕРГУ
// ==================================================

// ==================================================
// RECHECK — ОБРОБКА ЧЕРГИ ЧАСТИНАМИ
// ==================================================

async function processRecheckBatch(env) {

  try {

    const active =
      await env.NEWS_KV.get(
        "recheck:active"
      );

    if (active !== "1") {
      return;
    }

    const rawQueue =
      await env.NEWS_KV.get(
        "recheck:queue"
      );

    if (!rawQueue) {

      await finishRecheck(env);

      return;
    }

    const queue =
      JSON.parse(rawQueue);

    let position =
      Number(
        await env.NEWS_KV.get(
          "recheck:position"
        ) || "0"
      );

    let checked =
      Number(
        await env.NEWS_KV.get(
          "recheck:checked"
        ) || "0"
      );

    let found =
      Number(
        await env.NEWS_KV.get(
          "recheck:found"
        ) || "0"
      );

    // ==================================================
    // СКІЛЬКИ НОВИН ЗА ОДИН CRON
    // ==================================================

    const BATCH_SIZE = 10;

    const end =
      Math.min(
        position + BATCH_SIZE,
        queue.length
      );

    // ==================================================
    // ОБРОБКА НОВИН
    // ==================================================

    for (
      let i = position;
      i < end;
      i++
    ) {

      const item =
        queue[i];

      checked++;

      // --------------------------------------------------
      // ВАЖЛИВО:
      // одразу запам'ятовуємо позицію.
      // Навіть якщо ця новина потім впаде —
      // назад до неї не повертаємось.
      // --------------------------------------------------

      await env.NEWS_KV.put(
        "recheck:position",
        String(i + 1),
        {
          expirationTtl:
            60 * 60 * 24 * 2
        }
      );

      await env.NEWS_KV.put(
        "recheck:checked",
        String(checked),
        {
          expirationTtl:
            60 * 60 * 24 * 2
        }
      );

      // ==================================================
      // КОЖНА НОВИНА ОКРЕМО
      // ==================================================

      try {

        // --------------------------------------------------
        // ПОВІДОМЛЕННЯ ПРО ПЕРЕВІРКУ
        // --------------------------------------------------

        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,

          "🔄 <b>Повторно перевіряю " +
          checked +
          " з " +
          queue.length +
          "...</b>\n\n" +

          "🇷🇴 " +
          escapeHTML(
            item.source
          ) +
          "\n" +

          escapeHTML(
            item.title
          )
        );

        // --------------------------------------------------
        // GEMINI
        // --------------------------------------------------

        let aiResult = null;

        try {

          aiResult =
            await rewriteWithGemini(
              env.GEMINI_API_KEY,
              item
            );

        } catch (aiError) {

          console.error(
            "GEMINI ITEM ERROR:",
            aiError
          );

          await sendMessage(
            env.BOT_TOKEN,
            env.ADMIN_ID,

            "⚠️ <b>Gemini не зміг перевірити новину.</b>\n\n" +

            escapeHTML(
              aiError.message ||
              String(aiError)
            ) +

            "\n\n➡️ Переходжу до наступної."
          );

          // НЕ ЗУПИНЯЄМО ЧЕРГУ
          continue;
        }

        if (!aiResult) {
          continue;
        }

        // --------------------------------------------------
        // НЕ РУМУНІЯ
        // --------------------------------------------------

        if (
          aiResult.isRomania !== true
        ) {

          continue;
        }

        // --------------------------------------------------
        // ЗНАЙДЕНО
        // --------------------------------------------------

        found++;

        await env.NEWS_KV.put(
          "recheck:found",
          String(found),
          {
            expirationTtl:
              60 * 60 * 24 * 2
          }
        );

        const prepared = {

          id:
            item.id,

          title:
            aiResult.title,

          text:
            aiResult.text,

          emoji:
            aiResult.emoji ||
            "📰",

          image:
            item.image ||
            "",

          link:
            item.link ||
            "",

          source:
            item.source,

          status:
            "pending",

          createdAt:
            Date.now()
        };

        // ==================================================
        // КАРТИНКА
        // ==================================================

        if (
          prepared.link &&
          (
            !prepared.image ||
            shouldPreferOgImage(
              prepared.link
            )
          )
        ) {

          try {

            const ogImage =
              await getOgImage(
                prepared.link
              );

            if (ogImage) {
              prepared.image =
                ogImage;
            }

          } catch (imageError) {

            console.error(
              "IMAGE ERROR:",
              imageError
            );

            // RSS-картинку залишаємо як запасну.
          }
        }

        // ==================================================
        // ЗБЕРІГАЄМО НОВИНУ
        // ==================================================

        await env.NEWS_KV.put(
          "news:" +
          prepared.id,

          JSON.stringify(
            prepared
          ),

          {
            expirationTtl:
              60 * 60 * 24 * 3
          }
        );

        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,

          "✅ <b>Знайдено новину для Румунії!</b>"
        );

        // ==================================================
        // ВІДПРАВКА ГОТОВОЇ НОВИНИ
        // ==================================================

        try {

          await sendPreparedNews(
            env,
            prepared
          );

        } catch (sendError) {

          console.error(
            "SEND NEWS ERROR:",
            sendError
          );

          await sendMessage(
            env.BOT_TOKEN,
            env.ADMIN_ID,

            "⚠️ Не вдалося відправити готову новину.\n\n" +
            "➡️ Переходжу до наступної."
          );
        }

        // ==================================================
        // ДЖЕРЕЛО ОКРЕМИМ ПОВІДОМЛЕННЯМ
        // ==================================================

        if (
          prepared.link
        ) {

          try {

            await sendMessage(
              env.BOT_TOKEN,
              env.ADMIN_ID,

              "🔗 <b>Джерело новини:</b>\n\n" +
              escapeHTML(
                prepared.link
              )
            );

          } catch (sourceError) {

            console.error(
              "SOURCE ERROR:",
              sourceError
            );
          }
        }

      } catch (itemError) {

        // ==================================================
        // ПОМИЛКА ОДНІЄЇ НОВИНИ
        // ==================================================

        console.error(
          "RECHECK ITEM ERROR:",
          itemError
        );

        try {

          await sendMessage(
            env.BOT_TOKEN,
            env.ADMIN_ID,

            "⚠️ <b>Новину пропущено через помилку:</b>\n\n" +

            "<code>" +
            escapeHTML(
              itemError.message ||
              String(itemError)
            ) +
            "</code>\n\n" +

            "➡️ Переходжу до наступної."
          );

        } catch (messageError) {

          console.error(
            "ERROR MESSAGE FAILED:",
            messageError
          );
        }

        // ГОЛОВНЕ:
        // НЕ return!
        // Йдемо до наступної новини.
        continue;
      }

      // Невелика пауза.
      await sleep(500);
    }

    // ==================================================
    // ЧЕРГА ЗАКІНЧИЛАСЯ
    // ==================================================

    if (
      end >= queue.length
    ) {

      await finishRecheck(
        env
      );

      return;
    }

    // ==================================================
    // ЗБЕРІГАЄМО ПРОГРЕС
    // ==================================================

    await sendMessage(
      env.BOT_TOKEN,
      env.ADMIN_ID,

      "📦 <b>Частину черги перевірено.</b>\n\n" +

      "🔎 Перевірено: <b>" +
      end +
      " / " +
      queue.length +
      "</b>\n" +

      "🇷🇴 Знайдено для Румунії: <b>" +
      found +
      "</b>\n\n" +

      "▶️ Продовжу автоматично."
    );

  } catch (error) {

    // ==================================================
    // ПОМИЛКА ВСЬОГО ПАКЕТА
    // ==================================================

    console.error(
      "RECHECK BATCH ERROR:",
      error
    );

    try {

      await sendMessage(
        env.BOT_TOKEN,
        env.ADMIN_ID,

        "⚠️ <b>Помилка пакета повторної перевірки.</b>\n\n" +

        "<code>" +
        escapeHTML(
          error.message ||
          String(error)
        ) +
        "</code>\n\n" +

        "🔄 Черга залишилася активною. Наступний Cron спробує продовжити."
      );

    } catch (messageError) {

      console.error(
        "BATCH ERROR MESSAGE FAILED:",
        messageError
      );
    }
  }
}

// ==================================================
// ЗАВЕРШЕННЯ ПОВТОРНОЇ ПЕРЕВІРКИ
// ==================================================

async function finishRecheck(env) {

  const checked =
    Number(
      await env.NEWS_KV.get(
        "recheck:checked"
      ) || "0"
    );

  const found =
    Number(
      await env.NEWS_KV.get(
        "recheck:found"
      ) || "0"
    );

  await env.NEWS_KV.delete(
    "recheck:active"
  );

  await env.NEWS_KV.delete(
    "recheck:queue"
  );

  await env.NEWS_KV.delete(
    "recheck:position"
  );

  await env.NEWS_KV.delete(
    "recheck:checked"
  );

  await env.NEWS_KV.delete(
    "recheck:found"
  );

  await sendMessage(
    env.BOT_TOKEN,
    env.ADMIN_ID,

    "🏁 <b>Повторна перевірка завершена!</b>\n\n" +

    "🔎 Перевірено: <b>" +
    checked +
    "</b>\n" +

    "🇷🇴 Знайдено для Румунії: <b>" +
    found +
    "</b>\n\n" +

    "✅ Тепер бот продовжує працювати у звичайному автоматичному режимі."
  );
}

// ==================================================
// RSS
// ==================================================

async function collectNewNews(env, ignoreSeen = false) {

  const result = [];

  const totalBatches =
    Math.ceil(
      RSS_FEEDS.length /
      RSS_CHECK_LIMIT
    );

  const batchIndex =
    Math.floor(
      Date.now() /
      (5 * 60 * 1000)
    ) % totalBatches;

  const startIndex =
    batchIndex *
    RSS_CHECK_LIMIT;

  const feedsToCheck =
    RSS_FEEDS.slice(
      startIndex,
      startIndex +
      RSS_CHECK_LIMIT
    );

 for (const feedUrl of feedsToCheck) {

    try {

      const response = await fetch(
        feedUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 RomaniaNewsBot/1.0",

            "Accept":
              "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
          }
        }
      );

      if (!response.ok) {
        continue;
      }

      const xml = await response.text();

      if (!xml || xml.length < 50) {
        continue;
      }

      const items = parseFeed(xml);

      if (items.length === 0) {
        continue;
      }

      for (const item of items.slice(0, 5)) {

        if (!item.title) {
          continue;
        }

        const id = simpleHash(
          item.link ||
          item.guid ||
          item.title
        );

        // Якщо це звичайна перевірка —
        // пропускаємо вже оброблені.
        //
        // Якщо /recheck —
        // ігноруємо seen та перевіряємо знову.
        if (!ignoreSeen) {

          const seen =
            await env.NEWS_KV.get(
              "seen:" + id
            );

          if (seen) {
            continue;
          }
        }

        result.push({
          id,

          title:
            item.title,

          description:
            item.description || "",

          link:
            item.link || "",

          image:
            item.image || "",

          published:
            item.published || "",

          source:
            getSourceName(feedUrl)
        });
      }

    } catch (error) {

      console.error(
        "RSS ERROR:",
        feedUrl,
        error
      );
    }
  }

  return result;
}

// ==================================================
// НОВА СИСТЕМА ЗАХИСТУ ВІД ДУБЛІКАТІВ
// ==================================================

const RECENT_NEWS_LIMIT = 40;
const DUPLICATE_MAX_AGE =
  3 * 24 * 60 * 60 * 1000;


// ==================================================
// НОРМАЛІЗАЦІЯ URL
// ==================================================

function normalizeNewsUrl(url) {

  if (!url) {
    return "";
  }

  try {

    const u =
      new URL(url);

    // Прибираємо типові рекламні параметри.
    const paramsToDelete = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid"
    ];

    for (
      const param of paramsToDelete
    ) {
      u.searchParams.delete(param);
    }

    u.hash = "";

    // Прибираємо зайвий / у кінці.
    let result =
      u.toString();

    if (
      result.endsWith("/")
    ) {
      result =
        result.slice(0, -1);
    }

    return result.toLowerCase();

  } catch {

    return String(url)
      .trim()
      .toLowerCase()
      .replace(/\/$/, "");
  }
}


// ==================================================
// ЧИ URL ВЖЕ ОБРОБЛЯЄТЬСЯ
// ==================================================

async function isNewsProcessing(
  env,
  item
) {

  if (!item) {
    return false;
  }

  const url =
    normalizeNewsUrl(
      item.link || ""
    );

  const key =
    "processing:" +
    simpleHash(
      url ||
      item.id ||
      item.title
    );

  const existing =
    await env.NEWS_KV.get(
      key
    );

  return existing === "1";
}


// ==================================================
// СТАВИМО ТИМЧАСОВИЙ LOCK
// ==================================================

async function lockNewsProcessing(
  env,
  item
) {

  const url =
    normalizeNewsUrl(
      item.link || ""
    );

  const key =
    "processing:" +
    simpleHash(
      url ||
      item.id ||
      item.title
    );

  await env.NEWS_KV.put(
    key,
    "1",
    {
      // 15 хвилин.
      // Якщо Worker впаде,
      // новина не буде заблокована назавжди.
      expirationTtl:
        60 * 15
    }
  );

  return key;
}


// ==================================================
// ЗНІМАЄМО LOCK
// ==================================================

async function unlockNewsProcessing(
  env,
  key
) {

  if (!key) {
    return;
  }

  try {

    await env.NEWS_KV.delete(
      key
    );

  } catch (error) {

    console.error(
      "UNLOCK NEWS ERROR:",
      error
    );
  }
}


// ==================================================
// ТОЧНО ТАКИЙ URL УЖЕ БУВ
// ==================================================

async function isExactUrlSeen(
  env,
  url
) {

  const normalized =
    normalizeNewsUrl(url);

  if (!normalized) {
    return false;
  }

  const value =
    await env.NEWS_KV.get(
      "urlseen:" +
      simpleHash(normalized)
    );

  return value === "1";
}


async function markExactUrlSeen(
  env,
  url
) {

  const normalized =
    normalizeNewsUrl(url);

  if (!normalized) {
    return;
  }

  await env.NEWS_KV.put(
    "urlseen:" +
    simpleHash(normalized),

    "1",

    {
      expirationTtl:
        60 * 60 * 24 * 30
    }
  );
}


// ==================================================
// ОСТАННІ ПОДІЇ
//
// Зберігаємо одним KV,
// щоб НЕ робити 40-50 KV GET.
// ==================================================

async function getRecentNewsIndex(env) {

  try {

    const raw =
      await env.NEWS_KV.get(
        "recent:news:index"
      );

    if (!raw) {
      return [];
    }

    const data =
      JSON.parse(raw);

    if (!Array.isArray(data)) {
      return [];
    }

    const now =
      Date.now();

    return data.filter(
      item =>
        item &&
        item.createdAt &&
        (
          now -
          item.createdAt
        ) <= DUPLICATE_MAX_AGE
    );

  } catch (error) {

    console.error(
      "RECENT INDEX READ ERROR:",
      error
    );

    return [];
  }
}


// ==================================================
// ЗБЕРІГАЄМО НОВУ ПОДІЮ В ІНДЕКС
// ==================================================

async function rememberRecentNews(
  env,
  prepared
) {

  try {

    let list =
      await getRecentNewsIndex(
        env
      );

    list.unshift({

      id:
        prepared.id,

      title:
        prepared.title || "",

      text:
        prepared.text || "",

      link:
        prepared.link || "",

      source:
        prepared.source || "",

      createdAt:
        Date.now(),

      sources: [
        {
          source:
            prepared.source || "",

          link:
            prepared.link || ""
        }
      ]

    });

    list =
      list.slice(
        0,
        RECENT_NEWS_LIMIT
      );

    await env.NEWS_KV.put(
      "recent:news:index",

      JSON.stringify(list),

      {
        expirationTtl:
          60 * 60 * 24 * 4
      }
    );

  } catch (error) {

    console.error(
      "RECENT INDEX WRITE ERROR:",
      error
    );
  }
}


// ==================================================
// НОРМАЛІЗУЄМО СЛОВА
// ==================================================

function getNewsWords(text) {

  return (
    text || ""
  )
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .split(/\s+/)
    .filter(
      word =>
        word.length >= 4
    );
}


// ==================================================
// ПОПЕРЕДНІЙ ПОШУК МОЖЛИВИХ ДУБЛІВ
//
// Це БЕЗ Gemini.
// ==================================================

function findPossibleDuplicates(
  prepared,
  recent
) {

  const newWords =
    getNewsWords(
      prepared.title
    );

  const newSet =
    new Set(newWords);

  const scored =
    recent.map(
      oldNews => {

        const oldWords =
          getNewsWords(
            oldNews.title
          );

        let matches = 0;

        for (
          const word of oldWords
        ) {

          if (
            newSet.has(word)
          ) {
            matches++;
          }
        }

        const denominator =
          Math.max(
            1,
            Math.min(
              newWords.length,
              oldWords.length
            )
          );

        const score =
          matches /
          denominator;

        return {
          ...oldNews,
          score
        };
      }
    );

  scored.sort(
    (a, b) =>
      b.score - a.score
  );

  // Поріг спеціально невисокий.
  // Остаточно вирішуватиме Gemini.
  return scored
    .filter(
      item =>
        item.score >= 0.18
    )
    .slice(0, 4);
}


// ==================================================
// GEMINI ВИЗНАЧАЄ:
// 1. ІНША ПОДІЯ
// 2. ТА САМА БЕЗ НОВИХ ДЕТАЛЕЙ
// 3. ТА САМА, АЛЕ Є ВАЖЛИВІ НОВІ ФАКТИ
// ==================================================

async function checkNewsRelation(
  env,
  prepared
) {

  const recent =
    await getRecentNewsIndex(
      env
    );

  if (
    recent.length === 0
  ) {

    return {
      relation:
        "different"
    };
  }


  // ==========================================
  // СПОЧАТКУ ТОЧНИЙ URL
  // ==========================================

  const normalizedUrl =
    normalizeNewsUrl(
      prepared.link
    );

  for (
    const oldNews of recent
  ) {

    if (
      normalizedUrl &&
      normalizeNewsUrl(
        oldNews.link
      ) === normalizedUrl
    ) {

      return {
        relation:
          "same_no_new_details",

        matchedId:
          oldNews.id,

        oldNews
      };
    }
  }


  // ==========================================
  // ШУКАЄМО СХОЖИХ КАНДИДАТІВ
  // ==========================================

  const candidates =
    findPossibleDuplicates(
      prepared,
      recent
    );

  if (
    candidates.length === 0
  ) {

    return {
      relation:
        "different"
    };
  }


  const comparisonText =
    candidates
      .map(
        (item, index) => {

          return (

            "\n============================\n" +

            "КАНДИДАТ " +
            (index + 1) +
            "\n" +

            "ID: " +
            item.id +
            "\n\n" +

            "ЗАГОЛОВОК:\n" +
            item.title +
            "\n\n" +

            "ТЕКСТ:\n" +
            (
              item.text || ""
            ).slice(
              0,
              5500
            ) +

            "\n\nДЖЕРЕЛО:\n" +
            (
              item.source || ""
            )
          );

        }
      )
      .join("\n");


  const prompt = `

Ти працюєш редактором новин.

Тобі потрібно визначити,
чи описує НОВА НОВИНА ту саму
КОНКРЕТНУ ПОДІЮ, що одна із
попередніх новин.

ЦЕ ДУЖЕ ВАЖЛИВО:

Схожа тема НЕ означає дубль.

Наприклад:

"Уряд підвищив податок сьогодні"

і

"Уряд планує змінити податок наступного року"

— це РІЗНІ новини.


==================================================
МОЖЛИВІ РЕЗУЛЬТАТИ
==================================================

1.

relation = "different"

Якщо це інша подія,
інше рішення,
інша дата,
інший інцидент,
інша заява
або просто схожа тема.


2.

relation = "same_no_new_details"

Якщо це ТА САМА конкретна подія
і нова стаття НЕ містить важливих
фактів, яких не було в попередній.


3.

relation = "same_with_new_details"

Якщо це ТА САМА конкретна подія,
АЛЕ нова стаття містить важливу
додаткову інформацію.


==================================================
ЩО ВВАЖАТИ ВАЖЛИВИМИ НОВИМИ ДЕТАЛЯМИ
==================================================

Наприклад:

- нові суми;
- конкретні ціни;
- тарифи;
- відсотки;
- статистика;
- точні дати;
- точний час;
- адреси;
- маршрути;
- номери автобусів/поїздів;
- кількість постраждалих;
- кількість людей;
- нові умови;
- винятки;
- строки;
- дедлайни;
- важливі цитати або рішення;
- причини;
- наслідки;
- програма заходу;
- артисти;
- ціни на квитки;
- зміни руху;
- інші конкретні факти,
  яких НЕ було у старій новині.


НЕ вважай новою важливою деталлю:

- інше формулювання тієї ж інформації;
- більше "води";
- красивіший опис;
- інший порядок речень;
- повтор уже відомих цифр.


==================================================
ЯКЩО Є НОВІ ДЕТАЛІ
==================================================

Якщо relation =
"same_with_new_details",

створи ОНОВЛЕНУ повну версію новини.

Об'єднай:

1. важливу інформацію
   з попередньої новини;

2. нові важливі факти
   з нової новини.

НЕ вигадуй нічого.

Не видаляй корисні конкретні
цифри зі старої версії.

Пиши природною українською.

Не використовуй службові підзаголовки
на кшталт:

"Основні факти"
"Ключові деталі"
"Що відомо"
"Основні події"

Текст повинен виглядати як
нормальна Telegram-новина.


==================================================
РОСІЯ
==================================================

росія, рф, москва, путін,
кремль та похідні слова
пиши з маленької літери.


==================================================
ФОРМАТ
==================================================

Поверни ТІЛЬКИ JSON.

Якщо інша подія:

{
  "relation": "different",
  "matchedId": "",
  "newFacts": [],
  "title": "",
  "text": ""
}

Якщо та сама без нових фактів:

{
  "relation": "same_no_new_details",
  "matchedId": "ID",
  "newFacts": [],
  "title": "",
  "text": ""
}

Якщо та сама з важливими новими фактами:

{
  "relation": "same_with_new_details",
  "matchedId": "ID",
  "newFacts": [
    "факт 1",
    "факт 2"
  ],
  "title": "оновлений заголовок",
  "text": "оновлений повний текст"
}


==================================================
НОВА НОВИНА
==================================================

ЗАГОЛОВОК:

${prepared.title}


ТЕКСТ:

${(
  prepared.text || ""
).slice(0, 6500)}


==================================================
ПОПЕРЕДНІ НОВИНИ
==================================================

${comparisonText}
`;


  try {

    const response =
      await fetchWithTimeout(

        "https://generativelanguage.googleapis.com/v1beta/models/" +
        GEMINI_MODEL +
        ":generateContent?key=" +
        encodeURIComponent(
          env.GEMINI_API_KEY
        ),

        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              contents: [
                {
                  parts: [
                    {
                      text:
                        prompt
                    }
                  ]
                }
              ]

            })
        },

        20000
      );


    const responseText =
      await response.text();


    if (!response.ok) {

      console.error(
        "NEWS RELATION GEMINI ERROR:",
        response.status,
        responseText
      );

      // ВАЖЛИВО:
      // якщо Gemini не працює —
      // НЕ викидаємо новину.

      return {
        relation:
          "different"
      };
    }


    const data =
      JSON.parse(
        responseText
      );


    const text =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;


    if (!text) {

      return {
        relation:
          "different"
      };
    }


    let result;

    try {

      result =
        JSON.parse(
          cleanJson(text)
        );

    } catch (error) {

      console.error(
        "NEWS RELATION JSON ERROR:",
        text
      );

      return {
        relation:
          "different"
      };
    }


    const allowed =
      [
        "different",
        "same_no_new_details",
        "same_with_new_details"
      ];


    if (
      !allowed.includes(
        result.relation
      )
    ) {

      return {
        relation:
          "different"
      };
    }


    return result;

  } catch (error) {

    console.error(
      "NEWS RELATION ERROR:",
      error
    );

    // Ніколи не губимо новину
    // через помилку перевірки дубля.

    return {
      relation:
        "different"
    };
  }
}


// ==================================================
// ОНОВЛЮЄМО ПОДІЮ В RECENT INDEX
// ==================================================

async function updateRecentNewsEvent(
  env,
  matchedId,
  prepared
) {

  try {

    let list =
      await getRecentNewsIndex(
        env
      );


    const index =
      list.findIndex(
        item =>
          String(item.id) ===
          String(matchedId)
      );


    if (index === -1) {

      await rememberRecentNews(
        env,
        prepared
      );

      return;
    }


    const old =
      list[index];


    const sources =
      Array.isArray(
        old.sources
      )
        ? old.sources
        : [];


    const normalizedNew =
      normalizeNewsUrl(
        prepared.link
      );


    const alreadyExists =
      sources.some(
        item =>
          normalizeNewsUrl(
            item.link
          ) ===
          normalizedNew
      );


    if (
      !alreadyExists
    ) {

      sources.push({
        source:
          prepared.source || "",

        link:
          prepared.link || ""
      });
    }


    list[index] = {

      ...old,

      title:
        prepared.title ||
        old.title,

      text:
        prepared.text ||
        old.text,

      createdAt:
        Date.now(),

      sources
    };


    await env.NEWS_KV.put(
      "recent:news:index",

      JSON.stringify(
        list.slice(
          0,
          RECENT_NEWS_LIMIT
        )
      ),

      {
        expirationTtl:
          60 * 60 * 24 * 4
      }
    );

  } catch (error) {

    console.error(
      "UPDATE RECENT EVENT ERROR:",
      error
    );
  }
}

async function markNewsSeen(env, id) {

  await env.NEWS_KV.put(
    "seen:" + id,
    "1",
    {
      expirationTtl:
        60 * 60 * 24 * 30
    }
  );
}

// ==================================================
// ОТРИМАННЯ ПОВНОГО ТЕКСТУ СТАТТІ
// ==================================================

async function getArticleText(url) {

  if (!url) {
    return "";
  }

  try {

    const response =
      await fetch(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; RomaniaNewsBot/1.0)",
            "Accept":
              "text/html,application/xhtml+xml"
          }
        }
      );

    if (!response.ok) {
      console.error(
        "ARTICLE HTTP ERROR:",
        response.status,
        url
      );

      return "";
    }

    const html =
      await response.text();

    if (!html) {
      return "";
    }

    // Видаляємо непотрібні частини сторінки.
    let text =
      html
        .replace(
          /<script[\s\S]*?<\/script>/gi,
          " "
        )
        .replace(
          /<style[\s\S]*?<\/style>/gi,
          " "
        )
        .replace(
          /<noscript[\s\S]*?<\/noscript>/gi,
          " "
        )
        .replace(
          /<svg[\s\S]*?<\/svg>/gi,
          " "
        )
        .replace(
          /<nav[\s\S]*?<\/nav>/gi,
          " "
        )
        .replace(
          /<footer[\s\S]*?<\/footer>/gi,
          " "
        )
        .replace(
          /<header[\s\S]*?<\/header>/gi,
          " "
        );

    // Спробуємо спочатку знайти основний текст статті.
    const articleMatch =
      html.match(
        /<article\b[^>]*>([\s\S]*?)<\/article>/i
      );

    if (articleMatch) {
      text =
        articleMatch[1]
          .replace(
            /<script[\s\S]*?<\/script>/gi,
            " "
          )
          .replace(
            /<style[\s\S]*?<\/style>/gi,
            " "
          )
          .replace(
            /<[^>]+>/g,
            " "
          );
    } else {

      // Якщо <article> немає,
      // використовуємо весь очищений HTML.
      text =
        text.replace(
          /<[^>]+>/g,
          " "
        );
    }

    text =
      decodeEntities(text)
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    // Відкидаємо зовсім короткий результат.
    if (text.length < 300) {
      return "";
    }

    // Gemini не потрібно передавати величезну сторінку
    // разом з меню, рекламою та іншими елементами.
    return text.slice(0, 25000);

  } catch (error) {

    console.error(
      "GET ARTICLE TEXT ERROR:",
      error
    );

    return "";
  }
}

// ==================================================
// FETCH З ТАЙМАУТОМ
// ==================================================

async function fetchWithTimeout(
  url,
  options = {},
  timeout = 8000
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal: controller.signal
      }
    );
  } finally {
    clearTimeout(timer);
  }
}



// ==================================================
// GEMINI
// ==================================================
function lowercaseRussiaTerms(text) {

  if (!text) {
    return text;
  }

  return text
    .replace(/\bРосія\b/g, "росія")
    .replace(/\bРосії\b/g, "росії")
    .replace(/\bРосією\b/g, "росією")
    .replace(/\bРосію\b/g, "росію")
    .replace(/\bРФ\b/g, "рф")
    .replace(/\bРосійський\b/g, "російський")
    .replace(/\bРосійська\b/g, "російська")
    .replace(/\bРосійське\b/g, "російське")
    .replace(/\bРосійські\b/g, "російські")
    .replace(/\bРосійського\b/g, "російського")
    .replace(/\bРосійської\b/g, "російської")
    .replace(/\bРосійських\b/g, "російських")
    .replace(/\bМосква\b/g, "москва")
    .replace(/\bМоскви\b/g, "москви")
    .replace(/\bМосквою\b/g, "москвою")
    .replace(/\bМоскву\b/g, "москву")
    .replace(/\bМосковський\b/g, "московський")
    .replace(/\bМосковська\b/g, "московська")
    .replace(/\bМосковське\b/g, "московське")
    .replace(/\bМосковські\b/g, "московські")
    .replace(/\bПутін\b/g, "путін")
    .replace(/\bПутіна\b/g, "путіна")
    .replace(/\bПутіну\b/g, "путіну")
    .replace(/\bПутіним\b/g, "путіним")
    .replace(/\bКремль\b/g, "кремль")
    .replace(/\bКремля\b/g, "кремля")
    .replace(/\bКремлю\b/g, "кремлю")
    .replace(/\bКремлем\b/g, "кремлем")
    .replace(/\bРосійська Федерація\b/g, "російська федерація");

}


async function rewriteWithGemini(
  apiKey,
  item
) {

  const prompt = `
Ти — редактор українського Telegram-каналу про Румунію.

Проаналізуй новину та визнач, чи варто її публікувати.

==================================================
1. ЧИ ПІДХОДИТЬ НОВИНА
==================================================

ВАЖЛИВО:
Новина має бути безпосередньо цікава або корисна людям у Румунії.

YES, якщо:
- подія відбувається в Румунії;
- новина стосується уряду, президента, парламенту або місцевої влади Румунії;
- румунські закони, податки, правила або документи;
- дороги, транспорт, школи, медицина, ціни, зарплати;
- румунські компанії, банки, магазини або оператори;
- новина стосується українців чи інших іноземців у Румунії;
- рішення ЄС безпосередньо впливає на Румунію;
- міжнародна подія має конкретний вплив на Румунію.

NO, якщо:
- новина виключно про іншу країну;
- Румунія лише побіжно згадується;
- немає практичного зв'язку з Румунією.

НЕ ВВАЖАЙ новину румунською тільки через те, що її опублікувало румунське медіа.


==================================================
2. АКТУАЛЬНІСТЬ, ДАТИ ТА ДНІ ТИЖНЯ
==================================================

ОБОВ'ЯЗКОВО орієнтуйся ТІЛЬКИ на дату, час і день тижня, які прямо вказані у вихідному матеріалі.

НЕ вигадуй нову дату.

НЕ замінюй дату події на поточну дату.

НЕ обчислюй самостійно день тижня за датою.

НЕ обчислюй самостійно дату за днем тижня.

ЦЕ ДУЖЕ ВАЖЛИВО:

Якщо у джерелі написано тільки:
"у понеділок"

— пиши "у понеділок".
НЕ додавай самостійно число, місяць або дату.

Якщо у джерелі написано тільки:
"14 вересня"

— пиши "14 вересня".
НЕ додавай самостійно "понеділок", "вівторок" тощо.

Формат на кшталт:
"у понеділок, 14 вересня"

можна використовувати ТІЛЬКИ якщо і "понеділок", і "14 вересня" прямо присутні у вихідному матеріалі та стосуються однієї й тієї самої події.

НЕ намагайся перевіряти календар у пам'яті.
НЕ виправляй день тижня самостійно.
НЕ підставляй день тижня на основі власних розрахунків.

Якщо у вихідному матеріалі одночасно вказані день тижня і дата, але вони здаються тобі суперечливими або ти не впевнений у їх відповідності — використовуй конкретну ДАТУ, а день тижня опусти.

Наприклад:

Джерело:
"Evenimentul va avea loc luni, 14 septembrie."

Якщо ти не впевнений, чи 14 вересня справді понеділок, напиши:
"Захід відбудеться 14 вересня."

НЕ пиши інший день тижня.
НЕ змінюй число.

Якщо у вихідному матеріалі вказана конкретна дата події, початку дії правила, зміни тарифу, обмеження руху, фестивалю, ярмарку тощо — ОБОВ'ЯЗКОВО збережи цю дату у готовій новині.

Якщо відомий точний час — також збережи його.

Якщо новина стосується майбутньої події, чітко поясни, КОЛИ вона відбудеться, але тільки на основі даних із джерела.

НЕ пиши вигадані дати, дні тижня або їхні комбінації.


==================================================
3. ДЕТАЛІ — ЦЕ ДУЖЕ ВАЖЛИВО
==================================================

Не роби поверхневий переказ.

Твоє завдання — витягнути з вихідного матеріалу ВСІ важливі конкретні факти.

ОСОБЛИВО НЕ МОЖНА ПРОПУСКАТИ:

- конкретні суми;
- ціни;
- тарифи;
- відсотки;
- кількість людей;
- кількість грошей;
- дати;
- час;
- адреси;
- назви місць;
- маршрути;
- номери автобусів, трамваїв, поїздів тощо;
- назви установ;
- назви компаній;
- умови;
- терміни;
- зміни порівняно з попередньою ситуацією;
- причини;
- наслідки;
- обмеження;
- правила;
- важливі винятки.

Якщо у вихідній статті написано:

"тариф зросте з 1,3 до 1,6 лея"

НЕ можна написати просто:

"тариф на електроенергію зросте."

Потрібно написати:

"тариф зросте з 1,3 до 1,6 лея"

Якщо у статті вказані конкретні маршрути громадського транспорту — ОБОВ'ЯЗКОВО вкажи ці маршрути.

Якщо вказано місце проведення заходу — ОБОВ'ЯЗКОВО вкажи його.

Якщо вказані дата та час — ОБОВ'ЯЗКОВО вкажи їх.

Якщо вказана вартість квитків — ОБОВ'ЯЗКОВО вкажи її.

НЕ замінюй конкретні факти загальними фразами.


==================================================
4. ФЕСТИВАЛІ, ЯРМАРКИ, КОНЦЕРТИ ТА ІНШІ ЗАХОДИ
==================================================

Для подій та заходів інформація повинна бути максимально практичною.

Якщо ці дані є у вихідному матеріалі, обов'язково вкажи:

- що це за захід;
- точні дати;
- місце проведення;
- місто;
- адресу або конкретну локацію;
- час початку;
- основних учасників/артистів;
- програму;
- ціни на квитки;
- де купити квитки;
- транспорт;
- зміни руху;
- правила входу;
- заборонені предмети;
- інші важливі умови.

НЕ пиши просто:

"У Бухаресті відбудеться фестиваль."

Потрібно пояснити:
КОЛИ, ДЕ, ЩО ТАМ БУДЕ та ЩО ВАЖЛИВО ЗНАТИ ВІДВІДУВАЧАМ.

Звичайно, використовуй тільки інформацію, яка є у вихідному матеріалі.


==================================================
5. ТРАНСПОРТ ТА ОБМЕЖЕННЯ РУХУ
==================================================

Якщо новина стосується транспорту або перекриття дороги, обов'язково вкажи:

- дату;
- час;
- точне місце;
- які дороги або вулиці перекривають;
- які маршрути змінюються;
- номери маршрутів;
- як саме змінюється рух;
- альтернативні маршрути, якщо вони вказані;
- причину обмежень;
- коли рух має відновитися.

НЕ пиши загальне:

"Рух буде обмежено, водіям радять бути уважними."

Якщо у джерелі є конкретна інформація — її потрібно передати.


==================================================
6. ЦІНИ, ТАРИФИ ТА ГРОШІ
==================================================

Якщо новина стосується грошей, цін, тарифів, податків, зарплат або виплат:

ОБОВ'ЯЗКОВО вкажи всі важливі цифри з джерела.

Особливо:
- стару ціну;
- нову ціну;
- розмір підвищення/зниження;
- дату зміни;
- валюту;
- для кого діє зміна;
- винятки;
- додаткові платежі.

НЕ приховуй цифри за загальними формулюваннями.


==================================================
7. РОСІЯ ТА ВСЕ, ЩО З НЕЮ ПОВ'ЯЗАНЕ
==================================================

ЦЕ ЖОРСТКЕ ПРАВИЛО.

У готовому українському тексті слова, пов'язані з росією, ПИШИ З МАЛЕНЬКОЇ ЛІТЕРИ.

Наприклад:

росія
рф
російський
російська
російські
москва
московський
путін
путіна
путіну
кремль
російська влада
російська армія
російські війська

НЕ використовуй:
Росія
РФ
Російський
Москва
Путін
Кремль

Це правило стосується і заголовка, і основного тексту.


==================================================
8. СТИЛЬ
==================================================

Якщо новина підходить:

1. Напиши короткий, але інформативний заголовок українською.
2. Перед заголовком постав ОДИН доречний смайлик відповідно до теми.
3. Не використовуй 🇷🇴 автоматично.
4. Обери смайлик за змістом:
   - політика — 🏛️
   - гроші/економіка — 💶
   - податки — 💰
   - транспорт/дороги — 🚗
   - погода — 🌦️
   - медицина — 🏥
   - освіта — 🎓
   - поліція/злочини — 🚔
   - суди/закони — ⚖️
   - енергетика — ⚡
   - пожежі — 🔥
   - аварії — 🚨
   - міжнародні новини — 🌍
   - ЄС — 🇪🇺
   - технології — 💻
   - спорт — ⚽
   - бізнес — 📈
   - фермерство — 🌾
   - інше — 📰

5. Текст має бути розгорнутим.
6. Не обмежуйся одним-двома реченнями.
6. Виклади основні факти, причину події, що сталося, кого це стосується та які можуть бути наслідки.

7. ОБОВ'ЯЗКОВО використовуй конкретні деталі, якщо вони є у вихідному матеріалі.
   Не скорочуй важливу конкретну інформацію заради стислості.

   Особливо НЕ пропускай:
   - конкретні суми та ціни;
   - відсотки;
   - дати та час;
   - адреси та конкретні місця;
   - назви міст, районів та населених пунктів;
   - номери маршрутів громадського транспорту;
   - назви автобусів, трамваїв, поїздів та інших маршрутів;
   - зміни тарифів та їхні нові значення;
   - штрафи та їхні розміри;
   - зарплати, пенсії, виплати та допомогу;
   - кількість людей, постраждалих, загиблих або учасників;
   - строки та дедлайни;
   - назви законів, програм та державних установ;
   - конкретні умови, обмеження та правила;
   - назви компаній, організацій та інших важливих учасників;
   - будь-які інші цифри або факти, які допомагають зрозуміти новину.

   Якщо у вихідному матеріалі є конкретні дані, вони повинні потрапити у готову новину.

8. Якщо новина стосується події, яка відбудеться у майбутньому, ОБОВ'ЯЗКОВО вкажи:
   - точну дату;
   - час, якщо він є у матеріалі;
   - конкретне місце;
   - що саме відбудеться;
   - кого це стосується;
   - важливі умови, правила або обмеження.

9. Якщо йдеться про фестиваль, концерт, ярмарок, виставку, спортивну подію або інший захід, не пиши загальні фрази на кшталт "насичена програма" або "очікується багато відвідувачів", якщо у вихідному матеріалі є конкретні деталі.
   Натомість вкажи дату, місце проведення, програму, учасників, час, вартість квитків та іншу практичну інформацію, якщо вона є у матеріалі.

10. Якщо йдеться про транспортні зміни, ОБОВ'ЯЗКОВО вкажи конкретні маршрути, номери автобусів/трамваїв/тролейбусів, вулиці, ділянки доріг, час обмежень та альтернативні маршрути, якщо ця інформація є у вихідному матеріалі.

11. Якщо йдеться про ціни, тарифи, податки, штрафи, зарплати, пенсії або виплати, ОБОВ'ЯЗКОВО вкажи конкретні суми, старе та нове значення, дату зміни та кого саме це стосується, якщо такі дані є у вихідному матеріалі.

12. Не вигадуй інформацію, якої немає у вихідному матеріалі.
    Якщо конкретної деталі немає у матеріалі, не вигадуй її.

13. Пиши природною українською мовою.

14. Не згадуй джерело в самому тексті.

15. УСІ назви, пов'язані з росією, пиши з маленької літери.
    Це стосується, зокрема:
    - росія;
    - російський;
    - рф;
    - москва;
    - московський;
    - путін;
    - кремль;
    - російська федерація;
    - назви російських державних органів, якщо вони написані як частина тексту.

    Не використовуй велику літеру для цих назв, навіть якщо вони стоять на початку речення.

16. Якщо у вихідному матеріалі використовується форма "Росія", "РФ", "Москва", "Путін" тощо — у готовому тексті обов'язково заміни її на відповідну форму з маленької літери.

17. Заголовок НЕ повинен містити посилання або Markdown.

18. Якщо ОПИС містить мало інформації, але повний текст статті містить більше конкретних деталей, використовуй саме повний текст статті як основне джерело інформації.


==================================================
9. ВАЖЛИВЕ ПРАВИЛО ПРО ДЖЕРЕЛО
==================================================

Вихідний матеріал може містити короткий опис RSS, але якщо за посиланням є повна стаття, використовуй доступну тобі інформацію з переданого матеріалу.

НЕ вигадуй деталі, яких немає у тексті, який тобі передали.

==================================================
СТРУКТУРА ТЕКСТУ — БЕЗ ШАБЛОННИХ ПІДЗАГОЛОВКІВ
==================================================

Пиши новину як живий журналістський матеріал, а не як звіт або довідку.

ЗАБОРОНЕНО використовувати всередині тексту шаблонні підзаголовки та вступи на кшталт:

- "Основні факти:"
- "Основні факти події:"
- "Основні ключові події:"
- "Ключові факти:"
- "Ключові факти щодо..."
- "Основні показники:"
- "Основні показники діяльності:"
- "Деталі:"
- "Важливі деталі:"
- "Що відомо:"
- "Що потрібно знати:"
- "Головне:"
- "Підсумок:"
- "Висновок:"
- "Причини:"
- "Наслідки:"
- "Ситуація:"
- "Подробиці:"
- "Контекст:"

НЕ створюй такі підзаголовки навіть тоді, коли в новині багато інформації.

Усі факти, цифри, дати, причини, наслідки та деталі потрібно органічно вписувати у звичайні абзаци.

Не перетворюй новину на список фактів.

Не використовуй нумерацію типу:
"1. ..."
"2. ..."
"3. ..."

якщо це не є частиною самої події або джерело прямо не подає інформацію у вигляді списку, який критично важливо зберегти.

Перевага — 3–6 нормальних абзаців із природними переходами між ними.

Кожен абзац має продовжувати розповідь, а не виглядати як окремий пункт звіту.

Наприклад, замість:

"Основні факти події:

1. Дрон біля Бургаса...
2. Інші знахідки...
3. Частини ракети..."

напиши природно:

"У п'ятницю, 14 серпня, болгарські військові виявили безпілотник у морі неподалік Бургаса. Апарат знайшли біля пляжу в населеному пункті Приморсько..."

і далі продовжуй розповідь наступними абзацами.

Важливо: заборона на шаблонні підзаголовки НЕ означає, що потрібно скорочувати текст. Усі важливі факти з вихідного матеріалу все одно потрібно зберегти.

Не використовуй марковані списки, крапки або тире для простого переліку фактів.

Інформацію подавай звичайними абзацами та повними реченнями.

Списки допустимі лише тоді, коли без них неможливо нормально передати практичну інформацію, наприклад перелік конкретних маршрутів, адрес, тарифів або інших елементів, де формат списку справді покращує зрозумілість.

==================================================
10. ФОРМАТ ВІДПОВІДІ
==================================================

Поверни ТІЛЬКИ JSON:

{
  "isRomania": true,
  "emoji": "🏛️",
  "title": "Заголовок",
  "text": "Розгорнутий текст новини"
}

Якщо новина НЕ підходить:

{
  "isRomania": false,
  "emoji": "",
  "title": "",
  "text": ""
}

ЗАГОЛОВОК:
${item.title}

ОПИС:
${item.description}

ПОСИЛАННЯ:
${item.link}
`;

  try {

    const response =
      await fetchWithTimeout(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        GEMINI_MODEL +
        ":generateContent?key=" +
        encodeURIComponent(apiKey),

        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          })
        },

        20000
      );

    const responseText =
      await response.text();

    console.log(
      "GEMINI STATUS:",
      response.status
    );

    if (!response.ok) {

      throw new Error(
        "Gemini HTTP " +
        response.status +
        ": " +
        responseText
      );
    }

    const data =
      JSON.parse(responseText);

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {

      throw new Error(
        "Gemini не повернув текст."
      );
    }

    const result =
      JSON.parse(
        cleanJson(text)
      );

    // ==================================================
    // ФІНАЛЬНЕ ПРАВИЛО:
    // росія та все пов'язане з нею — з маленької.
    // Це робимо кодом, а не покладаємося на Gemini.
    // ==================================================

    if (result.title) {
      result.title =
        lowercaseRussiaTerms(
          result.title
        );
    }

    if (result.text) {
      result.text =
        lowercaseRussiaTerms(
          result.text
        );
    }

    return result;

  } catch (error) {

    console.error(
      "GEMINI ERROR:",
      error
    );

    // ВАЖЛИВО:
    // не валимо весь цикл.
    throw error;
  }
}
// ==================================================
// ВІДПРАВКА ГОТОВОЇ НОВИНИ АДМІНУ
// ==================================================

async function sendPreparedNews(
  env,
  news
) {

  // ==================================================
  // ЗАГОЛОВОК + ТЕКСТ
  // ==================================================

  const titleLink =
    '<b><a href="https://t.me/news_rom">' +
    escapeHTML(news.title) +
    '</a></b>';

  const text =
    news.emoji +
    " " +
    titleLink +
    "\n\n" +
    escapeHTML(news.text);

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Підтвердити",
          callback_data:
            "approve:" + news.id
        },
        {
          text: "❌ Відхилити",
          callback_data:
            "reject:" + news.id
        }
      ]
    ]
  };

  // ==================================================
  // КАРТИНКА
  // ==================================================

  const PHOTO_CAPTION_LIMIT = 1000;

  let sent = false;

  // ==================================================
  // 1. КОРОТКИЙ ТЕКСТ + КАРТИНКА
  //
  // Надсилаємо фото з текстом у caption.
  // ==================================================

  if (
    news.image &&
    text.length <= PHOTO_CAPTION_LIMIT
  ) {

    try {

      sent =
        await sendPhoto(
          env.BOT_TOKEN,
          env.ADMIN_ID,
          news.image,
          text,
          keyboard
        );

    } catch (error) {

      console.error(
        "PHOTO SEND ERROR:",
        error
      );

      sent = false;
    }
  }

  // ==================================================
  // 2. ДОВГИЙ ТЕКСТ + КАРТИНКА
  //
  // Спочатку пробуємо:
  // ТЕКСТ + ВЕЛИКЕ ПРЕВ'Ю КАРТИНКИ.
  // ==================================================

  if (
    !sent &&
    news.image &&
    text.length > PHOTO_CAPTION_LIMIT
  ) {

    try {

      sent =
        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,
          text,
          keyboard,
          news.image
        );

    } catch (error) {

      console.error(
        "IMAGE PREVIEW ERROR:",
        error
      );

      sent = false;
    }

    // ==================================================
    // 3. НЕ ВДАЛОСЯ ЗРОБИТИ ПРЕВ'Ю
    //
    // Тоді:
    // спочатку текст,
    // потім картинка окремим повідомленням.
    // ==================================================

    if (!sent) {

      try {

        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,
          text,
          keyboard
        );

        // Картинка окремо.
        try {

          await sendPhoto(
            env.BOT_TOKEN,
            env.ADMIN_ID,
            news.image,
            "",
            null
          );

        } catch (photoError) {

          console.error(
            "FALLBACK PHOTO ERROR:",
            photoError
          );

          // Картинка не відправилась —
          // але новина вже відправлена.
          // Не зупиняємо чергу.
        }

        sent = true;

      } catch (textError) {

        console.error(
          "TEXT SEND ERROR:",
          textError
        );

        sent = false;
      }
    }
  }

  // ==================================================
  // 4. ЯКЩО КАРТИНКИ НЕМАЄ
  // ==================================================

  if (
    !sent &&
    !news.image
  ) {

    try {

      sent =
        await sendMessage(
          env.BOT_TOKEN,
          env.ADMIN_ID,
          text,
          keyboard
        );

    } catch (error) {

      console.error(
        "TEXT ONLY SEND ERROR:",
        error
      );

      sent = false;
    }
  }

  // ==================================================
  // 5. ЯКЩО ЗАЛИШИВСЯ НЕВІДПРАВЛЕНИЙ ТЕКСТ
  //
  // Це страховка, щоб помилка картинки
  // не залишила новину взагалі без повідомлення.
  // ==================================================

  if (!sent) {

    try {

      await sendMessage(
        env.BOT_TOKEN,
        env.ADMIN_ID,
        text,
        keyboard
      );

    } catch (error) {

      console.error(
        "FINAL NEWS SEND ERROR:",
        error
      );
    }
  }

  // ==================================================
  // 6. ДЖЕРЕЛО НОВИНИ
  // ==================================================

  if (
    news.link
  ) {

    try {

      await sendMessage(
        env.BOT_TOKEN,
        env.ADMIN_ID,

        "🔗 <b>Джерело новини:</b>\n" +
        escapeHTML(news.source) +
        "\n\n" +
        '<a href="' +
        escapeHTML(news.link) +
        '">' +
        escapeHTML(news.link) +
        '</a>'
      );

    } catch (error) {

      console.error(
        "SOURCE SEND ERROR:",
        error
      );
    }
  }
}

// ==================================================
// ПІДТВЕРДЖЕННЯ
// ==================================================

async function approveNews(
  env,
  chatId,
  id
) {

  const raw =
    await env.NEWS_KV.get(
      "news:" + id,
      "json"
    );

  if (!raw) {

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "⚠️ Новину не знайдено."
    );

    return;
  }

  raw.status =
    "approved";

  await env.NEWS_KV.put(
    "news:" + id,
    JSON.stringify(raw),
    {
      expirationTtl:
        60 * 60 * 24 * 30
    }
  );

  await showFreeSlots(
    env,
    chatId,
    id
  );
}


// ==================================================
// ВІДХИЛЕННЯ
// ==================================================

async function rejectNews(
  env,
  chatId,
  id
) {

  const raw =
    await env.NEWS_KV.get(
      "news:" + id,
      "json"
    );

  if (raw) {

    raw.status =
      "rejected";

    await env.NEWS_KV.put(
      "news:" + id,
      JSON.stringify(raw),
      {
        expirationTtl:
          60 * 60 * 24 * 7
      }
    );
  }

  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    "❌ Новину відхилено."
  );
}


// ==================================================
// ВІЛЬНІ СЛОТИ
// ==================================================

async function showFreeSlots(
  env,
  chatId,
  id
) {

  const now =
    getRomaniaTime();

  const today =
    now.date;

  const occupied =
    await getOccupiedSlots(
      env,
      today
    );

  const buttons = [];

  // ==========================================
  // ОПУБЛІКУВАТИ ЗАРАЗ
  // ==========================================

  buttons.push([
    {
      text: "🚀 Опублікувати зараз",
      callback_data:
        "publishnow:" + id
    }
  ]);

  // ==========================================
  // УСІ ЧАСОВІ СЛОТИ
  // ==========================================

  for (
    let i = 0;
    i < PUBLISH_SLOTS.length;
    i += 2
  ) {

    const row = [];

    for (
      let j = i;
      j <
      Math.min(
        i + 2,
        PUBLISH_SLOTS.length
      );
      j++
    ) {

      const slot =
        PUBLISH_SLOTS[j];

      const isOccupied =
        occupied.has(slot);

      row.push({
        text:
          (
            isOccupied
              ? "✅ "
              : "🕐 "
          ) +
          slot,

        callback_data:
          "slot:" +
          id +
          "|" +
          slot
      });
    }

    buttons.push(row);
  }

  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    "🕐 <b>Оберіть час публікації:</b>\n\n" +
    "✅ — цей час уже зайнятий сьогодні. Якщо обрати його, новина буде поставлена на наступний вільний день.",
    {
      inline_keyboard:
        buttons
    }
  );
}


// ==================================================
// ЗАПЛАНУВАТИ
// ==================================================

async function scheduleNews(
  env,
  chatId,
  id,
  slot
) {

  const raw =
    await env.NEWS_KV.get(
      "news:" + id,
      "json"
    );

  if (!raw) {

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "⚠️ Новину не знайдено."
    );

    return;
  }

  const now =
    getRomaniaTime();

  let publishDate = "";

  // ==========================================
  // ШУКАЄМО ПЕРШИЙ ВІЛЬНИЙ ДЕНЬ
  // ДЛЯ ОБРАНОГО ЧАСУ
  // ==========================================

  const startDayOffset =
    slot <= now.time
      ? 1
      : 0;

  for (
    let dayOffset = startDayOffset;
    dayOffset < 30;
    dayOffset++
  ) {

    const candidateDate =
      addDaysToDate(
        now.date,
        dayOffset
      );

    const occupied =
      await env.NEWS_KV.get(
        "slot:" +
        candidateDate +
        ":" +
        slot
      );

    if (!occupied) {

      publishDate =
        candidateDate;

      break;
    }
  }

  if (!publishDate) {

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "⚠️ Не вдалося знайти вільний день для часу <b>" +
      escapeHTML(slot) +
      "</b> протягом найближчих 30 днів."
    );

    return;
  }

  raw.status =
    "scheduled";

  raw.publishDate =
    publishDate;

  raw.publishTime =
    slot;

  await env.NEWS_KV.put(
    "news:" + id,
    JSON.stringify(raw),
    {
      expirationTtl:
        60 * 60 * 24 * 30
    }
  );

  await env.NEWS_KV.put(
    "slot:" +
    publishDate +
    ":" +
    slot,
    id,
    {
      expirationTtl:
        60 * 60 * 24 * 30
    }
  );

  const isToday =
    publishDate === now.date;

  await sendMessage(
    env.BOT_TOKEN,
    chatId,

    "✅ <b>Готово!</b>\n\n" +

    (
      isToday
        ? "🕐 Новину заплановано сьогодні на <b>"
        : "📅 Новину заплановано на <b>" +
          formatDateForMessage(
            publishDate
          ) +
          "</b> о <b>"
    ) +

    escapeHTML(slot) +
    "</b>."
  );
}

function addDaysToDate(
  dateString,
  days
) {

  const parts =
    dateString.split("-");

  const date =
    new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

  date.setDate(
    date.getDate() + days
  );

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return (
    year +
    "-" +
    month +
    "-" +
    day
  );
}


function formatDateForMessage(
  dateString
) {

  const [
    year,
    month,
    day
  ] =
    dateString.split("-");

  return (
    day +
    "." +
    month +
    "." +
    year
  );
}


// ==================================================
// ОПУБЛІКУВАТИ НОВИНУ ЗАРАЗ
// ==================================================

async function publishNewsNow(
  env,
  chatId,
  id
) {

  const raw =
    await env.NEWS_KV.get(
      "news:" + id,
      "json"
    );

  if (!raw) {

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "⚠️ Новину не знайдено."
    );

    return;
  }

  const titleLink =
    '<b><a href="https://t.me/news_rom">' +
    escapeHTML(raw.title) +
    '</a></b>';

  const caption =
    raw.emoji +
    " " +
    titleLink +
    "\n\n" +
    escapeHTML(raw.text) +
    "\n\n" +
    "➡️ <b>Більше цікавої інформації у нашому чаті</b>\n" +
    "https://t.me/ua_in_ro\n\n" +
    '🇺🇦 <b><u><a href="https://t.me/ua_in_ro">Украинцы в Румынии🇹🇩</a></u></b>\n' +
    '❤️ <b><a href="https://t.me/addlist/87244EkzpXxiZjFi">Список полезных каналов</a></b>';

  let published = false;

  const PHOTO_CAPTION_LIMIT =
    1000;

  if (
    raw.image &&
    caption.length <=
      PHOTO_CAPTION_LIMIT
  ) {

    published =
      await sendPhoto(
        env.BOT_TOKEN,
        env.CHANNEL_ID,
        raw.image,
        caption
      );
  }

  if (
    !published &&
    raw.image
  ) {

    published =
      await sendMessage(
        env.BOT_TOKEN,
        env.CHANNEL_ID,
        caption,
        null,
        raw.image
      );
  }

  if (!published) {

    published =
      await sendMessage(
        env.BOT_TOKEN,
        env.CHANNEL_ID,
        caption
      );
  }

  if (!published) {

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "❌ Не вдалося опублікувати новину."
    );

    return;
  }

  // Якщо новина до цього була запланована —
  // звільняємо її старий слот.

  if (
    raw.publishDate &&
    raw.publishTime
  ) {

    await env.NEWS_KV.delete(
      "slot:" +
      raw.publishDate +
      ":" +
      raw.publishTime
    );
  }

  raw.status =
    "published";

  raw.publishedAt =
    Date.now();

  delete raw.publishDate;
  delete raw.publishTime;

  await env.NEWS_KV.put(
    "news:" + id,
    JSON.stringify(raw),
    {
      expirationTtl:
        60 * 60 * 24 * 30
    }
  );

  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    "🚀 <b>Новину опубліковано.</b>"
  );
}

// ==================================================
// ПУБЛІКАЦІЯ ТЕХ, ЧИЙ ЧАС НАСТАВ
// ==================================================

async function publishDueNews(env) {

  const now =
    getRomaniaTime();

  const date =
    now.date;

  const time =
    now.time;

  // Перевіряємо всі слоти.
  for (
    const slot of PUBLISH_SLOTS
  ) {

    if (slot !== time) {
      continue;
    }

    const id =
      await env.NEWS_KV.get(
        "slot:" +
        date +
        ":" +
        slot
      );

    if (!id) {
      continue;
    }

    const raw =
      await env.NEWS_KV.get(
        "news:" + id,
        "json"
      );


    if (!raw) {

      await env.NEWS_KV.delete(
        "slot:" +
        date +
        ":" +
        slot
      );

      continue;
    }

    if (
      raw.status !==
      "scheduled"
    ) {

      await env.NEWS_KV.delete(
        "slot:" +
        date +
        ":" +
        slot
      );

      continue;
    }

    const titleLink =
      '<b><a href="https://t.me/news_rom">' +
      escapeHTML(raw.title) +
      '</a></b>';

    const caption =
      raw.emoji +
      " " +
      titleLink +
      "\n\n" +
      escapeHTML(raw.text) +
      "\n\n" +
      "➡️ <b>Більше цікавої інформації у нашому чаті</b>\n" +
      "https://t.me/ua_in_ro\n\n" +
      '🇺🇦 <b><u><a href="https://t.me/ua_in_ro">Украинцы в Румынии🇹🇩</a></u></b>\n' +
      '❤️ <b><a href="https://t.me/addlist/87244EkzpXxiZjFi">Список полезных каналов</a></b>';

    let published = false;

    const PHOTO_CAPTION_LIMIT = 1000;

    // ==================================================
    // КОРОТКА НОВИНА → ФОТО
    // ==================================================

    if (
      raw.image &&
      caption.length <= PHOTO_CAPTION_LIMIT
    ) {

      published =
        await sendPhoto(
          env.BOT_TOKEN,
          env.CHANNEL_ID,
          raw.image,
          caption
        );
    }

    // ==================================================
    // ДОВГА НОВИНА → ВЕЛИКЕ ПРЕВ'Ю
    // ==================================================

    if (
      !published &&
      raw.image
    ) {

      published =
        await sendMessage(
          env.BOT_TOKEN,
          env.CHANNEL_ID,
          caption,
          null,
          raw.image
        );
    }

    // ==================================================
    // ЯКЩО КАРТИНКИ НЕМАЄ
    // ==================================================

    if (!published) {

      published =
        await sendMessage(
          env.BOT_TOKEN,
          env.CHANNEL_ID,
          caption
        );
    }

    if (published) {

      raw.status =
        "published";

      raw.publishedAt =
        Date.now();

      await env.NEWS_KV.put(
        "news:" + id,
        JSON.stringify(raw),
        {
          expirationTtl:
            60 * 60 * 24 * 30
        }
      );

      await env.NEWS_KV.delete(
        "slot:" +
        date +
        ":" +
        slot
      );
    }
  }
}


// ==================================================
// ЗАЙНЯТІ СЛОТИ
// ==================================================

async function getOccupiedSlots(
  env,
  date
) {

  const occupied =
    new Set();

  for (
    const slot of PUBLISH_SLOTS
  ) {

    const value =
      await env.NEWS_KV.get(
        "slot:" +
        date +
        ":" +
        slot
      );

    if (value) {
      occupied.add(slot);
    }
  }

  return occupied;
}


// ==================================================
// ЧАС РУМУНІЇ
// ==================================================

function getRomaniaTime() {

  const now =
    new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          TIMEZONE,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false
      }
    ).formatToParts(now);

  const obj = {};

  for (
    const part of parts
  ) {

    if (
      part.type !==
      "literal"
    ) {
      obj[part.type] =
        part.value;
    }
  }

  return {
    date:
      obj.year +
      "-" +
      obj.month +
      "-" +
      obj.day,

    time:
      obj.hour +
      ":" +
      obj.minute
  };
}


// ==================================================
// RSS PARSER
// ==================================================

function parseFeed(xml) {

  const items = [];

  const rssItems =
    xml.match(
      /<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi
    ) || [];

  for (
    const itemXML of rssItems
  ) {

    const title =
      getTag(
        itemXML,
        "title"
      );

    const link =
      getTag(
        itemXML,
        "link"
      ) ||
      getAtomLink(
        itemXML
      );

    const description =
      getTag(
        itemXML,
        "description"
      ) ||
      getTag(
        itemXML,
        "content:encoded"
      ) ||
      getTag(
        itemXML,
        "summary"
      );

    const guid =
      getTag(
        itemXML,
        "guid"
      ) ||
      link;

    const published =
      getTag(
        itemXML,
        "pubDate"
      ) ||
      getTag(
        itemXML,
        "dc:date"
      ) ||
      getTag(
        itemXML,
        "published"
      ) ||
      getTag(
        itemXML,
        "updated"
      );

    const image =
      extractImage(
        itemXML
      );

    if (title) {

      items.push({
        title:
          cleanText(title),

        link:
          cleanText(link),

        guid:
          cleanText(guid),

        description:
          cleanText(
            description
          ).slice(0, 5000),

        published:
          cleanText(
            published
          ),

        image
      });
    }
  }

  // ATOM
  if (
    items.length === 0
  ) {

    const entries =
      xml.match(
        /<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi
      ) || [];

    for (
      const entryXML of entries
    ) {

      const title =
        getTag(
          entryXML,
          "title"
        );

      const link =
        getAtomLink(
          entryXML
        ) ||
        getTag(
          entryXML,
          "link"
        );

      const description =
        getTag(
          entryXML,
          "summary"
        ) ||
        getTag(
          entryXML,
          "content"
        ) ||
        getTag(
          entryXML,
          "description"
        );

      const published =
        getTag(
          entryXML,
          "published"
        ) ||
        getTag(
          entryXML,
          "updated"
        );

      const image =
        extractImage(
          entryXML
        );

      if (title) {

        items.push({
          title:
            cleanText(title),

          link:
            cleanText(link),

          guid:
            cleanText(link),

          description:
            cleanText(
              description
            ).slice(0, 5000),

          published:
            cleanText(
              published
            ),

          image
        });
      }
    }
  }

  return items;
}


// ==================================================
// XML
// ==================================================

function getTag(
  xml,
  tag
) {

  const escaped =
    tag.replace(
      ":",
      "\\:"
    );

  const regex =
    new RegExp(
      `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
      "i"
    );

  const match =
    xml.match(regex);

  if (!match) {
    return "";
  }

  return match[1]
    .replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/gi,
      "$1"
    )
    .trim();
}


// ==================================================
// ATOM LINK
// ==================================================

function getAtomLink(xml) {

  const matches =
    xml.match(
      /<link\b[^>]*>/gi
    ) || [];

  for (
    const tag of matches
  ) {

    const rel =
      tag.match(
        /rel=["']([^"']+)["']/i
      );

    const href =
      tag.match(
        /href=["']([^"']+)["']/i
      );

    if (
      href &&
      (
        !rel ||
        rel[1] ===
        "alternate"
      )
    ) {

      return decodeEntities(
        href[1]
      );
    }
  }

  return "";
}


// ==================================================
// IMAGE
// ==================================================

function extractImage(xml) {

  let match =
    xml.match(
      /<media:content[^>]+url=["']([^"']+)["']/i
    );

  if (match) {
    return decodeEntities(
      match[1]
    );
  }

  match =
    xml.match(
      /<media:thumbnail[^>]+url=["']([^"']+)["']/i
    );

  if (match) {
    return decodeEntities(
      match[1]
    );
  }

  match =
    xml.match(
      /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
    );

  if (match) {
    return decodeEntities(
      match[1]
    );
  }

  match =
    xml.match(
      /<img[^>]+src=["']([^"']+)["']/i
    );

  if (match) {
    return decodeEntities(
      match[1]
    );
  }

  return "";
}


// ==================================================
// OG IMAGE
// ==================================================

function shouldPreferOgImage(
  url
) {

  if (!url) {
    return false;
  }

  const value =
    String(url).toLowerCase();

  return (
    value.includes("sibiunews.net") ||
    value.includes("gsp.ro")
  );
}

// ==================================================
// OG IMAGE — З ТАЙМАУТОМ
// ==================================================


async function getOgImage(url) {

  if (!url) {
    return "";
  }

  try {

    const response =
      await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            "Accept":
              "text/html,application/xhtml+xml"
          }
        },
        8000
      );

    if (!response.ok) {
      return "";
    }

    const html =
      await response.text();

    // 1. og:image
    let match =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      );

    if (match && match[1]) {
      return decodeEntities(match[1]);
    }

    // 2. og:image — інший порядок атрибутів
    match =
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      );

    if (match && match[1]) {
      return decodeEntities(match[1]);
    }

    // 3. twitter:image
    match =
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
      );

    if (match && match[1]) {
      return decodeEntities(match[1]);
    }

    // 4. twitter:image — інший порядок
    match =
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
      );

    if (match && match[1]) {
      return decodeEntities(match[1]);
    }

  } catch (error) {

    console.error(
      "OG IMAGE ERROR:",
      error.message || error
    );

    // ВАЖЛИВО:
    // картинка не знайдена —
    // НЕ зупиняємо бота.
    return "";
  }

  return "";
}


// ==================================================
// SOURCE NAME
// ==================================================

function getSourceName(url) {

  if (
    url.includes("digi24")
  ) return "Digi24";

  if (
    url.includes("hotnews")
  ) return "HotNews";

  if (
    url.includes("sibiunews")
  ) return "Sibiu News";

  if (
    url.includes("adevarul")
  ) return "Adevărul";

  if (
    url.includes("stirileprotv")
  ) return "Știrile ProTV";

  if (url.includes("gokid"))
    return "Gokid";

  if (url.includes("businessmagazin"))
    return "Business Magazin";

  if (url.includes("economedia"))
    return "Economedia";

  if (url.includes("ziarullumina"))
    return "Ziarul Lumina";

  if (url.includes("basilica"))
    return "Basilica";

  if (
    url.includes("ziare")
  ) return "Ziare.com";

  if (
    url.includes("jurnalul")
  ) return "Jurnalul";

  if (
    url.includes("gsp")
  ) return "GSP";

  if (
    url.includes("ct100")
  ) return "CT100";

  if (
    url.includes("biziday")
  ) return "Biziday";

  if (
    url.includes("newsbucuresti")
  ) return "News București";

  if (
    url.includes("b365")
  ) return "B365";

  if (
    url.includes("tvr")
  ) return "TVR";

  if (url.includes("romania-actualitati"))
    return "Radio România Actualități";

  if (url.includes("ziare.com"))
    return "Ziare.com";

  if (url.includes("mediafax"))
    return "Mediafax";

  if (url.includes("euronews.ro"))
    return "Euronews România";

  if (url.includes("observatornews"))
    return "Observator News";

  if (url.includes("news.ro"))
    return "News.ro";

  if (url.includes("edupedu"))
    return "Edupedu";

  if (url.includes("rador"))
    return "Rador";

  if (url.includes("cotidianul"))
    return "Cotidianul";

  if (url.includes("citate.juridice"))
    return "Juridice";

  if (url.includes("profit.ro"))
    return "Profit.ro";

  if (url.includes("buletin.de"))
    return "Buletin de București";

  if (url.includes("libertatea"))
    return "Libertatea";

  if (url.includes("zf.ro"))
    return "Ziarul Financiar";

  if (url.includes("bursa.ro"))
    return "Bursa";

  if (url.includes("economica.net"))
    return "Economica.net";

  if (url.includes("newsbucovina"))
    return "News Bucovina";

  if (url.includes("ziaruldeiasi"))
    return "Ziarul de Iași";

  if (url.includes("stiridecluj"))
    return "Știri de Cluj";

  if (url.includes("bizbrasov"))
    return "BizBrașov";

  if (url.includes("zch.ro"))
    return "Ziarul de Chişinău";

  if (url.includes("observatorconstanta"))
    return "Observator Constanța";

  if (url.includes("ctnews"))
    return "CTnews";

  if (url.includes("idevice"))
    return "iDevice";

  if (url.includes("romania-insider"))
    return "Romania Insider";

  if (url.includes("radioromaniacultural"))
    return "Radio România Cultural";

  return "Новини";
}


// ==================================================
// CLEAN TEXT
// ==================================================

function cleanText(text) {

  if (!text) {
    return "";
  }

  return decodeEntities(
    String(text)
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<[^>]*>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );
}


// ==================================================
// ENTITIES
// ==================================================

function decodeEntities(text) {

  return String(text || "")
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&apos;/gi,
      "'"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&#(\d+);/g,
      (_, n) =>
        String.fromCharCode(
          Number(n)
        )
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, n) =>
        String.fromCharCode(
          parseInt(n, 16)
        )
    );
}


// ==================================================
// JSON CLEAN
// ==================================================

function cleanJson(text) {

  return String(text)
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}


// ==================================================
// HTML ESCAPE
// ==================================================

function escapeHTML(text) {

  return String(text || "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    );
}


// ==================================================
// HASH
// ==================================================

function simpleHash(text) {

  let hash = 0;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    hash =
      ((hash << 5) - hash) +
      text.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(
    hash
  ).toString();
}


// ==================================================
// TELEGRAM MESSAGE
// ==================================================

async function sendMessage(
  token,
  chatId,
  text,
  replyMarkup = null,
  previewImage = ""
) {

  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML"
  };

  // Якщо є URL картинки —
  // просимо Telegram використати саме його
  // для великого прев'ю.
  if (previewImage) {

    body.link_preview_options = {
      is_disabled: false,
      url: previewImage,
      prefer_large_media: true,
      show_above_text: true
    };

  } else {

    body.link_preview_options = {
      is_disabled: true
    };

  }

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "TELEGRAM SEND ERROR:",
        errorText
      );

      return false;
    }

    return true;

  } catch (error) {

    console.error(
      "TELEGRAM SEND ERROR:",
      error?.message || error
    );

    return false;
  }
}

// ==================================================
// TELEGRAM PHOTO
// ==================================================


async function sendPhoto(
  token,
  chatId,
  photo,
  caption,
  replyMarkup = null
) {

  const body = {
    chat_id:
      chatId,

    photo,

    caption,

    parse_mode:
      "HTML"
  };

  if (replyMarkup) {
    body.reply_markup =
      replyMarkup;
  }

  try {

    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/sendPhoto`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );

    if (!response.ok) {

      console.error(
        "TELEGRAM PHOTO ERROR:",
        await response.text()
      );

      return false;
    }

    return true;

  } catch (error) {

    console.error(
      "PHOTO ERROR:",
      error
    );

    return false;
  }
}


// ==================================================
// CALLBACK
// ==================================================

async function answerCallback(
  token,
  callbackId
) {

  await fetch(
    `https://api.telegram.org/bot${token}/answerCallbackQuery`,
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({
          callback_query_id:
            callbackId
        })
    }
  );
}


// ==================================================
// SLEEP
// ==================================================

function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

async function setBotCommands(token) {

  const commands = [
    {
      command: "start",
      description: "🏠 Головне меню"
    },
    {
      command: "check",
      description: "📰 Перевірити новини зараз"
    },
    {
      command: "recheck",
      description: "🔄 Повторно перевірити RSS"
    },
    {
      command: "test",
      description: "🧪 Запустити тест"
    },
    {
      command: "scheduled",
      description: "📅 Заплановані новини"
    },
    {
      command: "slots",
      description: "🕐 Вільні слоти"
    }
  ];

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${token}/setMyCommands`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          commands
        })
      }
    );

    console.log(
      "SET COMMANDS:",
      await response.text()
    );

  } catch (error) {

    console.error(
      "SET COMMANDS ERROR:",
      error
    );

  }
}

async function collectNewsForRecheck(env) {

  const result = [];

  const now =
    Date.now();

  const TWELVE_HOURS =
    12 * 60 * 60 * 1000;

  for (const feedUrl of RSS_FEEDS) {

    try {

      const response =
        await fetch(
          feedUrl,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 RomaniaNewsBot/1.0",

              "Accept":
                "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
            }
          }
        );

      if (!response.ok) {
        continue;
      }

      const xml =
        await response.text();

      if (
        !xml ||
        xml.length < 50
      ) {
        continue;
      }

      const items =
        parseFeed(xml);

      for (const item of items) {

        if (!item.title) {
          continue;
        }

        // ==========================================
        // БЕЗ ДАТИ НЕ БЕРЕМО
        // ==========================================

        if (!item.published) {
          continue;
        }

        const publishedTime =
          Date.parse(
            item.published
          );

        if (
          Number.isNaN(
            publishedTime
          )
        ) {
          continue;
        }

        // ==========================================
        // ТІЛЬКИ ОСТАННІ 12 ГОДИН
        // ==========================================

        const age =
          now -
          publishedTime;

        if (
          age < 0 ||
          age > TWELVE_HOURS
        ) {
          continue;
        }

        const id =
          simpleHash(
            item.link ||
            item.guid ||
            item.title
          );

        result.push({

          id,

          title:
            item.title,

          description:
            item.description ||
            "",

          link:
            item.link ||
            "",

          image:
            item.image ||
            "",

          published:
            item.published ||
            "",

          source:
            getSourceName(
              feedUrl
            )
        });
      }

    } catch (error) {

      console.error(
        "RECHECK RSS ERROR:",
        feedUrl,
        error
      );

    }
  }

  // ==========================================
  // ПРИБИРАЄМО ДУБЛІКАТИ
  // ==========================================

  const unique =
    new Map();

  for (const item of result) {

    if (
      !unique.has(
        item.id
      )
    ) {

      unique.set(
        item.id,
        item
      );

    }
  }

  // Новіші спочатку
  return Array.from(
    unique.values()
  ).sort(
    (a, b) =>
      Date.parse(b.published) -
      Date.parse(a.published)
  );
}
