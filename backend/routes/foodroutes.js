import express from "express";
import {
  getAllFoodItems,
  getFoodItemDetail,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
} from "../controllers/food.controller.js";

const router = express.Router();

// GET all food items
router.get("/", getAllFoodItems);

// GET a single food item
router.get("/:id", getFoodItemDetail);

// POST create a new food item
router.post("/", createFoodItem);

// PUT update a food item
router.put("/:id", updateFoodItem);

// DELETE a food item
router.delete("/:id", deleteFoodItem);

export default router;