import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      status: 'ok',
      service: 'secure-notes-api',
      timestamp: new Date().toISOString(),
    };
  }
}
