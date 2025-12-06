import { ReportAnIssue } from '@/components/ReportAnIssue';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import { cookies } from 'next/headers';

export async function generateMetadata() {
  const cookiesStore = await cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Ayuda | ${companyName}`,
      description: `Página de ayuda de ${companyName} con información general, comercial, HR y equipos`,
    };
  } else {
    const companyName = await getCompanyName();
    if (companyName) {
      return {
        title: `Ayuda | ${companyName.company_name}`,
        description: `Página de ayuda de ${companyName.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}
export default function page() {
  //  return <VehicleInspectionForm />;
  return <ReportAnIssue />;
  // return (
  //   <Viewcomponent
  //     viewData={
  //       {
  //         defaulValue: "general",
  //         tabsValues:[
  //           {
  //             value: "general",
  //             name:"General",
  //             restricted: ["usuario"],
  //             content:{
  //               title: "Empresa",
  //               description: "Datos generales de la compañía",
  //               component: <div>Hola Yordan</div>,
  //             }
  //           },
  //           {
  //             value: "documents",
  //             name:"Documentacion",
  //             restricted: [] ,
  //             content:{
  //             title: "Documentación",
  //             description: "Documentos generales de la compañía",
  //             component: <TypesDocumentsView equipos personas />,
  //           }},
  //           {
  //             value: "clients",
  //             name:"Clientes",
  //             restricted: [] ,
  //             content:{
  //             title: "Clientes",
  //             description: "Documentos generales de la Clientes",
  //             component: <Customers />,

  //           }},
  //         ]
  //       }
  //     }
  //   />
  // )
}
