import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatRwf } from '../lib/format';
import { SmartImage } from './SmartImage';

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    cartSubtotal,
    navigate,
  } = useApp();

  if (!isCartOpen) return null;

  const hasUnpriced = cart.some((item) => item.unitPrice === null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div
        className="fixed inset-0 bg-[#202020]/50 backdrop-blur-[1px]"
        onClick={() => setCartOpen(false)}
      />
      <aside
        aria-label="Shopping cart"
        className="relative w-full max-w-md bg-[#FFFFFF] h-full flex flex-col shadow-2xl border-l border-[#202020]/10"
      >
        <div className="px-6 py-4 border-b border-[#202020]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#202020]" />
            <h2 className="text-base font-semibold text-[#202020]">
              Your Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
            className="p-2 text-[#202020]/60 hover:text-[#202020] rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#202020]/10">
          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#F3EEE6] text-[#B58B61] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-sm text-[#202020]/70">
                Your packaging cart is currently empty.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="px-5 py-2.5 text-sm font-medium bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const unit =
                item.wholesalePrice &&
                item.quantity >= item.moq &&
                item.moq > 1
                  ? item.wholesalePrice
                  : item.unitPrice;
              return (
                <div
                  key={`${item.productId}-${item.selectedSize}`}
                  className="py-4 flex gap-4"
                >
                  <div className="w-20 h-16 rounded-md overflow-hidden bg-[#F5F5F5] shrink-0">
                    <SmartImage src={item.image} alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#202020] truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#202020]/60 mt-0.5">
                      {item.selectedSize || item.packagingQuantity || item.sku}
                    </p>
                    <p className="text-xs font-medium text-[#202020] tabular-nums mt-1">
                      {unit !== null ? formatRwf(unit) : 'Price confirmed on review'}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#202020]/15 rounded-md">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQty(
                              item.productId,
                              item.selectedSize,
                              item.quantity - 1
                            )
                          }
                          aria-label="Decrease quantity"
                          className="p-1.5 hover:bg-[#F5F5F5] text-[#202020]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQty(
                              item.productId,
                              item.selectedSize,
                              item.quantity + 1
                            )
                          }
                          aria-label="Increase quantity"
                          className="p-1.5 hover:bg-[#F5F5F5] text-[#202020]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(item.productId, item.selectedSize)
                        }
                        aria-label="Remove item"
                        className="p-1.5 text-[#202020]/50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-[#202020]/10 bg-[#F5F5F5]/60 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#202020]/70">Estimated Subtotal</span>
              <span className="font-semibold text-[#202020] tabular-nums">
                {cartSubtotal > 0 ? formatRwf(cartSubtotal) : 'Confirmed on Quote'}
              </span>
            </div>
            {hasUnpriced && (
              <p className="text-xs text-[#202020]/65">
                Items marked Price on Request will have pricing confirmed by our team upon checkout.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/cart');
                }}
                className="py-2.5 px-4 text-sm font-medium border border-[#202020]/20 bg-[#FFFFFF] text-[#202020] rounded-md hover:bg-[#F5F5F5] transition-colors"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="py-2.5 px-4 text-sm font-medium bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
