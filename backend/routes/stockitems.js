const express = require('express');
const router = express.Router();
const StockItemController = require('../controllers/StockItemController');

router.get('/', StockItemController.getAllStockItems);
router.post('/', StockItemController.createStockItem);
router.get('/:id', StockItemController.getStockItemById);
router.put('/:id', StockItemController.updateStockItem);
router.delete('/:id', StockItemController.deleteStockItem);

module.exports = router;