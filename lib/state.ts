import { proxy } from "valtio";
import { createTestTree } from "./tree";

export const state = proxy({
  tree: createTestTree(),
});