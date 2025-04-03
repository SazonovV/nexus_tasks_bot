import { Client } from '@notionhq/client';
import { CreatePageResponse } from "@notionhq/client/build/src/api-endpoints";
import { botToken, notionTokenNexus, notionTokenNexusLeads, notionPages } from './settings.json';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import cron from 'node-cron';

const bot = new TelegramBot(botToken, {polling: true});
const notionNexus = new Client({
  auth: notionTokenNexus
});
const notionNexusLeads = new Client({
  auth: notionTokenNexusLeads
});

// Schedule task summary for Monday, Wednesday, and Friday at 10 AM
cron.schedule('0 7 * * 1,3,5', () => {
  // Send summary to Nexus Leads chat
  showTasksSummary(notionPages.nexusLeads.chatId);
  // Send summary to Nexus chat
  showTasksSummary(notionPages.nexus.chatId);
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

bot.onText(/\/ndRetro (.+)/, async (msg: Message, match: RegExpExecArray) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  newDiscussionRetro(chatId, username, match[1], msg.message_id);
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

bot.onText(/\/tasks/, async (msg: Message) => {
  const chatId = msg.chat.id;
  if (chatId !== notionPages.nexusLeads.chatId && chatId !== notionPages.nexus.chatId) {
    bot.sendMessage(chatId, 'Notion DB не найдена');
    return;
  }
  
  showTasksSummary(chatId);
});

function newDiscussion(chatId: number, username: string, task: string, msgId: number, criticalFlag = false) {
  if (chatId !== notionPages.nexusLeads.chatId && chatId !== notionPages.nexus.chatId) {
    bot.sendMessage(chatId, 'Notion DB не найдена')
  } else {
    createTask(task, username, criticalFlag, chatId)
      .then(() => {
        const Reactions = [{ type: 'emoji', emoji: username === 'ksanksanksan' ? '❤️' : '👍' }];
        (bot as any).setMessageReaction(chatId, msgId, { reaction: Reactions, is_big: true });
      })
      .catch(e=> console.log(e))
  }

}

function newDiscussionRetro(chatId: number, username: string, task: string, msgId: number, criticalFlag = false) {
  if (chatId !== notionPages.nexusLeads.chatId && chatId !== notionPages.nexus.chatId) {
    bot.sendMessage(chatId, 'Notion DB не найдена')
  } else {
    fetch('https://nexusboards.ru/api/public/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: task,
        boardId: '6cd49c03-0fc7-11f0-bd40-52540023d762',
        authorTelegramLogin: username,
      }),
    }).then(() => {
        const Reactions = [{ type: 'emoji', emoji: username === 'ksanksanksan' ? '❤️' : '👍' }];
        (bot as any).setMessageReaction(chatId, msgId, { reaction: Reactions, is_big: true });
      })
      .catch(e=> console.error('Error sending task to API:', e))
  }

}

function createTask(title: string, tgAuthor: string, criticalFlag: boolean, chatId: number): Promise<CreatePageResponse> {
  const notionClient = chatId == notionPages.nexusLeads.chatId ? notionNexusLeads : notionNexus;
  
  fetch('https://nexusboards.ru/api/public/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title,
      boardId: chatId == notionPages.nexusLeads.chatId ? notionPages.nexusLeads.nexusBoardsDB : notionPages.nexus.nexusBoardsDB,
      authorTelegramLogin: tgAuthor,
    }),
  }).catch(error => console.error('Error sending task to API:', error));

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

async function showTasksSummary(chatId: number) {
  const boardId = chatId == notionPages.nexusLeads.chatId 
    ? notionPages.nexusLeads.nexusBoardsDB 
    : notionPages.nexus.nexusBoardsDB;

  try {
    const response = await fetch(`https://nexusboards.ru/api/public/boards/${boardId}/tasks-summary`);
    const rawData = await response.json();
    
    if (typeof rawData !== 'object' || rawData === null) {
      throw new Error('Invalid response format');
    }
    
    const data = rawData as { [key: string]: { title: string, description: string, status: string }[] };

    // Форматируем сообщение
    const message = Object.entries(data)
      .map(([user, tasks]) => {
        const tasksText = tasks
          .filter((task: { status: string}) => task.status !== 'done')
          .map((task: { title: string, description: string, status: string }) => 
            `${task.title} - ${task.description} - ${task.status}`
          )
          .join('\n');
        return `@${user}\n${tasksText}`;
      })
      .join('\n\n');

    // Отправляем сообщение
    await bot.sendMessage(chatId, message || 'Нет активных задач');
  } catch (error) {
    console.error('Error fetching tasks summary:', error);
    await bot.sendMessage(chatId, 'Ошибка при получении списка задач');
  }
}
