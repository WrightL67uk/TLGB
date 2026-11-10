import { NextRequest, NextResponse } from 'next/server';
import { checkCompany, searchCompanies } from '@/lib/companiesHouse';

// Sign-up helpers: ?q= searches by name or number, ?number= checks one company.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (q != null) return NextResponse.json({ ok: true, results: await searchCompanies(q) });
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
