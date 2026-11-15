import { useDocumentMeta } from '../../context/AppContext';
import { WhatsAppAnalyticsDashboard } from '../../components/admin/WhatsAppAnalyticsDashboard';
import { AdminLayout } from './AdminLayout';

export function AdminWhatsAppAnalytics() {
  useDocumentMeta('WhatsApp Analytics | Eimesly Packages Admin');

  return (
    <AdminLayout title="WhatsApp Enquiry Analytics">
      <WhatsAppAnalyticsDashboard />
    </AdminLayout>
  );
}
