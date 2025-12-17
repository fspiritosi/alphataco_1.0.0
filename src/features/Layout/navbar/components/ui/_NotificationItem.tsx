'use client';

import { buttonVariants } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { CheckCircledIcon, EnvelopeOpenIcon, ExclamationTriangleIcon, LapTimerIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { NotificationItemProps } from '../../types/navbar.types';

export function _NotificationItem({ notification, formattedDate }: NotificationItemProps) {
  const getNotificationIcon = (): React.ReactNode | null => {
    switch (notification.category) {
      case 'rechazado':
      case 'advertencia':
        return <ExclamationTriangleIcon className="text-yellow-800" />;
      case 'aprobado':
        return <CheckCircledIcon className="text-green-800" />;
      case 'vencimiento':
        return <LapTimerIcon className="text-red-800" />;
      case 'noticia':
        return <EnvelopeOpenIcon className="text-blue-800" />;
      default:
        return null;
    }
  };

  const getNotificationMessage = (): string => {
    const resourceName = notification.document.resource
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const referenceType = notification.document.reference === 'employee' ? 'empleado' : 'vehiculo con patente';

    switch (notification.category) {
      case 'aprobado':
        return `El documento ${notification.document.documentName}, del ${referenceType} ${resourceName} ha sido aprobado`;
      case 'rechazado':
        return `El documento ${notification.document.documentName}, del ${referenceType} ${resourceName} ha sido rechazado`;
      case 'vencimiento':
        return `El documento ${notification.document.documentName}, del ${referenceType} ${resourceName} ha vencido`;
      default:
        return notification.description;
    }
  };

  return (
    <div key={notification.id} className="mb-4 grid grid-cols-[25px_1fr] pb-4 last:mb-0 last:pb-0 items-center gap-2">
      {getNotificationIcon()}
      <div className="space-y-1 flex justify-between items-center gap-2">
        <div>
          <p className="text-sm font-medium leading-none first-letter:uppercase">{getNotificationMessage()}</p>
          <CardDescription>
            {notification.description?.length > 50
              ? notification.description.substring(0, 50) + '...'
              : notification.description}
          </CardDescription>
          <p className="text-sm text-muted-foreground/70 first-letter:">{formattedDate}</p>
        </div>
        <Link
          className={[buttonVariants({ variant: 'outline' }), 'w-20'].join(' ')}
          href={`/dashboard/document/${notification.document.id}`}
        >
          Ver
        </Link>
      </div>
    </div>
  );
}
