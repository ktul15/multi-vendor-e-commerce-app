# Project Instructions for AI Assistant

These rules must be strictly followed when assisting with the Multi-Vendor E-Commerce App project.

## 1. Milestone Initiation Protocol
When beginning a new milestone (M1, M2, M3, etc.), the AI **MUST** perform the following verification before writing any implementation plans or code:
1. **Read `GITHUB_ISSUES.md`**: Locate the exact markdown section for the specific milestone.
2. **Count and Map**: Count the total number of issues listed under that milestone in `GITHUB_ISSUES.md`.
3. **Synchronize `task.md`**: Map every single issue number and title exactly into the `/brain/.../task.md` file. 
4. **Verification**: Explicitly state the total count of issues found in `GITHUB_ISSUES.md` and confirm that the count in `task.md` matches perfectly. Do not summarize or skip any issues.

## 2. Dependency Injection Pattern
- **Constructor Injection**: All repositories, API clients, and services that communicate with the network, database, or external APIs must have their dependencies injected via the constructor.
- **Service Locator (`get_it`)**: Repositories and BLoCs should be registered and resolved using the `get_it` package in `injection_container.dart`.
- **Testability**: Dependencies should never be tightly coupled using static instances (e.g., `ApiClient.instance`) inside class logic. They should always be injected so they can be mocked.

## 3. Flutter Environment Configuration
- Use Dart-only environment configuration via `--dart-define`.
- Do not introduce `.env` files or packages like `flutter_dotenv` for Flutter apps unless explicitly requested by the user.

## 4. Git Workflow
- When completing an issue, commit the changes to the feature branch, merge it into `dev`, then merge `dev` into `main`, and push all branches to `origin`.

## 5. Testing Requirements
- **Always Write Tests**: Unit tests must be written for all new functionality.
  - **Flutter**: BLoCs, Repositories, and core utilities must be thoroughly tested using `flutter_test`, `bloc_test`, and `mocktail`.
  - **Backend**: Express routes, controllers, and services must have unit/integration tests using Jest or your preferred testing framework.
- Tests should cover success cases, expected failure cases (like 401s, 404s), and edge cases.
