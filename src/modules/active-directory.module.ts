import { Module } from '@nestjs/common';
import { ActiveDirectoryService } from 'src/services/active-directory.service';

@Module({
  providers: [ActiveDirectoryService],
  exports: [ActiveDirectoryService], // ⬅️ eksportujemy, żeby inne moduły mogły go użyć
})
export class ActiveDirectoryModule {}
