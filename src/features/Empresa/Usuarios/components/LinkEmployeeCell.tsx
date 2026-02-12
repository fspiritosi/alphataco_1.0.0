'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Logger } from '@/lib/logger';
import { Link2, Loader2, Search, Unlink, UserCheck, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { linkEmployeeToProfile, searchEmployeesForLink } from '../actions/server-actions';

const logger = new Logger('LinkEmployeeCell');

interface LinkEmployeeCellProps {
  profileId: string;
  employee:
    | {
        id: string;
        firstname: string;
        lastname: string;
        cuil: string;
      }
    | null
    | undefined;
}

type EmployeeSearchResult = Awaited<ReturnType<typeof searchEmployeesForLink>>[number];

export function LinkEmployeeCell({ profileId, employee }: LinkEmployeeCellProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<EmployeeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const data = await searchEmployeesForLink(searchQuery);
      setResults(data);
    } catch (error) {
      logger.error('Error searching employees', { data: { error } });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async (employeeId: string) => {
    setIsLinking(true);
    try {
      await linkEmployeeToProfile(profileId, employeeId);
      toast.success('Empleado vinculado exitosamente');
      setOpen(false);
      router.refresh();
    } catch (error) {
      logger.error('Error linking employee', { data: { error } });
      toast.error('Error al vincular empleado');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    setIsLinking(true);
    try {
      await linkEmployeeToProfile(profileId, null);
      toast.success('Empleado desvinculado');
      router.refresh();
    } catch (error) {
      logger.error('Error unlinking employee', { data: { error } });
      toast.error('Error al desvincular empleado');
    } finally {
      setIsLinking(false);
    }
  };

  if (employee) {
    return (
      <div className="flex items-center gap-2">
        <UserCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
        <span className="text-sm font-medium truncate">
          {employee.lastname} {employee.firstname}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleUnlink}
          disabled={isLinking}
          title="Desvincular empleado"
        >
          {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3 text-destructive" />}
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground">
          <UserX className="h-3.5 w-3.5" />
          <span className="text-xs">Vincular</span>
          <Link2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular empleado</DialogTitle>
          <DialogDescription>Busca un empleado por nombre o CUIL para vincularlo a este usuario.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nombre o CUIL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching || searchQuery.length < 2} size="icon">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {results.length === 0 && !isSearching && searchQuery.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">No se encontraron empleados disponibles</p>
            )}
            {results.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                onClick={() => handleLink(emp.id)}
              >
                <div>
                  <p className="text-sm font-medium">
                    {emp.lastname} {emp.firstname}
                  </p>
                  <p className="text-xs text-muted-foreground">CUIL: {emp.cuil || '-'}</p>
                </div>
                <Button size="sm" variant="outline" disabled={isLinking}>
                  {isLinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
