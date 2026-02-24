module.exports = (sequelize, DataTypes) => {
    const ProductionRequest = sequelize.define('ProductionRequest', {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },

        area: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'P1' },

        status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PENDIENTE' },

        items: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },

        note: { type: DataTypes.TEXT, allowNull: true },

        requestedByUserId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    }, {
        tableName: 'production_requests',
        timestamps: true,
    });

    return ProductionRequest;
};