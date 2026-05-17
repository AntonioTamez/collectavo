# Architecture Patterns

**Domain:** Collectibles Marketplace Platform (Collectavo)
**Researched:** 2026-05-16
**Confidence:** HIGH (multiple verified sources, official docs, community patterns)

---

## System Overview

Three independent projects, each in its own directory, communicating over HTTP (REST). No shared npm packages between projects in Milestone 1.

```
[ Angular 20 Frontend ]
        |
        | HTTP (REST + WebSocket future)
        v
[ NestJS BFF / API Gateway ]   <-- Port 3000
        |
        | HTTP (REST, internal only)
        v
[ NestJS Core API ]            <-- Port 4000
        |
        | Prisma ORM
        v
[ PostgreSQL ]                 <-- Port 5432
```

The frontend never speaks directly to the Core API. The Core API is never exposed to the public network — only the BFF reaches it.

---

## 1. BFF (NestJS API Gateway): What It Owns vs Proxies vs Aggregates

### Responsibilities the BFF OWNS (executes, does not delegate)

| Concern | Implementation | Why Here |
|---------|---------------|----------|
| JWT access token validation | `JwtAuthGuard` via `@nestjs/passport` | Frontend should not trust Core API responses before auth check |
| Refresh token rotation | Dedicated `/auth/refresh` endpoint using `HttpOnly` cookies | Cookies are inaccessible to JavaScript; rotation logic belongs at the edge |
| Rate limiting | `@nestjs/throttler` with `ThrottlerGuard` | Protects all downstream services with one config |
| CORS policy | `app.enableCors()` in `main.ts` | Single place to control allowed origins |
| Request/response logging | Global `LoggingInterceptor` | Centralized observability before traffic enters the system |
| Swagger/OpenAPI for BFF surface | `@nestjs/swagger` | Documents the BFF's own API surface (not Core API internals) |
| Error normalization | Global `HttpExceptionFilter` | Translate upstream errors into consistent shapes before they reach Angular |

### Requests the BFF PROXIES (forwards with minimal transformation)

Most routes are simple forwards. Use `http-proxy-middleware` with `fixRequestBody` to handle NestJS body-parser consuming the body before the proxy sees it.

```
BFF /api/products/*   -->  Core API /products/*
BFF /api/categories/* -->  Core API /categories/*
BFF /api/users/*      -->  Core API /users/*
BFF /api/sellers/*    -->  Core API /sellers/*
```

Implementation pattern — dedicated controller per domain (preferred over `main.ts` global middleware because it integrates with NestJS DI):

```typescript
// bff/src/proxy/products-proxy.controller.ts
@Controller('api/products')
export class ProductsProxyController {
  private readonly proxy = createProxyMiddleware({
    target: process.env.CORE_API_URL,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    on: { proxyReq: fixRequestBody },  // CRITICAL: re-encodes body consumed by body-parser
  });

  @All('*')
  forward(@Req() req, @Res() res, next: NextFunction) {
    return this.proxy(req, res, next);
  }
}
```

Note: The BFF injects the validated JWT payload into a forwarded header (`X-User-Id`, `X-User-Role`) before the request reaches the Core API. The Core API trusts these headers because it is not publicly accessible.

### Requests the BFF AGGREGATES (composes from multiple Core API calls)

Milestone 1 has minimal aggregation needs. The main case is the seller dashboard summary, which could combine product count + listing stats in one BFF response. Use `@nestjs/axios` for these:

```typescript
// bff/src/aggregation/seller-dashboard.service.ts
async getSellerSummary(sellerId: string) {
  const [products, stats] = await Promise.all([
    this.http.get(`/sellers/${sellerId}/products`).toPromise(),
    this.http.get(`/sellers/${sellerId}/stats`).toPromise(),
  ]);
  return { products: products.data, stats: stats.data };
}
```

**Rule:** If a response requires data from exactly one Core API endpoint, proxy. If it needs two or more combined, aggregate in the BFF service layer.

---

## 2. Core API: NestJS Clean Architecture + Hexagonal + DDD

### The Dependency Rule

Dependencies point inward only:

```
Infrastructure  -->  Application  -->  Domain
(Prisma, HTTP)      (Use Cases)       (Entities, Interfaces)
```

Domain knows nothing about NestJS, Prisma, Express, or any framework. It is pure TypeScript.

### Module Strategy: Feature-First, Layers Within

