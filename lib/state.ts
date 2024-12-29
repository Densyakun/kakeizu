import { proxy } from "valtio";
import { createTestTree } from "./testTree";

export const state = proxy({
  tree: createTestTree(),
});