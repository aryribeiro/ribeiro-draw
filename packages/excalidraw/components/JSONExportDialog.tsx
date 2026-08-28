import React from "react";

import { MIME_TYPES } from "@excalidraw/common";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { actionSaveFileToDisk } from "../actions/actionExport";

import { fileSave } from "../data/filesystem";
import { exportToMxGraphXml } from "../data/mxgraphExport";
import { t } from "../i18n";

import { Card } from "./Card";
import { Dialog } from "./Dialog";
import { ToolButton } from "./ToolButton";
import { exportToFileIcon } from "./icons";

import "./ExportDialog.scss";

import type { ActionManager } from "../actions/manager";

import type { ExportOpts, BinaryFiles, UIAppState } from "../types";

export type ExportCB = (
  elements: readonly NonDeletedExcalidrawElement[],
  scale?: number,
) => void;

const saveAsMxGraph = async (
  elements: readonly NonDeletedExcalidrawElement[],
  files: BinaryFiles,
  name: string,
  extension: "drawio" | "xml",
) => {
  const xml = exportToMxGraphXml(elements, files, name);
  await fileSave(new Blob([xml], { type: MIME_TYPES[extension] }), {
    name,
    extension,
    description: "draw.io diagram",
  });
};

const JSONExportModal = ({
  elements,
  appState,
  setAppState,
  files,
  actionManager,
  exportOpts,
}: {
  appState: UIAppState;
  setAppState: React.Component<any, UIAppState>["setState"];
  files: BinaryFiles;
  elements: readonly NonDeletedExcalidrawElement[];
  actionManager: ActionManager;
  onCloseRequest: () => void;
  exportOpts: ExportOpts;
  canvas: HTMLCanvasElement;
}) => {
  const fileName = appState.name || "diagrama";
  return (
    <div className="ExportDialog ExportDialog--json">
      <div className="ExportDialog-cards">
        {exportOpts.saveFileToDisk && (
          <Card color="lime">
            <div className="Card-icon">{exportToFileIcon}</div>
            <h2>{t("exportDialog.disk_title")}</h2>
            <div className="Card-details">{t("exportDialog.disk_details")}</div>
            <ToolButton
              className="Card-button"
              type="button"
              title={t("exportDialog.disk_button")}
              aria-label={t("exportDialog.disk_button")}
              showAriaLabel={true}
              onClick={() => {
                actionManager.executeAction(actionSaveFileToDisk, "ui");
              }}
            />
          </Card>
        )}
        <Card color="primary">
          <div className="Card-icon">{exportToFileIcon}</div>
          <h2>{t("exportDialog.drawio_title")}</h2>
          <div className="Card-details">{t("exportDialog.drawio_details")}</div>
          <ToolButton
            className="Card-button"
            type="button"
            title={t("exportDialog.drawio_button")}
            aria-label={t("exportDialog.drawio_button")}
            showAriaLabel={true}
            onClick={async () => {
              try {
                await saveAsMxGraph(elements, files, fileName, "drawio");
              } catch (error: any) {
                if (error?.name !== "AbortError") {
                  setAppState({ errorMessage: error.message });
                }
              }
            }}
          />
        </Card>
        <Card color="pink">
          <div className="Card-icon">{exportToFileIcon}</div>
          <h2>{t("exportDialog.xml_title")}</h2>
          <div className="Card-details">{t("exportDialog.xml_details")}</div>
          <ToolButton
            className="Card-button"
            type="button"
            title={t("exportDialog.xml_button")}
            aria-label={t("exportDialog.xml_button")}
            showAriaLabel={true}
            onClick={async () => {
              try {
                await saveAsMxGraph(elements, files, fileName, "xml");
              } catch (error: any) {
                if (error?.name !== "AbortError") {
                  setAppState({ errorMessage: error.message });
                }
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export const JSONExportDialog = ({
  elements,
  appState,
  files,
  actionManager,
  exportOpts,
  canvas,
  setAppState,
}: {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: UIAppState;
  files: BinaryFiles;
  actionManager: ActionManager;
  exportOpts: ExportOpts;
  canvas: HTMLCanvasElement;
  setAppState: React.Component<any, UIAppState>["setState"];
}) => {
  const handleClose = React.useCallback(() => {
    setAppState({ openDialog: null });
  }, [setAppState]);

  return (
    <>
      {appState.openDialog?.name === "jsonExport" && (
        <Dialog onCloseRequest={handleClose} title={t("buttons.export")}>
          <JSONExportModal
            elements={elements}
            appState={appState}
            setAppState={setAppState}
            files={files}
            actionManager={actionManager}
            onCloseRequest={handleClose}
            exportOpts={exportOpts}
            canvas={canvas}
          />
        </Dialog>
      )}
    </>
  );
};