Organize by feature (bounded context), not by layer at the top level. Each feature module contains its own domain, application, and infrastructure sub-layers. This prevents cross-cutting imports between unrelated features.

```
core-api/src/
├── app.module.ts
├── main.ts
├── shared/
│   ├── prisma/
│   │   ├── prisma.service.ts          # PrismaClient wrapper, global singleton
│   │   └── prisma.module.ts
│   ├── filters/
│   │   └── http-exception.filter.ts   # Global error handling
│   ├── interceptors/
│   │   └── response.interceptor.ts    # Envelope { data, meta }
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── roles.guard.ts
│
├── modules/
│   ├── auth/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts     # Pure TS class, no decorators
│   │   │   └── interfaces/
│   │   │       └── user-repository.interface.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── register-user.use-case.ts
│   │   │   │   └── login-user.use-case.ts
│   │   │   └── dtos/
│   │   │       ├── register-user.dto.ts
│   │   │       └── login-user.dto.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   └── prisma-user.repository.ts
│   │   │   └── mappers/
│   │   │       └── user.mapper.ts     # Domain entity <--> Prisma model
│   │   ├── http/
│   │   │   └── auth.controller.ts     # NestJS controller, thin
│   │   └── auth.module.ts
│   │
│   ├── products/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── product.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── condition.value-object.ts  # GRADED, MINT, NEAR_MINT, etc.
│   │   │   │   └── rarity.value-object.ts
│   │   │   └── interfaces/
│   │   │       └── product-repository.interface.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-product.use-case.ts
│   │   │   │   ├── update-product.use-case.ts
│   │   │   │   ├── get-product.use-case.ts
│   │   │   │   └── search-products.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   └── prisma-product.repository.ts
│   │   │   └── mappers/
│   │   │       └── product.mapper.ts
│   │   ├── http/
│   │   │   └── products.controller.ts
│   │   └── products.module.ts
│   │
│   ├── categories/
│   │   └── ...  (same structure, simpler)
│   │
│   ├── sellers/
│   │   └── ...  (seller profile, seller listings)
│   │
│   └── search/
│       ├── application/
│       │   └── use-cases/
│       │       └── full-text-search.use-case.ts  # Uses Prisma $queryRaw or pg tsvector
│       ├── http/
│       │   └── search.controller.ts
│       └── search.module.ts
```

### Layer Contracts (with code patterns)

**Domain Entity — pure TypeScript, zero framework imports:**

```typescript
// modules/products/domain/entities/product.entity.ts
export class Product {
  constructor(
    public readonly id: string,
    public title: string,
    public description: string,
    public price: number,
    public categoryId: string,
    public sellerId: string,
    public condition: ProductCondition,
    public listingType: ListingType,
    public status: ProductStatus,
    public metadata: Record<string, unknown>,  // flexible per category
    public readonly createdAt: Date,
  ) {
    if (price < 0) throw new Error('Price cannot be negative');
  }
}

export enum ProductCondition { MINT = 'MINT', NEAR_MINT = 'NEAR_MINT', EXCELLENT = 'EXCELLENT', GOOD = 'GOOD', PLAYED = 'PLAYED', POOR = 'POOR' }
export enum ListingType { FIXED = 'FIXED', AUCTION = 'AUCTION' }
export enum ProductStatus { ACTIVE = 'ACTIVE', SOLD = 'SOLD', INACTIVE = 'INACTIVE', DRAFT = 'DRAFT' }
```

**Repository Interface — defined in domain, implemented in infrastructure:**

```typescript
// modules/products/domain/interfaces/product-repository.interface.ts
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySeller(sellerId: string, pagination: PaginationParams): Promise<PaginatedResult<Product>>;
  search(query: SearchQuery): Promise<PaginatedResult<Product>>;
  save(product: Product): Promise<Product>;
  update(id: string, changes: Partial<Product>): Promise<Product>;
  delete(id: string): Promise<void>;
}

export const PRODUCT_REPOSITORY_TOKEN = 'IProductRepository';
```

**Use Case — thin orchestration, framework-agnostic:**

```typescript
// modules/products/application/use-cases/create-product.use-case.ts
@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(dto: CreateProductDto, sellerId: string): Promise<Product> {
    const product = new Product(
      randomUUID(), dto.title, dto.description, dto.price,
      dto.categoryId, sellerId, dto.condition, dto.listingType,
      ProductStatus.DRAFT, dto.metadata ?? {}, new Date(),
    );
    return this.productRepository.save(product);
  }
}
```

