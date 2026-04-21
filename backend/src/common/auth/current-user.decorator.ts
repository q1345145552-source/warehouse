import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = {
  sub: string;
  account: string;
  role: 'warehouse' | 'admin';
  warehouseId: string | null;
};

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | null => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  return request.user ?? null;
});
