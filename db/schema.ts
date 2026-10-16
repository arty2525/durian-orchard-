import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', { id: text('id').primaryKey(), type: text('type').notNull(), data: text('data').notNull(), revision: integer('revision').notNull().default(1), updated: text('updated').notNull() });
export const audit = sqliteTable('audit', { id: text('id').primaryKey(), actor: text('actor').notNull(), action: text('action').notNull(), recordId: text('record_id').notNull(), before: text('before'), after: text('after'), created: text('created').notNull() });
export const counters = sqliteTable('counters', {name:text('name').primaryKey(),value:integer('value').notNull()});
