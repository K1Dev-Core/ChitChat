class Channel {
  constructor(id, name, type = 'text') {
    this.id = id;
    this.name = name;
    this.type = type;
    this.messages = [];
  }

  addMessage(message) {
    this.messages.push(message);
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  getMessages() {
    return this.messages.map(msg => msg.toJSON());
  }
}

module.exports = Channel;

