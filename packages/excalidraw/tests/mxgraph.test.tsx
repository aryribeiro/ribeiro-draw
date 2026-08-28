import { deflateRawSync } from "node:zlib";

import type {
  ExcalidrawArrowElement,
  ExcalidrawImageElement,
  ExcalidrawTextElement,
} from "@excalidraw/element/types";

import {
  convertMxGraphToExcalidraw,
  isMxGraphData,
  registerMxGraphAwsIcons,
} from "../data/mxgraph";

const FAKE_ICONS = [
  {
    id: "Arch_AWS_Lambda_64",
    name: "AWS Lambda",
    dataUri: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
  },
  {
    id: "Arch_Amazon_Simple_Storage_Service_64",
    name: "Amazon Simple Storage Service",
    dataUri: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
  },
  {
    id: "Arch_Amazon_API_Gateway_64",
    name: "Amazon API Gateway",
    dataUri: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
  },
  {
    id: "Res_Users_48",
    name: "Users",
    dataUri: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
  },
];

// XML no estilo que IAs geram: mxGraphModel plano, sem compressão
const AI_STYLE_XML = `<mxfile host="app.diagrams.net">
  <diagram id="d1" name="Página 1">
    <mxGraphModel dx="800" dy="600" grid="1">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="cloud" value="AWS Cloud" style="shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;dashed=0;" vertex="1" parent="1">
          <mxGeometry x="200" y="100" width="500" height="300" as="geometry" />
        </mxCell>
        <mxCell id="lambda1" value="Processador" style="sketch=0;outlineConnect=0;fontColor=#232F3E;fillColor=#ED7100;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;" vertex="1" parent="cloud">
          <mxGeometry x="60" y="80" width="78" height="78" as="geometry" />
        </mxCell>
        <mxCell id="s31" value="Bucket de dados" style="shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3;fillColor=#7AA116;" vertex="1" parent="cloud">
          <mxGeometry x="300" y="80" width="78" height="78" as="geometry" />
        </mxCell>
        <mxCell id="apigw" value="" style="shape=mxgraph.aws4.api_gateway;fillColor=#E7157B;" vertex="1" parent="1">
          <mxGeometry x="40" y="180" width="78" height="78" as="geometry" />
        </mxCell>
        <mxCell id="actor" value="Usu&#225;rio" style="shape=umlActor;verticalLabelPosition=bottom;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="40" height="60" as="geometry" />
        </mxCell>
        <mxCell id="note" value="Fluxo &amp; regras&#10;de neg&#243;cio" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="760" y="120" width="160" height="70" as="geometry" />
        </mxCell>
        <mxCell id="e1" value="grava" style="edgeStyle=orthogonalEdgeStyle;dashed=1;" edge="1" parent="1" source="lambda1" target="s31">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="apigw" target="lambda1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

const buildCompressedMxFile = (innerXml: string) => {
  const deflated = deflateRawSync(
    Buffer.from(encodeURIComponent(innerXml), "utf8"),
  );
  return `<mxfile host="app.diagrams.net"><diagram id="c1" name="P1">${deflated.toString(
    "base64",
  )}</diagram></mxfile>`;
};

const INNER_MODEL = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="a" value="Caixa" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="10" y="10" width="120" height="60" as="geometry"/></mxCell><mxCell id="b" value="" style="ellipse;" vertex="1" parent="1"><mxGeometry x="300" y="10" width="80" height="80" as="geometry"/></mxCell><mxCell id="ab" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>`;

