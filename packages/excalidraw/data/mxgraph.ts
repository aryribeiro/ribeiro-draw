/**
 * Importador nativo de diagramas draw.io / mxGraph (.drawio / .xml).
 *
 * Converte o XML mxGraph em skeletons do Excalidraw
 * (convertToExcalidrawElements) com os ícones AWS do acervo local embutidos
 * como SVG no mapa `files` — o resultado abre em qualquer Excalidraw.
 *
 * Garantias por tier:
 *  - invioláveis: conectividade (bindings), texto e geometria absoluta;
 *  - degradáveis: waypoints ortogonais viram setas retas; estilos exóticos
 *    caem no estilo hand-drawn da casa.
 */
import { MIME_TYPES } from "@excalidraw/common";
import { convertToExcalidrawElements } from "@excalidraw/element";
import { pointFrom } from "@excalidraw/math";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";

import type { BinaryFiles, DataURL } from "../types";

// ─── Registro de ícones (injetado pelo app; evita dependência circular) ──────

export interface MxAwsIcon {
  id: string;
  name: string;
  dataUri: string;
}

let awsIconRegistry: readonly MxAwsIcon[] = [];

export const registerMxGraphAwsIcons = (icons: readonly MxAwsIcon[]) => {
  awsIconRegistry = icons;
};

// ─── Detecção ────────────────────────────────────────────────────────────────

export const isMxGraphData = (contents: string): boolean => {
  const head = contents.replace(/^﻿/, "").trimStart();
  if (!head.startsWith("<")) {
    return false;
  }
  return (
    /<mxfile[\s>]/.test(head.slice(0, 4096)) || head.includes("<mxGraphModel")
  );
};

// ─── Descompressão do <diagram> (base64 + raw deflate + URI-encoding) ────────

const inflateRaw = async (bytes: Uint8Array): Promise<string> => {
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes as unknown as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(out);
};

const decompressDiagram = async (text: string): Promise<string> => {
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return decodeURIComponent(await inflateRaw(bytes));
};

// ─── Parsing do XML (leniente: repara saída malformada de IAs) ───────────────

const parseXml = (xml: string): Document | null => {
  const parse = (input: string) => {
    const doc = new DOMParser().parseFromString(input, "text/xml");
    return doc.querySelector("parsererror") ? null : doc;
  };
  const sanitized = xml
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    // `&` cru (não-entidade) é o erro mais comum em XML gerado por IA
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);)/g, "&amp;");
  return parse(sanitized) ?? parse(xml);
};

const collectGraphModels = async (contents: string): Promise<Element[]> => {
  const doc = parseXml(contents);
  if (!doc) {
    throw new Error("XML inválido");
  }
  const models: Element[] = [];
  const diagrams = Array.from(doc.querySelectorAll("diagram"));
  if (diagrams.length === 0) {
    const model = doc.querySelector("mxGraphModel");
    if (model) {
      models.push(model);
    }
    return models;
  }
  for (const diagram of diagrams) {
    const inline = diagram.querySelector("mxGraphModel");
    if (inline) {
      models.push(inline);
      continue;
    }
    const text = diagram.textContent?.trim();
    if (!text) {
      continue;
    }
    try {
      const inner = parseXml(await decompressDiagram(text));
      const model = inner?.querySelector("mxGraphModel");
      if (model) {
        models.push(model);
      }
    } catch {
      // página comprimida ilegível — segue para as demais
    }
  }
  return models;
};

// ─── Estilo e rótulos ────────────────────────────────────────────────────────

const parseStyle = (style: string | null): Map<string, string> => {
  const map = new Map<string, string>();
  if (!style) {
    return map;
  }
  for (const token of style.split(";")) {
    if (!token) {
      continue;
    }
    const eq = token.indexOf("=");
    if (eq === -1) {
      map.set(token, "1");
    } else {
      map.set(token.slice(0, eq), token.slice(eq + 1));
    }
  }
  return map;
};

