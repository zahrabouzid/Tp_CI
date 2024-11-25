import { Pokemon } from "~/services/pokemon";

export class PokeApiClient {
  private baseUrl = "https://pokeapi.co/api/v2";

  async getPokemonList(limit: number = 151): Promise<Pokemon[]> {
    const response = await fetch(`${this.baseUrl}/pokemon?limit=${limit}`);
    const data = await response.json();

    return Promise.all(
      data.results.map(async (pokemon: { url: string }) => {
        const detailResponse = await fetch(pokemon.url);
        const detail = await detailResponse.json();
        return {
          id: detail.id,
          name: detail.name,
          sprite: detail.sprites.front_default,
          types: detail.types.map(
            (t: { type: { name: string } }) => t.type.name,
          ),
        };
      }),
    );
  }
}
