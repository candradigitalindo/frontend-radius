// Map permission keys → menu keys they unlock
export const permMenuMap: Record<string, string[]> = {
  'dashboard.view': ['dashboard'],
  'customers.view': ['customers'],
  'packages.view': ['packages'],
  'invoices.view': ['invoices'],
  'tickets.view': ['tickets'],
  'routers.view': ['routers'],
  'olts.view': ['olts'],
  'odps.view': ['odps'],
  'vouchers.view': ['vouchers'],
  'expenses.view': ['expenses'],
  'broadcasts.view': ['broadcasts'],
  'reports.view': ['reports'],
  'bandwidth.view': ['bandwidth', 'monitoring-speed'],
  'rewards.view': ['rewards'],
  'resellers.view': ['resellers', 'referrals'],
  'ip_pools.view': ['ip-pools'],
  'notifications.view': ['notifications'],
  'whatsapp.view': ['whatsapp'],
  'settings.view': ['settings', 'help'],
  'users.view': ['users'],
  'roles.view': ['roles'],
  'tenant.view': ['tenant'],
  'subscription.view': ['subscription'],
  'reminders.view': ['reminders'],
}

// Map permission keys → route names they unlock
export const permRouteMap: Record<string, string[]> = {
  'dashboard.view': ['dashboard'],
  'customers.view': ['customers', 'customer-detail', 'onts', 'ont-detail'],
  'customers.create': ['customer-create'],
  'customers.edit': ['customer-edit'],
  'packages.view': ['packages'],
  'invoices.view': ['invoices', 'invoice-detail'],
  'tickets.view': ['tickets', 'ticket-detail'],
  'routers.view': ['routers', 'router-detail'],
  'olts.view': ['olts', 'olt-detail'],
  'odps.view': ['odps', 'odp-detail'],
  'vouchers.view': ['vouchers'],
  'expenses.view': ['expenses'],
  'reports.view': ['reports'],
  'bandwidth.view': ['bandwidth', 'monitoring-speed'],
  'rewards.view': ['rewards'],
  'resellers.view': ['resellers', 'reseller-detail', 'referrals'],
  'ip_pools.view': ['ip-pools', 'ip-pool-detail'],
  'notifications.view': ['notifications'],
  'whatsapp.view': ['whatsapp'],
  'settings.view': ['settings', 'help'],
  'users.view': ['users'],
  'roles.view': ['roles'],
  'tenant.view': ['tenant'],
  'subscription.view': ['subscription'],
  'reminders.view': ['reminders'],
  'broadcasts.view': ['broadcasts'],
}

// Superadmin static menus/routes
export const saMenus = ['sa-dashboard', 'sa-tenants', 'help']
export const saRoutes = ['sa-dashboard', 'sa-tenants', 'sa-tenant-detail', 'help']

// Customer static menus/routes
export const customerMenus = ['portal-dashboard', 'portal-invoices', 'portal-tickets', 'portal-profile']
export const customerRoutes = [
  'portal-dashboard', 'portal-invoices', 'portal-invoice-detail',
  'portal-tickets', 'portal-ticket-detail', 'portal-ticket-create', 'portal-profile',
]
