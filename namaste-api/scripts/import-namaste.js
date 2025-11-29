import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Import NAMASTE codes from JSON files into PostgreSQL
 * Functional approach - script to seed database
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_DATA_DIR = join(__dirname, '../../');
console.log(BACKEND_DATA_DIR);

// Create PostgreSQL pool and Prisma client with adapter
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Load JSON file
 */
const loadJson = (filePath) => {
  if (!existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

/**
 * Map system string to enum
 */
const mapSystem = (system) => {
  const systemMap = {
    'ayurveda': 'AYURVEDA',
    'siddha': 'SIDDHA',
    'unani': 'UNANI',
  };
  return systemMap[system.toLowerCase()] || 'AYURVEDA';
};

/**
 * Import codes for a specific system
 */
const importSystem = async (system) => {
  const filePath = join(BACKEND_DATA_DIR, `${system}-codes.json`);
  const codes = loadJson(filePath);

  if (codes.length === 0) {
    console.log(`No codes found for ${system}`);
    return 0;
  }

  console.log(`Importing ${codes.length} ${system} codes...`);

  let imported = 0;
  let skipped = 0;

  for (const code of codes) {
    try {
      await prisma.namasteCode.upsert({
        where: {
          code_system: {
            code: code.code,
            system: mapSystem(code.system || system),
          },
        },
        update: {
          term: code.term || '',
          termNormalized: code.termNormalized || null,
          nativeScript: code.nativeScript || null,
          shortDefinition: code.shortDefinition || null,
          longDefinition: code.longDefinition || null,
          englishName: code.englishName || null,
          searchableText: code.searchableText || null,
          metadata: code.metadata || {},
        },
        create: {
          code: code.code,
          system: mapSystem(code.system || system),
          term: code.term || '',
          termNormalized: code.termNormalized || null,
          nativeScript: code.nativeScript || null,
          shortDefinition: code.shortDefinition || null,
          longDefinition: code.longDefinition || null,
          englishName: code.englishName || null,
          searchableText: code.searchableText || null,
          metadata: code.metadata || {},
        },
      });
      imported++;
    } catch (error) {
      console.error(`Failed to import ${code.code}: ${error.message}`);
      skipped++;
    }
  }

  console.log(`${system}: Imported ${imported}, Skipped ${skipped}`);
  return imported;
};

/**
 * Main import function
 */
const main = async () => {
  console.log('Starting NAMASTE codes import...\n');

  const systems = ['ayurveda', 'siddha', 'unani'];
  let totalImported = 0;

  for (const system of systems) {
    const count = await importSystem(system);
    totalImported += count;
  }

  console.log(`\nTotal imported: ${totalImported} codes`);

  // Print summary
  const counts = await prisma.namasteCode.groupBy({
    by: ['system'],
    _count: true,
  });

  console.log('\nDatabase summary:');
  for (const { system, _count } of counts) {
    console.log(`  ${system}: ${_count} codes`);
  }
};

main()
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

