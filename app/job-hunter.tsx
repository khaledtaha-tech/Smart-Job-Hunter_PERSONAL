"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, BriefcaseBusiness, Building2, Check, ChevronDown, CircleUserRound,
  Clock3, Crown, Download, ExternalLink, FileClock, Globe2, History, Lock,
  LayoutDashboard, Menu, Moon, Pencil, Plus, Search, Settings,
  Sparkles, Sun, Target, Trash2, Upload, UsersRound, X,
} from "lucide-react";
import { applicationsToCsv, dataToExcelXml, excelXmlToData } from "./data-transfer";
import { downloadCompanyTemplate, readCompanyWorkbook } from "./company-transfer";
import { EditionConfig, formatLimit, getTierPolicy, hasReachedLimit, nextTierLabel, tierLabel } from "./tier-policy";

type Page = "dashboard" | "search" | "applications" | "companies" | "history" | "settings";
type Status = "new" | "interested" | "applied" | "interview" | "offer" | "rejected";
type Mode = "plastics" | "general";
type Language = "en" | "ar";
type ServerStatus = "checking" | "offline" | "login" | "online";
type ServerUser = { id: number; fullName: string; email: string };

declare global { interface Window { __SJH_EDITION__?: EditionConfig } }

type Application = {
  id: string; title: string; company: string; country: string; status: Status;
  date: string; followUp: string; link: string; notes: string;
};
type Company = { id: string; name: string; country: string; website: string; notes: string; favorite: boolean };
type SearchEntry = { id: string; query: string; date: string; sites: number };
type Profile = { id: string; name: string; field: string; jobs: string[]; keywords: string[]; countries: string[]; sites: string[] };
type StoredData = { applications?: unknown[]; companies?: unknown[]; searchHistory?: unknown[]; profiles?: unknown[]; language?: Language; dark?: boolean; mode?: Mode };

const today = () => new Date().toISOString().slice(0, 10);
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ALL_STATUSES: Status[] = ["new", "interested", "applied", "interview", "offer", "rejected"];
const BASIC_STATUSES: Status[] = ["new", "applied", "rejected"];

const PLASTIC_JOBS = ["Production Manager", "Factory Manager", "Plant Manager", "Operations Manager", "Manufacturing Manager", "Extrusion Manager", "Technical Manager", "Process Manager", "Production Superintendent", "Head of Production"];
const PLASTIC_KEYWORDS = ["Plastic Manufacturing", "Pipe Extrusion", "HDPE", "PVC", "uPVC", "CPVC", "PPR", "PE100", "DWC", "Telecom Duct", "Injection Molding", "Blown Film", "Flexible Packaging", "Lean Manufacturing"];
const COUNTRIES = ["Saudi Arabia", "UAE", "Qatar", "Kuwait", "Oman", "Bahrain", "Egypt", "Angola", "DR Congo", "Kenya", "Tanzania", "Ethiopia", "Nigeria", "Ghana", "Zambia", "South Africa", "Germany", "Netherlands", "Poland", "Romania", "Portugal", "Italy", "Spain", "United Kingdom", "Malaysia", "Indonesia", "Turkey", "India"];
const FIELDS: Record<string, { jobs: string[]; keywords: string[] }> = {
  "Engineering & Manufacturing": { jobs: ["Production Manager", "Plant Manager", "Operations Manager", "Manufacturing Engineer", "Quality Manager", "Maintenance Manager"], keywords: ["Manufacturing", "Production", "Lean Manufacturing", "Industrial", "Factory", "Operations"] },
  "Information Technology": { jobs: ["Software Engineer", "Frontend Developer", "Backend Developer", "IT Manager", "Data Analyst", "Cybersecurity Specialist"], keywords: ["Software", "SaaS", "Cloud", "Web Development", "Data", "Cybersecurity"] },
  "Sales & Business": { jobs: ["Sales Manager", "Business Development Manager", "Account Manager", "Sales Executive", "Regional Manager"], keywords: ["B2B", "Business Development", "Sales", "Key Accounts", "Commercial"] },
  "Finance & Accounting": { jobs: ["Finance Manager", "Accountant", "Financial Analyst", "Cost Controller", "Internal Auditor"], keywords: ["Finance", "Accounting", "Audit", "FP&A", "Cost Control"] },
  "Human Resources": { jobs: ["HR Manager", "HR Business Partner", "Talent Acquisition Specialist", "Recruiter", "HR Officer"], keywords: ["Human Resources", "Recruitment", "Talent Acquisition", "People Operations"] },
  "Marketing": { jobs: ["Marketing Manager", "Digital Marketing Specialist", "Brand Manager", "Content Manager", "SEO Specialist"], keywords: ["Marketing", "Digital Marketing", "Brand", "SEO", "Content"] },
  "Construction": { jobs: ["Project Manager", "Construction Manager", "Site Engineer", "Civil Engineer", "MEP Manager"], keywords: ["Construction", "Infrastructure", "Civil", "MEP", "Project Management"] },
  "Logistics & Supply Chain": { jobs: ["Supply Chain Manager", "Logistics Manager", "Procurement Manager", "Warehouse Manager", "Demand Planner"], keywords: ["Supply Chain", "Logistics", "Procurement", "Warehouse", "Planning"] },
  "Healthcare": { jobs: ["Medical Representative", "Nurse", "Pharmacist", "Hospital Administrator", "Quality Specialist"], keywords: ["Healthcare", "Hospital", "Medical", "Pharmaceutical", "Clinical"] },
  "Education": { jobs: ["Teacher", "Academic Coordinator", "School Principal", "Lecturer", "Training Manager"], keywords: ["Education", "School", "Academic", "Teaching", "Training"] },
  "Custom / Other": { jobs: [], keywords: [] },
};
const AR_FIELD_LABELS: Record<string, string> = {
  "Engineering & Manufacturing": "الهندسة والتصنيع",
  "Information Technology": "تقنية المعلومات",
  "Sales & Business": "المبيعات والأعمال",
  "Finance & Accounting": "المالية والمحاسبة",
  "Human Resources": "الموارد البشرية",
  "Marketing": "التسويق",
  "Construction": "الإنشاءات",
  "Logistics & Supply Chain": "الخدمات اللوجستية وسلسلة الإمداد",
  "Healthcare": "الرعاية الصحية",
  "Education": "التعليم",
  "Custom / Other": "مجال آخر",
};
const AR_JOB_LABELS: Record<string, string> = {
  "Production Manager": "مدير إنتاج",
  "Plant Manager": "مدير مصنع",
  "Operations Manager": "مدير عمليات",
  "Manufacturing Engineer": "مهندس تصنيع",
  "Quality Manager": "مدير جودة",
  "Maintenance Manager": "مدير صيانة",
  "Software Engineer": "مهندس برمجيات",
  "Frontend Developer": "مطور واجهات أمامية",
  "Backend Developer": "مطور خلفي",
  "IT Manager": "مدير تقنية معلومات",
  "Data Analyst": "محلل بيانات",
  "Cybersecurity Specialist": "أخصائي أمن سيبراني",
  "Sales Manager": "مدير مبيعات",
  "Business Development Manager": "مدير تطوير أعمال",
  "Account Manager": "مدير حسابات",
  "Sales Executive": "تنفيذي مبيعات",
  "Regional Manager": "مدير إقليمي",
  "Finance Manager": "مدير مالي",
  "Accountant": "محاسب",
  "Financial Analyst": "محلل مالي",
  "Cost Controller": "مراقب تكاليف",
  "Internal Auditor": "مدقق داخلي",
  "HR Manager": "مدير موارد بشرية",
  "HR Business Partner": "شريك أعمال موارد بشرية",
  "Talent Acquisition Specialist": "أخصائي استقطاب مواهب",
  "Recruiter": "أخصائي توظيف",
  "HR Officer": "مسؤول موارد بشرية",
  "Marketing Manager": "مدير تسويق",
  "Digital Marketing Specialist": "أخصائي تسويق رقمي",
  "Brand Manager": "مدير علامة تجارية",
  "Content Manager": "مدير محتوى",
  "SEO Specialist": "أخصائي تحسين محركات البحث",
  "Project Manager": "مدير مشروع",
  "Construction Manager": "مدير إنشاءات",
  "Site Engineer": "مهندس موقع",
  "Civil Engineer": "مهندس مدني",
  "MEP Manager": "مدير أعمال ميكانيكية وكهربائية",
  "Supply Chain Manager": "مدير سلسلة الإمداد",
  "Logistics Manager": "مدير لوجستيات",
  "Procurement Manager": "مدير مشتريات",
  "Warehouse Manager": "مدير مستودع",
  "Demand Planner": "مخطط طلب",
  "Medical Representative": "مندوب طبي",
  "Nurse": "ممرض",
  "Pharmacist": "صيدلي",
  "Hospital Administrator": "مدير مستشفى",
  "Quality Specialist": "أخصائي جودة",
  "Teacher": "معلم",
  "Academic Coordinator": "منسق أكاديمي",
  "School Principal": "مدير مدرسة",
  "Lecturer": "محاضر",
  "Training Manager": "مدير تدريب",
};
const AR_KEYWORD_LABELS: Record<string, string> = {
  "Manufacturing": "التصنيع", "Production": "الإنتاج", "Lean Manufacturing": "التصنيع الرشيق", "Industrial": "الصناعة", "Factory": "المصنع", "Operations": "العمليات",
  "Software": "البرمجيات", "SaaS": "البرمجيات كخدمة", "Cloud": "الحوسبة السحابية", "Web Development": "تطوير الويب", "Data": "البيانات", "Cybersecurity": "الأمن السيبراني",
  "B2B": "مبيعات الشركات", "Business Development": "تطوير الأعمال", "Sales": "المبيعات", "Key Accounts": "الحسابات الرئيسية", "Commercial": "تجاري",
  "Finance": "المالية", "Accounting": "المحاسبة", "Audit": "التدقيق", "FP&A": "التخطيط والتحليل المالي", "Cost Control": "مراقبة التكاليف",
  "Human Resources": "الموارد البشرية", "Recruitment": "التوظيف", "Talent Acquisition": "استقطاب المواهب", "People Operations": "عمليات الموارد البشرية",
  "Marketing": "التسويق", "Digital Marketing": "التسويق الرقمي", "Brand": "العلامة التجارية", "SEO": "تحسين محركات البحث", "Content": "المحتوى",
  "Construction": "الإنشاءات", "Infrastructure": "البنية التحتية", "Civil": "مدني", "MEP": "ميكانيكا وكهرباء", "Project Management": "إدارة المشاريع",
  "Supply Chain": "سلسلة الإمداد", "Logistics": "الخدمات اللوجستية", "Procurement": "المشتريات", "Warehouse": "المستودعات", "Planning": "التخطيط",
  "Healthcare": "الرعاية الصحية", "Hospital": "المستشفى", "Medical": "طبي", "Pharmaceutical": "الأدوية", "Clinical": "سريري",
  "Education": "التعليم", "School": "المدارس", "Academic": "أكاديمي", "Teaching": "التدريس", "Training": "التدريب",
};
const DEMO_APPLICATIONS: Application[] = [
  { id: "demo-1", title: "Operations Manager", company: "Amazon", country: "UAE", status: "applied", date: "2026-08-31", followUp: "2026-09-05", link: "https://www.amazon.jobs/", notes: "Commercial demo data" },
  { id: "demo-2", title: "Supply Chain Manager", company: "DHL", country: "Saudi Arabia", status: "interview", date: "2026-08-30", followUp: "2026-09-03", link: "https://careers.dhl.com/", notes: "Commercial demo data" },
  { id: "demo-3", title: "Project Manager", company: "Siemens", country: "Qatar", status: "offer", date: "2026-08-29", followUp: "", link: "https://jobs.siemens.com/careers", notes: "Commercial demo data" },
  { id: "demo-4", title: "Marketing Manager", company: "Unilever", country: "Saudi Arabia", status: "interested", date: "2026-08-28", followUp: "2026-09-06", link: "https://careers.unilever.com/", notes: "Commercial demo data" },
  { id: "demo-5", title: "Financial Analyst", company: "PwC", country: "UAE", status: "new", date: "2026-08-27", followUp: "", link: "https://www.pwc.com/gx/en/careers.html", notes: "Commercial demo data" },
  { id: "demo-6", title: "HR Business Partner", company: "Nestle", country: "UAE", status: "rejected", date: "2026-08-25", followUp: "", link: "https://www.nestle.com/jobs", notes: "Commercial demo data" },
  { id: "demo-7", title: "Training Manager", company: "Marriott International", country: "Saudi Arabia", status: "applied", date: "2026-08-24", followUp: "2026-09-04", link: "https://careers.marriott.com/", notes: "Commercial demo data" },
  { id: "demo-8", title: "IT Manager", company: "Microsoft", country: "Saudi Arabia", status: "interview", date: "2026-08-23", followUp: "2026-09-02", link: "https://careers.microsoft.com/", notes: "Commercial demo data" },
];
const IS_DEMO = typeof window !== "undefined" && Boolean((window.__SJH_EDITION__ as any)?.demo);

