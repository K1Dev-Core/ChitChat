const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');
const Database = require('./database/db');
const ChatStore = require('./models/ChatStore');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

app.use(session({
  secret: 'realtime-chat-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

let db;
let chatStore;

async function initializeApp() {
  try {
    db = new Database();
    await db.connect();
    chatStore = new ChatStore(db);

    const { router } = require('./routes/index')(chatStore);
    const adminRouter = require('./routes/admin')(chatStore);
    const whiteboardRouter = require('./routes/whiteboard')(chatStore);
    app.use('/', router);
    app.use('/', whiteboardRouter);
    app.use('/admin', adminRouter);

    app.use((req, res) => {
      res.status(404).render('404');
    });

    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).render('500', { error: err.message });
    });

    const connectedUsers = new Map();

    io.on('connection', (socket) => {
      socket.on('join', async (data) => {
        const userId = data.userId;
        const userName = data.userName;
        const userAvatar = data.userAvatar;

        if (!userId || !userName) {
          socket.disconnect();
          return;
        }

        let user = await chatStore.getUser(userId);
        if (!user) {
          user = await chatStore.createUser(userId, userName, userAvatar);
        }

        await chatStore.updateUserStatus(userId, 'online');
        connectedUsers.set(socket.id, userId);
        socket.userId = userId;

        const channelId = data.channelId || 'c1';
        socket.join(channelId);

        const allUsers = await chatStore.getAllUsers();
        io.emit('userStatusUpdate', {
          users: allUsers
        });

        const messages = await chatStore.getChannelMessages(channelId);
        socket.emit('messageHistory', messages);
      });

      socket.on('joinAsGuest', async () => {
        const channelId = 'c1';
        socket.join(channelId);
        const messages = await chatStore.getChannelMessages(channelId);
        socket.emit('messageHistory', messages);
      });

      socket.on('typing', (data) => {
        const userId = socket.userId;
        if (!userId) return;

        const channelId = data.channelId || 'c1';
        socket.to(channelId).emit('userTyping', {
          userId: userId,
          userName: data.userName,
          channelId: channelId
        });
      });

      socket.on('stopTyping', (data) => {
        const userId = socket.userId;
        if (!userId) return;

        const channelId = data.channelId || 'c1';
        socket.to(channelId).emit('userStopTyping', {
          userId: userId,
          channelId: channelId
        });
      });

      socket.on('sendMessage', async (data) => {
        const userId = socket.userId;
        if (!userId) return;

        const user = await chatStore.getUser(userId);
        if (!user) return;

        const channelId = data.channelId || 'c1';
        const expireMinutes = data.expireMinutes || 0;
        const isLink = data.text && (data.text.startsWith('http://') || data.text.startsWith('https://'));
        const message = await chatStore.addMessage(channelId, userId, data.text, null, null, null, null, isLink, expireMinutes);
        if (message) {
          io.to(channelId).emit('newMessage', message);
          socket.to(channelId).emit('userStopTyping', {
            userId: userId,
            channelId: channelId
          });
        }
      });

      socket.on('deleteExpiredMessage', async (data) => {
        const { messageId, channelId } = data;
        await chatStore.deleteExpiredMessage(messageId);
        io.to(channelId).emit('messageDeleted', { messageId });
      });

      socket.on('fileUploaded', async (data) => {
        const userId = socket.userId;
        if (!userId) return;

        if (data.message) {
          const channelId = data.channelId || 'c1';
          io.to(channelId).emit('newMessage', data.message);
        }
      });

      socket.on('deleteMessage', async (data) => {
        const userId = socket.userId;
        if (!userId) return;

        const channelId = data.channelId || 'c1';
        const deleted = await chatStore.deleteMessage(data.messageId, userId);
        if (deleted) {
          io.to(channelId).emit('messageDeleted', { messageId: data.messageId });
        }
      });

      socket.on('joinWhiteboard', (data) => {
        const userId = socket.userId;
        if (!userId) {
          socket.disconnect();
          return;
        }
        const { channelId } = data;
        socket.join(`whiteboard-${channelId}`);
      });

      socket.on('whiteboardChange', async (data) => {
        const userId = socket.userId;
        if (!userId) {
          return;
        }
        const { channelId, canvasData, changeType, changeData } = data;
        
        socket.to(`whiteboard-${channelId}`).emit('whiteboardUpdate', {
          channelId,
          canvasData,
          changeType,
          changeData
        });
        
        if (socket.whiteboardSaveTimeout) {
          clearTimeout(socket.whiteboardSaveTimeout);
        }
        socket.whiteboardSaveTimeout = setTimeout(async () => {
          await chatStore.saveWhiteboardData(channelId, canvasData);
          socket.whiteboardSaveTimeout = null;
        }, 1000);
      });

      socket.on('whiteboardCursor', (data) => {
        const { channelId, x, y, userId, userName, userColor } = data;
        socket.to(`whiteboard-${channelId}`).emit('userCursor', {
          channelId,
          x,
          y,
          userId,
          userName,
          userColor
        });
      });

      socket.on('disconnect', async () => {
        const userId = connectedUsers.get(socket.id);
        if (userId) {
          await chatStore.updateUserStatus(userId, 'offline');
          const allUsers = await chatStore.getAllUsers();
          io.emit('userStatusUpdate', {
            users: allUsers
          });
          connectedUsers.delete(socket.id);
        }
      });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

initializeApp();

