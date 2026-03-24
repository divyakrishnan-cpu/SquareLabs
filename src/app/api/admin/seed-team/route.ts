import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// ── Team data (mirrors prisma/seed-team.ts) ───────────────────────────────
const TEAM_ACCESS: Record<string, string[]> = {
  "Design":                ["DASHBOARD","DESIGN_OPS"],
  "Video":                 ["DASHBOARD","DESIGN_OPS"],
  "Socials":               ["DASHBOARD","SOCIAL"],
  "Content":               ["DASHBOARD","SOCIAL"],
  "PR":                    ["DASHBOARD","SOCIAL"],
  "SEO":                   ["DASHBOARD"],
  "Performance Marketing": ["DASHBOARD"],
  "Azuro":                 ["DASHBOARD"],
  "Product":               ["DASHBOARD"],
  "Web Marketing":         ["DASHBOARD"],
  "Branding":              ["DASHBOARD"],
  "Head":                  ["DASHBOARD","SOCIAL","DESIGN_OPS","GMB","PORTALS","SETTINGS","TEAM_HUB"],
};

function getRole(level: string): string {
  if (level === "SP&L") return "ADMIN";
  if (level === "S3")   return "HEAD_OF_MARKETING";
  if (level === "S2")   return "TEAM_LEAD";
  return "TEAM_MEMBER";
}

function makeEmail(name: string, code: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  let local = parts.length === 1
    ? parts[0]
    : `${parts[0]}.${parts[parts.length - 1]}`;
  local = local.replace(/[^a-z0-9.]/g, "");
  return `${local}@squareyards.com`;
}

function makeTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "SQ@";
  for (let i = 0; i < 7; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

const TEAM = [
  { code:"SQY44089", name:"Divya Krishnan",              level:"SP&L", designation:"Head of Design",                               team:"Head" },
  { code:"SBL0055",  name:"Lalit Bhardwaj",              level:"S3",   designation:"AVP - Brand Design",                            team:"Design" },
  { code:"SDC4035",  name:"Sukhmani",                    level:"S3",   designation:"Associate Vice President",                      team:"Socials" },
  { code:"SQY59401", name:"Sunita Mishra",               level:"S3",   designation:"Content Strategy Head",                         team:"Content" },
  { code:"SBL0105",  name:"Rohit Rajoriya",              level:"S2",   designation:"Senior Manager",                                team:"Azuro" },
  { code:"SDC5674",  name:"Vikesh Verma",                level:"S2",   designation:"Associate General Manager - SEO",               team:"SEO" },
  { code:"SQY35817", name:"Abhishek Kumar Singh",        level:"S2",   designation:"Associate General Manager - SEO",               team:"SEO" },
  { code:"SDC4564",  name:"Sunita Kumari",               level:"S2",   designation:"Manager - Brand Design",                        team:"Design" },
  { code:"SDC4682",  name:"Sandeep Chaurasia",           level:"S2",   designation:"Brand Design Lead",                             team:"Design" },
  { code:"SDC4963",  name:"Divya Garg",                  level:"S2",   designation:"Manager - Brand Design",                        team:"Design" },
  { code:"SDC5595",  name:"Kunal Sachdeva",              level:"S2",   designation:"Associate General Manager - Content",           team:"Content" },
  { code:"SQY56122", name:"Paramjeet",                   level:"S2",   designation:"Manager Performance Marketing",                 team:"Performance Marketing" },
  { code:"SQY56101", name:"Sudhir",                      level:"S2",   designation:"Manager Performance Marketing",                 team:"Performance Marketing" },
  { code:"SQY58651", name:"Mitesh Kumar Singh",          level:"S2",   designation:"Associate General Manager - SEO",               team:"SEO" },
  { code:"SQY58858", name:"Abheet Chawla",               level:"S2",   designation:"Content Manager",                               team:"Content" },
  { code:"SQY59015", name:"Manish Kumar Sharma",         level:"S2",   designation:"AI Video Creator and Editor",                   team:"Video" },
  { code:"SQY59542", name:"Shivam Chanana",              level:"S2",   designation:"Associate General Manager - SEO",               team:"Branding" },
  { code:"SQY60597", name:"Vishesh Paliwal",             level:"S2",   designation:"Marketing Lead",                                team:"SEO" },
  { code:"SDC5405",  name:"Ashish Singh",                level:"S1",   designation:"Product Manager",                               team:"Product" },
  { code:"SBL0065",  name:"Nitin Kumar",                 level:"S1",   designation:"Manager - SEO",                                 team:"SEO" },
  { code:"SDC5026",  name:"Shiv Kumar Gupta",            level:"S1",   designation:"Manager - SEO",                                 team:"SEO" },
  { code:"SDC5216",  name:"Gaurav Dhiman",               level:"S1",   designation:"SEO Executive",                                 team:"SEO" },
  { code:"SDC5596",  name:"Vimal Vijayan",               level:"S1",   designation:"Senior Content Editor",                         team:"Content" },
  { code:"SBL2166",  name:"Supriya Boruah",              level:"S1",   designation:"Senior Executive - Marketing",                  team:"Azuro" },
  { code:"SQY36075", name:"Karan Deep",                  level:"S1",   designation:"Web Developer",                                 team:"Performance Marketing" },
  { code:"SQY38120", name:"Ankur Rawat",                 level:"S1",   designation:"Associate Manager - CMS",                       team:"SEO" },
  { code:"SBL2609",  name:"Chaitali Sudhir Manjrekar",  level:"S1",   designation:"Marketing Executive",                           team:"Azuro" },
  { code:"SBL2638",  name:"Shweta Tawade",               level:"S1",   designation:"Marketing Executive",                           team:"Azuro" },
  { code:"SQY42700", name:"Rishabh Baisoy",              level:"S1",   designation:"Senior Content Writer",                         team:"Content" },
  { code:"SQY46789", name:"Shubham Sandhu",              level:"S1",   designation:"Content Writer",                                team:"Content" },
  { code:"SQY46790", name:"Thejus K S",                  level:"S1",   designation:"Content Writer",                                team:"Content" },
  { code:"SQY51435", name:"Rahul Gautam",                level:"S1",   designation:"Content Writer",                                team:"Content" },
  { code:"SDC6287",  name:"John Westly Antony",          level:"S1",   designation:"Senior Videographer and Editor",                team:"Video" },
  { code:"SQY54135", name:"Bhavika Anant Modsing",       level:"S1",   designation:"Marketing Executive",                           team:"Azuro" },
  { code:"SQY54136", name:"Devansh Sharma",              level:"S1",   designation:"Associate Manager - Google Analytics",          team:"SEO" },
  { code:"SQY54370", name:"Ritika Tyagi",                level:"S1",   designation:"Marketing Executive",                           team:"Socials" },
  { code:"SQY55352", name:"Bharath Subramani",           level:"S1",   designation:"Senior Executive - Performance Marketing",      team:"Performance Marketing" },
  { code:"SQY55706", name:"Aaryan Sharma",               level:"S1",   designation:"Social Media Executive",                        team:"Socials" },
  { code:"SQY55707", name:"Ankit Rawat",                 level:"S1",   designation:"Senior Video Editor",                           team:"Video" },
  { code:"SQY55708", name:"Prakriti Singh",              level:"S1",   designation:"Social Media Executive",                        team:"Socials" },
  { code:"SQY55953", name:"Abhay Gupta",                 level:"S1",   designation:"Senior Videographer and Editor",                team:"Video" },
  { code:"SQY55954", name:"Namita Aggarwal",             level:"S1",   designation:"Senior Graphic Designer",                       team:"Design" },
  { code:"SQY56333", name:"Parth Sharma",                level:"S1",   designation:"Marketing Lead",                                team:"Socials" },
  { code:"SDC6596",  name:"Sakshi Saxena",               level:"S1",   designation:"Senior Manager: Research and Media Outreach",   team:"PR" },
  { code:"SQY59196", name:"Abigail Venessa Simmons",     level:"S1",   designation:"Content Writer",                                team:"Content" },
  { code:"SQY59215", name:"Drishti Katyal",              level:"S1",   designation:"Content Writer",                                team:"Content" },
  { code:"SQY59407", name:"Muskan Shafi",                level:"S1",   designation:"Senior Content Writer",                         team:"Content" },
  { code:"SQY58916", name:"Rahul Chatterjee",            level:"S1",   designation:"Video Editor",                                  team:"Video" },
  { code:"SQY60167", name:"Chinmay Gaur",                level:"S1",   designation:"Generative Engine Optimization",                team:"SEO" },
  { code:"SIN3939",  name:"Raj Gaurav",                  level:"S0",   designation:"Intern",                                        team:"Design" },
  { code:"SQY56416", name:"Garima Banwala",              level:"S0",   designation:"Senior Graphic Designer",                       team:"Design" },
  { code:"SQY56773", name:"Akash Bhatt",                 level:"S0",   designation:"Video Editor",                                  team:"Video" },
  { code:"SQY56974", name:"Ashish Kumar",                level:"T0",   designation:"Senior Investment Manager",                     team:"Socials" },
  { code:"SQY57146", name:"Piyush Sharma",               level:"S0",   designation:"Marketing Executive",                           team:"Socials" },
  { code:"SQY57180", name:"Rishabh Singh",               level:"S0",   designation:"Graphic Designer",                              team:"Design" },
  { code:"SQY57973", name:"Sidharth Bharti",             level:"S0",   designation:"Graphic Designer",                              team:"Design" },
  { code:"SQY58633", name:"Pranjal Sapra",               level:"S0",   designation:"Senior Content Writer",                         team:"Socials" },
  { code:"SIN3981",  name:"Diva Bindal",                 level:"SE",   designation:"Intern",                                        team:"Socials" },
  { code:"SQY59715", name:"Aditi Arora",                 level:"S0",   designation:"Marketing Executive",                           team:"Socials" },
  { code:"SQY59917", name:"Jyotsna Santosh Chudji",     level:"S0",   designation:"Marketing Executive",                           team:"Azuro" },
  { code:"SQY59928", name:"Tanishka Jamwal",             level:"S0",   designation:"Marketing Executive",                           team:"Web Marketing" },
  { code:"SIN3991",  name:"Aditya Kumar Mishra",         level:"S0",   designation:"SEO Intern",                                    team:"SEO" },
  { code:"SIN3994",  name:"Prateek Jain",                level:"S0",   designation:"Intern",                                        team:"SEO" },
  { code:"SQY60210", name:"Riddhi Chatterji",            level:"S0",   designation:"Content Writer",                                team:"PR" },
  { code:"SQY60413", name:"Abhilasa Bhattacharya",       level:"S0",   designation:"Senior Marketing Strategist",                   team:"Socials" },
  { code:"SQY60437", name:"Simran Shankar",              level:"S0",   designation:"Marketing Executive",                           team:"Socials" },
  { code:"SQY60797", name:"Dhruv Thakur",                level:"S0",   designation:"Copy Lead",                                     team:"Branding" },
];

export async function POST(req: Request) {
  // Must be authenticated as ADMIN
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!session || !["ADMIN","HEAD_OF_MARKETING"].includes(user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: { name: string; email: string; role: string; team: string; tempPassword: string; status: string }[] = [];
  const usedEmails = new Set<string>();

  // Pre-load existing emails so we don't overwrite passwords
  const existing = await (db.user as any).findMany({ select: { email: true } });
  existing.forEach((u: any) => usedEmails.add(u.email));

  for (const member of TEAM) {
    let email = makeEmail(member.name, member.code);
    // Deduplicate
    if (usedEmails.has(email) && !existing.find((u: any) => u.email === email)) {
      const [local, domain] = email.split("@");
      email = `${local}.${member.code.toLowerCase()}@${domain}`;
    }

    const role           = getRole(member.level);
    const accessSections = TEAM_ACCESS[member.team] ?? ["DASHBOARD"];
    const tempPassword   = makeTempPassword();
    const hashedPwd      = await bcrypt.hash(tempPassword, 10);

    const alreadyExists = existing.find((u: any) => u.email === email);

    try {
      await (db.user as any).upsert({
        where:  { email },
        create: { name: member.name, email, password: hashedPwd, role, department: member.team, accessSections, isActive: true },
        // Don't overwrite password for existing users; always sync role + sections
        update: { name: member.name, role, department: member.team, accessSections, isActive: true },
      });

      results.push({
        name: member.name, email, role, team: member.team,
        tempPassword: alreadyExists ? "(existing — unchanged)" : tempPassword,
        status: alreadyExists ? "updated" : "created",
      });
    } catch (err: any) {
      results.push({ name: member.name, email, role, team: member.team, tempPassword: "", status: `error: ${err.message}` });
    }
  }

  const created = results.filter(r => r.status === "created").length;
  const updated = results.filter(r => r.status === "updated").length;
  const errors  = results.filter(r => r.status.startsWith("error")).length;

  return NextResponse.json({ summary: { total: TEAM.length, created, updated, errors }, results });
}
