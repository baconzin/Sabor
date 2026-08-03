'use client';
import { useState, useEffect } from 'react';
import { publicService } from '@/services/public.service';
import { MenuProduct } from '@/types/menu';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Truck, Store, MapPin, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicOrderPage() {
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orderType, setOrderType] = useState<'DELIVERY' | 'RETIRADA_BALCAO'>('DELIVERY');
  const [loading, setLoading] = useState(true);
  
  // Customer & Address State
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [address, setAddress] = useState({ zipCode: '', neighborhood: '', city: '', street: '', number: '', reference: '' });
  const [deliveryArea, setDeliveryArea] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    publicService.getMenu().then(data => {
      setProducts(data || []);
      setLoading(false);
    }).catch(() => {
      toast.error('Erro ao carregar o cardápio de hoje.');
      setLoading(false);
    });
  }, []);

  const addToCart = (product: MenuProduct) => {
    setCart([...cart, { ...product, quantity: 1, cartId: Math.random() }]);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const handleZipCodeBlur = async () => {
    if (orderType === 'DELIVERY' && address.zipCode && address.neighborhood && address.city) {
      try {
        const res = await publicService.checkDeliveryArea(address.zipCode, address.neighborhood, address.city);
        if (res.available && res.area) {
          setDeliveryArea(res.area);
          toast.success(`Área de entrega confirmada! Taxa: R$ ${res.area.deliveryFee.toFixed(2)}`);
        } else {
          setDeliveryArea(null);
          toast.error(res.message || 'Não atendemos nesta região.');
        }
      } catch (err) {
        setDeliveryArea(null);
        toast.error('Erro ao verificar área de entrega.');
      }
    }
  };

  const applyCoupon = async () => {
    if (!couponCode) return;
    try {
      const coupon = await publicService.validateCoupon(couponCode);
      if (coupon.discountType === 'PERCENTAGE') {
        const subtotal = cart.reduce((acc, item) => acc + Number(item.price), 0);
        setDiscount(subtotal * (Number(coupon.discountValue) / 100));
      } else {
        setDiscount(Number(coupon.discountValue));
      }
      toast.success('Cupom aplicado!');
    } catch (err) {
      setDiscount(0);
      toast.error('Cupom inválido ou expirado.');
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);
  const deliveryFee = orderType === 'DELIVERY' && deliveryArea ? Number(deliveryArea.deliveryFee) : 0;
  const total = subtotal + deliveryFee - discount;

  const handleSubmit = async () => {
    if (!customerInfo.name || !customerInfo.phone) return toast.error('Preencha seus dados.');
    if (orderType === 'DELIVERY' && !deliveryArea) return toast.error('Área de entrega inválida.');
    
    try {
      const order = await publicService.createOrder({
        customer: customerInfo,
        address: orderType === 'DELIVERY' ? address : null,
        type: orderType,
        items: cart.map(i => ({ productId: i.id, quantity: i.quantity })),
        coupon: couponCode,
      });
      toast.success('Pedido realizado com sucesso!');
      // Redirecionar para tela de acompanhamento
      window.location.href = `/pedidos/${order.id}/acompanhamento`;
    } catch (err) {
      toast.error('Erro ao processar pedido.');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-primary">Ponto do Sabor</h1>
          <p className="text-muted-foreground mt-2">Peça agora nossa deliciosa Marmita Tamanho M</p>
        </div>

        <div className="flex gap-4">
          <Button 
            variant={orderType === 'DELIVERY' ? 'default' : 'outline'} 
            className="flex-1 h-14 text-lg" 
            onClick={() => setOrderType('DELIVERY')}
          >
            <Truck className="mr-2" /> Delivery
          </Button>
          <Button 
            variant={orderType === 'RETIRADA_BALCAO' ? 'default' : 'outline'} 
            className="flex-1 h-14 text-lg" 
            onClick={() => setOrderType('RETIRADA_BALCAO')}
          >
            <Store className="mr-2" /> Retirada
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Cardápio do Dia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(product => (
              <Card key={product.id} className="flex flex-col justify-between">
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="font-black text-primary text-xl">R$ {product.price.toFixed(2)}</span>
                    <Button 
                      size="sm" 
                      onClick={() => addToCart(product)}
                      disabled={product.availableQty <= 0}
                    >
                      {product.availableQty > 0 ? 'Adicionar' : 'Esgotado'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {products.length === 0 && <p className="text-muted-foreground">Nenhuma marmita disponível no momento.</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart /> Seu Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.map(item => (
              <div key={item.cartId} className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">{item.quantity}x {item.name}</span>
                <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            
            <div className="pt-4 space-y-3">
              <Input placeholder="Seu Nome" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
              <Input placeholder="Telefone / WhatsApp" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
            </div>

            {orderType === 'DELIVERY' && (
              <div className="pt-4 space-y-3 border-t">
                <h4 className="font-bold flex items-center gap-2"><MapPin size={18} /> Endereço de Entrega</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="CEP" onBlur={handleZipCodeBlur} value={address.zipCode} onChange={e => setAddress({...address, zipCode: e.target.value})} />
                  <Input placeholder="Bairro" onBlur={handleZipCodeBlur} value={address.neighborhood} onChange={e => setAddress({...address, neighborhood: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Cidade" onBlur={handleZipCodeBlur} value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
                  <Input placeholder="Rua" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="col-span-1" placeholder="Nº" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} />
                  <Input className="col-span-2" placeholder="Referência" value={address.reference} onChange={e => setAddress({...address, reference: e.target.value})} />
                </div>
              </div>
            )}

            <div className="pt-4 border-t flex gap-2">
              <Input placeholder="Cupom de desconto" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
              <Button variant="outline" onClick={applyCoupon}><Tag size={16} /></Button>
            </div>

            <div className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>R$ {subtotal.toFixed(2)}</span></div>
              {orderType === 'DELIVERY' && <div className="flex justify-between"><span>Taxa de Entrega:</span><span>R$ {deliveryFee.toFixed(2)}</span></div>}
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Desconto:</span><span>- R$ {discount.toFixed(2)}</span></div>}
            </div>

            <div className="pt-2 border-t flex justify-between text-xl font-black">
              <span>Total:</span>
              <span>R$ {Math.max(0, total).toFixed(2)}</span>
            </div>

            <Button className="w-full h-12 text-lg mt-4" disabled={cart.length === 0} onClick={handleSubmit}>
              Finalizar Pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
