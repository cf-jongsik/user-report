/**
 * Simple query builder for Log Explorer
 */

export function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export function safeIdent(ident: string): string {
  // Allow letters, numbers, underscores, and hyphens (needed for header names like student-id)
  if (!/^[A-Za-z0-9_-]+$/.test(ident)) {
    throw new Error(`Unsafe identifier: ${ident}`);
  }
  return ident;
}

export interface SelectArgs {
  from: string;
  columns: string[];
  where?: string[];
  orderBy?: string;
  limit?: number;
}

export function buildSelect(args: SelectArgs): string {
  const cols = args.columns.join(", ");
  let sql = `SELECT ${cols} FROM ${args.from}`;

  if (args.where && args.where.length > 0) {
    sql += ` WHERE ${args.where.join(" AND ")}`;
  }

  if (args.orderBy) {
    sql += ` ORDER BY ${args.orderBy}`;
  }

  if (args.limit) {
    sql += ` LIMIT ${args.limit}`;
  }

  return sql;
}
