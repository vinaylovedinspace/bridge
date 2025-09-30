import { getBranchConfig } from '@/server/db/branch';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const branchConfig = await getBranchConfig();
    return NextResponse.json(branchConfig);
  } catch (error) {
    console.error('Error fetching branch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch branch settings' }, { status: 500 });
  }
}
