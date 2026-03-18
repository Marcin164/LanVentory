import * as users from '../reports/users';
import * as devices from '../reports/devices';
import * as security from '../reports/security';
import * as tickets from '../reports/tickets';

export const REPORT_REGISTRY = {
  // USERS
  'users-by-department': users.usersByDepartmentReport,
  'users-by-location': users.usersByLocationReport,
  'users-by-title': users.usersByTitleReport,
  'users-new-over-time': users.newUsersOverTimeReport,
  'users-inactive': users.inactiveUsersReport,
  'users-without-device': users.usersWithoutDeviceReport,
  'users-multiple-devices': users.usersWithMultipleDevicesReport,
  'users-by-manager': users.usersByManagerReport,
  'users-by-company': users.usersByCompanyReport,
  'users-password-age': users.usersPasswordAgeReport,
  'users-with-admin': users.usersAdminDistributionReport,

  // DEVICES
  'devices-by-type': devices.devicesByTypeReport,
  'devices-by-manufacturer': devices.devicesByManufacturerReport,
  'devices-by-model': devices.devicesByModelReport,
  'devices-by-os': devices.devicesByOSReport,
  'devices-by-location': devices.devicesByLocationReport,
  'devices-by-department': devices.devicesByDepartmentReport,
  'devices-by-state': devices.devicesByStateReport,
  'devices-online-offline': devices.devicesOnlineOfflineReport,
  'devices-without-owner': devices.devicesWithoutOwnerReport,
  'device-age': devices.deviceAgeReport,

  // SECURITY
  'devices-without-updates': security.devicesWithoutUpdatesReport,
  'devices-without-antivirus': security.devicesWithoutAntivirusReport,
  'devices-outside-domain': security.devicesOutsideDomainReport,
  'devices-local-admin': security.devicesWithLocalAdminReport,
  'patch-compliance': security.patchComplianceReport,

  // TICKETS
  'tickets-by-category': tickets.ticketsByCategoryReport,
  'tickets-by-priority': tickets.ticketsByPriorityReport,
  'tickets-by-state': tickets.ticketsByStateReport,
  'tickets-over-time': tickets.ticketsOverTimeReport,
  'tickets-by-device-model': tickets.ticketsByDeviceModelReport,
  'tickets-by-requester': tickets.ticketsByRequesterReport,
  'ticket-resolution-time': tickets.averageResolutionTimeReport,
  'sla-breaches': tickets.slaBreachesReport,
  'it-load-by-department': tickets.itLoadByDepartmentReport,
  'top-problematic-devices': tickets.topProblematicDevicesReport,
};
