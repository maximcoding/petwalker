# Language-Specific Review Hints

Use only when relevant. Do not let these replace intent and requirement-fit review.

## Java / Spring Boot

- **Modern Java baseline:** use project-supported Java features such as records, sealed classes, pattern matching, switch expressions, and text blocks where they improve clarity.
- **Records for DTOs:** prefer records for immutable request/response DTOs and internal data carriers when framework serialization supports them.
- **Explicit contracts:** public APIs, DTOs, service methods, and repository boundaries have clear parameter/return types; avoid raw types and unbounded generics.
- **Null safety:** make nullability explicit with validation, non-null contracts, or `Optional` for optional returns; do not use `Optional` for entity fields or method parameters by default.
- **Constructor injection:** use constructor injection; avoid field injection and hidden service locators.
- **Bean validation:** validate inbound DTOs with `jakarta.validation` and enforce business invariants in services/domain logic.
- **Layered ownership:** controllers handle HTTP; services own business rules; repositories own persistence; mappers own model conversion.
- **Thin controllers:** controllers bind requests/responses, resolve dependencies, validate input, call services, and return stable responses; no business or persistence logic.
- **Domain packaging:** organize code by functional domain/module where practical, not only by technical layer.
- **Spring Modulith:** use Spring Modulith or module-boundary tests where modular-monolith boundaries need enforcement; modules communicate through defined interfaces/events.
- **Transaction discipline:** place `@Transactional` on service/use-case boundaries; keep transactions short and avoid external API calls inside transactions.
- **Persistence boundary:** do not leak JPA entities to public API responses; map entities to DTOs/domain models.
- **JPA loading:** prevent N+1 queries with projections, fetch joins, `@EntityGraph`, or explicit query design.
- **Explicit SQL option:** prefer jOOQ, Spring Data JDBC, or projections for complex/data-intensive queries where predictable SQL is more important than ORM convenience.
- **Repository safety:** use typed query methods, JPQL, Criteria, jOOQ, or safe native queries; never concatenate user input into SQL/JPQL.
- **Migration discipline:** manage schema changes with Flyway/Liquibase; keep entity mappings and migrations aligned.
- **Problem details:** use `ProblemDetail` / RFC-style error responses through exception handlers for stable machine-readable API errors.
- **Security:** authenticate and authorize before expensive work or mutations; use method-level security where it matches service ownership.
- **Secrets and config:** read secrets from config/secret stores; use typed `@ConfigurationProperties`; avoid scattered raw `@Value` usage.
- **HTTP clients:** prefer `RestClient` for synchronous service-to-service calls; use `WebClient` for reactive pipelines; all clients need timeouts, bounded retries/backoff, and clear error mapping.
- **Declarative HTTP clients:** use Spring HTTP Interfaces such as `@HttpExchange` when typed external client contracts reduce boilerplate and improve testability.
- **Virtual threads:** for Java 21+ I/O-heavy Spring MVC apps, use virtual threads when project/runtime supports it; verify blocking libraries, connection pools, and ThreadLocal-heavy code.
- **Pinning awareness:** audit frequent or long blocking sections under `synchronized`/native calls when using virtual threads; measure pinning rather than guessing.
- **Reactive discipline:** if using WebFlux/Reactor, do not block reactive pipelines; isolate unavoidable blocking work on bounded schedulers.
- **Async work:** use managed executors, scheduling, queues, or messaging; avoid unmanaged threads.
- **Native image / AOT readiness:** when GraalVM/native image is a target, avoid reflection-heavy patterns or provide `RuntimeHintsRegistrar` / explicit runtime hints for reflection, resources, proxies, and serialization.
- **Reliability patterns:** outbound calls use timeouts, bulkheads, rate limits, circuit breakers, and retries only when idempotent/safe.
- **Observability:** use structured logs, metrics, traces, and correlation IDs; Micrometer/OpenTelemetry data must not leak secrets or PII.
- **API documentation:** OpenAPI/SpringDoc contracts reflect request/response schemas, auth, status codes, and important error cases.
- **Profile management:** use profiles and environment-specific config deliberately; production defaults must be safe.
- **Resource cleanup:** use try-with-resources for closeable resources; tune connection pools for expected workload.
- **Lombok restraint:** avoid Lombok `@Data` on JPA entities; prevent recursive `toString`, unstable `equals/hashCode`, and lazy-loading surprises.
- **Idempotency:** retryable writes and message handlers use idempotency keys, unique constraints, or safe upsert semantics.
- **Messaging:** consumers validate payloads, handle retries/dead letters, and avoid duplicate side effects.
- **Testing:** use unit tests for services/mappers, web slice tests for controllers, `@DataJpaTest`/Testcontainers for persistence, and integration tests for transactions/messaging.

