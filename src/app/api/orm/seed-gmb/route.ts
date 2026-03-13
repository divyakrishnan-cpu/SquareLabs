/**
 * POST /api/orm/seed-gmb
 *
 * Seeds all GMB locations and their historical monthly rating snapshots
 * parsed from the "ORM - Marketing" Google Doc.
 *
 * Safe to re-run — uses upsert. Requires admin login.
 */

import { NextResponse }  from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }   from "@/lib/auth";
import { db as prisma }  from "@/lib/db";
import crypto            from "crypto";

// ── Historical ratings from the Google Doc ────────────────────────────────
// Columns: [Oct, Nov, Dec, Jan, Feb, Mar]  (null = no data for that month)
// Baseline Sep is stored as the starting point.

type MonthlyRatings = {
  baselineSep: number | null;
  oct: number | null; nov: number | null; dec: number | null;
  jan: number | null; feb: number | null; mar: number | null;
};

type GmbEntry = {
  business:     string;
  city:         string;
  country:      string;
  name:         string;
  address:      string;
  gmbUrl:       string;
  mapsUrl:      string | null;  // Short maps.app.goo.gl URL for WhatsApp reports
  displayLabel: string | null;  // Override city name in reports, e.g. "Mumbai (Andheri East)"
  handledBy:    string | null;
  status:       "active" | "permanently_closed";
  ratings:      MonthlyRatings;
};

