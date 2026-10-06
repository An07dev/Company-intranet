import { redirect } from "next/navigation";

export default function ShopeeOrdersRedirect() {
  redirect("/dashboard/orders");
}
