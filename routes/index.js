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

  router.get('/notes/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      const channel = await chatStore.getChannel(channelId);
      if (!channel || channel.type !== 'note') {
        return res.status(404).render('404');
      }
      await chatController.getNotesPage(req, res);
    } catch (error) {
      console.error('Notes page error:', error);
      res.status(500).render('500', { error: error.message });
    }
  });

  router.get('/api/notes/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      const notes = await chatStore.getNotes(channelId);
      res.json(notes);
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดโน้ต' });
    }
  });

  router.get('/api/note/:noteId', async (req, res) => {
    try {
      const { noteId } = req.params;
      const note = await chatStore.getNote(noteId);
      if (!note) {
        return res.status(404).json({ error: 'ไม่พบโน้ต' });
      }
      res.json(note);
    } catch (error) {
      console.error('Get note error:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดโน้ต' });
    }
  });

  router.post('/api/notes', upload.array('uploads', 10), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      }

      const { channelId, title, content, tags } = req.body;
      if (!channelId || !title) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
      }

      const uploads = Array.isArray(req.files) ? req.files : [];

      const files = uploads.map(f => ({
        path: `/uploads/${f.filename}`,
        name: f.originalname,
        type: f.mimetype,
        size: f.size
      }));

      const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

      const note = await chatStore.createNote(
        channelId,
        userId,
        title,
        content || '',
        tagsArray,
        JSON.stringify(files),
        files.length ? files[0].name : null,
        files.length ? files[0].type : null,
        files.length ? files[0].path : null
      );

      res.json({ success: true, note });
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างโน้ต' });
    }
  });

  router.put('/api/notes/:noteId', upload.array('uploads', 10), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      }

      const { noteId } = req.params;
      const note = await chatStore.getNote(noteId);
      if (!note || note.user_id !== userId) {
        return res.status(403).json({ error: 'ไม่สามารถแก้ไขโน้ตนี้ได้' });
      }

      const { title, content, tags } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'กรุณากรอกหัวข้อ' });
      }

      const fs = require('fs');
      const path = require('path');

      const uploads = Array.isArray(req.files) ? req.files : [];

      let prevFiles = [];
      if (note.file_path) {
        try {
          const parsed = JSON.parse(note.file_path);
          if (Array.isArray(parsed)) prevFiles = parsed;
        } catch (e) {
          prevFiles = [];
        }
      }

      if (uploads.length) {
        prevFiles.forEach(f => {
          if (!f || !f.path) return;
          const fullPath = path.join(__dirname, '..', 'public', f.path);
          try {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          } catch (err) {
          }
        });
      }

      const files = uploads.length ? uploads.map(f => ({
        path: `/uploads/${f.filename}`,
        name: f.originalname,
        type: f.mimetype,
        size: f.size
      })) : prevFiles;

      const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

      const updatedNote = await chatStore.updateNote(
        noteId,
        title,
        content || '',
        tagsArray,
        JSON.stringify(files),
        files.length ? files[0].name : null,
        files.length ? files[0].type : null,
        files.length ? files[0].path : null
      );

      res.json({ success: true, note: updatedNote });
    } catch (error) {
      console.error('Update note error:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขโน้ต' });
    }
  });

  router.delete('/api/notes/:noteId', async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
      }

      const { noteId } = req.params;
      const note = await chatStore.getNote(noteId);
      if (!note || note.user_id !== userId) {
        return res.status(403).json({ error: 'ไม่สามารถลบโน้ตนี้ได้' });
      }

      const deleted = await chatStore.deleteNote(noteId);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'ไม่พบโน้ต' });
      }
    } catch (error) {
      console.error('Delete note error:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบโน้ต' });
    }
  });

  return { router };
};

