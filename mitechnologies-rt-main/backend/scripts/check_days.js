require('dotenv').config();
const { sequelize } = require('../src/config/mysql');

(async() => {
    try {
        const [rows] = await sequelize.query(`
      SELECT day, COUNT(*) total
      FROM pallet_dashboard_items
      GROUP BY day
      ORDER BY day DESC
    `);
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();