describe("importador mxGraph (.drawio/.xml)", () => {
  beforeAll(() => {
    registerMxGraphAwsIcons(FAKE_ICONS);
  });

  it("detecta conteúdo mxGraph e ignora não-XML", () => {
    expect(isMxGraphData(AI_STYLE_XML)).toBe(true);
    expect(isMxGraphData(INNER_MODEL)).toBe(true);
    expect(isMxGraphData('{"type":"excalidraw"}')).toBe(false);
    expect(isMxGraphData("<svg></svg>")).toBe(false);
  });

  it("converte XML estilo IA: ícones, grupo, ator, nota e setas com binding", async () => {
    const { elements, files, unresolvedTokens } =
      await convertMxGraphToExcalidraw(AI_STYLE_XML);

    const images = elements.filter(
      (el): el is ExcalidrawImageElement => el.type === "image",
    );
    // lambda, s3, api gateway (via shape=) e ator
    expect(images).toHaveLength(4);
    for (const image of images) {
      expect(image.fileId).toBeTruthy();
      expect(files[image.fileId!]).toBeDefined();
      expect(files[image.fileId!].dataURL).toContain("data:image/svg+xml");
    }
    expect(unresolvedTokens).toHaveLength(0);

    // coordenadas do filho de grupo são absolutas (200+60, 100+80)
    const lambda = images.find((img) => String(img.fileId).includes("Lambda"))!;
    expect(lambda.x).toBe(260);
    expect(lambda.y).toBe(180);

    // setas com bindings preservando conectividade
    const arrows = elements.filter(
      (el): el is ExcalidrawArrowElement => el.type === "arrow",
    );
    expect(arrows).toHaveLength(2);
    for (const arrow of arrows) {
      expect(arrow.startBinding?.elementId).toBeTruthy();
      expect(arrow.endBinding?.elementId).toBeTruthy();
    }
    const dashed = arrows.filter((arrow) => arrow.strokeStyle === "dashed");
    expect(dashed).toHaveLength(1);

    // rótulos: entidades decodificadas e quebra de linha preservada
    const texts = elements.filter(
      (el): el is ExcalidrawTextElement => el.type === "text",
    );
    const allText = texts.map((el) => el.originalText || el.text).join("|");
    expect(allText).toContain("Usuário");
    expect(allText).toContain("AWS Cloud");
    expect(allText).toContain("Fluxo & regras\nde negócio");
    // ícone sem value ganha o nome do serviço como legenda
    expect(allText).toContain("Amazon API Gateway");
  });

  it("descomprime <diagram> (base64 + deflate raw + URI-encoding)", async () => {
    const compressed = buildCompressedMxFile(INNER_MODEL);
    const { elements } = await convertMxGraphToExcalidraw(compressed);
    expect(elements.filter((el) => el.type === "rectangle")).toHaveLength(1);
    expect(elements.filter((el) => el.type === "ellipse")).toHaveLength(1);
    const arrow = elements.find(
      (el): el is ExcalidrawArrowElement => el.type === "arrow",
    )!;
    expect(arrow.startBinding?.elementId).toBeTruthy();
    expect(arrow.endBinding?.elementId).toBeTruthy();
  });

  it("repara XML malformado gerado por IA (& cru)", async () => {
    const broken = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="x" value="P&D e Vendas" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="50" as="geometry"/></mxCell></root></mxGraphModel>`;
    const { elements } = await convertMxGraphToExcalidraw(broken);
    const text = elements.find(
      (el): el is ExcalidrawTextElement => el.type === "text",
    );
    expect(text?.originalText || text?.text).toBe("P&D e Vendas");
  });

  it("token AWS desconhecido vira placeholder de contorno, não bloco sólido", async () => {
    const xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="z" value="Misterioso" style="shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.servico_inexistente_xyz;fillColor=#DD344C;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="78" height="78" as="geometry"/></mxCell></root></mxGraphModel>`;
    const { elements, unresolvedTokens } = await convertMxGraphToExcalidraw(
      xml,
    );
    expect(unresolvedTokens).toEqual(["servico_inexistente_xyz"]);
    const rect = elements.find((el) => el.type === "rectangle")!;
    expect(rect.backgroundColor).toBe("transparent");
    expect(rect.strokeColor).toBe("#DD344C");
  });
});
