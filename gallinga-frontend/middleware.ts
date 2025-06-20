import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Aquí puedes añadir otra lógica de middleware si la necesitas en el futuro.
  // Por ahora, simplemente continuamos.
  return NextResponse.next();
}

export const config = {
  // Matcher para todas as rotas exceto as ignoradas acima
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\..*).*)'],
};