// FORMS & FLOWS REPORTS

export async function mostUsedFormsReport({ db }) {
  return db.query(`
    SELECT name as label, COUNT(*)::integer as value
    FROM forms
    GROUP BY name
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function formsByUserReport({ db }) {
  return db.query(`
    SELECT COALESCE(u.username, f."userId") as label,
           COUNT(f.id)::integer as value
    FROM forms f
    LEFT JOIN users u ON u.id = f."userId"
    GROUP BY label
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function flowsEnabledStateReport({ db }) {
  return db.query(`
    SELECT CASE WHEN enabled THEN 'Enabled' ELSE 'Disabled' END as label,
           COUNT(*)::integer as value
    FROM flows
    GROUP BY enabled
  `);
}

export async function flowsByOwnerReport({ db }) {
  return db.query(`
    SELECT COALESCE(u.username, f."userId") as label,
           COUNT(f.id)::integer as value
    FROM flows f
    LEFT JOIN users u ON u.id = f."userId"
    GROUP BY label
    ORDER BY value DESC
    LIMIT 25
  `);
}
