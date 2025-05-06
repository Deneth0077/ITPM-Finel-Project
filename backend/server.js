require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');
const stockItemRoutes = require('./routes/stockitems');
const { MongoClient } = require('mongodb');
const WebSocket = require('ws');
const { getAllStockItemsService } = require('./controllers/StockItemController');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const MONGO_URI = process.env.MONGO_URI;
let db;

(async () => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('voice_agent_db');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit if MongoDB connection fails
  }
})();

connectDB();

app.use(cors({ origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));

app.use('/api/stockitems', stockItemRoutes);

app.post('/api/voice-agent', async (req, res) => {
  const { question, shortAnswers } = req.body;
  if (!question) return res.status(400).json({ error: 'No question provided' });

  try {
    const trimmedQuestion = question.trim().toLowerCase();
    let responseText = '';

    if (trimmedQuestion.includes('stock') || trimmedQuestion.includes('inventory') || trimmedQuestion.includes('available items')) {
      const stockItems = await getAllStockItemsService();
      responseText = stockItems.map(item => `${item.name}: ${item.quantity} ${item.unit}`).join(', ') || 'No stock items available.';
    } else if (trimmedQuestion.includes('suggest meals') || trimmedQuestion.includes('meal ideas')) {
      const stockItems = await getAllStockItemsService();
      const ingredients = stockItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        nutrients: item.nutrients,
      }));
      const meals = await require('./controllers/StockItemController').generateMealSuggestions(ingredients);
      responseText = `Meal Suggestions:\nBreakfast: ${meals.breakfast.map(m => m.name).join(', ') || 'None'}\nLunch: ${meals.lunch.map(m => m.name).join(', ') || 'None'}\nDinner: ${meals.dinner.map(m => m.name).join(', ') || 'None'}`;
    } else {
      responseText = 'I can list stock or suggest meals. Try saying "list stock" or "suggest meals".';
    }

    res.json({ response: responseText });
  } catch (error) {
    console.error('Voice Agent API error:', error);
    res.status(500).json({ error: 'Failed to get AI response.' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, shortAnswers } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  try {
    const trimmedMessage = message.trim().toLowerCase();
    let responseText = '';

    if (trimmedMessage.includes('stock') || trimmedMessage.includes('inventory') || trimmedMessage.includes('available items')) {
      const stockItems = await getAllStockItemsService();
      responseText = stockItems.map(item => `${item.name}: ${item.quantity} ${item.unit}`).join(', ') || 'No stock items available.';
    } else if (trimmedMessage.includes('suggest meals') || trimmedMessage.includes('meal ideas')) {
      const stockItems = await getAllStockItemsService();
      const ingredients = stockItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        nutrients: item.nutrients,
      }));
      const meals = await require('./controllers/StockItemController').generateMealSuggestions(ingredients);
      responseText = `Meal Suggestions:\nBreakfast: ${meals.breakfast.map(m => m.name).join(', ') || 'None'}\nLunch: ${meals.lunch.map(m => m.name).join(', ') || 'None'}\nDinner: ${meals.dinner.map(m => m.name).join(', ') || 'None'}`;
    } else {
      responseText = 'I can list stock or suggest meals. Try saying "list stock" or "suggest meals".';
    }

    res.json({ response: responseText });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Failed to get AI response.' });
  }
});

app.post('/api/stockitems/checkNutrients', require('./controllers/StockItemController').checkNutrients);

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message.toString());
    if (data.type === 'chat') {
      try {
        let response = '';
        if (data.message.toLowerCase().includes('stock') || data.message.toLowerCase().includes('inventory') || data.message.toLowerCase().includes('available items')) {
          const stockItems = await getAllStockItemsService();
          response = stockItems.map(item => `${item.name}: ${item.quantity} ${item.unit}`).join(', ') || 'No stock items available.';
        } else if (data.message.toLowerCase().includes('suggest meals') || data.message.toLowerCase().includes('meal ideas')) {
          const stockItems = await getAllStockItemsService();
          const ingredients = stockItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            nutrients: item.nutrients,
          }));
          const meals = await require('./controllers/StockItemController').generateMealSuggestions(ingredients);
          response = `Meal Suggestions:\nBreakfast: ${meals.breakfast.map(m => m.name).join(', ') || 'None'}\nLunch: ${meals.lunch.map(m => m.name).join(', ') || 'None'}\nDinner: ${meals.dinner.map(m => m.name).join(', ') || 'None'}`;
        } else {
          response = 'I can list stock or suggest meals. Try saying "list stock" or "suggest meals".';
        }
        ws.send(JSON.stringify({ type: 'response', message: response, role: 'agent' }));
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process your message.' }));
      }
    }
  });

  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to AI Chat Agent!' }));
});

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', message: 'Server is running' }));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
module.exports.wss = wss;