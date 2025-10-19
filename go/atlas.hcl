// Atlas configuration for Talk database migrations
// https://atlasgo.io/

env "local" {
  // Local development with Docker PostgreSQL
  src = "file://internal/db/schema"
  dev = "docker://postgres/15/dev?search_path=public"

  migration {
    dir = "file://internal/db/migrations"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}

env "supabase" {
  // Supabase PostgreSQL connection
  src = "file://internal/db/schema"
  url = getenv("DATABASE_URL")

  migration {
    dir = "file://internal/db/migrations"

    // Execute all migrations in a single transaction
    tx_mode = "all"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
