// USERS REPORTS
import { makeParams, departmentClause, dateRangeClause } from './_helpers';

export async function usersByDepartmentReport({ db }) {
  return db.query(`
    SELECT department as label, COUNT(*)::integer as value
    FROM users
    GROUP BY department
    ORDER BY value DESC
  `);
}

export async function usersByLocationReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'users');
  return db.query(
    `
    SELECT city as label, COUNT(*)::integer as value
    FROM users
    WHERE 1=1 ${where}
    GROUP BY city
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function usersByTitleReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'users');
  return db.query(
    `
    SELECT title as label, COUNT(*)::integer as value
    FROM users
    WHERE 1=1 ${where}
    GROUP BY title
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function newUsersOverTimeReport({ db, filters }) {
  const p = makeParams();
  const where =
    departmentClause(filters, p, 'users') +
    dateRangeClause(filters, p, '"whenCreated"');
  return db.query(
    `
    SELECT TO_CHAR("whenCreated", 'YYYY-MM') AS label,
           COUNT(*)::integer AS value
    FROM users
    WHERE "whenCreated" IS NOT NULL ${where}
    GROUP BY label
    ORDER BY label
  `,
    p.values,
  );
}

export async function inactiveUsersReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'users');
  return db.query(
    `
    SELECT
      CASE
        WHEN "pwdLastSet"::timestamp > NOW() - INTERVAL '30 days' THEN '0-30 days'
        WHEN "pwdLastSet"::timestamp > NOW() - INTERVAL '90 days' THEN '30-90 days'
        ELSE '90+ days'
      END as label,
      COUNT(*)::integer as value
    FROM users
    WHERE 1=1 ${where}
    GROUP BY label
  `,
    p.values,
  );
}

export async function usersDeviceDistributionReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT
      CASE
        WHEN device_count = 0 THEN 'No device'
        WHEN device_count = 1 THEN 'One device'
        ELSE 'Multiple devices'
      END as name,
      COUNT(*)::int as value
    FROM (
      SELECT u.id, COUNT(d.id) as device_count
      FROM users u
      LEFT JOIN devices d ON d."userId" = u.id
      WHERE 1=1 ${where}
      GROUP BY u.id
    ) as sub
    GROUP BY name
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function usersWithMultipleDevicesReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT u.username as label, COUNT(d.id)::integer as value
    FROM users u
    JOIN devices d ON d."userId" = u.id
    WHERE 1=1 ${where}
    GROUP BY u.username
    HAVING COUNT(d.id) > 1
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function usersByManagerReport({ db }) {
  return db.query(`
    SELECT manager as label, COUNT(*)::integer as value
    FROM users
    GROUP BY manager
    ORDER BY value DESC
  `);
}

export async function usersByCompanyReport({ db }) {
  return db.query(`
    SELECT company as label, COUNT(*)::integer as value
    FROM users
    GROUP BY company
    ORDER BY value DESC
  `);
}

export async function usersPasswordAgeReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'users');
  return db.query(
    `
    SELECT
      CASE
        WHEN "pwdLastSet"::timestamp > NOW() - INTERVAL '30 days' THEN '0-30 days'
        WHEN "pwdLastSet"::timestamp > NOW() - INTERVAL '90 days' THEN '30-90 days'
        ELSE '90+ days'
      END as label,
      COUNT(*)::integer as value
    FROM users
    WHERE 1=1 ${where}
    GROUP BY label
  `,
    p.values,
  );
}

export async function adminsByDepartmentReport({ db }) {
  return db.query(`
    SELECT department as label, COUNT(*)::integer as value
    FROM users
    WHERE "isAdmin" = true
    GROUP BY department
    ORDER BY value DESC
  `);
}
