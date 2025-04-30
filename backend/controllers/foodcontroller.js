import FoodItem from "../mongodb/models/food.model.js";

// GET all food items with pagination and sorting
const getAllFoodItems = async (req, res) => {
  try {
    const { _start = 0, _end = 10, _sort = "foodName", _order = "asc" } = req.query;
    const count = await FoodItem.countDocuments({});
    const foodItemsQuery = FoodItem.find({})
      .limit(parseInt(_end))
      .skip(parseInt(_start));

    if (_sort && _order) {
      foodItemsQuery.sort({ [_sort]: _order === "desc" ? -1 : 1 });
    }

    const foodItems = await foodItemsQuery.exec();

    res.header("x-total-count", count);
    res.header("Access-Control-Expose-Headers", "x-total-count");
    res.status(200).json(foodItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET a single food item detail by ID
const getFoodItemDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const foodItem = await FoodItem.findById(id);
    if (!foodItem) {
      return res.status(404).json({ message: "Food item not found" });
    }
    res.status(200).json(foodItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE a new food item
const createFoodItem = async (req, res) => {
  try {
    const { foodName, eatingDay, description, expirationDate } = req.body;
    const newFoodItem = await FoodItem.create({
      foodName,
      eatingDay,
      description,
      expirationDate,
    });
    res.status(201).json(newFoodItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE an existing food item
const updateFoodItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { foodName, eatingDay, description, expirationDate } = req.body;
    const updatedFoodItem = await FoodItem.findByIdAndUpdate(
      id,
      { foodName, eatingDay, description, expirationDate },
      { new: true, runValidators: true }
    );
    if (!updatedFoodItem) {
      return res.status(404).json({ message: "Food item not found" });
    }
    res.status(200).json(updatedFoodItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE a food item
const deleteFoodItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFoodItem = await FoodItem.findByIdAndDelete(id);
    if (!deletedFoodItem) {
      return res.status(404).json({ message: "Food item not found" });
    }
    res.status(200).json({ message: "Food item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getAllFoodItems,
  getFoodItemDetail,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
};