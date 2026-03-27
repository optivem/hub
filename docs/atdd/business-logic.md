# Business Logic

Add business logic that uses the external dependencies you wired up. This is the logic that acceptance tests will later verify with exact values.

1. Add at least one calculation that combines data from your system with data from an external system (e.g. price calculation, discount application, rate conversion)
2. Add at least one validation rule that rejects invalid input (e.g. quantity must be positive, entity must exist)
3. Add at least one status or state transition (e.g. placed → cancelled, pending → approved)

> **eShop example:**
> - **Calculation:** When an order is placed, the backend looks up the unit price from ERP, calculates `subtotal = unitPrice × quantity`, looks up the tax rate from the Tax API, calculates `taxAmount = subtotal × taxRate`, and computes `total = subtotal + taxAmount`.
> - **Validation:** Placing an order with a non-existent SKU returns an error. Cancelling a non-existent order returns an error.
> - **State transition:** Orders have statuses: PLACED → CANCELLED or PLACED → DELIVERED. Cancelling is only allowed for orders with status PLACED.

## Checklist

1. At least one calculation that uses data from an external system
2. At least one validation rule that rejects invalid input with a clear error
3. At least one status or state transition
4. All logic is verifiable through the API (and visible in the UI where applicable)
