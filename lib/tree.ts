export type FamilyTreeType = {
  people: PersonType[];
};

export type PersonType = {
  id: string;
  lastName: string;
  lastNameKana: string;
  firstName: string;
  firstNameKana: string;
  isMan?: boolean;
  fatherId: string;
  motherId: string;
  spouseId: string;
  description: string;
};

export function getPersonById(tree: FamilyTreeType, id: string) {
  return tree.people.find(person => person.id === id);
}

export function getDisplayNameText(person: PersonType) {
  return !person.lastName && !person.firstName
    ? getDisplayKanaNameText(person) || undefined
    : (person.lastName ?? "") + (person.lastName && person.firstName ? "　" : "") + (person.firstName ?? "");
}

export function getDisplayKanaNameText(person: PersonType) {
  return !person.lastNameKana && !person.firstNameKana
    ? undefined
    : (person.lastNameKana ?? "") + (person.lastNameKana && person.firstNameKana ? "　" : "") + (person.firstNameKana ?? "");
}