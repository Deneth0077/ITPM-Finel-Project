// controllers/StockItemController.js
const StockItem = require('../models/StockItem');
const { cloudinary } = require('../config/cloudinary');

const transformStockItem = (item) => ({
  id: item._id.toString(),
  name: item.name,
  image: item.image,
  variants: item.variants,
  price: item.price,
  category: item.category,
  status: item.status,
  quantity: item.quantity,
  weight: item.weight
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

  static async createStockItem(req, res) {
    try {
      const { name, variants, price, category, status, quantity, weight } = req.body;
      const file = req.files?.image;

      // Validate all required fields
      if (!name || !file || !variants || !price || !category || !status || !quantity || !weight) {
        return res.status(400).json({ 
          message: 'All fields including image, quantity, and weight are required',
          missingFields: { name: !name, image: !file, variants: !variants, price: !price, category: !category, status: !status, quantity: !quantity, weight: !weight }
        });
      }

      // Upload image to Cloudinary
      const result = await cloudinary.uploader.upload(file.tempFilePath || file.path, {
        folder: 'stock_items',
        use_filename: true,
        unique_filename: false
      });

      // Create new stock item
      const stockItem = new StockItem({
        name,
        image: result.secure_url,
        variants,
        price,
        category,
        status,
        quantity: parseInt(quantity), // Convert to number
        weight: parseFloat(weight)    // Convert to number
      });

      const savedStockItem = await stockItem.save();
      res.status(201).json(transformStockItem(savedStockItem));
    } catch (error) {
      console.error('Error in createStockItem:', error);
      res.status(400).json({ message: 'Error creating stock item', error: error.message });
    }
  }

  static async getStockItemById(req, res) {
    try {
      const stockItem = await StockItem.findById(req.params.id);
      if (!stockItem) return res.status(404).json({ message: 'Stock item not found' });
      res.status(200).json(transformStockItem(stockItem));
    } catch (error) {
      res.status(500).json({ message: 'Error fetching stock item', error: error.message });
    }
  }

  static async updateStockItem(req, res) {
    try {
      const stockItem = await StockItem.findById(req.params.id);
      if (!stockItem) return res.status(404).json({ message: 'Stock item not found' });

      const updates = req.body;

      // Handle image update if provided
      if (req.files?.image) {
        const result = await cloudinary.uploader.upload(req.files.image.tempFilePath || req.files.image.path, {
          folder: 'stock_items',
          use_filename: true,
          unique_filename: false
        });
        updates.image = result.secure_url;
      }

      // Convert quantity and weight to numbers if provided
      if (updates.quantity) updates.quantity = parseInt(updates.quantity);
      if (updates.weight) updates.weight = parseFloat(updates.weight);

      Object.assign(stockItem, updates);
      const updatedStockItem = await stockItem.save();
      res.status(200).json(transformStockItem(updatedStockItem));
    } catch (error) {
      console.error('Error in updateStockItem:', error);
      res.status(400).json({ message: 'Error updating stock item', error: error.message });
    }
  }

  static async deleteStockItem(req, res) {
    try {
      const stockItem = await StockItem.findById(req.params.id);
      if (!stockItem) return res.status(404).json({ message: 'Stock item not found' });

      await stockItem.deleteOne(); // Updated from .remove() to .deleteOne() for Mongoose 6+
      res.status(200).json({ message: 'Stock item deleted successfully', id: req.params.id });
    } catch (error) {
      console.error('Error in deleteStockItem:', error);
      res.status(500).json({ message: 'Error deleting stock item', error: error.message });
    }
  }

  static async analyzeStockForAI(req, res) {
    try {
      const { question } = req.body;
      const stockItems = await StockItem.find();
      
      // Transform stock items for AI analysis
      const stockData = stockItems.map(item => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        status: item.status
      }));

      // Here you would typically integrate with an AI service
      // For now, we'll return a basic analysis
      const analysis = {
        totalItems: stockItems.length,
        inStockItems: stockItems.filter(item => item.status === "InStock").length,
        outOfStockItems: stockItems.filter(item => item.status === "OutOfStock").length,
        stockData: stockData
      };

      res.status(200).json(analysis);
    } catch (error) {
      console.error('Error in analyzeStockForAI:', error);
      res.status(500).json({ message: 'Error analyzing stock data', error: error.message });
    }
  }
}

module.exports = StockItemController;