import { type Request, type Response, type NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

export const validate = (schema: ZodType) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Parse request body against Zod schema
            req.body = schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Return structured validation error response
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.issues.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            res.status(500).json({ error: 'Internal validation error' });
        }
    };
};