import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import { AwsIconPanel } from "./AwsIconPanel/AwsIconPanel";

import "./AppSidebar.scss";

const AwsTabIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="AWS Icons"
  >
    <rect width="60" height="60" rx="10" fill="#FF9900" />
    <path
      d="M12 38C12 38 19 46 30 46C41 46 48 38 48 38"
      stroke="white"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <circle cx="20" cy="25" r="6" fill="white" />
    <circle cx="40" cy="25" r="6" fill="white" />
  </svg>
);

export const AppSidebar = () => {
  return (
    <DefaultSidebar docked={true}>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger tab="aws-icons" title="AWS Icons">
          <AwsTabIcon />
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>

      <Sidebar.Tab tab="aws-icons" style={{ padding: 0, overflow: "hidden" }}>
        <AwsIconPanel />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
