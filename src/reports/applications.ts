// APPLICATION REPORTS
import { makeParams, dateRangeClause } from './_helpers';

export async function topInstalledApplicationsReport({ db }) {
  return db.query(`
    SELECT a.name as label, COUNT(da.id)::integer as value
    FROM devices_applications da
    JOIN applications a ON a.id = da."applicationId"
    GROUP BY a.name
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function applicationsByPublisherReport({ db }) {
  return db.query(`
    SELECT COALESCE(NULLIF(publisher, ''), 'Unknown') as label,
           COUNT(*)::integer as value
    FROM applications
    GROUP BY label
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function outdatedApplicationVersionsReport({ db }) {
  return db.query(`
    SELECT a.name as label,
           COUNT(DISTINCT a.version)::integer as value
    FROM applications a
    JOIN devices_applications da ON da."applicationId" = a.id
    GROUP BY a.name
    HAVING COUNT(DISTINCT a.version) > 1
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function devicesPerApplicationReport({ db, filters }) {
  if (!filters?.application) return [];
  return db.query(
    `
    SELECT d."assetName" as label, 1::integer as value
    FROM devices_applications da
    JOIN applications a ON a.id = da."applicationId"
    JOIN devices d ON d.id = da."deviceId"
    WHERE a.name = $1
    ORDER BY d."assetName"
    LIMIT 200
    `,
    [filters.application],
  );
}

export async function applicationsLicenseExposureReport({ db }) {
  return db.query(`
    SELECT a.name as label,
           SUM(a.size)::bigint as value
    FROM applications a
    JOIN devices_applications da ON da."applicationId" = a.id
    GROUP BY a.name
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function applicationsInstalledOverTimeReport({ db, filters }) {
  const p = makeParams();
  const where = dateRangeClause(filters, p, '"installationDate"::timestamp');
  return db.query(
    `
    SELECT TO_CHAR("installationDate"::timestamp, 'YYYY-MM') as label,
           COUNT(*)::integer as value
    FROM devices_applications
    WHERE "installationDate" IS NOT NULL ${where}
    GROUP BY label
    ORDER BY label
  `,
    p.values,
  );
}