## Python

- **Explicit typing:** public APIs and shared models have parameter and return types; avoid `Any` or generic `dict` in public contracts unless justified.
- **Modern type operators:** use `|` for unions, for example `str | None`; use `Annotated` for metadata when useful.
- **Modern typing tools:** use `Literal`, `Final`, `Protocol`, and `TypeAlias` when they make contracts clearer.
- **Immutable defaults:** never use mutable default arguments; use `None` or `default_factory`.
- **Structured exceptions:** avoid bare `except:`; catch specific errors and use `raise ... from` when wrapping.
- **Error visibility:** do not swallow exceptions without logging, context, or a defined recovery path.
- **Context management:** use `with` / `async with` for managed resources such as files, locks, sessions, and clients.
- **Async integrity:** do not call blocking I/O inside `async def`; avoid sync DB/HTTP clients and `time.sleep` in async paths.
- **Structured concurrency:** use `asyncio.TaskGroup` for related concurrent tasks that must fail/cancel together.
- **Boundary validation:** validate external data at entry points with Pydantic, msgspec, dataclasses + validators, or equivalent.
- **Exact decimals:** use `Decimal` or integer minor units for money and precision-critical values; avoid `float` for currency.
- **Timezone safety:** avoid naive datetimes for persistence/business logic; use timezone-aware objects and `zoneinfo` when local zones matter.
- **SQL safety:** use parameterized queries or safe query builders; never use string interpolation for SQL.
- **Shell safety:** avoid shell string construction with untrusted input; use argument arrays when running commands.
- **Collection specificity:** prefer `Mapping`, `Sequence`, `Iterable`, or `Collection` for read-only inputs; use concrete types when mutation or serialization is part of the contract.
- **Lazy processing:** use generators/iterators for large datasets or streams when full materialization is wasteful.
- **Path handling:** use `pathlib.Path` for file and directory operations; avoid raw string path joining.
- **String formatting:** prefer f-strings for safe local string interpolation; never use them across SQL/shell/security boundaries.
- **Dependency injection:** pass dependencies explicitly instead of hiding them in global state or hardcoded singletons.
- **Encapsulation:** mark internal members with `_leading_underscore`; use `@property` only when controlled access or computed values are needed.
- **Secrets/PII:** do not log secrets, tokens, credentials, or sensitive user data.
- **Tests:** cover error paths and edge cases, not only happy paths.

## Python / FastAPI

- **Typed contracts:** route inputs, outputs, dependencies, and service boundaries have explicit type hints; use `| None` for optionality.
- **Annotated dependencies:** use `Annotated[T, Depends(...)]`, `Path`, `Query`, `Body`, and `Header` where metadata improves clarity and OpenAPI output.
- **FastAPI dependency injection:** use `Depends()` for request-scoped DB sessions, authentication, current user/device, services, and reusable boundary logic.
- **Yield dependencies:** use dependency `yield` cleanup for request-scoped resources such as DB sessions or clients.
- **Lifespan management:** use FastAPI lifespan / `@asynccontextmanager` for app-level startup/shutdown resources such as pools, caches, clients, and models.
- **Pydantic v2 validation:** use `BaseModel` for request/response bodies; use `field_validator` and `model_validator` for field and cross-field validation.
- **Schema separation:** separate request, response, and persistence models when reuse could leak fields or couple API contracts to internals.
- **Serialization safety:** use Pydantic v2 serialization intentionally, such as `model_dump(mode="json")`, when returning or logging types like `Decimal`, `UUID`, `datetime`, or `SecretStr`.
- **Secret fields:** use `SecretStr` / secret-safe types for tokens, passwords, credentials, and sensitive config where relevant.
- **OpenAPI contract:** document important examples, response models, and expected error responses for frontend/client consumers.
- **Thin routers:** routers handle HTTP binding, dependency resolution, status codes, and response wiring; business logic lives in services.
- **Service layer:** services own business rules and orchestration; they do not know FastAPI request/response objects.
- **Repository layer:** repositories own data access; SQLAlchemy/session logic does not leak into routers.
- **Async SQLAlchemy:** use SQLAlchemy 2.x async patterns and `AsyncSession`; avoid sync DB calls in async routes/services.
- **Transaction boundaries:** keep transactions short; commit/rollback safely and avoid network calls inside DB transactions.
- **N+1 prevention:** use explicit loading strategies such as `selectinload`, `joinedload`, joins, or projection queries when relationship loading affects performance.
- **Structured errors:** use custom exceptions and FastAPI exception handlers to return stable JSON error envelopes without leaking internals.
- **Auth before work:** authenticate and authorize before expensive reads, mutations, or side effects.
- **Structured logging:** include request/trace IDs and safe domain identifiers; redact secrets and PII.
- **Middleware discipline:** use middleware for cross-cutting concerns such as CORS, compression, request IDs, and timing; do not put business logic there.
- **Background work:** use `asyncio.TaskGroup` for bounded in-process concurrent work; use a worker/job system for durable or long-running background tasks.
- **Concurrency safety:** avoid shared mutable state across async tasks; protect shared state or keep task results isolated and merged explicitly.
- **Streaming:** use `StreamingResponse` with generators/async generators for large responses; handle cancellation and cleanup if clients disconnect.
- **Testing:** use `httpx.AsyncClient` for API integration tests, unit-test Pydantic validation, test service logic separately, and use real DB tests for repository/integration behavior where correctness depends on SQL.

