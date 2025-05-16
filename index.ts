import { botToken, chatPages } from './settings.json';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import cron from 'node-cron';

const bot = new TelegramBot(botToken, {polling: true});

// Schedule task summary for Monday, Wednesday, and Friday at 10 AM
cron.schedule('0 7 * * 1,3,5', () => {
  // Send summary to Nexus Leads chat
  Object.entries(chatPages).forEach(([chatId, _]) => showTasksSummary(Number(chatId)))
});

// Bot commands

bot.onText(/\/chatId/, (msg: any) => {
  const chatId = msg.chat.id;
  console.log(chatId);
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

  showTasksSummary(chatId);
});

bot.onText(/\/removeMe (.+)/, async (msg: Message, match: RegExpExecArray) => {
  const chatId = msg.chat.id;
  const username = msg.from.username
  removeMeFromTask(chatId, username, match[1], msg.message_id);

})

// Functions

function removeMeFromTask(chatId: number, username: string, taskId: string, msgId: number) {
  fetch(`https://nexusboards.ru/api/tasks/${taskId}/assignee/${username}`)
  .then(() => {
    setMessageReaction(chatId, msgId, username);
  })
  .catch(e=> console.log(e))
}

function setMessageReaction(chatId: number, msgId: number, username: string) {
  const Reactions = [{ type: 'emoji', emoji: username === 'ksanksanksan' ? '❤️' : '👍' }];
  (bot as any).setMessageReaction(chatId, msgId, { reaction: Reactions, is_big: true });
}

function newDiscussion(chatId: number, username: string, task: string, msgId: number, criticalFlag = false) {
  createTask(task, username, criticalFlag, chatId)
    .then(() => {
      setMessageReaction(chatId, msgId, username);
    })
    .catch(e=> console.log(e))
}

function newDiscussionRetro(chatId: number, username: string, task: string, msgId: number, criticalFlag = false) {
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
      setMessageReaction(chatId, msgId, username);
    })
    .catch(e=> console.error('Error sending task to API:', e))
}

function createTask(title: string, tgAuthor: string, criticalFlag: boolean, chatId: number): Promise<any> {
  return fetch('https://nexusboards.ru/api/public/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title,
      boardId: chatPages[chatId].nexusBoardsDB,
      authorTelegramLogin: tgAuthor,
    }),
  }).catch(error => console.error('Error sending task to API:', error));
}

async function showTasksSummary(chatId: number) {
  const boardId = chatPages[chatId].nexusBoardsDB;

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
          .map((task: { title: string, description: string, status: string, id: string }) => 
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
