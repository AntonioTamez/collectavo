# Technology Stack

**Project:** Collectavo — Collectibles Marketplace
**Researched:** 2026-05-16
**Overall Confidence:** HIGH (all versions verified via npm registry; patterns verified via official docs and authoritative community sources)

---

## Versions Summary

| Package | Version | Source |
|---------|---------|--------|
| `@angular/core` | 20.3.21 | npm registry |
| `@angular/material` | 20.x | npm registry (tracks Angular) |
| `@nestjs/core` | 11.1.21 | npm registry |
| `@nestjs/jwt` | 11.0.2 | npm registry |
| `@nestjs/passport` | 11.0.5 | npm registry |
| `@nestjs/swagger` | 11.4.3 | npm registry |
| `@nestjs/throttler` | 6.5.0 | npm registry |
| `@nestjs/config` | 4.0.4 | npm registry |
| `prisma` / `@prisma/client` | 7.8.0 | npm registry |
| `http-proxy-middleware` | 4.0.0 | npm registry |
| `class-validator` | 0.15.1 | npm registry |
| `class-transformer` | 0.5.1 | npm registry |
| `passport` | 0.7.0 | npm registry |
| `passport-jwt` | 4.0.1 | npm registry |
| `jsonwebtoken` | 9.0.3 | npm registry |
| `cookie-parser` | 1.4.7 | npm registry |

---

## 1. Angular 20 Frontend

### Core Approach: Signals-First, Standalone-Only

Angular 20 (released May 28, 2025) stabilizes all core reactivity primitives. These APIs are now production-safe with no deprecation risk:

| API | Status in v20 | Use For |
|-----|--------------|---------|
| `signal()` | Stable | Mutable local state |
| `computed()` | Stable | Derived state (lazy, memoized) |
| `effect()` | Stable | Side effects (logging, sync to storage) |
| `linkedSignal()` | Stable | Writable signal derived from another signal |
| `toSignal()` | Stable | Converting Observables to signals |
| `input()` | Stable | Component inputs (replaces `@Input`) |
| `output()` | Stable | Component outputs (replaces `@Output`) |
| `model()` | Stable | Two-way binding (replaces `[(ngModel)]`) |
| `@if`, `@for`, `@switch` | Stable | Control flow in templates |
| `resource()` / `httpResource()` | **Experimental** | Async signal-based fetching — do NOT use in v1 |
| Zoneless (`provideZonelessChangeDetection`) | Developer Preview | Do NOT use in v1 — not production-safe |

**Do not use:** `NgModules` for new code. Standalone is the Angular 20 default. `NgZone`-dependent patterns are still default and safe; zoneless is not ready.

### Signal Patterns

```typescript
// Writable signal — expose readonly to template
@Injectable({ providedIn: 'root' })
export class ProductStore {
  private readonly _products = signal<Product[]>([]);
  readonly products = this._products.asReadonly();

  readonly count = computed(() => this._products().length);

  setProducts(products: Product[]) {
    this._products.set(products);
  }
}

// Component: signal-based input and output
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  product = input.required<Product>();          // required input
  selected = output<Product>();                 // typed output
  quantity = model(1);                          // two-way bindable

  onSelect() {
    this.selected.emit(this.product());
  }
}

// effect() — run side effects when signals change
effect(() => {
  console.log('User changed:', this.currentUser());
  // Read signals BEFORE any await — async boundaries break tracking
});
```

### Component Architecture Pattern

Split into two types:
- **Container components** — hold signals, inject services, pass data to presentational children
- **Presentational components** — pure UI, all state via `input()`, events via `output()`

### Standalone Routing

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
  ],
};

// app.routes.ts — lazy-loaded standalone components
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list.component').then(
        m => m.ProductListComponent
      ),
    canActivate: [authGuard],
  },
];

// Functional guard (replaces class-based CanActivate)
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
```

### Angular Material 3 Setup

Angular 20 ships with Material Design 3 (Material You) as the default. M3 uses a token-based theming system.

```bash
ng add @angular/material
```

Configure SCSS theming in `styles.scss`:
```scss
@use '@angular/material' as mat;

$theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$azure-palette,
    tertiary: mat.$blue-palette,
  ),
  typography: (
    brand-family: 'Roboto',
  ),
));

:root {
  @include mat.all-component-themes($theme);
}
```

**Key M3 rule:** Import only the `MatXxxModule` a component needs — use standalone component imports, not a barrel `MaterialModule`. This keeps bundle sizes in check.

---

## 2. NestJS Core API — Clean + Hexagonal Architecture + DDD

### Why This Structure

The architecture isolates the domain from NestJS entirely. NestJS lives exclusively in the presentation and infrastructure layers. This means the domain layer can be unit-tested without spinning up the framework.

### Folder Layout

```
src/
├── main.ts
├── app.module.ts
│
├── modules/                         # Feature modules (vertical slices by bounded context)
│   └── product/
│       ├── product.module.ts        # NestJS wiring only
│       │
│       ├── domain/                  # Pure business logic — no framework imports
│       │   ├── entities/
│       │   │   └── product.entity.ts
│       │   ├── value-objects/
│       │   │   ├── price.value-object.ts
│       │   │   └── condition.value-object.ts
│       │   ├── repositories/
│       │   │   └── product.repository.port.ts   # Interface (port)
│       │   ├── events/
│       │   │   └── product-created.event.ts
│       │   └── errors/
│       │       └── product.errors.ts
│       │
│       ├── application/             # Use cases — orchestrates domain, no HTTP/DB
│       │   ├── use-cases/
│       │   │   ├── create-product/
│       │   │   │   ├── create-product.use-case.ts
│       │   │   │   └── create-product.dto.ts
│       │   │   └── get-products/
│       │   │       ├── get-products.use-case.ts
│       │   │       └── get-products.query.ts
│       │   └── ports/
│       │       └── storage.port.ts  # External service interfaces
│       │
│       ├── infrastructure/          # Adapters — implements domain ports
│       │   ├── persistence/
│       │   │   ├── product.repository.ts       # Implements repository port
│       │   │   └── product.persistence-mapper.ts
│       │   └── mappers/
│       │       └── product.mapper.ts
│       │
│       └── presentation/            # NestJS controllers, DTOs, guards
│           ├── controllers/
│           │   └── product.controller.ts
│           ├── dto/
│           │   ├── create-product.request.dto.ts
│           │   └── product.response.dto.ts
│           └── guards/
│               └── product-ownership.guard.ts
│
├── shared/                          # Cross-cutting, framework-agnostic
│   ├── domain/
│   │   ├── entity.base.ts
│   │   ├── aggregate-root.base.ts
│   │   └── value-object.base.ts
│   ├── exceptions/
│   │   ├── domain.exception.ts
│   │   └── http-exception.filter.ts
│   └── decorators/
│       └── current-user.decorator.ts
│
├── infrastructure/                  # App-wide infrastructure wiring
│   ├── database/
│   │   ├── prisma.service.ts
│   │   └── database.module.ts
│   └── logger/
│       └── logger.service.ts
│
└── core/                            # Cross-cutting NestJS concerns
    ├── auth/
    │   ├── auth.module.ts
    │   ├── strategies/
    │   │   ├── jwt-access.strategy.ts
    │   │   └── jwt-refresh.strategy.ts
    │   └── guards/
    │       ├── jwt-auth.guard.ts
    │       └── roles.guard.ts
    └── guards/
        └── throttler.guard.ts
```

### Domain Entity Pattern

```typescript
// shared/domain/entity.base.ts
export abstract class Entity<T> {
  protected readonly _id: string;
  public readonly props: T;

  constructor(props: T, id?: string) {
    this._id = id ?? crypto.randomUUID();
    this.props = props;
  }

  equals(entity?: Entity<T>): boolean {
    return entity?.id === this._id;
  }

  get id(): string { return this._id; }
}

