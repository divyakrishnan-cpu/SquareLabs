import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const COLUMNS = [
  { label: "Brand",         note: "SY India | SY UAE | Interior Co. | Square Connect | Urban Money", wch: 22 },
  { label: "Series",        note: "e.g. She Leads, Ghar Wapsi (leave blank if none)", wch: 22 },
  { label: "Title",         note: "Full content title", wch: 45 },
  { label: "Type",          note: "Reel | Carousel | Static | Story | YouTube Video | Short", wch: 20 },
  { label: "Category",      note: "Listing | Education | Brand | Testimonial | Festive | Market Update | Tips | Behind Scenes", wch: 22 },
  { label: "Platforms",     note: "Instagram, Facebook, LinkedIn, YouTube (comma-separated)", wch: 32 },
  { label: "Planned Date",  note: "YYYY-MM-DD  e.g. 2026-04-01", wch: 18 },
  { label: "Assignee Name", note: "Full name of person responsible", wch: 22 },
  { label: "Status",        note: "Planned | Script In Progress | Script Ready | Video Uploaded | Scheduled | Published | Delayed | Cancelled", wch: 22 },
  { label: "Hook / Caption",note: "Opening line or caption (optional)", wch: 40 },
  { label: "Notes",         note: "Internal notes (optional)", wch: 30 },
];

const SAMPLE_ROWS = [
  ["SY India",    "She Leads",      "She Leads — Priya Sharma: Agent to Director",         "Reel",          "Brand",        "Instagram, LinkedIn",          "2026-04-03", "Rahul V",  "Planned",            "From intern to closing ₹5Cr deals", ""],
  ["SY India",    "Market Mondays", "Market Mondays — Top Localities in Pune",              "Carousel",      "Market Update","Instagram, Facebook, YouTube", "2026-04-07", "Anjali T", "Script In Progress", "Which Pune area gives the best ROI?", ""],
  ["SY UAE",      "Dubai Decoded",  "Dubai Decoded — Why RAK is the New Investment Hub",   "Reel",          "Education",    "Instagram, YouTube",           "2026-04-10", "Sneha R",  "Planned",            "", ""],
  ["Interior Co.","",               "Top 5 Living Room Trends 2026",                        "Static",        "Tips",         "Instagram",                    "2026-04-12", "Namita A", "Planned",            "", "Interior redesign series"],
];

export async function GET() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Import Template
  const ws = XLSX.utils.aoa_to_sheet([
    COLUMNS.map(c => c.label),
    COLUMNS.map(c => c.note),
    ...SAMPLE_ROWS,
  ]);
  ws["!cols"] = COLUMNS.map(c => ({ wch: c.wch }));
  XLSX.utils.book_append_sheet(wb, ws, "Calendar Import");

  // Sheet 2: Valid Values Reference
  const refRows: string[][] = [
    ["Field", "Valid Values"],
    ["Brand", "SY India"], ["", "SY UAE"], ["", "Interior Co."], ["", "Square Connect"], ["", "Urban Money"],
    ["Type", "Reel"], ["", "Carousel"], ["", "Static"], ["", "Story"], ["", "YouTube Video"], ["", "Short"],
    ["Category", "Listing"], ["", "Education"], ["", "Brand"], ["", "Testimonial"], ["", "Festive"], ["", "Market Update"], ["", "Tips"], ["", "Behind Scenes"],
    ["Platforms", "Instagram"], ["", "Facebook"], ["", "LinkedIn"], ["", "YouTube"],
    ["Status", "Planned"], ["", "Script In Progress"], ["", "Script Ready"], ["", "Video Uploaded"],
    ["", "Scheduled"], ["", "Published"], ["", "Delayed"], ["", "Cancelled"],
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 18 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Valid Values");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="SquareLabs_Content_Calendar_Template.xlsx"',
    },
  });
}
