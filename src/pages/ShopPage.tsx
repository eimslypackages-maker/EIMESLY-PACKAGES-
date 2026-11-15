import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import type { Category, Product } from '../shared/types';

interface ShopResponse {
  items: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  facets: {
    materials: string[];
    sizes: string[];
    brands: string[];
  };
}

interface ShopPageProps {
  categorySlug?: string;
}

export function ShopPage({ categorySlug = '' }: ShopPageProps) {
  const { path, navigate, bootstrap } = useApp();
  const categories: Category[] = bootstrap?.categories || [];

  const searchParams = new URLSearchParams(path.split('?')[1] || '');
  const initialSearch = searchParams.get('search') || '';

  const [selectedCategory, setSelectedCategory] = useState(categorySlug);
  const [search, setSearch] = useState(initialSearch);
  const [material, setMaterial] = useState('');
  const [size, setSize] = useState('');
  const [availability, setAvailability] = useState('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [data, setData] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedCategory(categorySlug);
    setPage(1);
  }, [categorySlug]);

  useEffect(() => {
    const sp = new URLSearchParams(path.split('?')[1] || '');
    const s = sp.get('search') || '';
    setSearch(s);
    setPage(1);
  }, [path]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  useDocumentMeta(
    activeCategoryObj
      ? `${activeCategoryObj.name} | Eimesly Packages`
      : 'Shop All Packaging Products | Eimesly Packages',
    activeCategoryObj?.description ||
      'Browse coffee cups, drinking straws, takeaway containers, paper bags, and wholesale food packaging in Kigali, Rwanda.'
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (search.trim()) params.set('search', search.trim());
    if (material) params.set('material', material);
    if (size) params.set('size', size);
    if (availability) params.set('availability', availability);
    if (brand) params.set('brand', brand);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '20');

    apiFetch<ShopResponse>(`/api/products?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedCategory,
    search,
    material,
    size,
    availability,
    brand,
    minPrice,
    maxPrice,
    sort,
    page,
  ]);

  const resetFilters = () => {
    setSelectedCategory('');
    setSearch('');
    setMaterial('');
    setSize('');
    setAvailability('');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setSort('featured');
    setPage(1);
    if (categorySlug) navigate('/shop');
  };

  const items = data?.items || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
  const facets = data?.facets || { materials: [], sizes: [], brands: [] };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202020]/60 mb-3">
          Category
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
              if (categorySlug) navigate('/shop');
            }}
            className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
              !selectedCategory
                ? 'bg-[#202020] text-[#FFFFFF] font-medium'
                : 'text-[#202020]/80 hover:bg-[#F5F5F5]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.slug);
                setPage(1);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedCategory === cat.slug
                  ? 'bg-[#202020] text-[#FFFFFF] font-medium'
                  : 'text-[#202020]/80 hover:bg-[#F5F5F5]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202020]/60 mb-2.5">
          Availability
        </h3>
        <select
          value={availability}
          onChange={(e) => {
            setAvailability(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md focus:outline-none focus:border-[#B58B61]"
        >
          <option value="">All Statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="made_to_order">Made to Order</option>
          <option value="sample_listing">Sample Catalogue Item</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202020]/60 mb-2.5">
          Price Range (RWF)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 text-sm border border-[#202020]/15 rounded-md tabular-nums"
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="w-full px-2.5 py-2 text-sm border border-[#202020]/15 rounded-md tabular-nums"
          />
        </div>
      </div>

      {facets.materials.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202020]/60 mb-2.5">
            Material
          </h3>
          <select
            value={material}
            onChange={(e) => {
              setMaterial(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
          >
            <option value="">All Materials</option>
            {facets.materials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {facets.sizes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202020]/60 mb-2.5">
            Product Size
          </h3>
          <select
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
          >
            <option value="">All Sizes</option>
            {facets.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {facets.brands.length > 1 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#202020]/60 mb-2.5">
            Brand
          </h3>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md"
          >
            <option value="">All Brands</option>
            {facets.brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={resetFilters}
        className="w-full py-2 px-3 text-xs font-semibold border border-[#202020]/20 text-[#202020] rounded-md hover:bg-[#F5F5F5]"
      >
        Reset All Filters
      </button>
    </div>
  );

  return (
    <div className="bg-[#FFFFFF] min-h-[75vh]">
      <div className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Eimesly Packages Catalogue
          </p>
          <h1 className="mt-1.5 text-3xl font-bold text-[#202020] tracking-tight">
            {activeCategoryObj ? activeCategoryObj.name : 'Shop Packaging Products'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#202020]/75 max-w-2xl">
            {activeCategoryObj?.description ||
              'Browse food packaging products, coffee cups, drinking straws, takeaway containers, and hospitality supplies available for retail and wholesale orders.'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#202020]/10">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#202020]/45 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by product name, SKU, material..."
                className="w-full pl-9 pr-8 py-2 text-sm bg-[#F5F5F5] border border-[#202020]/10 rounded-md focus:outline-none focus:border-[#B58B61]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#202020]/50 hover:text-[#202020]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden px-3 py-2 text-sm font-medium border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            <span className="text-xs text-[#202020]/65 tabular-nums">
              Showing {items.length} of {pagination.total} products
            </span>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-[#FFFFFF] border border-[#202020]/15 rounded-md focus:outline-none focus:border-[#B58B61]"
            >
              <option value="featured">Featured Products</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="alpha">Alphabetical Order</option>
            </select>
          </div>
        </div>

        {/* Main Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="hidden lg:block lg:col-span-3">
            {filterPanel}
          </aside>

          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-80 rounded-lg bg-[#F5F5F5] animate-pulse"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-[#F5F5F5] border border-[#202020]/10 rounded-lg p-12 text-center space-y-4">
                <h2 className="text-lg font-semibold text-[#202020]">
                  No Matching Products Found
                </h2>
                <p className="text-sm text-[#202020]/70 max-w-md mx-auto">
                  We could not find products matching your current filters or search query. Clear your filters or request a custom quotation for specific packaging items.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-5 py-2.5 text-sm font-medium bg-[#202020] text-[#FFFFFF] rounded-md"
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/request-quote')}
                    className="px-5 py-2.5 text-sm font-medium border border-[#202020]/20 bg-[#FFFFFF] text-[#202020] rounded-md"
                  >
                    Request a Quote
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-10 pt-6 border-t border-[#202020]/10 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-2 text-sm font-medium border border-[#202020]/20 rounded-md inline-flex items-center gap-1 disabled:opacity-40 hover:bg-[#F5F5F5]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from(
                        { length: pagination.totalPages },
                        (_, idx) => idx + 1
                      ).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPage(num)}
                          className={`w-9 h-9 text-sm font-medium rounded-md tabular-nums ${
                            num === pagination.page
                              ? 'bg-[#202020] text-[#FFFFFF]'
                              : 'border border-[#202020]/15 text-[#202020] hover:bg-[#F5F5F5]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      className="px-3.5 py-2 text-sm font-medium border border-[#202020]/20 rounded-md inline-flex items-center gap-1 disabled:opacity-40 hover:bg-[#F5F5F5]"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#202020]/50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative w-80 max-w-full bg-[#FFFFFF] h-full overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#202020]/10">
              <h2 className="text-base font-semibold text-[#202020]">
                Filter Products
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 text-[#202020]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
