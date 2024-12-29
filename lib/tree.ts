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
  description: string;
};

export function getPersonById(tree: FamilyTreeType, id: string) {
  return tree.people.find(person => person.id === id);
}