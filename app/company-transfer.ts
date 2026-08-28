import * as XLSX from "xlsx";

export type CompanyImportRow = {
  name: string;
  country: string;
  website: string;
  notes: string;
};

const TEMPLATE_HEADERS = ["Company Name", "Country", "Careers Page URL", "Notes"];

export function downloadCompanyTemplate() {
  const rows = [
    TEMPLATE_HEADERS,
    ["Muna Noor Manufacturing", "Oman", "https://www.munanoor.com/careers/", "Pipe manufacturer"],
    ["National Plastic Factory (NPF)", "Saudi Arabia", "", "Paste the direct careers page"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 32 }, { wch: 20 }, { wch: 52 }, { wch: 34 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Target Companies");
  XLSX.writeFile(workbook, "Smart_Job_Hunter_Companies_Template.xlsx");
}

export async function readCompanyWorkbook(file: File): Promise<CompanyImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The workbook does not contain a worksheet.");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
  const companies = rows.map(row => ({
    name: String(row["Company Name"] ?? row["Company"] ?? "").trim(),
    country: String(row["Country"] ?? "").trim(),
    website: String(row["Careers Page URL"] ?? row["Careers URL"] ?? row["Website"] ?? "").trim(),
    notes: String(row["Notes"] ?? "").trim(),
  })).filter(row => row.name);

  if (!companies.length) throw new Error("No companies were found. Use the provided Excel template and keep the Company Name header.");
  return companies;
}
