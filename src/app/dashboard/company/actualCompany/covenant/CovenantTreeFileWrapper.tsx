import { getGuildsWithCovenants } from '@/shared/actions/covenant-actions';
import { formatGuildsData } from '@/shared/utils/utils';
import CovenantTreeFile from './CovenantTreeFile';

async function CovenantTreeFileWrapper() {
  const guilds = await getGuildsWithCovenants();
  const formattedData = formatGuildsData(guilds);
  return <CovenantTreeFile formattedData={formattedData} />;
}

export default CovenantTreeFileWrapper;
