// SLA REPORTS

export async function slaComplianceRateReport({ db }) {
  return db.query(`
    SELECT sd.name as label,
           ROUND(
             100.0 * SUM(CASE WHEN si.breached THEN 0 ELSE 1 END)::numeric
             / NULLIF(COUNT(si.id), 0),
             2
           ) as value
    FROM sla_instance si
    JOIN sla_definition sd ON sd.id = si."sla_definition_id"
    GROUP BY sd.name
    ORDER BY value DESC
  `);
}

export async function slaEscalationsCountReport({ db }) {
  return db.query(`
    SELECT ed."actionType" as label, COUNT(ei.id)::integer as value
    FROM sla_escalation_instance ei
    JOIN sla_escalation_definition ed ON ed.id = ei."escalation_definition_id"
    GROUP BY ed."actionType"
    ORDER BY value DESC
  `);
}

export async function slaAveragePauseTimeReport({ db }) {
  return db.query(`
    SELECT sd.name as label,
           ROUND(
             AVG(EXTRACT(EPOCH FROM (sp."resumedAt" - sp."pausedAt")) / 3600)::numeric,
             2
           ) as value
    FROM sla_pause sp
    JOIN sla_instance si ON si.id = sp."sla_instance_id"
    JOIN sla_definition sd ON sd.id = si."sla_definition_id"
    WHERE sp."resumedAt" IS NOT NULL
    GROUP BY sd.name
    ORDER BY value DESC
  `);
}

export async function slaPerformanceByAssigneeReport({ db }) {
  return db.query(`
    SELECT t.assignee as label,
           ROUND(
             100.0 * SUM(CASE WHEN si.breached THEN 0 ELSE 1 END)::numeric
             / NULLIF(COUNT(si.id), 0),
             2
           ) as value
    FROM sla_instance si
    JOIN tickets t ON t.id = si."ticket_id"
    WHERE t.assignee IS NOT NULL
    GROUP BY t.assignee
    ORDER BY value DESC
    LIMIT 25
  `);
}

export async function slaResponseVsResolutionReport({ db }) {
  return db.query(`
    SELECT sd.name as label,
           ROUND(
             AVG(EXTRACT(EPOCH FROM (si."dueAt" - si."startAt")) / 3600)::numeric,
             2
           ) as value
    FROM sla_instance si
    JOIN sla_definition sd ON sd.id = si."sla_definition_id"
    GROUP BY sd.name
    ORDER BY value
  `);
}