## PostgreSQL / SQL

- **Parameterized queries:** Never use string interpolation for SQL; bind parameters for all user-supplied data.
- **Safe schema evolution:** Add `NOT NULL` columns to existing tables in stages: nullable column → backfill →
  `SET NOT NULL`.
- **Lock mitigation:** Use `CREATE INDEX CONCURRENTLY` for large tables; use `NOT VALID` + `VALIDATE CONSTRAINT` for
  existing data constraints.
- **Data type integrity:** Use `TIMESTAMPTZ` for persisted timestamps and `NUMERIC` for exact values/money; ban `FLOAT`
  for precision-critical data.
- **Flexible text:** Prefer `TEXT` over `VARCHAR(n)` unless length is a strict domain constraint.
- **Index strategy:** Index foreign keys, join columns, and high-selectivity filters; match multi-column indexes to
  query predicates and sort order.
- **Query optimization:** Run `EXPLAIN (ANALYZE, BUFFERS)` on hot-path or high-risk query changes.
- **Bounded results:** Enforce explicit limits, cursor, or keyset pagination on variable-sized result sets.
- **JSONB handling:** Validate JSONB structure at the application boundary and add appropriate indexes, often `GIN`, for
  queried keys.
- **Transaction locality:** Keep transactions short; ban network calls inside database transactions.
- **Idempotency:** Target explicit unique constraints when using `INSERT ... ON CONFLICT`.
- **Bulk operations:** Batch massive `UPDATE`/`DELETE` operations to reduce bloat and allow autovacuum to keep up.
- **Mutation safety:** Require safe predicates and expected row-count behavior for `UPDATE`/`DELETE` statements.
- **Foreign keys:** Define explicit `ON DELETE` behavior: `CASCADE`, `RESTRICT`, or `SET NULL`; use soft delete
  deliberately when that is the domain model.
- **Reversible migrations:** Require a down path or an explicit destructive justification for every migration.
- **Enum stability:** Prefer lookup tables or check constraints over native ENUMs for highly mutable value sets.
- **Isolation awareness:** Use stricter isolation levels only for cross-row consistency; implement retry logic for
  serialization failures.

## Android / Kotlin

