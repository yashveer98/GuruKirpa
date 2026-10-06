import { relations } from 'drizzle-orm/_relations';
import { pgTable, serial, varchar, integer, pgEnum, timestamp, text, numeric, jsonb } from 'drizzle-orm/pg-core';

// 1. Define the PostgreSQL Enum for Product Types
export const productTypeEnum = pgEnum('product_type', [
    'ac_drive',
    'dc_drive',
    'servo_drive',
    'motor',
    'switch_gear',
    'panel_accessory',
    'dbr',
    'dbu',
    'line_choke',
    'capacitor',
    'reactor',
    'ct',
]);

// 2. Define the Products Table
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    serialNumber: varchar('serial_number', { length: 255 }).notNull().unique(),
    brand: varchar('brand', { length: 255 }).notNull().default('Generic'),
    productType: productTypeEnum('product_type').notNull(),
    subType: varchar('sub_type', { length: 255 }),
    modelNumber: varchar('model_number', { length: 255 }).notNull(),
    stock: integer('stock').notNull().default(0),
    sku: varchar('sku', { length: 100 }), // Optional column (nullable by default)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Pricing Fields (Stored as high-precision decimals)
    costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('18.00'),
    // Flexible JSONB column for technical specifications
    // e.g. { "powerKw": 2.2, "voltage": "415V", "phase": 3, "currentAmp": 5.5 }
    specs: jsonb('specs').$type<Record<string, any>>().default({}),

});

// 2. Enum for adjustment reasons
export const stockAdjustmentTypeEnum = pgEnum('stock_adjustment_type', [
    'STOCK_IN',      // New inventory arrived
    'STOCK_OUT',     // Sold / Shipped out
    'DAMAGE',        // Damaged / Scrapped
    'CORRECTION'     // Manual audit count correction
]);

// 3. New Table: Stock Adjustments (Foreign Key -> Products)
export const stockAdjustments = pgTable('stock_adjustments', {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade' }), // 👈 Foreign Key Constraint
    adjustmentType: stockAdjustmentTypeEnum('adjustment_type').notNull(),
    quantityChange: integer('quantity_change').notNull(), // e.g., +10 or -5
    previousStock: integer('previous_stock').notNull(),
    newStock: integer('new_stock').notNull(),
    reason: text('reason'), // Optional notes like "Invoice #1092" or "Broken during transit"
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Drizzle Relations Setup
export const productsRelations = relations(products, ({ many }) => ({
    adjustments: many(stockAdjustments),
}));

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
    product: one(products, {
        fields: [stockAdjustments.productId],
        references: [products.id],
    }),
}));


// 1. Payment & Order Enums
export const paymentStatusEnum = pgEnum('payment_status', ['UNPAID', 'PARTIAL', 'PAID']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'COMPLETED', 'CANCELLED']);

// 2. Sales Orders Table (Invoice Header)
export const salesOrders = pgTable('sales_orders', {
    id: serial('id').primaryKey(),
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(), // e.g. "INV-2026-0001"
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerGstin: varchar('customer_gstin', { length: 15 }), // Optional GSTIN for B2B billing

    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0.00'),

    paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
    orderStatus: orderStatusEnum('order_status').notNull().default('PENDING'),
    notes: text('notes'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Order Items Table (Line Items with Foreign Keys -> salesOrders & products)
export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
        .notNull()
        .references(() => salesOrders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'restrict' }), // Prevents deleting product if attached to an invoice

    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(), // Historical price at sale
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('18.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
});

// 4. Drizzle Relational Mappings
export const salesOrdersRelations = relations(salesOrders, ({ many }) => ({
    items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(salesOrders, {
        fields: [orderItems.orderId],
        references: [salesOrders.id],
    }),
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id],
    }),
}));

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'STORE_KEEPER', 'SALES_FINANCE', 'LAB_TECHNICIAN']);

