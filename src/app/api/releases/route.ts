import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const revalidate = 0;
export async function GET(request: Request) {
  let releases: { id: string }[] = [];
  try {
    releases = await prisma.release.findMany();
  } catch(e) {
    console.log(e);
  }
  
  return NextResponse.json({ data: releases });
}