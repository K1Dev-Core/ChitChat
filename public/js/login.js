function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  const container = getOrCreateNotificationContainer();
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  let iconSvg = '';
  if (type === 'error') {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
  } else if (type === 'success') {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else {
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }
  
  notification.innerHTML = `
    <div class="notification-icon">${iconSvg}</div>
    <div class="notification-content">
      <div class="notification-title">${type === 'error' ? 'เกิดข้อผิดพลาด' : type === 'warning' ? 'คำเตือน' : type === 'success' ? 'สำเร็จ' : 'แจ้งเตือน'}</div>
      <div class="notification-message">${escapeHtml(message)}</div>
    </div>
    <div class="notification-close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
  `;
  
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    removeNotification(notification);
  });
  
  container.appendChild(notification);
  
  setTimeout(() => {
    removeNotification(notification);
  }, 5000);
  
  return notification;
}

function getOrCreateNotificationContainer() {
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  return container;
}

function removeNotification(notification) {
  notification.classList.add('slide-out');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
  const storedUserName = localStorage.getItem('userName');
  const storedUserAvatar = localStorage.getItem('userAvatar');
  const storedUserId = localStorage.getItem('userId');

  if (storedUserName && storedUserAvatar && storedUserId) {
    window.location.href = '/';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const userNameInput = document.getElementById('userNameInput');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userName = userNameInput.value.trim();
    if (!userName) {
      showNotification('กรุณาใส่ชื่อของคุณ', 'warning');
      return;
    }

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userName }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userAvatar', data.user.avatar);
        localStorage.setItem('userId', data.user.id);
        window.location.href = '/';
      } else {
        showNotification(data.error || 'ไม่สามารถเข้าสู่ระบบได้', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  });
});

