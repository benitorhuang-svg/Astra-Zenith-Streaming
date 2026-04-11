import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';

// Atomic Core & Routes
import { PORT } from './core/config';
import { pool } from './models/Agent';
import missionRoutes from './routes/mission';
import systemRoutes from './routes/system';
import analysisRoutes from './routes/analysis';
import { vectorService } from './services/VectorService';
import { syncMultimodalKnowledge } from './services/CoreService';

const app = express();

app.use(compression());
app.use(express.json());
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false
}));

// Serve stationary UI from /public (Production)
const DIST_PATH = path.join(process.cwd(), 'dist');
if (fs.existsSync(DIST_PATH)) {
    console.log(`📦 Serving production build from: ${DIST_PATH}`);
    app.use(express.static(DIST_PATH));
} else {
    console.warn(`⚠️ Warning: Production build directory not found at ${DIST_PATH}. Falling back to source folders.`);
    app.use(express.static('public'));
    app.use('/scripts', express.static('src/scripts'));
    app.use('/styles', express.static('src/styles'));
    app.use('/images', express.static('public/images'));
}

// Industrial Routes
app.use('/api', missionRoutes);
app.use('/api', systemRoutes);
app.use('/api/analysis', analysisRoutes);

// Catch-all for SPA navigation
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    const indexPath = path.join(DIST_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.sendFile(path.join(process.cwd(), 'index.html'));
    }
});

/**
 * ==========================================
 * 🛠️ GLOBAL ERROR HANDLER
 * ==========================================
 */
app.use(morgan('dev'));
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        console.log(`[DIAGNOSTIC] ${req.method} ${req.url}`);
    }
    next();
});
app.use(express.static('public'));

/**
 * ==========================================
 * 📡 API GATEWAY (ATOMIC MODULES)
 * ==========================================
 */
app.use('/api', (req, res, next) => {
    console.log(`📡 [API_GATEWAY] ${req.method} ${req.originalUrl}`);
    if (req.method === 'POST') console.log(`📦 Payload:`, JSON.stringify(req.body));
    next();
});
app.use('/api', systemRoutes);  // /api/logs, /api/auth/*
app.use('/api', missionRoutes); // /api/mission/*, /api/discussion/*, /api/chat-legacy
app.use('/api/analysis', analysisRoutes); // /api/analysis/graph, /api/analysis/inject

/**
 * ==========================================
 * 🛠️ GLOBAL ERROR HANDLER
 * ==========================================
 */
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error('💥 GLOBAL_ERROR:', err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message });
});

/**
 * ==========================================
 * 🚀 SERVER STARTUP (2026 STANDARDS)
 * ==========================================
 */
// 🚀 Background Initialization (2026 Standards)
async function bootstrap() {
    console.log(`📂 Current Working Directory: ${process.cwd()}`);
    const azDir = process.cwd();
    const agentStatePath = path.join(azDir, 'server', 'core', 'AGENT_STATE.json');

    if (fs.existsSync(agentStatePath)) {
        try {
            const state = JSON.parse(fs.readFileSync(agentStatePath, 'utf8'));
            await pool.warmup(state.agent_pool);
            console.log(`✅ 戰術代理人池預熱完成 (${state.agent_pool.length} 節點)`);
            
            vectorService.loadNodes();
            await syncMultimodalKnowledge(vectorService);
            console.log(`🧠 語義圖譜與多模態資源預熱完成`);
        } catch (e) {
            console.error(`❌ 基礎設施引發失敗:`, e);
        }
    } else {
        console.warn(`⚠️ Warning: Agent state file not found at ${agentStatePath}`);
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Astra Zenith SDK Hub (2026 Standards) at http://0.0.0.0:${PORT}`);
    bootstrap().catch(err => console.error('💥 Bootstrap Error:', err));
});
