import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BaseboardDto {
  @IsOptional() @IsString() @MaxLength(256) serial_number?: string;
  @IsOptional() @IsString() @MaxLength(256) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(256) product?: string;
}

export class HardwareSectionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BaseboardDto)
  baseboard?: BaseboardDto;

  [key: string]: any;
}

export class SystemSectionDto {
  @IsOptional() @IsString() @MaxLength(512) hostname?: string;
  @IsOptional() @IsString() @MaxLength(256) os_name?: string;
  @IsOptional() @IsString() @MaxLength(256) os_version?: string;

  [key: string]: any;
}

export class DeviceScanDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SystemSectionDto)
  system?: SystemSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HardwareSectionDto)
  hardware?: HardwareSectionDto;

  @IsOptional() @IsObject() software?: Record<string, unknown>;
  @IsOptional() @IsObject() network?: Record<string, unknown>;
  @IsOptional() @IsObject() users_and_groups?: Record<string, unknown>;
  @IsOptional() @IsObject() security?: Record<string, unknown>;
  @IsOptional() @IsObject() peripherals?: Record<string, unknown>;
  @IsOptional() @IsObject() events?: Record<string, unknown>;

  @IsOptional() @IsString() @MaxLength(256) serialNumber?: string;
}