// modules/product/domain/entities/product.entity.ts
export class ProductEntity extends Entity<ProductProps> {
  static create(props: CreateProductProps): ProductEntity {
    // enforce invariants here
    if (props.price <= 0) throw new InvalidPriceError(props.price);
    return new ProductEntity({ ...props, status: 'DRAFT' });
  }
}
```

### Repository Port + Adapter Pattern

```typescript
// domain/repositories/product.repository.port.ts
export abstract class ProductRepositoryPort {
  abstract findById(id: string): Promise<ProductEntity | null>;
  abstract findAll(filters: ProductFilters): Promise<ProductEntity[]>;
  abstract save(product: ProductEntity): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

// infrastructure/persistence/product.repository.ts
@Injectable()
export class ProductRepository implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProductEntity | null> {
    const record = await this.prisma.product.findUnique({ where: { id } });
    return record ? ProductMapper.toDomain(record) : null;
  }
}

// product.module.ts — DI wiring
@Module({
  providers: [
    { provide: ProductRepositoryPort, useClass: ProductRepository },
    CreateProductUseCase,
    GetProductsUseCase,
  ],
  controllers: [ProductController],
})
export class ProductModule {}
```

### Use Case Pattern

```typescript
// application/use-cases/create-product/create-product.use-case.ts
@Injectable()
export class CreateProductUseCase {
  constructor(private readonly repo: ProductRepositoryPort) {}

  async execute(dto: CreateProductDto): Promise<ProductEntity> {
    const product = ProductEntity.create(dto);
    await this.repo.save(product);
    return product;
  }
}
```

### NestJS 11 Specifics

- **Version:** 11.1.21 (current). Requires Node.js 20+.
- **Express v5 wildcards:** Routes with `*` must use named params: `@Get('*splat')` not `@Get('*')`.
- **Module key change:** Dynamic modules imported multiple times are now separate instances (not merged). This is intentional — design dynamic module factories carefully.
- **JSON logging:** `new ConsoleLogger({ json: true })` for structured logs in production.
- **CacheModule:** Now depends on `cache-manager` v6 (uses `Keyv` internally) — not needed for v1 but note for Redis caching milestone.

### Validation Pipeline (Global)

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // strip undeclared properties
    forbidNonWhitelisted: true, // throw on unknown props
    transform: true,            // auto-cast to DTO types
    transformOptions: {
      enableImplicitConversion: true, // coerce query params
    },
  }),
);
```

Use `class-validator` (0.15.1) and `class-transformer` (0.5.1) decorators on every request DTO.

### Swagger / OpenAPI

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Collectavo Core API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Annotate DTOs with `@ApiProperty()` and controllers with `@ApiOperation()` / `@ApiResponse()`. The `@nestjs/swagger` package (11.4.3) inspects TypeScript types automatically when `introspectComments: true` is enabled in `nest-cli.json`.

---

## 3. PostgreSQL + Prisma ORM

### Why Prisma 7 over TypeORM / Drizzle

- **Type safety:** Prisma generates a fully typed client from the schema. No runtime type mismatches.
- **Migration-first workflow:** `prisma migrate dev` generates SQL migration files that are committed to source control — reproducible, reviewable, reversible.
- **TypeScript engine (v7):** Prisma 7 replaces the Rust query engine with a TypeScript implementation. Faster cold starts, smaller Docker images, no native binary distribution headaches.
- **NOT Drizzle:** Drizzle is excellent but schema-in-code means the migration story is less mature. For a solo developer building a marketplace with a complex relational schema, Prisma's declarative migrations are lower cognitive overhead.
- **NOT TypeORM:** TypeORM's decorator-based approach conflicts with Clean Architecture — it bleeds ORM concerns into domain entities.

### PrismaService Pattern in NestJS

