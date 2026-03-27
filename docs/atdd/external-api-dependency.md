# External API Dependency

Add a dependency on at least one external REST API. Your system should call this API as part of its normal operation — not just at startup.

1. Identify a piece of data your system needs from an external source (e.g. product details, pricing, exchange rates, weather)
2. Create a mock external API server that returns this data (e.g. using json-server, WireMock, or a simple Express/Flask app)
3. Have your API call this external API during a create or retrieve operation
4. Add the external API to your docker-compose so it starts alongside your application

> **eShop example:** The eShop depends on an ERP API (`GET /erp/products/{sku}`) for product details and a Tax API (`GET /tax/countries/{code}`) for tax rates. These are simulated by a json-server running on port 9001. When an order is placed, the backend calls the ERP API to look up the product price and the Tax API to get the tax rate.

## Checklist

1. System depends on at least one external REST API
2. External API is callable and returns data
3. System calls the external API during a normal operation (not just startup)
4. External API starts as part of docker-compose