const SEARCH_SITES = [
  { id: "google", name: "Google Jobs", prefix: "" },
  { id: "linkedin", name: "LinkedIn", prefix: "site:linkedin.com/jobs/view " },
  { id: "indeed", name: "Indeed", prefix: "site:indeed.com " },
  { id: "bayt", name: "Bayt", prefix: "site:bayt.com " },
  { id: "gulftalent", name: "GulfTalent", prefix: "site:gulftalent.com " },
  { id: "naukrigulf", name: "NaukriGulf", prefix: "site:naukrigulf.com " },
  { id: "glassdoor", name: "Glassdoor", prefix: "site:glassdoor.com/Job " },
  { id: "jooble", name: "Jooble", prefix: "site:jooble.org " },
  { id: "tanqeeb", name: "Tanqeeb", prefix: "site:tanqeeb.com " },
  { id: "wuzzuf", name: "Wuzzuf", prefix: "site:wuzzuf.net/jobs " },
  { id: "ziprecruiter", name: "ZipRecruiter", prefix: "site:ziprecruiter.com/jobs " },
  { id: "careers", name: "Company Careers", prefix: "inurl:careers " },
];
const DEFAULT_COMPANIES: Company[] = [
  { id: "c1", name: "National Plastic Factory (NPF)", country: "Saudi Arabia", website: "https://npfco.com.sa/%D8%A7%D9%84%D8%AA%D9%88%D8%B8%D9%8A%D9%81/", notes: "Direct careers page", favorite: true },
  { id: "c2", name: "Neproplast", country: "Saudi Arabia", website: "https://neproplast.com/careers/", notes: "Careers portal", favorite: true },
  { id: "c3", name: "Muna Noor Manufacturing", country: "Oman", website: "https://www.munanoor.com/careers/", notes: "Direct careers page", favorite: true },
  { id: "c4", name: "Al Sulaiteen Group", country: "Qatar", website: "https://alsulaiteengroup.com/", notes: "Target company", favorite: false },
];
const DEFAULT_EDITION: EditionConfig = { edition: "personal", tier: "premium", showPlastics: true, defaultMode: "plastics", auth: false, displayName: "Khaled Taha", buyUrl: "" };
const EDITION: EditionConfig = typeof window === "undefined" ? DEFAULT_EDITION : { ...DEFAULT_EDITION, ...(window.__SJH_EDITION__ || {}) };
const POLICY = getTierPolicy(EDITION);
const INITIAL_COMPANIES = EDITION.showPlastics ? DEFAULT_COMPANIES : [];
const safeMode = (value?: Mode): Mode => value === "plastics" && !EDITION.showPlastics ? "general" : (value || EDITION.defaultMode);

