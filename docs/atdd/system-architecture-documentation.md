# System Architecture Documentation

## Example

In my eShop sandbox project, see the documentation for System Structure: [https://github.com/optivem/atdd-accelerator-eshop/blob/main/docs/system-structure.md](https://github.com/optivem/atdd-accelerator-eshop/blob/main/docs/system-structure.md)

## 1. Choose System Architecture Style

Think about the System Architecture Style of your Real Life Project and choose the same for your Sandbox:

- Monolith
- Frontend + Monolithic Backend
- Frontend + Microservice Backend
- Something else? (perhaps you also have Mobile App, Desktop App, CLI App)

## 2. Create System Architecture Diagram

Depending on your choice of System Architecture Style, you'll have some Components.

If System Architecture Style = Frontend + Monolithic Backend, then the Components are:

- Frontend
- Backend

If System Architecture Style = Frontend + Microservice Backend, then the Components are:

- Frontend
- Microservice #1
- Microservice #2
- Microservice #3

Create a System Architecture Diagram using [draw.io](https://app.diagrams.net/) or whatever tool you use at work. You could use your own informal notation, [C4 Model](https://c4model.com/) Level 1 notation, or any other notation. It should show at least:

- Components
- External Systems
- Relationships between Components
- Relationships between Components & External Systems

## 3. Choose Tech Stack

Choose the following:

- Programming Language(s)
- Database(s)
- Optionally, anything else (e.g. Frameworks, Libraries, Message Brokers)

## 4. Choose Repository Strategy

Choose the Repository Strategy that matches your Real Life Project:

- Mono-Repo — single repository for everything
- Multi-Repo — separate repositories per component

## 5. Document System Structure

If you're using GitHub Pages, create a new page for System Structure (Architecture). In there, please document the following:

- System Architecture Style
- System Architecture Diagram
- Tech Stack
- Repository Strategy

## Checklist

1. System Architecture Style chosen to match your real-life project
2. System Architecture Diagram created (shows components, external systems, and relationships)
3. Tech stack documented
4. Repository Strategy chosen to match your real-life project
5. System Structure documentation published (GitHub Pages or README)
