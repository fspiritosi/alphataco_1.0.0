import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import {
  getDocumentCompanyById,
  getDocumentEmployeesById,
  getDocumentEquipmentById,
} from '@/features/Documentacion/shared/actions/document-actions';
import DeleteDocument from '@/features/Documentacion/shared/components/DeleteDocument';
import DownloadButton from '@/features/Documentacion/shared/components/DownloadButton';
import ReplaceDocument from '@/features/Documentacion/shared/components/ReplaceDocument';
import UpdateDocuments from '@/features/Documentacion/shared/components/UpdateDocuments';
import { checkPermissionServer, getUserPermissionsMapServer } from '@/features/Permissions';
import { TabsManagerServer } from '@/features/TabsManager';
import { supabaseServer } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import BackButton from '@/shared/components/common/BackButton';
import { Building2, FileText, User, Wrench } from 'lucide-react';
import moment from 'moment';
import { Suspense } from 'react';

// Tipo auxiliar para los datos del documento (las 3 tablas tienen forma similar)
type DocumentRecord = {
  id: string;
  document_path?: string | null;
  state?: string | null;
  deny_reason?: string | null;
  validity?: string | null;
  period?: string | null;
  created_at?: string | null;
  document_types?: {
    id?: string;
    name?: string;
    mandatory?: boolean;
    multiresource?: boolean;
    explired?: boolean;
    is_it_montlhy?: boolean;
    applies?: string;
    special?: boolean;
    description?: string;
  } | null;
  // Solo para company docs
  company?: {
    company_name?: string;
    company_cuit?: string;
    company_logo?: string;
    address?: string;
    country?: string;
    contact_phone?: string;
    contact_email?: string;
    province_id?: { name?: string } | null;
  } | null;
  // Solo para employee/equipment docs (estructura anidada de Supabase)
  applies?: Record<string, unknown> | null;
};