const EN = {
  dashboard: "Dashboard", search: "Job Search", applications: "Applications", companies: "Companies", history: "Search History", settings: "Settings",
  subtitle: "Your focused job-search workspace", plastics: "My Plastics Profile", general: "All Career Fields", add: "Add application", run: "Run search", saveProfile: "Save profile", resetSearch: "Reset Search",
  welcome: "Good morning", welcomeSub: "Here is where your job search stands today.", total: "Total applications", interviews: "Interviews", offers: "Offers", followups: "Follow-ups due", profiles: "Career profiles",
  pipeline: "Application pipeline", recent: "Recent applications", noApps: "No applications yet", noAppsSub: "Save the first opportunity you find and track it here.", openSearch: "Start focused search",
  field: "Career field", titles: "Job titles", keywords: "Industry keywords", countries: "Target countries", sources: "Search sources", period: "Date posted", preview: "Search preview",
  appTitle: "Applications tracker", appSub: "Keep every opportunity, deadline, and next step in one place.", all: "All", new: "New", interested: "Interested", applied: "Applied", interview: "Interview", offer: "Offer", rejected: "Rejected",
  company: "Company", role: "Role", country: "Country", date: "Date", status: "Status", actions: "Actions", followUp: "Follow-up", notes: "Notes", link: "Job link",
  targetCompanies: "Target companies", companySub: "Build a focused list of employers worth checking directly.", addCompany: "Add company", visit: "Visit Careers Page", downloadCompaniesTemplate: "Download Template", importCompanies: "Import Excel", careersPage: "Careers Page URL",
  settingsTitle: "Product settings", appearance: "Appearance", language: "Language", data: "Data & transfer", export: "Export", import: "Import", reset: "Reset all data",
  light: "Light", dark: "Dark", english: "English", arabic: "العربية", emptyHistory: "No searches yet", searches: "searches", profileName: "Profile name", save: "Save", cancel: "Cancel", delete: "Delete",
};
const AR: typeof EN = {
  dashboard: "لوحة المتابعة", search: "البحث عن وظائف", applications: "طلبات التوظيف", companies: "الشركات", history: "سجل البحث", settings: "الإعدادات",
  subtitle: "مساحة منظمة للبحث عن الوظائف", plastics: "مجالي: البلاستيك", general: "كل المجالات", add: "إضافة وظيفة", run: "تشغيل البحث", saveProfile: "حفظ الإعداد", resetSearch: "إعادة ضبط البحث",
  welcome: "صباح الخير", welcomeSub: "هذا ملخص رحلة البحث عن الوظيفة اليوم.", total: "إجمالي الطلبات", interviews: "المقابلات", offers: "العروض", followups: "متابعات مستحقة", profiles: "الملفات المهنية",
  pipeline: "مراحل التقديم", recent: "أحدث الطلبات", noApps: "لا توجد طلبات حتى الآن", noAppsSub: "احفظ أول فرصة مناسبة وتابعها من هنا.", openSearch: "ابدأ بحثًا مركزًا",
  field: "المجال الوظيفي", titles: "المسميات الوظيفية", keywords: "كلمات المجال", countries: "الدول المستهدفة", sources: "مصادر البحث", period: "تاريخ النشر", preview: "معاينة البحث",
  appTitle: "متابعة طلبات التوظيف", appSub: "اجمع كل فرصة وموعد وخطوة تالية في مكان واحد.", all: "الكل", new: "جديدة", interested: "مهتم", applied: "تم التقديم", interview: "مقابلة", offer: "عرض", rejected: "مرفوضة",
  company: "الشركة", role: "الوظيفة", country: "الدولة", date: "التاريخ", status: "الحالة", actions: "إجراءات", followUp: "المتابعة", notes: "ملاحظات", link: "رابط الوظيفة",
  targetCompanies: "الشركات المستهدفة", companySub: "كوّن قائمة بالشركات التي تستحق المتابعة المباشرة.", addCompany: "إضافة شركة", visit: "فتح صفحة التوظيف", downloadCompaniesTemplate: "تحميل النموذج", importCompanies: "استيراد Excel", careersPage: "رابط صفحة التوظيف",
  settingsTitle: "إعدادات التطبيق", appearance: "المظهر", language: "اللغة", data: "البيانات والنقل", export: "تصدير", import: "استيراد", reset: "مسح كل البيانات",
  light: "فاتح", dark: "داكن", english: "English", arabic: "العربية", emptyHistory: "لا يوجد بحث سابق", searches: "عمليات بحث", profileName: "اسم الإعداد", save: "حفظ", cancel: "إلغاء", delete: "حذف",
};

function quote(value: string) { return value.includes(" ") ? `"${value}"` : value; }
function orGroup(values: string[]) { return values.length === 1 ? quote(values[0]) : `(${values.map(quote).join(" OR ")})`; }
function normalizeStatus(value: unknown): Status {
  if (value === "saved") return "new";
  return ALL_STATUSES.includes(value as Status) ? value as Status : "new";
}
function normalizeApplication(value: any): Application {
  return {
    id: String(value?.id || makeId()), title: String(value?.title || ""), company: String(value?.company || ""), country: String(value?.country || ""), status: normalizeStatus(value?.status),
    date: String(value?.date || today()), followUp: String(value?.followUp || ""), link: String(value?.link || ""), notes: String(value?.notes || ""),
  };
}
function normalizeCompany(value: any): Company { return { id: String(value?.id || makeId()), name: String(value?.name || ""), country: String(value?.country || ""), website: String(value?.website || ""), notes: String(value?.notes || ""), favorite: Boolean(value?.favorite) }; }
function normalizeProfile(value: any): Profile { return { id: String(value?.id || makeId()), name: String(value?.name || ""), field: String(value?.field || "Custom / Other"), jobs: Array.isArray(value?.jobs) ? value.jobs.map(String) : [], keywords: Array.isArray(value?.keywords) ? value.keywords.map(String) : [], countries: Array.isArray(value?.countries) ? value.countries.map(String) : [], sites: Array.isArray(value?.sites) ? value.sites.map(String) : [] }; }
function normalizeSearchEntry(value: any): SearchEntry { return { id: String(value?.id || makeId()), query: String(value?.query || ""), date: String(value?.date || new Date().toISOString()), sites: Number(value?.sites || 0) }; }
function downloadText(filename: string, content: string, type: string) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

