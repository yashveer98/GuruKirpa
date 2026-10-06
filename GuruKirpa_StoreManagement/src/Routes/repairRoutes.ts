import { Router, type Request, type Response } from 'express';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { repairs, repairParts, repairAuditLogs, products, stockAdjustments } from '../db/schema.js';

const router = Router();

// Auto-bootstrap tables safely if not exist
let tablesInitialized = false;
async function ensureTablesExist() {
    if (tablesInitialized) return;
    try {
        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE repair_status AS ENUM ('RECEIVED', 'IN_DIAGNOSIS', 'ESTIMATION_SENT', 'IN_REPAIR', 'WAITING_FOR_PARTS', 'TESTING', 'READY_FOR_PICKUP', 'DELIVERED', 'UNREPAIRABLE_RETURN', 'SCRAP');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            DO $$ BEGIN
                CREATE TYPE repair_priority AS ENUM ('NORMAL', 'HIGH', 'URGENT');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;

            CREATE TABLE IF NOT EXISTS repairs (
                id SERIAL PRIMARY KEY,
                job_card_number VARCHAR(100) NOT NULL UNIQUE,
                customer_name VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                customer_phone VARCHAR(50) NOT NULL,
                customer_email VARCHAR(255),
                customer_gstin VARCHAR(20),
                device_type VARCHAR(100) NOT NULL DEFAULT 'AC Drive',
                brand VARCHAR(100) NOT NULL DEFAULT 'Generic',
                model_number VARCHAR(255) NOT NULL,
                serial_number VARCHAR(255) NOT NULL,
                physical_condition TEXT,
                reported_fault TEXT NOT NULL,
                priority repair_priority NOT NULL DEFAULT 'NORMAL',
                assigned_technician VARCHAR(255),
                diagnosis_observations TEXT,
                is_repairable VARCHAR(10) NOT NULL DEFAULT 'YES',
                repair_notes TEXT,
                status repair_status NOT NULL DEFAULT 'RECEIVED',
                estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
                service_charge NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
                parts_cost NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
                tax_rate NUMERIC(5, 2) NOT NULL DEFAULT '18.00',
                tax_amount NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
                grand_total NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
                payment_status payment_status NOT NULL DEFAULT 'UNPAID',
                warranty_months INTEGER NOT NULL DEFAULT 1,
                delivery_challan_number VARCHAR(100),
                invoice_number VARCHAR(100),
                received_date TIMESTAMP NOT NULL DEFAULT NOW(),
                estimated_delivery_date TIMESTAMP,
                completed_date TIMESTAMP,
                delivered_date TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS repair_parts (
                id SERIAL PRIMARY KEY,
                repair_id INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                part_name VARCHAR(255) NOT NULL,
                part_number VARCHAR(255),
                source VARCHAR(50) NOT NULL DEFAULT 'STORE_INVENTORY',
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_cost NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
                total_cost NUMERIC(12, 2) NOT NULL DEFAULT '0.00',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS repair_audit_logs (
                id SERIAL PRIMARY KEY,
                repair_id INTEGER NOT NULL REFERENCES repairs(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                performed_by VARCHAR(255) DEFAULT 'Staff',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        tablesInitialized = true;
    } catch (err: any) {
        console.error('Error ensuring repair tables exist:', err.message);
    }
}

// 1. POST /api/repairs — Inward Equipment Drop-off / Create Job Card
router.post('/repairs', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const {
            customerName,
            companyName,
            customerPhone,
            customerEmail,
            customerGstin,
            deviceType = 'AC Drive',
            brand = 'Generic',
            modelNumber,
            serialNumber,
            physicalCondition,
            reportedFault,
            priority = 'NORMAL',
            estimatedCost = '0.00',
            estimatedDeliveryDate,
        } = req.body;

        if (!customerName || !customerPhone || !modelNumber || !serialNumber || !reportedFault) {
            res.status(400).json({
                error: 'Customer Name, Phone, Model Number, Serial Number, and Reported Fault are required',
            });
            return;
        }

        const jobCardNumber = `JOB-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

        const [newRepair] = await db
            .insert(repairs)
            .values({
                jobCardNumber,
                customerName,
                companyName: companyName || null,
                customerPhone,
                customerEmail: customerEmail || null,
                customerGstin: customerGstin || null,
                deviceType,
                brand,
                modelNumber,
                serialNumber,
                physicalCondition: physicalCondition || null,
                reportedFault,
                priority: priority as any,
                estimatedCost: String(estimatedCost || '0.00'),
                estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
                status: 'RECEIVED',
            })
            .returning();

        if (!newRepair) {
            res.status(500).json({ error: 'Failed to create repair job-card' });
            return;
        }

        // Add Initial Audit Trail Log
        await db.insert(repairAuditLogs).values({
            repairId: newRepair.id,
            action: 'INWARD_RECEIVED',
            description: `Equipment ${brand} ${modelNumber} (SN: ${serialNumber}) received in store from ${customerName}. Fault: "${reportedFault}". Priority: ${priority}.`,
            performedBy: 'Store Inward',
        });

        res.status(201).json({
            message: 'Job-Card created successfully',
            repair: newRepair,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to create job-card', details: error.message });
    }
});

// 2. GET /api/repairs — List all repair jobs
router.get('/repairs', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const { search, status, brand, priority, limit = '100', page = '1' } = req.query;

        const conditions: any[] = [];

        if (status && typeof status === 'string' && status !== 'ALL') {
            conditions.push(eq(repairs.status, status as any));
        }

        if (brand && typeof brand === 'string' && brand !== 'ALL') {
            conditions.push(ilike(repairs.brand, `%${brand}%`));
        }

        if (priority && typeof priority === 'string' && priority !== 'ALL') {
            conditions.push(eq(repairs.priority, priority as any));
        }

        if (search && typeof search === 'string' && search.trim()) {
            const q = search.trim();
            conditions.push(
                or(
                    ilike(repairs.jobCardNumber, `%${q}%`),
                    ilike(repairs.customerName, `%${q}%`),
                    ilike(repairs.companyName, `%${q}%`),
                    ilike(repairs.customerPhone, `%${q}%`),
                    ilike(repairs.serialNumber, `%${q}%`),
                    ilike(repairs.modelNumber, `%${q}%`)
                )!
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 100));
        const offsetNum = (pageNum - 1) * limitNum;

        const [countResult] = await db
            .select({ totalCount: sql<number>`count(*)::int` })
            .from(repairs)
            .where(whereClause);
        const totalCount = countResult?.totalCount ?? 0;

        const repairsList = await db
            .select()
            .from(repairs)
            .where(whereClause)
            .orderBy(desc(repairs.createdAt))
            .limit(limitNum)
            .offset(offsetNum);

        res.json({
            pagination: {
                totalRecords: totalCount,
                totalPages: Math.ceil(totalCount / limitNum),
                currentPage: pageNum,
                limit: limitNum,
            },
            data: repairsList,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch repairs', details: error.message });
    }
});

// 3. GET /api/repairs/:id — Fetch Single Repair Job with Parts & Audit Logs
router.get('/repairs/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const repairId = Number(req.params.id);
        if (isNaN(repairId)) {
            res.status(400).json({ error: 'Invalid repair ID' });
            return;
        }

        const [repair] = await db
            .select()
            .from(repairs)
            .where(eq(repairs.id, repairId));

        if (!repair) {
            res.status(404).json({ error: 'Repair job not found' });
            return;
        }

        const parts = await db
            .select()
            .from(repairParts)
            .where(eq(repairParts.repairId, repairId));

        const auditLogs = await db
            .select()
            .from(repairAuditLogs)
            .where(eq(repairAuditLogs.repairId, repairId))
            .orderBy(desc(repairAuditLogs.createdAt));

        res.json({ ...repair, parts, auditLogs });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch repair job', details: error.message });
    }
});

// 4. PUT /api/repairs/:id — Update Repair Details, Diagnosis & Log Audit Trail
router.put('/repairs/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const repairId = Number(req.params.id);
        if (isNaN(repairId)) {
            res.status(400).json({ error: 'Invalid repair ID' });
            return;
        }

        const [existingRepair] = await db
            .select()
            .from(repairs)
            .where(eq(repairs.id, repairId));

        if (!existingRepair) {
            res.status(404).json({ error: 'Repair job not found' });
            return;
        }

        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.jobCardNumber;
        delete updateData.createdAt;

        // Auto timestamp dates based on status change
        if (updateData.status === 'READY_FOR_PICKUP' && !existingRepair.completedDate) {
            updateData.completedDate = new Date();
        }
        if (updateData.status === 'DELIVERED' && !existingRepair.deliveredDate) {
            updateData.deliveredDate = new Date();
        }

        // Calculate grand total if serviceCharge or partsCost updated
        if (updateData.serviceCharge !== undefined || updateData.partsCost !== undefined) {
            const service = Number(updateData.serviceCharge ?? existingRepair.serviceCharge);
            const parts = Number(updateData.partsCost ?? existingRepair.partsCost);
            const taxRate = Number(updateData.taxRate ?? existingRepair.taxRate);
            const subtotal = service + parts;
            const taxAmount = (subtotal * taxRate) / 100;
            const grandTotal = subtotal + taxAmount;

            updateData.taxAmount = taxAmount.toFixed(2);
            updateData.grandTotal = grandTotal.toFixed(2);
        }

        updateData.updatedAt = new Date();

        const [updatedRepair] = await db
            .update(repairs)
            .set(updateData)
            .where(eq(repairs.id, repairId))
            .returning();

        // Audit Logging for Status Change or Diagnosis
        if (updateData.status && updateData.status !== existingRepair.status) {
            await db.insert(repairAuditLogs).values({
                repairId,
                action: 'STATUS_CHANGED',
                description: `Status progressed from ${existingRepair.status} to ${updateData.status}.`,
                performedBy: updateData.assignedTechnician || 'Workshop',
            });
        }

        if (updateData.diagnosisObservations && updateData.diagnosisObservations !== existingRepair.diagnosisObservations) {
            await db.insert(repairAuditLogs).values({
                repairId,
                action: 'DIAGNOSIS_LOGGED',
                description: `Diagnostic notes logged: "${updateData.diagnosisObservations}". Repairable: ${updateData.isRepairable || 'YES'}.`,
                performedBy: updateData.assignedTechnician || 'Technician',
            });
        }

        if (updateData.deliveryChallanNumber && updateData.deliveryChallanNumber !== existingRepair.deliveryChallanNumber) {
            await db.insert(repairAuditLogs).values({
                repairId,
                action: 'DISPATCHED_OUTWARD',
                description: `Unit outward dispatch recorded on Delivery Challan #${updateData.deliveryChallanNumber}.`,
                performedBy: 'Store Dispatch',
            });
        }

        res.json({ message: 'Repair updated successfully', repair: updatedRepair });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to update repair', details: error.message });
    }
});

