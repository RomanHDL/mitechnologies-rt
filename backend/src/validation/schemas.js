const { z } = require('zod');

const loginSchema = z.object({
    employeeNumber: z.string().min(1, 'Número de empleado requerido'),
    password: z.string().min(6, 'Contraseña mínima 6 caracteres')
});

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    employeeNumber: z.string().min(1),
    fullName: z.string().optional(),
    role: z.enum(['ADMIN', 'SUPERVISOR', 'OPERADOR']).optional(),
    position: z.string().optional(),
    isActive: z.boolean().optional()
});

// ...los demás schemas igual como los tienes

module.exports = {
    loginSchema,
    registerSchema,
    createPalletSchema,
    transferSchema,
    outSchema,
    adjustSchema
};

const createPalletSchema = z.object({
    lot: z.string().optional(),
    supplier: z.string().optional(),
    receivedAt: z.string().datetime().optional(),
    locationId: z.string().min(1),
    items: z.array(
        z.object({
            sku: z.string().min(1),
            description: z.string().optional(),
            qty: z.number().min(0)
        })
    ).min(1)
});

const transferSchema = z.object({
    toLocationId: z.string().min(1),
    note: z.string().optional()
});

const outSchema = z.object({
    destinationType: z.enum(['CLIENT', 'PRODUCTION', 'OTHER']).default('OTHER'),
    destinationRef: z.string().optional(),
    note: z.string().optional()
});

const adjustSchema = z.object({
    items: z.array(
        z.object({
            sku: z.string().min(1),
            description: z.string().optional(),
            qty: z.number().min(0)
        })
    ).min(1),
    note: z.string().optional()
});

module.exports = {
    loginSchema,
    registerSchema,
    createPalletSchema,
    transferSchema,
    outSchema,
    adjustSchema
};