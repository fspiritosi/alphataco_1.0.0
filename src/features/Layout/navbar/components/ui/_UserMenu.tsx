'use client';

import { AlertDialogHeader } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Logger } from '@/lib/logger';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { UploadImage } from '@/shared/components/common/UploadImage';
import cookie from 'js-cookie';
import { LogOut, Settings, UserCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { updateProfileAvatar } from '../../actions/actions.navbar';
import { UserMenuProps } from '../../types/navbar.types';

const logger = new Logger('UserMenu');

export function _UserMenu({ user }: UserMenuProps) {
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const form = useForm();

  const router = useRouter();
  const logout = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    //Borrar las cookies
    cookie.remove('actualComp');
    router.push('/login');
  };
  const handleAvatarUpdate = async (imageUrl: string) => {
    if (!user?.id) return;

    try {
      await updateProfileAvatar(user.id, imageUrl);
      form.setValue('profile', imageUrl);
    } catch (error) {
      logger.error('Error al actualizar avatar', { data: { error } });
    }
  };

  const initials =
    user?.fullname
      ?.split(' ')
      .map((name) => name[0])
      .join('')
      .toUpperCase() || 'U';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer outline-none" asChild>
          <Avatar className="size-9 hover:opacity-80 transition-opacity">
            <AvatarImage src={user?.avatar || ''} />
            <AvatarFallback className="bg-muted">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.fullname}</p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setShowProfileDialog(true)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span>Editar perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            onSelect={async () => {
              await logout();
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5" />
              Editar perfil
            </DialogTitle>
            <DialogDescription>Aquí podrás actualizar tu imagen de perfil</DialogDescription>
          </AlertDialogHeader>

          <div className="py-6">
            <FormProvider {...form}>
              <FormField
                control={form.control}
                name="company_logo"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="space-y-8">
                        <div className="flex justify-center">
                          <Avatar className="size-24">
                            <AvatarImage src={user?.avatar || ''} />
                            <AvatarFallback className="bg-muted text-2xl">{initials}</AvatarFallback>
                          </Avatar>
                        </div>
                        <UploadImage
                          companyId={user?.id || ''}
                          labelInput="Cambiar avatar"
                          imageBucket="avatar"
                          desciption="Sube una imagen para tu perfil"
                          onImageChange={handleAvatarUpdate}
                          inputStyle={{ width: '100%' }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormProvider>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