const GMB_DATA: GmbEntry[] = [
  // ── Azuro ────────────────────────────────────────────────────────────────
  {
    business: "Azuro", city: "Mumbai", country: "India",
    name: "Azuro",
    address: "Ackruti Star, 3rd Floor, MIDC Central Road, Andheri East, Mumbai, Maharashtra 400093, India",
    gmbUrl: "https://business.google.com/n/2049463783864684473/profile?fid=9435347206414005232",
    mapsUrl: "https://maps.app.goo.gl/mLLQmoFkx72B2n7W6", displayLabel: null,
    handledBy: "Internal", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },

  // ── Interior Company (INCO) ───────────────────────────────────────────────
  {
    business: "Interior Company", city: "Bengaluru", country: "India",
    name: "Interior Company Design Studio HSR Layout",
    address: "APR Enclave, 379, 5th Main Road, beside Rajesh jewellery, Sector 6, HSR Layout, Bengaluru, Karnataka 560102, India",
    gmbUrl: "https://business.google.com/n/3733782260412662111/profile?fid=363404647299343071",
    mapsUrl: "https://maps.app.goo.gl/etb8UjZY5StmPZdd7", displayLabel: "Bangalore HSR",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Chennai", country: "India",
    name: "Interior Company Design Studio, Chennai",
    address: "Rattha tek towers SY Interiors Pvt Ltd Ground floor No 11, Rajiv Gandhi IT Expy, Customs Colony, Mettukuppam, Thoraipakkam, Tamil Nadu 600097, India",
    gmbUrl: "https://business.google.com/n/14195586128744779324/profile?fid=9196507873406838531",
    mapsUrl: "https://goo.gl/maps/ES2DWjHMX8NsqVGs8", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.2, nov: 4.2, dec: 4.3, jan: 4.3, feb: 4.3, mar: 4.3 },
  },
  {
    business: "Interior Company", city: "Dubai", country: "UAE",
    name: "Interior Company Design Studio, Dubai",
    address: "Office No. 2501, 17th Floor, Tecom - Sheikh Zayed Road, Tecom, Dubai, United Arab Emirates",
    gmbUrl: "https://business.google.com/n/10708310509309270923/profile?fid=14550424438389388567",
    mapsUrl: "https://goo.gl/maps/1tJbUx8PZGssaHnk9", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.2, nov: 4.1, dec: 4.1, jan: 4.1, feb: 4.1, mar: 4.1 },
  },
  {
    business: "Interior Company", city: "Gurgaon", country: "India",
    name: "Interior Company Design Studio, Gurgaon",
    address: "2nd Floor, Tower A, M3M Urbana Business Park, Sector 67, near M3M Urbana, Gurgaon, Haryana 122001, India",
    gmbUrl: "https://business.google.com/n/8968593472772323375/profile?fid=12385777057616109827",
    mapsUrl: "https://goo.gl/maps/4ojVcHvAvZUFm7Pu6", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.4, nov: 4.4, dec: 4.3, jan: 4.3, feb: 4.3, mar: 4.4 },
  },
  {
    business: "Interior Company", city: "Hyderabad", country: "India",
    name: "Interior Company Design Studio, Hyderabad Gachibowli",
    address: "Gachibowli, Hyderabad, Telangana, India",
    gmbUrl: "https://business.google.com/n/inco_hyderabad_gachibowli/profile",
    mapsUrl: "https://maps.app.goo.gl/ig6asvu6gpkqdsBs6", displayLabel: "Hyderabad Gachibowli",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Mumbai", country: "India",
    name: "Interior Company Design Studio, Mumbai",
    address: "Unit No.11, First Floor, Chandak Unicorn, New Ambivali CHSL, Dattaji Salve Marg, Off Veera Desai Rd, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053, India",
    gmbUrl: "https://business.google.com/n/13429721285651445978/profile?fid=16816813200712016461",
    mapsUrl: "https://maps.app.goo.gl/BXV7ByinWrr1nXX88", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Noida", country: "India",
    name: "Interior Company Design Studio, Noida",
    address: "B 1 & B2, Sector 1, Gautam Budh Nagar, Noida, Uttar Pradesh 201301, India",
    gmbUrl: "https://business.google.com/n/16071510868008927387/profile?fid=7663794787976746764",
    mapsUrl: "https://goo.gl/maps/tzuEpAqYn5kv1GUX7", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Pune", country: "India",
    name: "Interior Company Design Studio, Pune Kalyani Nagar",
    address: "Kalyani Nagar, Pune, Maharashtra, India",
    gmbUrl: "https://business.google.com/n/inco_pune_kalyani/profile",
    mapsUrl: "https://maps.app.goo.gl/UTnffaufazz8VdaJ6", displayLabel: "Pune Kalyani Nagar",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Thane", country: "India",
    name: "Interior Company Design Studio, Thane",
    address: "Shop No. 16 B, Ground Floor, Dosti Imperia, Ghodbunder Road, Manpada-Thane West, Thane, Maharashtra 400607, India",
    gmbUrl: "https://business.google.com/n/2768475699562922616/profile?fid=13089716689029814128",
    mapsUrl: "https://maps.app.goo.gl/mg3AqR6vZGDTdLEw7", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Abu Dhabi", country: "UAE",
    name: "Interior Company Design Studio, Abu Dhabi",
    address: "Abu Dhabi, United Arab Emirates",
    gmbUrl: "https://business.google.com/n/inco_abudhabi/profile",
    mapsUrl: "https://maps.app.goo.gl/3rE7FH62qFTVSKfB7", displayLabel: "Abu Dhabi",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Mumbai", country: "India",
    name: "Interior Company Mumbai Andheri West",
    address: "Unit No.11, First Floor, Chandak Unicorn, New Ambivali CHSL, Dattaji Salve Marg, Off Veera Desai Rd, Jeevan Nagar, Andheri West, Mumbai, Maharashtra 400053, India",
    gmbUrl: "https://business.google.com/n/8329632970918305632/profile?fid=4376264440296641084",
    mapsUrl: null, displayLabel: null,
    handledBy: null, status: "permanently_closed",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Pune", country: "India",
    name: "Interior Company Pune (Baner)",
    address: "Amar Paradigm, 4th floor, Sr No. 110/11/3, Mahalunge Rd, Opp Chroma, Baner, Pune, Maharashtra 411015, India",
    gmbUrl: "https://business.google.com/n/2322636261029334206/profile?fid=7567129467069076974",
    mapsUrl: null, displayLabel: "Pune, Baner",
    handledBy: null, status: "permanently_closed",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Bangalore", country: "India",
    name: "Interior Company, Bangalore (Closed)",
    address: "Smartworks, 2nd & 3rd Floor, Prestige Zeenath, Raja Ram Mohan Roy Road, Sampangi Rama Nagara, Bengaluru, Karnataka 560001, India",
    gmbUrl: "https://business.google.com/n/11545496021765608739/profile?fid=10390108598112701480",
    mapsUrl: null, displayLabel: null,
    handledBy: null, status: "permanently_closed",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Interior Company", city: "Bangalore", country: "India",
    name: "Interior Company, HRBR Layout",
    address: "2JFR+HVM, HRBR Layout 2nd Block, HRBR Layout, Kalyan Nagar, Bengaluru, Karnataka 560043, India",
    gmbUrl: "https://business.google.com/n/4212872411460390099/profile?fid=2511002867380079916",
    mapsUrl: "https://maps.app.goo.gl/Gi8LKKYCS3Vi82p69", displayLabel: "Bangalore HRBR",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.0, nov: 4.1, dec: 4.1, jan: 4.0, feb: 4.0, mar: 4.0 },
  },
  {
    business: "Interior Company", city: "Mumbai", country: "India",
    name: "Interior Company, Mumbai (Closed)",
    address: "703/704, Akruti Star, MIDC Central Road, Andheri East, Mumbai, Maharashtra 400069, India",
    gmbUrl: "https://business.google.com/n/11811193674753068821/profile?fid=9540225126901640129",
    mapsUrl: null, displayLabel: null,
    handledBy: null, status: "permanently_closed",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },

  // ── PropVR ───────────────────────────────────────────────────────────────
  {
    business: "PropVR", city: "Riyadh", country: "Saudi Arabia",
    name: "PropVR",
    address: "King Abdullah Financial District, Riyadh 13519, Saudi Arabia",
    gmbUrl: "https://business.google.com/n/7442583104595124699/profile?fid=3124861600382298473",
    mapsUrl: null, displayLabel: null,
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },

  // ── Square Connect ───────────────────────────────────────────────────────
  {
    business: "Square Connect", city: "Gurgaon", country: "India",
    name: "Square Connect",
    address: "1st Floor, Tower A, Business Park, M3M Urbana Premium, Ramgarh, Sector 67, Gurugram, Haryana 122101, India",
    gmbUrl: "https://business.google.com/n/14310955605189106146/profile?fid=3009500078106332056",
    mapsUrl: null, displayLabel: null,
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },

  // ── Square Yards ─────────────────────────────────────────────────────────
  {
    business: "Square Yards", city: "Riyadh", country: "Saudi Arabia",
    name: "Square Yards",
    address: "Al Thumamah Valley St, Olaya St, Riyadh, Saudi Arabia",
    gmbUrl: "https://business.google.com/n/14230978933676751686/profile?fid=12663401888231364363",
    mapsUrl: "https://goo.gl/maps/PbtBcQKXonjWeCsSA", displayLabel: "Saudi",
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Abu Dhabi", country: "UAE",
    name: "Square Yards - Abu Dhabi",
    address: "Business Avenue Tower, 1201 & 1202, Salam Street, Near ADNOC & NDC Office, Abu Dhabi",
    gmbUrl: "https://business.google.com/n/6517173085174911157/profile?fid=12856614324303113154",
    mapsUrl: "https://maps.app.goo.gl/ERXjXAn9rzdrupdv8", displayLabel: null,
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Bahrain", country: "Bahrain",
    name: "Square Yards - Bahrain",
    address: "Bahrain",
    gmbUrl: "https://business.google.com/n/sy_bahrain/profile",
    mapsUrl: "https://maps.app.goo.gl/y2BBRGS4ZrKQJJio9", displayLabel: null,
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Bangalore", country: "India",
    name: "Square Yards - Bangalore",
    address: "07, Jasma Bhavan Rd, Vasanth Nagar, Bengaluru, Karnataka 560052, India",
    gmbUrl: "https://business.google.com/n/3996137026365202203/profile?fid=7339479695544692084",
    mapsUrl: "https://maps.app.goo.gl/k9whrjBYg9DDGo9e9", displayLabel: "Bengaluru",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 3.9, nov: 3.8, dec: 3.5, jan: 3.6, feb: 3.7, mar: 3.7 },
  },
  {
    business: "Square Yards", city: "Dubai", country: "UAE",
    name: "Square Yards - Dubai",
    address: "Office No. 2501, 25th Floor, Tecom, Sheikh Zayed Road, Tecom, Dubai, UAE",
    gmbUrl: "https://business.google.com/n/14686949602648261561/profile?fid=17867302641167165232",
    mapsUrl: "https://maps.app.goo.gl/nop96UrXY9LNtg668", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 3.7, nov: 3.8, dec: 3.8, jan: 3.8, feb: null, mar: 3.8 },
  },
  {
    business: "Square Yards", city: "Hyderabad", country: "India",
    name: "Square Yards - Hyderabad",
    address: "Lower Ground Floor, Sanali Spazio, Inorbit Mall Rd, Software Units Layout, Madhapur, Hyderabad, Telangana 500081, India",
    gmbUrl: "https://business.google.com/n/11036769053007270254/profile?fid=17913143711228483284",
    mapsUrl: "https://maps.app.goo.gl/wkayXer573PyCRYp7", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 3.7, nov: 3.9, dec: 3.8, jan: 3.8, feb: 3.8, mar: 3.9 },
  },
  {
    business: "Square Yards", city: "Kuwait", country: "GCC",
    name: "Square Yards - Kuwait",
    address: "1st Floor Next to Xcite - Al-Ghanim Street-Salam Al Mubarak Salmiya Block-4, Kuwait 20004, Kuwait",
    gmbUrl: "https://business.google.com/n/12334070983050985966/profile?fid=13965072695427242108",
    mapsUrl: "https://maps.app.goo.gl/aoKW8GYiL6G1cppXA", displayLabel: null,
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Lucknow", country: "India",
    name: "Square Yards - Lucknow",
    address: "Unit No. #601, 6th Floor, Levana Cyber Heights, Vibhuti Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010, India",
    gmbUrl: "https://business.google.com/n/6709389664819722394/profile?fid=1330493480084490262",
    mapsUrl: "https://maps.app.goo.gl/DZF2RN1wByWXGjio6", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.0, nov: 4.4, dec: 4.2, jan: 4.3, feb: 4.3, mar: 4.4 },
  },
  {
    business: "Square Yards", city: "Mumbai", country: "India",
    name: "Square Yards - Mumbai",
    address: "Unit No-701 & 702, 7th Floor, Ackruti Trade Star, Village Mulgaon, MIDC Central Road, Andheri East, Mumbai, Maharashtra 400093, India",
    gmbUrl: "https://business.google.com/n/16178110118104012162/profile?fid=15633734902659503125",
    mapsUrl: "https://maps.app.goo.gl/w8f8w58uXAv36fddA", displayLabel: "Mumbai (Andheri East)",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 3.8, nov: 4.1, dec: 4.0, jan: 4.1, feb: 4.1, mar: 4.1 },
  },
  {
    business: "Square Yards", city: "New Delhi", country: "India",
    name: "Square Yards - New Delhi",
    address: "Plot No. 3-B, Rajender Place, Pusa Road, Delhi, New Delhi, Delhi 110060, India",
    gmbUrl: "https://business.google.com/n/14506162216015113205/profile?fid=5916029269685767965",
    mapsUrl: "https://maps.app.goo.gl/xFrU3YBQ1r5GEdqq8", displayLabel: "Delhi (Rajendra Place)",
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 3.6, nov: 4.1, dec: 4.1, jan: 4.0, feb: 4.0, mar: 4.1 },
  },
  {
    business: "Square Yards", city: "Pune", country: "India",
    name: "Square Yards - Pune",
    address: "1st & 2nd Floor, World Square, One HQ, Survey No. 45, New Baner Hinjewadi Link Road, Balewadi, Pune, Maharashtra 411045, India",
    gmbUrl: "https://business.google.com/n/4396407924196885778/profile?fid=354970580811526153",
    mapsUrl: "https://maps.app.goo.gl/HfDUZjPsJkj6smRN7", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 3.8, nov: 3.9, dec: 3.9, jan: 3.9, feb: 3.9, mar: 4.0 },
  },
  {
    business: "Square Yards", city: "Qatar", country: "Qatar",
    name: "Square Yards - Qatar",
    address: "Office No.01, 3rd floor, Mashreq Bank Building, Bank Street Doha, Qatar",
    gmbUrl: "https://business.google.com/n/4241355216659685849/profile?fid=845917131218831992",
    mapsUrl: "https://maps.app.goo.gl/hb8Ziz761uHaL7EMA", displayLabel: null,
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Sydney", country: "Australia",
    name: "Square Yards - Sydney",
    address: "Suite 901, Level 9/33 Argyle Street, Parramatta Sydney NSW 2150, Australia",
    gmbUrl: "https://business.google.com/n/14717968767973729533/profile?fid=16115396022251006041",
    mapsUrl: "https://maps.app.goo.gl/1yXVLUmd92WX2DCR7", displayLabel: "Australia (Sydney)",
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Toronto", country: "Canada",
    name: "Square Yards - Toronto",
    address: "2225 Sheppard Ave E, Suite 700, North York, ON M2J 5C2, Canada",
    gmbUrl: "https://business.google.com/n/311912570232218968/profile?fid=14893383278184507187",
    mapsUrl: "https://maps.app.goo.gl/uWXGpjLpLi3hwSur6", displayLabel: null,
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Vijayawada", country: "India",
    name: "Square Yards - Vijayawada",
    address: "Edifise, 4th Floor, Door no. 40-9-37, Acharya Ranga Nagar, Near Benz Circle, Vijaywada, Andhra Pradesh 520010, India",
    gmbUrl: "https://business.google.com/n/1727654182198388135/profile?fid=7500691616155305298",
    mapsUrl: "https://maps.app.goo.gl/qmnXYwssNXkVdtGx9", displayLabel: "Vijaywada",
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Melbourne", country: "Australia",
    name: "Square Yards Australia",
    address: "Level 16, 60 Albert Road, South Melbourne VIC 3205, Australia",
    gmbUrl: "https://business.google.com/n/9494706702043056493/profile?fid=14499196548027635247",
    mapsUrl: "https://maps.app.goo.gl/3tWaxZhyAFJ1upuv6", displayLabel: "Australia (Melbourne)",
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Gurgaon", country: "India",
    name: "Square Yards Gurgaon",
    address: "1st Floor, Tower A, M3M Urbana Business Park, Sector 67, near M3M Urbana, Gurugram, Haryana 122001, India",
    gmbUrl: "https://business.google.com/n/11614194952577163865/profile?fid=18177703226357877364",
    mapsUrl: "https://maps.app.goo.gl/2K5k2wJJ7wGSPcj96", displayLabel: "Gurgaon (M3M)",
    handledBy: null, status: "active",
    ratings: { baselineSep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null },
  },
  {
    business: "Square Yards", city: "Noida", country: "India",
    name: "Square Yards Noida",
    address: "B1-B2, B Block, Sector-1, District Gautam Budh Nagar, Noida, Uttar Pradesh 201301, India",
    gmbUrl: "https://business.google.com/n/7376015145279299828/profile?fid=17220696918411970634",
    mapsUrl: "https://maps.app.goo.gl/ebC7o1G5aMZxhRjW8", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.0, nov: 4.4, dec: 4.2, jan: 4.1, feb: 4.1, mar: 4.2 },
  },

  // ── Urban Money ──────────────────────────────────────────────────────────
  {
    business: "Urban Money", city: "Delhi", country: "India",
    name: "Urban Money - Delhi",
    address: "3-B, 4th Floor, Rajendra Park, Pusa Road, Near Rajendra Place Metro Station, Gate Number 4, New Delhi, Delhi 110060, India",
    gmbUrl: "https://business.google.com/n/11214722039004276167/profile?fid=12784214554815415195",
    mapsUrl: "https://maps.app.goo.gl/UMPaK6oEaKag2zGz9", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.0, nov: 4.3, dec: 4.4, jan: 4.4, feb: 4.4, mar: 4.4 },
  },
  {
    business: "Urban Money", city: "Mumbai", country: "India",
    name: "Urban Money - Mumbai",
    address: "Unit No. A/401, A/402, A/403 & B/406, Wing A&B, Rustomjee Central Park, Chakala, Kurla Road, Andheri East, Maharashtra 400093, India",
    gmbUrl: "https://business.google.com/n/5310232953069091468/profile?fid=5989606863346913446",
    mapsUrl: "https://maps.app.goo.gl/FtzUUhUMep2zMRn4A", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 3.0, nov: 4.1, dec: 4.3, jan: 4.2, feb: 4.0, mar: 4.0 },
  },
  {
    business: "Urban Money", city: "Gurgaon", country: "India",
    name: "Urban Money Gurgaon",
    address: "1st Floor, Tower A, M3M Urbana Business Park, Sector 67, near M3M Urbana, Gurugram, Haryana 122001, India",
    gmbUrl: "https://business.google.com/n/364943515472470492/profile?fid=11050508992912926001",
    mapsUrl: "https://maps.app.goo.gl/zWsESTbtAuE3TbKX9", displayLabel: null,
    handledBy: "Agency", status: "active",
    ratings: { baselineSep: null, oct: 4.2, nov: 4.3, dec: 4.3, jan: 4.3, feb: 4.3, mar: 4.3 },
  },
];

