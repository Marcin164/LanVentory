// AUDIT REPORTS

export async function auditActivityByEntityReport({ db }) {
  return db.query(`
    SELECT "entityType" as label, COUNT(*)::integer as value
    FROM system_audit_log
    GROUP BY "entityType"
    ORDER BY value DESC
  `);
}

export async function auditActivityByActionReport({ db }) {
  return db.query(`
    SELECT action as label, COUNT(*)::integer as value
    FROM system_audit_log
    GROUP BY action
    ORDER BY value DESC
  `);
}

export async function auditSensitiveActionsTimelineReport({ db }) {
  return db.query(`
    SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as label,
           COUNT(*)::integer as value
    FROM system_audit_log
    WHERE action ILIKE '%delete%'
       OR action ILIKE '%role%'
       OR action ILIKE '%permission%'
       OR action ILIKE '%admin%'
    GROUP BY label
    ORDER BY label
  `);
}

export async function auditActivityOverTimeReport({ db }) {
  return db.query(`
    SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as label,
           COUNT(*)::integer as value
    FROM system_audit_log
    GROUP BY label
    ORDER BY label
  `);
}
