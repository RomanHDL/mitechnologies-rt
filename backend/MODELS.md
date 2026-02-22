# Sequelize Models Documentation (PASO 16B)

## Overview

Created Sequelize models to replace Mongoose models for MySQL migration. All models use **UUID** as primary keys for consistency and scalability.

## Models Created

### 1. User (`/src/models/sequelize/User.js`)
**Table:** `users`

**Fields:**
- `id` (UUID, PK)
- `email` (STRING, unique, required, validated as email)
- `passwordHash` (STRING, required)
- `employeeNumber` (STRING, required)
- `fullName` (STRING, default: '')
- `role` (ENUM: 'ADMIN', 'SUPERVISOR', 'OPERADOR', default: 'OPERADOR')
- `position` (STRING, default: '')
- `isActive` (BOOLEAN, default: true)
- `createdAt`, `updatedAt` (timestamps)

**Indexes:**
- Unique on `email`

---

### 2. Product (`/src/models/sequelize/Product.js`)
**Table:** `products`

**Fields:**
- `id` (UUID, PK)
- `sku` (STRING, unique, required)
- `description` (STRING, default: '')
- `brand` (STRING, default: '')
- `model` (STRING, default: '')
- `category` (STRING, default: '')
- `unit` (STRING, default: 'pz')
- `minStock` (INTEGER, default: 0)
- `isActive` (BOOLEAN, default: true)
- `createdAt`, `updatedAt` (timestamps)

**Indexes:**
- Unique on `sku`

---

### 3. Location (`/src/models/sequelize/Location.js`)
**Table:** `locations`

**Fields:**
- `id` (UUID, PK)
- `area` (ENUM: 'A1', 'A2', 'A3', 'A4', required)
- `level` (ENUM: 'A', 'B', 'C', required)
- `position` (INTEGER, required, min: 1, max: 12)
- `type` (ENUM: 'RACK', 'FLOOR', 'QUARANTINE', 'RETURNS', default: 'RACK')
- `maxPallets` (INTEGER, default: 1, min: 1)
- `notes` (TEXT, default: '')
- `blocked` (BOOLEAN, default: false)
- `blockedReason` (TEXT, default: '')
- `createdAt`, `updatedAt` (timestamps)

**Indexes:**
- Unique composite on (`area`, `level`, `position`)

---

### 4. Pallet (`/src/models/sequelize/Pallet.js`)
**Table:** `pallets`

