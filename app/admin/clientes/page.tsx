import { getCustomersSummary } from "@/lib/services/customers";
import { getOrders } from "@/lib/services/orders";
import AdminCustomersClient from "@/components/admin/AdminCustomersClient";

export default async function AdminCustomersPage() {
  const [customers, orders] = await Promise.all([getCustomersSummary(), getOrders()]);
  return <AdminCustomersClient customers={customers} orders={orders} />;
}
