// DEVICE REPORTS
import { makeParams, departmentClause } from './_helpers';

function deptJoin(filters: any) {
  return filters?.department
    ? 'JOIN users u ON u.id = devices."userId"'
    : '';
}

export async function devicesByTypeReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT "subgroup" as label, COUNT(*)::integer as value
    FROM devices
    ${deptJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY "subgroup"
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function devicesByManufacturerReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT manufacturer as label, COUNT(*)::integer as value
    FROM devices
    ${deptJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY manufacturer
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function devicesByModelReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT model as label, COUNT(*)::integer as value
    FROM devices
    ${deptJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY model
    ORDER BY value DESC
    LIMIT 20
  `,
    p.values,
  );
}

export async function devicesByOSReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT system->>'system' as label, COUNT(*)::integer as value
    FROM devices
    ${deptJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY label
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function devicesByLocationReport({ db }) {
  return db.query(`
    SELECT location as label, COUNT(*)::integer as value
    FROM devices
    GROUP BY location
    ORDER BY value DESC
  `);
}

export async function devicesByDepartmentReport({ db }) {
  return db.query(`
    SELECT u.department as label, COUNT(d.id)::integer as value
    FROM devices d
    JOIN users u ON u.id = d."userId"
    GROUP BY u.department
    ORDER BY value DESC
  `);
}

export async function devicesByStateReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT state as label, COUNT(*)::integer as value
    FROM devices
    ${deptJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY state
  `,
    p.values,
  );
}

export async function devicesOnlineOfflineReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT
      CASE WHEN "isOn" = true THEN 'Online' ELSE 'Offline' END as label,
      COUNT(*)::integer as value
    FROM devices
    ${deptJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY label
  `,
    p.values,
  );
}

export async function devicesWithoutOwnerReport({ db }) {
  return db.query(`
    SELECT
      CASE WHEN "userId" IS NULL THEN 'Unassigned' ELSE 'Assigned' END as name,
      COUNT(*)::integer AS value
    FROM devices
    GROUP BY name
  `);
}

export async function deviceAgeReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT
      CASE
        WHEN (CURRENT_DATE - (system->>'installDate')::date) < 365 THEN '0-1 year'
        WHEN (CURRENT_DATE - (system->>'installDate')::date) < 1095 THEN '1-3 years'
        WHEN (CURRENT_DATE - (system->>'installDate')::date) < 1826 THEN '3-5 years'
        ELSE '5+ years'
      END as label,
      COUNT(*)::integer as value
    FROM devices
    ${deptJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY label
  `,
    p.values,
  );
}
