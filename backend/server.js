const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');
const reportRoutes = require('./routes/reports');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/reports', reportRoutes);

sequelize.sync().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server jalan di port ${process.env.PORT}`);
  });
});