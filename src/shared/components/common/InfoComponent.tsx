import { Info } from 'lucide-react';

function InfoComponent({ message, size, iconSize }: { message: string; size: string; iconSize?: string }) {
  const sizeComponent: Record<string, string> = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };
  const sizeIcon: Record<string, string> = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-14',
  };
  return (
    <div className={`bg-blue-50 rounded-md flex items-start space-x-3 ${sizeComponent[size]}`}>
      <Info className={`${iconSize ? sizeIcon[iconSize] : 'w-5 h-5'} text-blue-500 mt-0.5`} />
      <div className="text-sm text-blue-700">{message}</div>
    </div>
  );
}

export default InfoComponent;
