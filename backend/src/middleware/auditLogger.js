// Módulo 9: Audit logging middleware
const { AuditLog } = require('../models/sequelize');

function auditLog(entity, action) {
  return async (req, res, next) => {
    // store original json method
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      // after response, log the audit
      setImmediate(async () => {
        try {
          const entityId = req.params.id || (data && data.id) || '';
          await AuditLog.create({
            entity,
            entityId: String(entityId),
            action,
            changes: {
              body: req.body || {},
              params: req.params || {},
              method: req.method,
            },
            userId: req.user ? req.user.id : 'system',
            ip: req.headers['x-forwarded-for'] || req.ip || '',
            ua: req.headers['user-agent'] || '',
          });
        } catch(_) { /* silent fail — audit should not break requests */ }
      });
      return originalJson(data);
    };
    next();
  };
}

module.exports = { auditLog };
