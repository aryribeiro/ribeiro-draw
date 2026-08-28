/**
 * "Aplicar estilo hand-drawn": converte elementos (tipicamente um diagrama
 * importado de .drawio/.xml, que chega fiel ao original — traço limpo e
 * fonte normal) para o estilo da casa: traço desenhado à mão (roughness 1)
 * e fonte Excalifont.
 *
 * Textos são re-medidos com a fonte nova e reposicionados preservando o
 * CENTRO horizontal e o topo — legendas continuam centradas sob os ícones.
 */
import {
  DEFAULT_FONT_FAMILY,
  getFontString,
  getLineHeight,
} from "@excalidraw/common";
import { measureText } from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
} from "@excalidraw/element/types";

const ROUGH_TYPES = new Set([
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "line",
  "freedraw",
]);

export const applyHandDrawnStyle = (
  elements: readonly ExcalidrawElement[],
  onlyIds?: ReadonlySet<string>,
): ExcalidrawElement[] => {
  return elements.map((el) => {
    if (el.isDeleted || (onlyIds && !onlyIds.has(el.id))) {
      return el;
    }

    if (el.type === "text") {
      const text = el as ExcalidrawTextElement;
      if (text.fontFamily === DEFAULT_FONT_FAMILY) {
        return el;
      }
      const lineHeight = getLineHeight(DEFAULT_FONT_FAMILY);
      const metrics = measureText(
        text.text,
        getFontString({
          fontFamily: DEFAULT_FONT_FAMILY,
          fontSize: text.fontSize,
        }),
        lineHeight,
      );
      const centerX = text.x + text.width / 2;
      return {
        ...text,
        fontFamily: DEFAULT_FONT_FAMILY,
        lineHeight,
        width: metrics.width,
        height: metrics.height,
        x: centerX - metrics.width / 2,
        version: text.version + 1,
        versionNonce: Math.floor(Math.random() * 2 ** 31),
        updated: Date.now(),
      } as ExcalidrawTextElement;
    }

    if (ROUGH_TYPES.has(el.type) && el.roughness === 0) {
      return {
        ...el,
        roughness: 1,
        version: el.version + 1,
        versionNonce: Math.floor(Math.random() * 2 ** 31),
        updated: Date.now(),
      } as ExcalidrawElement;
    }

    return el;
  });
};
