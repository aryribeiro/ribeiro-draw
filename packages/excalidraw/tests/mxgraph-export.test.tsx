import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ALL_AWS_ICONS } from "../../../excalidraw-app/data/awsIcons";
import {
  convertMxGraphToExcalidraw,
  isMxGraphData,
  registerMxGraphAwsIcons,
} from "../data/mxgraph";
import { exportToMxGraphXml } from "../data/mxgraphExport";

describe("exportador Excalidraw → mxGraph (.drawio/.xml)", () => {
  beforeAll(() => {
    registerMxGraphAwsIcons(ALL_AWS_ICONS);
  });

  it("round-trip do arquivo real: import → export → import sem perdas", async () => {
    const xml = readFileSync(
      join(__dirname, "fixtures/mxgraph/arquitetura workshop-ary.drawio"),
      "utf8",
    );
    const first = await convertMxGraphToExcalidraw(xml);

    const exported = exportToMxGraphXml(first.elements, first.files, "teste");
    expect(isMxGraphData(exported)).toBe(true);
    // XML bem-formado: o parser estrito do DOMParser não pode reclamar
    const parsed = new DOMParser().parseFromString(exported, "text/xml");
    expect(parsed.querySelector("parsererror")).toBeNull();

    const second = await convertMxGraphToExcalidraw(exported);
    const firstImages = first.elements.filter((el) => el.type === "image");
    const secondImages = second.elements.filter((el) => el.type === "image");
    const secondArrows = second.elements.filter((el) => el.type === "arrow");

    // ícones sobrevivem como imagens embutidas (shape=image;image=data:...)
    expect(secondImages).toHaveLength(firstImages.length);
    // todas as 9 setas sobrevivem; as 7 ancoradas mantêm os bindings
    expect(secondArrows).toHaveLength(9);
    expect(
      secondArrows.filter(
        (a) => (a as any).startBinding && (a as any).endBinding,
      ),
    ).toHaveLength(7);
  });

  it("rótulos com caracteres especiais não quebram o XML", () => {
    const exported = exportToMxGraphXml(
      [
        {
          id: "t1",
          type: "text",
          x: 0,
          y: 0,
          width: 100,
          height: 20,
          isDeleted: false,
          text: 'P&D <"aspas"> e\nquebra',
          originalText: 'P&D <"aspas"> e\nquebra',
          textAlign: "center",
          fontSize: 14,
          strokeColor: "#1e1e1e",
        } as any,
      ],
      {},
    );
    const parsed = new DOMParser().parseFromString(exported, "text/xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    const cell = parsed.querySelector('mxCell[id="t1"]');
    expect(cell?.getAttribute("value")).toBe('P&D <"aspas"> e\nquebra');
  });
});
