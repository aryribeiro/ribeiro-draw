import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useExcalidrawAPI } from "@excalidraw/excalidraw";
import { useI18n } from "@excalidraw/excalidraw/i18n";

import {
  SERVICE_CATEGORIES,
  RESOURCE_CATEGORIES,
  GROUP_ICONS,
  CATEGORY_ICONS,
  TOTAL_ICON_COUNT,
  searchIcons,
} from "../../data/awsIcons";
import { TOTAL_TECH_ICON_COUNT } from "../../data/techIconsMeta";

import "./AwsIconPanel.scss";

import type { AwsIcon, AwsCategory } from "../../data/awsIcons";

type IconSet = "services" | "resources" | "groups" | "categories" | "tech";

const ICON_SET_KEYS: { key: IconSet; count: number }[] = [
  { key: "services", count: SERVICE_CATEGORIES.flatMap((c) => c.icons).length },
  {
    key: "resources",
    count: RESOURCE_CATEGORIES.flatMap((c) => c.icons).length,
  },
  { key: "groups", count: GROUP_ICONS.length },
  { key: "categories", count: CATEGORY_ICONS.length },
  { key: "tech", count: TOTAL_TECH_ICON_COUNT },
];

const CATEGORY_I18N_MAP: Record<string, string> = {
  Arch_Analytics: "analytics",
  "Arch_App-Integration": "appIntegration",
  "Arch_Artificial-Intelligence": "ai",
  Arch_Blockchain: "blockchain",
  "Arch_Business-Applications": "businessApps",
  "Arch_Cloud-Financial-Management": "cloudFinancial",
  Arch_Compute: "compute",
  Arch_Containers: "containers",
  "Arch_Customer-Enablement": "customerEnablement",
  Arch_Database: "database",
  "Arch_Developer-Tools": "devTools",
  "Arch_End-User-Computing": "endUserComputing",
  "Arch_Front-End-Web-Mobile": "frontendMobile",
  Arch_Games: "games",
  "Arch_General-Icons": "general",
  "Arch_Internet-of-Things": "iot",
  "Arch_Management-Governance": "managementGovernance",
  "Arch_Media-Services": "mediaServices",
  "Arch_Migration-Modernization": "migration",
  "Arch_Networking-Content-Delivery": "networking",
  "Arch_Quantum-Technologies": "quantum",
  Arch_Satellite: "satellite",
  "Arch_Security-Identity-Compliance": "security",
  Arch_Storage: "storage",
  Res_Analytics: "analytics",
  "Res_Application-Integration": "appIntegration",
  "Res_Artificial-Intelligence": "ai",
  Res_Blockchain: "blockchain",
  "Res_Business-Applications": "businessApps",
  Res_Compute: "compute",
  Res_Containers: "containers",
  Res_Database: "database",
  "Res_Developer-Tools": "devTools",
  "Res_End-User-Computing": "endUserComputing",
  "Res_Front-End-Web-Mobile": "frontendMobile",
  "Res_General-Icons": "general",
  Res_IoT: "iot",
  "Res_Management-Governance": "managementGovernance",
  "Res_Media-Services": "mediaServices",
  "Res_Migration-Modernization": "migration",
  "Res_Networking-Content-Delivery": "networking",
  "Res_Quantum-Technologies": "quantum",
  "Res_Security-Identity-Compliance": "security",
  Res_Storage: "storage",
};

const CARD_HEIGHT = 84;
const GRID_GAP = 6;
const GRID_PADDING = 8;

// glifos pretos/quase-pretos ficam invisíveis no painel escuro — invertidos
// SÓ no menu; no canvas entram com o SVG original (preto, como deve ser)
const DARK_GLYPH_BRAND_IDS = new Set([
  "Tech_Brands_TikTok",
  "Tech_Brands_Vercel",
  "Tech_Brands_Notion",
  "Tech_Brands_Next_js",
  "Tech_Brands_Anthropic",
  "Tech_Brands_Apache_Kafka",
]);

