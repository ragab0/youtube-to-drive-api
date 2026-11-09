import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiOperation } from '@nestjs/swagger';
import { ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Check the health of the API' })
  @ApiResponse({ status: 200, description: 'Hello message!' })
  getHello(): string {
    return this.appService.getHello();
  }
}
