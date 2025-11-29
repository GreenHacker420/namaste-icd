import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { getAccessToken, icdApiRequest } from '../src/services/icd11-api.js';

/**
 * Fetch TM2 codes from WHO ICD-11 API
 * 
 * ICD-11 API Structure:
 * - Foundation: /icd/entity/{entityId} - All entities, multiple parents allowed
 * - Linearization (MMS): /icd/release/11/{releaseId}/mms/{entityId} - Tabular list
 * - Search: /icd/release/11/{releaseId}/mms/search?q={query}
 * 
 * Chapter 26 (Traditional Medicine) entity IDs:
 * - Module I (TM1): SA00-SJ1Z - Chinese/Japanese/Korean medicine
 * - Module II (TM2): SK00-ST2Z - AYUSH-compatible disorders
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data/tm2');

// Create PostgreSQL pool and Prisma client with adapter
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// TM2 code prefixes for searching
const TM2_PREFIXES = ['SK', 'SL', 'SM', 'SN', 'SP', 'SQ', 'SR', 'SS', 'ST'];

/**
 * Fetch entity details from ICD-11 API
 */
const fetchEntity = async (uri) => {
  try {
    const path = uri.replace('https://id.who.int', '');
    return await icdApiRequest(path);
  } catch (error) {
    console.warn(`Failed to fetch ${uri}: ${error.message}`);
    return null;
  }
};

/**
 * Extract TM2 code from entity
 */
const extractCode = (entity) => {
  // Try to extract code from theCode property or title
  if (entity.theCode) {
    return entity.theCode;
  }
  
  // Try to extract from title (e.g., "SK00 Cephalalgia disorder (TM2)")
  const match = entity.title?.['@value']?.match(/^([A-Z]{2}\d{2}[A-Z0-9]*)/);
  return match ? match[1] : null;
};

/**
 * Parse entity to database format
 */
const parseEntity = (entity) => {
  const code = extractCode(entity);
  if (!code) return null;

  const title = entity.title?.['@value'] || '';
  const definition = entity.definition?.['@value'] || '';
  
  // Extract synonyms from synonym array
  const synonyms = entity.synonym?.map(s => s.label?.['@value']).filter(Boolean) || [];
  
  // Extract inclusions and exclusions
  const inclusions = entity.inclusion?.map(i => i.label?.['@value']).filter(Boolean) || [];
  const exclusions = entity.exclusion?.map(e => e.label?.['@value']).filter(Boolean) || [];

  // Determine category from code range
  const category = getCategoryFromCode(code);

  return {
    code,
    title: title.replace(/\s*\(TM2\)\s*$/, '').trim(),
    definition,
    category,
    parentCode: entity.parent?.[0]?.split('/').pop() || null,
    synonyms,
    inclusions,
    exclusions,
    traditionalSystems: extractTraditionalSystems(entity),
    metadata: {
      uri: entity['@id'],
      browserUrl: entity.browserUrl,
    },
  };
};

/**
 * Get category from TM2 code
 */
const getCategoryFromCode = (code) => {
  const categories = {
    'SK0': 'Headache disorders',
    'SK1': 'Dizziness disorders',
    'SK2': 'Stroke disorders',
    'SK3': 'Seizure disorders',
    'SK4': 'Movement disorders',
    'SK5': 'Paralysis disorders',
    'SK6': 'Eye disorders',
    'SK7': 'Ear disorders',
    'SK8': 'Nose disorders',
    'SK9': 'Throat disorders',
    'SL0': 'Neck disorders',
    'SL1': 'Mouth disorders',
    'SL2': 'Voice disorders',
    'SL4': 'Respiratory disorders',
    'SL6': 'Heart disorders',
    'SL7': 'Blood disorders',
    'SL8': 'Circulatory disorders',
    'SM0': 'Vascular disorders',
    'SM1': 'Oral cavity disorders',
    'SM2': 'Oesophagus disorders',
    'SM3': 'Stomach disorders',
    'SM4': 'Intestinal disorders',
    'SM5': 'Liver disorders',
    'SM6': 'Gallbladder disorders',
    'SM7': 'Anorectal disorders',
    'SM8': 'Urinary disorders',
    'SM9': 'Male reproductive disorders',
    'SN0': 'Female reproductive disorders',
    'SN1': 'Pregnancy disorders',
    'SN2': 'Postpartum disorders',
    'SN3': 'Breast disorders',
    'SN4': 'Skin disorders',
    'SN5': 'Hair disorders',
    'SN6': 'Nail disorders',
    'SP0': 'Bone disorders',
    'SP1': 'Joint disorders',
    'SP2': 'Muscle disorders',
    'SP3': 'Back disorders',
    'SP4': 'Limb disorders',
    'SP5': 'Fever disorders',
    'SP6': 'Pain disorders',
    'SP7': 'Fatigue disorders',
    'SP8': 'Metabolic disorders',
    'SP9': 'Immune disorders',
    'SQ0': 'Sleep disorders',
    'SQ1': 'Anxiety disorders',
    'SQ2': 'Mood disorders',
    'SQ3': 'Cognitive disorders',
    'SQ4': 'Behavioral disorders',
    'SQ5': 'Trauma disorders',
    'SQ6': 'Poisoning disorders',
    'SQ7': 'Environmental disorders',
    'SQ8': 'Iatrogenic disorders',
    'SR0': 'Childhood disorders',
    'SS': 'Constitution patterns',
    'ST': 'Temperament patterns',
  };

  const prefix = code.substring(0, 3);
  return categories[prefix] || categories[code.substring(0, 2)] || 'Other';
};

