env "local" {
  src = "file://migrations"
  url = "postgres://postgres:postgres@localhost:5434/talk?sslmode=disable"
  dev = "docker://postgres/16/dev"
  migration {
    dir = "file://migrations"
  }
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}

env "docker" {
  src = "file://migrations"
  url = "postgres://postgres:postgres@postgres:5432/talk?sslmode=disable"
  dev = "docker://postgres/16/dev"
  migration {
    dir = "file://migrations"
  }
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
