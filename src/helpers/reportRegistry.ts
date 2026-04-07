import * as users from '../reports/users';
import * as devices from '../reports/devices';
import * as security from '../reports/security';
import * as tickets from '../reports/tickets';
import * as applications from '../reports/applications';
import * as sla from '../reports/sla';
import * as histories from '../reports/histories';
import * as audit from '../reports/audit';
import * as forms from '../reports/forms';

export type ReportCategory =
  | 'users'
  | 'devices'
  | 'security'
  | 'tickets'
  | 'sla'
  | 'applications'
  | 'histories'
  | 'audit'
  | 'forms';

export type ChartType = 'bar' | 'pie' | 'line' | 'table';

export interface ReportMeta {
  key: string;
  title: string;
  description: string;
  category: ReportCategory;
  chart: ChartType;
  fn: (args: { db: any; filters?: any }) => Promise<any>;
  supportsFilters?: Array<'from' | 'to' | 'department' | 'application'>;
  aliases?: string[];
}

export const REPORTS: ReportMeta[] = [
  // ───────── USERS ─────────
  { key: 'users-by-department', category: 'users', chart: 'bar',
    title: 'Users by department', description: 'Headcount per department',
    fn: users.usersByDepartmentReport },
  { key: 'users-by-location', category: 'users', chart: 'bar',
    title: 'Users by location', description: 'Headcount per city',
    fn: users.usersByLocationReport, supportsFilters: ['department'] },
  { key: 'users-by-title', category: 'users', chart: 'bar',
    title: 'Users by title', description: 'Headcount per job title',
    fn: users.usersByTitleReport, supportsFilters: ['department'] },
  { key: 'users-by-manager', category: 'users', chart: 'bar',
    title: 'Users by manager', description: 'Direct reports per manager',
    fn: users.usersByManagerReport },
  { key: 'users-by-company', category: 'users', chart: 'bar',
    title: 'Users by company', description: 'Headcount per company',
    fn: users.usersByCompanyReport },
  { key: 'users-new-over-time', category: 'users', chart: 'line',
    title: 'New users over time', description: 'New accounts created per month',
    fn: users.newUsersOverTimeReport, supportsFilters: ['from', 'to', 'department'] },
  { key: 'users-inactive', category: 'users', chart: 'bar',
    title: 'Inactive users', description: 'Distribution by password age (proxy for inactivity)',
    fn: users.inactiveUsersReport, supportsFilters: ['department'] },
  { key: 'users-device-distribution', category: 'users', chart: 'pie',
    title: 'Users device distribution', description: 'Users grouped by number of assigned devices',
    fn: users.usersDeviceDistributionReport,
    supportsFilters: ['department'],
    aliases: ['users-without-device'] },
  { key: 'users-multiple-devices', category: 'users', chart: 'bar',
    title: 'Users with multiple devices', description: 'Top users with more than one device',
    fn: users.usersWithMultipleDevicesReport, supportsFilters: ['department'] },
  { key: 'users-password-age', category: 'users', chart: 'bar',
    title: 'Password age', description: 'How long since users last changed password',
    fn: users.usersPasswordAgeReport, supportsFilters: ['department'] },
  { key: 'users-admins-by-department', category: 'users', chart: 'bar',
    title: 'Admins by department', description: 'Admin accounts per department',
    fn: users.adminsByDepartmentReport, aliases: ['users-with-admin'] },

  // ───────── DEVICES ─────────
  { key: 'devices-by-type', category: 'devices', chart: 'pie',
    title: 'Devices by type', description: 'Breakdown by device subgroup',
    fn: devices.devicesByTypeReport, supportsFilters: ['department'] },
  { key: 'devices-by-manufacturer', category: 'devices', chart: 'bar',
    title: 'Devices by manufacturer', description: 'Vendor distribution',
    fn: devices.devicesByManufacturerReport, supportsFilters: ['department'] },
  { key: 'devices-by-model', category: 'devices', chart: 'bar',
    title: 'Devices by model', description: 'Top device models',
    fn: devices.devicesByModelReport, supportsFilters: ['department'] },
  { key: 'devices-by-os', category: 'devices', chart: 'pie',
    title: 'Devices by OS', description: 'Operating system distribution',
    fn: devices.devicesByOSReport, supportsFilters: ['department'] },
  { key: 'devices-by-location', category: 'devices', chart: 'bar',
    title: 'Devices by location', description: 'Devices per location',
    fn: devices.devicesByLocationReport },
  { key: 'devices-by-department', category: 'devices', chart: 'bar',
    title: 'Devices per department', description: 'Devices owned per department',
    fn: devices.devicesByDepartmentReport },
  { key: 'devices-by-state', category: 'devices', chart: 'pie',
    title: 'Devices by state', description: 'Lifecycle state distribution',
    fn: devices.devicesByStateReport, supportsFilters: ['department'] },
  { key: 'devices-online-offline', category: 'devices', chart: 'pie',
    title: 'Online vs offline', description: 'Currently reporting vs not',
    fn: devices.devicesOnlineOfflineReport, supportsFilters: ['department'] },
  { key: 'devices-without-owner', category: 'devices', chart: 'pie',
    title: 'Devices without owner', description: 'Assigned vs unassigned',
    fn: devices.devicesWithoutOwnerReport },
  { key: 'devices-age', category: 'devices', chart: 'bar',
    title: 'Device age', description: 'Devices grouped by age in years',
    fn: devices.deviceAgeReport, supportsFilters: ['department'],
    aliases: ['device-age'] },

  // ───────── SECURITY ─────────
  { key: 'security-without-updates', category: 'security', chart: 'bar',
    title: 'Devices without updates', description: 'Missing OS updates >30d',
    fn: security.devicesWithoutUpdatesReport,
    aliases: ['devices-without-updates'] },
  { key: 'security-without-antivirus', category: 'security', chart: 'pie',
    title: 'Antivirus coverage', description: 'Devices with vs without AV',
    fn: security.devicesWithoutAntivirusReport,
    aliases: ['devices-without-antivirus'] },
  { key: 'security-outside-domain', category: 'security', chart: 'pie',
    title: 'Domain join status', description: 'Domain joined vs outside domain',
    fn: security.devicesOutsideDomainReport,
    aliases: ['devices-outside-domain'] },
  { key: 'security-local-admin', category: 'security', chart: 'bar',
    title: 'Devices with local admin', description: 'Devices where users hold local admin rights',
    fn: security.devicesWithLocalAdminReport,
    aliases: ['devices-local-admin'] },
  { key: 'security-patch-compliance', category: 'security', chart: 'pie',
    title: 'Patch compliance', description: 'Up-to-date vs outdated patching',
    fn: security.patchComplianceReport, aliases: ['patch-compliance'] },
  { key: 'security-password-expiry', category: 'security', chart: 'bar',
    title: 'Password expiry timeline', description: 'How close users are to password expiration',
    fn: security.passwordExpiryTimelineReport },
  { key: 'security-disabled-but-assigned', category: 'security', chart: 'bar',
    title: 'Disabled accounts still holding devices', description: 'Disabled AD users with devices assigned',
    fn: security.disabledButAssignedReport },

  // ───────── TICKETS ─────────
  { key: 'tickets-by-category', category: 'tickets', chart: 'bar',
    title: 'Tickets by category', description: 'Distribution by category',
    fn: tickets.ticketsByCategoryReport, supportsFilters: ['department'] },
  { key: 'tickets-by-priority', category: 'tickets', chart: 'pie',
    title: 'Tickets by priority', description: 'Distribution by priority',
    fn: tickets.ticketsByPriorityReport, supportsFilters: ['department'] },
  { key: 'tickets-by-state', category: 'tickets', chart: 'pie',
    title: 'Tickets by state', description: 'Distribution by state',
    fn: tickets.ticketsByStateReport, supportsFilters: ['department'] },
  { key: 'tickets-over-time', category: 'tickets', chart: 'line',
    title: 'Tickets over time', description: 'New tickets per month',
    fn: tickets.ticketsOverTimeReport, supportsFilters: ['from', 'to', 'department'] },
  { key: 'tickets-by-device-model', category: 'tickets', chart: 'bar',
    title: 'Tickets by device model', description: 'Which device models generate the most tickets',
    fn: tickets.ticketsByDeviceModelReport },
  { key: 'tickets-by-requester', category: 'tickets', chart: 'bar',
    title: 'Tickets by requester', description: 'Top requesters',
    fn: tickets.ticketsByRequesterReport },
  { key: 'tickets-by-assignee', category: 'tickets', chart: 'bar',
    title: 'Tickets by assignee', description: 'Agent workload',
    fn: tickets.ticketsByAssigneeReport },
  { key: 'tickets-resolution-time', category: 'tickets', chart: 'bar',
    title: 'Average resolution time', description: 'Avg hours to resolve, per priority',
    fn: tickets.averageResolutionTimeReport,
    supportsFilters: ['department'],
    aliases: ['ticket-resolution-time'] },
  { key: 'tickets-sla-breaches', category: 'tickets', chart: 'pie',
    title: 'SLA breaches', description: 'Breached vs within SLA',
    fn: tickets.slaBreachesReport, aliases: ['sla-breaches'] },
  { key: 'tickets-it-load-by-department', category: 'tickets', chart: 'bar',
    title: 'IT load by department', description: 'Tickets generated per department',
    fn: tickets.itLoadByDepartmentReport,
    aliases: ['it-load-by-department'] },
  { key: 'tickets-top-problematic-devices', category: 'tickets', chart: 'bar',
    title: 'Top problematic devices', description: 'Devices with the most tickets',
    fn: tickets.topProblematicDevicesReport,
    aliases: ['top-problematic-devices'] },
  { key: 'tickets-backlog-age', category: 'tickets', chart: 'bar',
    title: 'Backlog age', description: 'Open tickets by age bucket',
    fn: tickets.ticketsBacklogAgeReport, supportsFilters: ['department'] },
  { key: 'tickets-approval-bottlenecks', category: 'tickets', chart: 'bar',
    title: 'Approval bottlenecks', description: 'Average pending hours per approver',
    fn: tickets.ticketsApprovalBottlenecksReport },
  { key: 'tickets-comments-volume', category: 'tickets', chart: 'bar',
    title: 'Tickets with most comments', description: 'Proxy for ticket complexity',
    fn: tickets.ticketsCommentsVolumeReport },
  { key: 'tickets-reopened', category: 'tickets', chart: 'pie',
    title: 'Reopened tickets', description: 'Tickets resolved then reopened',
    fn: tickets.ticketsReopenedReport },
  { key: 'tickets-first-contact-resolution', category: 'tickets', chart: 'pie',
    title: 'First-contact resolution', description: 'Resolved on first interaction vs multiple',
    fn: tickets.ticketsFirstContactResolutionReport },

  // ───────── SLA ─────────
  { key: 'sla-compliance-rate', category: 'sla', chart: 'bar',
    title: 'SLA compliance rate', description: '% of instances within SLA, per definition',
    fn: sla.slaComplianceRateReport },
  { key: 'sla-escalations-count', category: 'sla', chart: 'bar',
    title: 'SLA escalations', description: 'How many escalations triggered, per level',
    fn: sla.slaEscalationsCountReport },
  { key: 'sla-average-pause-time', category: 'sla', chart: 'bar',
    title: 'Average SLA pause time', description: 'Avg pause hours per SLA definition',
    fn: sla.slaAveragePauseTimeReport },
  { key: 'sla-performance-by-assignee', category: 'sla', chart: 'bar',
    title: 'SLA performance by assignee', description: 'Compliance % per agent',
    fn: sla.slaPerformanceByAssigneeReport },
  { key: 'sla-response-vs-resolution', category: 'sla', chart: 'bar',
    title: 'SLA response vs resolution windows', description: 'Average target window per SLA',
    fn: sla.slaResponseVsResolutionReport },

  // ───────── APPLICATIONS ─────────
  { key: 'applications-top-installed', category: 'applications', chart: 'bar',
    title: 'Top installed applications', description: 'Most widely deployed apps',
    fn: applications.topInstalledApplicationsReport },
  { key: 'applications-by-publisher', category: 'applications', chart: 'bar',
    title: 'Applications by publisher', description: 'Catalog by vendor',
    fn: applications.applicationsByPublisherReport },
  { key: 'applications-outdated-versions', category: 'applications', chart: 'bar',
    title: 'Apps with version drift', description: 'Apps installed in multiple versions across the fleet',
    fn: applications.outdatedApplicationVersionsReport },
  { key: 'applications-devices-per-app', category: 'applications', chart: 'table',
    title: 'Devices per application', description: 'Reverse lookup — needs ?application=NAME',
    fn: applications.devicesPerApplicationReport, supportsFilters: ['application'] },
  { key: 'applications-license-exposure', category: 'applications', chart: 'bar',
    title: 'License exposure', description: 'Total install footprint per app (size × installs)',
    fn: applications.applicationsLicenseExposureReport },
  { key: 'applications-installed-over-time', category: 'applications', chart: 'line',
    title: 'Installations over time', description: 'New application installs per month',
    fn: applications.applicationsInstalledOverTimeReport, supportsFilters: ['from', 'to'] },

  // ───────── HISTORIES ─────────
  { key: 'histories-device-lifecycle', category: 'histories', chart: 'bar',
    title: 'Device lifecycle events', description: 'Counts per history event type',
    fn: histories.deviceLifecycleReport },
  { key: 'histories-assignment-churn', category: 'histories', chart: 'bar',
    title: 'Assignment churn', description: 'Devices that changed owners most often',
    fn: histories.assignmentChurnReport },
  { key: 'histories-mean-time-between-assignments', category: 'histories', chart: 'bar',
    title: 'Mean time between assignments', description: 'Avg days between owner changes',
    fn: histories.meanTimeBetweenAssignmentsReport },
  { key: 'histories-component-replacements', category: 'histories', chart: 'bar',
    title: 'Component replacement frequency', description: 'Which components get swapped most',
    fn: histories.componentReplacementFrequencyReport },

  // ───────── AUDIT ─────────
  { key: 'audit-by-entity', category: 'audit', chart: 'bar',
    title: 'Audit activity by entity', description: 'Which entity types see the most changes',
    fn: audit.auditActivityByEntityReport },
  { key: 'audit-by-action', category: 'audit', chart: 'bar',
    title: 'Audit activity by action', description: 'Distribution of action types',
    fn: audit.auditActivityByActionReport },
  { key: 'audit-sensitive-actions-timeline', category: 'audit', chart: 'line',
    title: 'Sensitive actions timeline', description: 'Delete / role / permission events over time',
    fn: audit.auditSensitiveActionsTimelineReport },
  { key: 'audit-activity-over-time', category: 'audit', chart: 'line',
    title: 'Audit activity over time', description: 'Total audit events per day',
    fn: audit.auditActivityOverTimeReport },

  // ───────── FORMS / FLOWS ─────────
  { key: 'forms-most-used', category: 'forms', chart: 'bar',
    title: 'Most used forms', description: 'Top form templates',
    fn: forms.mostUsedFormsReport },
  { key: 'forms-by-user', category: 'forms', chart: 'bar',
    title: 'Forms by user', description: 'Who is filling forms most',
    fn: forms.formsByUserReport },
  { key: 'forms-flows-state', category: 'forms', chart: 'pie',
    title: 'Flows enabled state', description: 'Enabled vs disabled flows',
    fn: forms.flowsEnabledStateReport },
  { key: 'forms-flows-by-owner', category: 'forms', chart: 'bar',
    title: 'Flows by owner', description: 'Flows per owning user',
    fn: forms.flowsByOwnerReport },
];

const _byKey: Record<string, ReportMeta> = {};
for (const r of REPORTS) {
  _byKey[r.key] = r;
  for (const a of r.aliases ?? []) _byKey[a] = r;
}

export function getReportMeta(key: string): ReportMeta | undefined {
  return _byKey[key];
}

export function listReports(): Array<Omit<ReportMeta, 'fn'>> {
  return REPORTS.map(({ fn, ...rest }) => rest);
}

// Backward-compat: legacy registry — some code may still import this
export const REPORT_REGISTRY: Record<string, ReportMeta['fn']> = Object.fromEntries(
  Object.entries(_byKey).map(([k, m]) => [k, m.fn]),
);