// 5. POST /api/repairs/:id/parts — Add Replaced Spare Part with Store Inventory Deduction
router.post('/repairs/:id/parts', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const repairId = Number(req.params.id);
        const {
            productId,
            partName,
            partNumber,
            source = 'STORE_INVENTORY',
            quantity = 1,
            unitCost = '0.00',
        } = req.body;

        if (!partName) {
            res.status(400).json({ error: 'Part name is required' });
            return;
        }

        const [currentRepair] = await db
            .select()
            .from(repairs)
            .where(eq(repairs.id, repairId));

        if (!currentRepair) {
            res.status(404).json({ error: 'Repair job not found' });
            return;
        }

        const qtyNum = Math.max(1, Number(quantity) || 1);
        const unitCostNum = Number(unitCost) || 0;
        const totalCost = (qtyNum * unitCostNum).toFixed(2);

        // 1. If picked from Store Inventory, check stock and deduct!
        if (productId && source === 'STORE_INVENTORY') {
            const [storeProduct] = await db
                .select()
                .from(products)
                .where(eq(products.id, productId));

            if (storeProduct) {
                if (storeProduct.stock < qtyNum) {
                    res.status(400).json({
                        error: `Insufficient stock for ${storeProduct.modelNumber}. Available: ${storeProduct.stock}, Requested: ${qtyNum}`,
                    });
                    return;
                }

                const newStock = storeProduct.stock - qtyNum;

                // Deduct Product Stock
                await db
                    .update(products)
                    .set({ stock: newStock, updatedAt: new Date() })
                    .where(eq(products.id, storeProduct.id));

                // Record in Stock Movements History
                await db.insert(stockAdjustments).values({
                    productId: storeProduct.id,
                    adjustmentType: 'STOCK_OUT',
                    quantityChange: -qtyNum,
                    previousStock: storeProduct.stock,
                    newStock,
                    reason: `Used in Repair Job ${currentRepair.jobCardNumber}`,
                });
            }
        }

        // 2. Insert Part into repair_parts
        const [newPart] = await db
            .insert(repairParts)
            .values({
                repairId,
                productId: productId || null,
                partName,
                partNumber: partNumber || null,
                source,
                quantity: qtyNum,
                unitCost: unitCostNum.toFixed(2),
                totalCost,
            })
            .returning();

        // 3. Recalculate total partsCost for this repair
        const allParts = await db
            .select()
            .from(repairParts)
            .where(eq(repairParts.repairId, repairId));

        const totalPartsCost = allParts.reduce((acc, p) => acc + Number(p.totalCost), 0);

        const service = Number(currentRepair.serviceCharge) || 0;
        const taxRate = Number(currentRepair.taxRate) || 18;
        const subtotal = service + totalPartsCost;
        const taxAmount = (subtotal * taxRate) / 100;
        const grandTotal = subtotal + taxAmount;

        await db
            .update(repairs)
            .set({
                partsCost: totalPartsCost.toFixed(2),
                taxAmount: taxAmount.toFixed(2),
                grandTotal: grandTotal.toFixed(2),
                updatedAt: new Date(),
            })
            .where(eq(repairs.id, repairId));

        // 4. Audit Log for part addition
        const deductionNote = productId && source === 'STORE_INVENTORY'
            ? ' (Deducted from Store Inventory)'
            : source === 'NEEDS_PROCUREMENT'
                ? ' (Marked for Purchase Reorder)'
                : '';

        await db.insert(repairAuditLogs).values({
            repairId,
            action: 'PART_ADDED',
            description: `Spare part logged: ${partName} (Qty: ${qtyNum}) @ ₹${unitCostNum}${deductionNote}. Total: ₹${totalCost}.`,
            performedBy: 'Technician / Store',
        });

        res.status(201).json({ message: 'Part added successfully and inventory synced', part: newPart });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to add spare part', details: error.message });
    }
});