**Infrastructure Repository — Prisma implementation:**

```typescript
// modules/products/infrastructure/repositories/prisma-product.repository.ts
@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({ where: { id } });
    return record ? ProductMapper.toDomain(record) : null;
  }

  async save(product: Product): Promise<Product> {
    const record = await this.prisma.product.create({
      data: ProductMapper.toPrisma(product),
    });
    return ProductMapper.toDomain(record);
  }
  // ...
}
```

**Module wiring — injection token binds interface to implementation:**

```typescript
// modules/products/products.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [
    CreateProductUseCase,
    UpdateProductUseCase,
    GetProductUseCase,
    SearchProductsUseCase,
    {
      provide: PRODUCT_REPOSITORY_TOKEN,
      useClass: PrismaProductRepository,
    },
  ],
})
export class ProductsModule {}
```

**Controller — thin, delegates to use cases:**

```typescript
// modules/products/http/products.controller.ts
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly getProduct: GetProductUseCase,
    private readonly searchProducts: SearchProductsUseCase,
  ) {}

  @Post()
  @Roles('SELLER', 'ADMIN')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateProductDto, @GetUser() user: JwtPayload) {
    return this.createProduct.execute(dto, user.sub);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.getProduct.execute(id);
  }
}
```

---

## 3. PostgreSQL Schema (Prisma DSL)

### Entity Relationship Overview (text ER diagram)

```
User (1) ------< SellerProfile (1)     [one User can be a Seller]
User (1) ------< Order (*)             [Buyers place Orders]
SellerProfile (1) ----< Product (*)    [Sellers list Products]
Category (1) ---------< Product (*)   [Product belongs to one Category]
Product (1) ----------< ProductImage (*)
Product (1) ----------< Auction (0..1) [Optional: only for AUCTION type]
Auction (1) ----------< Bid (*)
Order (1) ------------< OrderItem (*)
OrderItem (*) --------< Product (1)
```

### Complete Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────

enum UserRole {
  ADMIN
  SELLER
  BUYER
}

enum ProductCondition {
  MINT
  NEAR_MINT
  EXCELLENT
  GOOD
  PLAYED
  POOR
}

enum ListingType {
  FIXED
  AUCTION
}

