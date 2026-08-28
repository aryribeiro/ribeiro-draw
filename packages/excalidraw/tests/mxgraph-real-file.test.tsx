import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ALL_AWS_ICONS } from "../../../excalidraw-app/data/awsIcons";
import {
  convertMxGraphToExcalidraw,
  registerMxGraphAwsIcons,
} from "../data/mxgraph";

// diagnóstico contra arquivo REAL exportado pelo app draw.io
describe("arquivo real: arquitetura workshop-ary.drawio", () => {
  it("relata resolução de ícones e cobertura de setas", async () => {
    registerMxGraphAwsIcons(ALL_AWS_ICONS);
    const xml = readFileSync(
      join(__dirname, "fixtures/mxgraph/arquitetura workshop-ary.drawio"),
      "utf8",
    );
    const { elements, unresolvedTokens } = await convertMxGraphToExcalidraw(
      xml,
    );

    const images = elements.filter((el) => el.type === "image");
    const arrows = elements.filter((el) => el.type === "arrow");

    // eslint-disable-next-line no-console
    console.log("RESOLUCOES:");
    for (const img of images) {
      // eslint-disable-next-line no-console
      console.log(`  fileId=${(img as any).fileId}`);
    }
    // eslint-disable-next-line no-console
    console.log(
      `IMAGENS=${images.length} SETAS=${arrows.length} NAO_RESOLVIDOS=${JSON.stringify(
        unresolvedTokens,
      )}`,
    );

    // o arquivo tem 9 vértices com ícone AWS e 8 arestas
    expect(images.length).toBeGreaterThan(0);
  });
});
