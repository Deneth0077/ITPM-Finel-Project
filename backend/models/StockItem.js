// models/StockItem.js
const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  variants: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['InStock', 'Pending', 'OutOfStock'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0 // Ensure quantity is non-negative
  },
  weight: {
    type: Number, // Weight in grams, e.g., 500 for 500g
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StockItem', stockItemSchema);