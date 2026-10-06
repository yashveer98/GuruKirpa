import { Router, type Request, type Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, stockAdjustments } from '../db/schema.js';

const router = Router();

// POST /api/stock/adjust — Record stock movement & update product stock automatically
router.post('/stock/adjust', async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, adjustmentType, quantityChange, reason } = req.body;

        if (!productId || !adjustmentType || quantityChange === undefined) {
            res.status(400).json({ error: 'productId, adjustmentType, and quantityChange are required' });
            return;
        }

        // Run within an atomic SQL transaction
        const result = await db.transaction(async (tx) => {
            // 1. Fetch current product stock
            const [existingProduct] = await tx
                .select()
                .from(products)
                .where(eq(products.id, productId));

            if (!existingProduct) {
                throw new Error('PRODUCT_NOT_FOUND');
            }

            const previousStock = existingProduct.stock;
            const newStock = previousStock + Number(quantityChange);

            if (newStock < 0) {
                throw new Error('INSUFFICIENT_STOCK');
            }

            // 2. Update the product stock count
            await tx
                .update(products)
                .set({ stock: newStock, updatedAt: new Date() })
                .where(eq(products.id, productId));

            // 3. Log the audit movement record
            const [adjustmentRecord] = await tx
                .insert(stockAdjustments)
                .values({
                    productId,
                    adjustmentType,
                    quantityChange: Number(quantityChange),
                    previousStock,
                    newStock,
                    reason: reason || null,
                })
                .returning();

            return { adjustmentRecord, currentStock: newStock };
        });

        res.status(201).json({
            message: 'Stock adjusted successfully',
            data: result,
        });
    } catch (error: any) {
        if (error.message === 'PRODUCT_NOT_FOUND') {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        if (error.message === 'INSUFFICIENT_STOCK') {
            res.status(400).json({ error: 'Stock cannot drop below 0' });
            return;
        }
        res.status(500).json({ error: 'Failed to adjust stock', details: error.message });
    }
});

// GET /api/stock/history/:productId — Fetch full stock audit history for a single product
router.get('/stock/history/:productId', async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = Number(req.params.productId);

        const history = await db
            .select()
            .from(stockAdjustments)
            .where(eq(stockAdjustments.productId, productId))
            .orderBy(desc(stockAdjustments.createdAt));

        res.json({
            productId,
            count: history.length,
            history,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch stock history', details: error.message });
    }
});

export default router;