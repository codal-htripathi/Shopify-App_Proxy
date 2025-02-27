import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session, liquid } = await authenticate.public.appProxy(request);

  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const loggedInCustomerId = url.searchParams.get("logged_in_customer_id");
  const type = url.searchParams.get("type");

  if ((type === "customer" || type === "header") && !loggedInCustomerId) {
    return json({ error: "Customer not logged in" }, { status: 401 });
  }

  if (type === "customer") {
    // Return Liquid-rendered response instead of JSON
    return liquid(`
          {
      "customerId": "{{ customer.id | default: 'N/A' }}",
      "email": "{{ customer.email | default: 'N/A' }}",
      "name": "{{ customer.name | default: 'N/A' }}",
      "currentCompany": "{{ customer.current_company | default: 'N/A' }}",
      "phone": "{{ customer.phone | default: 'N/A' }}"
    }`, { layout: false });
  } else if (type === "header") {
    return liquid("Hello, Shopify Store! {{ shop.name }}", { layout: false });
  }

  return json({ error: "Invalid request type" }, { status: 400 });
};
