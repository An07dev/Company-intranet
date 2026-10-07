import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/server/db";
import { MongoProductImageModel } from "@/server/db/schema";

export const maxDuration = 30;

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse("Missing image id", { status: 400, headers: corsHeaders });
    }

    const cleanId = id.replace(/\.[a-zA-Z0-9]+$/, "");

    await connectToDatabase();
    const doc = await MongoProductImageModel.findOne({ id: cleanId });

    if (!doc || !doc.data) {
      return new NextResponse("Image not found", { status: 404, headers: corsHeaders });
    }

    const buffer = Buffer.from(doc.data, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": doc.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Get Public Image Error]:", error);
    return new NextResponse("Error loading image", { status: 500, headers: corsHeaders });
  }
}
