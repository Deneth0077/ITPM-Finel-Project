import mongoose from "mongoose";

const FoodItemSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true },
    eatingDay: { type: Date, required: true },
    description: { type: String, required: true },
    expirationDate: { type: Date, required: true },
  },
  { timestamps: true }
);

const FoodItem = mongoose.model("FoodItem", FoodItemSchema);

export default FoodItem;