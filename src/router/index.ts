import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { clearAuthSession, getStoredAccessToken } from '../api/authSession'

// Helper: declare route meta types
declare module 'vue-router' {
  interface RouteMeta {
    guest?: boolean
    auth?: boolean
    roles?: string[]
    staff?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/auth/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../pages/auth/RegisterPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/portal/login/:slug',
    name: 'portal-login',
    component: () => import('../pages/portal/PortalLoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('../pages/ForbiddenPage.vue'),
  },

  // ─── /admin redirect → /superadmin ───
  {
    path: '/admin',
    redirect: '/superadmin',
  },
  {
    path: '/admin/:pathMatch(.*)*',
    redirect: '/superadmin',
  },

  // ─── SuperAdmin Panel ───
  {
    path: '/superadmin',
    component: () => import('../layouts/SuperAdminLayout.vue'),
    meta: { auth: true, roles: ['superadmin'] },
    children: [
      { path: '', name: 'sa-dashboard', component: () => import('../pages/superadmin/SaDashboard.vue') },
      { path: 'tenants', name: 'sa-tenants', component: () => import('../pages/superadmin/SaTenantList.vue') },
      { path: 'tenants/:id', name: 'sa-tenant-detail', component: () => import('../pages/superadmin/SaTenantDetail.vue') },
    ],
  },

  // ─── Customer Portal ───
  {
    path: '/portal',
    component: () => import('../layouts/PortalLayout.vue'),
    meta: { auth: true, roles: ['customer'] },
    children: [
      { path: '', name: 'portal-dashboard', component: () => import('../pages/portal/PortalDashboard.vue') },
      { path: 'invoices', name: 'portal-invoices', component: () => import('../pages/portal/PortalInvoices.vue') },
      { path: 'invoices/:id', name: 'portal-invoice-detail', component: () => import('../pages/portal/PortalInvoiceDetail.vue') },
      { path: 'tickets', name: 'portal-tickets', component: () => import('../pages/portal/PortalTickets.vue') },
      { path: 'tickets/create', name: 'portal-ticket-create', component: () => import('../pages/portal/PortalTicketCreate.vue') },
      { path: 'tickets/:id', name: 'portal-ticket-detail', component: () => import('../pages/portal/PortalTicketDetail.vue') },
      { path: 'profile', name: 'portal-profile', component: () => import('../pages/portal/PortalProfile.vue') },
    ],
  },