```typescript
// infrastructure/database/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

// infrastructure/database/database.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

Mark `DatabaseModule` as `@Global()` so `PrismaService` is available everywhere without re-importing.

### Schema Patterns for a Marketplace

**Collectibles domain specifics:** Products need flexible metadata per category (Funko, TCG, Anime, etc.). Use a JSONB `metadata` column for category-specific attributes rather than 6 separate tables.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(BUYER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  profile      UserProfile?
  products     Product[]
  orders       Order[]    @relation("BuyerOrders")

  @@index([email])
  @@map("users")
}

enum Role {
  ADMIN
  SELLER
  BUYER
}

model UserProfile {
  id          String  @id @default(uuid())
  userId      String  @unique
  displayName String
  avatarUrl   String?
  bio         String?

  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

model Product {
  id          String        @id @default(uuid())
  sellerId    String
  title       String
  description String
  price       Decimal       @db.Decimal(10, 2)
  condition   Condition
  rarity      Rarity?
  category    Category
  listingType ListingType   @default(FIXED_PRICE)
  status      ProductStatus @default(DRAFT)
  inventory   Int           @default(1)
  metadata    Json          @default("{}")  // category-specific fields
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  seller      User          @relation(fields: [sellerId], references: [id])
  images      ProductImage[]
  orderItems  OrderItem[]

  @@index([category])
  @@index([status])
  @@index([sellerId])
  @@index([listingType])
  @@map("products")
}

model ProductImage {
  id        String  @id @default(uuid())
  productId String
  url       String
  isPrimary Boolean @default(false)
  sortOrder Int     @default(0)

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}

enum Condition {
  MINT
  NEAR_MINT
  EXCELLENT
  GOOD
  FAIR
  POOR
}

enum Rarity {
  COMMON
  UNCOMMON
  RARE
  ULTRA_RARE
  SECRET_RARE
  LIMITED
}

enum Category {
  FUNKO
  TCG
  ANIME_FIGURE
  MANGA
  LIMITED_EDITION
  RETRO_GAME
}

enum ListingType {
  FIXED_PRICE
  AUCTION      // schema-ready; feature deferred to M2
}

enum ProductStatus {
  DRAFT
  ACTIVE
  SOLD
  ARCHIVED
}

model Order {
  id          String      @id @default(uuid())
  buyerId     String
  status      OrderStatus @default(PENDING)
  totalAmount Decimal     @db.Decimal(10, 2)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  buyer       User        @relation("BuyerOrders", fields: [buyerId], references: [id])
  items       OrderItem[]

  @@index([buyerId])
  @@map("orders")
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  unitPrice Decimal @db.Decimal(10, 2)

  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])

  @@map("order_items")
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### Migration Workflow

```bash
# Development — generates migration file + applies it + regenerates client
npx prisma migrate dev --name add_products_table

# Production / CI — applies pending migrations only, no schema prompt
npx prisma migrate deploy

# Inspect without applying
npx prisma migrate status

# Regenerate client after schema change
npx prisma generate

# Visual inspection
npx prisma studio
```

**Rule:** Never use `prisma db push` in production. It bypasses the migration history. Use only `migrate dev` (development) and `migrate deploy` (production).

### Persistence Mapper Pattern

Keep Prisma models separate from domain entities using a mapper:

```typescript
// product.persistence-mapper.ts
export class ProductMapper {
  static toDomain(record: PrismaProduct): ProductEntity {
    return ProductEntity.reconstitute({
      id: record.id,
      title: record.title,
      price: new Price(record.price.toNumber()),
      condition: record.condition as Condition,
      // ...
    });
  }

  static toPersistence(entity: ProductEntity): Prisma.ProductCreateInput {
    return {
      id: entity.id,
      title: entity.props.title,
      price: entity.props.price.value,
      // ...
    };
  }
}
```

This ensures domain entities never have Prisma decorators or `@id` annotations — the domain stays framework-agnostic.

---

## 4. JWT Authentication Pattern

### Token Architecture

| Token | Location | TTL | Purpose |
|-------|----------|-----|---------|
| Access token | `Authorization: Bearer` header | 15 minutes | Authenticate API requests |
| Refresh token | `HttpOnly; Secure; SameSite=Strict` cookie | 30 days | Obtain new access tokens without re-login |

**Why split storage:** Access tokens in headers prevent CSRF attacks (JS must explicitly set headers). Refresh tokens in `httpOnly` cookies prevent XSS attacks (JS cannot read `httpOnly` cookies). This is the standard defense-in-depth pattern.

### Required Packages

```bash
npm install @nestjs/passport @nestjs/jwt passport passport-jwt cookie-parser bcrypt
npm install -D @types/passport-jwt @types/cookie-parser @types/bcrypt
```

### Implementation Structure

```typescript
// core/auth/strategies/jwt-access.strategy.ts
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload; // attaches to req.user
  }
}

