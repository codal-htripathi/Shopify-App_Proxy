// Use graphql to get customer or other details from the store if doesn't want to send any liquid code from app to the store. 
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

  if ((type === "customer" || type === "header" || type === "orders") && !loggedInCustomerId) {
    return json({ error: "Customer not logged in" }, { status: 401 });
  }

  if (type === "customer") {
    return liquid(`
      {
        "customerId": "${loggedInCustomerId}",
        "id": "${request}",
        "email": "{{ customer.email | default: 'N/A' }}",
        "name": "{{ customer.name | default: 'N/A' }}",
        "currentCompany": "{{ customer.current_company | default: 'N/A' }}",
        "phone": "{{ customer.phone | default: 'N/A' }}"
      }
    `, { layout: false });
  } else if (type === "header") {
    return liquid(`{ "message": "Hello, Shopify Store! {{ shop.name }}" }`, { layout: false });
  } else if (type === "orders") {
    const ordersJsonLiquid = `
      [
        {% for order in customer.orders %}
          {
            "orderNumber": "{{ order.name }}",
            "orderUrl": "{{ order.customer_url }}",
            "createdAt": "{{ order.created_at | date: '%Y-%m-%dT%H:%M:%S%z' }}",
            "paymentStatus": "{{ order.financial_status_label }}",
            "fulfillmentStatus": "{{ order.fulfillment_status_label }}",
            "totalAmountFormatted": "{{ order.total_net_amount | money_with_currency }}"
          }{% unless forloop.last %},{% endunless %}
        {% endfor %}
      ]
    `;
    return liquid(ordersJsonLiquid, { layout: false });
  }

  return json({ error: "Invalid request type" }, { status: 400 });
};
