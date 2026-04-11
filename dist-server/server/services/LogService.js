"use strict";
/**
 * AZ LOG SERVICE — Real-time SSE Pipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushLog = pushLog;
exports.registerLogClient = registerLogClient;
exports.unregisterLogClient = unregisterLogClient;
const logs = [];
const clients = new Set();
function pushLog(message, type = 'info', metadata) {
    const log = { id: Date.now(), timestamp: new Date().toLocaleTimeString(), msg: message, type, metadata };
    logs.push(log);
    if (logs.length > 50)
        logs.shift();
    console.log(`[${type.toUpperCase()}] ${message}`);
    // SSE Broadcast
    const payload = `data: ${JSON.stringify(log)}\n\n`;
    if (clients.size === 0) {
        // console.log('[LOG] No clients connected.');
    }
    clients.forEach(client => {
        try {
            client.write(payload);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[LOG] Failed to write to client:', message);
            clients.delete(client);
        }
    });
}
function registerLogClient(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    // Force flush for proxy
    res.write(':\n\n');
    clients.add(res);
    // Send history
    logs.forEach(log => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    });
    pushLog(`📡 遙測連線建立 (當前活躍數: ${clients.size})`, 'info');
}
function unregisterLogClient(res) {
    clients.delete(res);
}
