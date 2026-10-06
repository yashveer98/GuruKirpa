import { Router, type Request, type Response } from 'express';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, salesOrders, orderItems, stockAdjustments } from '../db/schema.js';
import PDFDocument from 'pdfkit';
import { generateInvoicePdf } from '../utils/generateInvoicePdf.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// POST /api/orders — Create Customer Invoice & Deduct Stock
router.post('/orders', async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerName, customerGstin, items, notes } = req.body;
        // items shape: [{ productId: 1, quantity: 2 }, { productId: 3, quantity: 1 }]

        if (!customerName || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'Customer name and order items are required' });
            return;
        }

        const createdOrder = await db.transaction(async (tx) => {
            const productIds = items.map((item) => item.productId);
            const dbProducts = await tx.select().from(products).where(inArray(products.id, productIds));

            if (dbProducts.length !== productIds.length) {
                throw new Error('INVALID_PRODUCT_ID');
            }

            let subtotal = 0;
            let totalTax = 0;
            const orderItemsToInsert: Array<any> = [];

            // Validate stock availability and calculate prices
            for (const item of items) {
                const product = dbProducts.find((p) => p.id === item.productId)!;

                if (product.stock < item.quantity) {
                    throw new Error(`INSUFFICIENT_STOCK_${product.modelNumber}`);
                }

                const price = Number(product.unitPrice);
                const taxRate = Number(product.taxRate);
                const itemSubtotal = price * item.quantity;
                const itemTax = (itemSubtotal * taxRate) / 100;

                subtotal += itemSubtotal;
                totalTax += itemTax;

                orderItemsToInsert.push({
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice: String(price),
                    taxRate: String(taxRate),
                    totalAmount: (itemSubtotal + itemTax).toFixed(2),
                });
            }

            const grandTotal = subtotal + totalTax;
            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

            // 1. Create Sales Order
            const [newOrder] = await tx
                .insert(salesOrders)
                .values({
                    invoiceNumber,
                    customerName,
                    customerGstin: customerGstin || null,
                    subtotal: subtotal.toFixed(2),
                    taxAmount: totalTax.toFixed(2),
                    grandTotal: grandTotal.toFixed(2),
                    notes: notes || null,
                })
                .returning();
            if (!newOrder) {
                throw new Error('FAILED_TO_CREATE_ORDER');
            }

            // 2. Attach Line Items
            const itemsWithOrderId = orderItemsToInsert.map((item) => ({
                ...item,
                orderId: newOrder.id,
            }));
            await tx.insert(orderItems).values(itemsWithOrderId);

            // 3. Deduct Stock & Record Movement Audits
            for (const item of items) {
                const product = dbProducts.find((p) => p.id === item.productId)!;
                const newStock = product.stock - item.quantity;

                await tx
                    .update(products)
                    .set({ stock: newStock, updatedAt: new Date() })
                    .where(eq(products.id, product.id));

                await tx.insert(stockAdjustments).values({
                    productId: product.id,
                    adjustmentType: 'STOCK_OUT',
                    quantityChange: -item.quantity,
                    previousStock: product.stock,
                    newStock,
                    reason: `Invoice ${newOrder.invoiceNumber}`,
                });
            }

            return newOrder;
        });

        res.status(201).json({ message: 'Invoice created successfully', order: createdOrder });
    } catch (error: any) {
        if (error.message === 'INVALID_PRODUCT_ID') {
            res.status(400).json({ error: 'One or more product IDs are invalid' });
            return;
        }
        if (error.message.startsWith('INSUFFICIENT_STOCK_')) {
            const model = error.message.replace('INSUFFICIENT_STOCK_', '');
            res.status(400).json({ error: `Insufficient stock for model: ${model}` });
            return;
        }
        res.status(500).json({ error: 'Failed to create sales order', details: error.message });
    }
});