enum ProductStatus {
  DRAFT
  ACTIVE
  SOLD
  INACTIVE
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum AuctionStatus {
  SCHEDULED
  ACTIVE
  ENDED
  CANCELLED
}

// ─── USERS & ROLES ────────────────────────────────────────────

model User {
  id             String        @id @default(uuid())
  email          String        @unique
  passwordHash   String
  displayName    String
  avatarUrl      String?
  role           UserRole      @default(BUYER)
  isVerified     Boolean       @default(false)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  sellerProfile  SellerProfile?
  orders         Order[]
  bids           Bid[]

  @@index([email])
}

model SellerProfile {
  id           String    @id @default(uuid())
  userId       String    @unique
  storeName    String    @unique
  bio          String?
  rating       Decimal   @default(0) @db.Decimal(3, 2)
  totalSales   Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  products     Product[]
}

// ─── CATEGORIES ───────────────────────────────────────────────

model Category {
  id          String     @id @default(uuid())
  name        String     @unique
  slug        String     @unique
  description String?
  parentId    String?
  sortOrder   Int        @default(0)
  imageUrl    String?

  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  products    Product[]

  @@index([slug])
}

// ─── PRODUCTS & LISTINGS ──────────────────────────────────────

model Product {
  id           String           @id @default(uuid())
  sellerId     String
  categoryId   String
  title        String
  description  String
  price        Decimal          @db.Decimal(10, 2)
  condition    ProductCondition
  listingType  ListingType      @default(FIXED)
  status       ProductStatus    @default(DRAFT)
  inventory    Int              @default(1)
  // JSONB column for category-specific metadata:
  // Funko: { series, number, variant, isExclusive }
  // TCG:   { set, cardNumber, grade, gradingCompany }
  // Anime: { character, series, manufacturer, scale }
  // Retro: { platform, region, hasBox, hasManual }
  metadata     Json             @default("{}")
  searchVector String?          // Populated by Prisma $executeRaw for tsvector
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  seller       SellerProfile    @relation(fields: [sellerId], references: [id])
  category     Category         @relation(fields: [categoryId], references: [id])
  images       ProductImage[]
  orderItems   OrderItem[]
  auction      Auction?

  @@index([sellerId])
  @@index([categoryId])
  @@index([status])
  @@index([listingType])
  @@index([price])
}

model ProductImage {
  id         String   @id @default(uuid())
  productId  String
  url        String
  altText    String?
  sortOrder  Int      @default(0)
  isPrimary  Boolean  @default(false)
  createdAt  DateTime @default(now())

  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}

// ─── ORDERS ───────────────────────────────────────────────────

model Order {
  id          String      @id @default(uuid())
  buyerId     String
  status      OrderStatus @default(PENDING)
  totalAmount Decimal     @db.Decimal(10, 2)
  currency    String      @default("USD")
  notes       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  buyer       User        @relation(fields: [buyerId], references: [id])
  items       OrderItem[]

  @@index([buyerId])
  @@index([status])
  @@index([createdAt])
}

model OrderItem {
  id            String   @id @default(uuid())
  orderId       String
  productId     String
  quantity      Int
  unitPrice     Decimal  @db.Decimal(10, 2)  // Snapshot price at time of order
  createdAt     DateTime @default(now())

  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
}

// ─── AUCTIONS (Milestone 2 — schema ready, feature gated) ─────

model Auction {
  id            String        @id @default(uuid())
  productId     String        @unique
  startPrice    Decimal       @db.Decimal(10, 2)
  reservePrice  Decimal?      @db.Decimal(10, 2)
  currentBid    Decimal?      @db.Decimal(10, 2)
  bidCount      Int           @default(0)
  status        AuctionStatus @default(SCHEDULED)
  startsAt      DateTime
  endsAt        DateTime
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  product       Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  bids          Bid[]

  @@index([status])
  @@index([endsAt])
}

model Bid {
  id         String   @id @default(uuid())
  auctionId  String
  bidderId   String
  amount     Decimal  @db.Decimal(10, 2)
  isWinning  Boolean  @default(false)
  createdAt  DateTime @default(now())

  auction    Auction  @relation(fields: [auctionId], references: [id], onDelete: Cascade)
  bidder     User     @relation(fields: [bidderId], references: [id])

  @@index([auctionId])
  @@index([bidderId])
  @@index([auctionId, amount])  // Fast lookup of highest bid
}
```

### Schema Design Decisions

| Decision | Rationale |
|----------|-----------|
| `metadata Json` on Product | Collectibles have radically different attributes per category. JSONB avoids 6 separate attribute tables while remaining queryable via GIN index. |
| `OrderItem.unitPrice` snapshot | Historical price preservation is critical — product prices change after sale. |
| `Auction` as separate table, not inline | Clean separation; auction logic is complex enough to own its own module. Product.listingType = AUCTION gates UI, not schema joins. |
| UUIDs for all PKs | Safe for distributed systems, no sequential ID leakage. |
| `Category` self-referencing hierarchy | Supports subcategories (e.g., TCG > Pokémon > Booster Packs) without a separate junction table. |
| `Decimal` not `Float` for money | Avoids floating-point rounding errors. Use `@db.Decimal(10, 2)`. |
| Enums at DB level | PostgreSQL enforces enum values at the storage layer; catches data integrity bugs before app logic. |

---

## 4. RBAC: Guards, Decorators, Role Checking

### Role Hierarchy for Collectavo

```
ADMIN   > SELLER > BUYER
```

Admins can do everything. Sellers can manage their own products. Buyers can browse and purchase. A User has exactly one role stored in the JWT payload.

### Implementation Pattern

**Step 1 — Roles decorator (sets metadata):**

```typescript
// shared/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

**Step 2 — Public decorator (bypasses auth on specific routes):**

```typescript
// shared/decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Step 3 — JwtAuthGuard (skips if @Public()):**

```typescript
// shared/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }
}
```

**Step 4 — RolesGuard (runs after JwtAuthGuard populates `req.user`):**

```typescript
// shared/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Not authenticated');

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) throw new ForbiddenException(`Requires role: ${requiredRoles.join(' or ')}`);
    return true;
  }
}
```

**Step 5 — Register guards globally in AppModule:**

```typescript
// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },   // Runs first: validates token
  { provide: APP_GUARD, useClass: RolesGuard },      // Runs second: checks role
]
```

**Step 6 — Controller usage:**

```typescript
@Controller('products')
export class ProductsController {
  @Get()
  @Public()                             // No auth required — public catalog
  findAll() { ... }

