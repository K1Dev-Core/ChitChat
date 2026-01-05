const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const upload = require('../middleware/upload');
const multer = require('multer');
const mime = require('mime-types');

module.exports = (chatStore) => {
  const chatController = new ChatController(chatStore);

  router.get('/', async (req, res) => {
    const userId = req.query.userId;
    if (userId && !req.session.userId) {
      const user = await chatStore.getUser(userId);
      if (user) {
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userAvatar = user.avatar;
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }
    await chatController.getChatPage(req, res);
  });

  router.post('/login', async (req, res) => {
    await chatController.handleLogin(req, res);
  });

  router.post('/logout', async (req, res) => {
    await chatController.handleLogout(req, res);
  });

  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'ไม่มีไฟล์' });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      }

      const filePath = `/uploads/${req.file.filename}`;
      const fileName = req.file.originalname;
      const fileType = req.file.mimetype;
      const fileSize = req.file.size;
      const isLink = false;

      const channelId = req.query.channel || req.body.channelId || 'c1';
      const expireMinutes = parseInt(req.query.expireMinutes) || 0;
      const message = await chatStore.addMessage(channelId, userId, '', filePath, fileName, fileType, fileSize, isLink, expireMinutes);

      res.json({
        success: true,
        message: message
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'ไฟล์มีขนาดใหญ่เกิน 1GB' });
        }
      }
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์' });
    }
  });

  router.post('/delete-message', async (req, res) => {
    try {
      const { messageId } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      }

      const deleted = await chatStore.deleteMessage(messageId, userId);

      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(403).json({ error: 'ไม่สามารถลบข้อความนี้ได้' });
      }
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อความ' });
    }
  });

  return { router };
};

