import { describe, it, expect } from "vitest";

describe("Pokemon", () => {
  it("should_return_true_if_pokemon_is_awesome", () => {
    // Given
    const pokemon = { isAwesome: true };

    // When
    const result = pokemon.isAwesome;

    // Then
    expect(result).toBe(true);
  });
});
