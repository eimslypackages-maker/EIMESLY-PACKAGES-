import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { SmartImage } from '../components/SmartImage';
import type { Category } from '../shared/types';

export function CategoriesPage() {
  const { navigate } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentMeta(
    'Product Categories | Eimesly Packages',
    'Browse all packaging product categories including coffee cups, drinking straws, takeaway containers, paper bags, and hospitality supplies in Kigali, Rwanda.'
  );

  useEffect(() => {
    apiFetch<Category[]>('/api/categories')
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh]">
      <div className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Catalogue Directory
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#202020] tracking-tight">
            Packaging Product Categories
          </h1>
          <p className="mt-2 text-base text-[#202020]/75 max-w-2xl">
            Explore packaging supplies organized by hospitality, food-service, and retail application.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-lg bg-[#F5F5F5] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/categories/${cat.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/categories/${cat.slug}`);
                }}
                className="group bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden flex flex-col hover:border-[#B58B61] transition-colors"
              >
                <div className="aspect-[4/3] bg-[#F5F5F5] overflow-hidden">
                  <SmartImage
                    src={cat.imageUrl}
                    alt={cat.name}
                    fallbackLabel={cat.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-[#202020] group-hover:text-[#B58B61] transition-colors">
                      {cat.name}
                    </h2>
                    <span className="text-xs text-[#202020]/55 tabular-nums">
                      {cat.productCount ?? 0} items
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#202020]/70 line-clamp-2 flex-1">
                    {cat.description}
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#202020]/10 flex items-center justify-between text-xs font-semibold text-[#202020]">
                    <span>Browse Category</span>
                    <ArrowRight className="w-4 h-4 text-[#B58B61]" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
