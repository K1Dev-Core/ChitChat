document.addEventListener('DOMContentLoaded', async () => {
  if (window.chatInitialized) {
    return;
  }
  window.chatInitialized = true;

  let socket = null;
  let isLoggedIn = window.appConfig ? window.appConfig.isLoggedIn : false;
  let currentUser = window.appConfig ? window.appConfig.currentUser : null;

  const storedUserId = localStorage.getItem('userId');
  const storedUserName = localStorage.getItem('userName');
  const storedUserAvatar = localStorage.getItem('userAvatar');

  if (!isLoggedIn && storedUserId && storedUserName) {
    if (!window.location.search.includes('userId=')) {
      window.location.href = `/?userId=${encodeURIComponent(storedUserId)}`;
      return;
    }
  }

  socket = io();
  let currentChannelId = window.appConfig?.currentChannelId || 'c1';

  if (isLoggedIn && currentUser) {
    socket.on('connect', () => {
      socket.emit('join', {
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        channelId: currentChannelId
      });
    });
  } else {
    socket.on('connect', () => {
      socket.emit('joinAsGuest', { channelId: currentChannelId });
    });
  }

  const typingUsers = new Map();

  function updateTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    const typingText = typingIndicator?.querySelector('.typing-text');

    if (!typingIndicator || !typingText) return;

    if (typingUsers.size === 0) {
      typingIndicator.style.display = 'none';
      return;
    }

    typingIndicator.style.display = 'flex';

    if (typingUsers.size === 1) {
      const userName = Array.from(typingUsers.values())[0];
      typingText.textContent = `${userName} กำลังพิมพ์...`;
    } else {
      typingText.textContent = 'หลายคนกำลังพิมพ์...';
    }
  }

  socket.on('userTyping', (data) => {
    if (data.channelId !== currentChannelId) return;
    if (data.userId === window.appConfig.currentUser?.id) return;

    typingUsers.set(data.userId, data.userName);
    updateTypingIndicator();
  });

  socket.on('userStopTyping', (data) => {
    if (data.channelId !== currentChannelId) return;
    if (data.userId === window.appConfig.currentUser?.id) return;

    typingUsers.delete(data.userId);
    updateTypingIndicator();
  });

  socket.on('messageHistory', (messages) => {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    allMessages = messages;
    messagesList.innerHTML = '';

    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      messagesList.appendChild(typingIndicator);
    }

    messages.forEach((msg, index) => {
      const isSequential = index > 0 && messages[index - 1].userId === msg.userId;
      const messageDiv = addMessageToDOM(msg, isSequential);
      messagesList.appendChild(messageDiv);

      setTimeout(() => {
        if (typeof hljs !== 'undefined') {
          const codeBlocks = messageDiv.querySelectorAll('code[class*="language-"]');
          codeBlocks.forEach(block => {
            try {
              hljs.highlightElement(block);
            } catch (err) {
              console.error('Highlight element error:', err);
            }
          });
        }
      }, 0);
    });

    if (currentSearchQuery) {
      performSearch(currentSearchQuery);
    } else {
      scrollToBottom();
    }
  });

  socket.on('newMessage', (message) => {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    allMessages.push(message);
    const lastMessage = messagesList.lastElementChild;
    const isSequential = lastMessage && lastMessage.dataset.userId === message.userId;

    const messageDiv = addMessageToDOM(message, isSequential);

    setTimeout(() => {
      if (typeof hljs !== 'undefined') {
        const codeBlocks = messageDiv.querySelectorAll('code[class*="language-"]');
        codeBlocks.forEach(block => {
          try {
            hljs.highlightElement(block);
          } catch (err) {
            console.error('Highlight element error:', err);
          }
        });
      }
    }, 100);

    if (currentSearchQuery) {
      const messageText = message.text.toLowerCase();
      if (messageText.includes(currentSearchQuery)) {
        const newItem = messagesList.lastElementChild;
        if (newItem) {
          newItem.classList.add('search-match');
          const textElement = newItem.querySelector('.message-text');
          if (textElement) {
            highlightText(textElement, currentSearchQuery);
          }
        }
      } else {
        const newItem = messagesList.lastElementChild;
        if (newItem) {
          newItem.style.display = 'none';
        }
      }
    } else {
      scrollToBottom();
    }
  });

  socket.on('userStatusUpdate', (data) => {
    if (isLoggedIn && currentUser) {
      updateMemberList(data.users);
    }
  });

  let selectedExpireMinutes = 0;

  const messageInput = document.getElementById('messageInput');

  if (messageInput) {
    if (!isLoggedIn || !currentUser) {
      messageInput.placeholder = 'กรุณาเข้าสู่ระบบเพื่อส่งข้อความ';
      messageInput.disabled = true;
      const fileInput = document.getElementById('fileInput');
      const fileUploadBtn = document.getElementById('fileUploadBtn');
      if (fileInput) fileInput.disabled = true;
      if (fileUploadBtn) fileUploadBtn.disabled = true;
    }

    const expireTimeBtn = document.getElementById('expireTimeBtn');
    const expireTimeMenu = document.getElementById('expireTimeMenu');
    const expireTimeLabel = document.getElementById('expireTimeLabel');

    if (expireTimeBtn && expireTimeMenu) {
      expireTimeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        expireTimeMenu.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!expireTimeBtn.contains(e.target) && !expireTimeMenu.contains(e.target)) {
          expireTimeMenu.classList.remove('active');
        }
      });

      const expireOptions = expireTimeMenu.querySelectorAll('.expire-time-option');
      expireOptions.forEach(option => {
        option.addEventListener('click', () => {
          const minutes = parseInt(option.dataset.minutes);
          selectedExpireMinutes = minutes;
          expireTimeLabel.textContent = option.textContent;
          expireTimeMenu.classList.remove('active');
        });
      });
    }

    let typingTimeout;
    let isTyping = false;

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        if (!isLoggedIn || !currentUser) {
          showNotification('กรุณาเข้าสู่ระบบก่อนส่งข้อความ', 'warning');
          const loginModal = document.getElementById('loginModal');
          if (loginModal) {
            loginModal.style.display = 'flex';
          }
          return;
        }

        const text = messageInput.value;
        if (!text || text.trim() === '') return;

        if (socket) {
          socket.emit('sendMessage', {
            text: text,
            channelId: currentChannelId,
            expireMinutes: selectedExpireMinutes
          });
          socket.emit('stopTyping', {
            channelId: currentChannelId
          });
          messageInput.value = '';
          messageInput.style.height = 'auto';
          selectedExpireMinutes = 0;
          if (expireTimeLabel) expireTimeLabel.textContent = 'ตลอดไป';
          isTyping = false;
          clearTimeout(typingTimeout);
        } else {
          showNotification('กรุณาเข้าสู่ระบบก่อนส่งข้อความ', 'warning');
        }
      } else if (isLoggedIn && currentUser && socket) {
        if (!isTyping) {
          isTyping = true;
          socket.emit('typing', {
            channelId: currentChannelId,
            userName: currentUser.name
          });
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          if (isTyping) {
            socket.emit('stopTyping', {
              channelId: currentChannelId
            });
            isTyping = false;
          }
        }, 3000);
      }
    });

    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = messageInput.scrollHeight + 'px';
      const maxHeight = 200;
      if (messageInput.scrollHeight > maxHeight) {
        messageInput.style.height = maxHeight + 'px';
        messageInput.style.overflowY = 'auto';
      } else {
        messageInput.style.overflowY = 'hidden';
      }

      if (isLoggedIn && currentUser && socket && messageInput.value.trim() !== '') {
        if (!isTyping) {
          isTyping = true;
          socket.emit('typing', {
            channelId: currentChannelId,
            userName: currentUser.name
          });
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          if (isTyping) {
            socket.emit('stopTyping', {
              channelId: currentChannelId
            });
            isTyping = false;
          }
        }, 3000);
      } else if (isTyping && socket) {
        socket.emit('stopTyping', {
          channelId: currentChannelId
        });
        isTyping = false;
        clearTimeout(typingTimeout);
      }
    });

    // ระบบตรวจสอบโค้ดเมื่อ paste
    let pendingCode = null;
    let codeStartPos = null;

    messageInput.addEventListener('paste', (e) => {
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');

      // ตรวจสอบว่าเป็นโค้ดหรือไม่
      if (isCode(pastedText)) {
        e.preventDefault();
        pendingCode = pastedText;
        codeStartPos = messageInput.selectionStart;

        // แสดง UI สำหรับเลือกภาษา
        showCodeLanguageSelector();
      }
    });

    // ฟังก์ชันตรวจสอบว่าเป็นโค้ดหรือไม่
    function isCode(text) {
      if (!text || text.trim().length < 10) return false;

      // ตรวจสอบว่าเป็น markdown code block อยู่แล้วหรือไม่
      if (text.trim().startsWith('```') && text.trim().endsWith('```')) {
        return false; // ไม่ต้องตรวจสอบอีกเพราะเป็น code block อยู่แล้ว
      }

      // ตรวจสอบ patterns ที่บ่งบอกว่าเป็นโค้ด
      const codePatterns = [
        /^(def|function|class|import|from|const|let|var|public|private|static|void|int|string|bool|float|double|if|else|for|while|return|try|catch|async|await)\s+/m,
        /[{}();=<>[\]]/,
        /^\s*(#|\/\/|\/\*|\*\/)/m,
        /(console\.|print\(|System\.out\.|printf|echo\s)/,
        /(->|=>|::|\.\.\.)/,
        /^\s*(def|function|class|interface|namespace|module|package)\s+\w+/m,
        /(import|from|require|include|using)\s+/,
        /(if|else|elif|switch|case|default|for|while|do|try|catch|finally|with|async|await)\s*[({]/,
        /(const|let|var|final|static|public|private|protected)\s+\w+\s*[:=]/,
        /(function|def|fn|func)\s+\w+\s*[({]/,
        /(class|interface|struct|enum|type)\s+\w+/,
        /(return|yield|break|continue|throw|raise)\s+/,
        /(true|false|null|undefined|None|nil|NULL)\b/,
        /(&&|\|\||==|!=|<=|>=|===|!==)/,
        /(\.length|\.size|\.count|\.push|\.pop|\.map|\.filter|\.reduce)/,
        /(\.js|\.py|\.java|\.cpp|\.c|\.cs|\.php|\.rb|\.go|\.rs|\.swift|\.kt|\.ts)$/m
      ];

      let codeScore = 0;
      const lines = text.split('\n').filter(line => line.trim().length > 0);

      if (lines.length < 2) return false; // ต้องมีอย่างน้อย 2 บรรทัด

      // ตรวจสอบแต่ละบรรทัด
      for (const line of lines) {
        for (const pattern of codePatterns) {
          if (pattern.test(line)) {
            codeScore++;
            break;
          }
        }
      }

      // ถ้ามี pattern ตรงมากกว่า 2 บรรทัด หรือมี pattern หลายแบบ ให้ถือว่าเป็นโค้ด
      // หรือถ้ามี pattern ตรงและมีบรรทัดมากกว่า 3 บรรทัด
      return codeScore >= 2 || (codeScore >= 1 && lines.length >= 3);
    }

    // แสดง UI สำหรับเลือกภาษา
    function showCodeLanguageSelector() {
      const selector = document.getElementById('codeLanguageSelector');
      if (selector) {
        selector.style.display = 'flex';
      }
    }

    // ซ่อน UI สำหรับเลือกภาษา
    function hideCodeLanguageSelector() {
      const selector = document.getElementById('codeLanguageSelector');
      if (selector) {
        selector.style.display = 'none';
      }
      pendingCode = null;
      codeStartPos = null;
    }

    // จัดการการเลือกภาษา
    const codeLanguageSelector = document.getElementById('codeLanguageSelector');
    if (codeLanguageSelector) {
      codeLanguageSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.code-lang-btn');
        if (!btn) return;

        const lang = btn.dataset.lang;

        if (lang === 'cancel') {
          hideCodeLanguageSelector();
          return;
        }

        if (lang === 'other') {
          showLanguageModal();
          return;
        }

        insertCodeWithLanguage(pendingCode, lang);
        hideCodeLanguageSelector();
      });
    }

    // แทรกโค้ดพร้อมภาษา
    function insertCodeWithLanguage(code, language) {
      if (!code || !codeStartPos) return;

      const currentValue = messageInput.value;
      const beforeCode = currentValue.substring(0, codeStartPos);
      const afterCode = currentValue.substring(messageInput.selectionEnd);

      const codeBlock = `\`\`\`${language}\n${code}\n\`\`\``;
      const newValue = beforeCode + codeBlock + afterCode;

      messageInput.value = newValue;
      messageInput.focus();

      // ตั้งค่า cursor position หลัง code block
      const newPos = codeStartPos + codeBlock.length;
      messageInput.setSelectionRange(newPos, newPos);

      // Trigger input event เพื่อปรับความสูง
      messageInput.dispatchEvent(new Event('input'));
    }

    // แสดง modal สำหรับเลือกภาษาทั้งหมด
    function showLanguageModal() {
      const modal = document.getElementById('languageModal');
      const grid = document.getElementById('languageGrid');

      if (!modal || !grid) return;

      const languages = [
        'python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'csharp',
        'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'sql', 'html', 'css',
        'json', 'xml', 'bash', 'shell', 'yaml', 'markdown', 'r', 'matlab',
        'perl', 'scala', 'dart', 'lua', 'haskell', 'clojure', 'elixir',
        'erlang', 'ocaml', 'fsharp', 'vbnet', 'powershell', 'dockerfile',
        'makefile', 'nginx', 'apache', 'diff', 'ini', 'toml', 'cmake'
      ];

      grid.innerHTML = '';
      languages.forEach(lang => {
        const item = document.createElement('div');
        item.className = 'language-item';
        item.textContent = lang;
        item.onclick = () => {
          insertCodeWithLanguage(pendingCode, lang);
          closeLanguageModal();
          hideCodeLanguageSelector();
        };
        grid.appendChild(item);
      });

      modal.style.display = 'flex';
    }

    // ปิด modal สำหรับเลือกภาษา
    function closeLanguageModal() {
      const modal = document.getElementById('languageModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    // ปิด modal เมื่อคลิกนอก modal
    const languageModal = document.getElementById('languageModal');
    if (languageModal) {
      languageModal.addEventListener('click', (e) => {
        if (e.target === languageModal) {
          closeLanguageModal();
        }
      });
    }

    // เปิดใช้งานฟังก์ชัน closeLanguageModal ใน global scope
    window.closeLanguageModal = closeLanguageModal;
  }

  if (!isLoggedIn || !currentUser) {
    const loginForm = document.getElementById('loginForm');
    const userNameInput = document.getElementById('userNameInput');
    const loginModal = document.getElementById('loginModal');

    if (loginForm) {
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

            if (loginModal) {
              loginModal.style.display = 'none';
            }

            setTimeout(() => {
              window.location.reload();
            }, 100);
          } else {
            showNotification(data.error || 'ไม่สามารถเข้าสู่ระบบได้', 'error');
          }
        } catch (error) {
          console.error('Login error:', error);
          showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
        }
      });
    }
  }

  const toggleMembers = document.getElementById('toggleMembers');
  const memberSidebar = document.getElementById('memberSidebar');
  const memberSidebarClose = document.getElementById('memberSidebarClose');

  if (toggleMembers && memberSidebar) {
    toggleMembers.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        memberSidebar.classList.toggle('visible');
      } else {
        memberSidebar.classList.toggle('hidden');
        toggleMembers.classList.toggle('active');
      }
    });
  }

  if (memberSidebarClose && memberSidebar) {
    memberSidebarClose.addEventListener('click', () => {
      memberSidebar.classList.remove('visible');
    });
  }

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const channelSidebar = document.querySelector('.channel-sidebar');
  const channelSidebarOverlay = document.getElementById('channelSidebarOverlay');
  const channelSidebarClose = document.getElementById('channelSidebarClose');

  function closeChannelSidebar() {
    if (channelSidebar) {
      channelSidebar.classList.remove('open');
    }
    if (channelSidebarOverlay) {
      channelSidebarOverlay.classList.remove('active');
    }
  }

  if (mobileMenuBtn && channelSidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = channelSidebar.classList.toggle('open');
      if (channelSidebarOverlay) {
        if (isOpen) {
          channelSidebarOverlay.classList.add('active');
        } else {
          channelSidebarOverlay.classList.remove('active');
        }
      }
    });
  }

  if (channelSidebarClose) {
    channelSidebarClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeChannelSidebar();
    });
  }

  if (channelSidebarOverlay) {
    channelSidebarOverlay.addEventListener('click', () => {
      closeChannelSidebar();
    });
  }

  const channelItems = document.querySelectorAll('.channel-item');
  channelItems.forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeChannelSidebar();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024 && memberSidebar) {
      memberSidebar.classList.remove('visible');
    }
    if (window.innerWidth > 768 && channelSidebar) {
      channelSidebar.classList.remove('open');
    }
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();

      if (query === '') {
        clearSearch();
        return;
      }

      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        clearSearch();
      }
    });
  }

  const userInfo = document.getElementById('userInfo');
  const userMenu = document.getElementById('userMenu');
  const logoutBtn = document.getElementById('logoutBtn');

  if (userInfo && userMenu) {
    userInfo.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!userInfo.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.remove('active');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success) {
          localStorage.removeItem('userName');
          localStorage.removeItem('userAvatar');
          localStorage.removeItem('userId');
          window.location.href = '/';
        } else {
          showNotification('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
        }
      } catch (error) {
        console.error('Logout error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    });
  }

  if (isLoggedIn && currentUser) {
    localStorage.setItem('userName', currentUser.name);
    localStorage.setItem('userAvatar', currentUser.avatar);
    localStorage.setItem('userId', currentUser.id);
  }

  const fileInput = document.getElementById('fileInput');
  const fileUploadBtn = document.getElementById('fileUploadBtn');
  const uploadProgress = document.getElementById('uploadProgress');
  const uploadProgressFill = document.getElementById('uploadProgressFill');
  const uploadProgressText = document.getElementById('uploadProgressText');

  if (fileUploadBtn && fileInput) {
    fileUploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const maxSize = 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        showNotification('ไฟล์มีขนาดใหญ่เกิน 1GB กรุณาเลือกไฟล์ที่เล็กกว่า', 'error');
        fileInput.value = '';
        return;
      }

      if (!socket) {
        showNotification('กรุณาเข้าสู่ระบบก่อนอัพโหลดไฟล์', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      uploadProgress.style.display = 'block';
      uploadProgressFill.style.width = '0%';
      uploadProgressText.textContent = `กำลังอัพโหลด ${file.name}...`;

      try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            uploadProgressFill.style.width = percentComplete + '%';
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                uploadProgressFill.style.width = '100%';
                uploadProgressText.textContent = 'อัพโหลดสำเร็จ';
                setTimeout(() => {
                  uploadProgress.style.display = 'none';
                  fileInput.value = '';
                }, 1000);

                socket.emit('fileUploaded', {
                  message: response.message,
                  channelId: currentChannelId
                });
                selectedExpireMinutes = 0;
                const expireTimeLabel = document.getElementById('expireTimeLabel');
                if (expireTimeLabel) expireTimeLabel.textContent = 'ตลอดไป';
              } else {
                showNotification(response.error || 'เกิดข้อผิดพลาดในการอัพโหลด', 'error');
                uploadProgress.style.display = 'none';
              }
            } catch (parseError) {
              console.error('Parse response error:', parseError);
              showNotification('เกิดข้อผิดพลาดในการอัพโหลด', 'error');
              uploadProgress.style.display = 'none';
            }
          } else if (xhr.status === 413) {
            showNotification('ไฟล์มีขนาดใหญ่เกิน 1GB', 'error');
            uploadProgress.style.display = 'none';
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              showNotification(errorResponse.error || 'เกิดข้อผิดพลาดในการอัพโหลด', 'error');
            } catch (e) {
              showNotification('เกิดข้อผิดพลาดในการอัพโหลด', 'error');
            }
            uploadProgress.style.display = 'none';
          }
        });

        xhr.addEventListener('error', () => {
          showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
          uploadProgress.style.display = 'none';
        });

        xhr.addEventListener('timeout', () => {
          showNotification('การอัพโหลดใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง', 'error');
          uploadProgress.style.display = 'none';
        });

        xhr.timeout = 600000;

        const expireMinutes = selectedExpireMinutes || 0;
        xhr.open('POST', `/upload?channel=${currentChannelId}&expireMinutes=${expireMinutes}`);
        xhr.send(formData);
      } catch (error) {
        console.error('Upload error:', error);
        showNotification('เกิดข้อผิดพลาดในการอัพโหลด', 'error');
        uploadProgress.style.display = 'none';
      }
    });
  }

  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('message-delete-btn')) {
      e.stopPropagation();
      const messageId = e.target.dataset.messageId;
      deleteMessage(messageId);
    }
  });

  if (socket) {
    socket.on('messageDeleted', (data) => {
      const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
      if (messageElement) {
        const messageItem = messageElement.closest('.message-item');
        if (messageItem) {
          messageItem.style.animation = 'fadeOut 0.3s ease-out';
          setTimeout(() => {
            messageItem.remove();
          }, 300);
        }
      }
    });
  }
});

