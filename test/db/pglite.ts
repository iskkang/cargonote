import { PGlite } from '@electric-sql/pglite';

export async function freshDb(sqlChunks: string[] = []): Promise<PGlite> {
  const db = new PGlite();
  for (const chunk of sqlChunks) {
    await db.exec(chunk);
  }
  return db;
}
