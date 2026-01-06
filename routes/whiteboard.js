const express = require('express');
const router = express.Router();

module.exports = (chatStore) => {
  router.get('/api/whiteboard/:channelId', async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
      }
      const { channelId } = req.params;
      const data = await chatStore.getWhiteboardData(channelId);
      res.json(data || null);
    } catch (error) {
      console.error('Error getting whiteboard:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลด whiteboard' });
    }
  });

  router.post('/api/whiteboard/:channelId', async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
      }
      const { channelId } = req.params;
      const canvasData = req.body;
      await chatStore.saveWhiteboardData(channelId, canvasData);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving whiteboard:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึก whiteboard' });
    }
  });

  return router;
};

