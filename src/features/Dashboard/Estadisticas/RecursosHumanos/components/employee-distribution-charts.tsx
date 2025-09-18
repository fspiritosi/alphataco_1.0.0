import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEmployeesByContractType, getEmployeesByGenderAndPosition } from '../actions/actions';
import { EmployeeContractTypeChartComponent } from './charts/employee-contract-type-chart';
import { EmployeeGenderPositionChartComponent } from './charts/employee-gender-position-chart';

export default async function EmployeeDistributionCharts() {
  try {
    // Obtener datos de ambos gráficos en paralelo
    const [genderPositionData, contractTypeData] = await Promise.all([
      getEmployeesByGenderAndPosition(),
      getEmployeesByContractType(),
    ]);

    console.log(contractTypeData);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Género y Posición */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Empleados</CardTitle>
            <CardDescription>Visualización de empleados por género y posición en la empresa</CardDescription>
          </CardHeader>
          <CardContent className="h-full">
            <EmployeeGenderPositionChartComponent data={genderPositionData} />
          </CardContent>
        </Card>

        {/* Gráfico de Tipo de Contrato */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Contrato</CardTitle>
            <CardDescription>Distribución de empleados según su tipo de contrato</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeContractTypeChartComponent data={contractTypeData || []} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('Error loading employee distribution charts:', error);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Empleados</CardTitle>
            <CardDescription>Error al cargar los datos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Error al cargar los datos de distribución por género y posición
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipos de Contrato</CardTitle>
            <CardDescription>Error al cargar los datos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Error al cargar los datos de distribución por tipo de contrato
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
