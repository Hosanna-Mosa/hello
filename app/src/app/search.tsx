import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Avatar,
  Box,
  DistanceLabel,
  EmptyState,
  List,
  ListRow,
  ScreenShell,
  SectionHeader,
  Spinner,
  useDebouncedValue,
  useTheme,
} from "@/components/common";
import { SearchBar } from "@/components/search/molecules/SearchBar";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { profilesService } from "@/services/profiles.service";
import type { PublicProfile } from "@/services/types";

/**
 * Search — people by name only.
 *
 * Not bios, not interests (PLAN Phase 5). Searching bios would surface people
 * by what they wrote about themselves, which is a different and much more
 * invasive product.
 *
 * Recent searches live in memory only (R7): they vanish on restart, which is
 * the least surprising behaviour for something never explicitly saved.
 */
export default function SearchScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  const debounced = useDebouncedValue(query, 300);

  /**
   * No synchronous setState in here on purpose.
   *
   * React Compiler's `set-state-in-effect` rule flags it, and it is right to:
   * clearing results for an empty query is derived state, and "is searching" is
   * just the input running ahead of the debounced value. Both are computed
   * below instead of stored.
   */
  useEffect(() => {
    const term = debounced.trim();
    if (!term) return;

    let cancelled = false;
    void (async () => {
      const found = await profilesService.searchByName(term);
      if (!cancelled) setResults(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  function remember(term: string) {
    const clean = term.trim();
    if (!clean) return;
    // Rebuilt, most-recent-first, de-duplicated, capped.
    setRecents((current) => [clean, ...current.filter((r) => r !== clean)].slice(0, 6));
  }

  const hasQuery = debounced.trim().length > 0;
  // The box is ahead of the results — that IS the loading state.
  const searching = hasQuery && query.trim() !== debounced.trim();
  const shown = hasQuery ? results : [];

  return (
    <ScreenShell title={copy.common.search} onBack={() => router.back()}>
      <Box style={{ paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.md }}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={copy.home.searchPlaceholder}
          autoFocus
        />
      </Box>

      {!hasQuery ? (
        recents.length > 0 ? (
          <Box style={{ paddingHorizontal: theme.spacing.xl }}>
            <SectionHeader
              title="Recent"
              actionLabel={copy.common.reset}
              onActionPress={() => setRecents([])}
            />
            {recents.map((term) => (
              <ListRow key={term} title={term} onPress={() => setQuery(term)} />
            ))}
          </Box>
        ) : (
          <EmptyState
            icon={{ ios: "magnifyingglass", android: "search" }}
            title={copy.home.searchPlaceholder}
            message="Find someone by name."
          />
        )
      ) : searching ? (
        <Box style={{ paddingTop: theme.spacing.xxl, alignItems: "center" }}>
          <Spinner />
        </Box>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={{ ios: "person.slash", android: "person_off" }}
          title={copy.home.searchEmptyTitle}
          message={copy.home.searchEmptyBody}
        />
      ) : (
        <List
          data={shown}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListRow
              title={`${item.name}, ${item.age}`}
              leading={<Avatar source={avatarSource(item.avatarId)} name={item.name} />}
              trailing={<DistanceLabel metres={item.distanceMetres} />}
              onPress={() => {
                remember(item.name);
                router.push({ pathname: "/user/[id]", params: { id: item.id } });
              }}
            />
          )}
        />
      )}
    </ScreenShell>
  );
}
