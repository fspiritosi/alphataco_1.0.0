// ⚠️ ARCHIVO NO UTILIZADO - Comentado para posible eliminación futura
// Este componente fue reemplazado por RrhhTabContent.tsx
// No se encontraron imports de este archivo en el proyecto

// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { cookies } from 'next/headers';
// import ContractTypesTab from './TypeContract/ContractTypeTab';
// import { fetchAllContractTypesIncludesInactive } from './TypeContract/actions/actions';

// type ContractType = {
//   id: string;
//   name: string;
//   description: string;
//   is_active: boolean;
// };

// interface RecursoHumanosProps {
//   company_id: string;
//   contractTypes?: ContractType[];
// }

// export default async function RecursoHumanos({ company_id, contractTypes = [] }: RecursoHumanosProps) {
//   const allContractTypes = await fetchAllContractTypesIncludesInactive();
//   const cookiesStore = cookies();
//   const savedVisibility = cookiesStore.get('contract-type-table')?.value;
//   const savedFilter = cookiesStore.get('contract-type-table-filters')?.value;
//   return (
//     <div className=" ">
//       <Tabs defaultValue="contract-types" className="w-full">
//         <TabsList className="mb-2 bg-gh_orange">
//           <TabsTrigger value="contract-types">Tipos de Contrato</TabsTrigger>
//         </TabsList>

//         <TabsContent value="contract-types"  >
//           <ContractTypesTab
//             savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
//             allContractTypes={allContractTypes}
//             savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
//           />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

export {}; // Para mantener el archivo como módulo válido
