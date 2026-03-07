import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

// Validate credentials at startup so misconfiguration surfaces immediately
// rather than as a 401 from Cloudinary on the first upload attempt in production.
if (!env.isTest && (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)) {
    throw new Error(
        'Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your .env file.'
    );
}

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
