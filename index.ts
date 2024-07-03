
import { Client } from '@notionhq/client';
import { CreatePageResponse } from "@notionhq/client/build/src/api-endpoints";
import { botToken, notionTokenNexus, notionTokenNexusLeads, notionPages } from './settings.json';
import TelegramBot, { Message } from 'node-telegram-bot-api';

const bot = new TelegramBot(botToken, {polling: true});
const notionNexus = new Client({
  auth: notionTokenNexus
});
const notionNexusLeads = new Client({
  auth: notionTokenNexusLeads
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
  if (chatId !== notionPages.nexusLeads.chatId && chatId !== notionPages.nexus.chatId) {
    bot.sendMessage(chatId, 'Notion DB не найдена')
  } else {
    createTask(task, username, criticalFlag, chatId)
      .then(() => {
        const Reactions = [{ type: 'emoji', emoji: '👍' }];
        (bot as any).setMessageReaction(chatId, msgId, { reaction: Reactions, is_big: true });
      })
      .catch(e=> console.log(e))
  }

}

function createTask(title: string, tgAuthor: string, criticalFlag: boolean, chatId: number): Promise<CreatePageResponse> {
  const notionClient = chatId == notionPages.nexusLeads.chatId ? notionNexusLeads : notionNexus;
  return notionClient.pages.create({
    parent: {
      database_id: chatId == notionPages.nexusLeads.chatId ? notionPages.nexusLeads.taskDB : notionPages.nexus.taskDB
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
