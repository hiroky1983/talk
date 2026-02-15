// Atlas configuration for GORM-based migrations

// Environment variables for database connection
variable "DB_HOST" {
  type    = string
  default = getenv("DB_HOST")
}

variable "DB_PORT" {
  type    = string
  default = getenv("DB_PORT")
}

variable "DB_USER" {
  type    = string
  default = getenv("DB_USER")
}

variable "DB_PASSWORD" {
  type    = string
  default = getenv("DB_PASSWORD")
}

variable "DB_NAME" {
  type    = string
  default = getenv("DB_NAME")
}

variable "DB_SSLMODE" {
  type    = string
  default = getenv("DB_SSLMODE")
}

// Data source configuration (read from GORM models)
data "external_schema" "gorm" {
  program = [
    "go",
    "run",
    "-mod=mod",
    "./cmd/atlas-loader",
  ]
}

// Environment configuration for local development
env "local" {
  src = data.external_schema.gorm.url

  // Database URL for local development
  url = "postgres://${var.DB_USER}:${var.DB_PASSWORD}@${var.DB_HOST}:${var.DB_PORT}/${var.DB_NAME}?sslmode=${var.DB_SSLMODE}"

  // Dev database URL (used for schema diffing) - ephemeral Docker container
  dev = "docker://postgres/16/dev?search_path=public"

  // Migration directory
  migration {
    dir = "file://migrations"
  }

  // Format configuration
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}

// Environment configuration for Docker
env "docker" {
  src = data.external_schema.gorm.url

  // Database URL for Docker environment
  url = "postgres://${var.DB_USER}:${var.DB_PASSWORD}@${var.DB_HOST}:${var.DB_PORT}/${var.DB_NAME}?sslmode=${var.DB_SSLMODE}"

  // Dev database URL (used for schema diffing)
  dev = "docker://postgres/16/dev?search_path=public"

  // Migration directory
  migration {
    dir = "file://migrations"
  }

  // Format configuration
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
