import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('menu')
  getMenu() {
    return this.publicService.getTodayMenu();
  }

  @Post('delivery/check')
  checkDelivery(@Body() body: { zipCode: string, neighborhood: string, city: string }) {
    return this.publicService.checkDeliveryArea(body.zipCode, body.neighborhood, body.city);
  }

  @Post('coupons/validate')
  validateCoupon(@Body() body: { code: string }) {
    return this.publicService.validateCoupon(body.code);
  }

  @Post('orders')
  createOrder(@Body() body: any) {
    return this.publicService.createPublicOrder(body);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.publicService.getOrder(id);
  }
}
