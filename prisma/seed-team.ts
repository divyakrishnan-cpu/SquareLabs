/**
 * Team seed script — Square Labs
 * Run with: npx tsx prisma/seed-team.ts
 * Requires DATABASE_URL in your .env file pointing to the Neon DB.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// ── Access section mapping per team ───────────────────────────────────────
const TEAM_ACCESS: Record<string, string[]> = {
  "Design":               ["DASHBOARD","DESIGN_OPS"],
  "Video":                ["DASHBOARD","DESIGN_OPS"],
  "Socials":              ["DASHBOARD","SOCIAL"],
  "Content":              ["DASHBOARD","SOCIAL"],
  "PR":                   ["DASHBOARD","SOCIAL"],
  "SEO":                  ["DASHBOARD"],
  "Performance Marketing":["DASHBOARD"],
  "Azuro":                ["DASHBOARD"],
  "Product":              ["DASHBOARD"],
  "Web Marketing":        ["DASHBOARD"],
  "Branding":             ["DASHBOARD"],
  "Head":                 ["DASHBOARD","SOCIAL","DESIGN_OPS","GMB","PORTALS","SETTINGS","TEAM_HUB"],
};

// ── Role mapping by level ─────────────────────────────────────────────────
function getRole(level: string, team: string): string {
  if (level === "SP&L") return "ADMIN";
  if (level === "S3")   return "HEAD_OF_MARKETING";
  if (level === "S2")   return "TEAM_LEAD";
  return "TEAM_MEMBER";
}

// ── Email constructor ─────────────────────────────────────────────────────
function makeEmail(name: string, code: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  let local: string;
  if (parts.length === 1) {
    local = parts[0];
  } else if (parts.length === 2) {
    local = `${parts[0]}.${parts[parts.length - 1]}`;
  } else {
    // 3+ parts — use first and last
    local = `${parts[0]}.${parts[parts.length - 1]}`;
  }
  // sanitise
  local = local.replace(/[^a-z0-9.]/g, "");
  return `${local}@squareyards.com`;
}

// ── Password generator ────────────────────────────────────────────────────
function makeTempPassword(code: string): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "SQ@";
  for (let i = 0; i < 7; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// ── Team data ─────────────────────────────────────────────────────────────
const TEAM = [
  { code:"SQY44089", name:"Divya Krishnan",              level:"SP&L", designation:"Head of Design",                               dept:"Marketing", team:"Head",                supervisor:"SYME001" },
  { code:"SBL0055",  name:"Lalit Bhardwaj",              level:"S3",   designation:"AVP - Brand Design",                            dept:"Marketing", team:"Design",              supervisor:"SQY44089" },
  { code:"SDC4035",  name:"Sukhmani",                    level:"S3",   designation:"Associate Vice President",                      dept:"Marketing", team:"Socials",             supervisor:"SQY44089" },
  { code:"SQY59401", name:"Sunita Mishra",               level:"S3",   designation:"Content Strategy Head",                         dept:"Marketing", team:"Content",             supervisor:"SQY44089" },
  { code:"SBL0105",  name:"Rohit Rajoriya",              level:"S2",   designation:"Senior Manager",                                dept:"Marketing", team:"Azuro",               supervisor:"SQY44089" },
  { code:"SDC5674",  name:"Vikesh Verma",                level:"S2",   designation:"Associate General Manager - SEO",               dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SQY35817", name:"Abhishek Kumar Singh",        level:"S2",   designation:"Associate General Manager - SEO",               dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SDC4564",  name:"Sunita Kumari",               level:"S2",   designation:"Manager - Brand Design",                        dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SDC4682",  name:"Sandeep Chaurasia",           level:"S2",   designation:"Brand Design Lead",                             dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SDC4963",  name:"Divya Garg",                  level:"S2",   designation:"Manager - Brand Design",                        dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SDC5595",  name:"Kunal Sachdeva",              level:"S2",   designation:"Associate General Manager - Content",           dept:"Marketing", team:"Content",             supervisor:"SQY59401" },
  { code:"SQY56122", name:"Paramjeet",                   level:"S2",   designation:"Manager Performance Marketing",                 dept:"Marketing", team:"Performance Marketing",supervisor:"SQY44089" },
  { code:"SQY56101", name:"Sudhir",                      level:"S2",   designation:"Manager Performance Marketing",                 dept:"Marketing", team:"Performance Marketing",supervisor:"SQY56122" },
  { code:"SQY58651", name:"Mitesh Kumar Singh",          level:"S2",   designation:"Associate General Manager - SEO",               dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SQY58858", name:"Abheet Chawla",               level:"S2",   designation:"Content Manager",                               dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SQY59015", name:"Manish Kumar Sharma",         level:"S2",   designation:"AI Video Creator and Editor",                   dept:"Marketing", team:"Video",               supervisor:"SBL0055"  },
  { code:"SQY59542", name:"Shivam Chanana",              level:"S2",   designation:"Associate General Manager - SEO",               dept:"Marketing", team:"Branding",            supervisor:"SQY44089" },
  { code:"SQY60597", name:"Vishesh Paliwal",             level:"S2",   designation:"Marketing Lead",                                dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SDC5405",  name:"Ashish Singh",                level:"S1",   designation:"Product Manager",                               dept:"Marketing", team:"Product",             supervisor:"SQY44089" },
  { code:"SBL0065",  name:"Nitin Kumar",                 level:"S1",   designation:"Manager - SEO",                                 dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SDC5026",  name:"Shiv Kumar Gupta",            level:"S1",   designation:"Manager - SEO",                                 dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SDC5216",  name:"Gaurav Dhiman",               level:"S1",   designation:"SEO Executive",                                 dept:"Marketing", team:"SEO",                 supervisor:"SDC5674"  },
  { code:"SDC5596",  name:"Vimal Vijayan",               level:"S1",   designation:"Senior Content Editor",                         dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SBL2166",  name:"Supriya Boruah",              level:"S1",   designation:"Senior Executive - Marketing",                  dept:"Marketing", team:"Azuro",               supervisor:"SBL0105"  },
  { code:"SQY36075", name:"Karan Deep",                  level:"S1",   designation:"Web Developer",                                 dept:"Marketing", team:"Performance Marketing",supervisor:"SQY56122" },
  { code:"SQY38120", name:"Ankur Rawat",                 level:"S1",   designation:"Associate Manager - CMS",                       dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SBL2609",  name:"Chaitali Sudhir Manjrekar",  level:"S1",   designation:"Marketing Executive",                           dept:"Marketing", team:"Azuro",               supervisor:"SBL0105"  },
  { code:"SBL2638",  name:"Shweta Tawade",               level:"S1",   designation:"Marketing Executive",                           dept:"Marketing", team:"Azuro",               supervisor:"SBL0105"  },
  { code:"SQY42700", name:"Rishabh Baisoy",              level:"S1",   designation:"Senior Content Writer",                         dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SQY46789", name:"Shubham Sandhu",              level:"S1",   designation:"Content Writer",                                dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SQY46790", name:"Thejus K S",                  level:"S1",   designation:"Content Writer",                                dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SQY51435", name:"Rahul Gautam",                level:"S1",   designation:"Content Writer",                                dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SDC6287",  name:"John Westly Antony",          level:"S1",   designation:"Senior Videographer and Editor",                dept:"Marketing", team:"Video",               supervisor:"SBL0055"  },
  { code:"SQY54135", name:"Bhavika Anant Modsing",       level:"S1",   designation:"Marketing Executive",                           dept:"Marketing", team:"Azuro",               supervisor:"SBL0105"  },
  { code:"SQY54136", name:"Devansh Sharma",              level:"S1",   designation:"Associate Manager - Google Analytics",          dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SQY54370", name:"Ritika Tyagi",                level:"S1",   designation:"Marketing Executive",                           dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY55352", name:"Bharath Subramani",           level:"S1",   designation:"Senior Executive - Performance Marketing",      dept:"Marketing", team:"Performance Marketing",supervisor:"SQY44089" },
  { code:"SQY55706", name:"Aaryan Sharma",               level:"S1",   designation:"Social Media Executive",                        dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY55707", name:"Ankit Rawat",                 level:"S1",   designation:"Senior Video Editor",                           dept:"Marketing", team:"Video",               supervisor:"SBL0055"  },
  { code:"SQY55708", name:"Prakriti Singh",              level:"S1",   designation:"Social Media Executive",                        dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY55953", name:"Abhay Gupta",                 level:"S1",   designation:"Senior Videographer and Editor",                dept:"Marketing", team:"Video",               supervisor:"SBL0055"  },
  { code:"SQY55954", name:"Namita Aggarwal",             level:"S1",   designation:"Senior Graphic Designer",                       dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SQY56333", name:"Parth Sharma",                level:"S1",   designation:"Marketing Lead",                                dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SDC6596",  name:"Sakshi Saxena",               level:"S1",   designation:"Senior Manager: Research and Media Outreach",   dept:"Marketing", team:"PR",                  supervisor:"SQY59401" },
  { code:"SQY59196", name:"Abigail Venessa Simmons",     level:"S1",   designation:"Content Writer",                                dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SQY59215", name:"Drishti Katyal",              level:"S1",   designation:"Content Writer",                                dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SQY59407", name:"Muskan Shafi",                level:"S1",   designation:"Senior Content Writer",                         dept:"Marketing", team:"Content",             supervisor:"SDC5595"  },
  { code:"SQY58916", name:"Rahul Chatterjee",            level:"S1",   designation:"Video Editor",                                  dept:"Marketing", team:"Video",               supervisor:"SBL0055"  },
  { code:"SQY60167", name:"Chinmay Gaur",                level:"S1",   designation:"Generative Engine Optimization",                dept:"Marketing", team:"SEO",                 supervisor:"SQY44089" },
  { code:"SIN3939",  name:"Raj Gaurav",                  level:"S0",   designation:"Intern",                                        dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SQY56416", name:"Garima Banwala",              level:"S0",   designation:"Senior Graphic Designer",                       dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SQY56773", name:"Akash Bhatt",                 level:"S0",   designation:"Video Editor",                                  dept:"Marketing", team:"Video",               supervisor:"SBL0055"  },
  { code:"SQY56974", name:"Ashish Kumar",                level:"T0",   designation:"Senior Investment Manager",                     dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY57146", name:"Piyush Sharma",               level:"S0",   designation:"Marketing Executive",                           dept:"Marketing", team:"Socials",             supervisor:"SQY56333" },
  { code:"SQY57180", name:"Rishabh Singh",               level:"S0",   designation:"Graphic Designer",                              dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SQY57973", name:"Sidharth Bharti",             level:"S0",   designation:"Graphic Designer",                              dept:"Marketing", team:"Design",              supervisor:"SBL0055"  },
  { code:"SQY58633", name:"Pranjal Sapra",               level:"S0",   designation:"Senior Content Writer",                         dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SIN3981",  name:"Diva Bindal",                 level:"SE",   designation:"Intern",                                        dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY59715", name:"Aditi Arora",                 level:"S0",   designation:"Marketing Executive",                           dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY59917", name:"Jyotsna Santosh Chudji",     level:"S0",   designation:"Marketing Executive",                           dept:"Marketing", team:"Azuro",               supervisor:"SBL0105"  },
  { code:"SQY59928", name:"Tanishka Jamwal",             level:"S0",   designation:"Marketing Executive",                           dept:"Marketing", team:"Web Marketing",       supervisor:"SDC5405"  },
  { code:"SIN3991",  name:"Aditya Kumar Mishra",         level:"S0",   designation:"SEO Intern",                                    dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SIN3994",  name:"Prateek Jain",                level:"S0",   designation:"Intern",                                        dept:"Marketing", team:"SEO",                 supervisor:"SQY59542" },
  { code:"SQY60210", name:"Riddhi Chatterji",            level:"S0",   designation:"Content Writer",                                dept:"Marketing", team:"PR",                  supervisor:"SQY59401" },
  { code:"SQY60413", name:"Abhilasa Bhattacharya",       level:"S0",   designation:"Senior Marketing Strategist",                   dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY60437", name:"Simran Shankar",              level:"S0",   designation:"Marketing Executive",                           dept:"Marketing", team:"Socials",             supervisor:"SDC4035"  },
  { code:"SQY60797", name:"Dhruv Thakur",                level:"S0",   designation:"Copy Lead",                                     dept:"Marketing", team:"Branding",            supervisor:"SQY44089" },
];

async function main() {
  console.log(`\n🚀 Seeding ${TEAM.length} team members...\n`);

  const credentials: { name: string; email: string; employeeCode: string; role: string; team: string; designation: string; tempPassword: string }[] = [];

  // Track used emails to handle duplicates
  const usedEmails = new Set<string>();

  for (const member of TEAM) {
    let email = makeEmail(member.name, member.code);

    // Handle duplicate emails by appending employee code suffix
    if (usedEmails.has(email)) {
      const [local, domain] = email.split("@");
      email = `${local}.${member.code.toLowerCase()}@${domain}`;
    }
    usedEmails.add(email);

    const tempPassword = makeTempPassword(member.code);
    const hashedPwd    = await bcrypt.hash(tempPassword, 10);
    const role         = getRole(member.level, member.team);
    const accessSections = TEAM_ACCESS[member.team] ?? ["DASHBOARD"];

    try {
      await (prisma.user as any).upsert({
        where:  { email },
        create: {
          name:           member.name,
          email,
          password:       hashedPwd,
          role,
          department:     member.team,
          accessSections,
          isActive:       true,
        },
        update: {
          name:           member.name,
          role,
          department:     member.team,
          accessSections,
          isActive:       true,
        },
      });

      credentials.push({
        name:         member.name,
        email,
        employeeCode: member.code,
        role,
        team:         member.team,
        designation:  member.designation,
        tempPassword: tempPassword,
      });

      const icon = role === "ADMIN" ? "🛡️" : role === "HEAD_OF_MARKETING" ? "⭐" : role === "TEAM_LEAD" ? "👑" : "👤";
      console.log(`  ${icon} ${member.name.padEnd(35)} ${email.padEnd(42)} ${tempPassword}`);
    } catch (err: any) {
      console.error(`  ❌ Failed: ${member.name} — ${err.message}`);
    }
  }

  // Write credentials CSV
  const csvLines = [
    "Name,Email,EmployeeCode,Role,Team,Designation,TempPassword",
    ...credentials.map(c =>
      `"${c.name}","${c.email}","${c.employeeCode}","${c.role}","${c.team}","${c.designation}","${c.tempPassword}"`
    ),
  ];
  const csvPath = path.join(__dirname, "../team-credentials.csv");
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf-8");

  console.log(`\n✅ ${credentials.length} users seeded successfully.`);
  console.log(`📄 Credentials saved to: team-credentials.csv\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
