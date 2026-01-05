const ADMIN_PASSWORD = 'admin123';

function checkAdminAuth(req, res, next) {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
}

function requireAdminPassword(req, res, next) {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        req.session.save((err) => {
            if (err) {
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึก session' });
            }
            res.json({ success: true });
        });
    } else {
        res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }
}

module.exports = { checkAdminAuth, requireAdminPassword };