// 6. DELETE /api/repairs/:id/parts/:partId — Remove Spare Part & Restore Stock if from Inventory
router.delete('/repairs/:id/parts/:partId', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const repairId = Number(req.params.id);
        const partId = Number(req.params.partId);

        const [partToDelete] = await db
            .select()
            .from(repairParts)
            .where(and(eq(repairParts.id, partId), eq(repairParts.repairId, repairId)));

        if (!partToDelete) {
            res.status(404).json({ error: 'Part not found' });
            return;
        }

        const [currentRepair] = await db
            .select()
            .from(repairs)
            .where(eq(repairs.id, repairId));

        // Restore Store Stock if it was deducted from inventory
        if (partToDelete.productId && partToDelete.source === 'STORE_INVENTORY') {
            const [storeProduct] = await db
                .select()
                .from(products)
                .where(eq(products.id, partToDelete.productId));

            if (storeProduct) {
                const restoredStock = storeProduct.stock + partToDelete.quantity;

                await db
                    .update(products)
                    .set({ stock: restoredStock, updatedAt: new Date() })
                    .where(eq(products.id, storeProduct.id));

                await db.insert(stockAdjustments).values({
                    productId: storeProduct.id,
                    adjustmentType: 'STOCK_IN',
                    quantityChange: partToDelete.quantity,
                    previousStock: storeProduct.stock,
                    newStock: restoredStock,
                    reason: `Restored from Repair Job ${currentRepair?.jobCardNumber || repairId}`,
                });
            }
        }

        // Delete Part
        await db.delete(repairParts).where(eq(repairParts.id, partId));

        // Recalculate partsCost
        const allParts = await db
            .select()
            .from(repairParts)
            .where(eq(repairParts.repairId, repairId));

        const totalPartsCost = allParts.reduce((acc, p) => acc + Number(p.totalCost), 0);

        if (currentRepair) {
            const service = Number(currentRepair.serviceCharge) || 0;
            const taxRate = Number(currentRepair.taxRate) || 18;
            const subtotal = service + totalPartsCost;
            const taxAmount = (subtotal * taxRate) / 100;
            const grandTotal = subtotal + taxAmount;

            await db
                .update(repairs)
                .set({
                    partsCost: totalPartsCost.toFixed(2),
                    taxAmount: taxAmount.toFixed(2),
                    grandTotal: grandTotal.toFixed(2),
                    updatedAt: new Date(),
                })
                .where(eq(repairs.id, repairId));
        }

        // Audit Log
        await db.insert(repairAuditLogs).values({
            repairId,
            action: 'PART_REMOVED',
            description: `Part ${partToDelete.partName} (Qty: ${partToDelete.quantity}) removed from job-card.`,
            performedBy: 'Technician / Store',
        });

        res.json({ message: 'Part removed and store inventory restored successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete part', details: error.message });
    }
});

// 7. GET /api/repairs/:id/audit-logs — Get Full Chronological Audit Trail
router.get('/repairs/:id/audit-logs', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const repairId = Number(req.params.id);
        const logs = await db
            .select()
            .from(repairAuditLogs)
            .where(eq(repairAuditLogs.repairId, repairId))
            .orderBy(desc(repairAuditLogs.createdAt));

        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
    }
});

// 8. DELETE /api/repairs/:id — Delete Repair Job
router.delete('/repairs/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        await ensureTablesExist();
        const repairId = Number(req.params.id);
        await db.delete(repairs).where(eq(repairs.id, repairId));
        res.json({ message: 'Repair job deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete repair job', details: error.message });
    }
});

export default router;
