import { defineBoot } from '#q-app/wrappers';
import { initDb } from 'src/db';

const db = initDb();

export default defineBoot(({ app }) => {
  // for use inside Vue files (Options API) through this.$db
  app.config.globalProperties.$db = db;
});

export { db };
