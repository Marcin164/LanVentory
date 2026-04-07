// HISTORY (DEVICE LIFECYCLE) REPORTS

export async function deviceLifecycleReport({ db }) {
  return db.query(`
    SELECT COALESCE(type::text, 'unknown') as label,
           COUNT(*)::integer as value
    FROM histories
    GROUP BY label
    ORDER BY value DESC
  `);
}

export async function assignmentChurnReport({ db }) {
  return db.query(`
    SELECT d."assetName" as label,
           COUNT(DISTINCT h."userId")::integer as value
    FROM histories h
    JOIN devices d ON d.id = h."deviceId"
    WHERE h."userId" IS NOT NULL
    GROUP BY d."assetName"
    HAVING COUNT(DISTINCT h."userId") > 1
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function meanTimeBetweenAssignmentsReport({ db }) {
  // average gap (days) between consecutive assignment events per device
  return db.query(`
    WITH ordered AS (
      SELECT "deviceId",
             date::timestamp as ts,
             LAG(date::timestamp) OVER (PARTITION BY "deviceId" ORDER BY date::timestamp) AS prev
      FROM histories
      WHERE "deviceId" IS NOT NULL
    )
    SELECT d."assetName" as label,
           ROUND(AVG(EXTRACT(EPOCH FROM (ts - prev)) / 86400)::numeric, 1) as value
    FROM ordered o
    JOIN devices d ON d.id = o."deviceId"
    WHERE prev IS NOT NULL
    GROUP BY d."assetName"
    ORDER BY value
    LIMIT 25
  `);
}

export async function componentReplacementFrequencyReport({ db }) {
  return db.query(`
    SELECT COALESCE(NULLIF(type, ''), 'unknown') as label,
           COUNT(*)::integer as value
    FROM history_components
    GROUP BY label
    ORDER BY value DESC
    LIMIT 25
  `);
}
