import type { WidgetDefinition } from "../types";
import { NoteContent } from "./NoteContent";
import "./StickyNoteWidget.css";

export const stickyNoteWidget: WidgetDefinition = {
  id: "note",
  size: "small",
  variant: "note",
  order: 45,
  render: (ctx) => <NoteContent ctx={ctx} />,
};
