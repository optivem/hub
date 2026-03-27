# API CRUD

Implement a simple REST API with CRUD operations for your main entity. No business logic yet — just create, read, update, and basic persistence.

1. Create a REST API with at least one entity
2. Implement endpoints: create (POST), retrieve single (GET), retrieve list (GET)
3. Persist the entity to a database
4. Verify the endpoints work by calling them manually (e.g. curl, Postman, Swagger UI)

> **eShop example:** The eShop backend exposes `POST /api/orders` (place order), `GET /api/orders/{orderNumber}` (view order), and `GET /api/orders` (browse orders). At this stage, the order just stores the input fields — no price calculation or external calls yet.

## Checklist

1. REST API has at least one entity with create and retrieve endpoints
2. Entity is persisted to a database
3. API responds correctly when called manually
