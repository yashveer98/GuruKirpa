import { z } from 'zod';

// Define allowed product types strictly matching your Drizzle Enum
export const productTypeEnumSchema = z.enum([
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

// 1. Schema for POST /api/products (Creating a Product)
export const createProductSchema = z.object({
    serialNumber: z.string().min(1, 'Serial number is required'),
    brand: z.string().optional().default('Generic'),
    productType: productTypeEnumSchema,
    subType: z.string().nullable().optional(),
    modelNumber: z.string().min(1, 'Model number is required'),
    costPrice: z.number().nonnegative('Cost price cannot be negative').optional().default(0),
    unitPrice: z.number().nonnegative('Unit price cannot be negative').optional().default(0),
    taxRate: z.number().nonnegative('Tax rate must be positive').optional().default(18),
    stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional().default(0),
    sku: z.string().nullable().optional(),
    specs: z.record(z.string(), z.any()).optional().default({}),
});

// 2. Schema for PUT /api/products/:id (Updating a Product - All fields optional)
export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;