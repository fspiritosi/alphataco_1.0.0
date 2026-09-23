import { Skeleton } from '@/components/ui/skeleton';
import ContactComponent from '@/features/Empresa/Contactos/components/ContactComponent';
import { cn } from '@/lib/utils';
import BackButton from '@/shared/components/common/BackButton';
import { Suspense } from 'react';

/** `?id=` (contacto a ver/editar) y `?action=` (`new` | `edit` | `view`) de la ruta de contactos. */
export interface ContactSectionSearchParams {
  id?: string;
  action?: string;
}

interface ContactSectionProps {
  searchParams: Promise<ContactSectionSearchParams>;
  /** Volver a la izquierda (vista de listado) o a la derecha (vista de acción). */
  backButtonAlign?: 'start' | 'end';
  /** Alto del skeleton mientras carga el formulario. */
  skeletonClassName?: string;
}

/**
 * Sección de contacto de la empresa activa: encabezado con el botón Volver y el formulario.
 * La empresa la resuelve el servidor dentro de las actions de `ContactComponent`; acá sólo se
 * resuelven los search params de la ruta (en Next 16 son una Promise y hay que esperarlos, antes
 * se leían en forma síncrona y `id` llegaba siempre `undefined`).
 */
export default async function ContactSection({
  searchParams,
  backButtonAlign = 'start',
  skeletonClassName = 'h-[400px]',
}: ContactSectionProps) {
  const { id, action } = await searchParams;

  return (
    <section className="grid grid-cols-2 xl:grid-cols-2 gap-2 py-4 justify-start">
      <div className={cn('flex gap-2', backButtonAlign === 'end' && 'col-start-2 justify-end')}>
        <BackButton />
      </div>

      <div className={cn('col-span-6 flex flex-col justify-between overflow-hidden', action === 'new' && 'col-span-8')}>
        <Suspense fallback={<Skeleton className={cn('w-full rounded-md', skeletonClassName)} />}>
          <ContactComponent id={id ?? ''} />
        </Suspense>
      </div>
    </section>
  );
}
