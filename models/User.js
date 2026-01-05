class User {
  constructor(id, name, avatar) {
    this.id = id;
    this.name = name;
    this.avatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
    this.status = 'online';
    this.role = 'Member';
    this.joinedAt = new Date();
  }

  updateStatus(status) {
    this.status = status;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      status: this.status,
      role: this.role
    };
  }
}

module.exports = User;

