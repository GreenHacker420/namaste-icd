import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { logger } from '../config/logger.js';

/**
 * NAMASTE Code Loader
 * Load NAMASTE codes from JSON or XLS files
 * Functional approach - pure functions for data loading
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const BACKEND_DATA_DIR = join(__dirname, '../../../backend/data');

/**
 * Normalize text for search
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Load NAMASTE codes from JSON file
 * @param {string} system - System name (ayurveda, siddha, unani)
 * @returns {Promise<Array>} Array of NAMASTE codes
 */
export const loadNamasteFromJson = async (system) => {
  const fileName = `${system}-codes.json`;
  
  // Try multiple paths
  const paths = [
    join(DATA_DIR, 'namaste', fileName),
    join(BACKEND_DATA_DIR, fileName),
  ];

  for (const filePath of paths) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        logger.info({ system, count: data.length, path: filePath }, 'Loaded NAMASTE codes from JSON');
        return data;
      } catch (error) {
        logger.warn({ system, path: filePath, error: error.message }, 'Failed to load JSON');
      }
    }
  }

  logger.warn({ system }, 'No JSON file found for NAMASTE codes');
  return [];
};

/**
 * Load NAMASTE codes from XLS file
 * @param {string} filePath - Path to XLS file
 * @param {string} system - System name
 * @returns {Promise<Array>} Array of NAMASTE codes
 */
export const loadNamasteFromXls = async (filePath, system) => {
  if (!existsSync(filePath)) {
    logger.warn({ filePath }, 'XLS file not found');
    return [];
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Skip header row and parse data
    const codes = rows.slice(1).map((row, index) => {
      const code = row[1]?.toString().trim() || `${system.toUpperCase()}-${index + 1}`;
      const term = row[2]?.toString().trim() || '';
      const shortDef = row[3]?.toString().trim() || '';
      const longDef = row[4]?.toString().trim() || '';

      return {
        id: `${system}-${index + 1}`,
        code,
        system,
        term,
        termNormalized: normalizeText(term),
        nativeScript: term, // Original script
        shortDefinition: shortDef,
        longDefinition: longDef,
        englishName: extractEnglishName(term, shortDef),
        searchableText: normalizeText(`${term} ${shortDef} ${longDef}`),
        metadata: {
          source: 'xls',
          rowIndex: index + 1,
        },
      };
    }).filter(code => code.term); // Filter out empty rows

    logger.info({ system, count: codes.length, path: filePath }, 'Loaded NAMASTE codes from XLS');
    return codes;
  } catch (error) {
    logger.error({ filePath, error: error.message }, 'Failed to load XLS');
    return [];
  }
};

/**
 * Extract English name from term or definition
 * @param {string} term - Original term
 * @param {string} definition - Short definition
 * @returns {string} English name
 */
const extractEnglishName = (term, definition) => {
  // Try to extract English name from parentheses
  const match = term.match(/\(([^)]+)\)/) || definition.match(/\(([^)]+)\)/);
  if (match) {
    return match[1].trim();
  }
  
  // Check if term is already in English
  if (/^[a-zA-Z\s]+$/.test(term)) {
    return term;
  }

  return '';
};

/**
 * Load all NAMASTE codes from all systems
 * @returns {Promise<Object>} Object with codes by system
 */
export const loadAllNamasteCodes = async () => {
  const systems = ['ayurveda', 'siddha', 'unani'];
  const result = {};

  for (const system of systems) {
    result[system] = await loadNamasteFromJson(system);
  }

  const total = Object.values(result).reduce((sum, codes) => sum + codes.length, 0);
  logger.info({ 
    ayurveda: result.ayurveda.length,
    siddha: result.siddha.length,
    unani: result.unani.length,
    total,
  }, 'Loaded all NAMASTE codes');

  return result;
};

/**
 * Get flat array of all NAMASTE codes
 * @returns {Promise<Array>} All NAMASTE codes
 */
export const getAllNamasteCodes = async () => {
  const bySystem = await loadAllNamasteCodes();
  return [
    ...bySystem.ayurveda,
    ...bySystem.siddha,
    ...bySystem.unani,
  ];
};

/**
 * Search NAMASTE codes by query
 * @param {Array} codes - Array of codes to search
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Matching codes
 */
export const searchNamasteCodes = (codes, query, options = {}) => {
  const { system, limit = 20 } = options;
  const normalizedQuery = normalizeText(query);

  let filtered = codes;
  
  // Filter by system if specified
  if (system) {
    filtered = filtered.filter(code => code.system === system);
  }

  // Score and sort by relevance
  const scored = filtered.map(code => {
    let score = 0;
    const searchText = code.searchableText || '';
    const term = normalizeText(code.term || '');
    const englishName = normalizeText(code.englishName || '');

    // Exact match on code
    if (code.code.toLowerCase() === query.toLowerCase()) {
      score += 100;
    }

    // Exact match on term
    if (term === normalizedQuery) {
      score += 80;
    }

    // Starts with query
    if (term.startsWith(normalizedQuery)) {
      score += 60;
    }

    // Contains query
    if (term.includes(normalizedQuery)) {
      score += 40;
    }

    // English name match
    if (englishName.includes(normalizedQuery)) {
      score += 30;
    }

    // Searchable text contains query
    if (searchText.includes(normalizedQuery)) {
      score += 20;
    }

    return { ...code, score };
  });

  // Filter and sort by score
  return scored
    .filter(code => code.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
