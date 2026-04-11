"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAuditLog = void 0;
const withAuditLog = (label = 'MISSION', detail) => async (context, next) => {
    const start = new Date().toISOString();
    const entry = `[${start}] ${label}${detail ? ` :: ${detail}` : ''}`;
    context.auditTrail.push(entry);
    context.recordLog?.(entry, 'INFO');
    try {
        await next();
    }
    finally {
        context.auditTrail.push(`[${new Date().toISOString()}] ${label} COMPLETE`);
        context.persistAuditTrail?.(context.auditTrail);
    }
};
exports.withAuditLog = withAuditLog;
