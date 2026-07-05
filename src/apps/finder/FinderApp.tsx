import type { AppDefinition } from "../types";
import "./finder.css";
import { FinderContent } from "./FinderContent";
import { FinderFooter } from "./FinderFooter";
import { FinderToolbar } from "./FinderToolbar";
import { FinderIcon } from "./FinderIcon";

export const finderApp: AppDefinition = {
  id: "finder",
  name: "Finder",
  icon: <FinderIcon />,
  showOnDesktop: true,
  title: "Finder",
  defaultSize: { w: 1280, h: 760 },
  minSize: { w: 360, h: 360 },
  render: ({ data }) => <FinderContent data={data} />,
  renderToolbar: () => <FinderToolbar />,
  renderFooter: ({ data }) => <FinderFooter data={data} />,
};
