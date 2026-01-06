class ChatController {
  constructor(chatStore) {
    this.chatStore = chatStore;
  }

  async getChatPage(req, res) {
    try {
      let userName = req.session.userName;
      let userId = req.session.userId;
      let userAvatar = req.session.userAvatar;

      if (!userName) {
        const storedUserId = req.query.userId || req.headers['x-user-id'];
        if (storedUserId) {
          const user = await this.chatStore.getUser(storedUserId);
          if (user) {
            req.session.userId = user.id;
            req.session.userName = user.name;
            req.session.userAvatar = user.avatar;
            userName = user.name;
            userId = user.id;
            userAvatar = user.avatar;
            await new Promise((resolve, reject) => {
              req.session.save((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
        }
      }

      const selectedServerId = parseInt(req.query.server) || 1;
      const selectedChannelId = req.query.channel || 'c1';

      const server = await this.chatStore.getServer(selectedServerId);
      const channel = await this.chatStore.getChannel(selectedChannelId);

      if (channel && channel.type === 'note') {
        return res.redirect(`/notes/${selectedChannelId}?server=${selectedServerId}`);
      }

      if (channel && channel.type === 'whiteboard') {
        if (!userName || !userId) {
          const loginUrl = `/?server=${selectedServerId}&channel=${selectedChannelId}`;
          return res.redirect(loginUrl);
        }
        const allServers = await this.chatStore.getAllServers();
        const serverChannels = await this.chatStore.db.all('SELECT * FROM channels WHERE server_id = ? ORDER BY id', [selectedServerId]);
        return res.render('whiteboard', {
          server: server,
          channel: channel,
          allServers: allServers,
          serverChannels: serverChannels,
          selectedServerId: selectedServerId,
          selectedChannelId: selectedChannelId,
          currentUser: {
            id: userId,
            name: userName,
            avatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`
          },
          isLoggedIn: true
        });
      }

      if (channel && channel.type === 'note') {
        const allServers = await this.chatStore.getAllServers();
        const serverChannels = await this.chatStore.db.all('SELECT * FROM channels WHERE server_id = ? ORDER BY id', [selectedServerId]);
        const notes = await this.chatStore.getNotes(selectedChannelId);
        return res.render('notes', {
          server: server,
          channel: channel,
          allServers: allServers,
          serverChannels: serverChannels,
          selectedServerId: selectedServerId,
          selectedChannelId: selectedChannelId,
          notes: notes,
          currentUser: userName ? {
            id: userId,
            name: userName,
            avatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`
          } : null,
          isLoggedIn: !!userName
        });
      }

      const messages = channel ? await this.chatStore.getChannelMessages(selectedChannelId) : [];
      const allUsers = await this.chatStore.getAllUsers();
      const onlineUsers = await this.chatStore.getOnlineUsers();
      const allServers = await this.chatStore.getAllServers();
      const serverChannels = await this.chatStore.db.all('SELECT * FROM channels WHERE server_id = ? ORDER BY id', [selectedServerId]);

      res.render('chat', {
        server: server,
        channel: channel,
        messages: messages,
        allUsers: allUsers,
        onlineUsers: onlineUsers,
        allServers: allServers,
        serverChannels: serverChannels,
        selectedServerId: selectedServerId,
        selectedChannelId: selectedChannelId,
        currentUser: userName ? {
          id: userId,
          name: userName,
          avatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`
        } : null,
        isLoggedIn: !!userName
      });
    } catch (error) {
      console.error('Error in getChatPage:', error);
      res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ');
    }
  }

  async handleLogout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการออกจากระบบ' });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error('Error in handleLogout:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการออกจากระบบ' });
    }
  }

  async handleLogin(req, res) {
    try {
      const { userName } = req.body;
      if (!userName || userName.trim() === '') {
        return res.status(400).json({ error: 'กรุณาใส่ชื่อ' });
      }

      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`;

      req.session.userId = userId;
      req.session.userName = userName.trim();
      req.session.userAvatar = avatar;

      req.session.save(async (err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึก session' });
        }

        const user = await this.chatStore.createUser(userId, userName.trim(), avatar);

        res.json({
          success: true,
          user: user.toJSON()
        });
      });
    } catch (error) {
      console.error('Error in handleLogin:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
  }

  async getNotesPage(req, res) {
    try {
      let userName = req.session.userName;
      let userId = req.session.userId;
      let userAvatar = req.session.userAvatar;

      if (!userName) {
        const storedUserId = req.query.userId || req.headers['x-user-id'];
        if (storedUserId) {
          const user = await this.chatStore.getUser(storedUserId);
          if (user) {
            req.session.userId = user.id;
            req.session.userName = user.name;
            req.session.userAvatar = user.avatar;
            userName = user.name;
            userId = user.id;
            userAvatar = user.avatar;
            await new Promise((resolve, reject) => {
              req.session.save((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
        }
      }

      const selectedServerId = parseInt(req.query.server) || 1;
      const selectedChannelId = req.params.channelId || req.query.channel || 'c1';

      const server = await this.chatStore.getServer(selectedServerId);
      const channel = await this.chatStore.getChannel(selectedChannelId);
      const allServers = await this.chatStore.getAllServers();
      const serverChannels = await this.chatStore.db.all('SELECT * FROM channels WHERE server_id = ? ORDER BY id', [selectedServerId]);
      const notes = await this.chatStore.getNotes(selectedChannelId);

      res.render('notes', {
        server: server,
        channel: channel,
        allServers: allServers,
        serverChannels: serverChannels,
        selectedServerId: selectedServerId,
        selectedChannelId: selectedChannelId,
        notes: notes,
        currentUser: userName ? {
          id: userId,
          name: userName,
          avatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`
        } : null,
        isLoggedIn: !!userName
      });
    } catch (error) {
      console.error('Error in getNotesPage:', error);
      res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ');
    }
  }
}

module.exports = ChatController;