  // ─── Staff Panel ───
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { auth: true, staff: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../pages/dashboard/DashboardPage.vue') },
      // Customers
      { path: 'customers', name: 'customers', component: () => import('../pages/customers/CustomerList.vue') },
      { path: 'customers/create', name: 'customer-create', component: () => import('../pages/customers/CustomerForm.vue') },
      { path: 'customers/:id', name: 'customer-detail', component: () => import('../pages/customers/CustomerDetail.vue') },
      { path: 'customers/:id/edit', name: 'customer-edit', component: () => import('../pages/customers/CustomerForm.vue') },
      // Monitoring Speed
      { path: 'monitoring-speed', name: 'monitoring-speed', component: () => import('../pages/customers/MonitoringSpeedPage.vue') },
      // Packages
      { path: 'packages', name: 'packages', component: () => import('../pages/packages/PackageList.vue') },
      // Invoices
      { path: 'invoices', name: 'invoices', component: () => import('../pages/invoices/InvoiceList.vue') },
      { path: 'invoices/:id', name: 'invoice-detail', component: () => import('../pages/invoices/InvoiceDetail.vue') },
      // Routers
      { path: 'routers', name: 'routers', component: () => import('../pages/routers/RouterList.vue') },
      { path: 'routers/:id', name: 'router-detail', component: () => import('../pages/routers/RouterDetail.vue') },
      { path: 'onts', name: 'onts', component: () => import('../pages/onts/OntList.vue') },
      { path: 'onts/:id', name: 'ont-detail', component: () => import('../pages/onts/OntDetail.vue') },
      // Tickets
      { path: 'tickets', name: 'tickets', component: () => import('../pages/tickets/TicketList.vue') },
      { path: 'tickets/:id', name: 'ticket-detail', component: () => import('../pages/tickets/TicketDetail.vue') },
      { path: 'olts', name: 'olts', component: () => import('../pages/olts/OltList.vue') },
      { path: 'olts/:id', name: 'olt-detail', component: () => import('../pages/olts/OltDetail.vue') },
      { path: 'odps', name: 'odps', component: () => import('../pages/odps/OdpList.vue') },
      { path: 'odps/:id', name: 'odp-detail', component: () => import('../pages/odps/OdpDetail.vue') },
      // Vouchers
      { path: 'vouchers', name: 'vouchers', component: () => import('../pages/vouchers/VoucherList.vue') },
      // Expenses
      { path: 'expenses', name: 'expenses', component: () => import('../pages/expenses/ExpenseList.vue') },
      // Reports
      { path: 'reports', name: 'reports', component: () => import('../pages/reports/ReportPage.vue') },
      // Bandwidth
      { path: 'bandwidth', name: 'bandwidth', component: () => import('../pages/bandwidth/BandwidthPage.vue') },
      // Rewards
      { path: 'rewards', name: 'rewards', component: () => import('../pages/rewards/RewardList.vue') },
      { path: 'rewards/dashboard', name: 'rewards-dashboard', component: () => import('../pages/rewards/RewardDashboard.vue') },
      { path: 'referrals', name: 'referrals', component: () => import('../pages/referrals/ReferralList.vue') },
      // IPAM
      { path: 'ip-pools', name: 'ip-pools', component: () => import('../pages/ipam/IpPoolList.vue') },
      { path: 'ip-pools/:id', name: 'ip-pool-detail', component: () => import('../pages/ipam/IpPoolDetail.vue') },
      // Resellers
      { path: 'resellers', name: 'resellers', component: () => import('../pages/resellers/ResellerList.vue') },
      { path: 'resellers/:id', name: 'reseller-detail', component: () => import('../pages/resellers/ResellerDetail.vue') },
      // Notifications
      { path: 'notifications', name: 'notifications', component: () => import('../pages/notifications/NotificationPage.vue') },
      // WhatsApp
      { path: 'whatsapp', name: 'whatsapp', component: () => import('../pages/whatsapp/WhatsAppPage.vue') },
      // Settings
      { path: 'settings', name: 'settings', component: () => import('../pages/settings/SettingsPage.vue') },
      // Profile
      { path: 'profile', name: 'profile', component: () => import('../pages/profile/ProfilePage.vue') },
      // Users
      { path: 'users', name: 'users', component: () => import('../pages/users/UserList.vue') },
      // Roles
      { path: 'roles', name: 'roles', component: () => import('../pages/roles/RolePage.vue') },
      // Tenant
      { path: 'tenant', name: 'tenant', component: () => import('../pages/tenant/TenantPage.vue') },
      // Subscription
       { path: 'subscription', name: 'subscription', component: () => import('../pages/subscription/SubscriptionPage.vue') },
       { path: 'help', name: 'help', component: () => import('../pages/HelpPage.vue') },
     ],
   },
 ]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const token = getStoredAccessToken()

  // Allow forbidden page without checks
  if (to.name === 'forbidden') {
    return next()
  }

  // Guest routes (login, register)
  if (to.meta.guest) {
    if (!token) return next()
    // Portal login is a public page — always accessible
    if (to.name === 'portal-login') {
      const { useAuthStore } = await import('../stores/auth')
      const authStore = useAuthStore()
      // Only redirect if user is already loaded as customer (don't fetch — may trigger forceLogout)
      if (authStore.user?.role === 'customer') return next('/portal')
      return next()
    }
    return next('/')
  }

  // Auth required — no token
  if (to.meta.auth && !token) {
    // Portal customer → redirect to branded portal login
    if (to.path.startsWith('/portal')) {
      const slug = localStorage.getItem('portal_tenant_slug')
      if (slug) return next(`/portal/login/${slug}`)
    }
    return next('/login')
  }

  // Has token — check role
  if (token) {
    const { useAuthStore } = await import('../stores/auth')
    const authStore = useAuthStore()

    // Wait for user to be fetched if not yet loaded
    if (!authStore.user) {
      try {
        await authStore.fetchUser()
      } catch {
        clearAuthSession()
        return next('/login')
      }
    }

    if (!authStore.user) {
      clearAuthSession()
      return next('/login')
    }

    const userRole = authStore.user?.role || ''
    const isStaffRole = userRole !== '' && userRole !== 'superadmin' && userRole !== 'customer'

    // Redirect based on role when hitting root path or login
    if (to.path === '/') {
      if (userRole === 'superadmin') return next('/superadmin')
      if (userRole === 'customer') return next('/portal')
    }

    // Check route role restriction (merge parent + child meta)
    const allowedRoles = to.matched
      .map(r => r.meta.roles)
      .filter(Boolean)
      .pop() as string[] | undefined

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return next('/forbidden')
    }

    // Staff panel guard — block superadmin and customer from staff routes
    const isStaffRoute = to.matched.some(r => r.meta.staff)
    if (isStaffRoute && !isStaffRole) {
      return next('/forbidden')
    }

    // Permission-based route guard for staff
    const publicStaffRoutes = ['dashboard', 'profile', 'settings', 'subscription']
    if (isStaffRoute && isStaffRole && to.name && !publicStaffRoutes.includes(to.name as string)) {
      const { usePermission } = await import('../composables/usePermission')
      const { canAccessRoute } = usePermission()
      if (!canAccessRoute(to.name as string)) {
        return next('/forbidden')
      }
    }

    // Subscription guard — redirect staff without active plan
    if (isStaffRole && to.name !== 'subscription') {
      const u = authStore.user as any
      const plan = (u?.plan || '').toLowerCase().trim()
      const expiresAt = u?.plan_expires_at
      // Free plan has no expiry — always active
      const isFreePlan = plan === 'gratis' || plan === 'free'
      const hasActivePlan = plan && expiresAt && new Date(expiresAt) > new Date()
      if (!plan || (!isFreePlan && !hasActivePlan)) {
        return next('/subscription')
      }
    }
  }

  next()
})

export default router
