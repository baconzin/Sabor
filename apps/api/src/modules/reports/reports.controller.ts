import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  getSalesReport(@Query('start') start: string, @Query('end') end: string) {
    return this.reportsService.getSalesReport(start, end);
  }

  @Get('deliveries')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  getDeliveryReport(@Query('start') start: string, @Query('end') end: string) {
    return this.reportsService.getDeliveryReport(start, end);
  }
}
