# UI CRUD

Add a simple UI that lets users perform the same CRUD operations through a browser. The UI calls your API — it does not access the database directly.

1. Create a frontend application (React, Angular, Vue, etc.)
2. Add a form page to create a new entity
3. Add a list/detail page to view existing entities
4. Connect the UI to your API

> **eShop example:** The eShop frontend has a Shop page (place order form), an Order History page (list of orders), and an Order Details page. The frontend calls the backend API via `fetch` / `axios`.

## Checklist

1. UI has a form to create a new entity
2. UI has a page to view existing entities
3. UI calls the API — no direct database access
4. Creating an entity through the UI and viewing it works end-to-end
