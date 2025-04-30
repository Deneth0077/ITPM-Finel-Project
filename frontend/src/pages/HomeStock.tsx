import { useEffect, useState } from 'react';
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";

interface StockItem {
  id: string;
  name: string;
  image: string;
  variants: string;
  price: string;
  category: string;
  status: "InStock" | "Pending" | "OutOfStock";
  quantity: number;
  weight: number;
}

export default function HomeStock() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    image: null as File | null,
    variants: '',
    price: '',
    category: '',
    status: '' as '' | 'Delivered' | 'Pending' | 'Cancelled',
    quantity: '',
    weight: ''
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');

  // Fetch stock items from backend
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

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const files = (e.target as HTMLInputElement).files;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  // Handle form submission (Create or Update)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData();
    (Object.keys(formData) as Array<keyof typeof formData>).forEach(key => {
      if (formData[key] !== null && formData[key] !== '') {
        data.append(key, formData[key] as string | Blob);
      }
    });

    // Validate required fields for POST (new item)
    if (!editId) {
      const requiredFields = ['name', 'image', 'variants', 'price', 'category', 'status', 'quantity', 'weight'];
      const missingFields = requiredFields.filter(field => !data.get(field));
      if (missingFields.length > 0) {
        setError(`Missing required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }
    }

    // Debug: Log FormData contents
    console.log('FormData contents:');
    for (const [key, value] of data.entries()) {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    }

    try {
      const url = editId ? `http://localhost:5000/api/stockitems/${editId}` : 'http://localhost:5000/api/stockitems';
      const method = editId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: data
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
        image: null,
        variants: '',
        price: '',
        category: '',
        status: '',
        quantity: '',
        weight: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit button click
  const handleEdit = (stockItem: StockItem) => {
    setEditId(stockItem.id);
    setFormData({
      name: stockItem.name,
      image: null, // Image isn’t re-loaded; user must upload a new one if needed
      variants: stockItem.variants,
      price: stockItem.price,
      category: stockItem.category,
      status: stockItem.status === "InStock" ? "Delivered" : stockItem.status === "OutOfStock" ? "Cancelled" : stockItem.status,
      quantity: stockItem.quantity.toString(),
      weight: stockItem.weight.toString()
    });
  };

  // Handle delete button click
  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/stockitems/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete stock item');
      }

      setStockItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle AI query
  const handleAiQuery = async () => {
    setLoading(true);
    setError(null);
    setAiResponse('');

    try {
      const response = await fetch('http://localhost:5000/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What can I cook today?', shortAnswers: false })
      });
      if (!response.ok) throw new Error('Failed to get AI response');
      const data = await response.json();
      setAiResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageMeta title="Stock Dashboard" description="Manage your stock items" />
      <PageBreadcrumb pageTitle="Stock Management" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Add/Edit Stock Item Form */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            {editId ? 'Edit Stock Item' : 'Add New Stock Item'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Name"
              className="border p-2 rounded"
              required
            />
            <input
              type="file"
              name="image"
              onChange={handleInputChange}
              accept="image/*"
              className="border p-2 rounded"
              required={!editId} // Required only for new items
            />
            <input
              type="text"
              name="variants"
              value={formData.variants}
              onChange={handleInputChange}
              placeholder="Variants"
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="Price (e.g., $10)"
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="Category"
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
              <option value="Delivered">Delivered</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="Quantity"
              className="border p-2 rounded"
              required
              min="0"
            />
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleInputChange}
              placeholder="Weight (g)"
              className="border p-2 rounded"
              required
              min="0"
              step="0.1"
            />
            <button
              type="submit"
              disabled={loading}
              className="col-span-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? (editId ? 'Updating...' : 'Adding...') : (editId ? 'Update Stock Item' : 'Add Stock Item')}
            </button>
          </form>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        {/* AI Assistant */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">AI Meal Suggestions</h3>
          <button
            onClick={handleAiQuery}
            disabled={loading}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? 'Thinking...' : 'What can I cook today?'}
          </button>
          {aiResponse && <pre className="mt-4 p-4 bg-gray-100 rounded">{aiResponse}</pre>}
        </div>

        {/* Stock Items Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Stock Items</h3>
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow className='divide-x divide-gray-100 dark:divide-gray-800'>
                <TableCell isHeader>Stock Items</TableCell>
                <TableCell isHeader>Category</TableCell>
                <TableCell isHeader>Price</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader>Quantity</TableCell>
                <TableCell isHeader>Weight (g)</TableCell>
                <TableCell isHeader>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <TableRow><td colSpan={7} className="text-center py-3">Loading...</td></TableRow>
              ) : error ? (
                <TableRow><td colSpan={7} className="text-center py-3 text-red-500">{error}</td></TableRow>
              ) : stockItems.length === 0 ? (
                <TableRow><td colSpan={7} className="text-center py-3">No stock items found</td></TableRow>
              ) : (
                stockItems.map((stockItem) => (
                  <TableRow key={stockItem.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img src={stockItem.image} className="h-[50px] w-[50px] object-cover rounded-md" alt={stockItem.name} />
                        <div>
                          <p className="font-medium">{stockItem.name}</p>
                          <span className="text-gray-500 text-theme-xs">{stockItem.variants}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{stockItem.category}</TableCell>
                    <TableCell>{stockItem.price}</TableCell>
                    <TableCell>
                      <Badge size="sm" color={stockItem.status === "InStock" ? "success" : stockItem.status === "Pending" ? "warning" : "error"}>
                        {stockItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{stockItem.quantity}</TableCell>
                    <TableCell>{stockItem.weight}</TableCell>
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