- **Unidirectional data flow:** UI emits events up; state flows down from `ViewModel`/state holder; UI is a function of current state.
- **State ownership:** screen/business state lives in `ViewModel`; use `SavedStateHandle` for navigation args and minimal restorable state after process death.
- **Compose lifecycle:** collect flows with `collectAsStateWithLifecycle()` to avoid background collection and wasted work.
- **Stateless composables:** composables render state and emit events; no business logic, DB/network calls, or heavy computation inside `@Composable`.
- **Compose performance:** use `remember` / `derivedStateOf` only where they prevent real repeated work; provide stable keys for lazy lists when item identity matters.
- **Stability and skipping:** rely on strong skipping by default; use `@Stable` / `@Immutable` only when the model truly satisfies the contract and a recomposition issue is proven.
- **Composition over inheritance:** avoid deep class hierarchies; compose focused objects, functions, interfaces, and Kotlin delegates.
- **Interface-driven boundaries:** use interfaces for repositories, data sources, platform services, and integrations where swapping/testing matters.
- **Single responsibility:** ViewModels, use cases, repositories, workers, and platform wrappers each have one clear purpose.
- **Dependency inversion:** UI/domain code does not depend directly on database, network, or platform implementation details.
- **Interface segregation:** prefer small focused interfaces over large general-purpose contracts.
- **Encapsulation:** use `private` / `internal` to hide module and class internals; expose only stable public contracts.
- **Immutability by default:** use `data class` + `val` for UI/domain state models; avoid shared mutable state.
- **Global state:** avoid mutable singletons/static state for app data; manage lifecycles through DI.
- **Layer ownership:** keep UI, domain, data, network, database, and platform responsibilities separated.
- **Feature modularization:** group feature code by feature; keep shared infrastructure in `core` modules.
- **Core isolation:** `core` modules do not depend on feature modules.
- **Boundary mapping:** map DTOs/entities to domain/UI models before exposing them outside the data layer.
- **Context safety:** do not store `Activity`, `Fragment`, `View`, or short-lived `Context` in `ViewModel` or long-lived objects; use `ApplicationContext` only when functionally required.
- **Structured concurrency:** no `GlobalScope`; use lifecycle-aware scopes and inject dispatchers where testability matters.
- **Main-thread integrity:** no network, database, file I/O, heavy JSON parsing, bitmap work, or CPU-heavy work on the main thread.
- **Navigation discipline:** use official type-safe navigation for Compose; trigger navigation from screen-level handlers, not leaf composables.
- **Predictive back:** handle custom back behavior with `BackHandler` / `PredictiveBackHandler` where needed; do not break system back gestures.
- **Dependency injection:** use the project DI framework for repositories, use cases, clients, and platform wrappers.
- **Repository boundary:** ViewModels call use cases/repositories; repositories wrap DAOs and network clients.
- **Room / DataStore:** Room migrations are explicit; DataStore is for small preferences/config state, not relational/cache storage.
- **Edge-to-edge / insets:** implement edge-to-edge-ready layouts and handle status bars, navigation bars, display cutouts, and IME with correct `WindowInsets`.
- **WorkManager:** use for persistent deferrable work; define constraints, retry/backoff, and idempotency.
- **Permission lifecycle:** handle granted, denied, rationale, permanently denied, and unavailable states with modern Activity Result APIs.
- **Platform integrity:** guard API-specific calls with `Build.VERSION` checks; encapsulate platform APIs behind owning wrappers/modules.
- **Privacy / PII:** do not log tokens, credentials, precise locations, phone numbers, transcripts, or sensitive user data.
- **Network resilience:** handle non-2xx responses, timeouts, cancellation, retries, and offline/cache behavior; define a local source of truth where required.
- **Resource lifecycle:** unregister listeners/receivers, cancel jobs, and release hardware handles in the owning lifecycle cleanup.
- **Accessibility:** enforce 48dp touch targets, meaningful labels, readable contrast, dynamic font scaling; omit labels for decorative content.
- **Testing:** test ViewModel state transitions, mapping, Room DAOs/migrations, WorkManager behavior, permission flows, and critical runtime paths; use `TestDispatcher` for coroutines.

## Go

