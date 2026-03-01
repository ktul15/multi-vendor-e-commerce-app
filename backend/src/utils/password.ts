import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password using bcrypt.
 * @param plainPassword - The raw password string
 * @returns The hashed password
 */
export const hashPassword = async (plainPassword: string): Promise<string> => {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a bcrypt hash.
 * @param plainPassword - The raw password to check
 * @param hashedPassword - The stored bcrypt hash
 * @returns true if they match, false otherwise
 */
export const comparePassword = async (
    plainPassword: string,
    hashedPassword: string
): Promise<boolean> => {
    return bcrypt.compare(plainPassword, hashedPassword);
};
