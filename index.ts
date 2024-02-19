
import { Client } from '@notionhq/client';
import { CreatePageResponse } from "@notionhq/client/build/src/api-endpoints";
import { botToken, notionToken, notionPages } from './settings.json';

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(botToken, {polling: true});
const notion = new Client({
  auth: notionToken
});

bot.onText(/\/chatId/, (msg: any) => {
  const chatId = msg.chat.id;
  console.log(chatId)
})

bot.onText(/\/newDiscussion (.+)/, async (msg: any, match: string) => {
  const chatId = msg.chat.id;
  const username = msg.from.username
  const dbId = notionPages[msg.chat.id]?.taskDB;
  if (!dbId) {
    bot.sendMessage(chatId, 'Notion DB не найдена')
  } else {
  createTask(match[1], username, dbId)
    .then((createTaskResult) => {
      const createdTaskMessage = 'Новая тема для обсуждения - (https://www.notion.so/' + convertTaskToUrl(createTaskResult) + ')';
      bot.sendMessage(chatId, createdTaskMessage)
    })
    .catch(e=> console.log(e))
  }

})

function createTask(title: string, tgAuthor: string, dbId: string): Promise<CreatePageResponse> {
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
      }
    }

  });
}

function convertTaskToUrl(task: CreatePageResponse): string {
  return task.id.replace(/-/g, '');
}
