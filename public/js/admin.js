document.addEventListener('DOMContentLoaded', () => {
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('adminPasswordInput').value;

      try {
        const response = await fetch('/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();
        if (data.success) {
          window.location.href = '/admin/dashboard';
        } else {
          await showAlertModal({
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            message: data.error || 'รหัสผ่านไม่ถูกต้อง',
            type: 'error'
          });
        }
      } catch (error) {
        console.error('Login error:', error);
        await showAlertModal({
          title: 'เกิดข้อผิดพลาด',
          message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
          type: 'error'
        });
      }
    });
  }

  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (data.success) {
          window.location.href = '/admin/login';
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }
});

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; padding: 16px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
  
  if (type === 'error') {
    notification.style.background = '#F23F43';
  } else if (type === 'success') {
    notification.style.background = '#23A559';
  } else {
    notification.style.background = '#5865F2';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

