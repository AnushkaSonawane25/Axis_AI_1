"use client";

import { useState } from "react";
import { formatPaise, rupeesToPaise, paiseToRupees } from "@/lib/money";
import {
  Package,
  Plus,
  Upload,
  Download,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  packSize: string;
  unit: string;
  pricePaise: number;
  stockQty: string;
  isActive: boolean;
  aliases: string[];
}

interface Props {
  initialProducts: ProductItem[];
  shop: any;
}

export function CatalogManagerClient({ initialProducts, shop }: Props) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("General");
  const [packSize, setPackSize] = useState("1 kg");
  const [unit, setUnit] = useState("kg");
  const [priceRupees, setPriceRupees] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(10);
  const [isActive, setIsActive] = useState(true);
  const [aliasesText, setAliasesText] = useState("");

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      p.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setName("");
    setBrand("");
    setCategory("General");
    setPackSize("1 kg");
    setUnit("kg");
    setPriceRupees(50);
    setStockQty(20);
    setIsActive(true);
    setAliasesText("");
    setError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setName(p.name);
    setBrand(p.brand || "");
    setCategory(p.category);
    setPackSize(p.packSize);
    setUnit(p.unit);
    setPriceRupees(paiseToRupees(p.pricePaise));
    setStockQty(parseFloat(p.stockQty));
    setIsActive(p.isActive);
    setAliasesText(p.aliases.join(", "));
    setError(null);
    setIsFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    const aliases = aliasesText
      .split(/[,;\n]/)
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    try {
      const url = "/api/catalog/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct?.id,
          name,
          brand: brand || undefined,
          category,
          packSize,
          unit,
          priceRupees: Number(priceRupees),
          stockQty: Number(stockQty),
          isActive,
          aliases,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product");

      if (editingProduct) {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === editingProduct.id
              ? {
                  ...item,
                  ...data.product,
                  aliases,
                }
              : item
          )
        );
      } else {
        setProducts((prev) => [...prev, { ...data.product, aliases }]);
      }

      setIsFormOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}" from your catalog?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/catalog/products?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setCsvLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/catalog/csv-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "CSV Import failed");

      alert(data.message);
      setIsCsvModalOpen(false);
      setCsvText("");

      // Refresh products
      const refreshRes = await fetch("/api/catalog/products");
      const refreshData = await refreshRes.json();
      if (refreshData.products) {
        setProducts(refreshData.products);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "name",
      "brand",
      "category",
      "pack_size",
      "unit",
      "price_rupees",
      "stock_qty",
      "aliases",
    ];

    const rows = products.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.brand || "").replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      `"${p.packSize.replace(/"/g, '""')}"`,
      p.unit,
      paiseToRupees(p.pricePaise),
      p.stockQty,
      `"${p.aliases.join(", ").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${shop.slug}-catalog.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sampleCsvSnippet = `name,brand,category,pack_size,unit,price_rupees,stock_qty,aliases