const isDarkGlyph = (iconId: string) =>
  iconId.startsWith("Tech_Shapes_") || DARK_GLYPH_BRAND_IDS.has(iconId);

// ─── Search input ────────────────────────────────────────────────────────────
const SearchInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="aws-panel__search-wrap">
    <input
      id="aws-icon-search"
      className="aws-panel__search"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      spellCheck={false}
    />
    {value && (
      <button
        className="aws-panel__search-clear"
        onClick={() => onChange("")}
        aria-label="Clear search"
      >
        ×
      </button>
    )}
  </div>
);

// ─── Icon set tab bar ────────────────────────────────────────────────────────
const SetTabs = ({
  active,
  onSelect,
  searching,
  t,
}: {
  active: IconSet;
  onSelect: (s: IconSet) => void;
  searching: boolean;
  t: (...args: any[]) => string;
}) => (
  <div className={`aws-panel__set-tabs${searching ? " hidden" : ""}`}>
    {ICON_SET_KEYS.map((s) => (
      <button
        key={s.key}
        className={`aws-panel__set-tab${active === s.key ? " active" : ""}`}
        onClick={() => onSelect(s.key)}
      >
        <span className="aws-panel__set-tab-label">
          {t(`awsPanel.tabs.${s.key}`)}
        </span>
        <span className="aws-panel__set-tab-count">{s.count}</span>
      </button>
    ))}
  </div>
);

// ─── Category filter chips ───────────────────────────────────────────────────
const CategoryFilter = ({
  categories,
  active,
  onSelect,
  t,
}: {
  categories: AwsCategory[];
  active: string | null;
  onSelect: (id: string | null) => void;
  t: (key: string) => string;
}) => (
  <div className="aws-panel__cats">
    <button
      className={`aws-panel__cat-chip${active === null ? " active" : ""}`}
      onClick={() => onSelect(null)}
    >
      {t("awsPanel.categories.all")}
    </button>
    {categories.map((cat) => {
      const i18nKey = CATEGORY_I18N_MAP[cat.id];
      const label = i18nKey ? t(`awsPanel.categories.${i18nKey}`) : cat.label;
      return (
        <button
          key={cat.id}
          className={`aws-panel__cat-chip${active === cat.id ? " active" : ""}`}
          onClick={() => onSelect(active === cat.id ? null : cat.id)}
          title={label}
        >
          {label}
        </button>
      );
    })}
  </div>
);

// ─── Virtualized icon grid ───────────────────────────────────────────────────
const VirtualGrid = ({
  icons,
  onInsert,
  containerRef,
}: {
  icons: AwsIcon[];
  onInsert: (icon: AwsIcon) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const obs = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const handler = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [containerRef]);

  // ao trocar de lista (tab/chip/busca), o scrollTop guardado em state fica
  // um frame desatualizado e renderizava cards em linhas da lista anterior
  // (fora da altura real) — ressincronizar direto do DOM
  useEffect(() => {
    setScrollTop(containerRef.current?.scrollTop ?? 0);
  }, [icons, containerRef]);

  const cols = 2;
  const rowHeight = CARD_HEIGHT + GRID_GAP;
  const totalRows = Math.ceil(icons.length / cols);
  const totalHeight = totalRows * rowHeight + GRID_PADDING * 2;

  const startRow = Math.min(
    Math.max(0, Math.floor((scrollTop - GRID_PADDING) / rowHeight) - 2),
    Math.max(0, totalRows - 1),
  );
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + 2,
  );

  const visibleIcons = [];
  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      if (idx >= icons.length) {
        break;
      }
      visibleIcons.push({ icon: icons[idx], row, col });
    }
  }

  return (
    <div
      className="aws-panel__virtual-grid"
      style={{ height: totalHeight, position: "relative" }}
    >
      {visibleIcons.map(({ icon, row, col }) => (
        <VirtualIconCard
          key={icon.id}
          icon={icon}
          onInsert={onInsert}
          style={{
            position: "absolute",
            top: GRID_PADDING + row * rowHeight,
            left: `calc(${col * 50}% + ${GRID_GAP / 2}px)`,
            width: `calc(50% - ${GRID_GAP}px)`,
            height: CARD_HEIGHT,
          }}
        />
      ))}
    </div>
  );
};

