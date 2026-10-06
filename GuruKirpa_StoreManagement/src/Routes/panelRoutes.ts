import { Router, type Request, type Response } from 'express';
import { db } from '../db/index.js';
import { panelProjects, panelBomItems, panelAuditLogs, products, stockAdjustments } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

const panelRouter = Router();

// =============================================
// AUTO-BOOTSTRAP DDL — Creates tables on startup
// =============================================
const bootstrapPanelTables = async () => {
    try {
        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE panel_type AS ENUM (
                    'PLC_PANEL', 'MCC_PANEL', 'APFC_PANEL', 'HMI_PANEL',
                    'VFD_PANEL', 'POWER_DISTRIBUTION_PANEL', 'CUSTOM_PANEL'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;

            DO $$ BEGIN
                CREATE TYPE panel_project_status AS ENUM (
                    'ORDER_BOOKED', 'MATERIAL_ISSUED', 'WIRING_ASSEMBLY',
                    'TESTING_QA', 'READY_FOR_DISPATCH', 'DELIVERED',
                    'ON_HOLD', 'CANCELLED'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;

            DO $$ BEGIN
                CREATE TYPE panel_bom_source AS ENUM (
                    'STORE_INVENTORY', 'PURCHASE_REQUIRED', 'ALREADY_PURCHASED'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;

            CREATE TABLE IF NOT EXISTS panel_projects (
                id SERIAL PRIMARY KEY,
                project_number VARCHAR(100) NOT NULL UNIQUE,
                client_name VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                client_phone VARCHAR(50) NOT NULL,
                client_email VARCHAR(255),
                client_gstin VARCHAR(20),
                site_address TEXT,
                panel_type panel_type NOT NULL,
                panel_description TEXT NOT NULL,
                specifications JSONB DEFAULT '{}',
                status panel_project_status NOT NULL DEFAULT 'ORDER_BOOKED',
                assigned_engineer VARCHAR(255),
                priority repair_priority NOT NULL DEFAULT 'NORMAL',
                notes TEXT,
                selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                bom_cost_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                other_costs NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
                tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                payment_status payment_status NOT NULL DEFAULT 'UNPAID',
                advance_received NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                delivery_challan_number VARCHAR(100),
                invoice_number VARCHAR(100),
                order_date TIMESTAMP NOT NULL DEFAULT NOW(),
                target_delivery_date TIMESTAMP,
                completed_date TIMESTAMP,
                delivered_date TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS panel_bom_items (
                id SERIAL PRIMARY KEY,
                panel_project_id INTEGER NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                component_name VARCHAR(255) NOT NULL,
                component_code VARCHAR(100),
                source panel_bom_source NOT NULL DEFAULT 'STORE_INVENTORY',
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                notes TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS panel_audit_logs (
                id SERIAL PRIMARY KEY,
                panel_project_id INTEGER NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                performed_by VARCHAR(255) DEFAULT 'Staff',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        console.log('[Panel Module] Tables bootstrapped successfully.');
    } catch (err) {
        console.error('[Panel Module] Bootstrap error:', err);
    }
};

bootstrapPanelTables();

// Helper — generate project number
const generateProjectNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const result = await db.execute(
        sql`SELECT COUNT(*) as count FROM panel_projects WHERE EXTRACT(YEAR FROM created_at) = ${year}`
    );
    const count = Number((result.rows[0] as any)?.count ?? 0);
    return `PANEL-${year}-${String(count + 1).padStart(4, '0')}`;
};

// =============================================
// ROUTES
// =============================================

// GET /api/panels — List all panel projects
panelRouter.get('/panels', async (req: Request, res: Response) => {
    try {
        const panels = await db
            .select()
            .from(panelProjects)
            .orderBy(desc(panelProjects.createdAt));
        res.json(panels);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/panels/:id — Get single panel with BOM and audit logs
panelRouter.get('/panels/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const [panel] = await db.select().from(panelProjects).where(eq(panelProjects.id, id));
        if (!panel) return res.status(404).json({ error: 'Panel project not found' });

        const bom = await db.select().from(panelBomItems).where(eq(panelBomItems.panelProjectId, id));
        const logs = await db
            .select()
            .from(panelAuditLogs)
            .where(eq(panelAuditLogs.panelProjectId, id))
            .orderBy(desc(panelAuditLogs.createdAt));

        res.json({ ...panel, bomItems: bom, auditLogs: logs });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/panels — Create new panel order
panelRouter.post('/panels', async (req: Request, res: Response) => {
    try {
        const {
            clientName, companyName, clientPhone, clientEmail, clientGstin, siteAddress,
            panelType, panelDescription, specifications,
            assignedEngineer, priority, notes,
            sellingPrice, laborCost, otherCosts, taxRate, advanceReceived,
            targetDeliveryDate,
        } = req.body;

        if (!clientName || !clientPhone || !panelType || !panelDescription) {
            return res.status(400).json({ error: 'clientName, clientPhone, panelType, panelDescription are required' });
        }

        const projectNumber = await generateProjectNumber();
        const taxAmt = (parseFloat(sellingPrice || 0) * parseFloat(taxRate || 18)) / 100;
        const grandTotal = parseFloat(sellingPrice || 0) + taxAmt;

        const [newPanel] = await db.insert(panelProjects).values({
            projectNumber,
            clientName,
            companyName,
            clientPhone,
            clientEmail,
            clientGstin,
            siteAddress,
            panelType,
            panelDescription,
            specifications: specifications || {},
            assignedEngineer,
            priority: priority || 'NORMAL',
            notes,
            sellingPrice: sellingPrice?.toString() || '0.00',
            laborCost: laborCost?.toString() || '0.00',
            otherCosts: otherCosts?.toString() || '0.00',
            taxRate: taxRate?.toString() || '18.00',
            taxAmount: taxAmt.toFixed(2),
            grandTotal: grandTotal.toFixed(2),
            advanceReceived: advanceReceived?.toString() || '0.00',
            targetDeliveryDate: targetDeliveryDate ? new Date(targetDeliveryDate) : undefined,
        }).returning();

        if (!newPanel) {
            return res.status(500).json({ error: 'Failed to create panel project' });
        }

        // Audit log
        await db.insert(panelAuditLogs).values({
            panelProjectId: newPanel.id,
            action: 'ORDER_BOOKED',
            description: `Panel order booked — ${panelType} for ${clientName} (${companyName || 'N/A'}). Selling price: ₹${sellingPrice || 0}.`,
            performedBy: 'Staff',
        });

        res.status(201).json(newPanel);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/panels/:id — Update panel project (status, billing, notes, etc.)
panelRouter.put('/panels/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const [existing] = await db.select().from(panelProjects).where(eq(panelProjects.id, id));
        if (!existing) return res.status(404).json({ error: 'Panel project not found' });

        const updates: Partial<typeof panelProjects.$inferInsert> = { updatedAt: new Date() };
        const auditDescParts: string[] = [];

        const fields = [
            'clientName', 'companyName', 'clientPhone', 'clientEmail', 'clientGstin', 'siteAddress',
            'panelDescription', 'specifications', 'assignedEngineer', 'priority', 'notes',
            'sellingPrice', 'laborCost', 'otherCosts', 'taxRate', 'advanceReceived',
            'paymentStatus', 'deliveryChallanNumber', 'invoiceNumber', 'targetDeliveryDate',
            'completedDate', 'deliveredDate',
        ];

        for (const f of fields) {
            if (req.body[f] !== undefined) {
                (updates as any)[f] = req.body[f];
            }
        }

        // Handle status change separately for audit + timestamps
        if (req.body.status && req.body.status !== existing.status) {
            (updates as any).status = req.body.status;
            auditDescParts.push(`Status changed from ${existing.status} → ${req.body.status}`);

            if (req.body.status === 'DELIVERED') {
                (updates as any).deliveredDate = new Date();
            }
            if (req.body.status === 'TESTING_QA') {
                (updates as any).completedDate = new Date();
            }
        }

        // Recalculate totals if billing changed
        const sp = parseFloat(String(updates.sellingPrice ?? existing.sellingPrice ?? 0));
        const tr = parseFloat(String(updates.taxRate ?? existing.taxRate ?? 18));
        const taxAmt = (sp * tr) / 100;
        (updates as any).taxAmount = taxAmt.toFixed(2);
        (updates as any).grandTotal = (sp + taxAmt).toFixed(2);

        const [updated] = await db.update(panelProjects).set(updates).where(eq(panelProjects.id, id)).returning();

        if (auditDescParts.length > 0) {
            await db.insert(panelAuditLogs).values({
                panelProjectId: id,
                action: req.body.status ? 'STATUS_CHANGE' : 'DETAILS_UPDATED',
                description: auditDescParts.join('; ') || 'Project details updated.',
                performedBy: req.body.performedBy || 'Staff',
            });
        }

        res.json(updated);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/panels/:id/bom — Add BOM item (auto STOCK_OUT if from store)
panelRouter.post('/panels/:id/bom', async (req: Request, res: Response) => {
    try {
        const panelId = Number(req.params.id);
        const [panel] = await db.select().from(panelProjects).where(eq(panelProjects.id, panelId));
        if (!panel) return res.status(404).json({ error: 'Panel project not found' });

        const { productId, componentName, componentCode, source, quantity, unitCost, notes } = req.body;

        if (!componentName || !quantity || !unitCost) {
            return res.status(400).json({ error: 'componentName, quantity, unitCost are required' });
        }

        const qty = parseInt(quantity);
        const uc = parseFloat(unitCost);
        const totalCost = qty * uc;

        // If from store inventory, validate and deduct stock
        if (source === 'STORE_INVENTORY' && productId) {
            const [product] = await db.select().from(products).where(eq(products.id, productId));
            if (!product) return res.status(404).json({ error: 'Product not found in store' });
            if (product.stock < qty) {
                return res.status(400).json({
                    error: `Insufficient stock. Available: ${product.stock}, Requested: ${qty}`
                });
            }

            const newStock = product.stock - qty;
            await db.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, productId));

            await db.insert(stockAdjustments).values({
                productId,
                adjustmentType: 'STOCK_OUT',
                quantityChange: -qty,
                previousStock: product.stock,
                newStock,
                reason: `Issued for Panel Project: ${panel.projectNumber} — ${componentName}`,
            });
        }

        const [bomItem] = await db.insert(panelBomItems).values({
            panelProjectId: panelId,
            productId: (source === 'STORE_INVENTORY' && productId) ? productId : null,
            componentName,
            componentCode,
            source: source || 'STORE_INVENTORY',
            quantity: qty,
            unitCost: uc.toFixed(2),
            totalCost: totalCost.toFixed(2),
            notes,
        }).returning();

        // Recalculate BOM cost total
        const allBom = await db.select().from(panelBomItems).where(eq(panelBomItems.panelProjectId, panelId));
        const newBomCostTotal = allBom.reduce((sum, item) => sum + parseFloat(String(item.totalCost)), 0);
        await db.update(panelProjects)
            .set({ bomCostTotal: newBomCostTotal.toFixed(2), updatedAt: new Date() })
            .where(eq(panelProjects.id, panelId));

        // Audit log
        await db.insert(panelAuditLogs).values({
            panelProjectId: panelId,
            action: 'BOM_ITEM_ADDED',
            description: `BOM item added: ${componentName} × ${qty} @ ₹${uc} = ₹${totalCost.toFixed(2)}. Source: ${source}${productId ? ` (Store Stock deducted)` : ''}.`,
            performedBy: req.body.performedBy || 'Staff',
        });

        res.status(201).json({ bomItem, newBomCostTotal: newBomCostTotal.toFixed(2) });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/panels/:id/bom/:itemId — Remove BOM item (restore stock if from store)
panelRouter.delete('/panels/:id/bom/:itemId', async (req: Request, res: Response) => {
    try {
        const panelId = Number(req.params.id);
        const itemId = Number(req.params.itemId);

        const [bomItem] = await db.select().from(panelBomItems).where(eq(panelBomItems.id, itemId));
        if (!bomItem) return res.status(404).json({ error: 'BOM item not found' });

        // Restore stock if it was from store inventory
        if (bomItem.source === 'STORE_INVENTORY' && bomItem.productId) {
            const [product] = await db.select().from(products).where(eq(products.id, bomItem.productId));
            if (product) {
                const restoredStock = product.stock + bomItem.quantity;
                await db.update(products)
                    .set({ stock: restoredStock, updatedAt: new Date() })
                    .where(eq(products.id, bomItem.productId));

                await db.insert(stockAdjustments).values({
                    productId: bomItem.productId,
                    adjustmentType: 'STOCK_IN',
                    quantityChange: bomItem.quantity,
                    previousStock: product.stock,
                    newStock: restoredStock,
                    reason: `BOM item removed from Panel Project: ${panelId} — stock restored`,
                });
            }
        }

        await db.delete(panelBomItems).where(eq(panelBomItems.id, itemId));

        // Recalculate BOM cost total
        const remaining = await db.select().from(panelBomItems).where(eq(panelBomItems.panelProjectId, panelId));
        const newBomCostTotal = remaining.reduce((sum, item) => sum + parseFloat(String(item.totalCost)), 0);
        await db.update(panelProjects)
            .set({ bomCostTotal: newBomCostTotal.toFixed(2), updatedAt: new Date() })
            .where(eq(panelProjects.id, panelId));

        await db.insert(panelAuditLogs).values({
            panelProjectId: panelId,
            action: 'BOM_ITEM_REMOVED',
            description: `BOM item removed: ${bomItem.componentName} × ${bomItem.quantity}. ${bomItem.source === 'STORE_INVENTORY' ? 'Stock restored.' : ''}`,
            performedBy: 'Staff',
        });

        res.json({ message: 'BOM item removed', newBomCostTotal: newBomCostTotal.toFixed(2) });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/panels/:id/audit-logs — Get audit trail
panelRouter.get('/panels/:id/audit-logs', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const logs = await db
            .select()
            .from(panelAuditLogs)
            .where(eq(panelAuditLogs.panelProjectId, id))
            .orderBy(desc(panelAuditLogs.createdAt));
        res.json(logs);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/panels/:id — Delete entire panel project (admin only)
panelRouter.delete('/panels/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const [panel] = await db.select().from(panelProjects).where(eq(panelProjects.id, id));
        if (!panel) return res.status(404).json({ error: 'Panel project not found' });
        await db.delete(panelProjects).where(eq(panelProjects.id, id));
        res.json({ message: `Panel project ${panel.projectNumber} deleted.` });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default panelRouter;
