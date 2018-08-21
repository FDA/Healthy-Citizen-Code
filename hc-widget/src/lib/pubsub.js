class PubSub {
  constructor() {
    this.topics = {};
  }

  on(name, cb) {
    this.topics[name] = this.topics[name] || [];
    this.topics[name].push(cb);
  }

  off(name) {
    this.topics[name] = undefined;
  }

  trigger(name, data) {
    const cbs = this.topics[name];
    if (!cbs) {
      return;
    }

    cbs.forEach(cb => cb(data))
  }
}

const pubSub = new PubSub();
export default pubSub;