// GET /api/orders/:id/pdf — Stream printable PDF invoice
router.get('/orders/:id/pdf', async (req: Request, res: Response): Promise<void> => {
    try {
        const orderId = Number(req.params.id);

        if (isNaN(orderId)) {
            res.status(400).json({ error: 'Invalid order ID' });
            return;
        }

        // 1. Fetch Order Header
        const [order] = await db
            .select()
            .from(salesOrders)
            .where(eq(salesOrders.id, orderId));

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        // 2. Fetch Line Items with Products
        const items = await db
            .select({
                quantity: orderItems.quantity,
                unitPrice: orderItems.unitPrice,
                taxRate: orderItems.taxRate,
                totalAmount: orderItems.totalAmount,
                product: {
                    modelNumber: products.modelNumber,
                    brand: products.brand,
                    serialNumber: products.serialNumber,
                },
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, orderId));

        // 3. Generate PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        generateInvoicePdf(doc, { ...order, items }, res);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to generate PDF invoice', details: error.message });
    }
});

// GET /api/orders — List all sales orders with filtering & search
router.get('/orders', async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, paymentStatus, orderStatus, limit = '100', page = '1' } = req.query;

        const conditions: any[] = [];

        if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'ALL') {
            conditions.push(eq(salesOrders.paymentStatus, paymentStatus as any));
        }

        if (orderStatus && typeof orderStatus === 'string' && orderStatus !== 'ALL') {
            conditions.push(eq(salesOrders.orderStatus, orderStatus as any));
        }

        if (search && typeof search === 'string' && search.trim()) {
            const q = search.trim();
            conditions.push(
                or(
                    ilike(salesOrders.invoiceNumber, `%${q}%`),
                    ilike(salesOrders.customerName, `%${q}%`),
                    ilike(salesOrders.customerGstin, `%${q}%`)
                )!
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 100));
        const offsetNum = (pageNum - 1) * limitNum;

        const [countResult] = await db
            .select({ totalCount: sql<number>`count(*)::int` })
            .from(salesOrders)
            .where(whereClause);
        const totalCount = countResult?.totalCount ?? 0;

        const ordersList = await db
            .select()
            .from(salesOrders)
            .where(whereClause)
            .orderBy(desc(salesOrders.createdAt))
            .limit(limitNum)
            .offset(offsetNum);

        res.json({
            pagination: {
                totalRecords: totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                currentPage: pageNum,
                limit: limitNum,
            },
            data: ordersList,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch sales orders', details: error.message });
    }
});

// GET /api/orders/:id — Get Full Invoice with Line Items & Products
router.get('/orders/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const orderId = Number(req.params.id);
        if (isNaN(orderId)) {
            res.status(400).json({ error: 'Invalid order ID' });
            return;
        }
        const [order] = await db
            .select()
            .from(salesOrders)
            .where(eq(salesOrders.id, orderId));

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const items = await db
            .select({
                id: orderItems.id,
                quantity: orderItems.quantity,
                unitPrice: orderItems.unitPrice,
                taxRate: orderItems.taxRate,
                totalAmount: orderItems.totalAmount,
                product: {
                    id: products.id,
                    serialNumber: products.serialNumber,
                    brand: products.brand,
                    modelNumber: products.modelNumber,
                    productType: products.productType,
                    subType: products.subType,
                    sku: products.sku,
                },
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, orderId));

        res.json({ ...order, items });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch order', details: error.message });
    }
});

// PATCH /api/orders/:id/payment-status — Update payment status
router.patch('/orders/:id/payment-status', async (req: Request, res: Response): Promise<void> => {
    try {
        const orderId = Number(req.params.id);
        const { paymentStatus } = req.body;

        if (!['PAID', 'UNPAID', 'PARTIAL'].includes(paymentStatus)) {
            res.status(400).json({ error: 'Invalid payment status' });
            return;
        }

        const [updatedOrder] = await db
            .update(salesOrders)
            .set({ paymentStatus, updatedAt: new Date() })
            .where(eq(salesOrders.id, orderId))
            .returning();

        if (!updatedOrder) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        res.json({ message: 'Payment status updated', order: updatedOrder });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update payment status', details: error.message });
    }
});

export default router;