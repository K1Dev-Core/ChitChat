function showConfirmModal(options) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const content = document.createElement('div');
    content.className = 'custom-modal-content';
    content.style.cssText = 'background: #2B2D31; border-radius: 8px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);';
    
    const title = document.createElement('h2');
    title.style.cssText = 'font-size: 20px; font-weight: 700; color: #F2F3F5; margin-bottom: 12px;';
    title.textContent = options.title || 'ยืนยันการดำเนินการ';
    
    const message = document.createElement('p');
    message.style.cssText = 'font-size: 14px; color: #949BA4; margin-bottom: 20px; line-height: 1.5;';
    message.textContent = options.message || 'คุณต้องการดำเนินการต่อหรือไม่?';
    
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = 'padding: 8px 16px; background: #35373C; color: #F2F3F5; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s;';
    cancelBtn.textContent = options.cancelText || 'ยกเลิก';
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#404249';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#35373C';
    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(false);
    };
    
    const confirmBtn = document.createElement('button');
    confirmBtn.style.cssText = `padding: 8px 16px; background: ${options.danger ? '#F23F43' : '#5865F2'}; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s;`;
    confirmBtn.textContent = options.confirmText || 'ยืนยัน';
    confirmBtn.onmouseover = () => confirmBtn.style.background = options.danger ? '#D83C3F' : '#4752C4';
    confirmBtn.onmouseout = () => confirmBtn.style.background = options.danger ? '#F23F43' : '#5865F2';
    confirmBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(true);
    };
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);
    
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(buttons);
    modal.appendChild(content);
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    };
    
    document.body.appendChild(modal);
  });
}

function showAlertModal(options) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const content = document.createElement('div');
    content.className = 'custom-modal-content';
    content.style.cssText = 'background: #2B2D31; border-radius: 8px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);';
    
    const title = document.createElement('h2');
    title.style.cssText = 'font-size: 20px; font-weight: 700; color: #F2F3F5; margin-bottom: 12px;';
    title.textContent = options.title || 'แจ้งเตือน';
    
    const message = document.createElement('p');
    message.style.cssText = 'font-size: 14px; color: #949BA4; margin-bottom: 20px; line-height: 1.5;';
    message.textContent = options.message || '';
    
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';
    
    const okBtn = document.createElement('button');
    okBtn.style.cssText = `padding: 8px 16px; background: ${options.type === 'error' ? '#F23F43' : options.type === 'success' ? '#23A559' : '#5865F2'}; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s;`;
    okBtn.textContent = options.okText || 'ตกลง';
    okBtn.onmouseover = () => okBtn.style.background = options.type === 'error' ? '#D83C3F' : options.type === 'success' ? '#1E8E4A' : '#4752C4';
    okBtn.onmouseout = () => okBtn.style.background = options.type === 'error' ? '#F23F43' : options.type === 'success' ? '#23A559' : '#5865F2';
    okBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve();
    };
    
    buttons.appendChild(okBtn);
    
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(buttons);
    modal.appendChild(content);
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve();
      }
    };
    
    document.body.appendChild(modal);
  });
}

