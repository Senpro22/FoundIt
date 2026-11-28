const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');

const reportRoutes = require('./routes/reports');
const adminClaimRoutes = require('./routes/adminClaims');
const adminRoutes = require('./routes/admin');
const matchRoutes = require('./routes/matches');
const claimRoutes = require('./routes/claims');

require('./models/match');
require('./models/claim');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

app.use('/api/reports', reportRoutes);
app.use('/api/admin/claims', adminClaimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/claims', claimRoutes);

sequelize.sync({ alter: true })
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(
        `Server jalan di port ${process.env.PORT || 8000}`
      );
    });
  })
  .catch((err) => {
    console.error(
      'Gagal menghubungkan database:',
      err.message
    );

    process.exitCode = 1;
  });