- **Error handling:** check every error; wrap with `fmt.Errorf("context: %w", err)` when adding context.
- **No silent failures:** do not ignore errors with `_` unless the operation is intentionally safe and justified.
- **Stable errors:** expose sentinel errors or typed errors when callers need `errors.Is` / `errors.As`.
- **Context propagation:** pass `context.Context` as the first argument to I/O, RPC, DB, worker, or long-running functions.
- **Context discipline:** respect cancellation and deadlines; propagate context to downstream calls.
- **Goroutine lifecycle:** never start a goroutine without a clear stop path; use `WaitGroup`, `errgroup`, or context cancellation.
- **Leak prevention:** avoid blocked sends/receives, unbounded goroutines, unclosed channels, and missing cancellation.
- **Race safety:** protect shared state with mutexes, channels, or atomic types; high-risk concurrency should pass `go test -race`.
- **Channel ownership:** the sender owns channel closing; receivers should not close channels they do not own.
- **Resource cleanup:** use `defer` immediately after successful acquisition for files, locks, response bodies, rows, and similar resources.
- **Loop cleanup:** avoid `defer` inside hot or long-running loops when it delays resource release.
- **HTTP safety:** set explicit client/server timeouts; always close `http.Response.Body`.
- **SQL safety:** use parameterized queries; do not build SQL with string concatenation or `fmt.Sprintf` using untrusted input.
- **Transaction safety:** every transaction path commits or rolls back; prefer `defer tx.Rollback()` plus explicit `Commit()`.
- **Interface design:** accept small interfaces, return concrete types; define interfaces at the consumer boundary when practical.
- **Pointer receivers:** use pointer receivers for mutation, large structs, or consistency; use value receivers for small immutable values.
- **Zero-value safety:** design structs so the zero value is usable or safely inert when reasonable.
- **Dependency management:** use Go modules; avoid vendored or replace-based dependencies unless justified.
- **Package boundaries:** keep packages small and cohesive; avoid `util`/`common` dumping grounds.
- **Visibility:** export only stable public API; keep implementation details unexported.
- **Panic avoidance:** use `panic` only for programmer errors or impossible states; return `error` for expected failures.
- **JSON/input validation:** validate required fields, unknown/malformed input, and zero-value ambiguity where relevant.
- **Testing:** use table-driven tests for edge cases and error paths; include race/concurrency tests when behavior is concurrent.

## Swift / iOS

- **SwiftUI-first:** use SwiftUI for new UI unless UIKit is required by existing architecture, platform APIs, or legacy integration.
- **Unidirectional data flow:** views render state and emit actions; business state lives in a store, model, view model, reducer, or feature state holder.
- **Modern Observation:** use Observation / `@Observable` for SwiftUI state where appropriate; use `@Bindable` when a view needs bindings into observable model properties.
- **State ownership:** use `@State`, `@Binding`, `@Environment`, `@Observable`, and `@Bindable` according to ownership; avoid using property wrappers as global-state shortcuts.
- **MainActor discipline:** UI-bound state and view models are isolated to `@MainActor`; background work stays off the main actor.
- **Swift concurrency:** prefer `async/await`, `async let`, `TaskGroup`, and cancellation-aware APIs over callback pyramids or unmanaged GCD.
- **No detached tasks by default:** avoid `Task.detached` unless isolation, priority, and lifecycle are explicitly justified.
- **Cancellation safety:** long-running tasks check cancellation and clean up resources; use cancellation handlers for non-async resource cleanup.
- **Data-race safety:** shared mutable state is actor-isolated, synchronized, or `Sendable`-safe; avoid unsynchronized globals.
- **Value semantics:** prefer `struct`, `enum`, `let`, and immutable models for app/domain/UI state; use `class` only when identity or framework integration requires it.
- **Composition over inheritance:** avoid deep class hierarchies; compose focused types, protocols, extensions, and injected services.
- **Protocol boundaries:** use protocols for repositories, services, platform wrappers, and integrations where swapping/testing matters.
- **Dependency injection:** pass dependencies explicitly or through the project DI pattern; do not instantiate production clients/databases inside views.
- **View purity:** SwiftUI `body` stays declarative and cheap; no network calls, database work, blocking I/O, or heavy computation in render paths.
- **Navigation:** use typed navigation state/models where practical; avoid stringly typed route state.
- **Lifecycle ownership:** start/stop work in the correct lifecycle boundary: task, view, scene, app, service, or actor.
- **Resource cleanup:** release camera, microphone, sensors, streams, observers, notifications, and file handles deterministically.
- **Networking:** use async `URLSession` or the project network layer; handle non-2xx responses, decoding failures, retries, timeouts, and cancellation.
- **DTO boundary:** validate/map API DTOs into domain/UI models; do not leak raw transport models through the app.
- **Persistence boundary:** keep SwiftData/Core Data/database entities inside the data layer; expose clean domain/UI models.
- **SwiftData concurrency:** when using SwiftData for background or isolated persistence work, use `@ModelActor` / model-actor boundaries rather than passing model contexts across unsafe concurrency domains.
- **Error handling:** map low-level errors into stable domain/UI errors where callers need predictable recovery.
- **Security:** store secrets/tokens in Keychain or secure storage; never hardcode credentials or log sensitive values.
- **Privacy:** keep `PrivacyInfo.xcprivacy` and required-reason API usage accurate for the app and included SDKs.
- **Permissions:** request permissions only from the relevant user flow; handle denied, restricted, unavailable, and partial-access states.
- **Accessibility:** support Dynamic Type, VoiceOver labels/hints, sufficient contrast, focus order, and tappable target sizes.
- **Localization:** user-facing strings are localizable; avoid hardcoded copy in reusable views and domain logic.
- **Performance:** keep the main actor clear of heavy work; avoid large view bodies, repeated decoding, oversized images, unnecessary recomputation, and unbounded lists.
- **Memory safety:** avoid retain cycles in closures, delegates, Combine pipelines, async tasks, and observers; use weak references where ownership requires it.
- **Testing:** prefer Swift Testing / `#expect` for new unit tests when the project supports it; use XCTest where existing suites require it; test state transitions, mapping, persistence, permissions, cancellation, errors, and critical UI behavior.