  @Post()
  @Roles(UserRole.SELLER, UserRole.ADMIN)  // Only Sellers and Admins
  create(@Body() dto, @GetUser() user) { ... }

  @Patch(':id')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  update(@Param('id') id, @Body() dto, @GetUser() user) {
    // Ownership check inside use case: if user.role === SELLER, must own product
    ...
  }
}
```

**Ownership enforcement (Seller can only edit their own products):** This check happens inside the use case, not the guard. Guards check role; use cases check ownership.

---

## 5. WebSocket Architecture (Milestone 2 — Auction Bidding)

Deferred to Milestone 2 per PROJECT.md. Schema is ready (Auction, Bid tables). Architecture documented for planning purposes.

### Gateway Structure

```typescript
// modules/auctions/gateway/auction.gateway.ts
@WebSocketGateway({
  namespace: '/auctions',
  cors: { origin: process.env.FRONTEND_URL },
})
export class AuctionGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('bid:place')
  async handleBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PlaceBidDto,
  ) {
    const result = await this.placeBidUseCase.execute(data, client.data.userId);
    // Broadcast new highest bid to all clients in this auction's room
    this.server.to(`auction:${data.auctionId}`).emit('bid:update', result);
    return result;
  }

  @SubscribeMessage('auction:join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() auctionId: string) {
    client.join(`auction:${auctionId}`);
  }
}
```

### Redis Adapter for Horizontal Scaling

When running multiple Core API instances behind a load balancer, each instance has its own Socket.IO pool. Without Redis, a bid processed by Instance A never reaches clients connected to Instance B.

```typescript
// main.ts (Core API)
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
app.getHttpAdapter().getInstance().set('io',
  io.adapter(createAdapter(pubClient, subClient))
);
```

Install: `npm install @socket.io/redis-adapter redis`

### BFF Role with WebSockets

The BFF proxies the WebSocket upgrade handshake but does not intercept individual messages. JWT validation happens at connection time in the gateway middleware:

```typescript
// gateway middleware (runs at connection)
this.server.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const payload = await this.jwtService.verify(token);
  socket.data.userId = payload.sub;
  socket.data.userRole = payload.role;
  next();
});
```

### Scaling Path

| Stage | Config |
|-------|--------|
| Single instance (Milestone 2) | No Redis needed; single Node process handles all sockets |
| Multiple instances (post-launch) | Add `@socket.io/redis-adapter`; Redis pub/sub fans out events |
| Production | Redis Cluster; NGINX with WebSocket upgrade headers |

---

## 6. Angular 20 Frontend: BFF Communication

### Auth State with Signals

```typescript
// src/app/core/auth/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Expose read-only views
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly userRole = computed(() => this._currentUser()?.role ?? null);
  readonly isSeller = computed(() =>
    this._currentUser()?.role === 'SELLER' || this._currentUser()?.role === 'ADMIN'
  );

  login(credentials: LoginDto): Observable<void> {
    return this.http.post<AuthResponse>('/api/auth/login', credentials).pipe(
      tap(response => {
        this._currentUser.set(response.user);
        // Access token in memory; refresh token in HttpOnly cookie (handled by BFF)
        this.accessToken = response.accessToken;
      }),
      map(() => void 0),
    );
  }

  logout(): void {
    this._currentUser.set(null);
    this.accessToken = null;
    this.http.post('/api/auth/logout', {}).subscribe();
    this.router.navigate(['/']);
  }
}
```

### Functional HTTP Interceptors (Angular 20)

Two interceptors registered in the application config:

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
```

**Auth interceptor — attaches JWT to all BFF requests:**

```typescript
// core/interceptors/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken;

  if (!token || req.url.includes('/auth/login')) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
```

**Error interceptor — handles 401 with token refresh and queues concurrent requests:**

```typescript
// core/interceptors/error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  let isRefreshing = false;
  const refreshSubject = new BehaviorSubject<string | null>(null);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }
      if (isRefreshing) {
        return refreshSubject.pipe(
          filter(Boolean), take(1),
          switchMap(token => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))),
        );
      }
      isRefreshing = true;
      return http.post<{ accessToken: string }>('/api/auth/refresh', {}).pipe(
        tap(({ accessToken }) => { authService.accessToken = accessToken; refreshSubject.next(accessToken); }),
        switchMap(({ accessToken }) => next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }))),
        catchError(err => { authService.logout(); return throwError(() => err); }),
        finalize(() => { isRefreshing = false; }),
      );
    }),
  );
};
```

