import { redirect } from "next/navigation";

export default function WebhookLogsRedirect() {
  redirect("/dashboard/shopee-logs?type=order_sync");
}
