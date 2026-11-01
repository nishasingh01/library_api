const express = require('express');
const mongoose = require('mongoose');
const bookRoutes = require('./routes/books');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Library Book Management API is running.' });
});

app.use('/api/books', bookRoutes);

mongoose.set('strictQuery', true);

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library-api';

mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected successfully.');
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });

module.exports = app;
