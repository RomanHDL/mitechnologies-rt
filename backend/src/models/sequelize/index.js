const { sequelize } = require('../../config/mysql');

// Import all models
const User = require('./User');
const Device = require('./Device');
const Product = require('./Product');
const Location = require('./Location');
const Pallet = require('./Pallet');
const Movement = require('./Movement');
const OutboundOrder = require('./OutboundOrder');
const CycleCount = require('./CycleCount');
const AuthLog = require('./AuthLog');
const ProductionRequest = require('./ProductionRequest');
const PalletDashboardItem = require('./PalletDashboardItem');

// Define relationships

// Pallet belongs to Location
Pallet.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
Location.hasMany(Pallet, { foreignKey: 'locationId', as: 'pallets' });

// Movement belongs to Pallet
Movement.belongsTo(Pallet, { foreignKey: 'palletId', as: 'pallet' });
Pallet.hasMany(Movement, { foreignKey: 'palletId', as: 'movements' });

// Movement belongs to User
Movement.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Movement, { foreignKey: 'userId', as: 'movements' });

// Movement optional locations
Movement.belongsTo(Location, { foreignKey: 'fromLocationId', as: 'fromLocation' });
Movement.belongsTo(Location, { foreignKey: 'toLocationId', as: 'toLocation' });

// OutboundOrder belongs to User (createdBy)
OutboundOrder.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(OutboundOrder, { foreignKey: 'createdById', as: 'createdOrders' });

// OutboundOrder belongs to User (authorizedBy - optional)
OutboundOrder.belongsTo(User, { foreignKey: 'authorizedById', as: 'authorizedBy' });

// CycleCount belongs to User (createdBy)
CycleCount.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(CycleCount, { foreignKey: 'createdById', as: 'createdCounts' });

// CycleCount belongs to User (approvedBy - optional)
CycleCount.belongsTo(User, { foreignKey: 'approvedById', as: 'approvedBy' });

// ProductionRequest belongs to User (requestedBy)
ProductionRequest.belongsTo(User, { foreignKey: 'requestedByUserId', targetKey: 'id', as: 'requestedBy' });
User.hasMany(ProductionRequest, { foreignKey: 'requestedByUserId', sourceKey: 'id', as: 'productionRequests' });

// AuthLog belongs to User (optional)
AuthLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export all models and sequelize instance (SOLO UNA VEZ)
module.exports = {
    sequelize,
    User,
    Device,
    Product,
    Location,
    Pallet,
    Movement,
    OutboundOrder,
    CycleCount,
    AuthLog,
    ProductionRequest,
    PalletDashboardItem, // ✅ YA NO SE PIERDE
};