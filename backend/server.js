// server.js (or index.js)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');
const stockItemRoutes = require('./routes/stockitems');
const { MongoClient } = require('mongodb');

const app = express();

const MONGO_URI = process.env.MONGO_URI;
let db;

(async () => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('voice_agent_db');
    console.log('Connected to MongoDB for Voice Agent');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
})();

connectDB();

app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));

app.use('/api/stockitems', stockItemRoutes);

app.post('/api/voice-agent', async (req, res) => {
  const { question, shortAnswers } = req.body;

  try {
    if (!db) throw new Error('Database not connected');

    const stockItems = await db.collection('stockitems').find({}).toArray();

    // Simple meal suggestion logic based on available stock
    const mealSuggestions = {
      breakfast: [],
      lunch: [],
      dinner: []
    };

    stockItems.forEach(item => {
      const qty = item.quantity;
      const wgt = item.weight;

      // Breakfast suggestions
      if (qty > 0 && ['fruits', 'bread', 'eggs', 'milk'].some(cat => item.category.toLowerCase().includes(cat))) {
        mealSuggestions.breakfast.push(`${item.name} (${qty} available, ${wgt}g)`);
      }
      // Lunch suggestions
      if (qty > 0 && ['vegetables', 'meat', 'rice', 'pasta'].some(cat => item.category.toLowerCase().includes(cat))) {
        mealSuggestions.lunch.push(`${item.name} (${qty} available, ${wgt}g)`);
      }
      // Dinner suggestions
      if (qty > 0 && ['meat', 'fish', 'vegetables', 'potatoes'].some(cat => item.category.toLowerCase().includes(cat))) {
        mealSuggestions.dinner.push(`${item.name} (${qty} available, ${wgt}g)`);
      }
    });

    let response = '';
    if (shortAnswers) {
      response = `Breakfast: ${mealSuggestions.breakfast[0] || 'None'}. Lunch: ${mealSuggestions.lunch[0] || 'None'}. Dinner: ${mealSuggestions.dinner[0] || 'None'}.`;
    } else {
      response = `Based on your stock:\n` +
        `- Breakfast: ${mealSuggestions.breakfast.length > 0 ? mealSuggestions.breakfast.join(', ') : 'No suitable items'}\n` +
        `- Lunch: ${mealSuggestions.lunch.length > 0 ? mealSuggestions.lunch.join(', ') : 'No suitable items'}\n` +
        `- Dinner: ${mealSuggestions.dinner.length > 0 ? mealSuggestions.dinner.join(', ') : 'No suitable items'}`;
    }

    res.status(200).json({ response });
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', message: 'Server is running' }));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));