Aashirvaad Atta,Aashirvaad,Flours & Grains,5 kg,kg,230,20,"aata, chakki atta, wheat flour"
Madhur Sugar,Madhur,Sugar & Sweeteners,1 kg,kg,48,50,"cheeni, chini, shakkar"
Tata Salt,Tata,Spices & Seasoning,1 kg,kg,28,60,"namak, salt, tata namak"`;

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b] tracking-tight">
            Catalog Manager
          </h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            Add products, aliases (like &ldquo;cheeni&rdquo;, &ldquo;tel&rdquo;), set stock and prices in ₹.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-1.5 rounded-md border border-[#e7e0d6] bg-white hover:bg-[#faf8f5] text-xs font-semibold text-[#18181b] flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-[#71717a]" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-md border border-[#e7e0d6] bg-white hover:bg-[#faf8f5] text-xs font-semibold text-[#18181b] flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-[#71717a]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-3.5 py-1.5 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white rounded-lg border border-[#e7e0d6] flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, or alias (e.g. aata, tel, cheeni)..."
            className="w-full pl-9 pr-3 py-1.5 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[#71717a] shrink-0 font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#e7e0d6] rounded-md bg-[#faf8f5] text-xs focus:border-[#c2410c] focus:ring-0"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-[#e7e0d6] bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#f4f0eb] border-b border-[#e7e0d6] text-[#71717a] uppercase font-semibold">
              <tr>
                <th className="p-3">Product Name & Brand</th>
                <th className="p-3">Category</th>
                <th className="p-3">Pack Size</th>
                <th className="p-3 text-right">Price (₹)</th>
                <th className="p-3 text-center">Stock</th>
                <th className="p-3">Aliases (Hinglish Search)</th>
                <th className="p-3 text-center">Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e0d6]">
              {filteredProducts.map((p) => {
                const stockNum = parseFloat(p.stockQty);
                return (
                  <tr key={p.id} className="hover:bg-[#faf8f5] transition">
                    <td className="p-3">
                      <span className="font-bold text-[#18181b] block">
                        {p.name}
                      </span>
                      {p.brand && (
                        <span className="text-[11px] text-[#71717a]">
                          Brand: {p.brand}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[#52525b]">{p.category}</td>
                    <td className="p-3 text-[#52525b]">
                      <span className="font-mono">{p.packSize}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-[#18181b]">
                      {formatPaise(p.pricePaise)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          stockNum <= 0
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : stockNum < 5
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {stockNum}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {p.aliases.slice(0, 3).map((a, i) => (
                          <span
                            key={i}
                            className="bg-[#f4f0eb] border border-[#e7e0d6] px-1.5 py-0.5 rounded text-[10px] text-[#52525b]"
                          >
                            {a}
                          </span>
                        ))}
                        {p.aliases.length > 3 && (
                          <span className="text-[10px] text-[#71717a] self-center">
                            +{p.aliases.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {p.isActive ? (
                        <span className="text-emerald-700 font-semibold">Yes</span>
                      ) : (
                        <span className="text-[#a1a1aa]">No</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 text-[#71717a] hover:text-[#c2410c] rounded"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1 text-[#71717a] hover:text-rose-600 rounded"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-[#e7e0d6] space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-[#18181b]">
              {editingProduct ? "Edit Product" : "Add Product to Catalog"}
            </h3>

            {error && (
              <div className="p-3 rounded bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#18181b] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta"
                  className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Aashirvaad, Amul, Tata"
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Flours & Grains"
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Pack Size *
                  </label>
                  <input
                    type="text"
                    required
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    placeholder="e.g. 5 kg, 1 L, 100 g"
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="pack">pack</option>
                    <option value="pcs">pcs</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Price in ₹ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 230"
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#18181b] mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={stockQty}
                    onChange={(e) => setStockQty(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#18181b] mb-1">
                  Aliases (comma-separated synonyms)
                </label>
                <textarea
                  rows={2}
                  value={aliasesText}
                  onChange={(e) => setAliasesText(e.target.value)}
                  placeholder="e.g. aata, chakki atta, wheat flour, gehun"
                  className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-[#e7e0d6] text-[#c2410c] focus:ring-[#c2410c]"
                  />
                  <span className="font-semibold text-[#18181b]">
                    Product is Active in Store
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e7e0d6]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 text-xs border border-[#e7e0d6] rounded-md hover:bg-[#faf8f5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-semibold bg-[#c2410c] hover:bg-[#9a3412] text-white rounded-md transition disabled:opacity-50"
                >
                  {formLoading ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-[#e7e0d6] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#c2410c]" />
              <h3 className="font-bold text-base text-[#18181b]">
                Import Catalog from CSV
              </h3>
            </div>

            <p className="text-xs text-[#52525b] leading-relaxed">
              Paste CSV text below with columns:{" "}
              <code className="text-[#c2410c] font-mono">
                name, brand, category, pack_size, unit, price_rupees, stock_qty, aliases
              </code>
            </p>

            <div>
              <span className="text-[11px] font-semibold text-[#71717a] block mb-1">
                Sample format:
              </span>
              <pre className="p-2.5 rounded bg-[#f4f0eb] border border-[#e7e0d6] text-[11px] font-mono overflow-x-auto text-[#18181b]">
                {sampleCsvSnippet}
              </pre>
            </div>

            {error && (
              <div className="p-3 rounded bg-rose-50 text-rose-800 border border-rose-200 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#18181b] mb-1">
                Paste CSV content:
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={sampleCsvSnippet}
                className="w-full px-3 py-2 border border-[#e7e0d6] rounded-md font-mono text-xs bg-[#faf8f5] focus:border-[#c2410c] focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e7e0d6]">
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvText("");
                }}
                className="px-3.5 py-2 text-xs border border-[#e7e0d6] rounded-md hover:bg-[#faf8f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvImport}
                disabled={csvLoading || !csvText.trim()}
                className="px-4 py-2 text-xs font-semibold bg-[#c2410c] hover:bg-[#9a3412] text-white rounded-md transition disabled:opacity-50"
              >
                {csvLoading ? "Importing..." : "Import Products"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
