const { z } = require('zod');

const loginSchema = z.object({
    employeeNumber: z.string().min(1),
    password: z.string().min(1).optional(),
    pin: z.string().regex(/^\d{6}$/).optional()
}).refine((data) => data.password || data.pin, {
    message: "Debes enviar password o pin",
    path: ["password"]
});

const registerSchema = z.object({
    email: z.string().trim().email("Correo inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),

    // ✅ acepta número o string y lo convierte a string
    employeeNumber: z.union([z.string(), z.number()])
        .transform((v) => String(v).trim())
        .refine((v) => v.length > 0, { message: "El número de empleado es obligatorio" }),

    // ✅ si viene vacío, lo deja como undefined
    fullName: z.union([z.string(), z.undefined()])
        .transform((v) => {
            if (v === undefined) return undefined;
            const s = String(v).trim();
            return s === '' ? undefined : s;
        })
        .optional(),

    // ✅ si viene vacío, usa OPERADOR por defecto
    role: z.union([
            z.enum(['ADMIN', 'SUPERVISOR', 'OPERADOR']),
            z.literal(''),
            z.undefined()
        ])
        .transform((v) => !v ? 'OPERADOR' : v)
        .optional(),

    // ✅ si viene vacío, lo deja como undefined
    position: z.union([z.string(), z.undefined()])
        .transform((v) => {
            if (v === undefined) return undefined;
            const s = String(v).trim();
            return s === '' ? undefined : s;
        })
        .optional(),

    // ✅ acepta boolean o string "true"/"false"
    isActive: z.union([z.boolean(), z.string(), z.undefined()])
        .transform((v) => {
            if (v === undefined || v === '') return true;
            if (typeof v === 'boolean') return v;
            return String(v).toLowerCase() === 'true';
        })
        .optional()
});

const createPalletSchema = z.object({
    lot: z.string().optional(),
    supplier: z.string().optional(),
    receivedAt: z.string().datetime().optional(),
    locationId: z.string().min(1),
    items: z.array(z.object({
        sku: z.string().min(1),
        description: z.string().optional(),
        qty: z.number().min(0)
    })).min(1)
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
    items: z.array(z.object({
        sku: z.string().min(1),
        description: z.string().optional(),
        qty: z.number().min(0)
    })).min(1),
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