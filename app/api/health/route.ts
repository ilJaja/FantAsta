import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({ok:true,service:"FantAsta",version:"0.2.0"})}