**Fields:**
- `id` (UUID, PK)
- `code` (STRING, unique, required)
- `lot` (STRING, default: '')
- `supplier` (STRING, default: '')
- `receivedAt` (DATE, default: NOW)
- `items` (JSON, default: [], stores array of {sku, description, qty, serials})
- `locationId` (UUID, FK → locations)
- `status` (ENUM: 'IN_STOCK', 'OUT', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED', default: 'IN_STOCK')
- `createdAt`, `updatedAt` (timestamps)

**Relationships:**
- `belongsTo` Location

**Indexes:**
- Unique on `code`
- Index on `locationId`

---

### 5. Movement (`/src/models/sequelize/Movement.js`)
**Table:** `movements`

**Fields:**
- `id` (UUID, PK)
- `type` (ENUM: 'IN', 'OUT', 'TRANSFER', 'ADJUST', required)
- `palletId` (UUID, FK → pallets, required)
- `userId` (UUID, FK → users, required)
- `fromLocationId` (UUID, FK → locations, nullable)
- `toLocationId` (UUID, FK → locations, nullable)
- `note` (TEXT, default: '')
- `itemsSnapshot` (JSON, default: [], audit trail)
- `createdAt`, `updatedAt` (timestamps)

**Relationships:**
- `belongsTo` Pallet
- `belongsTo` User
- `belongsTo` Location (fromLocation)
- `belongsTo` Location (toLocation)

**Indexes:**
- Index on `palletId`
- Index on `userId`
- Index on `type`

---

### 6. OutboundOrder (`/src/models/sequelize/OutboundOrder.js`)
**Table:** `outbound_orders`

**Fields:**
- `id` (UUID, PK)
- `orderNumber` (STRING, unique, required)
- `destinationType` (ENUM: 'CLIENT', 'PRODUCTION', 'OTHER', default: 'OTHER')
- `destinationRef` (STRING, default: '')
- `status` (ENUM: 'DRAFT', 'PENDING_PICK', 'PICKED', 'SHIPPED', 'CANCELLED', default: 'PENDING_PICK')
- `lines` (JSON, default: [], stores array of {sku, description, qty})
- `notes` (TEXT, default: '')
- `createdById` (UUID, FK → users, required)
- `authorizedById` (UUID, FK → users, nullable)
- `fulfilledAt` (DATE, nullable)
- `pallets` (JSON, default: [], stores array of pallet IDs)
- `createdAt`, `updatedAt` (timestamps)

**Relationships:**
- `belongsTo` User (createdBy)
- `belongsTo` User (authorizedBy)

**Indexes:**
- Unique on `orderNumber`
- Index on `status`
- Index on `createdById`

---

### 7. CycleCount (`/src/models/sequelize/CycleCount.js`)
**Table:** `cycle_counts`

**Fields:**
- `id` (UUID, PK)
- `name` (STRING, default: '')
- `scope` (ENUM: 'AREA', 'LEVEL', 'CUSTOM', default: 'AREA')
- `area` (STRING, default: '')
- `level` (STRING, default: '')
- `status` (ENUM: 'OPEN', 'REVIEW', 'APPROVED', 'CLOSED', 'CANCELLED', default: 'OPEN')
- `lines` (JSON, default: [], stores count data)
- `notes` (TEXT, default: '')
- `createdById` (UUID, FK → users, required)
- `approvedById` (UUID, FK → users, nullable)
- `approvedAt` (DATE, nullable)
- `createdAt`, `updatedAt` (timestamps)

**Relationships:**
- `belongsTo` User (createdBy)
- `belongsTo` User (approvedBy)

**Indexes:**
- Index on `status`
- Index on `createdById`

---

## Model Registry (`/src/models/sequelize/index.js`)

Central file that:
1. Imports all models
2. Defines all relationships between models
3. Exports all models and sequelize instance

**Usage:**
```javascript
const { User, Product, Location, Pallet, Movement, OutboundOrder, CycleCount, sequelize } = require('./src/models/sequelize');
```

---

## Key Design Decisions

### 1. UUID Primary Keys
- Consistent across all models
- Better for distributed systems
- No auto-increment collisions

### 2. JSON Fields
Used for flexible nested data:
- `Pallet.items` - array of {sku, description, qty, serials}
- `OutboundOrder.lines` - array of order line items
- `OutboundOrder.pallets` - array of pallet IDs
- `CycleCount.lines` - array of count records
- `Movement.itemsSnapshot` - audit trail

### 3. Timestamps
All models include:
- `createdAt` - automatically set on creation
- `updatedAt` - automatically updated on modification

### 4. Indexes
Strategic indexes for:
- Unique constraints (email, sku, code, orderNumber)
- Foreign keys (locationId, palletId, userId)
- Frequently queried fields (status, type)
- Composite unique constraints (area+level+position)

---

## Relationships Summary

```
User ──1:N── Movement
User ──1:N── OutboundOrder (createdBy)
User ──0:N── OutboundOrder (authorizedBy)
User ──1:N── CycleCount (createdBy)
User ──0:N── CycleCount (approvedBy)

Location ──1:N── Pallet
Location ──0:N── Movement (fromLocation)
Location ──0:N── Movement (toLocation)

Pallet ──1:N── Movement
Pallet ──N:1── Location
```

---

## Testing

Run the test script to verify models:
```bash
node test-models.js
```

Expected output:
```
✓ All Sequelize models loaded successfully

Available models:
  - User
  - Product
  - Location
  - Pallet
  - Movement
  - OutboundOrder
  - CycleCount

✓ Model relationships configured
✓ All models use UUID as primary key
✓ All models have timestamps
```

---

## Status

✅ All 7 models created
✅ Relationships configured
✅ UUID primary keys
✅ Timestamps enabled
✅ Indexes defined
✅ JSON fields for flexible data
✅ Models loaded and tested
✅ No route changes (endpoints preserved)

## Next Steps

Models are ready for integration with routes. The old Mongoose models remain but are not imported in the main flow.