async function deleteMessage(messageId) {
  const confirmed = await showConfirmModal({
    title: 'ยืนยันการลบ',
    message: 'คุณต้องการลบข้อความนี้หรือไม่?',
    confirmText: 'ลบ',
    cancelText: 'ยกเลิก',
    danger: true
  });

  if (!confirmed) return;

  try {
    const response = await fetch('/delete-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId }),
    });

    const data = await response.json();

    if (data.success) {
      if (socket) {
        const channelId = window.appConfig?.currentChannelId || currentChannelId || 'c1';
        socket.emit('deleteMessage', { messageId, channelId });
      }
      showNotification('ลบข้อความสำเร็จ', 'success');
    } else {
      showNotification(data.error || 'ไม่สามารถลบข้อความได้', 'error');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showNotification('เกิดข้อผิดพลาดในการลบข้อความ', 'error');
  }
}

function openImageLightbox(imageSrc) {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  if (lightbox && lightboxImage) {
    lightboxImage.src = imageSrc;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeImageLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
}

let allMessages = [];
let currentSearchQuery = '';

function performSearch(query) {
  currentSearchQuery = query.toLowerCase();
  const messagesList = document.getElementById('messagesList');
  if (!messagesList) return;

  const messageItems = messagesList.querySelectorAll('.message-item');
  let foundCount = 0;

  messageItems.forEach((item) => {
    const messageText = item.querySelector('.message-text');
    if (!messageText) return;

    const originalText = messageText.getAttribute('data-original') || messageText.textContent;
    if (!messageText.getAttribute('data-original')) {
      messageText.setAttribute('data-original', originalText);
    }

    const text = originalText.toLowerCase();
    const isMatch = text.includes(currentSearchQuery);

    if (isMatch) {
      item.classList.add('search-match');
      item.style.display = '';
      foundCount++;

      if (currentSearchQuery) {
        highlightText(messageText, currentSearchQuery);
      }
    } else {
      item.classList.remove('search-match');
      item.style.display = 'none';
    }
  });

  if (foundCount === 0 && currentSearchQuery) {
    showSearchNoResults();
  } else {
    hideSearchNoResults();
    if (foundCount > 0) {
      const firstMatch = messagesList.querySelector('.search-match');
      if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

function highlightText(element, query) {
  if (!element) return;
  const originalHTML = element.getAttribute('data-original') || element.textContent;
  element.setAttribute('data-original', originalHTML);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const highlighted = originalHTML.replace(regex, '<mark class="search-highlight">$1</mark>');
  element.innerHTML = highlighted;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearch() {
  currentSearchQuery = '';
  const messagesList = document.getElementById('messagesList');
  if (!messagesList) return;

  const messageItems = messagesList.querySelectorAll('.message-item');
  messageItems.forEach((item) => {
    item.classList.remove('search-match');
    item.style.display = '';

    const messageText = item.querySelector('.message-text');
    if (messageText) {
      const originalText = messageText.getAttribute('data-original');
      if (originalText) {
        messageText.innerHTML = escapeHtml(originalText);
        messageText.removeAttribute('data-original');
      } else {
        const text = messageText.textContent;
        messageText.innerHTML = escapeHtml(text);
      }
    }
  });

  hideSearchNoResults();
  scrollToBottom();
}

function showSearchNoResults() {
  let noResults = document.getElementById('searchNoResults');
  if (!noResults) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    noResults = document.createElement('div');
    noResults.id = 'searchNoResults';
    noResults.className = 'search-no-results';
    noResults.innerHTML = `
      <div class="search-no-results-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      <div class="search-no-results-text">ไม่พบผลการค้นหา</div>
      <div class="search-no-results-hint">ลองค้นหาด้วยคำอื่น</div>
    `;
    messagesContainer.appendChild(noResults);
  }
  noResults.style.display = 'flex';
}

function hideSearchNoResults() {
  const noResults = document.getElementById('searchNoResults');
  if (noResults) {
    noResults.style.display = 'none';
  }
}

function addMessageToDOM(message, isSequential) {
  const messagesList = document.getElementById('messagesList');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message-item ${isSequential ? 'sequential' : ''}`;
  messageDiv.dataset.userId = message.userId;
  messageDiv.dataset.messageId = message.id;

  const currentUser = window.appConfig?.currentUser || null;
  const isOwner = currentUser && currentUser.id === message.userId;
  const deleteBtn = isOwner ? `<button class="message-delete-btn" data-message-id="${message.id}" title="ลบข้อความ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  </button>` : '';

  let expireCountdown = '';
  if (message.expireAt) {
    const expireDate = new Date(message.expireAt);
    const now = new Date();
    const timeLeft = expireDate - now;
    if (timeLeft > 0) {
      const minutesLeft = Math.floor(timeLeft / 60000);
      const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
      if (minutesLeft < 1) {
        expireCountdown = `<div class="message-expire-countdown" data-expire-at="${message.expireAt}" data-message-id="${message.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span class="countdown-text">${secondsLeft}ว</span>
        </div>`;
      } else {
        expireCountdown = `<div class="message-expire-countdown" data-expire-at="${message.expireAt}" data-message-id="${message.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span class="countdown-text">${minutesLeft}น</span>
        </div>`;
      }
    }
  }

  let fileContent = '';
  if (message.filePath) {
    if (message.fileType && message.fileType.startsWith('image/')) {
      const fileName = escapeHtml(message.fileName || 'image');
      fileContent = `<div class="message-image-container">
        <img src="${escapeHtml(message.filePath)}" alt="${fileName}" class="message-image" onclick="openImageLightbox('${escapeHtml(message.filePath)}')" />
        <a href="${escapeHtml(message.filePath)}" download="${fileName}" class="message-image-download-btn" title="ดาวน์โหลดภาพ" onclick="event.stopPropagation();">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
      </div>`;
    } else {
      const fileSize = message.fileSize ? (message.fileSize / 1024).toFixed(1) + ' KB' : '';
      fileContent = `<div class="message-file-container">
        <div class="message-file-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <div class="message-file-info">
          <a href="${escapeHtml(message.filePath)}" download="${escapeHtml(message.fileName || '')}" class="message-file-name">${escapeHtml(message.fileName || 'ไฟล์')}</a>
          <span class="message-file-size">${fileSize}</span>
        </div>
      </div>`;
    }
  }

  let linkContent = '';
  if (message.isLink || (message.text && (message.text.startsWith('http://') || message.text.startsWith('https://')))) {
    linkContent = `<div class="message-link">
      <a href="${escapeHtml(message.text)}" target="_blank" rel="noopener noreferrer" class="message-link-url">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        ${escapeHtml(message.text)}
      </a>
    </div>`;
  }

  let textContent = '';
  if (message.text && !message.isLink && !(message.text.startsWith('http://') || message.text.startsWith('https://'))) {
    const parsedContent = parseMessageContent(message.text);
    textContent = parsedContent;
  }

  if (isSequential) {
    messageDiv.innerHTML = `
      <div class="message-time-indicator">${message.timestamp.split(' ')[1] || ''}</div>
      <div class="message-content" data-message-id="${message.id}" data-user-id="${message.userId}">
        ${fileContent}
        ${linkContent}
        ${textContent}
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <img src="${escapeHtml(message.userAvatar)}" alt="${escapeHtml(message.userName)}" class="message-avatar" />
      <div class="message-content" data-message-id="${message.id}" data-user-id="${message.userId}">
        <div class="message-header">
          <span class="message-author">${escapeHtml(message.userName)}</span>
          <span class="message-timestamp">${escapeHtml(message.timestamp)}</span>
          ${expireCountdown}
          ${deleteBtn}
        </div>
        ${fileContent}
        ${linkContent}
        ${textContent}
      </div>
    `;
  }

  messagesList.appendChild(messageDiv);

  setTimeout(() => {
    const codeBlocks = messageDiv.querySelectorAll('code[class*="language-"]');
    codeBlocks.forEach(block => {
      if (typeof hljs !== 'undefined') {
        try {
          hljs.highlightElement(block);
        } catch (err) {
          console.error('Highlight element error:', err);
        }
      }
    });
  }, 100);

  const copyButtons = messageDiv.querySelectorAll('.code-block-copy');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const codeId = btn.dataset.codeId;
      const codeElement = document.getElementById(codeId);
      if (codeElement) {
        const text = codeElement.textContent;
        navigator.clipboard.writeText(text).then(() => {
          const copyText = btn.querySelector('.copy-text');
          if (copyText) {
            const originalText = copyText.textContent;
            copyText.textContent = 'คัดลอกแล้ว!';
            setTimeout(() => {
              copyText.textContent = originalText;
            }, 2000);
          }
        }).catch(err => {
          console.error('Failed to copy:', err);
        });
      }
    });
  });

  if (message.expireAt) {
    const expireDate = new Date(message.expireAt);
    const now = new Date();
    const timeLeft = expireDate - now;

    if (timeLeft > 0) {
      const countdownElement = messageDiv.querySelector('.message-expire-countdown');
      if (countdownElement) {
        const updateCountdown = () => {
          const now = new Date();
          const timeLeft = expireDate - now;

          if (timeLeft <= 0) {
            if (socket) {
              socket.emit('deleteExpiredMessage', { messageId: message.id, channelId: currentChannelId });
            }
            const messageItem = messageDiv.closest('.message-item');
            if (messageItem) {
              messageItem.style.animation = 'fadeOut 0.3s ease-out';
              setTimeout(() => messageItem.remove(), 300);
            }
            return;
          }

          const minutesLeft = Math.floor(timeLeft / 60000);
          const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
          const countdownText = countdownElement.querySelector('.countdown-text');

          if (countdownText) {
            if (minutesLeft < 1) {
              countdownText.textContent = `${secondsLeft}ว`;
              if (secondsLeft <= 60) {
                messageDiv.classList.add('expiring-soon');
              }
            } else {
              countdownText.textContent = `${minutesLeft}น`;
              if (minutesLeft <= 1) {
                messageDiv.classList.add('expiring-soon');
              }
            }
          }

          setTimeout(updateCountdown, 1000);
        };

        setTimeout(updateCountdown, 1000);
      }
    } else {
      const messageItem = messageDiv.closest('.message-item');
      if (messageItem) {
        messageItem.remove();
      }
    }
  }

  return messageDiv;
}

