import { Router, type Request, type Response } from 'express';
import { and, asc, desc, eq, ilike, lte, or, sql, SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// CREATE: Add new product
router.post('/products', async (req: Request, res: Response): Promise<void> => {
    try {
        const { serialNumber,
            brand,
            productType,
            subType,
            modelNumber,
            costPrice,
            unitPrice,
            taxRate,
            stock,
            sku,
            specs, } = req.body;

        if (!serialNumber || !productType || !modelNumber) {
            res.status(400).json({ error: 'Serial number, product type, and model number are required' });
            return;
        }

        const [newProduct] = await db
            .insert(products)
            .values({
                serialNumber,
                brand: brand || 'Generic',
                productType,
                subType: subType || null,
                modelNumber,
                costPrice: costPrice ? String(costPrice) : '0.00',
                unitPrice: unitPrice ? String(unitPrice) : '0.00',
                taxRate: taxRate ? String(taxRate) : '18.00',
                stock: stock ?? 0,
                sku: sku || null,
                specs: specs || {},
            })
            .returning();

        res.status(201).json(newProduct);
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(409).json({ error: 'Serial number already exists' });
            return;
        }
        res.status(500).json({ error: 'Failed to create product', details: error.message });
    }
});

//===========================================================
// 1. View Products — Accessible by ADMIN and STORE_KEEPER
//router.get('/products', authenticateToken, authorizeRoles('ADMIN', 'STORE_KEEPER'), async (req, res) => {
// ... handler logic
//}); ==== need to implement when authorization and authentication is needed 
//===========================================================

// GET /api/products/low-stock?threshold=5
router.get('/products/low-stock', async (req: Request, res: Response): Promise<void> => {
    try {
        // Default threshold to 5 if not provided or invalid
        const thresholdParam = req.query.threshold;
        const threshold = thresholdParam ? Number(thresholdParam) : 5;

        if (isNaN(threshold) || threshold < 0) {
            res.status(400).json({ error: 'Threshold must be a non-negative number' });
            return;
        }

        // Query products where stock <= threshold, sorted by lowest stock first
        const lowStockProducts = await db
            .select()
            .from(products)
            .where(lte(products.stock, threshold))
            .orderBy(asc(products.stock));

        res.json({
            threshold,
            count: lowStockProducts.length,
            data: lowStockProducts,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch low-stock products', details: error.message });
    }
});

// GET /api/products
// Query Params:
//   - Filtering: ?productType=ac_drive&subType=three_phase&brand=Schneider&search=ATV320
//   - Pagination: ?page=1&limit=50
//   - Sorting:    ?sortBy=stock&order=asc  (sortBy options: id, brand, stock, unitPrice, createdAt, modelNumber)
router.get('/products', async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            productType,
            subType,
            brand,
            modelNumber,
            search,
            page = '1',
            limit = '100',
            sortBy = 'createdAt',
            order = 'desc',
        } = req.query;

        // 1. Build Filter Conditions
        const conditions: SQL[] = [];

        if (productType && typeof productType === 'string' && productType !== 'ALL') {
            conditions.push(eq(products.productType, productType as any));
        }
        if (subType && typeof subType === 'string') {
            conditions.push(ilike(products.subType, `%${subType}%`));
        }
        if (brand && typeof brand === 'string') {
            conditions.push(ilike(products.brand, `%${brand}%`));
        }
        if (modelNumber && typeof modelNumber === 'string') {
            conditions.push(ilike(products.modelNumber, `%${modelNumber}%`));
        }
        if (search && typeof search === 'string' && search.trim()) {
            const q = search.trim();
            conditions.push(
                or(
                    ilike(products.modelNumber, `%${q}%`),
                    ilike(products.brand, `%${q}%`),
                    ilike(products.serialNumber, `%${q}%`),
                    ilike(products.sku, `%${q}%`)
                )!
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // 2. Calculate Pagination Math
        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 100));
        const offsetNum = (pageNum - 1) * limitNum;

        // 3. Determine Dynamic Sorting Column & Direction
        const allowedSortColumns = {
            id: products.id,
            modelNumber: products.modelNumber,
            brand: products.brand,
            stock: products.stock,
            unitPrice: products.unitPrice,
            createdAt: products.createdAt,
        } as const;

        const sortColumn = allowedSortColumns[sortBy as keyof typeof allowedSortColumns] || products.createdAt;
        const sortOrder = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

        // 4. Get Total Matching Records Count
        const [countResult] = await db
            .select({ totalCount: sql<number>`count(*)::int` })
            .from(products)
            .where(whereClause);
        const totalCount: number = countResult?.totalCount ?? 0;

        // 5. Query Paginated & Sorted Data
        const results = await db
            .select()
            .from(products)
            .where(whereClause)
            .orderBy(sortOrder)
            .limit(limitNum)
            .offset(offsetNum);

        // 6. Return Structured Metadata Payload
        const totalPages = Math.ceil(totalCount / limitNum);

        res.json({
            pagination: {
                totalRecords: totalCount,
                totalPages,
                currentPage: pageNum,
                limit: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
            },
            data: results,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch products', details: error.message });
    }
});

// READ ONE: Fetch product by ID
router.get('/products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = Number(req.params.id);
        const [product] = await db.select().from(products).where(eq(products.id, productId));

        if (!product) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json(product);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch product', details: error.message });
    }
});

// UPDATE: Update product stock or details
router.put('/products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = Number(req.params.id);
        const {
            serialNumber,
            brand,
            productType,
            subType,
            modelNumber,
            stock,
            sku,
            unitPrice,
            costPrice,
            taxRate,
            specs,
        } = req.body;

        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
        if (brand !== undefined) updateData.brand = brand;
        if (productType !== undefined) updateData.productType = productType;
        if (subType !== undefined) updateData.subType = subType;
        if (modelNumber !== undefined) updateData.modelNumber = modelNumber;
        if (stock !== undefined) updateData.stock = Number(stock);
        if (sku !== undefined) updateData.sku = sku;
        if (unitPrice !== undefined) updateData.unitPrice = String(unitPrice);
        if (costPrice !== undefined) updateData.costPrice = String(costPrice);
        if (taxRate !== undefined) updateData.taxRate = String(taxRate);
        if (specs !== undefined) updateData.specs = specs;

        const [updatedProduct] = await db
            .update(products)
            .set(updateData)
            .where(eq(products.id, productId))
            .returning();

        if (!updatedProduct) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json(updatedProduct);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update product', details: error.message });
    }
});

// DELETE: Delete a product
router.delete('/products/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const productId = Number(req.params.id);

        const [deletedProduct] = await db
            .delete(products)
            .where(eq(products.id, productId))
            .returning();

        if (!deletedProduct) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        res.json({ message: 'Product deleted successfully', product: deletedProduct });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete product', details: error.message });
    }
});



export default router;