const Database = require('../database/db');
const User = require('./User');
const Message = require('./Message');
const Channel = require('./Channel');

class ChatStore {
  constructor(db) {
    this.db = db;
  }

  formatLocalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  parseLocalDateTime(dateString) {
    if (!dateString) return new Date();

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  }

  async createUser(id, name, avatar) {
    const user = new User(id, name, avatar);
    await this.db.run(
      'INSERT OR REPLACE INTO users (id, name, avatar, status, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`, 'online', 'Member']
    );
    return user;
  }

  async getUser(id) {
    const row = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;

    const user = new User(row.id, row.name, row.avatar);
    user.status = row.status;
    user.role = row.role;
    user.joinedAt = new Date(row.joined_at);
    return user;
  }

  async getAllUsers() {
    const rows = await this.db.all('SELECT * FROM users ORDER BY name');
    return rows.map(row => {
      const user = new User(row.id, row.name, row.avatar);
      user.status = row.status;
      user.role = row.role;
      return user.toJSON();
    });
  }

  async getOnlineUsers() {
    const rows = await this.db.all("SELECT * FROM users WHERE status != 'offline' ORDER BY name");
    return rows.map(row => {
      const user = new User(row.id, row.name, row.avatar);
      user.status = row.status;
      user.role = row.role;
      return user.toJSON();
    });
  }

  async getOfflineUsers() {
    const rows = await this.db.all("SELECT * FROM users WHERE status = 'offline' ORDER BY name");
    return rows.map(row => {
      const user = new User(row.id, row.name, row.avatar);
      user.status = row.status;
      user.role = row.role;
      return user.toJSON();
    });
  }

