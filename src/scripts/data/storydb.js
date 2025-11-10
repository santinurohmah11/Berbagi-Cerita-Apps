import { openDB } from 'idb';

const DATABASE_NAME = 'berbagi-cerita-db';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'stories';

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      database.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
    }
  },
});

const StoryDB = {
  async getAll() {
    return (await dbPromise).getAll(OBJECT_STORE_NAME);
  },
  async get(id) {
    return (await dbPromise).get(OBJECT_STORE_NAME, id);
  },
  async put(story) {
    if (!story.hasOwnProperty('id')) return;
    return (await dbPromise).put(OBJECT_STORE_NAME, story);
  },
  async delete(id) {
    return (await dbPromise).delete(OBJECT_STORE_NAME, id);
  },
};

export default StoryDB;
