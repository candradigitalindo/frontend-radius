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
  'ftth.view': ['network-map'],
  'vouchers.view': ['vouchers'],
  'expenses.view': ['expenses'],
  'reports.view': ['reports'],
  'bandwidth.view': ['bandwidth', 'monitoring-speed'],
  'rewards.view': ['rewards', 'rewards-dashboard', 'referrals'],
  'resellers.view': ['resellers', 'referrals'],
  'ip_pools.view': ['ip-pools'],
  'notifications.view': ['notifications'],
  'whatsapp.view': ['whatsapp'],
  'settings.view': ['settings'],
  'users.view': ['users'],
  'roles.view': ['roles'],
  'tenant.view': ['tenant'],
  'subscription.view': ['subscription'],
}

// Map permission keys → route names they unlock
export const permRouteMap: Record<string, string[]> = {
  'dashboard.view': ['dashboard'],
  'customers.view': ['customers', 'customer-detail'],
  'customers.create': ['customer-create'],
  'onts.view': ['onts', 'ont-detail'],
  'customers.edit': ['customer-edit'],
  'packages.view': ['packages'],
  'invoices.view': ['invoices', 'invoice-detail'],
  'tickets.view': ['tickets', 'ticket-detail'],
  'routers.view': ['routers', 'router-detail'],
  'olts.view': ['olts', 'olt-detail'],
  'odps.view': ['odps', 'odp-detail'],
  'ftth.view': ['network-map'],
  'vouchers.view': ['vouchers'],
  'expenses.view': ['expenses'],
  'reports.view': ['reports'],
  'bandwidth.view': ['bandwidth', 'monitoring-speed'],
  'rewards.view': ['rewards', 'rewards-dashboard', 'referrals'],
  'resellers.view': ['resellers', 'reseller-detail', 'referrals'],
  'ip_pools.view': ['ip-pools', 'ip-pool-detail'],
  'notifications.view': ['notifications'],
  'whatsapp.view': ['whatsapp'],
  'settings.view': ['settings'],
  'users.view': ['users'],
  'roles.view': ['roles'],
  'tenant.view': ['tenant'],
  'subscription.view': ['subscription'],
}

// Superadmin static menus/routes
export const saMenus = [
  'sa-dashboard', 'sa-tenants', 'sa-transaksi',
  'sa-subscription-products', 'sa-subscription-reminders', 'sa-settings',
]
export const saRoutes = [...saMenus, 'sa-tenant-detail']

// Customer static menus/routes
export const customerMenus = [
  'portal-dashboard', 'portal-invoices', 'portal-package', 'portal-device',
  'portal-referral', 'portal-tickets', 'portal-profile',
]
export const customerRoutes = [
  ...customerMenus,
  'portal-invoice-detail', 'portal-ticket-detail', 'portal-ticket-create',
]
