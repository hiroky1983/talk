// Define environment for local development
env "local" {
  // Set the database URL from environment variable or use default
  url = getenv("ATLAS_DB_URL", "postgres://postgres:password@localhost:5434/talk?sslmode=disable")

  // Set the path to the migration directory
  migration {
    dir = "file://internal/database/migrations"
  }

  // Define the source of truth for the schema (GORM models)
  src = "file://internal/models"

  // Define schemas to manage
  schemas = ["public"]

  // Exclude tables managed by other tools (if any)
  exclude {
    # Add any tables you want to exclude from migration
  }
}

// Define environment for docker
env "docker" {
  // Use docker-compose service name
  url = "postgres://postgres:password@postgres:5432/talk?sslmode=disable"

  migration {
    dir = "file://internal/database/migrations"
  }

  src = "file://internal/models"
  schemas = ["public"]
}

// Define the data source for the database schema
data "external_schema" "gorm" {
  program = [
    "go",
    "run",
    "-mod=mod",
    "internal/database/atlas_loader.go",
  ]
}

env "gorm" {
  src = data.external_schema.gorm.url
  dev = "docker://postgres/16/dev?search_path=public"
  migration {
    dir = "file://internal/database/migrations"
  }
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
