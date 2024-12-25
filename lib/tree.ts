import { v4 as uuidv4 } from 'uuid';
import gimei from './gimei';

export type FamilyTreeType = {
  people: PersonType[];
};

export type PersonType = {
  id: string;
  lastName?: string;
  lastNameKana?: string;
  firstName?: string;
  firstNameKana?: string;
  isMan?: boolean;
};

export function createTestTree(): FamilyTreeType {
  const population = 5;

  const people: PersonType[] = [];
  for (let index = 0; index < population; index++) {
    const person = createTestPerson();

    if (index === 0) {
      // 性別不明
      person.isMan = undefined;
      // 名字不明
      person.lastName = undefined;
      person.lastNameKana = undefined;
    } else if (index === 1) {
      // 名前不明
      person.firstName = undefined;
      person.firstNameKana = undefined;
    } else if (index === 2) {
      // 姓名不明
      person.lastName = undefined;
      person.lastNameKana = undefined;
      person.firstName = undefined;
      person.firstNameKana = undefined;
    } else if (index === 3) {
      // 姓名漢字不明
      person.lastName = undefined;
      person.firstName = undefined;
    }

    people.push(person);
  }

  return {
    people,
  };
}

export function createTestPerson() {
  const isMan = Boolean(Math.floor(Math.random() * 2));
  const name = isMan ? gimei.male() : gimei.female();

  const person: PersonType = {
    id: uuidv4(),
    lastName: name.last().kanji(),
    lastNameKana: name.last().katakana(),
    firstName: name.first().kanji(),
    firstNameKana: name.first().katakana(),
    isMan,
  };

  return person;
}