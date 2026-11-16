import type { OfficeKind } from "../documents";
import { makeSlide } from "../slidesModel";
import { makeWorksheet } from "../sheets/model";

interface OfficeTemplate {
  id: string;
  kind: OfficeKind;
  name: string;
  description: string;
  preview: string[];
  create: () => Record<string, unknown>;
}

function writer(lines: string[]) {
  return {
    body: {
      type: "doc",
      content: lines.map((text, index) => ({
        type: index === 0 ? "heading" : "paragraph",
        ...(index === 0 ? { attrs: { level: 1 } } : {}),
        content: text ? [{ type: "text", text }] : [],
      })),
    },
  };
}

function presentation(titles: string[]) {
  return {
    slides: titles.map((title) => {
      const slide = makeSlide("content");
      slide.elements[0].text = title;
      slide.elements[1].text = "Replace this sample content with your own.";
      return slide;
    }),
  };
}

function spreadsheet(name: string, rows: string[][]) {
  const sheet = makeWorksheet(name);
  rows.forEach((row, index) =>
    row.forEach((raw, column) => {
      const key = String.fromCharCode(65 + column) + (index + 1);
      sheet.cells[key] = {
        raw,
        ...(index === 0 ? { style: { bold: true, fill: "#dbeafe" } } : {}),
      };
    }),
  );
  sheet.widths = { 0: 200, 1: 160, 2: 160, 3: 160 };
  return { sheets: [sheet] };
}

export const officeTemplates: OfficeTemplate[] = [
  {
    id: "letter",
    kind: "writer",
    name: "Letter",
    description: "A personal or business letter with editable placeholders.",
    preview: [
      "Your name",
      "Recipient",
      "Dear recipient,",
      "Your message",
      "Kind regards",
    ],
    create: () =>
      writer([
        "Your name",
        "Your address · Email · Phone",
        "Date",
        "Recipient name and address",
        "Dear recipient,",
        "Write your message here.",
        "Kind regards,",
        "Your name",
      ]),
  },
  {
    id: "resume",
    kind: "writer",
    name: "Résumé",
    description: "A clear résumé with experience, education and skills.",
    preview: [
      "Your name",
      "Professional summary",
      "Experience",
      "Education",
      "Skills",
    ],
    create: () =>
      writer([
        "Your name",
        "Email · Phone · Portfolio",
        "Professional summary",
        "Describe your experience and goals.",
        "Experience",
        "Role · Company · Dates",
        "Describe an achievement.",
        "Education",
        "Qualification · Institution · Dates",
        "Skills",
        "List your relevant skills.",
      ]),
  },
  {
    id: "meeting-notes",
    kind: "writer",
    name: "Meeting notes",
    description: "Capture an agenda, decisions and action items.",
    preview: [
      "Meeting title",
      "Date and attendees",
      "Agenda",
      "Decisions",
      "Action items",
    ],
    create: () =>
      writer([
        "Meeting title",
        "Date: Add date",
        "Attendees: Add names",
        "Agenda",
        "Add discussion topics.",
        "Decisions",
        "Record agreed decisions.",
        "Action items",
        "Task · Owner · Due date",
      ]),
  },
  {
    id: "project-presentation",
    kind: "slides",
    name: "Project presentation",
    description: "Introduce a project, its approach and next steps.",
    preview: ["Project title", "The problem", "Our approach", "Next steps"],
    create: () =>
      presentation([
        "Project title",
        "The problem",
        "Our approach",
        "Next steps",
      ]),
  },
  {
    id: "status-update",
    kind: "slides",
    name: "Status update",
    description: "Share progress, risks and upcoming work.",
    preview: ["Status update", "Progress", "Risks", "Upcoming work"],
    create: () =>
      presentation(["Status update", "Progress", "Risks", "Upcoming work"]),
  },
  {
    id: "blank-presentation",
    kind: "slides",
    name: "Blank presentation",
    description: "A blank 16:9 canvas for your own layout.",
    preview: ["Blank slide", "16:9 canvas"],
    create: () => ({ slides: [makeSlide("blank")] }),
  },
  {
    id: "monthly-budget",
    kind: "sheets",
    name: "Monthly budget",
    description:
      "Compare sample income and expenses with a calculated balance.",
    preview: [
      "Category | Planned | Actual",
      "Income | 3000 | 3000",
      "Housing | 1000 | 1000",
      "Balance | calculated",
    ],
    create: () =>
      spreadsheet("Budget", [
        ["Category", "Planned", "Actual"],
        ["Income (sample)", "3000", "3000"],
        ["Housing (sample)", "1000", "1000"],
        ["Food (sample)", "400", "450"],
        ["Transport (sample)", "150", "120"],
        ["Total expenses", "=SUM(B3:B5)", "=SUM(C3:C5)"],
        ["Balance", "=B2-B6", "=C2-C6"],
      ]),
  },
  {
    id: "expense-tracker",
    kind: "sheets",
    name: "Expense tracker",
    description: "Record expenses and calculate their total.",
    preview: [
      "Date | Description | Amount",
      "Sample entry | 25",
      "Total | calculated",
    ],
    create: () =>
      spreadsheet("Expenses", [
        ["Date", "Description", "Amount"],
        ["2026-01-01", "Sample expense", "25"],
        ["2026-01-02", "Sample expense", "10"],
        ["", "Total", "=SUM(C2:C3)"],
      ]),
  },
  {
    id: "project-tracker",
    kind: "sheets",
    name: "Project tracker",
    description: "Track tasks, owners, status and completion.",
    preview: [
      "Task | Owner | Status | Complete",
      "Sample task | Your name | Active | 0",
      "Completion | calculated",
    ],
    create: () =>
      spreadsheet("Project", [
        ["Task", "Owner", "Status", "Complete (0 or 1)"],
        ["Sample task", "Your name", "Active", "0"],
        ["Sample finished task", "Your name", "Done", "1"],
        ["Completion ratio", "=AVERAGE(D2:D3)"],
      ]),
  },
];