// Map month name → first Monday of that month in 2025/2026
function firstMonday(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month, 1));
  const day = d.getUTCDay();          // 0=Sun, 1=Mon
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

const MONTH_DATES: { key: keyof MonthlyRatings; date: Date }[] = [
  { key: "oct",  date: firstMonday(2025, 9)  },
  { key: "nov",  date: firstMonday(2025, 10) },
  { key: "dec",  date: firstMonday(2025, 11) },
  { key: "jan",  date: firstMonday(2026, 0)  },
  { key: "feb",  date: firstMonday(2026, 1)  },
  { key: "mar",  date: firstMonday(2026, 2)  },
];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const user = await (prisma as any).user.findUnique({ where: { email: session.user.email } });
  if (!user || !["HEAD_OF_MARKETING", "TEAM_LEAD"].includes(user.role)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  // Wipe existing data so orphaned rows from any previous bad seed don't accumulate
  await (prisma as any).gmbRatingSnapshot.deleteMany({});
  await (prisma as any).gmbLocation.deleteMany({});

  let locationsCreated = 0;
  let snapshotsCreated = 0;

  for (const entry of GMB_DATA) {
    // Deterministic id via SHA-1 of the full gmbUrl — avoids collisions from shared URL prefix
    const locationId = crypto.createHash("sha1").update(entry.gmbUrl).digest("hex").slice(0, 25);
    const location = await (prisma as any).gmbLocation.upsert({
      where:  { id: locationId },
      update: {
        business: entry.business, city: entry.city, country: entry.country,
        name: entry.name, address: entry.address, handledBy: entry.handledBy,
        status: entry.status, gmbUrl: entry.gmbUrl,
        mapsUrl: entry.mapsUrl, displayLabel: entry.displayLabel,
      },
      create: {
        id:           locationId,
        business:     entry.business, city: entry.city, country: entry.country,
        name:         entry.name,     address: entry.address,
        gmbUrl:       entry.gmbUrl,   handledBy: entry.handledBy,
        status:       entry.status,   mapsUrl: entry.mapsUrl,
        displayLabel: entry.displayLabel,
      },
    });
    locationsCreated++;

    // Seed monthly rating snapshots
    let prevRating: number | null = null;
    for (const { key, date } of MONTH_DATES) {
      const rating = entry.ratings[key];
      if (rating === null) { prevRating = rating; continue; }

      const ratingDelta = prevRating !== null ? Math.round((rating - prevRating) * 10) / 10 : null;

      await (prisma as any).gmbRatingSnapshot.upsert({
        where:  { locationId_weekStart: { locationId: location.id, weekStart: date } },
        update: { rating, ratingDelta, source: "manual" },
        create: { locationId: location.id, weekStart: date, rating, ratingDelta, source: "manual" },
      });
      snapshotsCreated++;
      prevRating = rating;
    }
  }

  return NextResponse.json({
    success: true,
    locationsCreated,
    snapshotsCreated,
    message: `Seeded ${locationsCreated} GMB locations and ${snapshotsCreated} historical snapshots.`,
  });
}
