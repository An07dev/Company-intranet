import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

export function apiSuccess<T>(data: T, message = "Success", status = 200) {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}

export function apiError(error = "Internal Server Error", status = 500, message?: string) {
  const body: ApiResponse = {
    success: false,
    message: message || error,
    error,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}
