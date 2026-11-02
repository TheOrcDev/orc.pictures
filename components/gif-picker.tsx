"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useQueryStates } from "nuqs";

import { GifEmpty } from "@/components/gif-empty";
import { GifGrid } from "@/components/gif-grid";
import { GifStyleToggle } from "@/components/gif-style-toggle";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { Gif } from "@/lib/gifs";
import { searchGifs } from "@/lib/gifs";
import { gifSearchParams } from "@/lib/search-params";

interface GifPickerProps {
  gifs: Gif[];
}

const GifPicker = ({ gifs }: GifPickerProps) => {
  const [{ q: query, style }, setSearchParams] =
    useQueryStates(gifSearchParams);
  const results = searchGifs(query, gifs);
  const hasQuery = query.trim() !== "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FieldGroup className="flex-1">
          <Field>
            <FieldLabel className="sr-only" htmlFor="gif-search">
              Search gifs
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                autoComplete="off"
                id="gif-search"
                onChange={(event) => {
                  void setSearchParams({ q: event.target.value });
                }}
                placeholder="Search gifs…"
                spellCheck={false}
                type="search"
                value={query}
              />
              <InputGroupAddon>
                <MagnifyingGlass />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>
        <GifStyleToggle />
      </div>
      {results.length === 0 ? (
        <GifEmpty hasQuery={hasQuery} />
      ) : (
        <GifGrid gifs={results} style={style} />
      )}
    </div>
  );
};

export { GifPicker };
