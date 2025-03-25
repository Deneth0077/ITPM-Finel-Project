// RecentOrders.tsx
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";

interface Product {
  id: string;
  name: string;
  variants: string;
  category: string;
  price: string;
  status: "InStock" | "Pending" | "OutOfStock";
  image: string;
  quantity: number;
  weight: number;
}

export default function RecentOrders() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStockItems = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/stockitems');
        if (!response.ok) throw new Error('Failed to fetch stock items');
        const data = await response.json();

        interface StockItem {
          id: string;
          name: string;
          variants: string;
          category: string;
          price: string;
          status: "InStock" | "Pending" | "OutOfStock";
          image: string;
          quantity: number;
          weight: number;
        }

        const mappedData: Product[] = data.map((item: StockItem) => ({
          id: item.id,
          name: item.name,
          variants: item.variants,
          category: item.category,
          price: item.price,
          status: item.status,
          image: item.image,
          quantity: item.quantity,
          weight: item.weight
        }));

        setProducts(mappedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStockItems();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Orders</h3>
        {/* Filter and See all buttons unchanged */}
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader>Products</TableCell>
              <TableCell isHeader>Category</TableCell>
              <TableCell isHeader>Price</TableCell>
              <TableCell isHeader>Status</TableCell>
              <TableCell isHeader>Quantity</TableCell>
              <TableCell isHeader>Weight (g)</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><td colSpan={6} className="text-center py-3">Loading...</td></TableRow>
            ) : error ? (
              <TableRow><td colSpan={6} className="text-center py-3 text-red-500">{error}</td></TableRow>
            ) : products.length === 0 ? (
              <TableRow><td colSpan={6} className="text-center py-3">No recent orders found</td></TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={product.image} className="h-[50px] w-[50px] object-cover rounded-md" alt={product.name} />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <span className="text-gray-500 text-theme-xs">{product.variants}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>
                    <Badge size="sm" color={product.status === "InStock" ? "success" : product.status === "Pending" ? "warning" : "error"}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>{product.weight}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}