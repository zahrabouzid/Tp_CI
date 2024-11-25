import { Pokemon } from "~/services/pokemon";
import { PokeApiClient } from "~/services/PokeApiClient";

export class PokemonService {
  private pokeApiClient: PokeApiClient;
  private userTeams: Map<string, Pokemon[]> = new Map();

  constructor(pokeApiClient: PokeApiClient) {
    this.pokeApiClient = pokeApiClient;
  }

  async getPokemonList(): Promise<Pokemon[]> {
    return this.pokeApiClient.getPokemonList();
  }

  getUserTeam(userId: string): Pokemon[] {
    return this.userTeams.get(userId) || [];
  }

  clearTeam(userId: string) {
    this.userTeams.delete(userId);
  }

  togglePokemonInTeam(userId: string, pokemon: Pokemon): boolean {
    let team = this.userTeams.get(userId) || [];

    const isPokemonInTeam = team.some((p) => p.id === pokemon.id);

    if (isPokemonInTeam) {
      team = team.filter((p) => p.id !== pokemon.id);
      this.userTeams.set(userId, team);
      return true;
    }

    if (team.length >= 6) {
      return false;
    }

    team.push(pokemon);
    this.userTeams.set(userId, team);
    return true;
  }
}