// core/auth/strategies/jwt-refresh.strategy.ts
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refreshToken'] ?? null,
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies['refreshToken'];
    return { ...payload, refreshToken };
  }
}

// core/auth/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

// core/auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return roles.includes(user.role);
  }
}

// core/auth/auth.module.ts
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    PassportModule,
  ],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy, JwtRefreshGuard, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard, JwtRefreshGuard],
})
export class AuthModule {}
```

### Controller Endpoints

```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
    return { accessToken };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(req.user);
    res.cookie('refreshToken', refreshToken, { /* same options */ });
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    return { message: 'Logged out' };
  }
}
```

### Token Rotation

On every `/auth/refresh` call:
1. Validate the incoming refresh token (via `JwtRefreshGuard`).
2. Verify the stored hash in the database matches (prevents reuse of leaked tokens).
3. Issue a new access token AND a new refresh token.
4. Invalidate (or replace) the old refresh token hash in the database.

Store a bcrypt hash of the refresh token in `User.refreshTokenHash` — never store raw tokens.

### Cookie and CORS Setup

```typescript
// main.ts
import * as cookieParser from 'cookie-parser';

app.use(cookieParser());
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,    // required for cookies to be sent cross-origin
});
```

---

## 5. NestJS BFF as API Gateway

### What the BFF Does

The BFF sits between the Angular frontend and the Core API. It:
1. **Proxies** all Core API requests (the frontend never knows the Core API's internal URL)
2. **Validates** auth cookies / forwards auth headers
3. **Rate-limits** client requests
4. **Aggregates** (future) — combine multiple Core API calls into one frontend response
5. **Hides** internal service topology from public clients

### Proxying with http-proxy-middleware 4.0.0

```typescript
// main.ts — bootstrap
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });

  // Proxy /api/* to the Core API
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.CORE_API_URL,   // e.g., http://core-api:3001
      changeOrigin: true,
      on: {
        proxyReq: fixRequestBody,          // re-encode body after NestJS body-parser
      },
    }),
  );

  await app.listen(3000);
}
```

**Critical:** `fixRequestBody` from `http-proxy-middleware` is mandatory. NestJS's body-parser consumes the request stream before the proxy sees it; `fixRequestBody` re-encodes the already-parsed body for the upstream service.

### Rate Limiting with @nestjs/throttler 6.5.0

```typescript
// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [
          { name: 'global', ttl: 60000, limit: 100 },       // 100 req/min globally
          { name: 'auth', ttl: 60000, limit: 10 },           // tighter on auth endpoints
        ],
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },        // apply globally
  ],
})
export class AppModule {}

// Override on specific routes
@Controller('auth')
@Throttle({ auth: { limit: 5, ttl: 60000 } })
export class AuthController { ... }

// Skip throttling (health checks, etc.)
@SkipThrottle()
@Get('health')
health() { return { status: 'ok' }; }
```

### BFF-Level Auth Handling

The BFF validates access tokens before forwarding to Core API. The Core API trusts the BFF (internal network only):

```typescript
// bff/src/core/auth/bff-jwt.guard.ts
@Injectable()
export class BffJwtGuard extends AuthGuard('jwt-access') {
  handleRequest(err, user) {
    if (err || !user) throw new UnauthorizedException();
    return user;
  }
}

