"use client";

import { useState, useMemo } from "react";
import { Header }  from "@/components/layout/Header";
import { Card }    from "@/components/ui/Card";
import { Select }  from "@/components/ui/Select";
import {
  Plus, Search, X, AlertTriangle, Edit2, Trash2,
  LayoutList, CalendarDays, Target, Clock, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

type Brand    = "SY_INDIA" | "SY_UAE" | "INTERIOR" | "SQUARE_CONNECT" | "UM";
type Platform = "IG" | "YT" | "LI" | "FB";
type CType    = "Reel" | "Carousel" | "Static" | "YouTube Video" | "Short" | "Story";
type Status   = "PLANNED"|"SCRIPTING"|"SCRIPT_DONE"|"FILMING"|"EDITING"|"READY"|"PUBLISHED"|"DELAYED";

interface Item {
  id: string; brand: Brand; platforms: Platform[]; ctype: CType;
  seriesId: string | null; title: string; hook: string; caption: string;
  plannedDate: string; assignee: string; status: Status;
  delayStage?: string; delayReason?: string; delayNote?: string;
  igLink?: string; ytLink?: string; liLink?: string; fbLink?: string;
}

interface Series {
  id: string; name: string; emoji: string; color: string;
  brand: Brand; targetPerMonth: number; platforms: Platform[];
}

// ── Config ────────────────────────────────────────────────────────────────

const BRAND_CFG: Record<Brand,{label:string;color:string;bg:string;dot:string}> = {
  SY_INDIA:       { label:"SY India",   color:"text-blue-700",   bg:"bg-blue-100",   dot:"bg-blue-500"   },
  SY_UAE:         { label:"SY UAE",     color:"text-cyan-700",   bg:"bg-cyan-100",   dot:"bg-cyan-500"   },
  INTERIOR:       { label:"Interior",   color:"text-purple-700", bg:"bg-purple-100", dot:"bg-purple-500" },
  SQUARE_CONNECT: { label:"SQ Connect", color:"text-green-700",  bg:"bg-green-100",  dot:"bg-green-500"  },
  UM:             { label:"UM",         color:"text-orange-700", bg:"bg-orange-100", dot:"bg-orange-500" },
};

const PIPELINE: {key:Status;label:string;short:string;pill:string;col:string}[] = [
  { key:"PLANNED",     label:"Planned",        short:"Planned",    pill:"bg-gray-100 text-gray-600",     col:"bg-gray-50 border-gray-200"    },
  { key:"SCRIPTING",   label:"Script Writing", short:"Scripting",  pill:"bg-sky-100 text-sky-700",       col:"bg-sky-50 border-sky-200"      },
  { key:"SCRIPT_DONE", label:"Script Ready",   short:"Script ✓",   pill:"bg-blue-100 text-blue-700",     col:"bg-blue-50 border-blue-200"    },
  { key:"FILMING",     label:"Filming",        short:"Filming",    pill:"bg-violet-100 text-violet-700", col:"bg-violet-50 border-violet-200"},
  { key:"EDITING",     label:"Editing",        short:"Editing",    pill:"bg-indigo-100 text-indigo-700", col:"bg-indigo-50 border-indigo-200"},
  { key:"READY",       label:"Ready to Post",  short:"Ready",      pill:"bg-amber-100 text-amber-700",   col:"bg-amber-50 border-amber-200"  },
  { key:"PUBLISHED",   label:"Published",      short:"Published",  pill:"bg-green-100 text-green-700",   col:"bg-green-50 border-green-200"  },
  { key:"DELAYED",     label:"Delayed 🚨",     short:"Delayed",    pill:"bg-red-100 text-red-700",       col:"bg-red-50 border-red-200"      },
];

const STATUS_MAP = Object.fromEntries(PIPELINE.map(p=>[p.key,p]));

const SERIES: Series[] = [
  { id:"s1", name:"She Leads",       emoji:"👩‍💼", color:"#ec4899", brand:"SY_INDIA",       targetPerMonth:4, platforms:["IG","LI"]       },
  { id:"s2", name:"Ghar Wapsi",      emoji:"🏡",  color:"#f97316", brand:"SY_INDIA",       targetPerMonth:4, platforms:["IG","YT"]       },
  { id:"s3", name:"Market Mondays",  emoji:"📊",  color:"#2563eb", brand:"SY_INDIA",       targetPerMonth:4, platforms:["IG","LI","YT"]  },
  { id:"s4", name:"Dubai Decoded",   emoji:"🌆",  color:"#0891b2", brand:"SY_UAE",         targetPerMonth:6, platforms:["IG","YT"]       },
  { id:"s5", name:"Design Diaries",  emoji:"🎨",  color:"#7c3aed", brand:"INTERIOR",       targetPerMonth:8, platforms:["IG","FB"]       },
];

const SERIES_MAP = Object.fromEntries(SERIES.map(s=>[s.id,s]));

const BRANDS     = [{value:"all",label:"All Brands"},{value:"SY_INDIA",label:"SY India"},{value:"SY_UAE",label:"SY UAE"},{value:"INTERIOR",label:"Interior"},{value:"SQUARE_CONNECT",label:"SQ Connect"},{value:"UM",label:"UM"}];
const PLATFORMS  = ["IG","YT","LI","FB"];
const CTYPES     = ["Reel","Carousel","Static","YouTube Video","Short","Story"];
const STATUSES   = PIPELINE.map(p=>({value:p.key,label:p.label}));
const ASSIGNEES  = ["Rahul V","Priya S","Karan M","Anjali T","Sneha R","Arjun K"];
const DELAY_REASONS = ["Talent unavailable","Shoot delayed","Editor on leave","Approval pending","Script not ready","Strategy change","Technical issue","Other"];
const WEEKDAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const MONTH_DAYS = Array.from({length:31},(_,i)=>{
  const d=new Date(2026,2,i+1);
  return {date:`2026-03-${String(i+1).padStart(2,"0")}`,day:i+1,weekday:d.getDay()};
});

const EMPTY: Omit<Item,"id"> = {
  brand:"SY_INDIA",platforms:["IG"],ctype:"Reel",seriesId:null,
  title:"",hook:"",caption:"",plannedDate:"2026-03-01",assignee:"Rahul V",status:"PLANNED",
};

// ── Mock data ─────────────────────────────────────────────────────────────

const INITIAL_ITEMS: Item[] = [
  // She Leads
  {id:"i01",brand:"SY_INDIA",platforms:["IG","LI"],ctype:"Reel",         seriesId:"s1",title:"She Leads — Priya Sharma: Agent to Director",          hook:"From ₹0 commission to leading 50 agents...",     caption:"#SheLeads #WomenInRE",      plannedDate:"2026-03-03",assignee:"Rahul V", status:"PUBLISHED",igLink:"https://instagram.com/p/abc1"},
  {id:"i02",brand:"SY_INDIA",platforms:["IG","LI"],ctype:"Reel",         seriesId:"s1",title:"She Leads — Breaking Barriers in Commercial RE",         hook:"Only 12% of commercial deals are closed by...",  caption:"#SheLeads #CommercialRE",   plannedDate:"2026-03-10",assignee:"Rahul V", status:"PUBLISHED",igLink:"https://instagram.com/p/abc2"},
  {id:"i03",brand:"SY_INDIA",platforms:["IG","LI"],ctype:"Carousel",     seriesId:"s1",title:"She Leads — Women's Day: Top 5 Women Leaders",           hook:"These 5 women are redefining real estate...",    caption:"#WomensDay #SheLeads",      plannedDate:"2026-03-15",assignee:"Priya S",  status:"EDITING"},
  {id:"i04",brand:"SY_INDIA",platforms:["IG"],      ctype:"Reel",         seriesId:"s1",title:"She Leads — NRI Women Investing in India",               hook:"Distance never stopped her from building...",    caption:"#NRI #WomenInvestors",      plannedDate:"2026-03-22",assignee:"Rahul V", status:"SCRIPTING"},
  // Ghar Wapsi
  {id:"i05",brand:"SY_INDIA",platforms:["IG","YT"],ctype:"Reel",         seriesId:"s2",title:"Ghar Wapsi — Ramesh: 10 Years Dubai to Pune",             hook:"After 10 years I finally came home...",          caption:"#GharWapsi #NRI",           plannedDate:"2026-03-05",assignee:"Karan M", status:"PUBLISHED"},
  {id:"i06",brand:"SY_INDIA",platforms:["IG","YT"],ctype:"Reel",         seriesId:"s2",title:"Ghar Wapsi — Coming Home for the First Time in 5 Yrs",    hook:"The last time I saw India was 2019...",          caption:"#GharWapsi",                plannedDate:"2026-03-12",assignee:"Karan M", status:"DELAYED",    delayStage:"Filming",  delayReason:"Talent unavailable", delayNote:"Subject traveling, rescheduled 20 Mar"},
  {id:"i07",brand:"SY_INDIA",platforms:["YT"],      ctype:"YouTube Video",seriesId:"s2",title:"Ghar Wapsi — Buying First Home After 8 Years Abroad",     hook:"I saved for 8 years for this moment...",         caption:"#GharWapsi #HomeBuying",    plannedDate:"2026-03-19",assignee:"Karan M", status:"SCRIPTING"},
  {id:"i08",brand:"SY_INDIA",platforms:["IG","YT"],ctype:"Reel",         seriesId:"s2",title:"Ghar Wapsi — She Called It Going Home Not Investing",      hook:"She called it going home, not investing...",     caption:"#GharWapsi #Emotional",     plannedDate:"2026-03-26",assignee:"Karan M", status:"PLANNED"},
  // Market Mondays
  {id:"i09",brand:"SY_INDIA",platforms:["IG","LI","YT"],ctype:"Reel",    seriesId:"s3",title:"Market Mondays — Pune Prices March Week 1",               hook:"Pune property prices moved 3% this week...",     caption:"#MarketMonday #Pune",       plannedDate:"2026-03-02",assignee:"Anjali T",status:"PUBLISHED"},
  {id:"i10",brand:"SY_INDIA",platforms:["IG","LI","YT"],ctype:"Carousel",seriesId:"s3",title:"Market Mondays — Top Localities to Invest in Pune",        hook:"If you are buying in Pune this is the list...",  caption:"#Pune #Investment",         plannedDate:"2026-03-09",assignee:"Anjali T",status:"PUBLISHED"},
  {id:"i11",brand:"SY_INDIA",platforms:["IG","LI"],     ctype:"Reel",    seriesId:"s3",title:"Market Mondays — Good Time to Buy in Bangalore?",          hook:"Everyone is asking should I buy now...",         caption:"#Bangalore #MarketMonday", plannedDate:"2026-03-16",assignee:"Anjali T",status:"DELAYED",     delayStage:"Editing",  delayReason:"Editor on leave",    delayNote:"Arjun picking up from 17 Mar"},
  {id:"i12",brand:"SY_INDIA",platforms:["IG","LI","YT"],ctype:"Reel",    seriesId:"s3",title:"Market Mondays — March End Market Wrap-Up",                hook:"Here is everything that happened in March...",   caption:"#MarketWrap #RealEstate",  plannedDate:"2026-03-30",assignee:"Anjali T",status:"PLANNED"},
  // Dubai Decoded
  {id:"i13",brand:"SY_UAE",  platforms:["IG","YT"],ctype:"Reel",         seriesId:"s4",title:"Dubai Decoded — Why RAK is the New Investment Hotspot",    hook:"Everyone looks at Dubai but RAK...",             caption:"#RAK #DubaiInvestment",     plannedDate:"2026-03-04",assignee:"Sneha R", status:"PUBLISHED"},
  {id:"i14",brand:"SY_UAE",  platforms:["IG","YT"],ctype:"Reel",         seriesId:"s4",title:"Dubai Decoded — Downtown vs Business Bay",                  hook:"₹2 crore and you choose between two worlds...",  caption:"#DubaiDecoded",             plannedDate:"2026-03-08",assignee:"Sneha R", status:"PUBLISHED"},
  {id:"i15",brand:"SY_UAE",  platforms:["IG"],      ctype:"Carousel",    seriesId:"s4",title:"Dubai Decoded — Golden Visa for Property Investors",        hook:"Own AED 2M in property and get this...",         caption:"#GoldenVisa #Dubai",        plannedDate:"2026-03-12",assignee:"Sneha R", status:"READY"},
  {id:"i16",brand:"SY_UAE",  platforms:["IG","YT"],ctype:"Reel",         seriesId:"s4",title:"Dubai Decoded — Off-Plan vs Ready Properties Explained",    hook:"The one question every NRI investor asks...",    caption:"#DubaiRealEstate",          plannedDate:"2026-03-18",assignee:"Sneha R", status:"SCRIPT_DONE"},
  {id:"i17",brand:"SY_UAE",  platforms:["IG","YT"],ctype:"Reel",         seriesId:"s4",title:"Dubai Decoded — ROI on Dubai Rentals in 2026",              hook:"8% rental yield sounds too good to be true...",  caption:"#DubaiROI #Rental",         plannedDate:"2026-03-24",assignee:"Sneha R", status:"SCRIPTING"},
  {id:"i18",brand:"SY_UAE",  platforms:["IG"],      ctype:"Carousel",    seriesId:"s4",title:"Dubai Decoded — Palm vs JVC: Where to Invest?",             hook:"Palm for lifestyle, JVC for yield...",           caption:"#Palm #JVC",                plannedDate:"2026-03-28",assignee:"Sneha R", status:"PLANNED"},
  // Design Diaries
  {id:"i19",brand:"INTERIOR",platforms:["IG","FB"],ctype:"Reel",         seriesId:"s5",title:"Design Diaries — 2BHK Mumbai Flat Transformation",          hook:"₹8 lakh. One flat. Complete makeover.",          caption:"#DesignDiaries #Interior",  plannedDate:"2026-03-02",assignee:"Priya S",  status:"PUBLISHED"},
  {id:"i20",brand:"INTERIOR",platforms:["IG","FB"],ctype:"Carousel",     seriesId:"s5",title:"Design Diaries — Japandi Style for Small Spaces",           hook:"Japanese minimalism meets Scandinavian warm...", caption:"#Japandi #InteriorDesign",  plannedDate:"2026-03-09",assignee:"Priya S",  status:"PUBLISHED"},
  {id:"i21",brand:"INTERIOR",platforms:["IG","FB"],ctype:"Reel",         seriesId:"s5",title:"Design Diaries — Biophilic Design on a Budget",             hook:"Plants that cost ₹200 can change your room...",  caption:"#Biophilic #GreenInterior", plannedDate:"2026-03-16",assignee:"Priya S",  status:"FILMING"},
  {id:"i22",brand:"INTERIOR",platforms:["IG","FB"],ctype:"Carousel",     seriesId:"s5",title:"Design Diaries — 5 Mistakes in Small Bedroom Design",       hook:"Stop doing this in your 120 sqft bedroom...",    caption:"#BedroomDesign",            plannedDate:"2026-03-23",assignee:"Priya S",  status:"SCRIPT_DONE"},
  {id:"i23",brand:"INTERIOR",platforms:["IG"],      ctype:"Reel",         seriesId:"s5",title:"Design Diaries — Open Kitchen Trends 2026",                 hook:"Indian kitchens are finally going open plan...", caption:"#KitchenDesign",            plannedDate:"2026-03-30",assignee:"Priya S",  status:"PLANNED"},
  // Square Connect
  {id:"i24",brand:"SQUARE_CONNECT",platforms:["LI","YT"],ctype:"YouTube Video",seriesId:null,title:"How Square Connect Helps Agents Close Deals Faster",  hook:"The average agent wastes 3 hours a day on...",   caption:"#SquareConnect #PropTech",  plannedDate:"2026-03-12",assignee:"Arjun K",  status:"EDITING"},
  {id:"i25",brand:"SQUARE_CONNECT",platforms:["LI"],     ctype:"Carousel",    seriesId:null,title:"5 Tools Every Property Agent Needs in 2026",            hook:"Still using WhatsApp to track leads?",           caption:"#PropTech #Agents",         plannedDate:"2026-03-20",assignee:"Arjun K",  status:"SCRIPTING"},
  {id:"i26",brand:"SQUARE_CONNECT",platforms:["IG","LI"],ctype:"Static",      seriesId:null,title:"Square Connect — March Product Update",                 hook:"New feature: bulk lead assignment is live",      caption:"#ProductUpdate",            plannedDate:"2026-03-25",assignee:"Arjun K",  status:"PLANNED"},
  // UM
  {id:"i27",brand:"UM",platforms:["IG"],      ctype:"Reel",    seriesId:null,title:"UM Realty — Why Gurgaon is Booming Again",                             hook:"Gurgaon Sector 65 just saw a 12% jump...",       caption:"#Gurgaon #UM",              plannedDate:"2026-03-14",assignee:"Anjali T",status:"DELAYED",     delayStage:"Planning", delayReason:"Strategy change",    delayNote:"Topic being revised by management"},
  {id:"i28",brand:"UM",platforms:["IG","LI"],ctype:"Carousel",seriesId:null,title:"UM Realty — Top 3 Projects Under ₹80 Lakh in NCR",                      hook:"You don't need a crore to invest in NCR...",     caption:"#AffordableHousing #NCR",   plannedDate:"2026-03-21",assignee:"Anjali T",status:"PLANNED"},
];

// ── Helpers ───────────────────────────────────────────────────────────────

function BrandBadge({ brand }: { brand: Brand }) {
  const c = BRAND_CFG[brand];
  return <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap", c.bg, c.color)}>{c.label}</span>;
}

function PlatformTag({ p }: { p: string }) {
  return <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{p}</span>;
}

function StatusPill({ status }: { status: Status }) {
  const s = STATUS_MAP[status];
  return <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", s.pill)}>{s.short}</span>;
}

// ── Content card (Pipeline + Month) ──────────────────────────────────────

function ContentCard({ item, onEdit, onDelete }: {
  item: Item; onEdit:(i:Item)=>void; onDelete:(id:string)=>void;
}) {
  const series   = item.seriesId ? SERIES_MAP[item.seriesId] : null;
  const isDelayed = item.status === "DELAYED";
  return (
    <div className={cn("bg-white rounded-xl border p-3 group cursor-pointer hover:shadow-md transition-all",
      isDelayed ? "border-red-300 bg-red-50/30" : "border-gray-200")}
      onClick={() => onEdit(item)}>
      <p className="text-[11px] font-semibold text-gray-800 leading-snug mb-2 line-clamp-2">
        {isDelayed && <AlertTriangle size={9} className="inline text-red-500 mr-0.5"/>}
        {item.title}
      </p>
      <div className="flex flex-wrap gap-1 mb-2">
        <BrandBadge brand={item.brand}/>
        {series && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap"
            style={{color:series.color,backgroundColor:series.color+"15",borderColor:series.color+"40"}}>
            {series.emoji} {series.name}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">{item.platforms.map(p=><PlatformTag key={p} p={p}/>)}</div>
        <span className="text-[10px] text-gray-400">
          {new Date(item.plannedDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-500">👤 {item.assignee}</span>
        <div className="hidden group-hover:flex gap-1" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onEdit(item)} className="text-gray-400 hover:text-accent-500 p-0.5"><Edit2 size={11}/></button>
          <button onClick={()=>onDelete(item.id)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 size={11}/></button>
        </div>
      </div>
      {isDelayed && item.delayReason && (
        <div className="mt-2 text-[10px] text-red-600 bg-red-100 rounded-lg px-2 py-1">
          Stuck: <strong>{item.delayStage}</strong> — {item.delayReason}
        </div>
      )}
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view,      setView]      = useState<"pipeline"|"list"|"month"|"series">("pipeline");
  const [items,     setItems]     = useState<Item[]>(INITIAL_ITEMS);
  const [brandF,    setBrandF]    = useState("all");
  const [platformF, setPlatformF] = useState("all");
  const [statusF,   setStatusF]   = useState("all");
  const [assigneeF, setAssigneeF] = useState("all");
  const [search,    setSearch]    = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<Item|null>(null);
  const [form,      setForm]      = useState<Omit<Item,"id">>({...EMPTY});

  // Filtered items
  const filtered = useMemo(()=>items.filter(i=>{
    if(brandF    !=="all" && i.brand!==brandF)                              return false;
    if(platformF !=="all" && !i.platforms.includes(platformF as Platform))  return false;
    if(statusF   !=="all" && i.status!==statusF)                            return false;
    if(assigneeF !=="all" && i.assignee!==assigneeF)                        return false;
    if(search && !i.title.toLowerCase().includes(search.toLowerCase()))     return false;
    return true;
  }),[items,brandF,platformF,statusF,assigneeF,search]);

  const delayed = items.filter(i=>i.status==="DELAYED");

  // CRUD
  function openCreate() { setForm({...EMPTY}); setEditing(null); setShowForm(true); }

  function openEdit(item: Item) {
    setForm({
      brand:item.brand,platforms:item.platforms,ctype:item.ctype,seriesId:item.seriesId,
      title:item.title,hook:item.hook,caption:item.caption,plannedDate:item.plannedDate,
      assignee:item.assignee,status:item.status,delayStage:item.delayStage,
      delayReason:item.delayReason,delayNote:item.delayNote,
      igLink:item.igLink,ytLink:item.ytLink,liLink:item.liLink,fbLink:item.fbLink,
    });
    setEditing(item); setShowForm(true);
  }

  function saveItem() {
    if(!form.title.trim()) return;
    if(editing) {
      setItems(prev=>prev.map(i=>i.id===editing.id?{...i,...form}:i));
    } else {
      setItems(prev=>[...prev,{id:`i${Date.now()}`,...form}]);
    }
    setShowForm(false);
  }

  function deleteItem(id: string) { setItems(prev=>prev.filter(i=>i.id!==id)); }

  function togglePlatform(p: Platform) {
    setForm(prev=>({...prev,
      platforms:prev.platforms.includes(p)?prev.platforms.filter(x=>x!==p):[...prev.platforms,p]
    }));
  }

  function seriesProgress(s: Series) {
    const all=items.filter(i=>i.seriesId===s.id);
    const published=all.filter(i=>i.status==="PUBLISHED").length;
    const pct=Math.min(100,Math.round((published/s.targetPerMonth)*100));
    return {published,total:all.length,target:s.targetPerMonth,pct};
  }

  // ── PIPELINE VIEW ─────────────────────────────────────────────────────────

  const PipelineView = () => (
    <div className="mt-4 overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {PIPELINE.map(stage=>{
          const stageItems=filtered.filter(i=>i.status===stage.key);
          return (
            <div key={stage.key} className="w-60 shrink-0">
              <div className={cn("rounded-t-xl border px-3 py-2.5 flex items-center justify-between mb-2",stage.col)}>
                <span className="text-xs font-bold text-gray-700">{stage.label}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",stage.pill)}>{stageItems.length}</span>
              </div>
              <div className="space-y-2 min-h-[180px]">
                {stageItems.length===0
                  ? <div className="border-2 border-dashed border-gray-100 rounded-xl p-4 text-center"><p className="text-[10px] text-gray-300">Empty</p></div>
                  : stageItems.map(item=><ContentCard key={item.id} item={item} onEdit={openEdit} onDelete={deleteItem}/>)
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  const ListView = () => (
    <Card className="mt-4 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Brand","Series","Title","Type","Platforms","Date","Assignee","Status",""].map(h=>(
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No content matches these filters.</td></tr>
            )}
            {filtered.map(item=>{
              const series=item.seriesId?SERIES_MAP[item.seriesId]:null;
              const isDelayed=item.status==="DELAYED";
              return (
                <tr key={item.id} onClick={()=>openEdit(item)}
                  className={cn("border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer",isDelayed&&"bg-red-50/20")}>
                  <td className="px-4 py-3"><BrandBadge brand={item.brand}/></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {series
                      ? <span className="text-[10px] font-medium" style={{color:series.color}}>{series.emoji} {series.name}</span>
                      : <span className="text-[10px] text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="font-medium text-gray-800 truncate">
                      {isDelayed&&<AlertTriangle size={10} className="inline text-red-500 mr-1"/>}{item.title}
                    </p>
                    {isDelayed&&item.delayReason&&(
                      <p className="text-[10px] text-red-500 mt-0.5">Stuck: {item.delayStage} — {item.delayReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.ctype}</td>
                  <td className="px-4 py-3"><div className="flex gap-1">{item.platforms.map(p=><PlatformTag key={p} p={p}/>)}</div></td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(item.plannedDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.assignee}</td>
                  <td className="px-4 py-3"><StatusPill status={item.status}/></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>openEdit(item)} className="text-gray-300 hover:text-accent-500 p-1"><Edit2 size={12}/></button>
                      <button onClick={()=>deleteItem(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  // ── MONTH VIEW ────────────────────────────────────────────────────────────

  const MonthView = () => {
    const firstDay=MONTH_DAYS[0].weekday;
    const cells: (typeof MONTH_DAYS[0]|null)[]=[...Array(firstDay).fill(null),...MONTH_DAYS];
    while(cells.length%7!==0) cells.push(null);
    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d=><div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell,idx)=>{
            if(!cell) return <div key={idx} className="h-28 bg-gray-50/30 rounded-xl border border-gray-100"/>;
            const dayItems=filtered.filter(i=>i.plannedDate===cell.date);
            const isToday=cell.day===10;
            return (
              <div key={cell.date} className={cn("h-28 rounded-xl border p-1.5 overflow-hidden",
                isToday?"border-accent-400 bg-accent-50/20":"border-gray-200 bg-white")}>
                <p className={cn("text-[10px] font-bold mb-1",isToday?"text-accent-600":"text-gray-500")}>{cell.day}</p>
                <div className="space-y-0.5 overflow-hidden">
                  {dayItems.slice(0,3).map(item=>{
                    const cfg=BRAND_CFG[item.brand];
                    return (
                      <div key={item.id} onClick={()=>openEdit(item)}
                        className={cn("text-[9px] font-medium px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5",cfg.bg,cfg.color)}>
                        {item.status==="DELAYED"&&<AlertTriangle size={7} className="shrink-0"/>}
                        {item.title.split(" — ")[1]??item.title}
                      </div>
                    );
                  })}
                  {dayItems.length>3&&<p className="text-[9px] text-gray-400 pl-1">+{dayItems.length-3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          {Object.entries(BRAND_CFG).map(([k,v])=>(
            <span key={k} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className={cn("w-2 h-2 rounded-full",v.dot)}/> {v.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ── SERIES VIEW ───────────────────────────────────────────────────────────

  const SeriesView = () => (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {SERIES.map(s=>{
        const {published,total,target,pct}=seriesProgress(s);
        const behind=pct<50;
        const si=items.filter(i=>i.seriesId===s.id);
        return (
          <Card key={s.id} className={cn("p-5",behind&&"border-amber-200")}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{backgroundColor:s.color+"20",border:`2px solid ${s.color}40`}}>
                {s.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                  {behind&&<span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={8}/> Behind</span>}
                </div>
                <p className="text-[10px] text-gray-400">{BRAND_CFG[s.brand].label} · {s.platforms.join(", ")}</p>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-gray-500">Monthly progress</span>
                <span className="font-semibold" style={{color:s.color}}>{published}/{target} published</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full" style={{width:`${pct}%`,backgroundColor:s.color}}/>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {(["SCRIPTING","SCRIPT_DONE","FILMING","EDITING","READY","DELAYED"] as Status[]).map(st=>{
                const count=si.filter(i=>i.status===st).length;
                if(count===0) return null;
                const cfg=STATUS_MAP[st];
                return (
                  <span key={st} className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",cfg.pill)}>
                    {count} {cfg.short}
                  </span>
                );
              })}
            </div>
            <div className="flex gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><Target size={9}/> {target}/month</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={9}/> {total} planned</span>
              <span className="flex items-center gap-1"><Clock size={9}/> {total-published} in progress</span>
            </div>
          </Card>
        );
      })}
    </div>
  );

  // ── FORM MODAL ────────────────────────────────────────────────────────────

  const FormModal = () => (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{editing?"Edit Content":"Add New Content"}</h3>
          <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">

          {/* Brand + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Brand *</label>
              <select value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value as Brand}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                {Object.entries(BRAND_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Status</label>
              <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as Status}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                {STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Platforms *</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p=>(
                <button key={p} type="button" onClick={()=>togglePlatform(p as Platform)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    form.platforms.includes(p as Platform)?"bg-accent-500 text-white border-accent-500":"bg-white text-gray-500 border-gray-200")}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Content type + Series */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Content Type</label>
              <select value={form.ctype} onChange={e=>setForm(p=>({...p,ctype:e.target.value as CType}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                {CTYPES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Series (optional)</label>
              <select value={form.seriesId??""} onChange={e=>setForm(p=>({...p,seriesId:e.target.value||null}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                <option value="">No series</option>
                {SERIES.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Title *</label>
            <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
              placeholder="e.g. She Leads — Priya's Journey from Agent to Director"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
          </div>

          {/* Hook + Caption */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Opening Hook</label>
              <input value={form.hook} onChange={e=>setForm(p=>({...p,hook:e.target.value}))}
                placeholder="First line that grabs attention..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Caption / Hashtags</label>
              <input value={form.caption} onChange={e=>setForm(p=>({...p,caption:e.target.value}))}
                placeholder="#hashtags and caption..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
            </div>
          </div>

          {/* Date + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Planned Date *</label>
              <input type="date" value={form.plannedDate} onChange={e=>setForm(p=>({...p,plannedDate:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Assignee</label>
              <select value={form.assignee} onChange={e=>setForm(p=>({...p,assignee:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                {ASSIGNEES.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Delay fields */}
          {form.status==="DELAYED"&&(
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-red-700">🚨 Delay Details — Where exactly is it stuck?</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-600 block mb-1">Stuck at Stage</label>
                  <select value={form.delayStage??""} onChange={e=>setForm(p=>({...p,delayStage:e.target.value}))}
                    className="w-full border border-red-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">Select stage…</option>
                    {["Planning","Scripting","Filming","Editing","Approval","Publishing"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600 block mb-1">Reason</label>
                  <select value={form.delayReason??""} onChange={e=>setForm(p=>({...p,delayReason:e.target.value}))}
                    className="w-full border border-red-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="">Select reason…</option>
                    {DELAY_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <input value={form.delayNote??""} onChange={e=>setForm(p=>({...p,delayNote:e.target.value}))}
                placeholder="What happened and what's the new plan?"
                className="w-full border border-red-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"/>
            </div>
          )}

          {/* Published links */}
          {form.status==="PUBLISHED"&&(
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-green-700">✅ Published Links</p>
              <div className="grid grid-cols-2 gap-3">
                {(["igLink","ytLink","liLink","fbLink"] as const).map((k,i)=>(
                  <div key={k}>
                    <label className="text-[11px] font-medium text-gray-600 block mb-1">{["Instagram","YouTube","LinkedIn","Facebook"][i]}</label>
                    <input value={(form as any)[k]??""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                      placeholder="https://..."
                      className="w-full border border-green-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <button onClick={()=>setShowForm(false)}
            className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={saveItem}
            className="flex-1 bg-accent-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-accent-600">
            {editing?"Save Changes":"Add to Calendar"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="Content Calendar"
        subtitle={`March 2026 · ${items.length} pieces planned · ${delayed.length>0?`⚠️ ${delayed.length} delayed`:"✅ On track"}`}
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-accent-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-600">
            <Plus size={15}/> Add Content
          </button>
        }
      />

      {/* Delay alert banner */}
      {delayed.length>0&&(
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-2 mb-2">
            <AlertTriangle size={14}/> {delayed.length} piece{delayed.length>1?"s":""} delayed — click to see where each is stuck
          </p>
          <div className="flex flex-wrap gap-2">
            {delayed.map(d=>(
              <button key={d.id} onClick={()=>openEdit(d)}
                className="text-[11px] bg-white border border-red-200 text-red-700 px-3 py-1 rounded-lg hover:bg-red-100 flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full shrink-0",BRAND_CFG[d.brand].dot)}/>
                {d.title.length>45?d.title.slice(0,45)+"…":d.title}
                {d.delayStage&&<span className="opacity-60 ml-1">· Stuck: {d.delayStage}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View toggle + filters */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            {key:"pipeline",label:"Pipeline"},
            {key:"list",    label:"List"},
            {key:"month",   label:"Month"},
            {key:"series",  label:"Series & Targets"},
          ].map(v=>(
            <button key={v.key} onClick={()=>setView(v.key as any)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                view===v.key?"bg-white text-accent-600 shadow-sm":"text-gray-500 hover:text-gray-700")}>
              {v.label}
            </button>
          ))}
        </div>

        {view!=="series"&&(
          <>
            <Select value={brandF}    onChange={v=>setBrandF(v)}    options={BRANDS}  className="w-36"/>
            <Select value={platformF} onChange={v=>setPlatformF(v)} className="w-28"
              options={[{value:"all",label:"All Platforms"},...PLATFORMS.map(p=>({value:p,label:p}))]}/>
            <Select value={statusF}   onChange={v=>setStatusF(v)}   className="w-36"
              options={[{value:"all",label:"All Statuses"},...STATUSES]}/>
            <Select value={assigneeF} onChange={v=>setAssigneeF(v)} className="w-36"
              options={[{value:"all",label:"All Assignees"},...ASSIGNEES.map(a=>({value:a,label:a}))]}/>
            <div className="relative ml-auto">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-accent-500 w-44"/>
            </div>
          </>
        )}
      </div>

      {view==="pipeline" && <PipelineView/>}
      {view==="list"     && <ListView/>}
      {view==="month"    && <MonthView/>}
      {view==="series"   && <SeriesView/>}

      {showForm && <FormModal/>}
    </>
  );
}
