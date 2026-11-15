import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
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
  MessageCircle,
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
  'business_owner',
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
    to: '/admin/dashboard',
    icon: LayoutDashboard,
    roles: STAFF_ROLES,
  },
  {
    label: 'WhatsApp Analytics',
    to: '/admin/whatsapp-analytics',
    icon: MessageCircle,
    roles: STAFF_ROLES,
  },
  {
    label: 'Products',
    to: '/admin/products',
    icon: Package,
    roles: ['super_admin', 'business_owner', 'business_manager'],
  },
  {
    label: 'Categories',
    to: '/admin/categories',
    icon: FolderTree,
    roles: ['super_admin', 'business_owner', 'business_manager'],
  },
  {
    label: 'Orders',
    to: '/admin/orders',
    icon: ClipboardList,
    roles: ['super_admin', 'business_owner', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Quotations',
    to: '/admin/quotations',
    icon: FileText,
    roles: ['super_admin', 'business_owner', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Enquiries',
    to: '/admin/enquiries',
    icon: Mail,
    roles: ['super_admin', 'business_owner', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Customers',
    to: '/admin/customers',
    icon: Users,
    roles: ['super_admin', 'business_owner', 'business_manager', 'sales_staff'],
  },
  {
    label: 'Inventory',
    to: '/admin/inventory',
    icon: Boxes,
    roles: ['super_admin', 'business_owner', 'business_manager', 'inventory_manager'],
  },
  {
    label: 'Reports & Analytics',
    to: '/admin/reports',
    icon: BarChart3,
    roles: ['super_admin', 'business_owner', 'business_manager', 'inventory_manager'],
  },
  {
    label: 'Website Content',
    to: '/admin/content',
    icon: Palette,
    roles: ['super_admin', 'business_owner', 'business_manager'],
  },
  {
    label: 'Media Library',
    to: '/admin/media',
    icon: ImageIcon,
    roles: ['super_admin', 'business_owner', 'business_manager'],
  },
  {
    label: 'Staff & Users',
    to: '/admin/users',
    icon: Shield,
    roles: ['super_admin', 'business_owner'],
  },
  {
    label: 'System Settings',
    to: '/admin/settings',
    icon: Settings,
    roles: ['super_admin', 'business_owner'],
  },
  {
    label: 'Audit Logs',
    to: '/admin/audit-logs',
    icon: History,
    roles: ['super_admin', 'business_owner', 'business_manager'],
  },
];

export function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, authReady, bootstrap, path, navigate, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const currentPathname = path.split('?')[0].replace(/\/+$/, '') || '/';
  const logoUrl = bootstrap?.settings?.logoUrl;

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

  const renderSidebarContent = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full bg-[#202020] text-[#FFFFFF]">
      <div className="px-4 py-4 border-b border-[#FFFFFF]/10 flex items-center justify-between gap-2 min-h-[64px]">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Eimesly Packages"
                className="h-7 w-auto object-contain bg-white rounded px-1 py-0.5 shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight truncate">
                Eimesly Packages
              </p>
              <p className="text-[11px] text-[#B58B61] truncate">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex p-1.5 rounded text-[#FFFFFF]/65 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/10 shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === '/admin/dashboard'
              ? currentPathname === '/admin' ||
                currentPathname === '/admin/dashboard'
              : currentPathname.startsWith(item.to);
          return (
            <button
              key={item.to}
              type="button"
              title={isCollapsed ? item.label : undefined}
              onClick={() => {
                setSidebarOpen(false);
                navigate(item.to);
              }}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
              } py-2 text-sm rounded-md transition-colors text-left ${
                active
                  ? 'bg-[#B58B61] text-[#FFFFFF] font-medium'
                  : 'text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 hover:text-[#FFFFFF]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2.5 border-t border-[#FFFFFF]/10 space-y-1">
        <button
          type="button"
          title={isCollapsed ? 'View Storefront' : undefined}
          onClick={() => navigate('/')}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
          } py-2 text-xs text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 rounded-md`}
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>View Storefront</span>}
        </button>
        <button
          type="button"
          title={isCollapsed ? 'Sign Out' : undefined}
          onClick={async () => {
            await logout();
            navigate('/admin/login');
          }}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
          } py-2 text-xs text-[#FFFFFF]/75 hover:bg-[#FFFFFF]/10 rounded-md`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 no-print ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div
          className={`fixed inset-y-0 left-0 transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          {renderSidebarContent(collapsed)}
        </div>
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
              className="absolute top-4 right-3 text-[#FFFFFF]/75 p-1 z-20"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent(false)}
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
          <div className="flex items-center gap-3 text-xs text-[#202020]/65 truncate">
            <span className="hidden sm:inline font-medium text-[#B58B61]">
              {ROLE_LABELS[user.role] || user.role}
            </span>
            <span className="truncate">{user.email}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