// Forward user identity to Core API as a trusted header
app.use('/api', (req, res, next) => {
  if (req.user) {
    req.headers['x-user-id'] = req.user.sub;
    req.headers['x-user-role'] = req.user.role;
  }
  next();
});
```

The Core API reads `x-user-id` and `x-user-role` from trusted internal headers. This header must only be accepted when the request originates from the BFF (enforced by network policy / Docker internal network).

---

## 6. Docker Compose Multi-Service Setup

### Service Architecture

```
┌──────────────────────────────────────────────────┐
│  Docker Internal Network: collectavo_net          │
│                                                   │
│  frontend:4200  →  bff:3000  →  core-api:3001    │
│                               ↓                  │
│                         postgres:5432             │
│                         redis:6379 (future)       │
└──────────────────────────────────────────────────┘
```

### docker-compose.yml

```yaml
version: '3.9'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - '4200:4200'
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
    depends_on:
      - bff
    networks:
      - collectavo_net

  bff:
    build:
      context: ./bff
      dockerfile: Dockerfile.dev
    ports:
      - '3000:3000'
    volumes:
      - ./bff:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - PORT=3000
      - CORE_API_URL=http://core-api:3001
      - FRONTEND_URL=http://localhost:4200
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - core-api
    networks:
      - collectavo_net

  core-api:
    build:
      context: ./core-api
      dockerfile: Dockerfile.dev
    ports:
      - '3001:3001'
    volumes:
      - ./core-api:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - PORT=3001
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - collectavo_net

  postgres:
    image: postgres:17-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - collectavo_net

  # redis:                          # Uncomment in Milestone 2
  #   image: redis:7-alpine
  #   ports:
  #     - '6379:6379'
  #   volumes:
  #     - redis_data:/data
  #   healthcheck:
  #     test: ['CMD', 'redis-cli', 'ping']
  #     interval: 10s
  #     timeout: 5s
  #     retries: 5
  #   networks:
  #     - collectavo_net

volumes:
  postgres_data:
  # redis_data:

networks:
  collectavo_net:
    driver: bridge
```

### Dockerfile (NestJS dev)

```dockerfile
# Dockerfile.dev — hot reload for development
FROM node:22-alpine

WORKDIR /app

# Copy package files first for Docker layer caching
COPY package*.json ./
RUN npm ci

# Source is volume-mounted; this layer is for the node_modules cache
EXPOSE 3001

CMD ["npm", "run", "start:dev"]
```

### .env file (not committed)

```bash
# .env
POSTGRES_USER=collectavo
POSTGRES_PASSWORD=secret_dev_password
POSTGRES_DB=collectavo_dev

JWT_ACCESS_SECRET=change_me_in_production_min_32_chars
JWT_REFRESH_SECRET=change_me_in_production_different_secret
```

### Key Docker Patterns

- **`depends_on` with `condition: service_healthy`** on `core-api` → `postgres`: ensures Prisma's first connection doesn't fail because Postgres isn't accepting connections yet.
- **`/app/node_modules` anonymous volume**: prevents the host `node_modules` from overwriting the container's `node_modules` (critical on Windows with different path separators).
- **`CHOKIDAR_USEPOLLING=true`** in frontend: Angular's webpack dev server file watching requires polling in Docker on Windows/WSL2.
- **No Redis in v1**: Docker Compose stub is commented out. Add in Milestone 2 when rate-limit store or caching is needed.

---

## What NOT to Use

| Package / Pattern | Why to Avoid | Use Instead |
|------------------|-------------|-------------|
| `NgModules` (Angular) | Deprecated mental model; standalone is v20 default | Standalone components with direct imports |
| `@Input()` / `@Output()` decorators | Still works but signal-based `input()`/`output()` is the v20 way | `input()`, `output()`, `model()` |
| `resource()` / `httpResource()` | Experimental in v20 — breaking changes expected | `HttpClient` + `toSignal()` for v1 |
| Zoneless (`provideZonelessChangeDetection`) | Developer Preview — not production-safe | Default Zone.js for v1 |
| `TypeORM` | Decorators on entities bleed ORM into domain; Active Record conflicts with Clean Arch | Prisma with mapper pattern |
| `Drizzle ORM` | Schema-in-code migration story less mature | Prisma |
| `mongoose` / MongoDB | Project specifies PostgreSQL relational schema | PostgreSQL + Prisma |
| `prisma db push` | Bypasses migration history; unsafe for production | `prisma migrate dev` / `prisma migrate deploy` |
| `@nestjs/graphql` | No GraphQL requirement; adds complexity | REST + OpenAPI |
| `@nestjs/microservices` | Overkill for 3-service internal architecture | Direct HTTP via proxy |
| Class-based route guards (Angular) | Deprecated; less composable | Functional guards (`CanActivateFn`) |
| `localStorage` for refresh tokens | Accessible to JavaScript; XSS risk | `httpOnly` cookie |
| `localStorage` for access tokens | Not inherently wrong but adds CSRF risk if not handled carefully | Memory (JS variable) or cookie |

---

## Installation Commands

### Angular Frontend

```bash
ng new frontend --standalone --routing --style=scss
ng add @angular/material
npm install @angular/core@20 @angular/common@20 @angular/router@20 @angular/forms@20 @angular/platform-browser@20
```

### NestJS BFF + Core API (each project separately)

```bash
npm install @nestjs/core@^11 @nestjs/common@^11 @nestjs/platform-express@^11 \
  @nestjs/config@^4 @nestjs/jwt@^11 @nestjs/passport@^11 @nestjs/swagger@^11 \
  @nestjs/throttler@^6 \
  passport passport-jwt cookie-parser class-validator class-transformer \
  http-proxy-middleware reflect-metadata rxjs