function parseMessageContent(text) {
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let codeBlockId = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index);
      if (beforeText.trim() || beforeText.includes('\n')) {
        parts.push({ type: 'text', content: escapeHtml(beforeText) });
      }
    }

    const language = match[1] || 'text';
    const code = match[2];
    const uniqueId = `code-${Date.now()}-${codeBlockId++}`;

    parts.push({
      type: 'code',
      language: language.toLowerCase(),
      code: code,
      id: uniqueId
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const afterText = text.substring(lastIndex);
    if (afterText.trim() || afterText.includes('\n')) {
      parts.push({ type: 'text', content: escapeHtml(afterText) });
    }
  }

  if (parts.length === 0) {
    return `<div class="message-text">${escapeHtml(text)}</div>`;
  }

  return parts.map(part => {
    if (part.type === 'text') {
      return `<div class="message-text">${part.content}</div>`;
    } else {
      const highlightedCode = highlightCode(part.code, part.language);
      return `
        <div class="code-block-container">
          <div class="code-block-header">
            <span class="code-block-language">${part.language || 'text'}</span>
            <button class="code-block-copy" data-code-id="${part.id}" title="คัดลอกโค้ด">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span class="copy-text">คัดลอก</span>
            </button>
          </div>
          <pre class="code-block"><code id="${part.id}" class="language-${part.language}">${highlightedCode}</code></pre>
        </div>
      `;
    }
  }).join('');
}

