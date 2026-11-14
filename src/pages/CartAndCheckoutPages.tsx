import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import {
  formatDateTime,
  formatRwf,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../lib/format';
import { SmartImage } from '../components/SmartImage';
import type { Order } from '../shared/types';

export function CartPage() {
  const { cart, updateCartQty, removeFromCart, cartSubtotal, navigate, bootstrap } =
    useApp();
  const settings = bootstrap?.settings;

  useDocumentMeta('Shopping Cart | Eimesly Packages');

  const deliveryFee =
    settings && settings.deliveryFee > 0
      ? settings.freeDeliveryThreshold > 0 &&
        cartSubtotal >= settings.freeDeliveryThreshold
        ? 0
        : settings.deliveryFee
      : 0;

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight mb-8">
          Shopping Cart
        </h1>

        {cart.length === 0 ? (
          <div className="bg-[#F5F5F5] border border-[#202020]/10 rounded-lg p-12 text-center space-y-4">
            <ShoppingBag className="w-10 h-10 text-[#B58B61] mx-auto" />
            <h2 className="text-lg font-semibold text-[#202020]">
              Your cart is empty
            </h2>
            <p className="text-sm text-[#202020]/70">
              Add coffee cups, straws, takeaway containers, or bags to start your order.
            </p>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="px-6 py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 border border-[#202020]/10 rounded-lg divide-y divide-[#202020]/10">
              {cart.map((item) => {
                const unit =
                  item.wholesalePrice &&
                  item.quantity >= item.moq &&
                  item.moq > 1
                    ? item.wholesalePrice
                    : item.unitPrice;
                const lineTotal = unit !== null ? unit * item.quantity : null;

                return (
                  <div
                    key={`${item.productId}-${item.selectedSize}`}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="w-24 h-20 rounded-md overflow-hidden bg-[#F5F5F5] shrink-0">
                      <SmartImage src={item.image} alt={item.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/products/${item.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/products/${item.slug}`);
                        }}
                        className="text-base font-semibold text-[#202020] hover:text-[#B58B61]"
                      >
                        {item.name}
                      </a>
                      <p className="text-xs text-[#202020]/60 mt-0.5">
                        SKU: {item.sku}
                        {item.selectedSize ? ` · ${item.selectedSize}` : ''}
                      </p>
                      <p className="text-sm font-medium text-[#202020] tabular-nums mt-1">
                        {unit !== null ? formatRwf(unit) : 'Price on Request'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
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
                          className="p-2 hover:bg-[#F5F5F5]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-sm font-medium tabular-nums">
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
                          className="p-2 hover:bg-[#F5F5F5]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[95px]">
                        <p className="text-sm font-semibold text-[#202020] tabular-nums">
                          {lineTotal !== null ? formatRwf(lineTotal) : 'Quote'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(item.productId, item.selectedSize)
                        }
                        aria-label="Remove item"
                        className="p-2 text-[#202020]/45 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="lg:col-span-4 bg-[#F3EEE6] border border-[#202020]/10 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#202020]">
                Order Summary
              </h2>
              <div className="space-y-2.5 text-sm border-b border-[#202020]/10 pb-4">
                <div className="flex justify-between">
                  <span className="text-[#202020]/70">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    {cartSubtotal > 0 ? formatRwf(cartSubtotal) : 'Confirmed on Review'}
                  </span>
                </div>
                {settings && settings.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#202020]/70">Delivery Fee</span>
                    <span className="font-medium tabular-nums">
                      {deliveryFee === 0 ? 'Free' : formatRwf(deliveryFee)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-base font-bold text-[#202020]">
                <span>Total</span>
                <span className="tabular-nums">
                  {cartSubtotal > 0
                    ? formatRwf(cartSubtotal + deliveryFee)
                    : 'Confirmed on Review'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full py-3 px-4 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors"
              >
                Proceed to Checkout
              </button>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="w-full py-2.5 px-4 text-sm font-medium border border-[#202020]/20 bg-[#FFFFFF] text-[#202020] rounded-md hover:bg-[#F5F5F5]"
              >
                Continue Shopping
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const { cart, cartSubtotal, user, bootstrap, clearCart, navigate } = useApp();
  const settings = bootstrap?.settings;

  useDocumentMeta('Checkout | Eimesly Packages');

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.deliveryAddress || ''
  );
  const [district, setDistrict] = useState(user?.district || 'Kigali');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('arrange_direct');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (!customerName && user.fullName) setCustomerName(user.fullName);
      if (!phone && user.phone) setPhone(user.phone);
      if (!email && user.email) setEmail(user.email);
      if (!businessName && user.businessName)
        setBusinessName(user.businessName);
      if (!deliveryAddress && user.deliveryAddress)
        setDeliveryAddress(user.deliveryAddress);
      if (!district && user.district) setDistrict(user.district);
    }
  }, [user]);

  const deliveryFee =
    settings && settings.deliveryFee > 0
      ? settings.freeDeliveryThreshold > 0 &&
        cartSubtotal >= settings.freeDeliveryThreshold
        ? 0
        : settings.deliveryFee
      : 0;

  const hasConfiguredPayments = Boolean(
    settings?.enableMobileMoney ||
      settings?.enableBankTransfer ||
      settings?.enableCashOnDelivery
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cart.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          phone,
          email,
          businessName,
          deliveryAddress,
          district,
          orderNotes,
          paymentMethod,
          items: cart.map((c) => ({
            productId: c.productId,
            selectedSize: c.selectedSize,
            quantity: c.quantity,
          })),
        }),
      });
      clearCart();
      navigate(`/order-confirmation/${res.order.orderNumber}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to submit order.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#202020]">Checkout</h1>
        <p className="text-sm text-[#202020]/70">
          Your cart is empty. Please add packaging items before checking out.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-6 py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
        >
          Browse Catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] min-h-[75vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <button
          type="button"
          onClick={() => navigate('/cart')}
          className="inline-flex items-center gap-1.5 text-sm text-[#202020]/70 hover:text-[#202020] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cart
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#202020] tracking-tight mb-8">
          Checkout
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          <div className="lg:col-span-7 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
                {error}
              </div>
            )}

            <div className="border border-[#202020]/10 rounded-lg p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#202020]">
                Delivery & Contact Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Business / Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Delivery Address *
                  </label>
                  <input
                    required
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street, building, or landmark"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    District or City *
                  </label>
                  <input
                    required
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Order Notes
                </label>
                <textarea
                  rows={3}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Delivery timing, preferred contact instructions, or bulk packaging details..."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
            </div>

            <div className="border border-[#202020]/10 rounded-lg p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#202020]">
                Payment Arrangement
              </h2>
              <div className="space-y-2.5">
                {settings?.enableMobileMoney && (
                  <label className="flex items-start gap-3 p-3.5 border border-[#202020]/15 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile_money"
                      checked={paymentMethod === 'mobile_money'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#202020]">
                        Mobile Money
                      </span>
                      {settings.mobileMoneyInstructions && (
                        <p className="text-xs text-[#202020]/70 mt-0.5">
                          {settings.mobileMoneyInstructions}
                        </p>
                      )}
                    </div>
                  </label>
                )}

                {settings?.enableBankTransfer && (
                  <label className="flex items-start gap-3 p-3.5 border border-[#202020]/15 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#202020]">
                        Bank Transfer
                      </span>
                      {settings.bankTransferInstructions && (
                        <p className="text-xs text-[#202020]/70 mt-0.5">
                          {settings.bankTransferInstructions}
                        </p>
                      )}
                    </div>
                  </label>
                )}

                {settings?.enableCashOnDelivery && (
                  <label className="flex items-start gap-3 p-3.5 border border-[#202020]/15 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-semibold text-[#202020]">
                        Cash on Delivery
                      </span>
                      <p className="text-xs text-[#202020]/70 mt-0.5">
                        Pay upon verified delivery or collection in Kigali.
                      </p>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-3 p-3.5 border border-[#202020]/15 rounded-md cursor-pointer hover:bg-[#F5F5F5]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="arrange_direct"
                    checked={paymentMethod === 'arrange_direct'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[#202020]">
                      Arrange Payment Directly With Eimesly Packages
                    </span>
                    <p className="text-xs text-[#202020]/70 mt-0.5">
                      {hasConfiguredPayments
                        ? 'Submit your order and finalize payment directly with our sales team.'
                        : 'No online payment gateway is active yet. Submit your order and our team will confirm invoice and payment directly.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Order Summary */}
          <aside className="lg:col-span-5 bg-[#F3EEE6] border border-[#202020]/10 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#202020]">
              Order Summary
            </h2>
            <div className="divide-y divide-[#202020]/10">
              {cart.map((item) => {
                const unit =
                  item.wholesalePrice &&
                  item.quantity >= item.moq &&
                  item.moq > 1
                    ? item.wholesalePrice
                    : item.unitPrice;
                return (
                  <div
                    key={`${item.productId}-${item.selectedSize}`}
                    className="py-3 flex justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#202020]">{item.name}</p>
                      <p className="text-xs text-[#202020]/65">
                        Qty: {item.quantity}
                        {item.selectedSize ? ` · ${item.selectedSize}` : ''}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums shrink-0">
                      {unit !== null
                        ? formatRwf(unit * item.quantity)
                        : 'On Request'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#202020]/10 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#202020]/70">Subtotal</span>
                <span className="font-medium tabular-nums">
                  {cartSubtotal > 0 ? formatRwf(cartSubtotal) : 'To be confirmed'}
                </span>
              </div>
              {settings && settings.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#202020]/70">Delivery Fee</span>
                  <span className="font-medium tabular-nums">
                    {deliveryFee === 0 ? 'Free' : formatRwf(deliveryFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#202020] pt-2 border-t border-[#202020]/10">
                <span>Total</span>
                <span className="tabular-nums">
                  {cartSubtotal > 0
                    ? formatRwf(cartSubtotal + deliveryFee)
                    : 'To be confirmed'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting Order...' : 'Submit Order'}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}

export function OrderConfirmationPage({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const { navigate } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useDocumentMeta(`Order ${orderNumber} | Eimesly Packages`);

  useEffect(() => {
    apiFetch<{ order: Order }>(
      `/api/orders/track/${encodeURIComponent(orderNumber)}`
    )
      .then((res) => setOrder(res.order))
      .catch((err) => setError(err.message || 'Order not found'))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="h-48 bg-[#F5F5F5] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#202020]">Order Not Found</h1>
        <p className="text-sm text-[#202020]/70">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 text-sm font-medium bg-[#202020] text-[#FFFFFF] rounded-md"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="bg-[#F3EEE6] border border-[#202020]/10 rounded-xl p-8 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-[#B58B61] mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Order Received
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#202020] tabular-nums">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-[#202020]/75 max-w-lg mx-auto">
            Thank you, {order.customerName}. Your order has been recorded with status{' '}
            <strong>
              {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
            </strong>{' '}
            and payment status{' '}
            <strong>
              {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
            </strong>
            . Our team will verify pricing/availability and confirm next steps directly.
          </p>
        </div>

        <div className="border border-[#202020]/10 rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#202020]/10">
            <div>
              <p className="text-xs text-[#202020]/55">Placed On</p>
              <p className="text-sm font-medium text-[#202020]">
                {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#202020]/55">Delivery Location</p>
              <p className="text-sm font-medium text-[#202020]">
                {order.deliveryAddress}, {order.district}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print px-3.5 py-2 text-xs font-semibold border border-[#202020]/20 rounded-md inline-flex items-center gap-1.5 hover:bg-[#F5F5F5]"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
          </div>

          <div className="divide-y divide-[#202020]/10">
            {(order.items || []).map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium text-[#202020]">
                    {item.productName}
                  </p>
                  <p className="text-xs text-[#202020]/60">
                    Qty: {item.quantity}
                    {item.selectedSize ? ` · ${item.selectedSize}` : ''}
                  </p>
                </div>
                <span className="font-medium tabular-nums">
                  {item.lineTotal > 0 ? formatRwf(item.lineTotal) : 'Price on Review'}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#202020]/10 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#202020]/70">Subtotal</span>
              <span className="tabular-nums font-medium">
                {order.subtotal > 0 ? formatRwf(order.subtotal) : 'To be confirmed'}
              </span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-[#202020]/70">Delivery Fee</span>
                <span className="tabular-nums font-medium">
                  {formatRwf(order.deliveryFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2">
              <span>Total</span>
              <span className="tabular-nums">
                {order.totalAmount > 0
                  ? formatRwf(order.totalAmount)
                  : 'To be confirmed'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 no-print">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
          >
            Continue Shopping
          </button>
          <button
            type="button"
            onClick={() => navigate('/account/orders')}
            className="px-6 py-2.5 text-sm font-medium border border-[#202020]/20 rounded-md"
          >
            View Order History
          </button>
        </div>
      </div>
    </div>
  );
}
