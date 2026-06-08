import { query, closePool } from '../db';

async function listSpecies() {
  try {
    const res = await query("SELECT id, data->>'scientific_name' as sci, data->'common_names'->>'en' as common FROM knowledge_nodes WHERE node_type = 'SPECIES'");
    console.log(JSON.stringify(res.rows, null, 2));
    await closePool();
  } catch (err) {
    console.error(err);
  }
}

listSpecies();
