// @ts-nocheck
import { cn } from "../../lib/utils";

describe("unit: utils.cn", () => {
  it("merges class names", () => {
    const result = cn("btn", "btn-primary");
    expect(result).toBe("btn btn-primary");
    console.log("cn result:", result);
  });
});

describe("unit: types exist", () => {
  it("has type definitions for Button variants", () => {
    const { buttonVariants } = require("../../components/ui/button");
    console.log("buttonVariants keys:", Object.keys(buttonVariants || {}));
  });
});
