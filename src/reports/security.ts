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
