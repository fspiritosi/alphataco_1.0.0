import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import type { UserDetailData } from '@/features/UserPermissionsManager/actions.server';
import { Briefcase, Mail, Unlink } from 'lucide-react';
import { EditNameButton } from './EditNameButton';

type Profile = NonNullable<NonNullable<UserDetailData>['profile']>;

interface UserProfileCardProps {
  profile: Profile;
  canEdit: boolean;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

export function UserProfileCard({ profile, canEdit }: UserProfileCardProps) {
  const { fullname, email, avatar, employees: employee } = profile;
  const hasEmployee = !!employee;
  const employeeName = employee?.full_name?.trim() || null;

  return (
    <Card className="relative overflow-hidden p-6">
      {canEdit && (
        <EditNameButton
          profileId={profile.id}
          currentFullname={fullname}
          employeeFullname={employeeName}
        />
      )}

      <div className="flex items-start gap-5">
        <Avatar className="size-16 shrink-0 ring-2 ring-background ring-offset-2 ring-offset-muted/40">
          {avatar ? <AvatarImage src={avatar} alt={fullname ?? 'Usuario'} /> : null}
          <AvatarFallback className="bg-muted text-base font-medium text-muted-foreground">
            {getInitials(fullname)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1 pr-20">
            {fullname ? (
              <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">{fullname}</h2>
            ) : (
              <h2 className="truncate text-xl font-normal italic tracking-tight text-muted-foreground">Sin nombre</h2>
            )}

            {email ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{email}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                <span className="italic">Sin email</span>
              </div>
            )}
          </div>

          {hasEmployee ? (
            <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2.5">
              <Briefcase className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="flex min-w-0 flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Empleado vinculado
                </span>
                <div className="flex items-baseline gap-1.5 truncate text-sm">
                  <span className="font-mono text-xs text-muted-foreground">[{employee.file}]</span>
                  <span className="truncate font-medium text-foreground">{employeeName ?? 'Sin nombre'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-2.5 rounded-md border border-dashed border-border/60 px-3 py-2"
              role="status"
            >
              <Unlink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm italic text-muted-foreground">Sin empleado vinculado</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
