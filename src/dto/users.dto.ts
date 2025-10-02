import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() surname?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() office?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() assetName?: string;

  @IsOptional() @IsBoolean() enabled?: boolean;

  @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) limit: number = 20;
}
