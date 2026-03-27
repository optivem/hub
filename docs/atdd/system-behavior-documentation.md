# System Behavior Documentation

## Example

In my eShop sandbox project, see the documentation for System Behavior: [https://github.com/optivem/atdd-accelerator-eshop/blob/main/docs/system-behavior.md](https://github.com/optivem/atdd-accelerator-eshop/blob/main/docs/system-behavior.md)

## 1. Identify Primary Actors

Who are the Primary Actors in your System, i.e. who will be using your System?

## 2. Identify Use Cases

What Use Cases of your System? i.e. what are the Primary Actors goals, what are they trying to do with your System?

## 3. Identify Secondary Actors

What are other External Systems that your System needs to communicate with?

- Examples of I/O External Systems: ERP, CRM, BI, Bank, Auth, Mail, SMS, Railway, Recipe Hub, Photo Gallery, etc.. Please choose whatever makes sense for your domain. These are just examples.
- Examples of Non-I/O External Systems:
  - Non-I/O Deterministic External Systems -> examples: Math Libraries (e.g. Calculus, Geospatial, Fourier Analysis), Cryptographic Libraries, etc.
  - Non-I/O Non-Deterministic External Systems -> examples: System clock, Random Number Generator Library, ML Library

I recommend that you choose the following External Systems that I've seen commonly occurring in Real Life Projects:

- I/O External System: Some external REST API
- Non-I/O Non-Deterministic External Systems: System Clock

However, if at work you also have Non-I/O Deterministic External System, then include that too.

When choosing External Systems, I recommend that you choose the types of External Systems that you use at work.

Your Use Case Diagram should include External System(s) as Secondary Actors.

For each of the External Systems, please note the links to their Production Instances (and Test Instances, if available).

## 4. Draw System Use Case Diagram

Create a Use Case Diagram, which includes the following:

- Primary Actors
- Use Cases
- Secondary Actors

Feel free to use [draw.io](https://app.diagrams.net/) or any tool you prefer.

*For an example of a UML diagram, see [UML Use Case Diagram Tutorial.](https://www.lucidchart.com/pages/tutorial/uml-use-case-diagram)*

## 5. Use Case Narrative

For each of the Use Cases above, we could write a Use Case Narrative, which lists the interactions.

In your Sandbox Project, you can choose one Use Case (choose the one with the highest business value) and write the Use Case Narrative for it.

*In a Real Life Project, you would also start with the highest-business value Use Case, and then go to the lower priority ones over time. We wouldn't do this documentation all at once (we don't want to spend weeks/months stuck in documentation), but rather do it incrementally. This might be useful for you when we reach the point of writing Acceptance Tests retroactively.*

## 6. Update GitHub Documentation

In GitHub Pages, add the above to a new section/page called System Behavior (Use Cases).

*Note: If you chose not to use GitHub Pages, then you can handle this however you choose to handle documentation.*

## Checklist

1. Primary Actors identified
2. Use Cases identified
3. Secondary Actors (External Systems) identified, including at least one I/O External System
4. System Use Case Diagram created
5. Use Case Narrative written for at least one use case
6. System Behavior documentation published (GitHub Pages or README)