## TypeScript

- **Zero `any` policy:** use `unknown` + narrowing or schema validation for untrusted/external data.
- **Boundary validation:** parse I/O data such as API responses, env vars, storage, files, and webhooks with Zod/Valibot
  or equivalent.
- **Type narrowing:** prefer discriminated unions and native operators like `in`, `typeof`, and `instanceof`; use custom
  `is` guards only for non-trivial logic.
- **Exhaustiveness:** use `never` checks in `switch`/default branches when missing union cases would be unsafe.
- **Explicit contracts:** exported functions, public APIs, and shared interfaces have explicit input/return types.
- **Type preservation:** use `satisfies` to validate object shapes without losing narrow literal inference.
- **Immutability:** mark state/config as `readonly` where mutation is unsafe; use `as const` for fixed literal
  configuration.
- **No assertion hacks:** avoid `as Type`, non-null `!`, and definite assignment `!` unless the invariant is local,
  documented, or framework-lifecycle based.
- **Async integrity:** no floating promises; every promise is `await`ed, `return`ed, or intentionally handled with
  `void` plus an error path.
- **Safe error handling:** narrow `unknown` errors in `catch` blocks before accessing properties, for example with
  `instanceof Error`.
- **Constrained generics:** use `extends` to limit generic types to the minimum required shape; avoid unconstrained
  `<T>` when the function relies on object properties.
- **Callback safety:** use `void` callback return types when callers must not depend on returned values.
- **Domain branded types:** use branded types for IDs or same-shaped primitives that must not be mixed.
- **DRY via utilities:** use `Pick`, `Omit`, `Partial`, `Readonly`, `Record`, and mapped types to derive shapes from a
  single source of truth.
- **Property traceability:** prefer dot notation or typed indexed access; avoid string-literal property access when keys
  are known.

## Next.js / React

- **Server-first by default:** use Server Components for data fetching and non-interactive UI; add `"use client"` only when browser state, effects, or event handlers are required.
- **Client boundary discipline:** keep Client Components small; do not move whole pages/layouts client-side without a real interactivity need.
- **Data fetching ownership:** fetch server-owned data in Server Components, loaders, or server-side functions; avoid client waterfalls when data can be resolved on the server.
- **Mutation boundary:** use Server Actions or Route Handlers for mutations; validate input, authorize the user, and revalidate affected cache/data paths.
- **Caching clarity:** make caching behavior explicit; choose static, dynamic, revalidated, or uncached behavior intentionally.
- **Route handlers:** use Route Handlers for HTTP API boundaries, webhooks, external integrations, and non-UI consumers; do not use them as random internal service wrappers.
- **Auth before work:** authenticate and authorize before expensive reads, mutations, or side effects.
- **Structured errors:** return stable error shapes/codes; do not leak stack traces, secrets, SQL errors, or internal implementation details.
- **Component purity:** React render logic stays pure; no side effects, mutations, fetches, subscriptions, timers, or imperative DOM work during render.
- **Effects discipline:** use `useEffect` only for synchronization with external systems; do not use effects to derive state that can be computed during render.
- **State locality:** keep state as local as possible; lift state only when multiple components truly need it.
- **Derived state:** avoid duplicated derived state; compute it from source state or memoize only when the calculation is expensive.
- **Memoization restraint:** use `memo`, `useMemo`, and `useCallback` only for measured or obvious render-cost/reference-stability problems.
- **Form strategy:** choose controlled forms for dynamic validation/shared state; choose native/uncontrolled forms when they are simpler and more performant.
- **Validation boundary:** validate all external input with Zod/Valibot/equivalent: forms, URL params, search params, cookies, headers, env vars, webhooks, API payloads.
- **Type-safe routing/data:** type route params, search params, server action inputs, API responses, and shared DTOs.
- **Suspense and streaming:** use `Suspense`, loading states, and streaming boundaries for slow server data instead of blocking the whole route.
- **Error boundaries:** provide route/component error boundaries for expected failure zones; keep recovery UX explicit.
- **Security:** protect against XSS, CSRF where relevant, SSRF, open redirects, unsafe HTML injection, unsafe file access, and untrusted redirects.
- **Secret handling:** secrets stay server-only; never expose tokens, credentials, private env vars, or server-only config to client bundles.
- **Bundle discipline:** avoid unnecessary client dependencies; keep large libraries/server-only packages out of Client Components.
- **Image/font/script optimization:** use framework image/font/script primitives where appropriate; avoid layout shift and uncontrolled third-party script cost.
- **Accessibility:** use semantic HTML first; labels, focus order, keyboard interaction, ARIA, and error messaging must work without mouse-only assumptions.
- **Progressive enhancement:** forms and navigation should degrade safely where possible; avoid requiring client JS for basic server-action flows unless needed.
- **Performance:** avoid client waterfalls, overfetching, unnecessary hydration, unstable props, giant client components, and unbounded lists.
- **Observability:** log server errors with safe request/user identifiers; never log secrets, auth tokens, full cookies, or sensitive personal data.
- **Testing:** cover server actions/route handlers, validation, auth/authorization, form behavior, error states, and critical client interactions.

