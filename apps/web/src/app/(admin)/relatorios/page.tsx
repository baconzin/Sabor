'use client';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Download, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [salesReport, setSalesReport] = useState<any>(null);
  const [deliveryReport, setDeliveryReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [salesRes, deliveryRes] = await Promise.all([
        api.get(`/reports/sales?start=${startDate}&end=${endDate}`),
        api.get(`/reports/deliveries?start=${startDate}&end=${endDate}`)
      ]);
      setSalesReport(salesRes.data);
      setDeliveryReport(deliveryRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black">RELATÓRIOS AVANÇADOS</h1>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar PDF</Button>
      </div>

      <div className="flex gap-4 items-end bg-white p-4 rounded-lg shadow-sm">
        <div className="space-y-1">
          <label className="text-sm font-medium">Data Inicial</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Data Final</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button onClick={fetchReports} disabled={loading}>
          {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Gerar Relatório'}
        </Button>
      </div>

      {salesReport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Faturamento Total</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-primary">R$ {salesReport.metrics.totalRevenue.toFixed(2)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pedidos Realizados</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{salesReport.metrics.totalOrders}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">R$ {salesReport.metrics.ticketAverage.toFixed(2)}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Vendas por Marmita M</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport.products} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Desempenho dos Entregadores</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entregador</TableHead>
                      <TableHead className="text-right">Entregas</TableHead>
                      <TableHead className="text-right">Taxas Recebidas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryReport?.byDeliveryPerson.map((dp: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{dp.name}</TableCell>
                        <TableCell className="text-right">{dp.count}</TableCell>
                        <TableCell className="text-right">R$ {dp.totalFees.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {!deliveryReport?.byDeliveryPerson.length && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum dado no período</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
