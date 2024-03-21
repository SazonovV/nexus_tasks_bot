
import { Client } from '@notionhq/client';
import { CreatePageResponse } from "@notionhq/client/build/src/api-endpoints";
import { botToken, notionToken, notionPages } from './settings.json';
import TelegramBot, { Message } from 'node-telegram-bot-api';

const bot = new TelegramBot(botToken, {polling: true});
const notion = new Client({
  auth: notionToken
});

bot.onText(/\/chatId/, (msg: any) => {
  const chatId = msg.chat.id;
  console.log(chatId)
})

bot.onText(/\/newDiscussion (.+)/, async (msg: Message, match: RegExpExecArray) => {
  const chatId = msg.chat.id;
  const username = msg.from.username
  newDiscussion(chatId, username, match[1], msg.message_id);

})

bot.onText(/\/nD (.+)/, async (msg: Message, match: RegExpExecArray) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  newDiscussion(chatId, username, match[1], msg.message_id);
})

bot.onText(/\/nd (.+)/, async (msg: Message, match: RegExpExecArray) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  newDiscussion(chatId, username, match[1], msg.message_id);
})

bot.onText(/\/nDCrit (.+)/, async (msg: Message, match: RegExpExecArray) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  newDiscussion(chatId, username, match[1], msg.message_id, true);
})

bot.onText(/\/ndcrit (.+)/, async (msg: Message, match: RegExpExecArray) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  newDiscussion(chatId, username, match[1], msg.message_id, true);
})

function newDiscussion(chatId: number, username: string, task: string, msgId: number, criticalFlag = false) {
  const dbId = notionPages[chatId]?.taskDB;
  if (!dbId) {
    bot.sendMessage(chatId, 'Notion DB не найдена')
  } else {
    createTask(task, username, dbId, criticalFlag)
      .then(() => {
        const Reactions = [{ type: 'emoji', emoji: '👍' }];
        (bot as any).setMessageReaction(chatId, msgId, { reaction: Reactions, is_big: true });
      })
      .catch(e=> console.log(e))
  }

}

function createTask(title: string, tgAuthor: string, dbId: string, criticalFlag: boolean): Promise<CreatePageResponse> {
  return notion.pages.create({
    parent: {
      database_id: dbId
    },
    properties: {
      Name: {
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: title
            }
          }
        ]
      },
      Author: {
        type: "rich_text",
        rich_text: [
          {
            type: "text",
            text: {
              content: tgAuthor
            }
          }
        ]
      },
      Status: {
        type: "select",
        select: {
          name: 'Backlog'
        }
      },
      ...(criticalFlag &&
        {
          Labels: {
            type: "multi_select",
            multi_select: [{name: 'Критично'}]
          }
        })

    }

  });
}