function highlightCode(code, language) {
  if (typeof hljs !== 'undefined') {
    try {
      if (language && language !== 'text' && hljs.getLanguage(language)) {
        return hljs.highlight(code.trim(), { language: language }).value;
      } else {
        return hljs.highlightAuto(code.trim()).value;
      }
    } catch (err) {
      console.error('Highlight error:', err);
      return escapeHtml(code);
    }
  }
  return escapeHtml(code);
}

function updateMemberList(users) {
  const onlineUsers = users.filter(u => u.status !== 'offline');

  const onlineCount = document.getElementById('onlineCount');

  if (onlineCount) onlineCount.textContent = onlineUsers.length;

  const memberSidebar = document.getElementById('memberSidebar');
  if (!memberSidebar) return;

  const onlineList = memberSidebar.querySelector('.member-list');

  if (onlineList) {
    onlineList.innerHTML = onlineUsers.map(user => `
      <div class="member-item">
        <div class="member-avatar">
          <img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.name)}" />
          <div class="status-indicator ${user.status === 'online' ? 'online' : user.status === 'idle' ? 'idle' : 'dnd'}"></div>
        </div>
        <div class="member-info">
          <div class="member-name">${escapeHtml(user.name)}</div>
          <div class="member-role">${escapeHtml(user.role)}</div>
        </div>
      </div>
    `).join('');
  }
}

function scrollToBottom() {
  const chatEnd = document.getElementById('chatEnd');
  if (chatEnd) {
    chatEnd.scrollIntoView({ behavior: 'smooth' });
  }
}

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


