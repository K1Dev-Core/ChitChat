class Message {
  constructor(id, userId, text, userName, userAvatar, filePath = null, fileName = null, fileType = null, fileSize = null, isLink = false, expireAt = null) {
    this.id = id;
    this.userId = userId;
    this.userName = userName;
    this.userAvatar = userAvatar;
    this.text = text || '';
    this.filePath = filePath;
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileSize = fileSize;
    this.isLink = isLink;
    this.expireAt = expireAt ? new Date(expireAt) : null;
    this.timestamp = new Date();
  }

  getFormattedTimestamp() {
    const now = new Date();
    const msgDate = new Date(this.timestamp);

    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDay = now.getDate();

    const msgYear = msgDate.getFullYear();
    const msgMonth = msgDate.getMonth();
    const msgDay = msgDate.getDate();

    const today = new Date(nowYear, nowMonth, nowDay);
    const messageDate = new Date(msgYear, msgMonth, msgDay);

    if (messageDate.getTime() === today.getTime()) {
      const hours = String(msgDate.getHours()).padStart(2, '0');
      const minutes = String(msgDate.getMinutes()).padStart(2, '0');
      return `วันนี้ ${hours}:${minutes}`;
    }

    const day = String(msgDate.getDate()).padStart(2, '0');
    const month = String(msgDate.getMonth() + 1).padStart(2, '0');
    const hours = String(msgDate.getHours()).padStart(2, '0');
    const minutes = String(msgDate.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  }

  isImage() {
    if (!this.fileType) return false;
    return this.fileType.startsWith('image/');
  }

  checkIsLink() {
    return this.isLink || (this.text && this.isValidUrl(this.text));
  }

  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  formatFileSize() {
    if (!this.fileSize) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      userName: this.userName,
      userAvatar: this.userAvatar,
      text: this.text,
      filePath: this.filePath,
      fileName: this.fileName,
      fileType: this.fileType,
      fileSize: this.fileSize,
      isLink: this.isLink || (this.text && this.isValidUrl(this.text)),
      timestamp: this.getFormattedTimestamp()
    };
  }
}

module.exports = Message;