## Angular

- **Standalone-first:** use standalone components, directives, and pipes by default; treat `NgModule` as legacy unless maintaining existing module-based architecture.
- **Signals for state:** use `signal()`, `computed()`, and `effect()` for local reactive state; prefer signals over RxJS for simple UI-bound values.
- **Signal-based APIs:** prefer `input()`, `output()`, `viewChild()`, and `contentChild()` over legacy decorators in new code.
- **Input safety:** use `input.required()` for mandatory inputs to prevent runtime `undefined` states.
- **RxJS for complexity:** use RxJS for complex async streams, polling, websockets, cancellation, multicasting, and multi-step async composition.
- **Signal/RxJS interop:** use `toSignal()` for template-friendly observable state and `toObservable()` when signal changes must feed RxJS pipelines.
- **Modern control flow:** use `@if`, `@for`, and `@switch` in new templates; provide stable `track` expressions in `@for`.
- **Deferred loading:** use `@defer` for non-critical or heavy UI segments such as charts, expensive widgets, or below-the-fold content.
- **Zoneless readiness:** avoid relying on implicit zone side effects; make state updates explicit and compatible with zoneless Angular.
- **Component boundaries:** keep components focused; move reusable UI into standalone components and reusable logic into services or pure functions.
- **Service responsibility:** services have one clear purpose; separate API/data access from UI state management where complexity justifies it.
- **HTTP boundary:** HTTP calls are typed; map/validate API DTOs into domain/view models before exposing them to components.
- **State ownership:** keep state close to its owner; avoid global state unless multiple features truly need it.
- **Typed forms:** use typed reactive forms for complex forms; validate at both control and submit boundaries.
- **Effects discipline:** use `effect()` only for side effects; use `computed()` for derived state.
- **Lifecycle cleanup:** use `takeUntilDestroyed()`, `DestroyRef`, or template `async` pipe to avoid subscription/listener leaks.
- **SSR / hydration safety:** guard `window`, `document`, `localStorage`, and direct DOM usage with platform checks or injection wrappers.
- **Template purity:** keep templates simple; avoid expensive method calls or heavy logic in template expressions.
- **Routing:** lazy-load feature routes; use functional guards/resolvers where they are the right boundary.
- **Security:** never bind untrusted HTML/URLs/scripts directly; avoid `bypassSecurityTrust...` unless the source is trusted and verified.
- **Performance:** avoid oversized components, unnecessary subscriptions, heavy pipes, eager loading of large libraries, and unstable list rendering.
- **Accessibility:** use semantic HTML first; ensure labels, focus management, keyboard support, contrast, and accessible error states.
- **Testing:** test services/mapping logic, component state transitions, form submission/validation, error states, guards/resolvers, and critical template interactions.

## Node.js