/**
 * Extract traditional system terms from entity
 */
const extractTraditionalSystems = (entity) => {
  const systems = [];
  
  // Look for terms in different scripts
  const synonyms = entity.synonym || [];
  for (const syn of synonyms) {
    const label = syn.label?.['@value'] || '';
    // Check for Sanskrit (Devanagari), Tamil, or Arabic/Urdu terms
    if (/[\u0900-\u097F]/.test(label)) {
      systems.push({ system: 'ayurveda', term: label });
    } else if (/[\u0B80-\u0BFF]/.test(label)) {
      systems.push({ system: 'siddha', term: label });
    } else if (/[\u0600-\u06FF]/.test(label)) {
      systems.push({ system: 'unani', term: label });
    }
  }

  return systems;
};

/**
 * Recursively fetch all children of an entity
 */
const fetchChildren = async (parentUri, depth = 0, maxDepth = 3) => {
  if (depth > maxDepth) return [];

  const parent = await fetchEntity(parentUri);
  if (!parent || !parent.child) return [];

  const results = [];
  
  for (const childUri of parent.child) {
    const child = await fetchEntity(childUri);
    if (child) {
      const parsed = parseEntity(child);
      if (parsed) {
        results.push(parsed);
      }
      
      // Recursively fetch grandchildren
      if (child.child && child.child.length > 0) {
        const grandchildren = await fetchChildren(childUri, depth + 1, maxDepth);
        results.push(...grandchildren);
      }
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
};

/**
 * Search for TM2 codes using the search API
 * The search endpoint is: /icd/entity/search?q={query}
 */
const searchTm2Codes = async (query) => {
  try {
    // Use foundation search which has broader coverage
    const result = await icdApiRequest(`/icd/entity/search?q=${encodeURIComponent(query)}&useFlexisearch=true`);
    return result.destinationEntities || [];
  } catch (error) {
    console.warn(`Search failed for "${query}": ${error.message}`);
    return [];
  }
};

/**
 * Main fetch function
 */
const main = async () => {
  console.log('Fetching TM2 codes from WHO ICD-11 API...\n');

  try {
    // Test connection
    await getAccessToken();
    console.log('✓ Connected to ICD-11 API\n');

    // First, get the MMS root to list all chapters
    console.log('Fetching MMS root...');
    const mmsRoot = await icdApiRequest('/icd/release/11/mms');
    console.log(`MMS: ${mmsRoot.title?.['@value']}`);
    console.log(`Chapters: ${mmsRoot.child?.length || 0}\n`);

    const allCodes = [];

    // Method 1: Try to find Chapter 26 by iterating through chapters
    console.log('Looking for Chapter 26 (Traditional Medicine)...');
    
    if (mmsRoot.child) {
      for (let i = 0; i < mmsRoot.child.length; i++) {
        const chapterUri = mmsRoot.child[i];
        // Convert http to https and extract path
        const path = chapterUri.replace('http://id.who.int', '').replace('https://id.who.int', '');
        
        try {
          const chapter = await icdApiRequest(path);
          const title = chapter.title?.['@value'] || '';
          const code = chapter.code || chapter.codeRange || '';
          
          // Check if this is Chapter 26 (Traditional Medicine)
          if (title.toLowerCase().includes('traditional medicine') || 
              title.toLowerCase().includes('supplementary') ||
              code.startsWith('S')) {
            console.log(`\n✓ Found: ${title}`);
            console.log(`  Code range: ${code}`);
            console.log(`  Children: ${chapter.child?.length || 0}`);
            
            // Fetch all children recursively
            if (chapter.child) {
              for (const childUri of chapter.child) {
                const childPath = childUri.replace('http://id.who.int', '').replace('https://id.who.int', '');
                const codes = await fetchChildren(childPath, 0, 5);
                allCodes.push(...codes);
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
          } else {
            // Just log chapter name for progress
            if (i % 5 === 0) {
              console.log(`  Checked ${i + 1}/${mmsRoot.child.length} chapters...`);
            }
          }
          
          // Rate limiting between chapters
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`  Failed to fetch chapter: ${error.message}`);
        }
      }
    }

    // Method 2: If no codes found, try searching for TM2 codes directly
    if (allCodes.length === 0) {
      console.log('\nNo codes found via hierarchy. Trying search API...');
      
      // TM2 Module II Code Ranges (SK00-ST2Z) - ~495 codes total
      // Search by specific code prefixes and disorder categories
      const searchTerms = [
        // Main categories
        'TM2',
        'traditional medicine disorder',
        'traditional medicine pattern',
        // Head, brain, nerve disorders (SK00-SK5Z)
        'cephalalgia TM2',
        'headache disorder TM2',
        'migraine TM2',
        'dizziness disorder TM2',
        'vertigo TM2',
        'tremor disorder TM2',
        'paralysis TM2',
        'numbness TM2',
        'convulsion TM2',
        'epilepsy TM2',
        // Eye, ear, nose, throat (SK60-SL2Z)
        'eye disorder TM2',
        'ear disorder TM2',
        'tinnitus TM2',
        'deafness TM2',
        'nose disorder TM2',
        'rhinitis TM2',
        'epistaxis TM2',
        'throat disorder TM2',
        'pharyngitis TM2',
        'laryngitis TM2',
        'aphonia TM2',
        // Respiratory (SL40-SL4Z)
        'respiratory disorder TM2',
        'cough TM2',
        'asthma TM2',
        'dyspnea TM2',
        'bronchitis TM2',
        // Heart, blood, circulatory (SL60-SM0Z)
        'heart disorder TM2',
        'palpitation TM2',
        'chest pain TM2',
        'blood disorder TM2',
        'anemia TM2',
        'hemorrhage TM2',
        'hypertension TM2',
        // Gastro-intestinal (SM10-SM7Z)
        'digestive disorder TM2',
        'stomach disorder TM2',
        'gastritis TM2',
        'nausea TM2',
        'vomiting TM2',
        'diarrhea TM2',
        'constipation TM2',
        'abdominal pain TM2',
        'dyspepsia TM2',
        'intestinal disorder TM2',
        'liver disorder TM2',
        'jaundice TM2',
        'hepatitis TM2',
        'oral cavity TM2',
        'stomatitis TM2',
        'gingivitis TM2',
        // Urinary and reproductive (SM80-SN3Z)
        'urinary disorder TM2',
        'dysuria TM2',
        'incontinence TM2',
        'nephritis TM2',
        'reproductive disorder TM2',
        'menstrual disorder TM2',
        'amenorrhea TM2',
        'dysmenorrhea TM2',
        'leucorrhea TM2',
        'impotence TM2',
        'infertility TM2',
        // Skin, nail, hair (SN40-SN9Z)
        'skin disorder TM2',
        'eczema TM2',
        'urticaria TM2',
        'psoriasis TM2',
        'acne TM2',
        'pruritus TM2',
        'alopecia TM2',
        'vitiligo TM2',
        // Bone, joint, muscle (SP00-SP4Z)
        'bone disorder TM2',
        'joint disorder TM2',
        'arthritis TM2',
        'muscle disorder TM2',
        'myalgia TM2',
        'back pain TM2',
        'lumbago TM2',
        // Whole body disorders (SP50-SP9Z)
        'fatigue TM2',
        'fever TM2',
        'edema TM2',
        'obesity TM2',
        'emaciation TM2',
        'sweating disorder TM2',
        // Mental, emotional (SQ00-SQ4Z)
        'mental disorder TM2',
        'anxiety TM2',
        'depression TM2',
        'insomnia TM2',
        'emotional disorder TM2',
        'irritability TM2',
        // External factors (SQ50-SQ8Z)
        'external factor TM2',
        'trauma TM2',
        'poisoning TM2',
        // Childhood (SR00-SR0Z)
        'childhood disorder TM2',
        'pediatric TM2',
        // Patterns (SS00-ST2Z)
        'qi pattern',
        'qi deficiency',
        'qi stagnation',
        'blood pattern',
        'blood stasis',
        'blood deficiency',
        'phlegm pattern',
        'dampness pattern',
        'heat pattern',
        'cold pattern',
        'yin deficiency',
        'yang deficiency',
        'wind pattern',
        'fire pattern',
        'dryness pattern',
        'body constitution pattern',
        'temperament pattern',
      ];
      
      for (const term of searchTerms) {
        console.log(`Searching: "${term}"...`);
        const results = await searchTm2Codes(term);
        
        // Debug: Log first result structure
        if (results.length > 0 && term === searchTerms[0]) {
          console.log('  Sample result structure:', JSON.stringify(results[0], null, 2).substring(0, 500));
        }
        
        for (const entity of results) {
          const code = entity.theCode || entity.code || '';
          let title = entity.title || entity.Title || '';
          const chapter = entity.chapter || entity.Chapter || '';
          
          // Clean HTML from title
          if (typeof title === 'string') {
            title = title.replace(/<[^>]*>/g, '');
          } else if (typeof title === 'object') {
            title = title['@value'] || '';
          }
          
          // Include TM2 codes (SK-ST range) OR chapter 26 OR TM2 in title
          const isTm2Code = TM2_PREFIXES.some(prefix => code.startsWith(prefix));
          const isChapter26 = chapter === '26';
          const hasTm2InTitle = title.toLowerCase().includes('tm2') || 
                               title.toLowerCase().includes('traditional medicine');
          
          if (isTm2Code || isChapter26 || hasTm2InTitle) {
            // Generate a code if missing
            const finalCode = code || `TM2-ENTITY-${entity.id?.split('/').pop() || allCodes.length}`;
            
            allCodes.push({
              code: finalCode,
              title: title.trim(),
              definition: entity.definition || '',
              category: getCategoryFromCode(finalCode),
              metadata: {
                uri: entity.id || entity.Id,
                score: entity.score || entity.Score,
                chapter,
                stemId: entity.stemId,
                isLeaf: entity.isLeaf,
              },
            });
          }
        }
        
        console.log(`  Found ${results.length} results, ${allCodes.length} TM2 codes so far`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Deduplicate by code
    const uniqueCodes = [...new Map(allCodes.map(c => [c.code, c])).values()];
    console.log(`\nTotal unique TM2 codes fetched: ${uniqueCodes.length}`);

    // Save to JSON file
    const jsonPath = join(DATA_DIR, 'tm2-codes.json');
    writeFileSync(jsonPath, JSON.stringify(uniqueCodes, null, 2));
    console.log(`Saved to: ${jsonPath}`);

    // Import to database
    console.log('\nImporting to database...');
    let imported = 0;
    let skipped = 0;

    for (const codeData of uniqueCodes) {
      try {
        // Handle missing fields gracefully
        const traditionalSystems = codeData.traditionalSystems?.map(t => 
          typeof t === 'string' ? t : `${t.system}:${t.term}`
        ) || [];
        
        await prisma.tm2Code.upsert({
          where: { code: codeData.code },
          update: {
            title: codeData.title || '',
            definition: codeData.definition || '',
            category: codeData.category || 'UNKNOWN',
            parentCode: codeData.parentCode || null,
            synonyms: codeData.synonyms || [],
            inclusions: codeData.inclusions || [],
            exclusions: codeData.exclusions || [],
            traditionalSystems,
            metadata: codeData.metadata || {},
          },
          create: {
            code: codeData.code,
            title: codeData.title || '',
            definition: codeData.definition || '',
            category: codeData.category || 'UNKNOWN',
            parentCode: codeData.parentCode || null,
            synonyms: codeData.synonyms || [],
            inclusions: codeData.inclusions || [],
            exclusions: codeData.exclusions || [],
            traditionalSystems,
            metadata: codeData.metadata || {},
          },
        });
        imported++;
      } catch (error) {
        console.error(`Failed to import ${codeData.code}: ${error.message}`);
        skipped++;
      }
    }

    console.log(`\nDatabase import: ${imported} imported, ${skipped} skipped`);

    // Print summary
    const count = await prisma.tm2Code.count();
    console.log(`\nTotal TM2 codes in database: ${count}`);

  } catch (error) {
    console.error('Fetch failed:', error.message);
    process.exit(1);
  }
};

main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
