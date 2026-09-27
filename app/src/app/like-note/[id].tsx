import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  Avatar,
  BareInput,
  Body,
  Box,
  Button,
  Caption,
  Heading,
  SheetShell,
  useTheme,
} from "@/components/common";
import { copy } from "@/copy";
import { avatarSource } from "@/mocks/avatars";
import { profilesService } from "@/services/profiles.service";
import type { PublicProfile } from "@/services/types";
import { useDeckStore } from "@/stores/deck.store";

const MAX = 200;

/**
 * Like, with a note.
 *
 * The note is what turns a silent like into a message request the other person
 * actually sees (PLAN §1). The match gate still holds — this does not open a
 * conversation, it asks for one.
 */
export default function LikeNoteScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const like = useDeckStore((state) => state.like);

  const [person, setPerson] = useState<PublicProfile | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    void profilesService.getProfile(id).then(setPerson).catch(() => setPerson(null));
  }, [id]);

  async function send() {
    setSending(true);
    try {
      await like(note.trim() || undefined);
      router.back();
    } finally {
      setSending(false);
    }
  }

  return (
    <SheetShell
      title={copy.deck.noteTitle}
      footer={
        <Button
          label={copy.deck.note}
          onPress={send}
          disabled={note.trim().length === 0}
          loading={sending}
        />
      }
    >
      {person ? (
        <Box style={{ alignItems: "center", gap: theme.spacing.sm }}>
          <Avatar source={avatarSource(person.avatarId)} name={person.name} size="lg" />
          <Heading level="title">{`${person.name}, ${person.age}`}</Heading>
        </Box>
      ) : null}

      <Body color="textSecondary" style={{ textAlign: "center" }}>
        {copy.deck.noteHint}
      </Body>

      <BareInput
        value={note}
        onChangeText={setNote}
        placeholder={copy.deck.notePlaceholder}
        multiline
        maxLength={MAX}
        autoFocus
        accessibilityLabel={copy.deck.noteTitle}
        style={{
          minHeight: 120,
          borderRadius: theme.radius.md,
          backgroundColor: theme.color.surfaceSunken,
          padding: theme.spacing.lg,
          textAlignVertical: "top",
        }}
      />

      <Box style={{ alignItems: "flex-end" }}>
        <Caption>{`${note.length}/${MAX}`}</Caption>
      </Box>
    </SheetShell>
  );
}
