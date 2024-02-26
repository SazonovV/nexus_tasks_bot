
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

function newDiscussion(chatId: number, username: string, task: string, msgId: number) {
  const dbId = notionPages[chatId]?.taskDB;
  if (!dbId) {
    bot.sendMessage(chatId, 'Notion DB не найдена')
  } else {
    createTask(task, username, dbId)
      .then((createTaskResult) => {
        const createdTaskMessage = 'Новая тема для обсуждения - (https://www.notion.so/' + convertTaskToUrl(createTaskResult) + ')';
        const Reactions = [{ type: 'emoji', emoji: '👍' }];
        (bot as any).setMessageReaction(chatId, msgId, { reaction: Reactions, is_big: true });
        bot.sendMessage(275559199, createdTaskMessage);
      })
      .catch(e=> console.log(e))
  }

}

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
      },
      Status: {
        type: "select",
        select: {
          name: 'Backlog'
        }
      },
    }

  });
}

function convertTaskToUrl(task: CreatePageResponse): string {
  return task.id.replace(/-/g, '');
}
