import type { AppDefinition } from "../types";
import { FinderContent } from "./Content";
import { FinderFooter } from "./Footer";
import { FinderIcon } from "./Icon";
import { FinderToolbar } from "./Toolbar";

import "./style.css";

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