// ─── Single icon card ────────────────────────────────────────────────────────
const VirtualIconCard = React.memo(
  ({
    icon,
    onInsert,
    style,
  }: {
    icon: AwsIcon;
    onInsert: (icon: AwsIcon) => void;
    style: React.CSSProperties;
  }) => {
    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        e.dataTransfer.setData("application/aws-icon-data", icon.dataUri);
        e.dataTransfer.setData("application/aws-icon-name", icon.name);
        e.dataTransfer.effectAllowed = "copy";
      },
      [icon],
    );

    return (
      <button
        className="aws-panel__icon-card"
        title={icon.name}
        onClick={() => onInsert(icon)}
        draggable
        onDragStart={handleDragStart}
        aria-label={`Insert ${icon.name}`}
        style={style}
      >
        <img
          src={icon.dataUri}
          alt=""
          width={36}
          height={36}
          className={
            isDarkGlyph(icon.id)
              ? "aws-panel__icon-img aws-panel__icon-img--invert"
              : "aws-panel__icon-img"
          }
        />
        <span className="aws-panel__icon-name">{icon.name}</span>
      </button>
    );
  },
);

// ─── Main panel ──────────────────────────────────────────────────────────────
export const AwsIconPanel = () => {
  const excalidrawAPI = useExcalidrawAPI();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [activeSet, setActiveSet] = useState<IconSet>("services");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // pack de terceiros: carregado sob demanda para não inflar o bundle inicial
  const [techCategories, setTechCategories] = useState<AwsCategory[] | null>(
    null,
  );
  const gridRef = useRef<HTMLDivElement>(null);

  const isSearchingNow = search.trim().length > 0;

  useEffect(() => {
    if ((activeSet === "tech" || isSearchingNow) && techCategories === null) {
      import("../../data/techIcons").then((mod) => {
        setTechCategories(mod.TECH_CATEGORIES);
      });
    }
  }, [activeSet, isSearchingNow, techCategories]);

  const currentCategories = useMemo(() => {
    if (activeSet === "services") {
      return SERVICE_CATEGORIES;
    }
    if (activeSet === "resources") {
      return RESOURCE_CATEGORIES;
    }
    if (activeSet === "tech") {
      return techCategories ?? [];
    }
    return [];
  }, [activeSet, techCategories]);

  const displayIcons = useMemo(() => {
    const q = search.trim();
    if (q) {
      const techMatches = (techCategories ?? [])
        .flatMap((c) => c.icons)
        .filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
      return [...searchIcons(q), ...techMatches];
    }

    if (activeSet === "groups") {
      return GROUP_ICONS;
    }
    if (activeSet === "categories") {
      return CATEGORY_ICONS;
    }

    const cats = currentCategories;
    if (activeCategory) {
      return cats.find((c) => c.id === activeCategory)?.icons ?? [];
    }
    return cats.flatMap((c) => c.icons);
  }, [search, activeSet, activeCategory, currentCategories, techCategories]);

  // Insert icon into canvas
  const handleInsert = useCallback(
    async (icon: AwsIcon) => {
      if (!excalidrawAPI) {
        return;
      }

      const appState = excalidrawAPI.getAppState();
      const x =
        -appState.scrollX + appState.width / 2 / appState.zoom.value - 64;
      const y =
        -appState.scrollY + appState.height / 2 / appState.zoom.value - 64;

      const ts = Date.now();
      const fileId = `aws-${icon.id}-${ts}` as any;
      const imageElId = `img-${fileId}`;
      const textElId = `txt-${fileId}`;

      excalidrawAPI.addFiles([
        {
          id: fileId,
          dataURL: icon.dataUri as any,
          mimeType: "image/svg+xml",
          created: ts,
          lastRetrieved: ts,
        },
      ]);
      excalidrawAPI.updateScene({
        elements: [
          ...excalidrawAPI.getSceneElements(),
          {
            type: "image",
            id: imageElId,
            x,
            y,
            width: 128,
            height: 128,
            angle: 0,
            strokeColor: "transparent",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000),
            isDeleted: false,
            boundElements: null,
            updated: ts,
            link: null,
            locked: false,
            status: "saved",
            fileId,
            scale: [1, 1],
            crop: null,
          } as any,
          {
            type: "text",
            id: textElId,
            x,
            y: y + 134,
            width: 128,
            height: 18,
            angle: 0,
            strokeColor: "#1e1e1e",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000),
            isDeleted: false,
            boundElements: null,
            updated: ts,
            link: null,
            locked: false,
            text: icon.name,
            fontSize: 12,
            fontFamily: 3,
            textAlign: "center",
            verticalAlign: "top",
            autoResize: false,
            containerId: null,
            originalText: icon.name,
            lineHeight: 1.25,
          } as any,
        ],
      });
    },
    [excalidrawAPI],
  );

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 });
  }, [search, activeSet, activeCategory]);

  useEffect(() => {
    setActiveCategory(null);
  }, [activeSet]);

  const isSearching = search.trim().length > 0;

  return (
    <div className="aws-panel">
      {/* Header */}
      <div className="aws-panel__header">
        <div className="aws-panel__title-row">
          <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
            <rect width="60" height="60" rx="8" fill="#FF9900" />
            <path
              d="M14 38C14 38 20 44 30 44C40 44 46 38 46 38"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="20" cy="26" r="5" fill="white" />
            <circle cx="40" cy="26" r="5" fill="white" />
          </svg>
          <span className="aws-panel__title">{t("awsPanel.title")}</span>
          <span className="aws-panel__badge">
            {TOTAL_ICON_COUNT + TOTAL_TECH_ICON_COUNT}
          </span>
        </div>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("awsPanel.searchPlaceholder")}
      />

      {/* Icon set tabs */}
      <SetTabs
        active={activeSet}
        onSelect={setActiveSet}
        searching={isSearching}
        t={t as any}
      />

      {/* Category chips */}
      {!isSearching &&
        (activeSet === "services" ||
          activeSet === "resources" ||
          activeSet === "tech") && (
          <CategoryFilter
            categories={currentCategories}
            active={activeCategory}
            onSelect={setActiveCategory}
            t={t as any}
          />
        )}

      {/* Status bar */}
      <div className="aws-panel__status">
        {isSearching
          ? t("awsPanel.results").replace(
              "{{count}}",
              String(displayIcons.length),
            )
          : t("awsPanel.icons").replace(
              "{{count}}",
              String(displayIcons.length),
            )}
      </div>

      {/* Virtualized grid */}
      <div className="aws-panel__grid-wrap" ref={gridRef}>
        {displayIcons.length === 0 ? (
          <div className="aws-panel__empty">
            <span className="aws-panel__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M16 16L20 20"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <p>{t("awsPanel.noResults")}</p>
          </div>
        ) : (
          <VirtualGrid
            // remonta o grid a cada troca de lista: zera o estado interno de
            // scroll e elimina o card fantasma intermitente
            key={`${activeSet}|${activeCategory ?? ""}|${search.trim()}`}
            icons={displayIcons}
            onInsert={handleInsert}
            containerRef={gridRef}
          />
        )}
      </div>

      {/* Footer */}
      <div className="aws-panel__footer">{t("awsPanel.footer")}</div>
    </div>
  );
};
