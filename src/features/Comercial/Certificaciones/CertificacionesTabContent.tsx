import { Card } from '@/components/ui/card';
import { getCustomerServices } from '@/features/Empresa/Clientes/actions/services.server';
import { getCustomers } from '@/features/Empresa/Clientes/actions/customers.server';
import { getCertificationById, getCertifications } from './actions/certifications.server';
import { CertificacionesPanel } from './components/CertificacionesPanel';

/**
 * Sección Certificaciones del módulo Comercial.
 *
 * El detalle se pide bajo demanda (`getCertificationById` viaja como server action) en vez de
 * traer todas las líneas de todas las certificaciones en el listado: una certificación de un
 * mes puede tener cientos de líneas y casi siempre se mira una sola.
 */
export default async function CertificacionesTabContent() {
  const [certifications, customers, services] = await Promise.all([
    getCertifications(),
    getCustomers(),
    getCustomerServices(),
  ]);

  const customerOptions = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    services: services
      .filter((service) => service.customer_id === customer.id)
      .map((service) => ({ id: service.id, service_name: service.service_name })),
  }));

  return (
    <Card className="p-6">
      <CertificacionesPanel
        certifications={certifications}
        customers={customerOptions}
        onOpenDetail={getCertificationById}
      />
    </Card>
  );
}
