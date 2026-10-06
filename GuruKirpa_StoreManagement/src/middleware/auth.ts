import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_super_secret_key';

export interface JwtPayload {
    id: number;
    email: string;
    role: 'ADMIN' | 'STORE_KEEPER';
}

// 1. Authenticate Token Middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting: "Bearer <TOKEN>"

    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// 2. Authorize Roles Middleware (RBAC)
export const authorizeRoles = (...allowedRoles: ('ADMIN' | 'STORE_KEEPER')[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`,
            });
            return;
        }

        next();
    };
};