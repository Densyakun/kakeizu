import { v4 as uuidv4 } from 'uuid';
import { FamilyTreeType, PersonType } from './tree';
import gimei from './gimei';

export function createTestTree(): FamilyTreeType {
  const people = createTestPeople();

  let lastGen = people;
  for (let n = 0; n < 3; n++) {
    const men = lastGen.filter(person => person.isMan === true);
    if (men.length) {
      const father = men[Math.floor(Math.random() * men.length)];
      const { children, newMother } = createTestChildren(father.id);
      people.push(...children);
      if (newMother) people.push(newMother);
      lastGen = children;
    }
  }

  // 婚姻関係
  people[1].spouseId = people[2].id;
  people[2].spouseId = people[1].id;

  return {
    people,
  };
}

export function createTestPeople(): PersonType[] {
  const population = 5;

  const people: PersonType[] = [];
  for (let index = 0; index < population; index++) {
    // 奇数: 男性, 偶数: 女性（並び替えテストのため）
    const person = createTestPerson(Boolean(index % 2));

    if (index === 0) {
      // 性別不明
      person.isMan = undefined;
      person.description = "テスト";
      // 名字不明
      person.lastName = "";
      person.lastNameKana = "";
    } else if (index === 1) {
      // 名前不明
      person.firstName = "";
      person.firstNameKana = "";
    } else if (index === 2) {
      // 姓名不明
      person.lastName = "";
      person.lastNameKana = "";
      person.firstName = "";
      person.firstNameKana = "";
    } else if (index === 3) {
      // 姓名漢字不明
      person.lastName = "";
      person.firstName = "";

      // 長い姓名カナ
      person.lastNameKana = "チョクシカワハラ";
      person.firstNameKana = "サエモンサブロウ";
    } else if (index === 4) {
      person.isMan = true;

      person.lastName = "Smith";
      person.firstName = "James";

      person.lastNameKana = "スミス";
      person.firstNameKana = "ジェームズ";
    }

    people.push(person);
  }

  return people;
}

export function createTestChildren(fatherId = "", motherId = "") {
  const childrenCount = 3;

  let newMother: PersonType | undefined;
  if (!motherId) {
    const mother = createTestPerson(false);
    motherId = mother.id;
    newMother = mother;
  }

  const children: PersonType[] = [];
  for (let index = 0; index < childrenCount; index++) {
    const person = createTestPerson(Boolean(index % 2));
    person.fatherId = fatherId;
    person.motherId = motherId;

    children.push(person);
  }

  return {
    children,
    newMother,
  };
}

export function createTestPerson(isMan = Boolean(Math.floor(Math.random() * 2))) {
  const name = isMan ? gimei.male() : gimei.female();

  const person: PersonType = {
    id: uuidv4(),
    lastName: name.last().kanji(),
    lastNameKana: name.last().katakana(),
    firstName: name.first().kanji(),
    firstNameKana: name.first().katakana(),
    isMan: isMan,
    fatherId: "",
    motherId: "",
    spouseId: "",
    description: "",
  };

  return person;
}