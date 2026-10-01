import { apiSuccess } from "@/server/utils/response";

export async function GET() {
  return apiSuccess({
    status: "healthy",
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
  }, "Server is up and running");
}
