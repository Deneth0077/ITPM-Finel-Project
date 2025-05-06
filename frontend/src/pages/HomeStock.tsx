import { useEffect, useState } from 'react';
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import Alert from "../components/ui/alert/Alert";

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  status: "InStock" | "Pending" | "OutOfStock";
  image?: string;
  nutrients?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  };
}

interface Toast {
  id: number;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

export default function HomeStock() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: '',
    status: '' as '' | 'InStock' | 'Pending' | 'OutOfStock',
    image: null as File | null,
    nutrients: { calories: '', protein: '', carbs: '', fats: '' },
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const fetchStockItems = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/stockitems');
        if (!response.ok) throw new Error(`Failed to fetch stock items: ${response.statusText}`);
        const data: StockItem[] = await response.json();
        setStockItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStockItems();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'image') {
      const files = (e.target as HTMLInputElement).files;
      setFormData(prev => ({ ...prev, image: files ? files[0] : null }));
    } else if (name in formData.nutrients) {
      setFormData(prev => ({
        ...prev,
        nutrients: { ...prev.nutrients, [name]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addToast = (variant: Toast["variant"], title: string, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, variant, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('quantity', formData.quantity);
    data.append('unit', formData.unit);
    data.append('category', formData.category);
    data.append('status', formData.status);
    if (formData.image) {
      data.append('image', formData.image);
    }
    data.append('nutrients', JSON.stringify({
      calories: parseFloat(formData.nutrients.calories) || 0,
      protein: parseFloat(formData.nutrients.protein) || 0,
      carbs: parseFloat(formData.nutrients.carbs) || 0,
      fats: parseFloat(formData.nutrients.fats) || 0,
    }));

    try {
      const url = editId ? `http://localhost:5000/api/stockitems/${editId}` : 'http://localhost:5000/api/stockitems';
      const method = editId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editId ? 'update' : 'create'} stock item`);
      }

      const updatedStockItem: StockItem = await response.json();

      if (editId) {
        setStockItems(prev => prev.map(item => (item.id === editId ? updatedStockItem : item)));
        setEditId(null);
      } else {
        setStockItems(prev => [...prev, updatedStockItem]);
      }

      setFormData({
        name: '',
        quantity: '',
        unit: '',
        category: '',
        status: '',
        image: null,
        nutrients: { calories: '', protein: '', carbs: '', fats: '' },
      });
      addToast("success", "Success", "Item added successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      addToast("error", "Error", "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (stockItem: StockItem) => {
    const nutrients = stockItem.nutrients || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    setEditId(stockItem.id);
    setFormData({
      name: stockItem.name,
      quantity: stockItem.quantity.toString(),
      unit: stockItem.unit,
      category: stockItem.category,
      status: stockItem.status,
      image: null,
      nutrients: {
        calories: nutrients.calories?.toString() || '0',
        protein: nutrients.protein?.toString() || '0',
        carbs: nutrients.carbs?.toString() || '0',
        fats: nutrients.fats?.toString() || '0',
      },
    });
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/stockitems/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete stock item');
      }

      setStockItems(prev => prev.filter(item => item.id !== id));
      addToast("success", "Success", "Item deleted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      addToast("error", "Error", "Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageMeta title="Stock Dashboard" description="Manage your kitchen ingredients" />
      <PageBreadcrumb pageTitle="Stock Management" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Alert
              key={toast.id}
              variant={toast.variant}
              title={toast.title}
              message={toast.message}
            />
          ))}
        </div>
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            {editId ? 'Edit Ingredient' : 'Add New Ingredient'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ingredient Name"
              className="border p-2 rounded"
              required
            />
            <input
              type="file"
              name="image"
              onChange={handleInputChange}
              accept="image/*"
              className="border p-2 rounded"
            />
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="Quantity"
              className="border p-2 rounded"
              required
              min="0"
              step="0.1"
            />
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              placeholder="Unit (e.g., g, ml, pcs)"
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="Category (e.g., Vegetable, Protein)"
              className="border p-2 rounded"
              required
            />
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="border p-2 rounded"
              required
            >
              <option value="">Select Status</option>
              <option value="InStock">In Stock</option>
              <option value="Pending">Pending</option>
              <option value="OutOfStock">Out of Stock</option>
            </select>
            <input
              type="number"
              name="calories"
              value={formData.nutrients.calories}
              onChange={handleInputChange}
              placeholder="Calories (per unit)"
              className="border p-2 rounded"
              min="0"
            />
            <input
              type="number"
              name="protein"
              value={formData.nutrients.protein}
              onChange={handleInputChange}
              placeholder="Protein (g per unit)"
              className="border p-2 rounded"
              min="0"
            />
            <input
              type="number"
              name="carbs"
              value={formData.nutrients.carbs}
              onChange={handleInputChange}
              placeholder="Carbs (g per unit)"
              className="border p-2 rounded"
              min="0"
            />
            <input
              type="number"
              name="fats"
              value={formData.nutrients.fats}
              onChange={handleInputChange}
              placeholder="Fats (g per unit)"
              className="border p-2 rounded"
              min="0"
            />
            <button
              type="submit"
              disabled={loading}
              className="col-span-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? (editId ? 'Updating...' : 'Adding...') : (editId ? 'Update Ingredient' : 'Add Ingredient')}
            </button>
          </form>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Current Ingredients</h3>
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader>Image</TableCell>
                <TableCell isHeader>Name</TableCell>
                <TableCell isHeader>Quantity</TableCell>
                <TableCell isHeader>Unit</TableCell>
                <TableCell isHeader>Category</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader>Nutrients</TableCell>
                <TableCell isHeader>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <TableRow><td colSpan={8} className="text-center py-3">Loading...</td></TableRow>
              ) : error ? (
                <TableRow><td colSpan={8} className="text-center py-3 text-red-500">{error}</td></TableRow>
              ) : stockItems.length === 0 ? (
                <TableRow><td colSpan={8} className="text-center py-3">No ingredients found</td></TableRow>
              ) : (
                stockItems.map((stockItem) => (
                  <TableRow key={stockItem.id}>
                    <TableCell>
                      {stockItem.image ? (
                        <img 
                          src={stockItem.image} 
                          alt={stockItem.name} 
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-400">No image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{stockItem.name}</TableCell>
                    <TableCell>{stockItem.quantity}</TableCell>
                    <TableCell>{stockItem.unit}</TableCell>
                    <TableCell>{stockItem.category}</TableCell>
                    <TableCell>
                      <Badge size="sm" color={stockItem.status === "InStock" ? "success" : stockItem.status === "Pending" ? "warning" : "error"}>
                        {stockItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const nutrients = stockItem.nutrients || { calories: 0, protein: 0, carbs: 0, fats: 0 };
                        return `Cal: ${nutrients.calories || 0}, P: ${nutrients.protein || 0}g, C: ${nutrients.carbs || 0}g, F: ${nutrients.fats || 0}g`;
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(stockItem)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(stockItem.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}