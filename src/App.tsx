/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider, useApp } from './context/AppContext';
import { OrderListProvider } from './context/OrderListContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MyOrderDrawer } from './components/MyOrderDrawer';
import { HomePage } from './pages/HomePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { RequestQuotePage } from './pages/RequestQuotePage';
import { WholesalePage } from './pages/WholesalePage';
import { AboutPage, ContactPage } from './pages/AboutAndContactPages';
import {
  FaqPage,
  PrivacyPolicyPage,
  TermsPage,
} from './pages/LegalAndFaqPages';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminQuotations } from './pages/admin/AdminQuotations';
import { AdminInventory } from './pages/admin/AdminInventory';
import {
  AdminCustomers,
  AdminEnquiries,
} from './pages/admin/AdminEnquiriesAndCustomers';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminWhatsAppAnalytics } from './pages/admin/AdminWhatsAppAnalytics';
import {
  AdminContent,
  AdminMedia,
} from './pages/admin/AdminContentAndMedia';
import {
  AdminAuditLogs,
  AdminSettings,
  AdminUsers,
} from './pages/admin/AdminSettingsAndUsers';

function AppRouter() {
  const { path, bootstrap, navigate, user } = useApp();
  const pathname = path.split('?')[0].replace(/\/+$/, '') || '/';
  const isStaff =
    user !== null &&
    ['super_admin', 'business_owner', 'business_manager', 'sales_staff', 'inventory_manager'].includes(
      user.role
    );

  // Admin routes (never expose admin navigation on public storefront)
  if (pathname === '/admin/login') return <AdminLoginPage />;
  if (pathname === '/admin' || pathname === '/admin/dashboard')
    return <AdminOverview />;
  if (pathname === '/admin/products') return <AdminProducts />;
  if (pathname === '/admin/categories') return <AdminCategories />;
  if (pathname === '/admin/orders') return <AdminOrders />;
  if (pathname === '/admin/quotations') return <AdminQuotations />;
  if (pathname === '/admin/enquiries') return <AdminEnquiries />;
  if (pathname === '/admin/customers') return <AdminCustomers />;
  if (pathname === '/admin/inventory') return <AdminInventory />;
  if (pathname === '/admin/reports') return <AdminReports />;
  if (pathname === '/admin/whatsapp-analytics') return <AdminWhatsAppAnalytics />;
  if (pathname === '/admin/content') return <AdminContent />;
  if (pathname === '/admin/media') return <AdminMedia />;
  if (pathname === '/admin/users') return <AdminUsers />;
  if (pathname === '/admin/settings') return <AdminSettings />;
  if (pathname === '/admin/audit-logs') return <AdminAuditLogs />;

  // Maintenance mode gate for public storefront (staff stay able to preview)
  if (bootstrap?.settings?.maintenanceMode && !isStaff) {
    return (
      <div className="min-h-screen bg-[#F3EEE6] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#FFFFFF] border border-[#202020]/10 rounded-xl p-8 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Eimesly Packages
          </p>
          <h1 className="text-2xl font-bold text-[#202020]">
            Scheduled Storefront Maintenance
          </h1>
          <p className="text-sm text-[#202020]/70">
            Our packaging catalogue is currently being updated. Please check back shortly.
          </p>
          <div className="pt-2 border-t border-[#202020]/10">
            <a
              href="/admin/login"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin/login');
              }}
              className="text-xs font-medium text-[#202020]/55 hover:text-[#B58B61] transition-colors"
            >
              Admin Control
            </a>
          </div>
        </div>
      </div>
    );
  }

  let pageElement;
  if (pathname === '/') {
    pageElement = <HomePage />;
  } else if (pathname === '/shop' || pathname === '/cart' || pathname === '/checkout') {
    pageElement = <ShopPage />;
  } else if (pathname === '/categories') {
    pageElement = <CategoriesPage />;
  } else if (pathname.startsWith('/categories/')) {
    const slug = pathname.slice('/categories/'.length);
    pageElement = <ShopPage categorySlug={slug} />;
  } else if (pathname.startsWith('/products/')) {
    const slug = pathname.slice('/products/'.length);
    pageElement = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/request-quote') {
    pageElement = <RequestQuotePage />;
  } else if (pathname === '/wholesale') {
    pageElement = <WholesalePage />;
  } else if (pathname === '/about') {
    pageElement = <AboutPage />;
  } else if (pathname === '/contact') {
    pageElement = <ContactPage />;
  } else if (pathname === '/privacy-policy') {
    pageElement = <PrivacyPolicyPage />;
  } else if (pathname === '/terms-and-conditions') {
    pageElement = <TermsPage />;
  } else if (pathname === '/faq') {
    pageElement = <FaqPage />;
  } else {
    pageElement = (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-3xl font-bold text-[#202020]">Page Not Found</h1>
        <p className="text-sm text-[#202020]/70">
          The page you requested could not be found.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-6 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF]">
      <Navbar />
      <main className="flex-1">{pageElement}</main>
      <Footer />
      <MyOrderDrawer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <OrderListProvider>
        <AppRouter />
      </OrderListProvider>
    </AppProvider>
  );
}
