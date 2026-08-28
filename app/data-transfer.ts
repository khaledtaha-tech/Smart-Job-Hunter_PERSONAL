export type TransferApplication = {
  id: string;
  title: string;
  company: string;
  country: string;
  status: string;
  date: string;
  followUp: string;
  link: string;
  notes: string;
};

export type TransferCompany = {
  id: string;
  name: string;
  country: string;
  website: string;
  notes: string;
  favorite: boolean;
};

export type TransferProfile = {
  id: string;
  name: string;
  field: string;
  jobs: string[];
  keywords: string[];
  countries: string[];
  sites: string[];
};

export type TransferSearchEntry = {
  id: string;
  query: string;
  date: string;
  sites: number;
};

export type TransferData = {
  applications: TransferApplication[];
  companies: TransferCompany[];
  profiles: TransferProfile[];
  searchHistory: TransferSearchEntry[];
};

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function applicationsToCsv(applications: TransferApplication[]): string {
  const headers = ["ID", "Role", "Company", "Country", "Status", "Application Date", "Follow Up", "Job Link", "Notes"];
  const rows = applications.map(item => [item.id, item.title, item.company, item.country, item.status, item.date, item.followUp, item.link, item.notes]);
  return `\uFEFF${[headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\r\n")}`;
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlRow(values: unknown[]): string {
  return `<Row>${values.map(value => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join("")}</Row>`;
}

function xmlSheet(name: string, headers: string[], rows: unknown[][]): string {
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${xmlRow(headers)}${rows.map(xmlRow).join("")}</Table></Worksheet>`;
}

export function dataToExcelXml(data: TransferData): string {
  const applicationRows = data.applications.map(item => [item.id, item.title, item.company, item.country, item.status, item.date, item.followUp, item.link, item.notes]);
  const companyRows = data.companies.map(item => [item.id, item.name, item.country, item.website, item.notes, item.favorite ? "1" : "0"]);
  const profileRows = data.profiles.map(item => [item.id, item.name, item.field, item.jobs.join(" | "), item.keywords.join(" | "), item.countries.join(" | "), item.sites.join(" | ")]);
  const historyRows = data.searchHistory.map(item => [item.id, item.query, item.date, item.sites]);

  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">${xmlSheet("Applications", ["ID", "Role", "Company", "Country", "Status", "Application Date", "Follow Up", "Job Link", "Notes"], applicationRows)}${xmlSheet("Companies", ["ID", "Name", "Country", "Website", "Notes", "Favorite"], companyRows)}${xmlSheet("Career Profiles", ["ID", "Name", "Field", "Jobs", "Keywords", "Countries", "Sites"], profileRows)}${xmlSheet("Search History", ["ID", "Query", "Date", "Sites"], historyRows)}</Workbook>`;
}

function splitList(value: string): string[] {
  return value.split("|").map(item => item.trim()).filter(Boolean);
}

function elementChildrenByName(parent: Element, localName: string): Element[] {
  return Array.from(parent.getElementsByTagName("*")).filter(element => element.localName === localName);
}

function worksheetName(element: Element): string {
  return element.getAttributeNS("urn:schemas-microsoft-com:office:spreadsheet", "Name") || element.getAttribute("ss:Name") || "";
}

function sheetRecords(documentNode: Document, name: string): Record<string, string>[] {
  const worksheet = elementChildrenByName(documentNode.documentElement, "Worksheet").find(item => worksheetName(item) === name);
  if (!worksheet) return [];
  const rows = elementChildrenByName(worksheet, "Row");
  if (rows.length < 2) return [];

  const rowValues = rows.map(row => elementChildrenByName(row, "Cell").map(cell => {
    const dataNode = elementChildrenByName(cell, "Data")[0];
    return dataNode?.textContent || "";
  }));
  const headers = rowValues[0];
  return rowValues.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

export function excelXmlToData(source: string): TransferData {
  const documentNode = new DOMParser().parseFromString(source, "application/xml");
  if (documentNode.querySelector("parsererror")) throw new Error("Invalid Excel XML file.");

  const applications = sheetRecords(documentNode, "Applications").map(row => ({
    id: row.ID || "",
    title: row.Role || "",
    company: row.Company || "",
    country: row.Country || "",
    status: row.Status || "new",
    date: row["Application Date"] || "",
    followUp: row["Follow Up"] || "",
    link: row["Job Link"] || "",
    notes: row.Notes || "",
  }));
  const companies = sheetRecords(documentNode, "Companies").map(row => ({
    id: row.ID || "",
    name: row.Name || "",
    country: row.Country || "",
    website: row.Website || "",
    notes: row.Notes || "",
    favorite: row.Favorite === "1" || row.Favorite.toLowerCase() === "true",
  }));
  const profiles = sheetRecords(documentNode, "Career Profiles").map(row => ({
    id: row.ID || "",
    name: row.Name || "",
    field: row.Field || "",
    jobs: splitList(row.Jobs || ""),
    keywords: splitList(row.Keywords || ""),
    countries: splitList(row.Countries || ""),
    sites: splitList(row.Sites || ""),
  }));
  const searchHistory = sheetRecords(documentNode, "Search History").map(row => ({
    id: row.ID || "",
    query: row.Query || "",
    date: row.Date || "",
    sites: Number(row.Sites || 0),
  }));

  return { applications, companies, profiles, searchHistory };
}
