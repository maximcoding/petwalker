# petwalker - docker shortcuts
# Usage: `make up`, `make logs s=api`, etc.
# We source .env via the shell (set -a) instead of docker's --env-file,
# because compose-go/dotenv has stricter rules than bash.

SHELL := /bin/bash
COMPOSE := docker compose -f infra/docker-compose.yml
PG_USER ?= petwalker
PG_DB   ?= petwalker

# Wrap every command with `set -a; source .env; set +a`
# so env vars from .env are exported into the docker compose process.
define DC
	set -a; source ./.env; set +a; $(COMPOSE) $(1)
endef

.DEFAULT_GOAL := help

## meta -----------------------------------------------------------------

.PHONY: help
help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?##"}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: env-check
env-check: ## verify .env exists and bash can source it
	@test -f .env || (echo "ERROR: .env missing. Run: cp .env.example .env" && exit 1)
	@bash -c "set -a; source ./.env; set +a; echo OK: $$POSTGRES_USER@$$POSTGRES_DB" \
	  || (echo "ERROR: .env has invalid bash syntax. Inspect with: cat -An .env" && exit 1)

## docker --------------------------------------------------------------

.PHONY: up
up: env-check ## start postgres / redis / pgadmin
	@$(call DC, up -d)

.PHONY: down
down: ## stop & remove containers (keep volumes)
	@$(call DC, down)

.PHONY: restart
restart: down up ## restart all services

.PHONY: ps
ps: ## list services
	@$(call DC, ps)

.PHONY: logs
logs: ## follow logs (use `make logs s=postgres`)
	@$(call DC, logs -f $(s))

## postgres ------------------------------------------------------------

.PHONY: db-shell
db-shell: ## open psql in the postgres container
	@$(call DC, exec postgres psql -U $(PG_USER) -d $(PG_DB))

.PHONY: db-reset
db-reset: ## drop & recreate database, run migrations + seed (destructive!)
	@$(call DC, exec postgres psql -U $(PG_USER) -d postgres -c "DROP DATABASE IF EXISTS $(PG_DB);")
	@$(call DC, exec postgres psql -U $(PG_USER) -d postgres -c "CREATE DATABASE $(PG_DB);")
	@$(MAKE) db-migrate
	@$(MAKE) db-seed

.PHONY: db-migrate
db-migrate: ## run drizzle migrations (creates extensions + applies migrations)
	pnpm --filter @petwalker/backend db:migrate

.PHONY: db-seed
db-seed: ## run TS seed (backend/src/db/seed.ts)
	pnpm --filter @petwalker/backend db:seed

.PHONY: db-generate
db-generate: ## generate drizzle migrations from current schema
	pnpm --filter @petwalker/backend db:generate

.PHONY: db-studio
db-studio: ## open drizzle studio (web GUI on the schema)
	pnpm --filter @petwalker/backend db:studio

.PHONY: shared-build
shared-build: ## (re)build @petwalker/shared so backend can import @petwalker/shared/{enums,types,...}
	pnpm --filter @petwalker/shared build

.PHONY: bootstrap
bootstrap: up shared-build ## first-time setup: up containers, build shared, migrate + seed
	@echo "waiting for postgres healthcheck..."
	@$(call DC, exec postgres bash -c "while ! pg_isready -U $(PG_USER) -d $(PG_DB) -q; do sleep 1; done")
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "ready. pgAdmin: http://localhost:5050"

.PHONY: db-fresh
db-fresh: ## DESTRUCTIVE — nuke db volume + drizzle migrations, regen + bootstrap from scratch
	@read -p "This drops postgres volume and regenerates migrations from current schema. Type 'yes': " ans; \
	if [ "$$ans" != "yes" ]; then echo "aborted"; exit 1; fi
	@$(MAKE) shared-build
	rm -rf backend/drizzle/migrations
	@$(call DC, down -v)
	@$(MAKE) up
	@echo "waiting for postgres healthcheck..."
	@$(call DC, exec postgres bash -c "while ! pg_isready -U $(PG_USER) -d $(PG_DB) -q; do sleep 1; done")
	@$(MAKE) db-generate
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "✅ fresh DB ready"

## redis ---------------------------------------------------------------

.PHONY: redis-cli
redis-cli: ## open redis-cli in the redis container
	@bash -c "set -a; source ./.env; set +a; $(COMPOSE) exec redis redis-cli -a $$REDIS_PASSWORD"

## pgadmin -------------------------------------------------------------

.PHONY: pgadmin
pgadmin: ## print pgadmin URL
	@bash -c "set -a; source ./.env; set +a; \
	  echo 'pgAdmin -> http://localhost:'$$PGADMIN_PORT; \
	  echo '  email:    '$$PGADMIN_EMAIL; \
	  echo '  password: '$$PGADMIN_PASSWORD"

## danger zone ---------------------------------------------------------

.PHONY: clean
clean: ## stop containers AND nuke volumes (data loss!)
	@read -p "This destroys all postgres/redis/pgadmin data. Type 'yes' to confirm: " ans; \
	if [ "$$ans" = "yes" ]; then $(call DC, down -v); else echo "aborted"; fi
