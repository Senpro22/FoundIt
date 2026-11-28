require('dotenv').config();

const sequelize = require('../config/database');
const Report = require('../models/report');

async function migrate() {
  try {
    await sequelize.authenticate();

    const result = await sequelize.transaction(
      async (transaction) => {

        const [approved] = await Report.update(
          { status: 'disetujui' },
          {
            where: {
              status: 'approved',
            },
            transaction,
          }
        );

        const [rejected] = await Report.update(
          { status: 'ditolak' },
          {
            where: {
              status: 'rejected',
            },
            transaction,
          }
        );

        return {
          approved,
          rejected,
        };
      }
    );

    console.log('Migrasi status berhasil.');

    console.log(
      `approved -> disetujui: ${result.approved} data`
    );

    console.log(
      `rejected -> ditolak: ${result.rejected} data`
    );

  } catch (err) {
    console.error(
      'Migrasi gagal:',
      err.message
    );

    process.exitCode = 1;

  } finally {
    await sequelize.close();
  }
}

migrate();