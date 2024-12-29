import { state } from "@/lib/state";
import { FamilyTreeType, getPersonById, PersonType } from "@/lib/tree";
import { Box, Stack, Tooltip } from "@mui/material";
import { ReactNode } from "react";
import { useSnapshot } from "valtio";

function getDisplayNameText(person: PersonType) {
  return !person.lastName && !person.firstName
    ? getDisplayKanaNameText(person) || undefined
    : (person.lastName ?? "") + (person.lastName && person.firstName ? "　" : "") + (person.firstName ?? "");
}

function getDisplayKanaNameText(person: PersonType) {
  return !person.lastNameKana && !person.firstNameKana
    ? undefined
    : (person.lastNameKana ?? "") + (person.lastNameKana && person.firstNameKana ? "　" : "") + (person.firstNameKana ?? "");
}

function getRow(tree: FamilyTreeType, person: PersonType, loopPath: string[] = []): number {
  if (
    !person.fatherId && !person.motherId
    || loopPath.find(person1Id => person1Id === person.id)
  ) return 0;

  loopPath.push(person.id);

  const father = person.fatherId ? getPersonById(tree, person.fatherId) : undefined;
  const mother = person.motherId ? getPersonById(tree, person.motherId) : undefined;

  return Math.max(
    father ? getRow(tree, father, loopPath) : 0,
    mother ? getRow(tree, mother, loopPath) : 0
  ) + 1;
}

export function Tree() {
  const { tree } = useSnapshot(state);

  // 縦の順番を並び替える
  const peopleRows: PersonType[][] = [];
  tree.people.forEach(person => {
    const row = getRow(state.tree, person);

    if (!peopleRows[row]) peopleRows[row] = [];

    peopleRows[row].push(person);
  });

  // 両親の順番を並び替え、コンポーネントを作成する
  const rowComponents: ReactNode[][] = [];
  for (let row = peopleRows.length - 1; 0 <= row; row--) {
    if (!rowComponents[row]) rowComponents[row] = [];
    const components: ReactNode[] = rowComponents[row];

    while (peopleRows[row].length) {
      const person = peopleRows[row][0];

      let fatherRow = -1;
      let fatherIndex = -1;
      for (let row1 = row - 1; 0 <= row1; row1--) {
        fatherRow = row1;
        fatherIndex = peopleRows[row1].findIndex(person1 => person1.id === person.fatherId);
        if (0 <= fatherIndex) break;
      }

      let motherRow = -1;
      let motherIndex = -1;
      for (let row1 = row - 1; 0 <= row1; row1--) {
        motherRow = row1;
        motherIndex = peopleRows[row1].findIndex(person1 => person1.id === person.motherId);
        if (0 <= motherIndex) break;
      }

      if (0 <= fatherIndex && 0 <= motherIndex) {
        if (!rowComponents[row - 1]) rowComponents[row - 1] = [];
        rowComponents[row - 1].push(
          <Couple
            key={peopleRows[fatherRow][fatherIndex].id}
            man={peopleRows[fatherRow][fatherIndex]}
            woman={peopleRows[motherRow][motherIndex]}
          />
        );
        peopleRows[fatherRow].splice(fatherIndex, 1);
        if (fatherRow === motherRow)
          peopleRows[motherRow].splice(motherIndex - 1, 1);
        else
          peopleRows[motherRow].splice(motherIndex, 1);
      }

      components.push(<Person key={person.id} person={person} />);
      peopleRows[row].splice(0, 1);
    }
  }

  return <Stack spacing={1}>
    {rowComponents.map((components, row) =>
      <Stack key={row} direction="row" spacing={1}>
        {components}
      </Stack>
    )}
  </Stack>;
}

function Couple({ man, woman }: { man: PersonType, woman: PersonType }) {
  return <Stack direction="row" spacing={1}>
    <Person person={woman} />
    <Box sx={{
      p: 0.5,
      display: "inline-flex",
    }}>
      <Box sx={{
        width: 32,
        height: 144,
      }}>
        <span className="couple" />
      </Box>
    </Box>
    <Person person={man} />
  </Stack>;
}

function Person({ person }: { person: PersonType }) {
  const tooltip: string[] = [];

  if (person.isMan !== undefined) tooltip.push(`性別: ${person.isMan ? "男" : "女"}`);

  const kana = getDisplayKanaNameText(person);
  if (kana) tooltip.push(` カナ: ${kana}`);

  // TODO For debug
  if (person.fatherId) {
    const fatherName = getDisplayNameText(getPersonById(state.tree, person.fatherId)!);
    tooltip.push(` 父: ${fatherName || "（姓名不明）"}`);
  }
  if (person.motherId) {
    const motherName = getDisplayNameText(getPersonById(state.tree, person.motherId)!);
    tooltip.push(` 母: ${motherName || "（姓名不明）"}`);
  }

  if (person.description) tooltip.push(` 説明: ${person.description}`);

  return <Tooltip title={tooltip.join(", ")}>
    <Box sx={{
      p: 0.5,
      display: "inline-flex",
    }}>
      <Box className="hina-mincho-regular" sx={{
        msWritingMode: "vertical-rl",
        writingMode: "vertical-rl",
        overflow: "scroll",
        width: 32,
        height: 144,
        whiteSpace: "nowrap",
        marginX: "auto",
      }}>
        {getDisplayNameText(person) || "（不明）"}
      </Box>
    </Box>
  </Tooltip>;
}