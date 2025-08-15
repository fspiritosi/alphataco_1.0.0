import { ReportAnIssue } from '@/components/ReportAnIssue';

export const metadata = {
  title: 'Ayuda | GH Gestión',
  description: 'Página de ayuda de GH Gestión con información general, comercial, HR y equipos',
};
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
