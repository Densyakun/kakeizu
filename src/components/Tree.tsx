import { state } from "@/lib/state";
import { PersonType } from "@/lib/tree";
import { Box, Paper, Stack, Tooltip } from "@mui/material";
import { useSnapshot } from "valtio";

function getDisplayTextKanaName(person: PersonType) {
  return !person.lastNameKana && !person.firstNameKana
    ? undefined
    : (person.lastNameKana ?? "") + (person.lastNameKana && person.firstNameKana ? " " : "") + (person.firstNameKana ?? "");
}

export function Tree() {
  const { tree } = useSnapshot(state);

  return <Stack direction="row" spacing={1}>
    {tree.people.map(person => <Tooltip key={person.id} title={
      `性別: ${person.isMan === undefined ? "不明" : person.isMan ? "男" : "女"}`
      + ` カナ: ${getDisplayTextKanaName(person) || "不明"}`
    }>
      <Paper sx={{ p: 0.5 }}>
        <Box className="hina-mincho-regular" sx={{
          msWritingMode: "vertical-rl",
          writingMode: "vertical-rl",
        }}>
          {!person.lastName && !person.firstName
            ? getDisplayTextKanaName(person) || "（不明）"
            : (person.lastName ?? "") + (person.lastName && person.firstName ? "　" : "") + (person.firstName ?? "")
          }
        </Box>
      </Paper>
    </Tooltip>)}
  </Stack>;
}