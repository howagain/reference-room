import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const agencies = sqliteTable('agencies', {
  id: text().primaryKey(),
  owner: text().notNull().unique(),
  name: text().notNull(),
  accent: text().notNull().default('#354cff'),
  logo: text().notNull().default(''),
});
export const clients = sqliteTable(
  'clients',
  {
    id: text().primaryKey(),
    agencyId: text()
      .notNull()
      .references(() => agencies.id),
    name: text().notNull(),
    brief: text().notNull().default(''),
    tokenHash: text().unique(),
    createdAt: text().notNull(),
  },
  (t) => [index('clients_agency').on(t.agencyId)],
);
export const designs = sqliteTable(
  'designs',
  {
    id: text().primaryKey(),
    clientId: text()
      .notNull()
      .references(() => clients.id),
    title: text().notNull(),
    kind: text().notNull(),
    url: text().notNull().default(''),
    fileKey: text().notNull().default(''),
    html: text().notNull().default(''),
    notes: text().notNull().default(''),
    saved: integer().notNull().default(0),
    createdAt: text().notNull(),
  },
  (t) => [index('designs_client').on(t.clientId)],
);
export const comments = sqliteTable(
  'comments',
  {
    id: text().primaryKey(),
    designId: text()
      .notNull()
      .references(() => designs.id),
    author: text().notNull(),
    role: text().notNull(),
    body: text().notNull(),
    createdAt: text().notNull(),
  },
  (t) => [index('comments_design').on(t.designId)],
);
export const reactions = sqliteTable(
  'reactions',
  {
    id: text().primaryKey(),
    designId: text()
      .notNull()
      .references(() => designs.id),
    actor: text().notNull(),
    value: text().notNull(),
  },
  (t) => [uniqueIndex('reactions_actor').on(t.designId, t.actor)],
);