npm install -D @types/passport-jwt @types/cookie-parser @types/bcrypt \
  @nestjs/testing @nestjs/cli typescript ts-node ts-jest jest
```

### Core API — Additional Database Deps

```bash
npm install @prisma/client@^7 bcrypt
npm install -D prisma@^7 @types/bcrypt
npx prisma init
```

---

## Sources

**Angular 20:**
- [Angular v20 Official Signals Docs](https://angular.dev/guide/signals) — HIGH confidence
- [Announcing Angular v20](https://www.grazitti.com/blog/whats-new-in-angular-20-signals-zoneless-and-smarter-ssr/) — MEDIUM confidence
- [Angular 20 Stable Signals & Zoneless](https://medium.com/ng-guide/angular-20-stable-signals-zoneless-and-more-68fbd094a521) — MEDIUM confidence
- [Angular Component input() docs](https://angular.dev/guide/components/inputs) — HIGH confidence

**NestJS:**
- [Announcing NestJS 11](https://trilon.io/blog/announcing-nestjs-11-whats-new) — HIGH confidence
- [NestJS Rate Limiting Docs](https://docs.nestjs.com/security/rate-limiting) — HIGH confidence
- [NestJS JWT Refresh via httpOnly Cookie](https://dev.to/zenstok/part-33-how-to-implement-refresh-tokens-through-http-only-cookie-in-nestjs-and-react-265e) — MEDIUM confidence
- [Domain-Driven Hexagon Repository](https://github.com/Sairyss/domain-driven-hexagon) — HIGH confidence
- [Hexagonal Architecture in NestJS](https://medium.com/@lamjed.gaidi070/hexagonal-onion-and-clean-architecture-in-nestjs-c58b526d9f3f) — MEDIUM confidence
- [http-proxy-middleware in NestJS](https://medium.com/@benjannetahmed.03/using-http-proxy-middleware-in-nestjs-a-complete-guide-3b73dd777ab5) — MEDIUM confidence

**Prisma:**
- [Prisma Relations Docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations) — HIGH confidence
- [Prisma 6 Performance Features](https://www.prisma.io/blog/prisma-6-better-performance-more-flexibility-and-type-safe-sql) — HIGH confidence

**Docker:**
- [NestJS Docker Compose + Postgres](https://www.tomray.dev/nestjs-docker-compose-postgres) — MEDIUM confidence
- [Dockerize NestJS + Postgres + Redis](https://dev.to/manuchehr/dockerize-secure-nestjs-app-with-postgres-redis-56md) — MEDIUM confidence
