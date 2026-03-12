const { sequelize } = require('../../config/mysql')
const { DataTypes } = require('sequelize')

// ── Existing models ──
const User = require('./User')
const Device = require('./Device')
const Product = require('./Product')
const Location = require('./Location')
const Pallet = require('./Pallet')
const Movement = require('./Movement')
const OutboundOrder = require('./OutboundOrder')
const CycleCount = require('./CycleCount')
const AuthLog = require('./AuthLog')
const ProductionRequest = require('./ProductionRequest')
const PalletDashboardItem = require('./PalletDashboardItem')

// ── NEW models (Fase 1-3) ──
const InboundOrder = require('./InboundOrder')
const StockAlert = require('./StockAlert')
const WarehouseTask = require('./WarehouseTask')
const PickTask = require('./PickTask')
const AuditLog = require('./AuditLog')
const ReturnOrder = require('./ReturnOrder')
const Webhook = require('./Webhook')

// PalletDashboardDetail (inline, preserved from original)
const PalletDashboardDetail = sequelize.define(
  'PalletDashboardDetail', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    day: { type: DataTypes.DATEONLY, allowNull: false },
    palletId: { type: DataTypes.STRING(100), allowNull: false },
    sku: { type: DataTypes.STRING(120), allowNull: true },
    qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    note: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'pallet_dashboard_details',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
)

// ─────────────────────────────────────
// EXISTING relationships (preserved)
// ─────────────────────────────────────
Pallet.belongsTo(Location, { foreignKey: 'locationId', as: 'location' })
Location.hasMany(Pallet, { foreignKey: 'locationId', as: 'pallets' })

Movement.belongsTo(Pallet, { foreignKey: 'palletId', as: 'pallet' })
Pallet.hasMany(Movement, { foreignKey: 'palletId', as: 'movements' })

Movement.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(Movement, { foreignKey: 'userId', as: 'movements' })

Movement.belongsTo(Location, { foreignKey: 'fromLocationId', as: 'fromLocation' })
Movement.belongsTo(Location, { foreignKey: 'toLocationId', as: 'toLocation' })

OutboundOrder.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' })
User.hasMany(OutboundOrder, { foreignKey: 'createdById', as: 'createdOrders' })
OutboundOrder.belongsTo(User, { foreignKey: 'authorizedById', as: 'authorizedBy' })

CycleCount.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' })
User.hasMany(CycleCount, { foreignKey: 'createdById', as: 'createdCounts' })
CycleCount.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' })

ProductionRequest.belongsTo(User, { foreignKey: 'requestedByUserId', targetKey: 'id', as: 'requestedBy' })
User.hasMany(ProductionRequest, { foreignKey: 'requestedByUserId', sourceKey: 'id', as: 'productionRequests' })

AuthLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// ─────────────────────────────────────
// NEW relationships
// ─────────────────────────────────────

// InboundOrder
InboundOrder.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' })
InboundOrder.belongsTo(User, { foreignKey: 'receivedById', as: 'receivedBy' })

// StockAlert
StockAlert.belongsTo(Product, { foreignKey: 'productId', as: 'product' })

// WarehouseTask
WarehouseTask.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' })
WarehouseTask.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' })

// PickTask
PickTask.belongsTo(OutboundOrder, { foreignKey: 'orderId', as: 'order' })
PickTask.belongsTo(Pallet, { foreignKey: 'palletId', as: 'pallet' })
PickTask.belongsTo(Location, { foreignKey: 'locationId', as: 'location' })
PickTask.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedTo' })

// AuditLog
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// ReturnOrder
ReturnOrder.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' })
ReturnOrder.belongsTo(User, { foreignKey: 'inspectedById', as: 'inspectedBy' })

// Webhook
Webhook.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' })

module.exports = {
  sequelize,
  User, Device, Product, Location, Pallet, Movement,
  OutboundOrder, CycleCount, AuthLog, ProductionRequest,
  PalletDashboardItem, PalletDashboardDetail,
  // NEW
  InboundOrder, StockAlert, WarehouseTask, PickTask,
  AuditLog, ReturnOrder, Webhook,
}
