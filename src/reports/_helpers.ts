// Shared SQL helpers for report functions.
//
// All helpers return parameterized fragments — never interpolate user input
// directly into SQL strings.

export interface ParamBuilder {
  push: (value: any) => string; // returns "$N"
  values: any[];
}

export function makeParams(): ParamBuilder {
  const values: any[] = [];
  return {
    values,
    push(value: any) {
      values.push(value);
      return `$${values.length}`;
    },
  };
}

/**
 * Build a SQL fragment that filters by department on a users table alias.
 * Returns either "" (no filter) or " AND <alias>.department = $N".
 */
export function departmentClause(
  filters: any,
  params: ParamBuilder,
  alias = 'u',
): string {
  if (!filters?.department) return '';
  return ` AND ${alias}.department ILIKE ${params.push(`%${filters.department}%`)}`;
}

/**
 * Build a SQL fragment that filters by date range on a given column expression.
 * Pass the fully-qualified column expression (e.g. `t."createdAt"`).
 */
export function dateRangeClause(
  filters: any,
  params: ParamBuilder,
  column: string,
): string {
  const parts: string[] = [];
  if (filters?.from) parts.push(`${column} >= ${params.push(filters.from)}::timestamp`);
  if (filters?.to) parts.push(`${column} <= ${params.push(filters.to)}::timestamp`);
  return parts.length ? ' AND ' + parts.join(' AND ') : '';
}
