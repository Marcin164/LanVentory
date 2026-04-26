import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Log every HTTP request with method, path, status, duration, requestId and
 * actor (when known). Format is single-line JSON in production for parsers,
 * compact text in dev for terminal readability.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Http');
  private readonly json = process.env.NODE_ENV === 'production';

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = ctx.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Skip noisy probes — health checks would drown the log otherwise.
    if (req.url?.startsWith('/health') || req.url?.startsWith('/ready')) {
      return next.handle();
    }

    const start = Date.now();
    const requestId = req.requestId;
    const method = req.method;
    const url = req.originalUrl ?? req.url;

    return next.handle().pipe(
      tap({
        next: () => this.emit('ok', start, requestId, method, url, res, req),
        error: (err) =>
          this.emit('err', start, requestId, method, url, res, req, err),
      }),
    );
  }

  private emit(
    outcome: 'ok' | 'err',
    start: number,
    requestId: string | undefined,
    method: string,
    url: string,
    res: any,
    req: any,
    err?: any,
  ) {
    const ms = Date.now() - start;
    const status = res.statusCode ?? (err?.status ?? 500);
    const userId =
      req?.user?.properties?.metadata?.id ?? req?.user?.id ?? null;
    const fields = {
      requestId,
      method,
      url,
      status,
      ms,
      userId,
      ...(err
        ? {
            error: err?.message,
            errorName: err?.name,
          }
        : {}),
    };

    const line = this.json
      ? JSON.stringify(fields)
      : `${method} ${url} ${status} ${ms}ms${userId ? ` user=${userId}` : ''}${
          requestId ? ` rid=${requestId}` : ''
        }${err ? ` err=${err?.message}` : ''}`;

    if (outcome === 'err' || status >= 500) {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }
  }
}
