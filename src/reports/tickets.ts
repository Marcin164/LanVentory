// TICKET REPORTS

export async function ticketsByCategoryReport({ db }) {
  const result = await db.query(`
    SELECT category as label, COUNT(*) as value
    FROM tickets
    GROUP BY category
    ORDER BY value DESC
  `);
  return result;
}

export async function ticketsByPriorityReport({ db }) {
  const result = await db.query(`
    SELECT priority as label, COUNT(*) as value
    FROM tickets
    GROUP BY priority
  `);
  return result;
}

export async function ticketsByStateReport({ db }) {
  const result = await db.query(`
    SELECT state as label, COUNT(*) as value
    FROM tickets
    GROUP BY state
  `);
  return result;
}

export async function ticketsOverTimeReport({ db }) {
  const result = await db.query(`
    SELECT DATE_TRUNC('month', "createdAt") as label,
           COUNT(*) as value
    FROM tickets
    GROUP BY label
    ORDER BY label
  `);
  return result;
}

export async function ticketsByDeviceModelReport({ db }) {
  const result = await db.query(`
    SELECT d.model as label, COUNT(t.id) as value
    FROM tickets t
    JOIN devices d ON d.id = t."deviceId"
    GROUP BY d.model
    ORDER BY value DESC
    LIMIT 20
  `);
  return result;
}

export async function ticketsByRequesterReport({ db }) {
  const result = await db.query(`
    SELECT u.username as label, COUNT(t.id) as value
    FROM tickets t
    JOIN users u ON u.id = t."requesterId"
    GROUP BY u.username
    ORDER BY value DESC
    LIMIT 20
  `);
  return result;
}

export async function averageResolutionTimeReport({ db }) {
  const result = await db.query(`
    SELECT priority as label,
           AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600) as value
    FROM tickets
    WHERE "resolvedAt" IS NOT NULL
    GROUP BY priority
  `);
  return result;
}

export async function slaBreachesReport({ db }) {
  const result = await db.query(`
    SELECT
      CASE
        WHEN "resolvedAt" > "createdAt" + INTERVAL '24 hours'
        THEN 'Breached'
        ELSE 'Within SLA'
      END as label,
      COUNT(*) as value
    FROM tickets
    WHERE "resolvedAt" IS NOT NULL
    GROUP BY label
  `);
  return result;
}

export async function itLoadByDepartmentReport({ db }) {
  const result = await db.query(`
    SELECT u.department as label, COUNT(t.id) as value
    FROM tickets t
    JOIN users u ON u.id = t."requesterId"
    GROUP BY u.department
    ORDER BY value DESC
  `);
  return result;
}

export async function topProblematicDevicesReport({ db }) {
  const result = await db.query(`
    SELECT d.assetName as label, COUNT(t.id) as value
    FROM tickets t
    JOIN devices d ON d.id = t."deviceId"
    GROUP BY d.assetName
    ORDER BY value DESC
    LIMIT 20
  `);
  return result;
}