export default async function page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resource: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  let resource = '';
  let doc: DocumentRecord | null = null;
  const supabase = await supabaseServer();

  // Cargar datos según tipo de recurso
  if (resolvedSearchParams.resource === 'Persona') {
    const result = await getDocumentEmployeesById(resolvedParams.id);
    doc = (result?.[0] ?? null) as unknown as DocumentRecord | null;
    resource = 'employee';
  } else if (resolvedSearchParams.resource === 'Equipos') {
    const result = await getDocumentEquipmentById(resolvedParams.id);
    doc = (result?.[0] ?? null) as unknown as DocumentRecord | null;
    resource = 'vehicle';
  } else if (resolvedSearchParams.resource === 'Empresa') {
    const result = await getDocumentCompanyById(resolvedParams.id);
    doc = (result?.[0] ?? null) as unknown as DocumentRecord | null;
    resource = 'company';
  } else {
    // Fallback: buscar en las 3 tablas si no se especifica resource
    const [empDoc, eqDoc, compDoc] = await Promise.all([
      getDocumentEmployeesById(resolvedParams.id),
      getDocumentEquipmentById(resolvedParams.id),
      getDocumentCompanyById(resolvedParams.id),
    ]);
    if (empDoc && empDoc.length > 0) {
      doc = empDoc[0] as unknown as DocumentRecord;
      resource = 'employee';
    } else if (eqDoc && eqDoc.length > 0) {
      doc = eqDoc[0] as unknown as DocumentRecord;
      resource = 'vehicle';
    } else if (compDoc && compDoc.length > 0) {
      doc = compDoc[0] as unknown as DocumentRecord;
      resource = 'company';
    }
  }

  const documentName = doc?.document_path ?? '';
  const { data: url } = supabase.storage.from('document-files').getPublicUrl(documentName);
  const documentUrl = url.publicUrl;
  const docTypes = doc?.document_types;
  const isCompanyDoc = resource === 'company';

  // Obtener permisos
  const permissions = await getUserPermissionsMapServer();
  const canView = await checkPermissionServer('documentacion', 'detalle-de-documento', 'view');
  const canUpdate = await checkPermissionServer('documentacion', 'detalle-de-documento', 'update');

  if (!canView) {
    return (
      <section className="md:mx-2">
        <Card className="p-4">
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground font-medium">Sin acceso</p>
              <p className="text-sm text-muted-foreground">No tienes permisos para ver esta sección.</p>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  const searchParamsObj = resolvedSearchParams;
  const tabs = [];

  // ========================================================================
  // Tab Empresa
  // ========================================================================
  if (isCompanyDoc) {
    // Documentos de empresa: mostrar datos de la empresa directamente (relación company)
    const companyData = doc?.company;
    tabs.push({
      value: 'Empresa',
      label: (
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresa
        </span>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'detalle-doc-empresa' as const,
      content: (
        <Card>
          <div className="space-y-3 p-3">
            <CardDescription>Datos de la empresa a la que pertenece este documento</CardDescription>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="size-24">
                      <AvatarImage
                        src={companyData?.company_logo}
                        alt="Logo de la empresa"
                        className="rounded-full object-contain"
                      />
                      <AvatarFallback>Logo</AvatarFallback>
                    </Avatar>
                    <CardTitle className="font-bold text-lg">{companyData?.company_name}</CardTitle>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">CUIT:</span>{' '}
                      {companyData?.company_cuit?.replace(/(\d{2})(\d{8})(\d{1})/, '$1-$2-$3')}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                {companyData?.address && (
                  <TableRow>
                    <TableCell>
                      <CardDescription className="capitalize">
                        <span className="font-bold">Dirección:</span> {companyData.address}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {companyData?.country && (
                  <TableRow>
                    <TableCell>
                      <CardDescription className="capitalize">
                        <span className="font-bold">País:</span> {companyData.country}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {companyData?.province_id?.name && (
                  <TableRow>
                    <TableCell>
                      <CardDescription className="capitalize">
                        <span className="font-bold">Provincia:</span> {companyData.province_id.name}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {companyData?.contact_phone && (
                  <TableRow>
                    <TableCell>
                      <CardDescription>
                        <span className="font-bold">Teléfono de contacto:</span> {companyData.contact_phone}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {companyData?.contact_email && (
                  <TableRow>
                    <TableCell>
                      <CardDescription>
                        <span className="font-bold">Email de contacto:</span> {companyData.contact_email}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ),
    });
  } else {
    // Documentos de empleado/equipo: mostrar empresa del recurso (applies.company_id)
    const appliesCompany = (doc?.applies as Record<string, unknown>)?.company_id as Record<string, unknown> | undefined;
    tabs.push({
      value: 'Empresa',
      label: (
        <span className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresa
        </span>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'detalle-doc-empresa' as const,
      content: (
        <Card>
          <div className="space-y-3 p-3">
            <CardDescription>Datos de la empresa que solicita el documento</CardDescription>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="size-24">
                      <AvatarImage
                        src={appliesCompany?.company_logo as string}
                        alt="Logo de la empresa"
                        className="rounded-full object-contain"
                      />
                      <AvatarFallback>Logo</AvatarFallback>
                    </Avatar>
                    <CardTitle className="font-bold text-lg">{appliesCompany?.company_name as string}</CardTitle>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">CUIT:</span>{' '}
                      {(appliesCompany?.company_cuit as string)?.replace(/(\d{2})(\d{8})(\d{1})/, '$1-$2-$3')}
                    </CardDescription>
                  </TableCell>
                </TableRow>
                {String(appliesCompany?.address ?? '') && (
                  <TableRow>
                    <TableCell>
                      <CardDescription className="capitalize">
                        <span className="font-bold capitalize">Dirección:</span> {String(appliesCompany?.address ?? '')}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {String(appliesCompany?.country ?? '') && (
                  <TableRow>
                    <TableCell>
                      <CardDescription className="capitalize">
                        <span className="font-bold">País:</span> {String(appliesCompany?.country ?? '')}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {Boolean((appliesCompany?.province_id as Record<string, unknown> | undefined)?.name) && (
                  <TableRow>
                    <TableCell>
                      <CardDescription className="capitalize">
                        <span className="font-bold">Provincia:</span>{' '}
                        {String((appliesCompany?.province_id as Record<string, unknown> | undefined)?.name ?? '')}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {String(appliesCompany?.contact_phone ?? '') && (
                  <TableRow>
                    <TableCell>
                      <CardDescription>
                        <span className="font-bold">Teléfono de contacto:</span>{' '}
                        {String(appliesCompany?.contact_phone ?? '')}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {String(appliesCompany?.contact_email ?? '') && (
                  <TableRow>
                    <TableCell>
                      <CardDescription>
                        <span className="font-bold">Email de contacto:</span>{' '}
                        {String(appliesCompany?.contact_email ?? '')}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {Boolean((doc?.applies as Record<string, unknown> | undefined)?.date_of_admission) && (
                  <TableRow>
                    <TableCell>
                      <CardDescription>
                        <span className="font-bold">Fecha de alta:</span>{' '}
                        {moment(
                          String((doc?.applies as Record<string, unknown> | undefined)?.date_of_admission ?? '')
                        ).format('DD/MM/YYYY')}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
                {String(appliesCompany?.description ?? '') && (
                  <TableRow>
                    <TableCell>
                      <CardDescription className="capitalize">
                        <span className="font-bold">Descripción:</span> {String(appliesCompany?.description ?? '')}
                      </CardDescription>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ),
    });
  }

  // ========================================================================
  // Tab Empleado/Equipo (solo para empleados y equipos, NO para empresa)
  // ========================================================================
  if (!isCompanyDoc) {
    const appliesData = doc?.applies as Record<string, unknown> | undefined;

    tabs.push({
      value: 'Empleado',
      label: (
        <span className="flex items-center gap-2">
          <User className="h-4 w-4" />
          {resource === 'employee' ? 'Empleado' : 'Equipo'}
        </span>
      ),
      moduleSlug: 'documentacion' as const,
      tabSlug: 'detalle-doc-empleado' as const,
      content: (
        <Card>
          <div className="p-3">
            <div className="space-y-3">
              <CardDescription>
                Datos del {resource === 'employee' ? 'empleado' : 'equipo'} al que se le solicita el documento
              </CardDescription>
              <div className="flex items-center gap-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="size-24">
                          <AvatarImage
                            src={appliesData?.picture as string}
                            className="rounded-full object-cover"
                            alt="Imagen del recurso"
                          />
                          <AvatarFallback>recurso</AvatarFallback>
                        </Avatar>
                        <CardTitle className="font-bold text-lg">
                          {resource === 'employee'
                            ? (appliesData?.lastname as string) + ' ' + (appliesData?.firstname as string)
                            : (appliesData?.domain as string) || (appliesData?.intern_number as string)}
                        </CardTitle>
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <CardDescription>
                          {resource === 'employee' ? (
                            <>
                              <span className="font-bold">DNI:</span> {appliesData?.document_number as string}
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Dominio:</span> {appliesData?.domain as string}
                            </>
                          )}
                        </CardDescription>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <CardDescription>
                          {resource === 'employee' ? (
                            <>
                              <span className="font-bold">CUIL:</span>{' '}
                              {(appliesData?.cuil as string)?.replace(/(\d{2})(\d{8})(\d{1})/, '$1-$2-$3')}
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Numero interno:</span> {appliesData?.intern_number as string}
                            </>
                          )}
                        </CardDescription>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <CardDescription>
                          {resource === 'employee' ? (
                            <>
                              <span className="font-bold">Dirección:</span>{' '}
                              {(appliesData?.street as string) +
                                ' ' +
                                (appliesData?.street_number as string) +
                                ', ' +
                                ((appliesData?.city as Record<string, unknown>)?.name as string)}
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Marca:</span>{' '}
                              {(appliesData?.brand as Record<string, unknown>)?.name as string}
                            </>
                          )}
                        </CardDescription>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <CardDescription>
                          {resource === 'employee' ? (
                            <>
                              <span className="font-bold">Provincia:</span>{' '}
                              {(appliesData?.province as Record<string, unknown>)?.name as string}
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Modelo:</span>{' '}
                              {(appliesData?.model as Record<string, unknown>)?.name as string}
                            </>
                          )}
                        </CardDescription>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <CardDescription>
                          {resource === 'employee' ? (
                            <>
                              <span className="font-bold">Teléfono de contacto:</span> {appliesData?.phone as string}
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Fecha de alta:</span>{' '}
                              {appliesData?.created_at && moment(appliesData.created_at as string).format('DD/MM/YYYY')}
                            </>
                          )}
                        </CardDescription>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <CardDescription>
                          {resource === 'employee' ? (
                            <>
                              <span className="font-bold">Email de contacto:</span> {appliesData?.email as string}
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Motor:</span> {appliesData?.engine as string}
                            </>
                          )}
                        </CardDescription>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <CardDescription>
                          {resource === 'employee' ? (
                            <>
                              <span className="font-bold">Fecha de alta:</span>{' '}
                              {appliesData?.created_at && moment(appliesData.created_at as string).format('DD/MM/YYYY')}
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Chasis:</span> {appliesData?.chassis as string}
                            </>
                          )}
                        </CardDescription>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div>
                          {resource === 'employee' ? (
                            <>
                              <CardDescription>
                                <span className="font-bold">Afectaciones:</span>
                              </CardDescription>
                              <ul>
                                <CardDescription>
                                  {(appliesData?.contractor_employee as Record<string, unknown>[])?.map(
                                    (contractor: Record<string, unknown>) => {
                                      const customers = contractor?.contractors as Record<string, unknown>;
                                      return <li key={customers?.name as string}>{customers?.name as string}</li>;
                                    }
                                  )}
                                </CardDescription>
                              </ul>
                            </>
                          ) : (
                            <>
                              <CardDescription>
                                <span className="font-bold">Tipo de vehiculo:</span>{' '}
                                {(appliesData?.type_of_vehicle as Record<string, unknown>)?.name as string}
                              </CardDescription>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </Card>
      ),
    });
  }

  // ========================================================================
  // Tab Documento
  // ========================================================================
  tabs.push({
    value: 'Documento',
    label: (
      <span className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Documento
      </span>
    ),
    moduleSlug: 'documentacion' as const,
    tabSlug: 'detalle-doc-documento' as const,
    content: (
      <Card>
        <div className="p-3">
          <CardTitle className="pb-3">
            {isCompanyDoc ? 'Datos del documento de empresa' : 'Datos del documento que se le solicita al empleado'}
          </CardTitle>

          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>
                  <CardTitle className="pb-3">{docTypes?.name}</CardTitle>
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <CardDescription>{docTypes?.mandatory ? 'Es mandatorio' : 'No es mandatorio'}</CardDescription>
                </TableCell>
              </TableRow>
              {!isCompanyDoc && (
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      {docTypes?.multiresource ? 'Es multirecurso' : 'No es multirecurso'}
                    </CardDescription>
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>
                  <CardDescription>
                    {docTypes?.explired
                      ? 'Vence el ' + moment(doc?.validity).format('DD/MM/YYYY')
                      : 'No tiene vencimiento'}
                  </CardDescription>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <CardDescription>Documento aplica a {docTypes?.applies}</CardDescription>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <CardDescription>
                    Subido el {doc?.created_at && moment(doc.created_at).format('DD/MM/YYYY')} a las{' '}
                    {doc?.created_at && moment(doc.created_at).format('HH:mm')}
                  </CardDescription>
                </TableCell>
              </TableRow>
              {doc?.period && (
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      <span className="font-bold">Período:</span> {doc.period}
                    </CardDescription>
                  </TableCell>
                </TableRow>
              )}
              {docTypes?.special && (
                <TableRow>
                  <TableCell>
                    <CardDescription>
                      Este documento tiene consideraciones especiales a tener en cuenta ({docTypes?.description})
                    </CardDescription>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    ),
  });

  // ========================================================================
  // Tab Actualizar (solo si tiene permiso de update)
  // ========================================================================
  if (canUpdate) {
    tabs.push({
      value: 'Actualizar',
      label: (
        <span className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Actualizar
        </span>
      ),
      content: (
        <Card>
          <div className="p-3 text-center space-y-3">
            <CardDescription>
              Si el documento es rechazado, vencido o necesita ser actualizado puedes hacerlo desde aquí, una vez
              aprobado el documento no podrá ser modificado
            </CardDescription>
            <div className="w-full flex justify-evenly flex-wrap">
              <UpdateDocuments
                id={resolvedParams.id}
                resource={resource}
                documentName={documentName}
                expires={docTypes?.explired ?? false}
                montly={docTypes?.is_it_montlhy ?? false}
              />
              <ReplaceDocument
                id={resolvedParams.id}
                resource={resource}
                documentName={documentName}
                expires={doc?.validity ?? null}
                montly={doc?.period ?? null}
                appliesId={doc?.id ?? null}
              />
              <DeleteDocument
                id={resolvedParams.id}
                resource={resource}
                documentName={documentName}
                expires={docTypes?.explired ?? false}
              />
            </div>
          </div>
        </Card>
      ),
    });
  }

  return (
    <section className="md:mx-2">
      <Card className="p-4 px-2">
        <div className="grid lg:grid-cols-3 grid-cols-1 gap-col-3">
          <div className="lg:max-w-[30vw] col-span-1">
            <div className="flex flex-col">
              <div>
                <CardHeader>
                  <CardTitle className="text-2xl">{docTypes?.name}</CardTitle>

                  {doc?.state && (
                    <div className="flex flex-col">
                      <Badge
                        variant={
                          doc.state === 'rechazado'
                            ? 'destructive'
                            : doc.state === 'aprobado'
                              ? 'success'
                              : doc.state === 'vencido'
                                ? 'yellow'
                                : 'default'
                        }
                        className="mb-3 capitalize w-fit"
                      >
                        {doc.state}
                      </Badge>
                      {doc.deny_reason && (
                        <Badge
                          variant={
                            doc.state === 'rechazado' || doc.state === 'vencido'
                              ? 'destructive'
                              : doc.state === 'aprobado'
                                ? 'success'
                                : 'default'
                          }
                          className="mb-3 capitalize w-fit"
                        >
                          {doc.deny_reason}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
              </div>
              <div className="flex justify-between mb-5 px-2">
                <DownloadButton fileName={docTypes?.name ?? ''} path={documentName} />
                <BackButton />
              </div>
            </div>
            <div className="w-full px-2">
              <TabsManagerServer
                paramName="tab"
                searchParams={searchParamsObj}
                defaultTab="Documento"
                permissions={permissions}
                tabs={tabs}
              />
            </div>
          </div>
          <Suspense fallback={<Skeleton className="w-full h-full mt-5" />}>
            <div className="max-w-[70vw] col-span-2 px-7 pb-7">
              <Card className="mt-4">
                <CardDescription className="p-3 flex justify-center">
                  <embed
                    src={`${documentUrl}#&navpanes=0&scrollbar=0&zoom=110`}
                    className={cn(
                      'max-w-full max-h-screen rounded-xl aspect-auto',
                      documentUrl.split('.').pop()?.toLocaleLowerCase() === 'pdf' ? 'w-full min-h-screen' : ''
                    )}
                  />
                </CardDescription>
              </Card>
            </div>
          </Suspense>
        </div>
      </Card>
    </section>
  );
}
