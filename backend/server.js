const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
const reportRoutes = require('./routes/reports');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/reports', reportRoutes);
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

sequelize.sync({ alter: true }).then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server jalan di port ${process.env.PORT}`);
  });
});