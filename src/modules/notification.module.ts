import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from 'src/entities/notification.entity';
import { Users } from 'src/entities/users.entity';
import { NotificationService } from 'src/services/notification.service';
import { NotificationController } from 'src/controllers/notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Users])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
