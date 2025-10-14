'use client';

import { setNewCompanyUserMetadata } from '@/app/server/GET/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Dialog } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CaretSortIcon, CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import Cookies from 'js-cookie';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CompanySelectorProps } from '../../types/navbar.types';

export function _CompanySelector({ sharedCompanies, allCompanies, currentCompany }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(
    currentCompany?.[0] || allCompanies[0] || null
  );

  // Si no hay compañía seleccionada y hay compañías disponibles, seleccionar la primera
  useEffect(() => {
    const actualCompany = Cookies.get('actualComp');
    setNewCompanyUserMetadata(actualCompany || '');

    console.log(actualCompany === 'undefined', 'actualCompany === undefined');

    if ((!actualCompany || actualCompany === 'undefined') && (allCompanies[0]?.id || sharedCompanies[0]?.id)) {
      console.log('Entre al if', allCompanies[0]?.id || sharedCompanies[0]?.id);
      Cookies.set('actualComp', allCompanies[0]?.id || sharedCompanies[0]?.id);
      Cookies.set('actualCompName', allCompanies[0]?.company_name || sharedCompanies[0]?.company_name);
      if (actualCompany === 'undefined') {
        console.log('deberia recargar');
      }
    }

    // if (!selectedCompany && (allCompanies?.length > 0 || sharedCompanies?.length > 0)) {
    //   const firstCompany = allCompanies[0] || sharedCompanies[0];
    //   setSelectedCompany(firstCompany);
    //   Cookies.set('actualComp', firstCompany.id);
    //   handleNewCompany(firstCompany);
    // }
  }, [allCompanies, sharedCompanies, currentCompany]);

  const totalCompanies = [...sharedCompanies, ...allCompanies];

  const handleNewCompany = async (company: Company) => {
    if (company.id) {
      Cookies.set('actualComp', company.id);
      Cookies.set('actualCompName', company.company_name);
      await setNewCompanyUserMetadata(company.id);
      setSelectedCompany(company);
      setOpen(false);
      location.reload();
    }
  };

  const groups = [
    {
      label: 'Compañia actual',
      teams:
        totalCompanies?.length === 1
          ? totalCompanies?.map((company) => ({
              label: company?.company_name,
              value: company?.id,
              logo: company?.company_logo,
            }))
          : totalCompanies
              ?.filter((company) => company?.id === selectedCompany?.id)
              ?.map((company) => ({
                label: company?.company_name,
                value: company?.id,
                logo: company?.company_logo,
              })),
    },
    {
      label: 'Otras compañias',
      teams:
        totalCompanies?.length === 1
          ? []
          : totalCompanies
              ?.filter((company) => company?.id !== selectedCompany?.id)
              ?.map((company) => ({
                label: company?.company_name,
                value: company?.id,
                logo: company?.company_logo,
              })),
    },
  ];

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild className="text-black dark:text-white">
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Selecciona una compañía"
            className="min-w-[200px] justify-between"
          >
            <Avatar className="mr-2 size-5">
              <AvatarImage
                src={selectedCompany?.company_logo || ''}
                alt={selectedCompany?.company_name}
                className="size-5 object-contain"
              />
              <AvatarFallback className="bg-primary/10">
                <Building2 className="size-4 text-primary" />
              </AvatarFallback>
            </Avatar>
            {selectedCompany ? (
              <span className="uppercase">{selectedCompany.company_name}</span>
            ) : (
              <span className="text-muted-foreground">Seleccionar compañía</span>
            )}
            <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Buscar compañia" />
              <CommandEmpty>Compañia no encontrada</CommandEmpty>
              {groups?.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group?.teams?.map((team) => (
                    <CommandItem
                      key={team.value}
                      onSelect={() => {
                        const company = totalCompanies.find((c) => c?.id === team?.value);
                        if (company) {
                          handleNewCompany(company);
                        }
                        setOpen(false);
                      }}
                      className="text-sm"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage src={team.logo || ''} alt={team.label} className="size-5 object-contain" />
                        <AvatarFallback className="bg-primary/10">
                          <Building2 className="size-3 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                      {team.label}
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          selectedCompany?.id === team.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <CommandSeparator />
            <div className="p-2 w-full">
              <Link
                href="/dashboard/company/new"
                className={cn(buttonVariants({ variant: 'outline' }), 'flex justify-center p-4 w-full')}
              >
                <PlusCircledIcon className="mr-2 scale-[3]" />
                Agregar compañía
              </Link>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </Dialog>
  );
}
