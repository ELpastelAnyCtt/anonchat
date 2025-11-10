const express = require('express');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// In-memory storage for chats and messages (in production, use a database)
let chats = [
    {
        id: 'chat1',
        name: 'ChatGeralAno-01',
        users: 12,
        preview: 'Welcome to the main anonymous chat room!',
        burnTime: 0, // 0 means infinite
        creator: null,
        fixed: true,
        isOfficial: true,
        messages: [
            {
                id: 'm1',
                sender: 'System',
                text: 'Welcome to ChatGeralAno-01. This is the main anonymous chat room with infinite burn time. Messages here persist forever.',
                time: new Date().toISOString(),
                system: true
            }
        ]
    },
    {
        id: 'chat2',
        name: 'Discussions',
        users: 19,
        preview: 'Talk about anything here...',
        burnTime: 60, // 1 hours in minutes
        creator: null,
        fixed: false,
        isOfficial: false,
        messages: [
            {
                id: 'm1',
                sender: 'Anonymous',
                text: 'Anyone want to chat about something interesting?',
                time: new Date().toISOString()
            }
        ]
    },
    {
        id: 'chat3',
        name: 'Confessions',
        users: 97,
        preview: 'Share your secrets anonymously...',
        burnTime: 60, // 1 hour
        creator: null,
        fixed: false,
        isOfficial: false,
        messages: [
            {
                id: 'm1',
                sender: 'Anonymous',
                text: 'Sometimes it feels good to talk to strangers...',
                time: new Date().toISOString()
            }
        ]
    }
];

let userChats = {};
let onlineUsers = 15;

// Telegram Bot integration (only run if token is available)
if (process.env.TELEGRAM_BOT_TOKEN) {
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // Bot commands
    bot.start((ctx) => {
        ctx.reply('Welcome to AnonChat! Use /help to see available commands.');
    });

    bot.help((ctx) => {
        ctx.reply(`
AnonChat Bot Commands:
/start - Start the bot
/help - Show this help message
/list - List available chats
/join <chat_id> - Join a chat
/send <chat_id> <message> - Send message to chat
/create <name> <burn_time> - Create new chat (burn_time in minutes, 0 for infinite)
/delete <chat_id> - Delete your chat (if creator)
/my - Show your created chats
        `);
    });

    bot.command('list', (ctx) => {
        let message = 'Available Chats:\n\n';
        chats.forEach(chat => {
            const isOfficial = chat.fixed ? ' 👑' : '';
            const burnTime = chat.burnTime === 0 ? '∞' : `${chat.burnTime}m`;
            message += `${chat.id}: ${chat.name}${isOfficial} (${chat.users} users, ${burnTime})\n`;
            message += `  "${chat.preview}"\n\n`;
        });
        ctx.reply(message);
    });

    bot.command('join', (ctx) => {
        const chatId = ctx.message.text.split(' ')[1];
        const chat = chats.find(c => c.id === chatId);

        if (!chat) {
            return ctx.reply('Chat not found. Use /list to see available chats.');
        }

        // Show recent messages
        let message = `Joined ${chat.name}\n\nRecent messages:\n`;
        const recentMessages = chat.messages.slice(-5); // Last 5 messages

        recentMessages.forEach(msg => {
            const time = new Date(msg.time).toLocaleTimeString();
            if (msg.system) {
                message += `[${time}] System: ${msg.text}\n`;
            } else {
                message += `[${time}] ${msg.sender}: ${msg.text}\n`;
            }
        });

        ctx.reply(message);
    });

    bot.command('send', (ctx) => {
        const parts = ctx.message.text.split(' ');
        const chatId = parts[1];
        const messageText = parts.slice(2).join(' ');

        if (!chatId || !messageText) {
            return ctx.reply('Usage: /send <chat_id> <message>');
        }

        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            return ctx.reply('Chat not found.');
        }

        // Add message
        const message = {
            id: 'm' + Date.now(),
            sender: ctx.from.username || ctx.from.first_name || 'Anonymous',
            text: messageText,
            time: new Date().toISOString()
        };

        chat.messages.push(message);
        chat.preview = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;

        ctx.reply(`Message sent to ${chat.name}`);
    });

    bot.command('create', (ctx) => {
        const parts = ctx.message.text.split(' ');
        const name = parts.slice(1, -1).join(' ');
        const burnTime = parseInt(parts[parts.length - 1]);

        if (!name || isNaN(burnTime)) {
            return ctx.reply('Usage: /create <name> <burn_time_in_minutes>');
        }

        const randomId = Math.floor(Math.random() * 9000) + 1000;
        const chatName = `(AnonUser-${randomId}) ${name}`;
        const chatId = 'chat' + Date.now();

        const newChat = {
            id: chatId,
            name: chatName,
            users: 1,
            preview: 'New chat created. Be the first to send a message!',
            burnTime: burnTime,
            creator: ctx.from.id.toString(),
            fixed: false,
            messages: [
                {
                    id: 'm1',
                    sender: 'System',
                    text: `Chat created by ${ctx.from.username || ctx.from.first_name}. ${burnTime === 0 ?
                        'This chat has infinite burn time.' :
                        `This chat will be automatically deleted after ${burnTime} minutes of inactivity.`
                    }`,
                    time: new Date().toISOString(),
                    system: true
                }
            ]
        };

        chats.unshift(newChat);
        userChats[ctx.from.id] = chatId;

        ctx.reply(`Chat "${chatName}" created! ID: ${chatId}`);
    });

    bot.command('delete', (ctx) => {
        const chatId = ctx.message.text.split(' ')[1];

        if (!chatId) {
            return ctx.reply('Usage: /delete <chat_id>');
        }

        const chat = chats.find(c => c.id === chatId);
        if (!chat) {
            return ctx.reply('Chat not found.');
        }

        if (chat.creator !== ctx.from.id.toString()) {
            return ctx.reply('You can only delete chats you created.');
        }

        if (chat.fixed) {
            return ctx.reply('Cannot delete official chats.');
        }

        // Remove chat
        chats = chats.filter(c => c.id !== chatId);
        delete userChats[ctx.from.id];

        ctx.reply(`Chat "${chat.name}" deleted.`);
    });

    bot.command('my', (ctx) => {
        const userChatId = userChats[ctx.from.id];
        if (!userChatId) {
            return ctx.reply('You haven\'t created any chats yet.');
        }

        const chat = chats.find(c => c.id === userChatId);
        if (!chat) {
            return ctx.reply('Your chat no longer exists.');
        }

        ctx.reply(`Your chat: ${chat.name} (ID: ${chat.id})`);
    });

    // Start bot
    bot.launch();
    console.log('Bot started');
}

