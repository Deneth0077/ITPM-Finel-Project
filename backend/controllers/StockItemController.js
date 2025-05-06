const StockItem = require('../models/StockItem');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const geminiApiKey = process.env.GEMINI_API_KEY;

const transformStockItem = (item) => ({
  id: item._id.toString(),
  name: item.name,
  quantity: item.quantity,
  unit: item.unit,
  category: item.category,
  status: item.status,
  image: item.image,
  variants: item.variants,
  price: item.price,
  weight: item.weight,
  nutrients: item.nutrients,
});

class StockItemController {
  static async getAllStockItems(req, res) {
    try {
      const stockItems = await StockItem.find();
      const transformedItems = stockItems.map(transformStockItem);
      res.status(200).json(transformedItems);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching stock items', error: error.message });
    }
  }

  static async getStockItemById(req, res) {
    try {
      const stockItem = await StockItem.findById(req.params.id);
      if (!stockItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }
      res.status(200).json(transformStockItem(stockItem));
    } catch (error) {
      res.status(500).json({ message: 'Error fetching stock item', error: error.message });
    }
  }

  static async createStockItem(req, res) {
    try {
      const { name, quantity, unit, category, status, variants, price, weight, nutrients } = req.body;
      if (!name || !quantity || !unit || !category || !status) {
        return res.status(400).json({ message: 'Required fields missing: name, quantity, unit, category, and status are required' });
      }

      let imageUrl = '';
      if (req.files && req.files.image) {
        const file = req.files.image;
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'stock_items',
        });
        imageUrl = result.secure_url;
      }

      const stockItem = new StockItem({
        name,
        quantity: parseFloat(quantity),
        unit,
        category,
        status,
        image: imageUrl,
        variants,
        price,
        weight,
        nutrients: nutrients ? JSON.parse(nutrients) : undefined,
      });
      
      const savedStockItem = await stockItem.save();
      res.status(201).json(transformStockItem(savedStockItem));

      // Notify WebSocket clients of new item
      const wss = require('../server').wss;
      if (wss.clients.size > 0) {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ type: 'stockUpdate', itemName: name }));
          }
        });
      }
    } catch (error) {
      res.status(400).json({ message: 'Error creating stock item', error: error.message });
    }
  }

  static async updateStockItem(req, res) {
    try {
      const stockItem = await StockItem.findById(req.params.id);
      if (!stockItem) return res.status(404).json({ message: 'Stock item not found' });

      const { name, quantity, unit, category, status, variants, price, weight, nutrients } = req.body;
      let imageUrl = stockItem.image;

      if (req.files && req.files.image) {
        const file = req.files.image;
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'stock_items',
        });
        imageUrl = result.secure_url;
      }

      Object.assign(stockItem, {
        name: name || stockItem.name,
        quantity: quantity ? parseFloat(quantity) : stockItem.quantity,
        unit: unit || stockItem.unit,
        category: category || stockItem.category,
        status: status || stockItem.status,
        image: imageUrl,
        variants: variants || stockItem.variants,
        price: price || stockItem.price,
        weight: weight || stockItem.weight,
        nutrients: nutrients ? JSON.parse(nutrients) : stockItem.nutrients,
      });

      const updatedStockItem = await stockItem.save();
      res.status(200).json(transformStockItem(updatedStockItem));
    } catch (error) {
      res.status(400).json({ message: 'Error updating stock item', error: error.message });
    }
  }

  static async deleteStockItem(req, res) {
    try {
      const stockItem = await StockItem.findById(req.params.id);
      if (!stockItem) return res.status(404).json({ message: 'Stock item not found' });

      await stockItem.deleteOne();
      res.status(200).json({ message: 'Stock item deleted successfully', id: req.params.id });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting stock item', error: error.message });
    }
  }

  static async suggestMeals(req, res) {
    try {
      const stockItems = await StockItem.find();
      const ingredients = stockItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        nutrients: item.nutrients,
      }));

      const mealSuggestions = await generateMealSuggestions(ingredients);
      res.status(200).json(mealSuggestions);
    } catch (error) {
      res.status(500).json({ message: 'Error generating meal suggestions', error: error.message });
    }
  }

  static async checkNutrients(req, res) {
    try {
      const { name, nutrients } = req.body;
      const stockItem = await StockItem.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (stockItem) {
        stockItem.nutrients = nutrients;
        await stockItem.save();
        res.status(200).json({ message: 'Nutrients updated', nutrients });
      } else {
        res.status(404).json({ message: 'Item not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error updating nutrients', error: error.message });
    }
  }
}

async function generateMealSuggestions(ingredients) {
  const meals = { breakfast: [], lunch: [], dinner: [] };

  // Basic meal suggestion logic based on ingredient availability
  if (ingredients.some(i => i.name.toLowerCase().includes('egg'))) {
    meals.breakfast.push({
      name: 'Scrambled Eggs with Spinach',
      ingredients: ['Eggs', 'Spinach'],
      nutrients: { calories: 200, protein: 15, carbs: 5, fats: 12 },
    });
  }
  if (ingredients.some(i => i.name.toLowerCase().includes('chicken'))) {
    meals.dinner.push({
      name: 'Grilled Chicken Salad',
      ingredients: ['Chicken', 'Lettuce', 'Tomato'],
      nutrients: { calories: 350, protein: 30, carbs: 15, fats: 10 },
    });
  }
  if (ingredients.some(i => i.name.toLowerCase().includes('rice'))) {
    meals.lunch.push({
      name: 'Vegetable Fried Rice',
      ingredients: ['Rice', 'Carrots', 'Peas'],
      nutrients: { calories: 250, protein: 8, carbs: 40, fats: 5 },
    });
  }

  // Optionally integrate with Gemini API for more sophisticated suggestions
  if (geminiApiKey && ingredients.length > 0) {
    const prompt = `Suggest nutritious meals for breakfast, lunch, and dinner using these ingredients: ${ingredients.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}. Ensure variety and balanced nutrition.`;
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiSuggestions = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiSuggestions) {
        // Parse AI response (assuming it returns JSON-like structure)
        const parsed = JSON.parse(aiSuggestions); // Adjust parsing based on actual response format
        meals.breakfast.push(...(parsed.breakfast || []));
        meals.lunch.push(...(parsed.lunch || []));
        meals.dinner.push(...(parsed.dinner || []));
      }
    } catch (error) {
      console.error('Gemini API error:', error);
    }
  }

  return meals;
}

module.exports = StockItemController;