- **Modern runtime baseline:** use an active LTS Node.js version; avoid deprecated APIs and callback-only patterns when promise/async APIs exist.
- **Native TypeScript:** use Node’s native TypeScript type stripping only for erasable TS syntax and simple runtime flows; keep `tsc`/build tooling when typechecking, transforms, bundling, enums, path aliases, or production artifacts require it.
- **ESM discipline:** use the project’s chosen module system consistently; prefer ESM for new code unless the project or dependency graph requires CommonJS.
- **Async integrity:** every promise is `await`ed, returned, or intentionally handled; no floating promises in critical logic.
- **Manual promise control:** use `Promise.withResolvers()` only when manual resolution is clearer than simpler `async` flow.
- **Error handling:** async errors are caught at the correct boundary; handlers return stable error shapes and do not leak stack traces or internals.
- **Structured errors:** use typed/domain errors where callers need predictable recovery; preserve cause/context with `cause` or wrapping.
- **Event loop safety:** do not block the event loop with CPU-heavy work, sync filesystem calls, large JSON parsing, compression, crypto, image processing, or tight loops.
- **Worker offload:** move CPU-heavy work to Worker Threads, a job queue, or another service; do not hide CPU work inside request handlers.
- **Bounded concurrency:** avoid unbounded `Promise.all()` over variable-sized input; use pools, queues, or concurrency limits.
- **AbortController:** propagate `AbortSignal` through fetch, streams, DB/client calls where supported, and long-running operations.
- **Timeouts everywhere:** outbound HTTP, DB, cache, queue, and internal async operations have explicit timeouts/cancellation.
- **Resource cleanup:** close streams, file handles, DB clients, response bodies, timers, subscriptions, and queue consumers deterministically.
- **Explicit resource management:** use `using` / explicit resource management only when the runtime/toolchain supports it; otherwise use `try/finally` or framework cleanup hooks.
- **Stream backpressure:** use `stream.pipeline()` / `finished()` for streams; respect backpressure and handle stream errors.
- **Boundary validation:** validate external input at boundaries: HTTP bodies, params, headers, cookies, env vars, files, queues, and webhooks.
- **Schema contracts:** use JSON Schema, Zod, Valibot, TypeBox, Joi, or framework-native schemas for request/response validation where relevant.
- **HTTP boundaries:** route handlers/controllers stay thin; business logic lives in services/use cases; data access lives in repositories/adapters.
- **Request context:** use `AsyncLocalStorage` or framework context for request IDs, user IDs, tenant IDs, and correlation IDs across async calls.
- **Security headers:** use Helmet or framework-equivalent security headers for public HTTP apps.
- **Input trust:** protect against prototype pollution, path traversal, SSRF, open redirects, injection, unsafe deserialization, and untrusted redirects.
- **Permission model:** when supported, run with Node’s Permission Model and explicitly allow only required filesystem, network, worker, child-process, and native-addon access.
- **Secrets:** secrets/tokens stay in environment/secret stores; never log or expose them to client bundles, errors, telemetry, or responses.
- **Config validation:** validate `process.env` at startup and fail fast on missing/invalid config; `--env-file` is acceptable for simple local/runtime config, not a production secret manager.
- **Dependency hygiene:** pin/audit dependencies; avoid abandoned packages, unnecessary transitive-heavy libraries, and risky install scripts.
- **Database safety:** use parameterized queries, query builders, or ORM safety; never build SQL/NoSQL queries with unchecked user input.
- **Transaction safety:** DB transactions commit/rollback on all paths; avoid network calls inside DB transactions.
- **Idempotency:** retryable writes, webhooks, and queue consumers use idempotency keys, dedupe keys, or unique constraints.
- **Queues/background work:** long-running or retryable work runs in queues/workers; handlers are idempotent and define retry/dead-letter behavior.
- **Caching:** cache keys, TTLs, invalidation, stampede protection, and stale-data behavior are explicit.
- **Observability:** use structured logs, metrics, traces, and safe request/correlation IDs; OpenTelemetry or framework tracing should not leak secrets or PII.
- **Diagnostics:** monitor event-loop lag, heap memory, unhandled rejections, process warnings, and crash reports; use diagnostic reports where useful.
- **Graceful shutdown:** handle `SIGTERM`/`SIGINT`; stop accepting new work, drain requests/queues, close DB/cache clients, and force-exit only after a timeout.
- **Native testing:** prefer built-in `node:test` / `node:assert` for core logic and backend unit tests when sufficient; use external frameworks only when their features are needed. Node’s test runner is stable. :contentReference[oaicite:2]{index=2}
- **Testing:** test services, route handlers, validation, auth/authorization, error paths, queue handlers, idempotency, and integration behavior with real dependencies where correctness depends on them.