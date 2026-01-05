class AdminController {
    constructor(chatStore) {
        this.chatStore = chatStore;
    }

    getLoginPage(req, res) {
        if (req.session.isAdmin) {
            return res.redirect('/admin/dashboard');
        }
        res.render('admin/login');
    }

    async getDashboard(req, res) {
        try {
            const totalUsers = await this.chatStore.getAllUsers();
            const totalMessages = await this.chatStore.getTotalMessages();
            const totalServers = await this.chatStore.getAllServers();
            const totalChannels = await this.chatStore.getAllChannels();

            res.render('admin/dashboard', {
                stats: {
                    totalUsers: totalUsers.length,
                    totalMessages: totalMessages,
                    totalServers: totalServers.length,
                    totalChannels: totalChannels.length
                }
            });
        } catch (error) {
            console.error('Error in getDashboard:', error);
            res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ');
        }
    }

    async getUsersPage(req, res) {
        try {
            const users = await this.chatStore.getAllUsers();
            const usersWithCounts = await Promise.all(users.map(async (user) => {
                const messageCount = await this.chatStore.getUserMessageCount(user.id);
                return { ...user, messageCount };
            }));
            res.render('admin/users', { users: usersWithCounts });
        } catch (error) {
            console.error('Error in getUsersPage:', error);
            res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ');
        }
    }

    async banUser(req, res) {
        try {
            const { userId } = req.body;
            await this.chatStore.banUser(userId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in banUser:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแบนผู้ใช้' });
        }
    }

    async unbanUser(req, res) {
        try {
            const { userId } = req.body;
            await this.chatStore.unbanUser(userId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in unbanUser:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยกเลิกการแบน' });
        }
    }

    async deleteUser(req, res) {
        try {
            const { userId, deleteMessages } = req.body;
            await this.chatStore.deleteUser(userId, deleteMessages === true);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in deleteUser:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' });
        }
    }

    async getServersPage(req, res) {
        try {
            const servers = await this.chatStore.getAllServers();
            res.render('admin/servers', { servers });
        } catch (error) {
            console.error('Error in getServersPage:', error);
            res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ');
        }
    }

    async createServer(req, res) {
        try {
            const { name, avatarUrl } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'กรุณาใส่ชื่อ server' });
            }
            let avatar = null;
            if (avatarUrl && avatarUrl.trim()) {
                avatar = avatarUrl.trim();
            } else if (req.file) {
                avatar = `/uploads/${req.file.filename}`;
            }
            const server = await this.chatStore.createServer(name.trim(), avatar);
            res.json({ success: true, server });
        } catch (error) {
            console.error('Error in createServer:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้าง server' });
        }
    }

    async updateServer(req, res) {
        try {
            const { serverId, name, avatarUrl } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'กรุณาใส่ชื่อ server' });
            }
            let avatar = undefined;
            if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl.trim() !== '') {
                avatar = avatarUrl.trim();
            } else if (req.file) {
                avatar = `/uploads/${req.file.filename}`;
            } else if (avatarUrl === '') {
                avatar = null;
            }
            await this.chatStore.updateServer(parseInt(serverId), name.trim(), avatar);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in updateServer:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไข server' });
        }
    }

    async deleteServer(req, res) {
        try {
            const { serverId } = req.body;
            await this.chatStore.deleteServer(serverId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in deleteServer:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบ server' });
        }
    }

    async getChannelsPage(req, res) {
        try {
            const servers = await this.chatStore.getAllServers();
            const channels = await this.chatStore.getAllChannels();
            res.render('admin/channels', { servers, channels });
        } catch (error) {
            console.error('Error in getChannelsPage:', error);
            res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ');
        }
    }

    async createChannel(req, res) {
        try {
            const { serverId, name, type } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'กรุณาใส่ชื่อ channel' });
            }
            const channel = await this.chatStore.createChannel(serverId, name.trim(), type || 'text');
            res.json({ success: true, channel });
        } catch (error) {
            console.error('Error in createChannel:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้าง channel' });
        }
    }

    async updateChannel(req, res) {
        try {
            const { channelId, name, type } = req.body;
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'กรุณาใส่ชื่อ channel' });
            }
            await this.chatStore.updateChannel(channelId, name.trim(), type);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in updateChannel:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไข channel' });
        }
    }

    async deleteChannel(req, res) {
        try {
            const { channelId } = req.body;
            await this.chatStore.deleteChannel(channelId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in deleteChannel:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบ channel' });
        }
    }

    async getMessagesPage(req, res) {
        try {
            const channels = await this.chatStore.getAllChannels();
            const selectedChannel = req.query.channel || 'c1';
            const messages = await this.chatStore.getChannelMessages(selectedChannel, 1000);
            res.render('admin/messages', { channels, messages, selectedChannel });
        } catch (error) {
            console.error('Error in getMessagesPage:', error);
            res.status(500).send('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ');
        }
    }

    async deleteMessageAdmin(req, res) {
        try {
            const { messageId } = req.body;
            await this.chatStore.deleteMessageAdmin(messageId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error in deleteMessageAdmin:', error);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อความ' });
        }
    }

    async logout(req, res) {
        req.session.isAdmin = false;
        req.session.save((err) => {
            if (err) {
                return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
            }
            res.json({ success: true });
        });
    }
}

module.exports = AdminController;

