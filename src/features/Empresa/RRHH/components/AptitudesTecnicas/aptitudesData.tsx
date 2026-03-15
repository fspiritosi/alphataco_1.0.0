import { Logger } from '@/lib/logger';
import { getAptitudesData as fetchAptitudesData } from '../../actions/rrhh/aptitudesTecnicas';

export type { AptitudTecnica } from '../../actions/rrhh/aptitudesTecnicas';

const logger = new Logger('features/Empresa/RRHH');

/**
 * Obtiene tanto las aptitudes técnicas como los puestos en una sola llamada
 * Esta función es un wrapper alrededor de la función del servidor
 */
export async function AptitudesData() {
  try {
    return await fetchAptitudesData();
  } catch (error) {
    logger.error('Error al obtener los datos de aptitudes y puestos', { data: { error } });
    return { aptitudes: [], positions: [] };
  }
}
