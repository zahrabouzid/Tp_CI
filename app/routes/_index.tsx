import { json, ActionFunction, LoaderFunction } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  Form,
  useNavigation,
  Link,
} from "@remix-run/react";
import { PokeApiClient } from "~/services/PokeApiClient";
// eslint-disable-next-line import/namespace
import { Pokemon } from "~/services/pokemon";
// eslint-disable-next-line import/namespace
import { PokemonService } from "~/services/PokemonService";
import { useRef } from "react";

const pokeApiClient = new PokeApiClient();
const pokemonService = new PokemonService(pokeApiClient);

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const userId = "demo-user"; // In real app, get from session
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get("search")?.toLowerCase() || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 24; // Pokémon per page

    const pokemonList = await pokemonService.getPokemonList();
    const userTeam = pokemonService.getUserTeam(userId);

    const filteredPokemon = pokemonList.filter(
      (pokemon) =>
        pokemon.name.toLowerCase().includes(searchTerm) ||
        pokemon.types.some((type: string) =>
          type.toLowerCase().includes(searchTerm),
        ),
    );

    const totalPages = Math.ceil(filteredPokemon.length / limit);
    const paginatedPokemon = filteredPokemon.slice(
      (page - 1) * limit,
      page * limit,
    );

    return json({
      pokemonList: paginatedPokemon,
      userTeam,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      searchTerm,
    });
  } catch (error) {
    console.error("Loader error:", error);
    throw json({ message: "Failed to load Pokédex" }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const intent = formData.get("intent");
    const userId = "demo-user"; // In real app, get from session

    switch (intent) {
      case "togglePokemon": {
        const pokemonData = JSON.parse(formData.get("pokemon") as string);
        const success = pokemonService.togglePokemonInTeam(userId, pokemonData);

        return json({
          success,
          team: pokemonService.getUserTeam(userId),
          message: success
            ? pokemonData.name +
              (success ? " updated in team" : " could not be added (team full)")
            : null,
        });
      }

      case "clearTeam": {
        pokemonService.clearTeam(userId);
        return json({
          success: true,
          team: [],
          message: "Team cleared",
        });
      }

      default:
        return json(
          { success: false, message: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Action error:", error);
    return json(
      { success: false, message: "Failed to update team" },
      { status: 500 },
    );
  }
};

function PokemonCard({
  pokemon,
  isInTeam,
  disabled,
}: {
  pokemon: Pokemon;
  isInTeam: boolean;
  disabled: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden shadow-md transition-all ${
        isInTeam ? "bg-green-100" : disabled ? "bg-gray-100" : "bg-white"
      }`}
    >
      {isInTeam && (
        <div className="absolute top-2 right-2">
          <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
            In Team
          </span>
        </div>
      )}

      <img
        src={pokemon.sprite}
        alt={pokemon.name}
        className="w-32 h-32 mx-auto p-2"
        loading="lazy"
      />

      <div className="p-4">
        <h3 className="text-lg font-semibold capitalize text-center mb-2">
          {pokemon.name}
        </h3>

        <div className="flex flex-wrap gap-1 justify-center">
          {pokemon.types.map((type: string) => (
            <span
              key={type}
              className={`px-2 py-1 rounded-full text-xs ${getTypeColor(type)}`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchBar({ defaultValue }: { defaultValue: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const transition = useNavigation();
  const isSearching = transition.state === "submitting";

  return (
    <Form ref={formRef} className="mb-6">
      <div className="flex gap-2">
        <input
          type="search"
          name="search"
          defaultValue={defaultValue}
          placeholder="Search Pokémon by name or type..."
          className="flex-1 px-4 py-2 border rounded-lg"
          onChange={() => {
            // Debounced search
            const timeoutId = setTimeout(() => {
              formRef.current?.submit();
            }, 300);
            return () => clearTimeout(timeoutId);
          }}
        />
        {isSearching && (
          <div className="flex items-center">
            <span className="loading">Searching...</span>
          </div>
        )}
      </div>
    </Form>
  );
}

export default function Pokedex() {
  const { pokemonList, userTeam, pagination, searchTerm } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const transition = useNavigation();
  const isUpdating = transition.state === "submitting";

  const currentTeam = actionData?.team || userTeam;
  //
  // useEffect(() => {
  //   if (actionData?.message) {
  //     // Show toast notification
  //     alert(actionData.message); // Replace with proper toast
  //   }
  // }, [actionData]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center">Pokédex</h1>

      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Your Team ({currentTeam.length}/6)
          </h2>
          {currentTeam.length > 0 && (
            <Form method="post">
              <input type="hidden" name="intent" value="clearTeam" />
              <button
                type="submit"
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Clear Team
              </button>
            </Form>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {currentTeam.map((pokemon: Pokemon) => (
            <Form method="post" key={pokemon.id}>
              <input type="hidden" name="intent" value="togglePokemon" />
              <input
                type="hidden"
                name="pokemon"
                value={JSON.stringify(pokemon)}
              />
              <button type="submit" className="w-full" disabled={isUpdating}>
                <PokemonCard
                  pokemon={pokemon}
                  isInTeam={true}
                  disabled={isUpdating}
                />
              </button>
            </Form>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <SearchBar defaultValue={searchTerm} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {pokemonList.map((pokemon: Pokemon) => {
          const isInTeam = currentTeam.some(
            (p: Pokemon) => p.id === pokemon.id,
          );

          return (
            <Form method="post" key={pokemon.id}>
              <input type="hidden" name="intent" value="togglePokemon" />
              <input
                type="hidden"
                name="pokemon"
                value={JSON.stringify(pokemon)}
              />
              <button
                type="submit"
                disabled={(!isInTeam && currentTeam.length >= 6) || isUpdating}
                className="w-full"
              >
                <PokemonCard
                  pokemon={pokemon}
                  isInTeam={isInTeam}
                  disabled={
                    (!isInTeam && currentTeam.length >= 6) || isUpdating
                  }
                />
              </button>
            </Form>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {pagination.hasPrevPage && (
            <Link
              to={`?page=${pagination.currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ""}`}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Previous
            </Link>
          )}
          <span className="px-4 py-2">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          {pagination.hasNextPage && (
            <Link
              to={`?page=${pagination.currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ""}`}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Utility function for type colors
function getTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    normal: "bg-gray-400 text-white",
    fire: "bg-red-500 text-white",
    water: "bg-blue-500 text-white",
    electric: "bg-yellow-400 text-black",
    grass: "bg-green-500 text-white",
    ice: "bg-blue-200 text-black",
    fighting: "bg-red-700 text-white",
    poison: "bg-purple-500 text-white",
    ground: "bg-yellow-600 text-white",
    flying: "bg-indigo-400 text-white",
    psychic: "bg-pink-500 text-white",
    bug: "bg-green-600 text-white",
    rock: "bg-yellow-800 text-white",
    ghost: "bg-purple-700 text-white",
    dragon: "bg-indigo-700 text-white",
    dark: "bg-gray-800 text-white",
    steel: "bg-gray-500 text-white",
    fairy: "bg-pink-400 text-white",
  };

  return typeColors[type.toLowerCase()] || "bg-gray-400 text-white";
}
