const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
const reportRoutes = require('./routes/reports');
const Match = require('./models/match');          // BARU — ini yang ditanyain

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/reports', reportRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
const matchRoutes = require('./routes/matches');
app.use('/api/matches', matchRoutes);

sequelize.sync({ alter: true }).then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server jalan di port ${process.env.PORT}`);
  });
});