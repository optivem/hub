# E2E Tests

## Practical

1. Open up "system-test" folder.
   - Note that it has E2E Tests.
2. Open up "monolith" folder.
   - Note that it has UI Controllers & API Controllers.
   - Note that the Use Case it implements is to show details of a todo item
   - Note that, to get the todo item, it calls an external system (JSONPlaceholder - a free public API)
   - Notice that the base url of the external system (JSONPlaceholder) is configurable
3. Now, you need to implement an **additional** use case - your own use case
   - Open up your Use Case Diagram (you had created it as part of the lesson "System Behavior Documentation")
   - Choose a Use Case which also spans an I/O External System (e.g. ERP API)
   - You need to ensure that you've chosen the vendor for your I/O External System:
     - You can use a ready-made public (fake) API:
       - If your External System is about posts, comments, albums, photos, todos, users, then use [jsonplaceholder](https://jsonplaceholder.typicode.com/) (other similar alternatives are [dummyjson](https://dummyjson.com/), [fakestoreapi](https://fakestoreapi.com/))
       - If your External System is about another domain, search for a [free public api](https://github.com/public-apis/public-apis) (it contains hundreds of options)
     - You can create your API of the External System (as a simulator):
       - You can also use tools like [beeceptor](https://beeceptor.com/) or [mockapi](https://mockapi.io/) whereby you can configure your External System. They generally have free plans whereby you have certain max number of requests.
       - Or you can spin up fake apis via Docker Compose, e.g. [json-server (Docker)](https://hub.docker.com/r/clue/json-server) where you have full flexibility how you spin up the External System and also you do not have any restriction regarding number of requests.
   - Now implement your Use Case that spans that I/O External System
   - If you have additional External Systems (e.g. System Clock, or others) you can implement corresponding Use Cases too
4. Please write at least 3 **additional** E2E Tests for the UI & API (we're simulating the case of a QA team who has converted manual test cases into automated E2E test cases). Please ensure you have written:
   - At least one E2E Test spans an External System Test Instance
   - At least one E2E Test covers CRUD operations (CREATE, READ, UPDATE, DELETE)
   - At least one E2E Test covers business logic (e.g. if-else logic, calculation logic)
5. At the end, feel free to **delete** that was from my template domain (e.g. delete TodoController and external system JSONPlaceholder), because from now on, you'll have your domain only.

## Notes

You'll notice above that our application has both a Web UI and public API. (There could have been additional channels, such as Mobile App, Desktop App, Console App). All of those are different "channels" how the System is exposed to the world.

In reality, teams face the challenge of "duplicating" tests across channels: one set of tests for the UI, another set for the API, another set for Mobile (so duplicating three times), even though its the same functionality.

That's why we're illustrating this problem through out Sandbox Project, so that you learn how to solve it.

## Checklist

1. At least 3 additional E2E tests written and passing
2. At least one test spans an External System
3. At least one test covers CRUD operations
4. At least one test covers business logic
5. Template domain removed (template use case and external system deleted)
