import dotenv from 'dotenv';

dotenv.config();

export const env = {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),

    // Database
    DATABASE_URL: process.env.DATABASE_URL || '',

    // Redis
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

    // JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    JWT_REFRESH_SECRET:
        process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

    // Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '',

    // Stripe Connect
    PLATFORM_COMMISSION_RATE: process.env.PLATFORM_COMMISSION_RATE || '10.00',
    STRIPE_CONNECT_RETURN_URL:
        process.env.STRIPE_CONNECT_RETURN_URL || 'http://localhost:3001/stripe/return',
    STRIPE_CONNECT_REFRESH_URL:
        process.env.STRIPE_CONNECT_REFRESH_URL || 'http://localhost:3001/stripe/refresh',

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

    // Firebase (FCM push notifications)
    GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS || '',

    // Email
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || '',

    // CORS
    STOREFRONT_URL: process.env.STOREFRONT_URL || 'http://localhost:3000',
    VENDOR_DASHBOARD_URL:
        process.env.VENDOR_DASHBOARD_URL || 'http://localhost:3001',
    ADMIN_DASHBOARD_URL:
        process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3002',

    // Helpers
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
} as const;
