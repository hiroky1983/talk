package repository

import "errors"

var (
	// ErrNotFound is returned when a record is not found
	ErrNotFound = errors.New("record not found")

	// ErrDuplicate is returned when a unique constraint is violated
	ErrDuplicate = errors.New("duplicate record")

	// ErrForeignKey is returned when a foreign key constraint is violated
	ErrForeignKey = errors.New("foreign key violation")

	// ErrInvalidInput is returned when input validation fails
	ErrInvalidInput = errors.New("invalid input")

	// ErrTransaction is returned when a transaction fails
	ErrTransaction = errors.New("transaction failed")
)
