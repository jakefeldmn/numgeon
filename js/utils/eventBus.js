const listeners = {};

export const eventBus = {
  on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (!listeners[event]) return;
    for (const cb of listeners[event]) {
      cb(data);
    }
  },

  clear() {
    for (const key in listeners) {
      delete listeners[key];
    }
  },
};
