import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_FONT_FAMILY } from "@excalidraw/common";

import { ALL_AWS_ICONS } from "../../../excalidraw-app/data/awsIcons";
import { applyHandDrawnStyle } from "../data/handDrawn";
import {
  convertMxGraphToExcalidraw,
  registerMxGraphAwsIcons,
} from "../data/mxgraph";

describe("aplicar estilo hand-drawn pós-import", () => {
  it("troca fonte e traço preservando o centro dos textos", async () => {
    registerMxGraphAwsIcons(ALL_AWS_ICONS);
    const xml = readFileSync(
      join(__dirname, "fixtures/mxgraph/arquitetura workshop-ary.drawio"),
      "utf8",
    );
    const { elements } = await convertMxGraphToExcalidraw(xml);

    const before = new Map(
      elements
        .filter((el) => el.type === "text")
        .map((el) => [el.id, el.x + el.width / 2]),
    );

    const styled = applyHandDrawnStyle(elements);

    const texts = styled.filter((el) => el.type === "text");
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect((text as any).fontFamily).toBe(DEFAULT_FONT_FAMILY);
      // centro horizontal preservado após re-medição com a fonte nova
      const centerBefore = before.get(text.id)!;
      expect(Math.abs(text.x + text.width / 2 - centerBefore)).toBeLessThan(1);
    }

    for (const el of styled) {
      if (["rectangle", "ellipse", "diamond", "arrow"].includes(el.type)) {
        expect(el.roughness).toBe(1);
      }
    }

    // imagens (ícones) intocadas
    const images = styled.filter((el) => el.type === "image");
    expect(images).toHaveLength(11);
  });

  it("com seleção, aplica somente nos ids selecionados", () => {
    const base = {
      isDeleted: false,
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      roughness: 0,
      version: 1,
      versionNonce: 1,
      updated: 1,
    };
    const elements = [
      { ...base, id: "a", type: "rectangle" },
      { ...base, id: "b", type: "rectangle" },
    ] as any[];
    const styled = applyHandDrawnStyle(elements, new Set(["a"]));
    expect(styled.find((el) => el.id === "a")!.roughness).toBe(1);
    expect(styled.find((el) => el.id === "b")!.roughness).toBe(0);
  });
});
