/**
 * LangGraph Mapping Workflow
 * 
 * AI-powered workflow for mapping NAMASTE codes to ICD-11 TM2 codes
 * Uses functional programming approach with LangGraph.js
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { getPrisma } from '../db/client.js';
import { 
  createGeminiFlash, 
  createGeminiPro, 
  embedTexts,
  embedQuery,
} from '../services/llm.js';
import { logger } from '../config/logger.js';

// ============================================================================
// State Definition
// ============================================================================

/**
 * Mapping workflow state annotation
 */
const MappingState = Annotation.Root({
  // Input
  namasteCode: Annotation({
    reducer: (_, next) => next,
    default: () => null,
  }),
  
  // Processing
  normalizedText: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),
  embedding: Annotation({
    reducer: (_, next) => next,
    default: () => [],
  }),
  
  // Candidates
  tm2Candidates: Annotation({
    reducer: (_, next) => next,
    default: () => [],
  }),
  
  // Output
  selectedMapping: Annotation({
    reducer: (_, next) => next,
    default: () => null,
  }),
  confidence: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  equivalence: Annotation({
    reducer: (_, next) => next,
    default: () => 'UNMATCHED',
  }),
  reasoning: Annotation({
    reducer: (_, next) => next,
    default: () => '',
  }),
  
  // Metadata
  processingTime: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  errors: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// ============================================================================
// Node Functions
// ============================================================================

/**
 * Preprocess NAMASTE code - normalize text and extract features
 */
const preprocessNode = async (state) => {
  const startTime = Date.now();
  const { namasteCode } = state;
  
  if (!namasteCode) {
    return { errors: ['No NAMASTE code provided'] };
  }
  
  logger.debug({ code: namasteCode.code }, 'Preprocessing NAMASTE code');
  
  // Normalize text for embedding - prioritize English content for better matching
  const textParts = [
    namasteCode.shortDefinition,  // Most important - English definition
    namasteCode.englishName,
    namasteCode.longDefinition,
    namasteCode.term,
    namasteCode.termNormalized,
  ].filter(Boolean);
  
  // Create search-optimized text
  const normalizedText = textParts.join(' ').toLowerCase().trim();
  
  logger.debug({ 
    code: namasteCode.code, 
    normalizedText: normalizedText.substring(0, 100) 
  }, 'Normalized text for search');
  
  return {
    normalizedText,
    processingTime: Date.now() - startTime,
  };
};

/**
 * Generate embedding for the NAMASTE code
 */
const embedNode = async (state) => {
  const startTime = Date.now();
  const { normalizedText, namasteCode } = state;
  
  if (!normalizedText) {
    return { errors: ['No normalized text for embedding'] };
  }
  
  logger.debug({ code: namasteCode?.code }, 'Generating embedding');
  
  try {
    // Generate query embedding (optimized for retrieval)
    const embedding = await embedQuery(normalizedText);
    
    return {
      embedding,
      processingTime: state.processingTime + (Date.now() - startTime),
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Embedding generation failed');
    return { 
      embedding: [],
      errors: [`Embedding failed: ${error.message}`] 
    };
  }
};

/**
 * Semantic search for TM2 candidates
 */
const semanticSearchNode = async (state) => {
  const startTime = Date.now();
  const { normalizedText, namasteCode } = state;
  
  logger.debug({ code: namasteCode?.code }, 'Searching TM2 candidates');
  
  const prisma = getPrisma();
  
  try {
    // Text-based search using PostgreSQL full-text search
    // In production, use pgvector for embedding similarity
    const searchTerms = normalizedText.split(/\s+/).slice(0, 5).join(' & ');
    
    const candidates = await prisma.$queryRaw`
      SELECT 
        code,
        title,
        definition,
        category,
        synonyms,
        ts_rank(
          to_tsvector('english', title || ' ' || COALESCE(definition, '')),
          plainto_tsquery('english', ${normalizedText})
        ) as score
      FROM tm2_codes
      WHERE 
        to_tsvector('english', title || ' ' || COALESCE(definition, ''))
        @@ plainto_tsquery('english', ${normalizedText})
      ORDER BY score DESC
      LIMIT 10
    `;
    
    // If no full-text matches, try ILIKE search with more keywords
    let tm2Candidates = candidates;
    if (candidates.length === 0) {
      // Extract meaningful keywords (longer than 3 chars, not common words)
      const stopWords = ['the', 'and', 'for', 'with', 'from', 'that', 'this', 'disorder', 'disease'];
      const keywords = normalizedText
        .split(/[\s\/\-\|]+/)
        .filter(w => w.length > 3 && !stopWords.includes(w))
        .slice(0, 5);
      
      logger.debug({ keywords }, 'Searching with keywords');
      
      if (keywords.length > 0) {
        tm2Candidates = await prisma.tm2Code.findMany({
          where: {
            OR: keywords.flatMap(keyword => [
              { title: { contains: keyword, mode: 'insensitive' } },
              { definition: { contains: keyword, mode: 'insensitive' } },
            ]),
          },
          take: 15,
        });
        
        // Add basic scoring based on keyword matches
        tm2Candidates = tm2Candidates.map(c => ({
          ...c,
          score: keywords.filter(k => 
            c.title?.toLowerCase().includes(k) || 
            c.definition?.toLowerCase().includes(k)
          ).length / keywords.length,
        }));
      }
    }
    
    // Sort by score
    tm2Candidates = tm2Candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    logger.debug({ 
      code: namasteCode?.code, 
      candidateCount: tm2Candidates.length 
    }, 'Found TM2 candidates');
    
    return {
      tm2Candidates,
      processingTime: state.processingTime + (Date.now() - startTime),
    };
  } catch (error) {
    logger.error({ error: error.message }, 'Semantic search failed');
    return { 
      tm2Candidates: [],
      errors: [`Search failed: ${error.message}`] 
    };
  }
};

/**
 * AI validation using Gemini Pro
 */
const aiValidationNode = async (state) => {
  const startTime = Date.now();
  const { namasteCode, tm2Candidates } = state;
  
  if (!tm2Candidates || tm2Candidates.length === 0) {
    return {
      selectedMapping: null,
      confidence: 0,
      equivalence: 'UNMATCHED',
      reasoning: 'No TM2 candidates found for validation',
      processingTime: state.processingTime + (Date.now() - startTime),
    };
  }
  
  logger.debug({ 
    code: namasteCode?.code, 
    candidateCount: tm2Candidates.length 
  }, 'AI validation');
  
  try {
    // Use Flash for speed and no rate limits (Pro has strict quotas)
    // Set lower max tokens for faster response
    const model = createGeminiFlash({ maxTokens: 1024 });
    
    const prompt = `Medical terminology expert: Map NAMASTE to ICD-11 TM2.

NAMASTE: ${namasteCode.code} (${namasteCode.system})
Term: ${namasteCode.term}
Definition: ${namasteCode.shortDefinition || namasteCode.englishName || 'N/A'}

TM2 Candidates:
${tm2Candidates.slice(0, 3).map((c, i) => `${i + 1}. ${c.code}: ${c.title}${c.definition ? ' - ' + c.definition.substring(0, 100) : ''}`).join('\n')}

Respond JSON only:
{
  "selectedCode": "best TM2 code or null",
  "confidence": 0.0-1.0,
  "equivalence": "EQUIVALENT|WIDER|NARROWER|INEXACT|UNMATCHED",
  "reasoning": "Brief reason"
}`;

    const response = await model.invoke(prompt);
    const content = response.content;
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Find the selected candidate
    const selectedMapping = result.selectedCode 
      ? tm2Candidates.find(c => c.code === result.selectedCode) || null
      : null;
    
    return {
      selectedMapping,
      confidence: result.confidence || 0,
      equivalence: (result.equivalence || 'UNMATCHED').toUpperCase(),
      reasoning: result.reasoning || '',
      processingTime: state.processingTime + (Date.now() - startTime),
    };
  } catch (error) {
    logger.error({ error: error.message }, 'AI validation failed');
    
    // Fallback: use top candidate with lower confidence
    const topCandidate = tm2Candidates[0];
    return {
      selectedMapping: topCandidate || null,
      confidence: topCandidate ? 0.5 : 0,
      equivalence: topCandidate ? 'INEXACT' : 'UNMATCHED',
      reasoning: `AI validation failed: ${error.message}. Using top search result.`,
      processingTime: state.processingTime + (Date.now() - startTime),
      errors: [`AI validation error: ${error.message}`],
    };
  }
};

// ============================================================================
// Routing Functions
// ============================================================================

/**
 * Route based on candidate count and confidence
 */
const routeByConfidence = (state) => {
  const { tm2Candidates } = state;
  
  // If no candidates, end early
  if (!tm2Candidates || tm2Candidates.length === 0) {
    return 'end';
  }
  
  // If top candidate has high score, might skip AI validation
  const topScore = tm2Candidates[0]?.score || 0;
  if (topScore > 0.9) {
    return 'high_confidence';
  }
  
  // Otherwise, use AI validation
  return 'validate';
};

/**
 * High confidence path - use top candidate directly
 */
const highConfidenceNode = async (state) => {
  const { tm2Candidates, namasteCode } = state;
  const topCandidate = tm2Candidates[0];
  
  logger.debug({ 
    code: namasteCode?.code, 
    tm2Code: topCandidate?.code 
  }, 'High confidence match');
  
  return {
    selectedMapping: topCandidate,
    confidence: topCandidate?.score || 0.85,
    equivalence: 'EQUIVALENT',
    reasoning: 'High confidence text match',
  };
};

// ============================================================================
// Workflow Graph
// ============================================================================

/**
 * Create the mapping workflow graph
 */
export const createMappingWorkflow = () => {
  const workflow = new StateGraph(MappingState)
    // Add nodes
    .addNode('preprocess', preprocessNode)
    .addNode('embed', embedNode)
    .addNode('search', semanticSearchNode)
    .addNode('validate', aiValidationNode)
    .addNode('high_confidence', highConfidenceNode)
    
    // Define edges
    .addEdge('__start__', 'preprocess')
    .addEdge('preprocess', 'embed')
    .addEdge('embed', 'search')
    .addConditionalEdges('search', routeByConfidence, {
      high_confidence: 'high_confidence',
      validate: 'validate',
      end: '__end__',
    })
    .addEdge('high_confidence', '__end__')
    .addEdge('validate', '__end__');
  
  return workflow.compile();
};

// ============================================================================
// Main Mapping Function
// ============================================================================

/**
 * Map a NAMASTE code to ICD-11 TM2
 */
export const mapNamasteToTm2 = async (namasteCode) => {
  const workflow = createMappingWorkflow();
  
  const startTime = Date.now();
  
  try {
    const result = await workflow.invoke({
      namasteCode,
    });
    
    logger.info({
      namasteCode: namasteCode.code,
      tm2Code: result.selectedMapping?.code,
      confidence: result.confidence,
      equivalence: result.equivalence,
      processingTime: Date.now() - startTime,
    }, 'Mapping completed');
    
    return {
      success: true,
      namasteCode: namasteCode.code,
      tm2Code: result.selectedMapping?.code || null,
      tm2Title: result.selectedMapping?.title || null,
      confidence: result.confidence,
      equivalence: result.equivalence,
      reasoning: result.reasoning,
      processingTime: Date.now() - startTime,
      errors: result.errors,
    };
  } catch (error) {
    logger.error({ error: error.message, code: namasteCode.code }, 'Mapping failed');
    
    return {
      success: false,
      namasteCode: namasteCode.code,
      tm2Code: null,
      confidence: 0,
      equivalence: 'UNMATCHED',
      reasoning: `Mapping failed: ${error.message}`,
      processingTime: Date.now() - startTime,
      errors: [error.message],
    };
  }
};

/**
 * Batch map multiple NAMASTE codes
 */
export const batchMapNamasteToTm2 = async (namasteCodes, options = {}) => {
  const { concurrency = 3 } = options;
  const results = [];
  
  // Process in batches
  for (let i = 0; i < namasteCodes.length; i += concurrency) {
    const batch = namasteCodes.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(code => mapNamasteToTm2(code))
    );
    results.push(...batchResults);
  }
  
  return results;
};

export default {
  createMappingWorkflow,
  mapNamasteToTm2,
  batchMapNamasteToTm2,
};
