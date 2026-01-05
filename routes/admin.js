const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { checkAdminAuth, requireAdminPassword } = require('../middleware/adminAuth');
const upload = require('../middleware/upload');

module.exports = (chatStore) => {
    const adminController = new AdminController(chatStore);

    router.get('/login', (req, res) => {
        adminController.getLoginPage(req, res);
    });

    router.post('/login', requireAdminPassword);

    router.get('/dashboard', checkAdminAuth, async (req, res) => {
        await adminController.getDashboard(req, res);
    });

    router.get('/users', checkAdminAuth, async (req, res) => {
        await adminController.getUsersPage(req, res);
    });

    router.post('/users/ban', checkAdminAuth, async (req, res) => {
        await adminController.banUser(req, res);
    });

    router.post('/users/unban', checkAdminAuth, async (req, res) => {
        await adminController.unbanUser(req, res);
    });

    router.post('/users/delete', checkAdminAuth, async (req, res) => {
        await adminController.deleteUser(req, res);
    });

    router.get('/servers', checkAdminAuth, async (req, res) => {
        await adminController.getServersPage(req, res);
    });

    router.post('/servers/create', checkAdminAuth, upload.single('avatar'), async (req, res) => {
        await adminController.createServer(req, res);
    });

    router.post('/servers/update', checkAdminAuth, upload.single('avatar'), async (req, res) => {
        await adminController.updateServer(req, res);
    });

    router.post('/servers/delete', checkAdminAuth, async (req, res) => {
        await adminController.deleteServer(req, res);
    });

    router.get('/channels', checkAdminAuth, async (req, res) => {
        await adminController.getChannelsPage(req, res);
    });

    router.post('/channels/create', checkAdminAuth, async (req, res) => {
        await adminController.createChannel(req, res);
    });

    router.post('/channels/update', checkAdminAuth, async (req, res) => {
        await adminController.updateChannel(req, res);
    });

    router.post('/channels/delete', checkAdminAuth, async (req, res) => {
        await adminController.deleteChannel(req, res);
    });

    router.get('/messages', checkAdminAuth, async (req, res) => {
        await adminController.getMessagesPage(req, res);
    });

    router.post('/messages/delete', checkAdminAuth, async (req, res) => {
        await adminController.deleteMessageAdmin(req, res);
    });

    router.post('/logout', checkAdminAuth, async (req, res) => {
        await adminController.logout(req, res);
    });

    return router;
};

