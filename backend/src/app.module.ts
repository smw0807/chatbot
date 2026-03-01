import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { ConfigModule } from './config/config.module';
@Module({
  imports: [ChatModule, ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