  async updateUserStatus(userId, status) {
    await this.db.run('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
  }

  async addMessage(channelId, userId, text, filePath = null, fileName = null, fileType = null, fileSize = null, isLink = false, expireMinutes = 0) {
    const user = await this.getUser(userId);
    if (!user) return null;

    const channel = await this.getChannel(channelId);
    if (!channel) return null;

    const now = new Date();
    const localTimestamp = this.formatLocalDateTime(now);

    let expireAt = null;
    if (expireMinutes > 0) {
      const expireDate = new Date(now.getTime() + expireMinutes * 60 * 1000);
      expireAt = this.formatLocalDateTime(expireDate);
    }

    const result = await this.db.run(
      'INSERT INTO messages (channel_id, user_id, user_name, user_avatar, text, file_path, file_name, file_type, file_size, is_link, timestamp, expire_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [channelId, userId, user.name, user.avatar, text || '', filePath, fileName, fileType, fileSize, isLink ? 1 : 0, localTimestamp, expireAt]
    );

    const messageRow = await this.db.get('SELECT * FROM messages WHERE id = ?', [result.lastID]);
    if (!messageRow) return null;

    const message = new Message(
      messageRow.id,
      messageRow.user_id,
      messageRow.text,
      messageRow.user_name,
      messageRow.user_avatar,
      messageRow.file_path,
      messageRow.file_name,
      messageRow.file_type,
      messageRow.file_size,
      messageRow.is_link === 1,
      messageRow.expire_at
    );
    if (messageRow.timestamp) {
      message.timestamp = this.parseLocalDateTime(messageRow.timestamp);
    } else {
      message.timestamp = new Date();
    }

    if (messageRow.expire_at) {
      message.expireAt = this.parseLocalDateTime(messageRow.expire_at);
    }

    return message.toJSON();
  }

  async deleteMessage(messageId, userId) {
    const message = await this.db.get('SELECT * FROM messages WHERE id = ? AND user_id = ?', [messageId, userId]);
    if (!message) return false;

    if (message.file_path) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', 'public', message.file_path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    await this.db.run('DELETE FROM messages WHERE id = ? AND user_id = ?', [messageId, userId]);
    return true;
  }

  async getChannelMessages(channelId, limit = 100) {
    const rows = await this.db.all(
      'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?',
      [channelId, limit]
    );

    return rows.reverse().map(row => {
      const message = new Message(
        row.id,
        row.user_id,
        row.text,
        row.user_name,
        row.user_avatar,
        row.file_path,
        row.file_name,
        row.file_type,
        row.file_size,
        row.is_link === 1,
        row.expire_at
      );
      if (row.timestamp) {
        message.timestamp = this.parseLocalDateTime(row.timestamp);
      } else {
        message.timestamp = new Date();
      }

      if (row.expire_at) {
        message.expireAt = this.parseLocalDateTime(row.expire_at);
      }

      return message.toJSON();
    });
  }

  async getChannel(channelId) {
    const row = await this.db.get('SELECT * FROM channels WHERE id = ?', [channelId]);
    if (!row) return null;

    const channel = new Channel(row.id, row.name, row.type);
    return channel;
  }

  async getWhiteboardData(channelId) {
    const row = await this.db.get('SELECT whiteboard_data FROM channels WHERE id = ?', [channelId]);
    if (!row || !row.whiteboard_data) return null;
    return JSON.parse(row.whiteboard_data);
  }

  async saveWhiteboardData(channelId, data) {
    const dataStr = JSON.stringify(data);
    await this.db.run('UPDATE channels SET whiteboard_data = ? WHERE id = ?', [dataStr, channelId]);
  }

  async getServer(serverId) {
    const row = await this.db.get('SELECT * FROM servers WHERE id = ?', [serverId]);
    return row;
  }

  async getAllServers() {
    return await this.db.all('SELECT * FROM servers ORDER BY id');
  }

  async createServer(name, avatar = null) {
    const result = await this.db.run('INSERT INTO servers (name, avatar) VALUES (?, ?)', [name, avatar]);
    return await this.db.get('SELECT * FROM servers WHERE id = ?', [result.lastID]);
  }

  async updateServer(serverId, name, avatar = undefined) {
    if (avatar !== undefined && avatar !== null) {
      await this.db.run('UPDATE servers SET name = ?, avatar = ? WHERE id = ?', [name, avatar, serverId]);
    } else if (avatar === null) {
      await this.db.run('UPDATE servers SET name = ?, avatar = NULL WHERE id = ?', [name, serverId]);
    } else {
      await this.db.run('UPDATE servers SET name = ? WHERE id = ?', [name, serverId]);
    }
  }

  async deleteServer(serverId) {
    await this.db.run('DELETE FROM channels WHERE server_id = ?', [serverId]);
    await this.db.run('DELETE FROM servers WHERE id = ?', [serverId]);
  }

  async getAllChannels() {
    return await this.db.all('SELECT c.*, s.name as server_name FROM channels c LEFT JOIN servers s ON c.server_id = s.id ORDER BY c.server_id, c.id');
  }

  async createChannel(serverId, name, type = 'text') {
    const channelId = `c${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.run('INSERT INTO channels (id, server_id, name, type) VALUES (?, ?, ?, ?)', [channelId, serverId, name, type]);
    return await this.db.get('SELECT * FROM channels WHERE id = ?', [channelId]);
  }

  async updateChannel(channelId, name, type) {
    await this.db.run('UPDATE channels SET name = ?, type = ? WHERE id = ?', [name, type, channelId]);
  }

  async deleteChannel(channelId) {
    const messages = await this.db.all('SELECT file_path FROM messages WHERE channel_id = ? AND file_path IS NOT NULL', [channelId]);
    const fs = require('fs');
    const path = require('path');
    messages.forEach(msg => {
      if (msg.file_path) {
        const filePath = path.join(__dirname, '..', 'public', msg.file_path);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }
    });
    await this.db.run('DELETE FROM messages WHERE channel_id = ?', [channelId]);
    await this.db.run('DELETE FROM channels WHERE id = ?', [channelId]);
  }

  async banUser(userId) {
    await this.db.run("UPDATE users SET status = 'banned', role = 'Banned' WHERE id = ?", [userId]);
  }

  async unbanUser(userId) {
    await this.db.run("UPDATE users SET status = 'offline', role = 'Member' WHERE id = ?", [userId]);
  }

  async getUserMessageCount(userId) {
    const row = await this.db.get('SELECT COUNT(*) as count FROM messages WHERE user_id = ?', [userId]);
    return row ? row.count : 0;
  }

  async deleteUser(userId, deleteMessages = false) {
    if (deleteMessages) {
      const messages = await this.db.all('SELECT file_path FROM messages WHERE user_id = ? AND file_path IS NOT NULL', [userId]);
      const fs = require('fs');
      const path = require('path');
      messages.forEach(msg => {
        if (msg.file_path) {
          const filePath = path.join(__dirname, '..', 'public', msg.file_path);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
      });
      await this.db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
    }
    await this.db.run('DELETE FROM users WHERE id = ?', [userId]);
  }

  async getTotalMessages() {
    const row = await this.db.get('SELECT COUNT(*) as count FROM messages');
    return row ? row.count : 0;
  }

  async deleteMessageAdmin(messageId) {
    const message = await this.db.get('SELECT * FROM messages WHERE id = ?', [messageId]);
    if (!message) return false;

    if (message.file_path) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', 'public', message.file_path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    await this.db.run('DELETE FROM messages WHERE id = ?', [messageId]);
    return true;
  }

  async createNote(channelId, userId, title, content, tags, filePath, fileName, fileType, imagePath) {
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags || '';
    const result = await this.db.run(
      'INSERT INTO notes (channel_id, user_id, title, content, tags, file_path, file_name, file_type, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [channelId, userId, title, content || '', tagsStr, filePath, fileName, fileType, imagePath]
    );
    return await this.db.get('SELECT * FROM notes WHERE id = ?', [result.lastID]);
  }

  async getNotes(channelId) {
    return await this.db.all(
      'SELECT n.*, u.name as user_name, u.avatar as user_avatar FROM notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.channel_id = ? ORDER BY n.created_at DESC',
      [channelId]
    );
  }

  async getNote(noteId) {
    return await this.db.get(
      'SELECT n.*, u.name as user_name, u.avatar as user_avatar FROM notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?',
      [noteId]
    );
  }

  async updateNote(noteId, title, content, tags, filePath, fileName, fileType, imagePath) {
    const tagsStr = Array.isArray(tags) ? tags.join(',') : tags || '';
    const now = this.formatLocalDateTime(new Date());
    await this.db.run(
      'UPDATE notes SET title = ?, content = ?, tags = ?, file_path = ?, file_name = ?, file_type = ?, image_path = ?, updated_at = ? WHERE id = ?',
      [title, content || '', tagsStr, filePath, fileName, fileType, imagePath, now, noteId]
    );
    return await this.getNote(noteId);
  }

  async deleteNote(noteId) {
    const note = await this.db.get('SELECT * FROM notes WHERE id = ?', [noteId]);
    if (!note) return false;

    const fs = require('fs');
    const path = require('path');

    if (note.file_path) {
      const filePath = path.join(__dirname, '..', 'public', note.file_path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    if (note.image_path) {
      const imagePath = path.join(__dirname, '..', 'public', note.image_path);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    await this.db.run('DELETE FROM notes WHERE id = ?', [noteId]);
    return true;
  }
}

module.exports = ChatStore;
