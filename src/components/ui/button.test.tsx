// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("renders a button with the given label", () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole("button", { name: "保存" })).toBeDefined();
  });

  it("renders the child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/projects">プロジェクト</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "プロジェクト" }).getAttribute("data-slot")).toBe(
      "button",
    );
  });
});
