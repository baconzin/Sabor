import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../socket/socket.gateway';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService, private eventsGateway: EventsGateway) {}

  async getTodayMenu() {
    // Only return products that are active and on today's menu
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const menu = await this.prisma.dailyMenuProduct.findMany({
      where: { dailyMenu: { date: today, isActive: true } },
      include: { product: true }
    });

    return menu.map(item => ({
      id: item.product.id,
      name: item.product.name,
      description: item.product.description,
      price: Number(item.product.price),
      imageUrl: item.product.imageUrl,
      availableQty: item.producedQty - item.reservedQty - item.soldQty - item.wastedQty,
      customizationGroups: [] // Simplified for this implementation
    }));
  }

  async checkDeliveryArea(zipCode: string, neighborhood: string, city: string) {
    // Find matching delivery area (simplified logic)
    const area = await this.prisma.deliveryArea.findFirst({
      where: {
        isActive: true,
        city: { equals: city, mode: 'insensitive' }
      }
    });

    // In a real app, we'd check zipCode ranges or neighborhood arrays
    if (area) {
      return { available: true, area };
    }
    return { available: false, message: 'Infelizmente não entregamos nesta região.' };
  }

  async validateCoupon(code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive || coupon.endDate < new Date()) {
      throw new BadRequestException('Cupom inválido ou expirado.');
    }
    if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) {
      throw new BadRequestException('Cupom esgotado.');
    }
    return coupon;
  }

  async createPublicOrder(data: any) {
    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { recipe: true }
        });
        if (!product) throw new NotFoundException('Produto não encontrado');
        
        subtotal += Number(product.price) * item.quantity;

        // Automatically decrement inventory levels for all constituent ingredients based on recipe and waste factors
        if (product.recipe && product.recipe.length > 0) {
          for (const recipeItem of product.recipe) {
            const rawQuantity = Number(recipeItem.quantity);
            const wasteFactor = 1 + (Number(recipeItem.wastePercentage || 0) / 100);
            const amountToDeduct = rawQuantity * wasteFactor * item.quantity;
            
            await tx.ingredient.update({
              where: { id: recipeItem.ingredientId },
              data: {
                inventory: { decrement: amountToDeduct }
              }
            });
          }
        }
      }

      let deliveryFee = 0;
      let areaId = null;
      if (data.type === 'DELIVERY' && data.address) {
        const areaRes = await this.checkDeliveryArea(data.address.zipCode, data.address.neighborhood, data.address.city);
        if (!areaRes.available) throw new BadRequestException(areaRes.message);
        deliveryFee = Number(areaRes.area.deliveryFee);
        areaId = areaRes.area.id;
      }

      let discount = 0;
      if (data.coupon) {
        const coupon = await this.validateCoupon(data.coupon);
        if (coupon.discountType === 'PERCENTAGE') {
          discount = subtotal * (Number(coupon.discountValue) / 100);
        } else {
          discount = Number(coupon.discountValue);
        }
        await tx.coupon.update({ where: { id: coupon.id }, data: { usesCount: { increment: 1 } } });
      }

      const total = subtotal + deliveryFee - discount;

      // Ensure customer exists
      let customer = await tx.customer.findFirst({ where: { phone: data.customer.phone } });
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: data.customer.name, phone: data.customer.phone }
        });
      }

      const order = await tx.order.create({
        data: {
          type: data.type,
          customerId: customer.id,
          subtotal,
          deliveryFee,
          discount,
          total,
          paymentMethodId: '1', // Default for now
          items: {
            create: data.items.map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: 0,
              totalPrice: 0
            }))
          },
          history: {
            create: {
              status: 'AGUARDANDO_CONFIRMACAO',
              userId: customer.id,
              notes: 'Pedido recebido via App Público'
            }
          }
        },
        include: { items: true }
      });

      if (data.type === 'DELIVERY') {
        await tx.delivery.create({
          data: {
            orderId: order.id,
            deliveryAreaId: areaId,
            customerName: data.customer.name,
            customerPhone: data.customer.phone,
            address: `${data.address.street}, ${data.address.number} - ${data.address.neighborhood}`,
            reference: data.address.reference,
            paymentMethod: 'Pix',
            amountToReceive: total,
            deliveryFee: deliveryFee
          }
        });
      }

      this.eventsGateway.emitOrderCreated(order);
      return order;
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }
}