// 2. Users Table
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(), // Hashed with bcrypt
    role: userRoleEnum('role').notNull().default('STORE_KEEPER'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Types
export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustments.$inferInsert;

// TypeScript Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// Insert and Select Types for Sales Orders
export type SalesOrder = typeof salesOrders.$inferSelect;
export type NewSalesOrder = typeof salesOrders.$inferInsert;

// Insert and Select Types for Order Items
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// Composite type for fully populated Invoice responses (Order + Line Items)
export type SalesOrderWithItems = SalesOrder & {
    items: (OrderItem & {
        product: typeof products.$inferSelect;
    })[];
};

// ==========================================
// 5. INDUSTRIAL REPAIR & SERVICE MANAGEMENT
// ==========================================

export const repairStatusEnum = pgEnum('repair_status', [
    'RECEIVED',            // Inward logged, awaiting inspection
    'IN_DIAGNOSIS',       // Under diagnostic testing
    'ESTIMATION_SENT',    // Quotation shared with customer
    'IN_REPAIR',          // Repair approved and underway
    'WAITING_FOR_PARTS',  // Waiting for spare components
    'TESTING',            // Motor bench load testing
    'READY_FOR_PICKUP',   // Repaired & tested, customer notified
    'DELIVERED',          // Invoiced/Challan issued, handed over
    'UNREPAIRABLE_RETURN',// Cannot be repaired / rejected by client
    'SCRAP',              // Disposed/Scrapped
]);

export const repairPriorityEnum = pgEnum('repair_priority', ['NORMAL', 'HIGH', 'URGENT']);

// Repairs Table (Job-Card Header)
export const repairs = pgTable('repairs', {
    id: serial('id').primaryKey(),
    jobCardNumber: varchar('job_card_number', { length: 100 }).notNull().unique(), // e.g. "JOB-2026-0001"

    // Client / Company Information
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),
    customerGstin: varchar('customer_gstin', { length: 20 }),

    // Device / Inward Details
    deviceType: varchar('device_type', { length: 100 }).notNull().default('AC Drive'), // AC Drive, DC Drive, Loop Scanner, Stack Controller, etc.
    brand: varchar('brand', { length: 100 }).notNull().default('Generic'), // Schneider, ABB, Siemens, Danfoss, etc.
    modelNumber: varchar('model_number', { length: 255 }).notNull(),
    serialNumber: varchar('serial_number', { length: 255 }).notNull(),
    physicalCondition: text('physical_condition'),
    reportedFault: text('reported_fault').notNull(),
    priority: repairPriorityEnum('priority').notNull().default('NORMAL'),

    // Workshop & Diagnostic Phase
    assignedTechnician: varchar('assigned_technician', { length: 255 }),
    diagnosisObservations: text('diagnosis_observations'),
    isRepairable: varchar('is_repairable', { length: 10 }).notNull().default('YES'), // YES / NO / PENDING
    repairNotes: text('repair_notes'),
    status: repairStatusEnum('status').notNull().default('RECEIVED'),

    // Financials & Quotation
    estimatedCost: numeric('estimated_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    serviceCharge: numeric('service_charge', { precision: 12, scale: 2 }).notNull().default('0.00'),
    partsCost: numeric('parts_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('18.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0.00'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),

    // Delivery & Outward
    warrantyMonths: integer('warranty_months').notNull().default(1),
    deliveryChallanNumber: varchar('delivery_challan_number', { length: 100 }),
    invoiceNumber: varchar('invoice_number', { length: 100 }),

    // Timestamps & SLA
    receivedDate: timestamp('received_date').defaultNow().notNull(),
    estimatedDeliveryDate: timestamp('estimated_delivery_date'),
    completedDate: timestamp('completed_date'),
    deliveredDate: timestamp('delivered_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Replaced Parts / Spares Table (Line items attached to repair job)
export const repairParts = pgTable('repair_parts', {
    id: serial('id').primaryKey(),
    repairId: integer('repair_id')
        .notNull()
        .references(() => repairs.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
        .references(() => products.id, { onDelete: 'set null' }), // Optional FK if picked from store inventory
    partName: varchar('part_name', { length: 255 }).notNull(), // e.g. "Semikron IGBT Module 150A"
    partNumber: varchar('part_number', { length: 255 }), // e.g. "SKM150GB12T4"
    source: varchar('source', { length: 50 }).notNull().default('STORE_INVENTORY'), // STORE_INVENTORY / NEEDS_PROCUREMENT / EXTERNAL_PURCHASE
    quantity: integer('quantity').notNull().default(1),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit Trail & Timeline Logs for Repairs
export const repairAuditLogs = pgTable('repair_audit_logs', {
    id: serial('id').primaryKey(),
    repairId: integer('repair_id')
        .notNull()
        .references(() => repairs.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 100 }).notNull(), // INWARD_RECEIVED, STATUS_CHANGE, PART_ADDED, PART_REMOVED, DIAGNOSIS_LOGGED, BILLING_UPDATED, DISPATCHED
    description: text('description').notNull(),
    performedBy: varchar('performed_by', { length: 255 }).default('Staff'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Drizzle Relational Mappings for Repairs
export const repairsRelations = relations(repairs, ({ many }) => ({
    parts: many(repairParts),
    auditLogs: many(repairAuditLogs),
}));

export const repairPartsRelations = relations(repairParts, ({ one }) => ({
    repair: one(repairs, {
        fields: [repairParts.repairId],
        references: [repairs.id],
    }),
    product: one(products, {
        fields: [repairParts.productId],
        references: [products.id],
    }),
}));

export const repairAuditLogsRelations = relations(repairAuditLogs, ({ one }) => ({
    repair: one(repairs, {
        fields: [repairAuditLogs.repairId],
        references: [repairs.id],
    }),
}));

// TypeScript Types for Repairs
export type Repair = typeof repairs.$inferSelect;
export type NewRepair = typeof repairs.$inferInsert;

export type RepairPart = typeof repairParts.$inferSelect;
export type NewRepairPart = typeof repairParts.$inferInsert;

export type RepairAuditLog = typeof repairAuditLogs.$inferSelect;
export type NewRepairAuditLog = typeof repairAuditLogs.$inferInsert;

export type RepairWithParts = Repair & {
    parts: RepairPart[];
    auditLogs?: RepairAuditLog[];
};

// ==========================================
// 6. PANEL MANUFACTURING & BOM MODULE
// ==========================================

export const panelTypeEnum = pgEnum('panel_type', [
    'PLC_PANEL',
    'MCC_PANEL',
    'APFC_PANEL',
    'HMI_PANEL',
    'VFD_PANEL',
    'POWER_DISTRIBUTION_PANEL',
    'CUSTOM_PANEL',
]);

export const panelProjectStatusEnum = pgEnum('panel_project_status', [
    'ORDER_BOOKED',
    'MATERIAL_ISSUED',
    'WIRING_ASSEMBLY',
    'TESTING_QA',
    'READY_FOR_DISPATCH',
    'DELIVERED',
    'ON_HOLD',
    'CANCELLED',
]);

export const panelBomSourceEnum = pgEnum('panel_bom_source', [
    'STORE_INVENTORY',  // Picked from stock (auto-deducted)
    'PURCHASE_REQUIRED', // Needs external procurement
    'ALREADY_PURCHASED', // Procured externally, cost logged
]);

// Panel Projects Table (Order Header)
export const panelProjects = pgTable('panel_projects', {
    id: serial('id').primaryKey(),
    projectNumber: varchar('project_number', { length: 100 }).notNull().unique(), // e.g. "PANEL-2026-0001"

    // Client / Company Info
    clientName: varchar('client_name', { length: 255 }).notNull(),
    companyName: varchar('company_name', { length: 255 }),
    clientPhone: varchar('client_phone', { length: 50 }).notNull(),
    clientEmail: varchar('client_email', { length: 255 }),
    clientGstin: varchar('client_gstin', { length: 20 }),
    siteAddress: text('site_address'),

    // Panel Specifications
    panelType: panelTypeEnum('panel_type').notNull(),
    panelDescription: text('panel_description').notNull(), // e.g. "3-Phase MCC with 6 feeders for XYZ Plant"
    specifications: jsonb('specifications').$type<Record<string, any>>().default({}), // voltage, phases, ampere rating etc.

    // Project Management
    status: panelProjectStatusEnum('status').notNull().default('ORDER_BOOKED'),
    assignedEngineer: varchar('assigned_engineer', { length: 255 }),
    priority: repairPriorityEnum('priority').notNull().default('NORMAL'), // reuse repair priority enum
    notes: text('notes'),

    // Financials
    sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
    bomCostTotal: numeric('bom_cost_total', { precision: 12, scale: 2 }).notNull().default('0.00'), // Auto-calculated from BOM items
    laborCost: numeric('labor_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    otherCosts: numeric('other_costs', { precision: 12, scale: 2 }).notNull().default('0.00'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('18.00'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0.00'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('UNPAID'),
    advanceReceived: numeric('advance_received', { precision: 12, scale: 2 }).notNull().default('0.00'),

    // Delivery
    deliveryChallanNumber: varchar('delivery_challan_number', { length: 100 }),
    invoiceNumber: varchar('invoice_number', { length: 100 }),

    // Timestamps
    orderDate: timestamp('order_date').defaultNow().notNull(),
    targetDeliveryDate: timestamp('target_delivery_date'),
    completedDate: timestamp('completed_date'),
    deliveredDate: timestamp('delivered_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Panel BOM Items Table (Bill of Materials Line Items)
export const panelBomItems = pgTable('panel_bom_items', {
    id: serial('id').primaryKey(),
    panelProjectId: integer('panel_project_id')
        .notNull()
        .references(() => panelProjects.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
        .references(() => products.id, { onDelete: 'set null' }), // Optional FK to store inventory

    // Component Details
    componentName: varchar('component_name', { length: 255 }).notNull(),
    componentCode: varchar('component_code', { length: 100 }),
    source: panelBomSourceEnum('source').notNull().default('STORE_INVENTORY'),
    quantity: integer('quantity').notNull().default(1),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull().default('0.00'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Panel Audit Logs Table
export const panelAuditLogs = pgTable('panel_audit_logs', {
    id: serial('id').primaryKey(),
    panelProjectId: integer('panel_project_id')
        .notNull()
        .references(() => panelProjects.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 100 }).notNull(),
    description: text('description').notNull(),
    performedBy: varchar('performed_by', { length: 255 }).default('Staff'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations for Panel Module
export const panelProjectsRelations = relations(panelProjects, ({ many }) => ({
    bomItems: many(panelBomItems),
    auditLogs: many(panelAuditLogs),
}));

export const panelBomItemsRelations = relations(panelBomItems, ({ one }) => ({
    panelProject: one(panelProjects, {
        fields: [panelBomItems.panelProjectId],
        references: [panelProjects.id],
    }),
    product: one(products, {
        fields: [panelBomItems.productId],
        references: [products.id],
    }),
}));

export const panelAuditLogsRelations = relations(panelAuditLogs, ({ one }) => ({
    panelProject: one(panelProjects, {
        fields: [panelAuditLogs.panelProjectId],
        references: [panelProjects.id],
    }),
}));

// TypeScript Types for Panel Module
export type PanelProject = typeof panelProjects.$inferSelect;
export type NewPanelProject = typeof panelProjects.$inferInsert;

export type PanelBomItem = typeof panelBomItems.$inferSelect;
export type NewPanelBomItem = typeof panelBomItems.$inferInsert;

export type PanelAuditLog = typeof panelAuditLogs.$inferSelect;
export type NewPanelAuditLog = typeof panelAuditLogs.$inferInsert;

export type PanelProjectWithBom = PanelProject & {
    bomItems: PanelBomItem[];
    auditLogs?: PanelAuditLog[];
};