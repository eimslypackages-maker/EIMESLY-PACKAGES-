import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderTree,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Palette,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../lib/format';
import type { UserRole } from '../../shared/types';

const STAFF_ROLES: UserRole[] = [
  'super_admin',
  'business_manager',
  'sales_staff',
  'inventory_manager',
];

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const ADMIN_NAV: NavItem[] = [
  {
    label: 'Dashboard Overview',
    to: '/admin',
    icon: LayoutDashboard,
    roles: STAFF_ROLES,
  },
  {
    label: 'Products',
    to: '/admin/products',
    icon: Package,
    roles: ['super_admin', 'business_manager'],
  },
  {
    label: 'Categories',
    to: '/admin/categories',
    icon: FolderTree,
    roles: ['super_admin', 'business_manager'],
  },
  {
    label: 'Orders',
    to: '/admin/orders',
    icon: ClipboardList,
    roles: ['super_admin', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Quotations',
    to: '/admin/quotations',
    icon: FileText,
    roles: ['super_admin', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Enquiries',
    to: '/admin/enquiries',
    icon: Mail,
    roles: ['super_admin', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Customers',
    to: '/admin/customers',
    icon: Users,
    roles: ['super_admin', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Inventory',
    to: '/admin/inventory',
    icon: Boxes,
    roles: ['super_admin', 'business_manager', 'inventory_manager'],
  },
  {
    label: 'Reports & Analytics',
    to: '/admin/reports',
    icon: BarChart3,
    roles: ['super_admin', 'business_manager', 'inventory_manager'],
  },
  {
    label: 'Website Content',
    to: '/admin/content',
    icon: Palette,
    roles: ['super_admin', 'business_manager'],
  },
  {
    label: 'Media Library',
    to: '/admin/media',
    icon: ImageIcon,
    roles: ['super_admin', 'business_manager'],
  },
  {
    label: 'Users & Roles',
    to: '/admin/users',
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    label: 'System Settings',
    to: '/admin/settings',
    icon: Settings,
    roles: ['super_admin'],
  },
  {
    label: 'Audit Logs',
    to: '/admin/audit-logs',
    icon: History,
    roles: ['super_admin', 'business_manager'],
  },
];

export function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, authReady, path, navigate, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPathname = path.split('?')[0];

  useEffect(() => {
    if (authReady && (!user || !STAFF_ROLES.includes(user.role))) {
      navigate('/admin/login');
    }
  }, [authReady, user, navigate]);

  if (!authReady || !user || !STAFF_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-sm text-[#202020]/70">Verifying admin session...</p>
      </div>
    );
  }

  const visibleNav = ADMIN_NAV.filter((n) => n.roles.includes(user.role));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#202020] text-[#FFFFFF]">
      <div className="px-5 py-5 border-b border-[#FFFFFF]/10">
        <p className="text-base font-bold tracking-tight">Eimesly Packages</p>
        <p className="text-xs text-[#B58B61] mt-0.5">
          {ROLE_LABELS[user.role] || user.role}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === '/admin'
              ? currentPathname === '/admin'
              : currentPathname.startsWith(item.to);
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                navigate(item.to);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                active
                  ? 'bg-[#B58B61] text-[#FFFFFF] font-medium'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#FFFFFF]/10 space-y-1">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 rounded-md"
        >
          <ExternalLink className="w-4 h-4" />
          View Storefront
        </button>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/admin/login');
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 rounded-md"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 no-print">
        <div className="fixed inset-y-0 left-0 w-64">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-[#202020]/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-3 text-[#FFFFFF]/75 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-[#FFFFFF] border-b border-[#202020]/10 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 -ml-2 text-[#202020]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-[#202020] truncate">
              {title}
            </h1>
          </div>
          <div className="text-xs text-[#202020]/65 truncate">
            {user.email}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
