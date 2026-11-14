import { useApp } from '../context/AppContext';
import { AVAILABILITY_LABELS, formatRwf } from '../lib/format';
import type { Product } from '../shared/types';
import { SmartImage } from './SmartImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate, addToCart } = useApp();
  const primaryImage = product.images?.[0] || '';
  const sizeSpec =
    product.sizes && product.sizes.length > 0
      ? product.sizes.slice(0, 2).join(' / ')
      : product.packagingQuantity || product.material;

  const availabilityLabel =
    AVAILABILITY_LABELS[product.availabilityStatus] || 'Available';

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      image: primaryImage,
      selectedSize: product.sizes?.[0] || '',
      quantity: Math.max(1, product.moq || 1),
      unitPrice: product.unitPrice,
      wholesalePrice: product.wholesalePrice,
      moq: product.moq || 1,
      packagingQuantity: product.packagingQuantity,
    });
  };

  return (
    <article className="group bg-[#FFFFFF] border border-[#202020]/10 rounded-lg overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <a
        href={`/products/${product.slug}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/products/${product.slug}`);
        }}
        className="block aspect-[4/3] w-full bg-[#F5F5F5] overflow-hidden"
      >
        <SmartImage
          src={primaryImage}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </a>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs text-[#202020]/60">
          <span className="truncate">{product.categoryName || 'Packaging'}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{availabilityLabel}</span>
        </div>

        <h3 className="mt-1.5 text-base font-semibold text-[#202020] leading-snug line-clamp-2">
          <a
            href={`/products/${product.slug}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/products/${product.slug}`);
            }}
            className="hover:text-[#B58B61] transition-colors"
          >
            {product.name}
          </a>
        </h3>

        {sizeSpec && (
          <p className="mt-1 text-xs text-[#202020]/65 line-clamp-1">
            {sizeSpec}
          </p>
        )}

        <div className="mt-auto pt-3">
          <p className="text-sm font-semibold text-[#202020] tabular-nums">
            {product.unitPrice !== null
              ? formatRwf(product.unitPrice)
              : 'Price on Request'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate(`/products/${product.slug}`)}
              className="py-2 px-2.5 text-xs font-medium border border-[#202020]/20 text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors whitespace-nowrap"
            >
              View Details
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="py-2 px-2.5 text-xs font-medium bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors whitespace-nowrap"
            >
              Add to Cart
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/request-quote?product=${encodeURIComponent(product.name)}&productId=${product.id}`
              )
            }
            className="mt-2 w-full py-1.5 text-xs font-medium text-[#B58B61] hover:text-[#202020] transition-colors text-center"
          >
            Request Quote
          </button>
        </div>
      </div>
    </article>
  );
}
