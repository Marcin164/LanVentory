// SECURITY REPORTS

export async function devicesWithoutUpdatesReport({ db }) {
  const result = await db.query(`
    SELECT 'Missing Updates' as label, COUNT(*)::integer as value
    FROM devices
    WHERE (system->>'lastUpdate')::timestamp < NOW() - interval '30 days'
  `);
  return result;
}

export async function devicesWithoutAntivirusReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN security->>'antivirus' IS NULL THEN 'No Antivirus'
        ELSE 'Protected'
      END as label,
      COUNT(*)::integer as value
    FROM devices
    GROUP BY label
  `);
  return result;
}

export async function devicesOutsideDomainReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN network->>'domainJoined' = 'true' THEN 'Domain Joined'
        ELSE 'Outside Domain'
      END as label,
      COUNT(*)::integer as value
    FROM devices
    GROUP BY label
  `);
  return result;
}

export async function devicesWithLocalAdminReport({ db }) {
  const result = await db.query(`
    SELECT assetName as label, COUNT(*)::integer as value
    FROM devices
    WHERE users->>'localAdmin' = 'true'
    GROUP BY assetName
    ORDER BY value DESC
  `);
  return result;
}

export async function passwordExpiryTimelineReport({ db }) {
  return db.query(`
    SELECT
      CASE
        WHEN "pwdLastSet"::timestamp > NOW() - INTERVAL '30 days' THEN '0-30 days'
        WHEN "pwdLastSet"::timestamp > NOW() - INTERVAL '60 days' THEN '30-60 days'
        WHEN "pwdLastSet"::timestamp > NOW() - INTERVAL '90 days' THEN '60-90 days'
        ELSE '90+ days (expired)'
      END as label,
      COUNT(*)::integer as value
    FROM users
    WHERE "pwdLastSet" IS NOT NULL
    GROUP BY label
    ORDER BY label
  `);
}

export async function disabledButAssignedReport({ db }) {
  // AD userAccountControl bit 0x2 = ACCOUNTDISABLE
  return db.query(`
    SELECT u.username as label, COUNT(d.id)::integer as value
    FROM users u
    JOIN devices d ON d."userId" = u.id
    WHERE (u."userAccountControl"::int & 2) = 2
    GROUP BY u.username
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function patchComplianceReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN (system->>'lastUpdate')::timestamp >= NOW() - interval '30 days'
        THEN 'Up-to-date'
        ELSE 'Outdated'
      END as label,
      COUNT(*)::integer as value
    FROM devices
    GROUP BY label
  `);
  return result;
}