### Component Consumption Pattern

```typescript
// features/products/product-list.component.ts
@Component({
  standalone: true,
  template: `
    @if (authService.isSeller()) {
      <button routerLink="/seller/new-product">List Item</button>
    }
    @for (product of products(); track product.id) {
      <app-product-card [product]="product" />
    }
  `,
})
export class ProductListComponent {
  protected readonly authService = inject(AuthService);
  readonly products = toSignal(this.productsService.getProducts(), { initialValue: [] });
}
```

### Route Guards with Signal-based Auth

```typescript
// core/guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

// core/guards/seller.guard.ts
export const sellerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isSeller() ? true : router.createUrlTree(['/unauthorized']);
};
```

---

## Component Boundaries (What Talks to What)

```
Angular Frontend
  - TALKS TO: BFF only (never Core API directly)
  - Via: HttpClient with authInterceptor; signals for local state
  - Does NOT talk to: Core API, Database, Redis

BFF (NestJS)
  - TALKS TO: Core API (internal HTTP)
  - TALKS TO: Core API WebSocket proxy (Milestone 2)
  - DOES NOT TALK TO: Database directly
  - DOES NOT TALK TO: Redis directly
  - EXPOSES TO FRONTEND: /api/* routes (Swagger documented)

Core API (NestJS)
  - TALKS TO: PostgreSQL via Prisma
  - TALKS TO: Redis (session store, Milestone 2 WebSocket adapter)
  - DOES NOT TALK TO: Frontend
  - DOES NOT TALK TO: BFF (no callbacks)
  - EXPOSES TO BFF: /products, /categories, /users, /auth, /sellers

PostgreSQL
  - TALKED TO BY: Core API only (via Prisma)
  - NEVER exposed to BFF or Frontend
```

---

## Suggested Build Order

Dependencies must be satisfied in this sequence. Each phase produces a tested artifact the next phase builds on.

```
Phase 1: Infrastructure Foundation
  - Docker Compose (postgres, core-api, bff, frontend)
  - Prisma schema + migrations (User, Category, Product, SellerProfile)
  - PrismaService singleton in Core API
  Produces: running database with schema

Phase 2: Auth (Core API)
  - User entity + IUserRepository interface
  - RegisterUserUseCase + LoginUserUseCase
  - PrismaUserRepository
  - JWT strategy, JwtAuthGuard, RolesGuard (global)
  - /auth/register, /auth/login, /auth/refresh endpoints
  Produces: working auth in Core API; testable with curl

Phase 3: Auth (BFF)
  - BFF auth proxy routes (/api/auth/*)
  - Refresh token HttpOnly cookie handling at BFF layer
  - Rate limiting on /api/auth/* routes
  Produces: BFF can authenticate requests, forward with user headers

Phase 4: Auth (Frontend)
  - AuthService with signals
  - authInterceptor + errorInterceptor
  - Login/Register pages
  - authGuard, sellerGuard
  Produces: full auth flow end-to-end (Angular -> BFF -> Core API)

Phase 5: Products + Catalog (Core API)
  - Product entity, domain value objects (Condition, ListingType)
  - IProductRepository + PrismaProductRepository
  - CRUD use cases
  - ProductsController with RBAC (Public GET, Seller POST/PATCH/DELETE)
  - IProductImageRepository
  Produces: seller can create products; buyers can browse

Phase 6: Categories (Core API)
  - Category entity + CRUD
  - Seed the 6 collectible categories
  Produces: products can be categorized

Phase 7: BFF Product Routes
  - Proxy /api/products/*, /api/categories/*
  - Inject X-User-Id, X-User-Role headers
  Produces: frontend can reach products through BFF

Phase 8: Frontend Catalog Pages
  - ProductListComponent (browse, filter by category/condition/price)
  - ProductDetailComponent
  - SearchResultsComponent
  Produces: public-facing catalog works

Phase 9: Seller Dashboard
  - SellerDashboard page (seller's products list)
  - CreateProduct / EditProduct forms
  - BFF /api/sellers/* proxy
  Produces: Milestone 1 complete — browse -> detail -> seller dashboard

[Milestone 2: Auctions, Payments, WebSockets]
Phase 10: Auction schema + bidding WebSocket gateway
Phase 11: Stripe payment integration
Phase 12: Real-time frontend (Socket.IO client, bid UI)
```

