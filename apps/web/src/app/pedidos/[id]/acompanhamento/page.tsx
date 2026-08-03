'use client';
import { useEffect, useState } from 'react';
import { publicService } from '@/services/public.service';
import { socketService } from '@/services/socket';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle2, ChefHat, Motorbike, PackageCheck, Loader2 } from 'lucide-react';

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const data = await publicService.getOrderStatus(params.id);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const socket = socketService.connect();
    
    socket.on('order.status.changed', ({ orderId, status }: any) => {
      if (orderId === params.id) {
        setOrder((prev: any) => ({ ...prev, status }));
      }
    });

    return () => {
      socket.off('order.status.changed');
    };
  }, [params.id]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!order) return <div className="text-center p-10 text-muted-foreground">Pedido não encontrado.</div>;

  const steps = [
    { status: 'AGUARDANDO_CONFIRMACAO', label: 'Recebido', icon: <CheckCircle2 /> },
    { status: 'EM_PREPARACAO', label: 'Na Cozinha', icon: <ChefHat /> },
    { status: order.type === 'DELIVERY' ? 'SAIU_PARA_ENTREGA' : 'AGUARDANDO_RETIRADA', label: order.type === 'DELIVERY' ? 'Em Rota' : 'Aguardando Retirada', icon: order.type === 'DELIVERY' ? <Motorbike /> : <PackageCheck /> },
    { status: order.type === 'DELIVERY' ? 'ENTREGUE' : 'RETIRADO', label: order.type === 'DELIVERY' ? 'Entregue' : 'Finalizado', icon: <CheckCircle2 /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.status === order.status);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 mt-10">
      <Card>
        <CardHeader className="text-center border-b pb-6">
          <CardTitle className="text-3xl font-black text-primary">Acompanhe seu Pedido</CardTitle>
          <p className="text-muted-foreground mt-2">Pedido #{order.orderNumber || '000'}</p>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="relative">
            {/* Linha conectora */}
            <div className="absolute left-6 top-8 bottom-8 w-1 bg-muted rounded-full" />
            
            <div className="space-y-10">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isActive = index === currentStepIndex;
                return (
                  <div key={index} className={`relative flex items-center gap-6 ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                      {step.icon}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${isActive ? 'text-foreground' : ''}`}>{step.label}</h3>
                      {isActive && <p className="text-sm font-medium">Estamos cuidando disso agora.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-10 p-4 bg-muted/50 rounded-xl">
            <h4 className="font-bold mb-2">Resumo</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold">R$ {Number(order.total || 0).toFixed(2)}</span>
            </div>
            {order.type === 'DELIVERY' && order.estimatedTime && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Previsão:</span>
                <span className="font-bold">{new Date(order.estimatedTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
