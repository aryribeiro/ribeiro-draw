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

    // ── invariantes de fidelidade (veredito do conselho, 27/08/2026) ──

    // (1) contagem: nada se perde em silêncio — 11 ícones e 9 arestas no XML,
    // incluindo as 2 arestas com ponta livre (sourcePoint/targetPoint)
    expect(images).toHaveLength(11);
    expect(arrows).toHaveLength(9);
    expect(unresolvedTokens).toHaveLength(0);

    // (2) identidade: token `user` resolve para o ícone User (pessoa),
    // nunca para "AWS User Notifications" (sino) — exige nomes de acervo
    // sem o sufixo _48_Light
    const fileIds = images.map((img) => String((img as any).fileId));
    expect(fileIds.some((id) => id.includes("Res_User_48"))).toBe(true);
    expect(fileIds.some((id) => id.includes("User_Notifications"))).toBe(false);
    expect(fileIds.some((id) => id.includes("Authenticated_User"))).toBe(true);

    // (4) tipografia: o original não é hand-drawn — importa em fonte normal
    const texts = elements.filter((el) => el.type === "text");
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect((text as any).fontFamily).toBe(2);
    }

    // (5) topologia: setas encostam na BORDA das formas (nunca no centro do
    // ícone), com rota Manhattan própria nas ortogonais desalinhadas
    const anchored = arrows.filter(
      (a) => (a as any).startBinding && (a as any).endBinding,
    );
    expect(anchored).toHaveLength(7);
    const byId = new Map(elements.map((el) => [el.id, el]));
    for (const arrow of anchored) {
      const linear = arrow as any;
      for (const [binding, pointIndex] of [
        [linear.startBinding, 0],
        [linear.endBinding, linear.points.length - 1],
      ] as const) {
        const bound = byId.get(binding.elementId)!;
        const px = linear.x + linear.points[pointIndex][0];
        const py = linear.y + linear.points[pointIndex][1];
        const inside =
          px > bound.x + 1 &&
          px < bound.x + bound.width - 1 &&
          py > bound.y + 1 &&
          py < bound.y + bound.height - 1;
        expect(inside).toBe(false);
      }
    }
    // ortogonais desalinhadas ganham pontos intermediários (dobra em L/Z)
    expect(anchored.some((a) => (a as any).points.length > 2)).toBe(true);
  });
});

// segundo caso do corpus: .xml gerado por IA (Claude), todas arestas ancoradas
describe("arquivo real: arquitetura-workshop.drawio.xml (gerado por IA)", () => {
  it("importa 12 ícones, 10 arestas e todos os textos, sem perdas", async () => {
    registerMxGraphAwsIcons(ALL_AWS_ICONS);
    const xml = readFileSync(
      join(__dirname, "fixtures/mxgraph/arquitetura-workshop.drawio.xml"),
      "utf8",
    );
    const { elements, unresolvedTokens } = await convertMxGraphToExcalidraw(
      xml,
    );

    const images = elements.filter((el) => el.type === "image");
    const arrows = elements.filter((el) => el.type === "arrow");

    // 10 resourceIcon (bedrock, cloudwatch, connect, dynamodb, iam, kms,
    // lambda, lex, s3, sns) + 2 atores/roles
    expect(images).toHaveLength(12);
    expect(unresolvedTokens).toHaveLength(0);
    expect(arrows).toHaveLength(10);
    for (const arrow of arrows) {
      expect((arrow as any).startBinding?.elementId).toBeTruthy();
      expect((arrow as any).endBinding?.elementId).toBeTruthy();
    }
  });
});