**Critical dependency chain:**
- PrismaSchema must exist before any repository
- Core API auth must exist before BFF auth proxy
- BFF auth must exist before Frontend auth can be tested end-to-end
- Products depend on auth (seller ID comes from JWT)
- Frontend catalog depends on BFF product proxy

---

## NestJS Module Wiring Reference

### Shared PrismaModule (Core API)

```typescript
// shared/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}

// shared/prisma/prisma.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Mark `PrismaModule` as `@Global()` so it does not need to be imported in every feature module.

### Feature Module Pattern (Products)

```typescript
@Module({
  imports: [],                         // PrismaService injected via @Global() PrismaModule
  controllers: [ProductsController],
  providers: [
    // Application layer
    CreateProductUseCase,
    UpdateProductUseCase,
    GetProductUseCase,
    SearchProductsUseCase,
    // Infrastructure binding
    { provide: PRODUCT_REPOSITORY_TOKEN, useClass: PrismaProductRepository },
    { provide: PRODUCT_IMAGE_REPOSITORY_TOKEN, useClass: PrismaProductImageRepository },
  ],
  exports: [GetProductUseCase],        // Export only what other modules need
})
export class ProductsModule {}
```

---

## Pitfall Pre-warnings (Architecture-Specific)

| Risk | Where | Mitigation |
|------|-------|-----------|
| body-parser eats request body before http-proxy-middleware | BFF proxy | Use `fixRequestBody` from `http-proxy-middleware` on all non-GET routes |
| WebSocket connections load-balanced to different instances | Core API Milestone 2 | Add `@socket.io/redis-adapter` before adding second instance |
| Prisma generates types from schema — domain entities are separate | Core API | Always write domain entities as plain TS classes; use mappers to convert from Prisma types |
| Enum values in PostgreSQL cannot be deleted without migration lock | Schema | Only add enum values, never remove; use status fields over enum removal |
| JSONB metadata not validated at DB level | Schema | Validate in domain entity constructor or DTO class-validator; consider JSON Schema per category |
| JWT access token stored in memory (not localStorage) | Frontend | Memory storage means logout on page refresh; refresh token in HttpOnly cookie restores session automatically — implement `tryRestoreSession()` on app init |
| @Global() PrismaModule imported multiple times | Core API | Declare `@Global()` once in AppModule imports; never re-import in feature modules |

---

## Sources

- NestJS Official Docs — Authorization/Guards: https://docs.nestjs.com/security/authorization
- NestJS Official Docs — WebSocket Gateways: https://docs.nestjs.com/websockets/gateways
- NestJS Official Docs — HTTP Module: https://docs.nestjs.com/techniques/http-module
- Prisma Official Docs — Data Model: https://www.prisma.io/docs/orm/prisma-schema/data-model/models
- NestJS RBAC with Custom Guards (2026): https://oneuptime.com/blog/post/2026-01-25-rbac-custom-guards-nestjs/view
- Scalable WebSockets with NestJS and Redis (LogRocket): https://blog.logrocket.com/scalable-websockets-with-nestjs-and-redis/
- WebSockets at Scale with NestJS and Redis Pub/Sub: https://praeclarumtech.com/websockets-at-scale-real-time-architectures-with-nestjs-and-redis-pub-sub/
- Using http-proxy-middleware in NestJS (BFF/Gateway): https://medium.com/@benjannetahmed.03/using-http-proxy-middleware-in-nestjs-a-complete-guide-3b73dd777ab5
- NestJS Clean Architecture with Prisma: https://medium.com/@matthitachi/building-a-nestjs-application-with-clean-architecture-e3328e4fdf3f
- Mastering NestJS Clean Architecture + DDD in E-Commerce: https://medium.com/nestjs-ninja/mastering-nestjs-unleashing-the-power-of-clean-architecture-and-ddd-in-e-commerce-development-97850131fd87
- Angular 20 HTTP Interceptors: https://faisalahmedador.medium.com/%EF%B8%8F-how-to-handle-http-interceptors-in-angular-20-clean-modular-and-circular-safe-b982d46c50ad
- Angular Signals Official Docs: https://angular.dev/guide/signals
- API Gateway vs BFF Pattern with NestJS: https://medium.com/@ylcnfrht/api-gateway-vs-backend-for-frontend-bff-which-one-when-to-use-example-project-with-nestjs-4f1553c33c97
