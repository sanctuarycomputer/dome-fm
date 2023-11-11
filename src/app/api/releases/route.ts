import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import parseErrorMessage from '@/app/lib/parseErrorMessage';

const prisma = new PrismaClient()

export const revalidate = 0;
export async function GET(request: Request) {
  try {
    const releases = await prisma.release.findMany();
    return NextResponse.json({ data: releases });
  } catch(e) {
    // If error string includes: `Environment variable not found: POSTGRES_URL`,
    // deployment hasn't got a database

    // If error string includes: `does not exist in the current database.`
    // Migration hasn't run
    return NextResponse.json({ error: parseErrorMessage(e) });
  }
}