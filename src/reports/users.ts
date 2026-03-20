// USERS REPORTS

export async function usersByDepartmentReport({ db }) {
  const result = await db.query(`
    SELECT department as label, COUNT(*)::integer as value
    FROM users
    GROUP BY department
    ORDER BY value DESC
  `);
  return result;
}

export async function usersByLocationReport({ db }) {
  const result = await db.query(`
    SELECT city as label, COUNT(*) as value
    FROM users
    GROUP BY city
    ORDER BY value DESC
  `);
  return result;
}

export async function usersByTitleReport({ db }) {
  const result = await db.query(`
    SELECT title as label, COUNT(*) as value
    FROM users
    GROUP BY title
    ORDER BY value DESC
  `);
  return result;
}

export async function newUsersOverTimeReport({ db }) {
  const result = await db.query(`
SELECT 
  TO_CHAR("whenCreated", 'YYYY-MM') AS label,
  COUNT(*)::integer AS value
FROM users
GROUP BY label
ORDER BY label;
  `);
  return result;
}

export async function inactiveUsersReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN pwdLastSet::timestamp > NOW() - INTERVAL '30 days' THEN '0-30 days'
        WHEN pwdLastSet::timestamp > NOW() - INTERVAL '90 days' THEN '30-90 days'
        ELSE '90+ days'
      END as label,
      COUNT(*) as value
    FROM users
    GROUP BY label
  `);
  return result;
}

export async function usersDeviceDistributionReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN device_count = 0 THEN 'No device'
        WHEN device_count = 1 THEN 'One device'
        ELSE 'Multiple devices'
      END as name,
      COUNT(*)::int as value
    FROM (
      SELECT
        u.id,
        COUNT(d.id) as device_count
      FROM users u
      LEFT JOIN devices d ON d."userId" = u.id
      GROUP BY u.id
    ) as sub
    GROUP BY name
    ORDER BY value DESC
  `);

  return result;
}

export async function usersWithMultipleDevicesReport({ db }) {
  const result = await db.query(`
    SELECT u.username as label, COUNT(d.id) as value
    FROM users u
    JOIN devices d ON d."userId" = u.id
    GROUP BY u.username
    HAVING COUNT(d.id) > 1
    ORDER BY value DESC
  `);
  return result;
}

export async function usersByManagerReport({ db }) {
  const result = await db.query(`
    SELECT manager as label, COUNT(*) as value
    FROM users
    GROUP BY manager
    ORDER BY value DESC
  `);
  return result;
}

export async function usersByCompanyReport({ db }) {
  const result = await db.query(`
    SELECT company as label, COUNT(*) as value
    FROM users
    GROUP BY company
    ORDER BY value DESC
  `);
  return result;
}

export async function usersPasswordAgeReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN pwdLastSet::timestamp > NOW() - INTERVAL '30 days' THEN '0-30 days'
        WHEN pwdLastSet::timestamp > NOW() - INTERVAL '90 days' THEN '30-90 days'
        ELSE '90+ days'
      END as label,
      COUNT(*) as value
    FROM users
    GROUP BY label
  `);
  return result;
}

export async function adminsByDepartmentReport({ db }) {
  const result = await db.query(`
    SELECT
      department as label,
      COUNT(*)::int as value
    FROM users
    WHERE "isAdmin" = true
    GROUP BY department
    ORDER BY value DESC
  `);

  return result;
}
