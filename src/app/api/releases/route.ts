import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const revalidate = 0;
export async function GET(request: Request) {
  try {
    const releases = await prisma.release.findMany();
    return NextResponse.json({ data: releases });
  } catch(e) {
    if (typeof e === "string") {
      return NextResponse.json({ error: e });
    } else if (e instanceof Error) {
        e.message // works, `e` narrowed to Error
        return NextResponse.json({ error: e.message });
    } else {
      return NextResponse.json({ error: "unknown" });
    }
  }
}