// DEVICE REPORTS

export async function devicesByTypeReport({ db }) {
  const result = await db.query(`
    SELECT "subgroup" as label, COUNT(*)::integer as value
    FROM devices
    GROUP BY "subgroup"
    ORDER BY value DESC
  `);
  return result;
}

export async function devicesByManufacturerReport({ db }) {
  const result = await db.query(`
    SELECT manufacturer as label, COUNT(*) as value
    FROM devices
    GROUP BY manufacturer
    ORDER BY value DESC
  `);
  return result;
}

export async function devicesByModelReport({ db }) {
  const result = await db.query(`
    SELECT model as label, COUNT(*) as value
    FROM devices
    GROUP BY model
    ORDER BY value DESC
    LIMIT 20
  `);
  return result;
}

export async function devicesByOSReport({ db }) {
  const result = await db.query(`
    SELECT system->>'system' as name, COUNT(*)::integer as value
    FROM devices
    GROUP BY name
    ORDER BY value DESC
  `);
  return result;
}

export async function devicesByLocationReport({ db }) {
  const result = await db.query(`
    SELECT location as label, COUNT(*) as value
    FROM devices
    GROUP BY location
    ORDER BY value DESC
  `);
  return result;
}

export async function devicesByDepartmentReport({ db }) {
  const result = await db.query(`
    SELECT u.department as label, COUNT(d.id)::integer as value
    FROM devices d
    JOIN users u ON u.id = d."userId"
    GROUP BY u.department
    ORDER BY value DESC
  `);
  return result;
}

export async function devicesByStateReport({ db }) {
  const result = await db.query(`
    SELECT state as label, COUNT(*) as value
    FROM devices
    GROUP BY state
  `);
  return result;
}

export async function devicesOnlineOfflineReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN "isOn" = true THEN 'Online'
        ELSE 'Offline'
      END as label,
      COUNT(*) as value
    FROM devices
    GROUP BY label
  `);
  return result;
}

export async function devicesWithoutOwnerReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN "userId" IS NULL THEN 'Unassigned'
        ELSE 'Assigned'
      END as name,
      COUNT(*)::integer AS value
    FROM devices
    GROUP BY name
  `);
  return result;
}

export async function deviceAgeReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN (CURRENT_DATE - (system->>'installDate')::date) < 365 THEN '0-1 year'
        WHEN (CURRENT_DATE - (system->>'installDate')::date) < 1095 THEN '1-3 years'
        WHEN (CURRENT_DATE - (system->>'installDate')::date) < 1826 THEN '3-5 years'
        ELSE '5+ years'
      END as label,
      COUNT(*) as value
    FROM devices
    GROUP BY label
  `);
  return result;
}
