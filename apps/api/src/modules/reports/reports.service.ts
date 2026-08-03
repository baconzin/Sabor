import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'FINALIZADO'
      },
      include: { items: true }
    });

    const totalRevenue = orders.reduce((acc, order) => acc + Number(order.total), 0);
    const totalOrders = orders.length;
    const ticketAverage = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Group by product
    const productsSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!productsSales[item.productId]) {
          const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
          productsSales[item.productId] = { name: product?.name || 'Desconhecido', quantity: 0, revenue: 0 };
        }
        productsSales[item.productId].quantity += item.quantity;
        productsSales[item.productId].revenue += (Number(item.totalPrice) * item.quantity);
      }
    }

    return {
      period: { start, end },
      metrics: {
        totalRevenue,
        totalOrders,
        ticketAverage
      },
      products: Object.values(productsSales).sort((a, b) => b.quantity - a.quantity)
    };
  }

  async getDeliveryReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'ENTREGUE'
      },
      include: { deliveryPerson: true }
    });

    const deliveryPersonsStats: Record<string, { name: string, count: number, totalFees: number }> = {};
    for (const delivery of deliveries) {
      if (delivery.deliveryPersonId) {
        if (!deliveryPersonsStats[delivery.deliveryPersonId]) {
          deliveryPersonsStats[delivery.deliveryPersonId] = {
            name: delivery.deliveryPerson?.name || 'Desconhecido',
            count: 0,
            totalFees: 0
          };
        }
        deliveryPersonsStats[delivery.deliveryPersonId].count += 1;
        deliveryPersonsStats[delivery.deliveryPersonId].totalFees += Number(delivery.deliveryPersonFee || 0);
      }
    }

    return {
      totalDeliveries: deliveries.length,
      byDeliveryPerson: Object.values(deliveryPersonsStats)
    };
  }
}
