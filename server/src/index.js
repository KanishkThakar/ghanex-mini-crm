import { createApp } from './app.js';
import { openDatabase } from './db.js';
import { seedIfEmpty } from './seed.js';

const port = Number(process.env.PORT || 4000);
const db = openDatabase();

if (process.env.SEED !== 'false') {
  const added = seedIfEmpty(db);
  if (added) console.log(`seeded ${added} demo leads`);
}

createApp(db).listen(port, () => console.log(`Mini CRM listening on http://localhost:${port}`));
