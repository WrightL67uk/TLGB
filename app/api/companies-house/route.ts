import { NextRequest, NextResponse } from 'next/server';
import { checkCompany } from '@/lib/companiesHouse';

// Used by the join form to show the company name before submitting.
export async function GET(req: NextRequest) {
  const number = req.nextUrl.searchParams.get('number') ?? '';
  const result = await checkCompany(number);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({
    ok: true,
    companyNumber: result.companyNumber,
    name: result.name,
    status: result.status,
    incorporatedOn: result.incorporatedOn,
    registeredAddress: result.registeredAddress,
  });
}
