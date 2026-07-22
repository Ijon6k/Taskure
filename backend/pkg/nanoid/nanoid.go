// Package nanoid provides NanoID generation with prefix support.
package nanoid

import (
	gonanoid "github.com/matoous/go-nanoid/v2"
)

// Alphabet is the URL-safe base62 character set.
const Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

// DefaultLength is the default NanoID character length (12 chars ~71 bits of entropy).
const DefaultLength = 12

// Generate creates a cryptographically secure NanoID with an optional prefix.
// Example: Generate("prj", 12) -> "prj_K8mP4xQ2Rf12"
func Generate(prefix string, length ...int) (string, error) {
	l := DefaultLength
	if len(length) > 0 && length[0] > 0 {
		l = length[0]
	}

	id, err := gonanoid.Generate(Alphabet, l)
	if err != nil {
		return "", err
	}

	if prefix != "" {
		return prefix + "_" + id, nil
	}
	return id, nil
}
