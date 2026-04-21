import { IsObject, IsOptional, IsString } from 'class-validator';

export class DeviceScanDto {
  @IsOptional() @IsObject() system?: Record<string, unknown>;
  @IsOptional() @IsObject() hardware?: Record<string, unknown>;
  @IsOptional() @IsObject() software?: Record<string, unknown>;
  @IsOptional() @IsObject() network?: Record<string, unknown>;
  @IsOptional() @IsObject() users_and_groups?: Record<string, unknown>;
  @IsOptional() @IsObject() security?: Record<string, unknown>;
  @IsOptional() @IsObject() peripherals?: Record<string, unknown>;
  @IsOptional() @IsObject() events?: Record<string, unknown>;
  @IsOptional() @IsString() serialNumber?: string;
}