// API endpoints for the web app
app.get('/api/chats', (req, res) => {
    res.json(chats);
});

app.get('/api/chats/:id/messages', (req, res) => {
    const chat = chats.find(c => c.id === req.params.id);
    if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
    }
    res.json(chat.messages);
});

app.post('/api/chats/:id/messages', (req, res) => {
    const chat = chats.find(c => c.id === req.params.id);
    if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
    }

    const message = {
        id: 'm' + Date.now(),
        sender: req.body.sender || 'Anonymous',
        text: req.body.text,
        time: new Date().toISOString()
    };

    chat.messages.push(message);
    chat.preview = message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text;

    res.json(message);
});

app.post('/api/chats', (req, res) => {
    const { name, burnTime, creator } = req.body;
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const chatName = `(AnonUser-${randomId}) ${name}`;
    const chatId = 'chat' + Date.now();

    const newChat = {
        id: chatId,
        name: chatName,
        users: 1,
        preview: 'New chat created. Be the first to send a message!',
        burnTime: burnTime,
        creator: creator,
        fixed: false,
        messages: [
            {
                id: 'm1',
                sender: 'System',
                text: `Chat created. ${burnTime === 0 ?
                    'This chat has infinite burn time.' :
                    `This chat will be automatically deleted after ${burnTime} minutes of inactivity.`
                }`,
                time: new Date().toISOString(),
                system: true
            }
        ]
    };

    chats.unshift(newChat);
    userChats[creator] = chatId;

    res.json(newChat);
});

app.delete('/api/chats/:id', (req, res) => {
    const { creator } = req.body;
    const chat = chats.find(c => c.id === req.params.id);

    if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
    }

    if (chat.creator !== creator) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    if (chat.fixed) {
        return res.status(403).json({ error: 'Cannot delete official chats' });
    }

    chats = chats.filter(c => c.id !== req.params.id);
    delete userChats[creator];

    res.json({ success: true });
});

// Cleanup expired chats
setInterval(() => {
    const now = Date.now();
    chats = chats.filter(chat => {
        if (chat.fixed || chat.burnTime === 0) return true;

        const lastMessage = chat.messages[chat.messages.length - 1];
        if (!lastMessage) return true;

        const lastActivity = new Date(lastMessage.time).getTime();
        const expiryTime = lastActivity + (chat.burnTime * 60 * 1000);

        return now < expiryTime;
    });
}, 60000); // Check every minute

// Export the app for Vercel
module.exports = app;

// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.once('SIGINT', () => {
        if (process.env.TELEGRAM_BOT_TOKEN) {
            const { Telegraf } = require('telegraf');
            const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
            bot.stop('SIGINT');
        }
        process.exit(0);
    });
    process.once('SIGTERM', () => {
        if (process.env.TELEGRAM_BOT_TOKEN) {
            const { Telegraf } = require('telegraf');
            const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
            bot.stop('SIGTERM');
        }
        process.exit(0);
    });
}
