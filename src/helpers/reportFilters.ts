export function applyTimeFilter(query: string, filters) {
  if (!filters.period) return query;

  if (filters.period === '30d') {
    return query + ` WHERE created_at > NOW() - interval '30 days'`;
  }

  if (filters.period === '90d') {
    return query + ` WHERE created_at > NOW() - interval '90 days'`;
  }

  return query;
}
