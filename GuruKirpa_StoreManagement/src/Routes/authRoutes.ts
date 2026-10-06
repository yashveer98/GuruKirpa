import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_super_secret_key';

// Auto-bootstrap migration for new enum roles
const bootstrapRoles = async () => {
    try {
        await db.execute(sql`
            DO $$ BEGIN
                ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SALES_FINANCE';
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;

            DO $$ BEGIN
                ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'LAB_TECHNICIAN';
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log('[Auth] User roles bootstrapped successfully.');
    } catch (err) {
        console.error('[Auth] Role bootstrap error:', err);
    }
};
bootstrapRoles();

const ALLOWED_ROLES = ['ADMIN', 'STORE_KEEPER', 'SALES_FINANCE', 'LAB_TECHNICIAN'] as const;

// GET /api/auth/setup-status — Check if initial master admin setup is required
router.get('/auth/setup-status', async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await db.select({ count: sql<number>`count(*)` }).from(users);
        const count = Number(result[0]?.count || 0);
        res.json({ isInitialSetup: count === 0, totalUsers: count });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to check setup status', details: error.message });
    }
});

// GET /api/auth/users — List all staff members (Admin only view)
router.get('/auth/users', async (_req: Request, res: Response): Promise<void> => {
    try {
        const allUsers = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(users.id);

        res.json(allUsers);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
});

// DELETE /api/auth/users/:id — Delete a staff member (Admin only)
router.delete('/auth/users/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.params.id);
        if (!userId) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }

        const [deleted] = await db
            .delete(users)
            .where(eq(users.id, userId))
            .returning({ id: users.id, name: users.name, email: users.email });

        if (!deleted) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ message: `Staff member ${deleted.name} (${deleted.email}) removed successfully` });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
});

// POST /api/auth/register — Create initial Admin OR add staff member
router.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
            return;
        }

        // Check user count: if 0 users, force first user to be ADMIN
        const result = await db.select({ count: sql<number>`count(*)` }).from(users);
        const count = Number(result[0]?.count || 0);

        let userRole = ALLOWED_ROLES.includes(role) ? role : 'STORE_KEEPER';
        if (count === 0) {
            userRole = 'ADMIN';
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [newUser] = await db
            .insert(users)
            .values({
                name,
                email,
                password: hashedPassword,
                role: userRole,
            })
            .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        res.status(500).json({ error: 'Failed to register user', details: error.message });
    }
});

// POST /api/auth/login
router.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        // Sign JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

export default router;