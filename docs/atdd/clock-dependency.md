# Clock Dependency

Add a dependency on the system clock. Your system should use the clock to determine the current time as part of its normal operation — for example, setting a timestamp on created entities or making time-based decisions.

1. Identify where your system needs the current time (e.g. created-at timestamp, validity period, time-based restriction)
2. Introduce a clock abstraction (a service or API call) instead of calling the system clock directly
3. Use this clock abstraction in your API

> **eShop example:** The eShop depends on a Clock API (`GET /clock/now`) that returns the current UTC time. When an order is placed, the backend records the order timestamp from the Clock API. Later (module 9), this clock will be replaced by a stub so tests can control "what time it is."

## Checklist

1. System depends on a clock abstraction (not a direct system clock call)
2. At least one operation uses the clock (e.g. timestamps, time-based logic)
3. Clock is callable and returns the current time
