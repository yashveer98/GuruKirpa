import { User } from '../db/schema.js';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                role: 'ADMIN' | 'STORE_KEEPER';
            };
        }
    }
}