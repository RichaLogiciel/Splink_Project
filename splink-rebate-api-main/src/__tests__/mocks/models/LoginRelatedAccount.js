class MockLoginRelatedAccount {
  static belongsTo() {
    return this;
  }

  static init() {
    return this;
  }

  static findOne() {
    return Promise.resolve(null);
  }

  static findAll() {
    return Promise.resolve([]);
  }

  static create() {
    return Promise.resolve({});
  }

  static update() {
    return Promise.resolve([1]);
  }

  static destroy() {
    return Promise.resolve(1);
  }
}

export default MockLoginRelatedAccount;
