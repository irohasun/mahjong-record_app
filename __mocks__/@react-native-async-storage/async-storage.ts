const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn((key: string) => {
    return Promise.resolve(store[key] ?? null);
  }),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => {
      delete store[key];
    });
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => {
    return Promise.resolve(Object.keys(store));
  }),
  _getStore: () => store,
  _resetStore: () => {
    Object.keys(store).forEach((key) => {
      delete store[key];
    });
  },
};

export default AsyncStorage;
