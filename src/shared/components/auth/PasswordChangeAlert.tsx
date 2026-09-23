'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/features/Auth/actions/change-password';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Cartel de cambio de contraseña obligatorio. Quién lo ve lo decide el servidor
 * (`PasswordChangeAlertWrapper`), que lee `needsPasswordChange` de la sesión: acá ya no llega
 * metadata del usuario que el cliente pudiera manipular.
 */
export function PasswordChangeAlert() {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChangePassword = async () => {
    // Validaciones
    if (!newPassword || !confirmPassword) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Actualizando contraseña...');

    try {
      const result = await changePassword(newPassword);

      if (result.success) {
        toast.success('Contraseña actualizada exitosamente', { id: toastId });
        setOpen(false);
        router.refresh(); // Refrescar para actualizar la metadata del usuario
      } else {
        toast.error(result.error || 'Error al actualizar la contraseña', { id: toastId });
      }
    } catch (error) {
      toast.error('Error inesperado al actualizar la contraseña', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 w-80">
        <Alert variant="destructive" className="shadow-lg bg-red-50 border-red-200 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Cambio de contraseña requerido</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm text-red-700">
              Estás usando una contraseña temporal. Por seguridad, debes cambiarla antes de continuar.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="w-full bg-white hover:bg-red-50 text-red-600 border-red-300 hover:border-red-400"
            >
              Cambiar ahora
            </Button>
          </AlertDescription>
        </Alert>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Por favor establece una nueva contraseña segura para tu cuenta.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="flex gap-2">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={isLoading}>
              {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
