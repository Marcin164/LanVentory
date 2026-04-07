// TICKET REPORTS
import { makeParams, departmentClause, dateRangeClause } from './_helpers';

function reqJoin(filters: any) {
  return filters?.department
    ? 'JOIN users u ON u.id = t."requesterId"'
    : '';
}

export async function ticketsByCategoryReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT category as label, COUNT(*)::integer as value
    FROM tickets t
    ${reqJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY category
    ORDER BY value DESC
  `,
    p.values,
  );
}

export async function ticketsByPriorityReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT priority as label, COUNT(*)::integer as value
    FROM tickets t
    ${reqJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY priority
  `,
    p.values,
  );
}

export async function ticketsByStateReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT state as label, COUNT(*)::integer as value
    FROM tickets t
    ${reqJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY state
  `,
    p.values,
  );
}

export async function ticketsOverTimeReport({ db, filters }) {
  const p = makeParams();
  const where =
    departmentClause(filters, p, 'u') +
    dateRangeClause(filters, p, 't."createdAt"');
  return db.query(
    `
    SELECT TO_CHAR(t."createdAt", 'YYYY-MM') as label,
           COUNT(*)::integer as value
    FROM tickets t
    ${reqJoin(filters)}
    WHERE 1=1 ${where}
    GROUP BY label
    ORDER BY label
  `,
    p.values,
  );
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

export async function averageResolutionTimeReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT priority as label,
           ROUND(AVG(EXTRACT(EPOCH FROM (t."resolvedAt" - t."createdAt"))/3600)::numeric, 2) as value
    FROM tickets t
    ${reqJoin(filters)}
    WHERE t."resolvedAt" IS NOT NULL ${where}
    GROUP BY priority
  `,
    p.values,
  );
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

export async function ticketsByAssigneeReport({ db }) {
  return db.query(`
    SELECT COALESCE(assignee, 'Unassigned') as label,
           COUNT(*)::integer as value
    FROM tickets
    GROUP BY assignee
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function ticketsBacklogAgeReport({ db, filters }) {
  const p = makeParams();
  const where = departmentClause(filters, p, 'u');
  return db.query(
    `
    SELECT
      CASE
        WHEN NOW() - t."createdAt" < INTERVAL '7 days' THEN '0-7 days'
        WHEN NOW() - t."createdAt" < INTERVAL '30 days' THEN '7-30 days'
        WHEN NOW() - t."createdAt" < INTERVAL '90 days' THEN '30-90 days'
        ELSE '90+ days'
      END as label,
      COUNT(*)::integer as value
    FROM tickets t
    ${reqJoin(filters)}
    WHERE t.state NOT IN ('Resolved', 'Closed', 'Cancelled') ${where}
    GROUP BY label
    ORDER BY label
  `,
    p.values,
  );
}

export async function ticketsApprovalBottlenecksReport({ db }) {
  return db.query(`
    SELECT COALESCE(u.username, ta."approverId") as label,
           ROUND(
             AVG(EXTRACT(EPOCH FROM (NOW() - ta."createdAt")) / 3600)::numeric,
             1
           ) as value
    FROM tickets_approvals ta
    LEFT JOIN users u ON u.id = ta."approverId"
    WHERE ta.status = 'pending'
    GROUP BY label
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function ticketsCommentsVolumeReport({ db }) {
  return db.query(`
    SELECT t.number::text as label, COUNT(tc.id)::integer as value
    FROM tickets_comments tc
    JOIN tickets t ON t.id = tc."ticketId"
    GROUP BY t.number
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function ticketsReopenedReport({ db }) {
  // tickets that have a resolvedAt set but state is back to non-resolved
  return db.query(`
    SELECT
      CASE
        WHEN "resolvedAt" IS NOT NULL AND state NOT IN ('Resolved','Closed')
        THEN 'Reopened'
        ELSE 'Normal'
      END as label,
      COUNT(*)::integer as value
    FROM tickets
    GROUP BY label
  `);
}

export async function ticketsFirstContactResolutionReport({ db }) {
  return db.query(`
    SELECT
      CASE
        WHEN sub.cnt <= 1 THEN 'First contact'
        ELSE 'Multiple touches'
      END as label,
      COUNT(*)::integer as value
    FROM (
      SELECT t.id, COUNT(tc.id) as cnt
      FROM tickets t
      LEFT JOIN tickets_comments tc ON tc."ticketId" = t.id
      WHERE t."resolvedAt" IS NOT NULL
      GROUP BY t.id
    ) sub
    GROUP BY label
  `);
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
