/**
 * Audit Logging Middleware
 * 
 * FHIR AuditEvent compliant logging for DISHA/HIPAA compliance
 */

import { getPrisma } from '../db/client.js';
import { logger } from '../config/logger.js';

/**
 * FHIR AuditEvent types
 */
const AuditEventType = {
  REST: 'rest',
  MAPPING: 'mapping',
  SEARCH: 'search',
  EXPORT: 'export',
  LOGIN: 'login',
  LOGOUT: 'logout',
};

/**
 * FHIR AuditEvent outcomes
 */
const AuditOutcome = {
  SUCCESS: '0',
  MINOR_FAILURE: '4',
  SERIOUS_FAILURE: '8',
  MAJOR_FAILURE: '12',
};

/**
 * Create FHIR-compliant AuditEvent resource
 */
export const createFhirAuditEvent = ({
  type,
  subtype,
  action,
  outcome,
  outcomeDesc,
  agent,
  source,
  entity,
  recorded = new Date().toISOString(),
}) => ({
  resourceType: 'AuditEvent',
  type: {
    system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
    code: type,
    display: type.charAt(0).toUpperCase() + type.slice(1),
  },
  subtype: subtype ? [{
    system: 'http://hl7.org/fhir/restful-interaction',
    code: subtype,
  }] : undefined,
  action,
  recorded,
  outcome,
  outcomeDesc,
  agent: agent ? [{
    type: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
        code: 'IRCP',
        display: 'information recipient',
      }],
    },
    who: {
      display: agent.name || 'Anonymous',
    },
    requestor: true,
    network: agent.ip ? {
      address: agent.ip,
      type: '2', // IP address
    } : undefined,
  }] : undefined,
  source: {
    site: 'NAMASTE-ICD API',
    observer: {
      display: source || 'namaste-api',
    },
    type: [{
      system: 'http://terminology.hl7.org/CodeSystem/security-source-type',
      code: '4',
      display: 'Application Server',
    }],
  },
  entity: entity ? [{
    what: {
      reference: entity.reference,
      display: entity.display,
    },
    type: {
      system: 'http://terminology.hl7.org/CodeSystem/audit-entity-type',
      code: entity.type || '2',
      display: entity.typeDisplay || 'System Object',
    },
    role: {
      system: 'http://terminology.hl7.org/CodeSystem/object-role',
      code: entity.role || '4',
      display: entity.roleDisplay || 'Domain Resource',
    },
    query: entity.query ? Buffer.from(entity.query).toString('base64') : undefined,
  }] : undefined,
});

/**
 * Create audit log entry in database
 */
export const createAuditLog = async ({
  action,
  resourceType,
  resourceId,
  userId,
  userAgent,
  ipAddress,
  requestMethod,
  requestPath,
  requestBody,
  responseStatus,
  responseTime,
  outcome,
  details,
}) => {
  try {
    const prisma = getPrisma();
    
    // Create FHIR AuditEvent
    const fhirAuditEvent = createFhirAuditEvent({
      type: AuditEventType.REST,
      subtype: requestMethod?.toLowerCase(),
      action: action || requestMethod?.charAt(0) || 'R',
      outcome: responseStatus < 400 ? AuditOutcome.SUCCESS : 
               responseStatus < 500 ? AuditOutcome.MINOR_FAILURE : 
               AuditOutcome.SERIOUS_FAILURE,
      outcomeDesc: outcome,
      agent: {
        name: userId || 'anonymous',
        ip: ipAddress,
      },
      entity: resourceId ? {
        reference: `${resourceType}/${resourceId}`,
        display: resourceType,
        type: '2',
        role: '4',
      } : undefined,
    });
    
    // Store in database (using schema-compatible fields)
    const auditLog = await prisma.auditLog.create({
      data: {
        action: action || requestMethod || 'UNKNOWN',
        resourceType: resourceType || 'System',
        resourceId: resourceId || null,
        userId: userId || null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        requestBody: requestBody ? requestBody : null,
        responseStatus: responseStatus || null,
        durationMs: responseTime || null,
        metadata: {
          requestMethod,
          requestPath,
          fhirAuditEvent,
          details,
        },
      },
    });
    
    return auditLog;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to create audit log');
    return null;
  }
};

/**
 * Audit middleware for automatic request logging
 */
export const auditMiddleware = async (c, next) => {
  const start = Date.now();
  const requestId = c.get('requestId');
  
  // Capture request details
  const requestDetails = {
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
    userAgent: c.req.header('user-agent'),
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    userId: c.get('userId') || c.req.header('x-user-id'),
  };
  
  await next();
  
  const responseTime = Date.now() - start;
  const status = c.res.status;
  
  // Skip health checks and metrics
  if (requestDetails.path.startsWith('/health') || requestDetails.path === '/metrics') {
    return;
  }
  
  // Determine resource type from path
  let resourceType = 'System';
  let action = requestDetails.method;
  
  if (requestDetails.path.includes('/mapping')) {
    resourceType = 'ConceptMap';
    action = requestDetails.method === 'POST' ? 'TRANSLATE' : 'READ';
  } else if (requestDetails.path.includes('/fhir')) {
    resourceType = 'FHIR';
    action = requestDetails.method;
  } else if (requestDetails.path.includes('/autocomplete')) {
    resourceType = 'ValueSet';
    action = 'SEARCH';
  }
  
  // Create audit log asynchronously (don't block response)
  setImmediate(() => {
    createAuditLog({
      action,
      resourceType,
      userId: requestDetails.userId,
      userAgent: requestDetails.userAgent,
      ipAddress: requestDetails.ipAddress,
      requestMethod: requestDetails.method,
      requestPath: requestDetails.path,
      responseStatus: status,
      responseTime,
      outcome: status < 400 ? 'Success' : 'Failure',
      details: {
        requestId,
        query: requestDetails.query,
      },
    }).catch(err => logger.error({ error: err.message }, 'Audit log failed'));
  });
};

/**
 * Get audit logs with filtering
 */
export const getAuditLogs = async ({
  startDate,
  endDate,
  action,
  resourceType,
  userId,
  page = 1,
  limit = 50,
}) => {
  const prisma = getPrisma();
  
  const where = {};
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (userId) where.userId = userId;
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Export audit logs as FHIR Bundle
 */
export const exportAuditLogsAsFhirBundle = async (filters) => {
  const { logs } = await getAuditLogs({ ...filters, limit: 1000 });
  
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: logs.length,
    entry: logs.map(log => ({
      resource: log.fhirAuditEvent,
      fullUrl: `urn:uuid:${log.id}`,
    })),
  };
};
