import { getGuildsWithCovenants } from '../actions/guilds.server';
import { buildCovenantTree } from '../lib/covenant-tree';
import CovenantTreeFile from './CovenantTreeFile';

/** Árbol CCT de la empresa activa (sindicato → convenio → categoría). */
async function CovenantTreeFileWrapper() {
  const guilds = await getGuildsWithCovenants();
  return <CovenantTreeFile tree={buildCovenantTree(guilds)} />;
}

export default CovenantTreeFileWrapper;
