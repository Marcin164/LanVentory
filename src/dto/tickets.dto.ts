import { IsOptional, IsEnum, IsString, IsNumber } from 'class-validator';
import {
  TicketImpact,
  TicketPriority,
  TicketUrgency,
  TicketType,
} from 'src/entities/tickets.entity';

export class GetTicketsQueryDto {
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 30;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  assignee?: string;

  @IsOptional()
  requester?: string;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  assignmentGroup?: string;

  @IsOptional()
  @IsEnum(TicketImpact)
  impact?: TicketImpact;

  @IsOptional()
  @IsEnum(TicketUrgency)
  urgency?: TicketUrgency;
}

export class UpdateTicketDto {
  @IsOptional()
  assignee?: string;

  @IsOptional()
  assignmentGroup?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketImpact)
  impact?: TicketImpact;

  @IsOptional()
  @IsEnum(TicketUrgency)
  urgency?: TicketUrgency;

  @IsOptional()
  category?: string;
}

export class CreateTicketDto {
  type: TicketType;
  description: string;
  requesterId: string;
  assignmentGroup: string;
  priority?: TicketPriority;
  impact?: TicketImpact;
  urgency?: TicketUrgency;
  category?: string;
}