const cleanLabel = (value: string | null): string => {
  if (!value) {
    return "";
  }
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const mapColor = (value: string | undefined, fallback: string): string => {
  if (!value || value === "none") {
    return "transparent";
  }
  if (value === "default") {
    return fallback;
  }
  return value;
};

// ─── Resolução de ícones AWS ─────────────────────────────────────────────────

/** tokens do draw.io (resIcon/shape mxgraph.aws4.*) → nome pesquisável no acervo */
const AWS_TOKEN_ALIASES: Record<string, string> = {
  s3: "Simple Storage Service",
  iam: "Identity and Access Management",
  role: "Identity Access Management Role",
  iam_role: "Identity Access Management Role",
  api_gateway: "API Gateway",
  dynamodb: "DynamoDB",
  cloudwatch: "CloudWatch",
  cloudwatch_2: "CloudWatch",
  sqs: "Simple Queue Service",
  sns: "Simple Notification Service",
  route_53: "Route 53",
  route53: "Route 53",
  elastic_load_balancing: "Elastic Load Balancing",
  application_load_balancer: "Application Load Balancer",
  ecs: "Elastic Container Service",
  eks: "Elastic Kubernetes Service",
  ecr: "Elastic Container Registry",
  efs: "Elastic File System",
  ebs: "Elastic Block Store",
  ses: "Simple Email Service",
  kms: "Key Management Service",
  acm: "Certificate Manager",
  certificate_manager: "Certificate Manager",
  msk: "Managed Streaming for Apache Kafka",
  emr: "EMR",
  mq: "MQ",
  waf: "WAF",
  xray: "X Ray",
  x_ray: "X Ray",
  vpc: "Virtual Private Cloud",
  internet_gateway: "Internet Gateway",
  nat_gateway: "NAT Gateway",
  step_functions: "Step Functions",
  systems_manager: "Systems Manager",
  secrets_manager: "Secrets Manager",
  quicksight: "Quick",
  elasticache: "ElastiCache",
  documentdb: "DocumentDB with MongoDB compatibility",
  opensearch: "OpenSearch Service",
  sagemaker: "SageMaker",
  bedrock: "Bedrock",
  kinesis_data_streams: "Kinesis Data Streams",
  cognito: "Cognito",
  amplify: "Amplify",
  app_runner: "App Runner",
  appsync: "AppSync",
  eventbridge: "EventBridge",
  cloudfront: "CloudFront",
  cloudformation: "CloudFormation",
  cloudtrail: "CloudTrail",
  elastic_beanstalk: "Elastic Beanstalk",
  direct_connect: "Direct Connect",
  global_accelerator: "Global Accelerator",
  storage_gateway: "Storage Gateway",
  transfer_family: "Transfer Family",
  control_tower: "Control Tower",
  trusted_advisor: "Trusted Advisor",
  cost_explorer: "Cost Explorer",
  guardduty: "GuardDuty",
  lambda_function: "Lambda Function",
  s3_bucket: "Simple Storage Service Bucket",
  rds_instance: "RDS Instance",
  user: "User",
  users: "Users",
  client: "Client",
  mobile_client: "Mobile Client",
  traditional_server: "Traditional Server",
  general: "General",
};

const AWS_STOPWORDS = /\b(amazon|aws|and|the|for|with|on|of)\b/g;

const normalizeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(AWS_STOPWORDS, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const resolveAwsIcon = (token: string): MxAwsIcon | null => {
  if (awsIconRegistry.length === 0) {
    return null;
  }
  const cleanToken = token.replace(/_2$/, "");
  const query = normalizeName(
    AWS_TOKEN_ALIASES[token] ?? AWS_TOKEN_ALIASES[cleanToken] ?? cleanToken,
  );
  if (!query) {
    return null;
  }

  let best: MxAwsIcon | null = null;
  let bestScore = 0;
  for (const icon of awsIconRegistry) {
    const name = normalizeName(icon.name);
    let score = 0;
    if (name === query) {
      score = 100;
    } else if (name.startsWith(query) || query.startsWith(name)) {
      score = 70;
    } else if (name.includes(query) || query.includes(name)) {
      score = 40;
    }
    if (score === 0) {
      continue;
    }
    // serviços (Arch_*) preferidos sobre recursos; nomes curtos = mais específicos
    if (icon.id.startsWith("Arch_")) {
      score += 10;
    }
    score -= Math.min(name.length / 20, 5);
    if (score > bestScore) {
      bestScore = score;
      best = icon;
    }
  }
  return bestScore >= 40 ? best : null;
};

const svgToDataURL = (icon: MxAwsIcon): DataURL => icon.dataUri as DataURL;

// ─── Modelo intermediário ────────────────────────────────────────────────────

interface MxPoint {
  x: number;
  y: number;
}

interface MxCell {
  id: string;
  parent: string | null;
  source: string | null;
  target: string | null;
  vertex: boolean;
  edge: boolean;
  style: Map<string, string>;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  relative: boolean;
  /** ponta livre de aresta sem `source`/`target` (coords no espaço do pai) */
  sourcePoint: MxPoint | null;
  targetPoint: MxPoint | null;
}

// filho direto por tag, sem querySelector(":scope >") — ids do draw.io podem
// começar com dígito e quebram seletores CSS em alguns ambientes
const directChild = (node: Element, tagName: string): Element | null =>
  Array.from(node.children).find((c) => c.tagName === tagName) ?? null;

const readEndpoint = (
  geometry: Element | null,
  which: "sourcePoint" | "targetPoint",
): MxPoint | null => {
  if (!geometry) {
    return null;
  }
  const point = Array.from(geometry.children).find(
    (c) => c.tagName === "mxPoint" && c.getAttribute("as") === which,
  );
  if (!point) {
    return null;
  }
  return {
    x: Number(point.getAttribute("x") ?? 0),
    y: Number(point.getAttribute("y") ?? 0),
  };
};

const buildCell = (id: string, node: Element, label: string): MxCell => {
  const geometry = directChild(node, "mxGeometry");
  return {
    id,
    parent: node.getAttribute("parent"),
    source: node.getAttribute("source"),
    target: node.getAttribute("target"),
    vertex: node.getAttribute("vertex") === "1",
    edge: node.getAttribute("edge") === "1",
    style: parseStyle(node.getAttribute("style")),
    label,
    x: Number(geometry?.getAttribute("x") ?? 0),
    y: Number(geometry?.getAttribute("y") ?? 0),
    width: Number(geometry?.getAttribute("width") ?? 0),
    height: Number(geometry?.getAttribute("height") ?? 0),
    relative: geometry?.getAttribute("relative") === "1",
    sourcePoint: readEndpoint(geometry, "sourcePoint"),
    targetPoint: readEndpoint(geometry, "targetPoint"),
  };
};

const readCells = (model: Element): Map<string, MxCell> => {
  const cells = new Map<string, MxCell>();
  for (const node of Array.from(model.querySelectorAll("mxCell"))) {
    const id = node.getAttribute("id");
    if (!id || id === "0" || id === "1") {
      continue;
    }
    // células envelopadas (<object label=… id=…><mxCell…>) usam o pai como fonte
    const wrapper =
      node.parentElement && node.parentElement.tagName !== "root"
        ? node.parentElement
        : null;
    cells.set(
      id,
      buildCell(
        id,
        node,
        cleanLabel(
          node.getAttribute("value") ?? wrapper?.getAttribute("label") ?? "",
        ),
      ),
    );
  }
  // células envelopadas em <object>/<UserObject>: o id fica no envelope
  for (const wrapper of Array.from(
    model.querySelectorAll("object, UserObject"),
  )) {
    const id = wrapper.getAttribute("id");
    const inner = directChild(wrapper, "mxCell");
    if (!id || !inner || cells.has(id)) {
      continue;
    }
    cells.set(
      id,
      buildCell(id, inner, cleanLabel(wrapper.getAttribute("label"))),
    );
  }
  return cells;
};

/** posição absoluta somando recursivamente o offset dos pais (grupos) */
const absolutePosition = (
  cell: MxCell,
  cells: Map<string, MxCell>,
  cache: Map<string, { x: number; y: number }>,
): { x: number; y: number } => {
  const cached = cache.get(cell.id);
  if (cached) {
    return cached;
  }
  let { x, y } = cell;
  const parent = cell.parent ? cells.get(cell.parent) : undefined;
  if (parent?.vertex) {
    const parentPos = absolutePosition(parent, cells, cache);
    x += parentPos.x;
    y += parentPos.y;
  }
  const result = { x, y };
  cache.set(cell.id, result);
  return result;
};

// ─── Classificação de vértices ───────────────────────────────────────────────

const awsIconToken = (style: Map<string, string>): string | null => {
  const resIcon = style.get("resIcon");
  if (resIcon?.startsWith("mxgraph.aws4.")) {
    return resIcon.slice("mxgraph.aws4.".length);
  }
  const shape = style.get("shape");
  if (
    shape?.startsWith("mxgraph.aws4.") &&
    !["group", "resourceIcon", "groupCenter"].includes(
      shape.slice("mxgraph.aws4.".length),
    )
  ) {
    return shape.slice("mxgraph.aws4.".length);
  }
  return null;
};

const isGroupCell = (cell: MxCell): boolean => {
  const shape = cell.style.get("shape");
  return (
    shape === "mxgraph.aws4.group" ||
    cell.style.has("grIcon") ||
    cell.style.get("container") === "1" ||
    cell.style.has("group")
  );
};

const isTextCell = (cell: MxCell): boolean =>
  cell.style.has("text") && !cell.style.get("shape");

// ─── Conversão ───────────────────────────────────────────────────────────────

const ICON_LABEL_FONT_SIZE = 12;
const ICON_LABEL_CHAR_WIDTH = 7;

export interface MxGraphConversionResult {
  elements: readonly ExcalidrawElement[];
  files: BinaryFiles;
  /** tokens AWS que não resolveram para ícone (viram placeholder de contorno) */
  unresolvedTokens: string[];
}

export const convertMxGraphToExcalidraw = async (
  contents: string,
): Promise<MxGraphConversionResult> => {
  const models = await collectGraphModels(contents);
  if (models.length === 0) {
    throw new Error("Nenhum diagrama mxGraph encontrado no arquivo");
  }

  const skeletons: ExcalidrawElementSkeleton[] = [];
  const files: BinaryFiles = {};
  const unresolvedTokens: string[] = [];
  let pageOffsetX = 0;

  for (const [pageIndex, model] of models.entries()) {
    const cells = readCells(model);
    const positions = new Map<string, { x: number; y: number }>();
    const elementIdOf = (cellId: string) => `mx${pageIndex}_${cellId}`;

    const vertices = Array.from(cells.values()).filter(
      (cell) => cell.vertex && !cell.edge,
    );
    const edges = Array.from(cells.values()).filter((cell) => cell.edge);

    // grupos primeiro (ficam por baixo), maiores antes
    const groups = vertices
      .filter(isGroupCell)
      .sort((a, b) => b.width * b.height - a.width * a.height);
    const shapes = vertices.filter((cell) => !isGroupCell(cell));

    let pageMaxX = 0;

    for (const cell of [...groups, ...shapes]) {
      const { x: rawX, y } = absolutePosition(cell, cells, positions);
      const x = rawX + pageOffsetX;
      pageMaxX = Math.max(pageMaxX, rawX + cell.width);
      const style = cell.style;
      const strokeColor = mapColor(style.get("strokeColor"), "#1e1e1e");
      const backgroundColor = mapColor(style.get("fillColor"), "transparent");
      const dashed = style.get("dashed") === "1";

      if (isGroupCell(cell)) {
        skeletons.push({
          type: "rectangle",
          id: elementIdOf(cell.id),
          x,
          y,
          width: cell.width,
          height: cell.height,
          strokeColor: strokeColor === "transparent" ? "#1e1e1e" : strokeColor,
          backgroundColor,
          strokeStyle: dashed ? "dashed" : "solid",
          roughness: 0,
        });
        if (cell.label) {
          skeletons.push({
            type: "text",
            text: cell.label,
            x: x + 8,
            y: y + 6,
            fontSize: 14,
            fontFamily: 2,
            roughness: 0,
            strokeColor:
              strokeColor === "transparent" ? "#1e1e1e" : strokeColor,
          });
        }
        continue;
      }

      const token = awsIconToken(style);
      const isActor = style.get("shape") === "umlActor";
      if (token || isActor) {
        const icon = isActor
          ? resolveAwsIcon("users")
          : resolveAwsIcon(token as string);
        if (icon) {
          const fileId = `mxaws_${icon.id}`.slice(0, 40) as FileId;
          if (!files[fileId]) {
            files[fileId] = {
              mimeType: MIME_TYPES.svg,
              id: fileId,
              dataURL: svgToDataURL(icon),
              created: Date.now(),
            };
          }
          skeletons.push({
            type: "image",
            id: elementIdOf(cell.id),
            x,
            y,
            width: cell.width || 78,
            height: cell.height || 78,
            fileId,
          });
        } else {
          if (token) {
            unresolvedTokens.push(token);
          }
          // fallback honesto: contorno na cor do serviço, nunca bloco sólido
          skeletons.push({
            type: "rectangle",
            id: elementIdOf(cell.id),
            x,
            y,
            width: cell.width || 78,
            height: cell.height || 78,
            strokeColor:
              mapColor(style.get("fillColor"), "#FF9900") === "transparent"
                ? "#FF9900"
                : mapColor(style.get("fillColor"), "#FF9900"),
            backgroundColor: "transparent",
          });
        }
        const caption = cell.label || (icon ? icon.name : "");
        if (caption) {
          const captionWidth = caption.length * ICON_LABEL_CHAR_WIDTH;
          skeletons.push({
            type: "text",
            text: caption,
            x: x + (cell.width || 78) / 2 - captionWidth / 2,
            y: y + (cell.height || 78) + 6,
            fontSize: ICON_LABEL_FONT_SIZE,
            fontFamily: 2,
            roughness: 0,
            textAlign: "center",
            strokeColor: "#1e1e1e",
          });
        }
        continue;
      }

      if (isTextCell(cell)) {
        if (cell.label) {
          const fontSize = Number(style.get("fontSize") ?? 16);
          const align = style.get("align") ?? "left";
          const vAlign = style.get("verticalAlign") ?? "top";
          const textHeight = fontSize * 1.25 * cell.label.split("\n").length;
          const yOffset =
            vAlign === "middle"
              ? Math.max(0, (cell.height - textHeight) / 2)
              : vAlign === "bottom"
              ? Math.max(0, cell.height - textHeight)
              : 0;
          skeletons.push({
            type: "text",
            id: elementIdOf(cell.id),
            text: cell.label,
            x,
            y: y + yOffset,
            fontSize,
            fontFamily: 2,
            roughness: 0,
            strokeColor: mapColor(style.get("fontColor"), "#1e1e1e"),
            // honrar o alinhamento dentro da caixa original do draw.io
            ...(cell.width > 0
              ? {
                  width: cell.width,
                  autoResize: false,
                  textAlign:
                    align === "right"
                      ? ("right" as const)
                      : align === "center"
                      ? ("center" as const)
                      : ("left" as const),
                }
              : {}),
          } as ExcalidrawElementSkeleton);
        }
        continue;
      }

      const shapeType = style.has("ellipse")
        ? ("ellipse" as const)
        : style.has("rhombus")
        ? ("diamond" as const)
        : ("rectangle" as const);
      skeletons.push({
        type: shapeType,
        id: elementIdOf(cell.id),
        x,
        y,
        width: cell.width || 100,
        height: cell.height || 60,
        strokeColor: strokeColor === "transparent" ? "#1e1e1e" : strokeColor,
        backgroundColor,
        strokeStyle: dashed ? "dashed" : "solid",
        roughness: 0,
        ...(style.get("rounded") === "1"
          ? { roundness: { type: 3 as const } }
          : {}),
        ...(cell.label ? { label: { text: cell.label, fontFamily: 2 } } : {}),
      });
    }

    for (const edge of edges) {
      const source = edge.source ? cells.get(edge.source) : undefined;
      const target = edge.target ? cells.get(edge.target) : undefined;
      // pontas livres (sourcePoint/targetPoint) ficam no espaço do pai da aresta
      const parentCell = edge.parent ? cells.get(edge.parent) : undefined;
      const parentOffset = parentCell?.vertex
        ? absolutePosition(parentCell, cells, positions)
        : { x: 0, y: 0 };

      const endpointOf = (
        cell: MxCell | undefined,
        point: MxPoint | null,
      ): { x: number; y: number } | null => {
        if (cell) {
          const pos = absolutePosition(cell, cells, positions);
          return { x: pos.x + cell.width / 2, y: pos.y + cell.height / 2 };
        }
        if (point) {
          return { x: parentOffset.x + point.x, y: parentOffset.y + point.y };
        }
        return null;
      };

      const startPt = endpointOf(source, edge.sourcePoint);
      const endPt = endpointOf(target, edge.targetPoint);
      if (!startPt || !endPt) {
        continue;
      }
      const startX = startPt.x + pageOffsetX;
      const startY = startPt.y;
      const endX = endPt.x + pageOffsetX;
      const endY = endPt.y;
      const orthogonal = (edge.style.get("edgeStyle") ?? "").includes(
        "orthogonal",
      );

      skeletons.push({
        type: "arrow",
        id: elementIdOf(edge.id),
        x: startX,
        y: startY,
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
        points: [pointFrom(0, 0), pointFrom(endX - startX, endY - startY)],
        ...(source ? { start: { id: elementIdOf(source.id) } } : {}),
        ...(target ? { end: { id: elementIdOf(target.id) } } : {}),
        // elbow apenas com as duas pontas ancoradas — o roteador ortogonal
        // do Excalidraw depende dos bindings
        ...(orthogonal && source && target ? { elbowed: true } : {}),
        roughness: 0,
        strokeColor: mapColor(edge.style.get("strokeColor"), "#1e1e1e"),
        ...(edge.style.get("dashed") === "1"
          ? { strokeStyle: "dashed" as const }
          : {}),
        ...(edge.label
          ? { label: { text: edge.label, fontSize: 12, fontFamily: 2 } }
          : {}),
      } as ExcalidrawElementSkeleton);
    }

    pageOffsetX += pageMaxX + 200;
  }

  const elements = convertToExcalidrawElements(skeletons, {
    regenerateIds: false,
  });

  if (elements.length === 0) {
    throw new Error("O diagrama não contém elementos conversíveis");
  }

  return { elements, files, unresolvedTokens };
};
