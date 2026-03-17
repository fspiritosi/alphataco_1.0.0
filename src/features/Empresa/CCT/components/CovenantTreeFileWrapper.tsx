import { getGuildsWithCovenants } from '@/shared/actions/covenant-actions';
import { getCachedSession } from '@/shared/lib/cached-session';
import { formatGuildsData } from '@/shared/utils/utils';
import CovenantTreeFile from './CovenantTreeFile';

async function CovenantTreeFileWrapper() {
  const [guilds, session] = await Promise.all([getGuildsWithCovenants(), getCachedSession()]);
  const companyId = session?.user?.app_metadata?.company as string | undefined;
  const formattedData = formatGuildsData(guilds);
  return <CovenantTreeFile formattedData={formattedData} companyId={companyId} />;
}

export default CovenantTreeFileWrapper;
