/**
 * Exportador Excalidraw → draw.io/mxGraph (.drawio / .xml).
 *
 * Gera um <mxfile> descomprimido que o app draw.io abre diretamente.
 * Ícones (elementos image) são embutidos no estilo da célula como
 * `image=data:image/svg+xml,<base64>` — convenção do draw.io (sem ";base64").
 */
import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
} from "@excalidraw/element/types";

import type { BinaryFiles } from "../types";

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "&#10;");

const toDrawioImage = (dataURL: string): string | null => {
  // estilo do draw.io não aceita ";" dentro do valor — usar base64 sem marcador
  const svgPrefix = "data:image/svg+xml,";
  const svgBase64Prefix = "data:image/svg+xml;base64,";
  const pngBase64Prefix = "data:image/png;base64,";
  try {
    if (dataURL.startsWith(svgBase64Prefix)) {
      return svgPrefix + dataURL.slice(svgBase64Prefix.length);
    }
    if (dataURL.startsWith(pngBase64Prefix)) {
      return `data:image/png,${dataURL.slice(pngBase64Prefix.length)}`;
    }
    if (dataURL.startsWith(svgPrefix)) {
      const svg = decodeURIComponent(dataURL.slice(svgPrefix.length));
      const base64 = btoa(
        String.fromCharCode(...new TextEncoder().encode(svg)),
      );
      return svgPrefix + base64;
    }
  } catch {
    // dataURL fora do esperado — melhor sem imagem que XML inválido
  }
  return null;
};

const colorOrNone = (color: string | undefined): string =>
  !color || color === "transparent" ? "none" : color;

export const exportToMxGraphXml = (
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles,
  diagramName = "Ribeiro Draw!",
): string => {
  const live = elements.filter((el) => !el.isDeleted);

  // textos vinculados viram o `value` do container/aresta que os contém
  const boundLabelOf = new Map<string, string>();
  const boundTextIds = new Set<string>();
  for (const el of live) {
    if (el.type === "text" && (el as ExcalidrawTextElement).containerId) {
      const text = el as ExcalidrawTextElement;
      boundLabelOf.set(
        text.containerId as string,
        text.originalText || text.text,
      );
      boundTextIds.add(el.id);
    }
  }

  const cells: string[] = [];

  for (const el of live) {
    if (boundTextIds.has(el.id)) {
      continue;
    }
    const label = xmlEscape(boundLabelOf.get(el.id) ?? "");

    switch (el.type) {
      case "rectangle":
      case "ellipse":
      case "diamond": {
        const shape =
          el.type === "ellipse"
            ? "ellipse;"
            : el.type === "diamond"
            ? "rhombus;"
            : `rounded=${el.roundness ? 1 : 0};`;
        const style = `${
          `${shape}whiteSpace=wrap;html=1;` +
          `fillColor=${colorOrNone(el.backgroundColor)};` +
          `strokeColor=${colorOrNone(el.strokeColor)};`
        }${el.strokeStyle !== "solid" ? "dashed=1;" : ""}`;
        cells.push(
          `<mxCell id="${xmlEscape(
            el.id,
          )}" value="${label}" style="${style}" vertex="1" parent="1"><mxGeometry x="${
            el.x
          }" y="${el.y}" width="${el.width}" height="${
            el.height
          }" as="geometry" /></mxCell>`,
        );
        break;
      }

      case "text": {
        const text = el as ExcalidrawTextElement;
        const style =
          `text;html=1;align=${text.textAlign};verticalAlign=top;` +
          `fontSize=${text.fontSize};fontColor=${colorOrNone(
            text.strokeColor,
          )};`;
        cells.push(
          `<mxCell id="${xmlEscape(el.id)}" value="${xmlEscape(
            text.originalText || text.text,
          )}" style="${style}" vertex="1" parent="1"><mxGeometry x="${
            el.x
          }" y="${el.y}" width="${el.width}" height="${
            el.height
          }" as="geometry" /></mxCell>`,
        );
        break;
      }

      case "image": {
        const fileData = el.fileId ? files[el.fileId] : undefined;
        const image = fileData ? toDrawioImage(fileData.dataURL) : null;
        const style = image
          ? `shape=image;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=${image};`
          : `rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#FF9900;`;
        cells.push(
          `<mxCell id="${xmlEscape(
            el.id,
          )}" value="${label}" style="${style}" vertex="1" parent="1"><mxGeometry x="${
            el.x
          }" y="${el.y}" width="${el.width}" height="${
            el.height
          }" as="geometry" /></mxCell>`,
        );
        break;
      }

      case "arrow":
      case "line": {
        const linear = el as any;
        const sourceId: string | undefined =
          linear.startBinding?.elementId ?? undefined;
        const targetId: string | undefined =
          linear.endBinding?.elementId ?? undefined;
        const style = `html=1;${
          (linear.points?.length ?? 2) > 2
            ? "edgeStyle=orthogonalEdgeStyle;rounded=1;"
            : "edgeStyle=none;"
        }strokeColor=${colorOrNone(el.strokeColor)};${
          el.strokeStyle !== "solid" ? "dashed=1;" : ""
        }${
          el.type === "line" ? "endArrow=none;" : "endArrow=block;endFill=1;"
        }`;
        const points: readonly [number, number][] = linear.points ?? [
          [0, 0],
          [el.width, el.height],
        ];
        const last = points[points.length - 1];
        const startPoint = !sourceId
          ? `<mxPoint x="${el.x}" y="${el.y}" as="sourcePoint" />`
          : "";
        const endPoint = !targetId
          ? `<mxPoint x="${el.x + last[0]}" y="${
              el.y + last[1]
            }" as="targetPoint" />`
          : "";
        cells.push(
          `<mxCell id="${xmlEscape(
            el.id,
          )}" value="${label}" style="${style}" edge="1" parent="1"${
            sourceId ? ` source="${xmlEscape(sourceId)}"` : ""
          }${
            targetId ? ` target="${xmlEscape(targetId)}"` : ""
          }><mxGeometry relative="1" as="geometry">${startPoint}${endPoint}</mxGeometry></mxCell>`,
        );
        break;
      }

      default:
        // freedraw, frames, embeds etc. ficam fora do formato mxGraph
        break;
    }
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<mxfile host="Ribeiro Draw!" type="device">`,
    `  <diagram name="${xmlEscape(diagramName)}" id="ribeiro-draw-export">`,
    `    <mxGraphModel grid="1" gridSize="10" page="1" math="0" shadow="0">`,
    `      <root>`,
    `        <mxCell id="0" />`,
    `        <mxCell id="1" parent="0" />`,
    `        ${cells.join("\n        ")}`,
    `      </root>`,
    `    </mxGraphModel>`,
    `  </diagram>`,
    `</mxfile>`,
    ``,
  ].join("\n");
};