export default function JobHunter() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mode, setMode] = useState<Mode>(EDITION.defaultMode);
  const [language, setLanguage] = useState<Language>("en");
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [applications, setApplications] = useState<Application[]>(IS_DEMO ? DEMO_APPLICATIONS : []);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [searchHistory, setSearchHistory] = useState<SearchEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [field, setField] = useState("Engineering & Manufacturing");
  const [jobs, setJobs] = useState<string[]>(EDITION.showPlastics ? PLASTIC_JOBS.slice(0, 5) : FIELDS["Engineering & Manufacturing"].jobs.slice(0, 3));
  const [keywords, setKeywords] = useState<string[]>(EDITION.showPlastics ? ["Plastic Manufacturing", "Pipe Extrusion", "HDPE", "PVC"] : FIELDS["Engineering & Manufacturing"].keywords.slice(0, 3));
  const [countries, setCountries] = useState<string[]>(["Saudi Arabia", "UAE", "Qatar", "Oman"]);
  const [sites, setSites] = useState<string[]>(["google", "linkedin", "indeed"]);
  const [period, setPeriod] = useState("w");
  const [appModal, setAppModal] = useState(false);
  const [companyModal, setCompanyModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [serverStatus, setServerStatus] = useState<ServerStatus>(EDITION.auth ? "checking" : "offline");
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const excelImportRef = useRef<HTMLInputElement>(null);
  const companyImportRef = useRef<HTMLInputElement>(null);
  const backupImportRef = useRef<HTMLInputElement>(null);
  const t = language === "ar" ? AR : EN;
  const displayName = serverUser?.fullName || EDITION.displayName || "Job Seeker";
  const firstName = displayName.split(/\s+/)[0] || "User";
  const planName = tierLabel(EDITION);
  const allowedStatuses = POLICY.advancedTracker ? ALL_STATUSES : BASIC_STATUSES;
  const allowedSiteCount = POLICY.maxSearchSites ?? SEARCH_SITES.length;

  const applyStoredData = (saved: StoredData | null | undefined) => {
    if (!saved) return;
    const normalizedApplications = Array.isArray(saved.applications) && saved.applications.length ? saved.applications.map(normalizeApplication) : (IS_DEMO ? DEMO_APPLICATIONS : []);
    const normalizedCompanies = Array.isArray(saved.companies) ? saved.companies.map(normalizeCompany) : INITIAL_COMPANIES;
    const normalizedHistory = Array.isArray(saved.searchHistory) ? saved.searchHistory.map(normalizeSearchEntry) : [];
    const normalizedProfiles = Array.isArray(saved.profiles) ? saved.profiles.map(normalizeProfile) : [];
    const nextApplications = normalizedApplications
      .map(item => ({ ...item, status: allowedStatuses.includes(item.status) ? item.status : "new" as Status, followUp: POLICY.followUps ? item.followUp : "" }))
      .slice(0, POLICY.maxApplications ?? normalizedApplications.length);
    const nextProfiles = normalizedProfiles
      .map(item => ({ ...item, sites: item.sites.filter(id => SEARCH_SITES.slice(0, allowedSiteCount).some(source => source.id === id)) }))
      .slice(0, POLICY.maxProfiles ?? normalizedProfiles.length);
    setApplications(nextApplications);
    setCompanies(POLICY.targetCompanies ? normalizedCompanies : []);
    setSearchHistory(normalizedHistory);
    setProfiles(nextProfiles);
    setLanguage(saved.language || "en");
    setDark(Boolean(saved.dark));
    setMode(safeMode(saved.mode));
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`smartJobHunterData-${EDITION.edition}-${EDITION.tier}`);
      if (raw) applyStoredData(JSON.parse(raw));
    } catch { /* keep safe defaults */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!EDITION.auth) { setServerLoaded(true); return; }
    fetch("./api.php?action=session", { credentials: "include" })
      .then(async response => {
        const type = response.headers.get("content-type") || "";
        if (!response.ok || !type.includes("application/json")) throw new Error("Local mode");
        const result = await response.json();
        if (!result.installed) { window.location.href = "./install.php"; return; }
        if (!result.authenticated) { setServerStatus("login"); return; }
        setServerUser(result.user); setServerStatus("online");
        const dataResponse = await fetch("./api.php?action=load", { credentials: "include" });
        const saved = await dataResponse.json();
        if (saved.data) applyStoredData(saved.data);
        setServerLoaded(true);
      })
      .catch(() => { setServerStatus("offline"); setServerLoaded(true); });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(`smartJobHunterData-${EDITION.edition}-${EDITION.tier}`, JSON.stringify({ applications, companies, searchHistory, profiles, language, dark, mode }));
  }, [applications, companies, searchHistory, profiles, language, dark, mode, hydrated]);

  useEffect(() => {
    if (serverStatus !== "online" || !serverLoaded) return;
    const timer = window.setTimeout(() => {
      fetch("./api.php?action=save", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications, companies, searchHistory, profiles, language, dark, mode }),
      }).then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          console.warn(result.message || "Server rejected the saved data.");
        }
      }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [applications, companies, searchHistory, profiles, language, dark, mode, serverStatus, serverLoaded]);

  const query = useMemo(() => {
    if (!jobs.length || !keywords.length || !countries.length) return "";
    return `${orGroup(jobs.slice(0, 8))} ${orGroup(keywords.slice(0, 10))} ${orGroup(countries.slice(0, 10))} -course -training`;
  }, [jobs, keywords, countries]);
  const counts = useMemo(() => ({
    total: applications.length,
    new: applications.filter(a => a.status === "new").length,
    applied: applications.filter(a => a.status === "applied").length,
    interview: applications.filter(a => a.status === "interview").length,
    offer: applications.filter(a => a.status === "offer").length,
  }), [applications]);
  const dueFollowUps = useMemo(() => POLICY.followUps ? applications.filter(a => a.followUp && a.followUp <= today() && !["offer", "rejected"].includes(a.status)) : [], [applications]);
  const filteredApps = applications.filter(a => (statusFilter === "all" || a.status === statusFilter) && `${a.title} ${a.company} ${a.country}`.toLowerCase().includes(searchText.toLowerCase()));

  const showUpgrade = (message = "This feature is not included in your current plan.") => {
    if (EDITION.edition === "personal" || EDITION.tier === "premium") return;
    const upgradeTarget = nextTierLabel(EDITION);
    if (EDITION.buyUrl && !EDITION.buyUrl.includes("UPGRADE_URL_HERE")) {
      if (confirm(`${message}\n\nUpgrade to ${upgradeTarget}?`)) window.open(EDITION.buyUrl, "_blank", "noopener,noreferrer");
    } else alert(`${message}\n\nUpgrade to ${upgradeTarget} to unlock this feature.`);
  };
  const switchMode = (next: Mode) => {
    if (next === "plastics" && !EDITION.showPlastics) return;
    setMode(next); setPage("search");
    if (next === "plastics") { setJobs(PLASTIC_JOBS.slice(0, 5)); setKeywords(["Plastic Manufacturing", "Pipe Extrusion", "HDPE", "PVC"]); }
    else { const current = FIELDS[field] || FIELDS["Custom / Other"]; setJobs(current.jobs.slice(0, 3)); setKeywords(current.keywords.slice(0, 3)); }
  };
  const navigate = (next: Page) => { setPage(next); setMobileOpen(false); setAlertsOpen(false); };
  const toggle = (value: string, values: string[], setter: (v: string[]) => void) => setter(values.includes(value) ? values.filter(v => v !== value) : [...values, value]);

  const runSearch = () => {
    if (!query || !sites.length) return alert("Select at least one title, keyword, country and source.");
    const allowedSites = sites.filter(id => SEARCH_SITES.slice(0, allowedSiteCount).some(source => source.id === id));
    setSearchHistory(h => [{ id: makeId(), query, date: new Date().toISOString(), sites: allowedSites.length }, ...h].slice(0, 100));
    allowedSites.forEach(id => {
      const source = SEARCH_SITES.find(s => s.id === id); if (!source) return;
      const tbs = period === "all" ? "" : `&tbs=qdr:${period}`;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(source.prefix + query)}${tbs}`, "_blank", "noopener,noreferrer");
    });
  };

  const saveApplication = (form: FormData) => {
    const requestedStatus = normalizeStatus(form.get("status"));
    const status = allowedStatuses.includes(requestedStatus) ? requestedStatus : "new";
    const record: Application = {
      id: editingApp?.id || makeId(), title: String(form.get("title") || ""), company: String(form.get("company") || ""),
      country: String(form.get("country") || ""), status,
      date: String(form.get("date") || today()), followUp: POLICY.followUps ? String(form.get("followUp") || "") : "", link: String(form.get("link") || ""), notes: String(form.get("notes") || ""),
    };
    setApplications(list => editingApp ? list.map(a => a.id === editingApp.id ? record : a) : [record, ...list]);
    setEditingApp(null); setAppModal(false);
  };
  const openApplication = (app: Application | null = null) => {
    if (!app && hasReachedLimit(applications.length, POLICY.maxApplications)) return showUpgrade(`Your ${planName} plan allows up to ${formatLimit(POLICY.maxApplications)} applications.`);
    setEditingApp(app); setAppModal(true);
  };
  const openProfile = () => {
    if (hasReachedLimit(profiles.length, POLICY.maxProfiles)) return showUpgrade(`Your ${planName} plan allows up to ${formatLimit(POLICY.maxProfiles)} career profiles.`);
    setProfileModal(true);
  };
  const exportCsv = () => {
    if (!POLICY.csvExport) return showUpgrade("CSV export starts with the Standard plan.");
    downloadText(`smart-job-hunter-applications-${today()}.csv`, applicationsToCsv(applications), "text/csv;charset=utf-8");
  };
  const exportExcel = () => {
    if (!POLICY.excelTransfer) return showUpgrade("Full Excel export and import require the Premium plan.");
    downloadText(`smart-job-hunter-excel-${today()}.xml`, dataToExcelXml({ applications, companies, profiles, searchHistory }), "application/vnd.ms-excel;charset=utf-8");
  };
  const importExcel = (file?: File) => {
    if (!file || !POLICY.excelTransfer) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = excelXmlToData(String(reader.result));
        setApplications(data.applications.map(normalizeApplication));
        setCompanies(data.companies.map(normalizeCompany));
        setProfiles(data.profiles.map(normalizeProfile));
        setSearchHistory(data.searchHistory.map(normalizeSearchEntry));
      } catch (issue) { alert(issue instanceof Error ? issue.message : "Invalid Excel file."); }
    };
    reader.readAsText(file);
  };
  const importCompanyWorkbook = async (file?: File) => {
    if (!file) return;
    if (!POLICY.excelTransfer) return showUpgrade("Excel company import requires the Premium plan.");
    try {
      const imported = await readCompanyWorkbook(file);
      const incoming = imported.map(row => ({ id: makeId(), name: row.name, country: row.country, website: row.website, notes: row.notes, favorite: true }));
      setCompanies(current => {
        const merged = new Map<string, Company>();
        current.forEach(company => merged.set((company.website || `${company.name}|${company.country}`).trim().toLowerCase(), company));
        incoming.forEach(company => merged.set((company.website || `${company.name}|${company.country}`).trim().toLowerCase(), company));
        return Array.from(merged.values());
      });
      alert(`${incoming.length} companies imported successfully.`);
    } catch (issue) {
      alert(issue instanceof Error ? issue.message : "Unable to import the company workbook.");
    }
  };
  const exportDatabaseBackup = async () => {
    if (!POLICY.databaseBackup) return showUpgrade("Database backup requires the Premium plan.");
    if (serverStatus === "online") {
      try {
        const response = await fetch("./api.php?action=backup", { credentials: "include" });
        if (!response.ok) throw new Error("Database backup failed.");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `smart-job-hunter-database-${today()}.json`; a.click(); URL.revokeObjectURL(url); return;
      } catch { /* use local fallback */ }
    }
    downloadText(`smart-job-hunter-database-${today()}.json`, JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), data: { applications, companies, searchHistory, profiles, language, dark, mode } }, null, 2), "application/json");
  };
  const restoreDatabaseBackup = (file?: File) => {
    if (!file || !POLICY.databaseBackup) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = JSON.parse(String(reader.result));
        const data = backup.data || backup;
        if (serverStatus === "online") {
          const response = await fetch("./api.php?action=restore", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.message || "Restore failed.");
        }
        applyStoredData(data);
      } catch (issue) { alert(issue instanceof Error ? issue.message : "Invalid database backup."); }
    };
    reader.readAsText(file);
  };

  const nav = [
    ["dashboard", LayoutDashboard, t.dashboard], ["search", Search, t.search], ["applications", BriefcaseBusiness, t.applications],
    ["companies", Building2, t.companies], ["history", History, t.history], ["settings", Settings, t.settings],
  ] as const;

  if (serverStatus === "checking") return <div className="loading-screen"><div className="brand-mark"><Target size={24} /></div><strong>Smart Job Hunter</strong><span>Loading your workspace…</span></div>;
  if (serverStatus === "login") return <LoginScreen onLogin={user => { setServerUser(user); setServerStatus("online"); setServerLoaded(false); fetch("./api.php?action=load", { credentials: "include" }).then(r => r.json()).then(saved => { if (saved.data) applyStoredData(saved.data); setServerLoaded(true); }); }} />;

  return (
    <div className={`app-shell ${dark ? "dark" : ""} ${language === "ar" ? "rtl" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Target size={23} /></div><div><strong>Smart Job Hunter</strong><span>{t.subtitle}</span></div><button className="mobile-close icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <nav className="nav-list">{nav.map(([id, Icon, label]) => <button key={id} className={page === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span>{id === "companies" && !POLICY.targetCompanies && <Lock className="nav-lock" size={13} />}</button>)}</nav>
        <div className="sidebar-profile"><div className="avatar">{displayName.split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase()}</div><div><strong>{displayName}</strong><span>{mode === "plastics" ? "Production Manager" : "Job Seeker"}</span></div><ChevronDown size={17} /></div>
      </aside>
      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}

      <main className="main-area">
        <header className="topbar">
          <button className="menu-btn icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="mode-switch" role="group" aria-label="Search mode">
            {EDITION.showPlastics && <button className={mode === "plastics" ? "active" : ""} onClick={() => switchMode("plastics")}><Sparkles size={16} />{t.plastics}</button>}
            <button className={mode === "general" ? "active" : ""} onClick={() => switchMode("general")}><Globe2 size={16} />{t.general}</button>
          </div>
          <div className="top-actions">
            {EDITION.edition === "commercial" && EDITION.tier !== "premium" ? <button className="btn upgrade-btn" onClick={() => showUpgrade()}><Crown size={16} />Upgrade</button> : null}
            <span className={`plan-badge ${EDITION.tier}`}>{EDITION.edition === "personal" ? <Sparkles size={13} /> : <Crown size={13} />}{planName}</span>
            <button className="btn secondary" onClick={() => setLanguage(value => value === "en" ? "ar" : "en")} aria-label="Toggle language">{language === "en" ? "AR" : "EN"}</button>
            <button className="icon-btn" onClick={() => setDark(v => !v)} aria-label="Toggle theme">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <div className="alerts-wrap"><button className={`icon-btn alert-button ${!POLICY.followUps ? "locked-feature" : ""}`} aria-label="Follow-up alerts" onClick={() => POLICY.followUps ? setAlertsOpen(v => !v) : showUpgrade("Follow-up scheduling and in-app alerts require the Premium plan.")}><Bell size={19} />{POLICY.followUps && dueFollowUps.length > 0 && <span className="notification-count">{dueFollowUps.length}</span>}</button>{alertsOpen && POLICY.followUps && <AlertsPopover rows={dueFollowUps} close={() => setAlertsOpen(false)} edit={openApplication} />}</div>
            <button className="user-chip" onClick={() => { if (serverStatus === "online" && confirm("Sign out?")) fetch("./api.php?action=logout", { method:"POST", credentials:"include" }).then(() => { setServerUser(null); setServerStatus("login"); }); }}><CircleUserRound size={20} /><span>{firstName}</span></button>
          </div>
        </header>

        <div className="content">
          {page === "dashboard" && <Dashboard t={t} firstName={firstName} counts={counts} dueFollowUps={dueFollowUps.length} profileCount={profiles.length} applications={applications} advanced={POLICY.advancedTracker} onSearch={() => setPage("search")} onAdd={() => openApplication()} />}
          {page === "search" && <SearchWorkspace t={t} policy={POLICY} upgrade={showUpgrade} mode={mode} field={field} setField={setField} jobs={jobs} setJobs={setJobs} keywords={keywords} setKeywords={setKeywords} countries={countries} setCountries={setCountries} sites={sites} setSites={setSites} period={period} setPeriod={setPeriod} query={query} toggle={toggle} runSearch={runSearch} profiles={profiles} loadProfile={(p: Profile) => { setMode(p.field === "Plastics & Manufacturing" && EDITION.showPlastics ? "plastics" : "general"); if (p.field !== "Plastics & Manufacturing") setField(FIELDS[p.field] ? p.field : "Custom / Other"); setJobs(p.jobs); setKeywords(p.keywords); setCountries(p.countries); setSites(p.sites.filter(id => SEARCH_SITES.slice(0, allowedSiteCount).some(source => source.id === id))); }} openProfile={openProfile} />}
          {page === "applications" && <ApplicationsPage t={t} applications={filteredApps} statuses={allowedStatuses} filter={statusFilter} setFilter={setStatusFilter} searchText={searchText} setSearchText={setSearchText} edit={(a: Application) => openApplication(a)} remove={(id: string) => confirm("Delete this application?") && setApplications(list => list.filter(a => a.id !== id))} changeStatus={(id: string, status: Status) => allowedStatuses.includes(status) && setApplications(list => list.map(a => a.id === id ? { ...a, status } : a))} add={() => openApplication()} />}
          {page === "companies" && (POLICY.targetCompanies ? <CompaniesPage t={t} companies={companies} add={() => setCompanyModal(true)} remove={(id: string) => setCompanies(list => list.filter(c => c.id !== id))} toggleFavorite={(id: string) => setCompanies(list => list.map(c => c.id === id ? { ...c, favorite: !c.favorite } : c))} excelTransfer={POLICY.excelTransfer} downloadTemplate={downloadCompanyTemplate} importExcel={() => companyImportRef.current?.click()} upgrade={showUpgrade} /> : <LockedPage title={t.targetCompanies} badge="STANDARD" text="Target-company tracking starts with the Standard plan." upgrade={showUpgrade} />)}
          {page === "history" && <HistoryPage t={t} history={searchHistory} rerun={(entry: SearchEntry) => { setPage("search"); navigator.clipboard?.writeText(entry.query); }} clear={() => confirm("Clear search history?") && setSearchHistory([])} />}
          {page === "settings" && <SettingsPage t={t} edition={EDITION} policy={POLICY} upgrade={showUpgrade} dark={dark} setDark={setDark} language={language} setLanguage={setLanguage} exportCsv={exportCsv} exportExcel={exportExcel} importExcel={() => excelImportRef.current?.click()} exportBackup={exportDatabaseBackup} importBackup={() => backupImportRef.current?.click()} reset={() => { if (confirm("This will delete all saved data. Continue?")) { setApplications([]); setCompanies(INITIAL_COMPANIES); setSearchHistory([]); setProfiles([]); } }} />}
        </div>
      </main>

      <input ref={excelImportRef} hidden type="file" accept=".xml,text/xml,application/xml,application/vnd.ms-excel" onChange={e => { importExcel(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={companyImportRef} hidden type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={e => { importCompanyWorkbook(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <input ref={backupImportRef} hidden type="file" accept="application/json,.json" onChange={e => { restoreDatabaseBackup(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      {appModal && <ApplicationModal t={t} app={editingApp} statuses={allowedStatuses} followUps={POLICY.followUps} close={() => { setAppModal(false); setEditingApp(null); }} save={saveApplication} />}
      {companyModal && <CompanyModal t={t} close={() => setCompanyModal(false)} save={form => { setCompanies(list => [{ id: makeId(), name: String(form.get("name")), country: String(form.get("country")), website: String(form.get("website")), notes: String(form.get("notes")), favorite: true }, ...list]); setCompanyModal(false); }} />}
      {profileModal && <SimpleModal title={t.saveProfile} close={() => setProfileModal(false)}><form action={form => { const name = String(form.get("name") || "").trim(); if (name) setProfiles(p => [{ id: makeId(), name, field: mode === "plastics" ? "Plastics & Manufacturing" : field, jobs, keywords, countries, sites: sites.filter(id => SEARCH_SITES.slice(0, allowedSiteCount).some(source => source.id === id)) }, ...p]); setProfileModal(false); }}><label>{t.profileName}<input name="name" required autoFocus /></label><div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setProfileModal(false)}>{t.cancel}</button><button className="btn primary">{t.save}</button></div></form></SimpleModal>}
    </div>
  );
}

function PageHeading({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div>;
}

function Dashboard({ t, firstName, counts, dueFollowUps, profileCount, applications, advanced, onSearch, onAdd }: { t: typeof EN; firstName: string; counts: Record<string, number>; dueFollowUps: number; profileCount: number; applications: Application[]; advanced: boolean; onSearch: () => void; onAdd: () => void }) {
  const stats = advanced
    ? [[t.total, counts.total, BriefcaseBusiness, "blue"], [t.interviews, counts.interview, UsersRound, "violet"], [t.offers, counts.offer, Check, "green"], [t.followups, dueFollowUps, Clock3, "amber"]] as const
    : [[t.total, counts.total, BriefcaseBusiness, "blue"], [t.new, counts.new, Sparkles, "violet"], [t.applied, counts.applied, Check, "green"], [t.profiles, profileCount, Target, "amber"]] as const;
  const pipeline: Status[] = advanced ? ALL_STATUSES : BASIC_STATUSES;
  return <>
    <PageHeading eyebrow="SMART JOB HUNTER" title={`${t.welcome}, ${firstName}`} text={t.welcomeSub} action={<button className="btn primary" onClick={onAdd}><Plus size={18} />{t.add}</button>} />
    <section className="stats-grid">{stats.map(([label, value, Icon, tone]) => <article className="stat-card" key={label}><div className={`stat-icon ${tone}`}><Icon size={21} /></div><div><span>{label}</span><strong>{value}</strong></div></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel pipeline-panel"><div className="panel-title"><div><span className="eyebrow">PROGRESS</span><h2>{t.pipeline}</h2></div><span className="muted">{applications.length} {t.applications.toLowerCase()}</span></div><div className="pipeline">{pipeline.map(status => { const n = applications.filter(a => a.status === status).length; const pct = applications.length ? Math.max(8, Math.round((n / applications.length) * 100)) : 0; return <div className="pipeline-row" key={status}><span>{t[status]}</span><div className="bar"><i style={{ width: `${pct}%` }} /></div><strong>{n}</strong></div>; })}</div></article>
      <article className="panel focus-panel"><div className="focus-icon"><Target size={28} /></div><span className="eyebrow">TODAY&apos;S FOCUS</span><h2>{t.openSearch}</h2><p>{t.noAppsSub}</p><button className="btn primary" onClick={onSearch}><Search size={18} />{t.openSearch}</button></article>
    </section>
    <section className="panel"><div className="panel-title"><h2>{t.recent}</h2></div>{applications.length === 0 ? <EmptyState icon={BriefcaseBusiness} title={t.noApps} text={t.noAppsSub} action={<button className="btn secondary" onClick={onAdd}><Plus size={17} />{t.add}</button>} /> : <ApplicationList rows={applications.slice(0, 5)} t={t} />}</section>
  </>;
}

function SearchWorkspace(props: any) {
  const { t, policy, upgrade, mode, field, setField, jobs, setJobs, keywords, setKeywords, countries, setCountries, sites, setSites, period, setPeriod, query, toggle, runSearch, profiles, loadProfile, openProfile } = props;
  const currentField = FIELDS[field] || FIELDS["Custom / Other"];
  const jobOptions = mode === "plastics" ? PLASTIC_JOBS : currentField.jobs;
  const keywordOptions = mode === "plastics" ? PLASTIC_KEYWORDS : currentField.keywords;
  const allowedSiteCount = policy.maxSearchSites ?? SEARCH_SITES.length;
  const addCustom = (value: string, list: string[], setter: (items: string[]) => void) => { const clean = value.trim(); if (clean && !list.includes(clean)) setter([...list, clean]); };
  return <>
    <PageHeading eyebrow={mode === "plastics" ? "PLASTICS & MANUFACTURING" : "UNIVERSAL SEARCH"} title={t.search} text={mode === "plastics" ? "A focused profile built for production leadership across plastics manufacturing." : "Choose any career field, add your own titles and keywords, and build a precise search in seconds."} action={<div className="search-heading-actions"><button className="btn secondary reset-search-button" onClick={() => { setJobs([]); setKeywords([]); setCountries([]); setSites([]); setPeriod("all"); }}><X size={17} />{t.resetSearch}</button><button className="btn secondary" onClick={openProfile}><Plus size={17} />{t.saveProfile}</button></div>} />
    {profiles.length > 0 && <div className="saved-profiles">{profiles.map((p: Profile) => <button key={p.id} onClick={() => loadProfile(p)}><Target size={15} />{p.name}</button>)}</div>}
    <section className="search-layout"><div className="search-config">
      {mode === "general" && <article className="panel config-card"><SectionTitle step="1" title={t.field} /><select value={field} onChange={e => { const next = e.target.value; setField(next); setJobs(FIELDS[next].jobs.slice(0, 3)); setKeywords(FIELDS[next].keywords.slice(0, 3)); }}>{Object.keys(FIELDS).map(name => <option key={name} value={name}>{t === AR ? (AR_FIELD_LABELS[name] || name) : name}</option>)}</select></article>}
      <article className="panel config-card"><SectionTitle step={mode === "general" ? "2" : "1"} title={t.titles} count={jobs.length} />{jobOptions.length > 0 && <ChipGrid options={jobOptions} selected={jobs} toggle={(v: string) => toggle(v, jobs, setJobs)} label={(v: string) => t === AR ? (AR_JOB_LABELS[v] || v) : v} />}<CustomEntry placeholder="Add custom job title" onAdd={(value: string) => addCustom(value, jobs, setJobs)} /></article>
      <article className="panel config-card"><SectionTitle step={mode === "general" ? "3" : "2"} title={t.keywords} count={keywords.length} />{keywordOptions.length > 0 && <ChipGrid options={keywordOptions} selected={keywords} toggle={(v: string) => toggle(v, keywords, setKeywords)} label={(v: string) => t === AR ? (AR_KEYWORD_LABELS[v] || v) : v} />}<CustomEntry placeholder="Add custom keyword" onAdd={(value: string) => addCustom(value, keywords, setKeywords)} /></article>
      <article className="panel config-card"><SectionTitle step={mode === "general" ? "4" : "3"} title={t.countries} count={countries.length} /><div className="quick-row"><button onClick={() => setCountries(["Saudi Arabia", "UAE", "Qatar", "Kuwait", "Oman", "Bahrain"])}>Gulf</button><button onClick={() => setCountries(["Egypt", "Angola", "DR Congo", "Kenya", "Nigeria", "Ghana", "South Africa"])}>Africa</button><button onClick={() => setCountries([])}>Clear</button></div><ChipGrid options={COUNTRIES} selected={countries} toggle={(v: string) => toggle(v, countries, setCountries)} /></article>
    </div><aside className="search-summary panel"><span className="eyebrow">SEARCH PLAN</span><h2>{t.preview}</h2><div className="summary-metrics"><div><strong>{countries.length}</strong><span>{t.countries}</span></div><div><strong>{sites.length}</strong><span>{t.sources}</span></div><div><strong>{jobs.length}</strong><span>{t.titles}</span></div></div><label>{t.sources}<div className="source-list">{SEARCH_SITES.map((source, index) => { const locked = index >= allowedSiteCount; return <button type="button" className={`${sites.includes(source.id) ? "selected" : ""} ${locked ? "locked" : ""}`} key={source.id} onClick={() => locked ? upgrade(`Your plan includes ${allowedSiteCount} job search sites.`) : toggle(source.id, sites, setSites)}>{locked ? <Lock size={13} /> : sites.includes(source.id) && <Check size={14} />}{source.name}{locked && <small>{index < 5 ? "STANDARD" : "PREMIUM"}</small>}</button>; })}</div></label><label>{t.period}<select value={period} onChange={e => setPeriod(e.target.value)}><option value="d">Last 24 hours</option><option value="w">Last week</option><option value="m">Last month</option><option value="all">Any time</option></select></label><label>{t.preview}<textarea readOnly value={query} placeholder="Select titles, keywords and countries…" /></label><button className="btn primary run-btn" disabled={!query || !sites.length} onClick={runSearch}><Search size={18} />{t.run}<span>{sites.length}</span></button><p className="safe-note"><Check size={15} /> Opens focused Google searches. No passwords or job-site accounts are accessed.</p></aside></section>
  </>;
}

function ApplicationsPage({ t, applications, statuses, filter, setFilter, searchText, setSearchText, edit, remove, changeStatus, add }: any) {
  const filters: (Status | "all")[] = ["all", ...statuses];
  return <><PageHeading title={t.appTitle} text={t.appSub} action={<button className="btn primary" onClick={add}><Plus size={18} />{t.add}</button>} /><div className="list-toolbar"><div className="search-box"><Search size={18} /><input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search company, role or country…" /></div><div className="filter-pills">{filters.map(s => <button className={filter === s ? "active" : ""} key={s} onClick={() => setFilter(s)}>{t[s]}</button>)}</div></div><section className="panel table-panel">{applications.length ? <div className="application-table"><div className="table-head"><span>{t.role}</span><span>{t.company}</span><span>{t.country}</span><span>{t.date}</span><span>{t.status}</span><span>{t.actions}</span></div>{applications.map((a: Application) => <div className="table-row" key={a.id}><div><strong>{a.title}</strong>{a.link && <a href={a.link} target="_blank" rel="noreferrer">Open job <ExternalLink size={12} /></a>}{a.followUp && <small className="followup-inline"><Clock3 size={11} />{a.followUp}</small>}</div><span>{a.company}</span><span>{a.country || "—"}</span><span>{a.date}</span><select className={`status-select ${a.status}`} value={a.status} onChange={e => changeStatus(a.id, e.target.value)}>{statuses.map((s: Status) => <option key={s} value={s}>{t[s]}</option>)}</select><div className="row-actions"><button className="icon-btn" onClick={() => edit(a)} aria-label="Edit"><Pencil size={16} /></button><button className="icon-btn danger" onClick={() => remove(a.id)} aria-label="Delete"><Trash2 size={16} /></button></div></div>)}</div> : <EmptyState icon={BriefcaseBusiness} title={t.noApps} text={t.noAppsSub} action={<button className="btn primary" onClick={add}><Plus size={17} />{t.add}</button>} />}</section></>;
}

function CompaniesPage({ t, companies, add, remove, toggleFavorite, excelTransfer, downloadTemplate, importExcel, upgrade }: any) {
  const actions = <div className="button-row">{excelTransfer ? <><button className="btn secondary" onClick={downloadTemplate}><Download size={17} />{t.downloadCompaniesTemplate}</button><button className="btn secondary" onClick={importExcel}><Upload size={17} />{t.importCompanies}</button></> : <button className="btn secondary locked-action" onClick={() => upgrade("Excel company import requires the Premium plan.")}><Lock size={16} />Excel · Premium</button>}<button className="btn primary" onClick={add}><Plus size={18} />{t.addCompany}</button></div>;
  return <><PageHeading title={t.targetCompanies} text={t.companySub} action={actions} /><section className="company-grid">{companies.length === 0 ? <article className="panel company-empty"><EmptyState icon={Building2} title="No target companies yet" text="Add companies you want to monitor directly." /></article> : companies.map((c: Company) => <article className="panel company-tile" key={c.id}><div className="company-logo">{c.name.split(/\s+/).slice(0, 2).map(w => w[0]).join("")}</div><div className="company-copy"><div><h3>{c.name}</h3><span><Globe2 size={14} />{c.country}</span></div><p>{c.notes || "Target employer"}</p><div className="company-actions">{c.website && <a className="btn secondary compact" href={c.website} target="_blank" rel="noreferrer">{t.visit}<ExternalLink size={14} /></a>}<button className={`icon-btn ${c.favorite ? "favorite" : ""}`} onClick={() => toggleFavorite(c.id)} aria-label="Favorite"><Target size={17} /></button><button className="icon-btn danger" onClick={() => remove(c.id)} aria-label="Delete"><Trash2 size={16} /></button></div></div></article>)}</section></>;
}

function HistoryPage({ t, history, rerun, clear }: any) {
  return <><PageHeading title={t.history} text="Review previous searches, copy a query, or run it again." action={history.length > 0 && <button className="btn secondary" onClick={clear}><Trash2 size={16} />Clear</button>} /><section className="panel history-panel">{history.length === 0 ? <EmptyState icon={FileClock} title={t.emptyHistory} text="Your completed searches will appear here." /> : history.map((h: SearchEntry) => <article className="history-row" key={h.id}><div className="history-icon"><History size={18} /></div><div><strong>{h.query}</strong><span>{new Date(h.date).toLocaleString()} · {h.sites} sources</span></div><button className="btn secondary compact" onClick={() => rerun(h)}>Copy query</button></article>)}</section></>;
}

function SettingsPage({ t, edition, policy, upgrade, dark, setDark, language, setLanguage, exportCsv, exportExcel, importExcel, exportBackup, importBackup, reset }: any) {
  const plan = tierLabel(edition);
  return <><PageHeading title={t.settingsTitle} text="Manage your plan, interface, exports, imports, and backups." /><section className="settings-grid">
    <article className="panel setting-card plan-card wide"><div className="setting-icon"><Crown size={20} /></div><div><div className="plan-heading"><div><span className="eyebrow">CURRENT EDITION</span><h2>{edition.edition === "personal" ? "Personal Edition" : `${edition.tier[0].toUpperCase()}${edition.tier.slice(1)} Commercial Edition`}</h2></div><span className={`plan-badge ${edition.tier}`}>{plan}</span></div><div className="limit-grid"><span><strong>{formatLimit(policy.maxProfiles)}</strong>Career profiles</span><span><strong>{formatLimit(policy.maxApplications)}</strong>Applications</span><span><strong>{formatLimit(policy.maxSearchSites)}</strong>Search sites</span><span><strong>{policy.followUps ? "Yes" : "No"}</strong>Follow-up alerts</span></div>{edition.edition === "commercial" && edition.tier !== "premium" && <button className="btn upgrade-btn" onClick={() => upgrade("Unlock more capacity and advanced job-hunting tools.")}><Crown size={17} />Upgrade plan</button>}</div></article>
    <article className="panel setting-card"><div className="setting-icon"><Sun size={20} /></div><div><h2>{t.appearance}</h2><p>Choose the look that is easiest on your eyes.</p><div className="segmented"><button className={!dark ? "active" : ""} onClick={() => setDark(false)}><Sun size={16} />{t.light}</button><button className={dark ? "active" : ""} onClick={() => setDark(true)}><Moon size={16} />{t.dark}</button></div></div></article>
    <article className="panel setting-card"><div className="setting-icon"><Globe2 size={20} /></div><div><h2>{t.language}</h2><p>Switch the complete interface direction and language.</p><div className="segmented"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>{t.english}</button><button className={language === "ar" ? "active" : ""} onClick={() => setLanguage("ar")}>{t.arabic}</button></div></div></article>
    <article className="panel setting-card wide"><div className="setting-icon"><Download size={20} /></div><div><h2>{t.data}</h2><p>Standard adds CSV export. Premium adds full Excel transfer and database backup/restore.</p><div className="button-row">
      {policy.csvExport ? <button className="btn secondary" onClick={exportCsv}><Download size={17} />Export CSV</button> : <button className="btn secondary locked-action" onClick={() => upgrade("CSV export starts with the Standard plan.")}><Lock size={16} />CSV · Standard</button>}
      {policy.excelTransfer ? <><button className="btn primary" onClick={exportExcel}><Download size={17} />Export Excel</button><button className="btn secondary" onClick={importExcel}><Upload size={17} />Import Excel</button></> : <button className="btn secondary locked-action" onClick={() => upgrade("Excel import and export require the Premium plan.")}><Lock size={16} />Excel · Premium</button>}
      {policy.databaseBackup ? <><button className="btn secondary" onClick={exportBackup}><Download size={17} />Database backup</button><button className="btn secondary" onClick={importBackup}><Upload size={17} />Restore backup</button></> : <button className="btn secondary locked-action" onClick={() => upgrade("Database backup and restore require the Premium plan.")}><Lock size={16} />Backup · Premium</button>}
      <button className="btn danger-btn" onClick={reset}><Trash2 size={17} />{t.reset}</button>
    </div></div></article>
  </section></>;
}

function LockedPage({ title, badge, text, upgrade }: { title: string; badge: string; text: string; upgrade: (message?: string) => void }) { return <><PageHeading title={title} /><section className="panel locked-page"><div><Lock size={28} /></div><span className="eyebrow">{badge} FEATURE</span><h2>{title}</h2><p>{text}</p><button className="btn upgrade-btn" onClick={() => upgrade(text)}><Crown size={17} />Upgrade plan</button></section></>; }
function AlertsPopover({ rows, close, edit }: { rows: Application[]; close: () => void; edit: (app: Application) => void }) { return <div className="alerts-popover"><header><div><strong>Follow-up alerts</strong><span>{rows.length ? `${rows.length} due` : "Nothing due today"}</span></div><button className="icon-btn" onClick={close}><X size={16} /></button></header>{rows.length === 0 ? <p className="alerts-empty">Your scheduled follow-ups will appear here.</p> : <div className="alerts-list">{rows.slice(0, 8).map(app => <button key={app.id} onClick={() => { edit(app); close(); }}><Clock3 size={15} /><span><strong>{app.title}</strong><small>{app.company} · {app.followUp}</small></span></button>)}</div>}</div>; }
function SectionTitle({ step, title, count }: { step: string; title: string; count?: number }) { return <div className="section-title"><span>{step}</span><h2>{title}</h2>{typeof count === "number" && <small>{count} selected</small>}</div>; }
function ChipGrid({ options, selected, toggle, label }: { options: string[]; selected: string[]; toggle: (v: string) => void; label?: (v: string) => string }) { return <div className="chip-grid">{options.map(item => <button key={item} className={selected.includes(item) ? "selected" : ""} onClick={() => toggle(item)}>{selected.includes(item) && <Check size={14} />}{label ? label(item) : item}</button>)}</div>; }
function CustomEntry({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) { const [value, setValue] = useState(""); return <div className="custom-entry"><input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(value); setValue(""); } }} /><button type="button" onClick={() => { onAdd(value); setValue(""); }}><Plus size={15} />Add</button></div>; }
function StatusBadge({ status, t }: { status: Status; t: typeof EN }) { return <span className={`status-badge ${status}`}>{t[status]}</span>; }
function ApplicationList({ rows, t }: { rows: Application[]; t: typeof EN }) { return <div className="compact-list">{rows.map(a => <article key={a.id}><div className="mini-logo">{a.company.slice(0, 2).toUpperCase()}</div><div><strong>{a.title}</strong><span>{a.company} · {a.country}</span></div><StatusBadge status={a.status} t={t} /><time>{a.date}</time></article>)}</div>; }
function EmptyState({ icon: Icon, title, text, action }: { icon: any; title: string; text: string; action?: React.ReactNode }) { return <div className="empty-state"><div><Icon size={27} /></div><h3>{title}</h3><p>{text}</p>{action}</div>; }

function LoginScreen({ onLogin }: { onLogin: (user: ServerUser) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (form: FormData) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("./api.php?action=login", { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:String(form.get("email")), password:String(form.get("password")) }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Invalid email or password.");
      onLogin(result.user);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Unable to sign in."); setBusy(false); }
  };
  return <main className="login-screen"><section className="login-card"><div className="brand-mark"><Target size={24} /></div><span className="eyebrow">SMART JOB HUNTER</span><h1>Welcome back</h1><p>Sign in to continue your focused job search.</p><form action={submit}><label>Email<input type="email" name="email" required autoFocus autoComplete="email" /></label><label>Password<input type="password" name="password" required autoComplete="current-password" /></label>{error && <div className="login-error">{error}</div>}<button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><small>Your job-search data is private to your account.</small></section></main>;
}

function SimpleModal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}><section className="modal"><header><h2>{title}</h2><button className="icon-btn" onClick={close}><X size={20} /></button></header>{children}</section></div>; }
function ApplicationModal({ t, app, statuses, followUps, close, save }: { t: typeof EN; app: Application | null; statuses: Status[]; followUps: boolean; close: () => void; save: (form: FormData) => void }) { return <SimpleModal title={app ? "Edit application" : t.add} close={close}><form action={save}><div className="form-grid"><label className="span-2">{t.role}<input name="title" defaultValue={app?.title} required autoFocus /></label><label>{t.company}<input name="company" defaultValue={app?.company} required /></label><label>{t.country}<input name="country" defaultValue={app?.country} /></label><label>{t.status}<select name="status" defaultValue={statuses.includes(app?.status as Status) ? app?.status : "new"}>{statuses.map(s => <option value={s} key={s}>{t[s]}</option>)}</select></label><label>{t.date}<input type="date" name="date" defaultValue={app?.date || today()} /></label>{followUps && <label>{t.followUp}<input type="date" name="followUp" defaultValue={app?.followUp} /></label>}<label className="span-2">{t.link}<input type="url" name="link" defaultValue={app?.link} placeholder="https://…" /></label><label className="span-2">{t.notes}<textarea name="notes" defaultValue={app?.notes} /></label></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={close}>{t.cancel}</button><button className="btn primary">{t.save}</button></div></form></SimpleModal>; }
function CompanyModal({ t, close, save }: { t: typeof EN; close: () => void; save: (form: FormData) => void }) { return <SimpleModal title={t.addCompany} close={close}><form action={save}><div className="form-grid"><label className="span-2">{t.company}<input name="name" required autoFocus /></label><label>{t.country}<input name="country" /></label><label>{t.careersPage}<input name="website" type="url" placeholder="https://company.com/careers/" /></label><label className="span-2">{t.notes}<textarea name="notes" /></label></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={close}>{t.cancel}</button><button className="btn primary">{t.save}</button></div></form></SimpleModal>; }
