import { h, type VNode } from 'vue'
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  GridOutline as DashboardIcon,
  PeopleOutline as CustomerIcon,
  CubeOutline as PackageIcon,
  ReceiptOutline as InvoiceIcon,
  HardwareChipOutline as RouterIcon,
  ChatbubbleEllipsesOutline as TicketIcon,
  BarChartOutline as ReportIcon,
  SettingsOutline as SettingIcon,
  WifiOutline as OltIcon,
  LocationOutline as OdpIcon,
  WalletOutline as ExpenseIcon,
  TicketOutline as VoucherIcon,
  SpeedometerOutline as BandwidthIcon,
  GiftOutline as RewardIcon,
  ShareSocialOutline as ReferralIcon,
  ServerOutline as IpamIcon,
  StorefrontOutline as ResellerIcon,
  NotificationsOutline as NotifIcon,
  LogoWhatsapp as WaIcon,
  BusinessOutline as TenantIcon,
  CardOutline as SubsIcon,
  PersonOutline as UserIcon,
  ShieldCheckmarkOutline as RoleIcon,
  CashOutline as FinanceIcon,
  GlobeOutline as NetworkIcon,
  AppsOutline as ServiceIcon,
  MegaphoneOutline as MarketingIcon,
  BuildOutline as AdminIcon,
} from '@vicons/ionicons5'
import { BookOutline as GuideIcon } from '@vicons/ionicons5'

export function ri(icon: any): () => VNode {
  return () => h(NIcon, null, { default: () => h(icon) })
}

/**
 * All menu items for the staff AppLayout sidebar.
 * Permission filtering is done at runtime via canAccessMenu().
 */
export const allMenuItems: MenuOption[] = [
  { label: 'Dashboard', key: 'dashboard', icon: ri(DashboardIcon) },
  { label: 'Panduan Penggunaan', key: 'help', icon: ri(GuideIcon) },
  {
    label: 'Pelanggan',
    key: 'grp-pelanggan',
    icon: ri(CustomerIcon),
    children: [
      { label: 'Daftar Pelanggan', key: 'customers', icon: ri(CustomerIcon) },
      { label: 'Paket', key: 'packages', icon: ri(PackageIcon) },
      { label: 'Monitoring Speed', key: 'monitoring-speed', icon: ri(BandwidthIcon) },
    ],
  },
  {
    label: 'Keuangan',
    key: 'grp-keuangan',
    icon: ri(FinanceIcon),
    children: [
      { label: 'Invoice', key: 'invoices', icon: ri(InvoiceIcon) },
      { label: 'Pengeluaran', key: 'expenses', icon: ri(ExpenseIcon) },
      { label: 'Laporan', key: 'reports', icon: ri(ReportIcon) },
    ],
  },
  {
    label: 'Jaringan',
    key: 'grp-jaringan',
    icon: ri(NetworkIcon),
    children: [
      { label: 'Router', key: 'routers', icon: ri(RouterIcon) },
      { label: 'OLT', key: 'olts', icon: ri(OltIcon) },
      { label: 'ODP', key: 'odps', icon: ri(OdpIcon) },
      { label: 'IPAM', key: 'ip-pools', icon: ri(IpamIcon) },
      { label: 'Bandwidth', key: 'bandwidth', icon: ri(BandwidthIcon) },
    ],
  },
  {
    label: 'Layanan',
    key: 'grp-layanan',
    icon: ri(ServiceIcon),
    children: [
      { label: 'Tiket', key: 'tickets', icon: ri(TicketIcon) },
      { label: 'Voucher', key: 'vouchers', icon: ri(VoucherIcon) },
      { label: 'Notifikasi', key: 'notifications', icon: ri(NotifIcon) },
    ],
  },
  {
    label: 'Marketing',
    key: 'grp-marketing',
    icon: ri(MarketingIcon),
    children: [
      { label: 'Dashboard Reward', key: 'rewards-dashboard', icon: ri(RewardIcon) },
      { label: 'Reward', key: 'rewards', icon: ri(RewardIcon) },
      { label: 'Referral', key: 'referrals', icon: ri(ReferralIcon) },
      { label: 'Reseller', key: 'resellers', icon: ri(ResellerIcon) },
    ],
  },
  {
    label: 'Administrasi',
    key: 'grp-admin',
    icon: ri(AdminIcon),
    children: [
      { label: 'Pengguna', key: 'users', icon: ri(UserIcon) },
      { label: 'Role', key: 'roles', icon: ri(RoleIcon) },
      { label: 'WhatsApp', key: 'whatsapp', icon: ri(WaIcon) },
      { label: 'Tenant', key: 'tenant', icon: ri(TenantIcon) },
      { label: 'Langganan', key: 'subscription', icon: ri(SubsIcon) },
      { label: 'Pengaturan', key: 'settings', icon: ri(SettingIcon) },
    ],
  },
]

/** Build a map of child keys → parent group key for auto-expand */
export function buildChildToGroup(items: MenuOption[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const item of items) {
    if (item.children) {
      for (const child of item.children) {
        map[child.key as string] = item.key as string
      }
    }
  }
  return map
}
