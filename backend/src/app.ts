import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ApiResponse } from './utils/apiResponse';

const app: Application = express();

// ---------------------
// Security & Parsing
// ---------------------
app.use(helmet());
app.use(
    cors({
        origin: [env.STOREFRONT_URL, env.VENDOR_DASHBOARD_URL, env.ADMIN_DASHBOARD_URL],
        credentials: true,
    })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------
// Logging
// ---------------------
if (env.isDev) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ---------------------
// Health Check
// ---------------------
app.get('/api/health', (_req, res) => {
    ApiResponse.success(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
    }, 'Server is running');
});

// ---------------------
// API Routes
// ---------------------
// Routes will be registered here as modules are built
// e.g., app.use('/api/v1/auth', authRoutes);

// ---------------------
// Error Handling
// ---------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
