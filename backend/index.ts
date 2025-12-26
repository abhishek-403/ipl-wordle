// import axios from "axios";
// import * as cheerio from "cheerio";
// import fs from "fs/promises";
// import { HttpsProxyAgent } from "https-proxy-agent";
// import path from "path";

// type PlayerProfile = {
//   dob: string | undefined;
//   nationality: string | undefined;
//   profilePhoto: string | undefined;
//   iplDebut: string | undefined;
//   specialization: string | undefined;
//   matches: string | undefined;
// };
// const URL =
//   "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/player/16-playerstats.js";

// function getURL(id: number) {
//   return `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/player/${id}-playerstats.js`;
// }
// function getProfileURL(userName: string, id: number) {
//   return `https://www.iplt20.com/players/${userName}/${id}`;
// }

// type PlayerStatsResponse = {
//   Batting: Record<string, any>[];
//   Bowling: Record<string, any>[];
// };

// const proxies = [
//   "http://USERNAME:PASSWORD@IP1:PORT",
//   "http://USERNAME:PASSWORD@IP2:PORT",
//   "http://USERNAME:PASSWORD@IP3:PORT",
// ];

// function getRandomProxy(): any {
//   return proxies[Math.floor(Math.random() * proxies.length)];
// }
// function getAxiosInstance() {
//   const proxy = getRandomProxy();
//   const agent = new HttpsProxyAgent(proxy);

//   return axios.create({
//     httpAgent: agent,
//     httpsAgent: agent,
//     timeout: 15000,
//     headers: {
//       "User-Agent":
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0",
//       "Accept-Language": "en-US,en;q=0.9",
//       Accept: "text/html,application/json",
//     },
//   });
// }
// function normalizePlayerStats(raw: any): any {
//   const battingAllTime = raw.Batting.find((b: any) => b.Year === "AllTime");
//   const bowlingAllTime = raw.Bowling.find((b: any) => b.Year === "AllTime");

//   const teams = [
//     ...new Set(
//       raw.Batting.filter(
//         (b: any) =>
//           b.Year !== "AllTime" &&
//           typeof b.TeamName === "string" &&
//           b.TeamName.trim() !== ""
//       ).map((b: any) => b.TeamName.trim())
//     ),
//   ];
//   return {
//     PlayerId: battingAllTime.PlayerId,
//     PlayerName: battingAllTime.PlayerName,
//     teams,
//     Batting: {
//       Innings: Number(battingAllTime.Innings),
//       Runs: Number(battingAllTime.Runs),
//       Balls: Number(battingAllTime.Balls),
//       HighestScore: battingAllTime.HighestScore,
//       Fifties: Number(battingAllTime.Fifties),
//       Hundreds: Number(battingAllTime.Hundreds),
//       Sixes: Number(battingAllTime.Sixes),
//       Fours: Number(battingAllTime.Fours),
//       StrikeRate: Number(battingAllTime.StrikeRate),
//       BattingAvg: Number(battingAllTime.BattingAvg),
//       NotOuts: Number(battingAllTime.NotOuts),
//       Catches: Number(battingAllTime.Catches),
//       Stumpings: Number(battingAllTime.Stumpings),
//     },
//     Bowling: {
//       Innings: Number(bowlingAllTime.Innings),
//       Overs: bowlingAllTime.Overs,
//       Runs: Number(bowlingAllTime.Runs),
//       Wickets: Number(bowlingAllTime.Wickets),
//     },
//   };
// }
// function extractOnPlayerStats(raw: string): any {
//   const start = raw.indexOf("(");
//   const end = raw.lastIndexOf(")");

//   if (start === -1 || end === -1) {
//     throw new Error("Invalid onPlayerStats response");
//   }

//   const jsonString = raw.slice(start + 1, end);
//   return JSON.parse(jsonString);
// }

// async function fetchPlayerDetailedStatsRange(
//   start: number,
//   end: number,
//   outputFileName: string
// ) {
//   const results: Record<string, PlayerStatsResponse> = {};

//   for (let i = start; i <= end; i++) {
//     try {
//       // const response = await axios.get(getURL(i));
//       // const response = await axios.get(getURL(i));

//       const client = getAxiosInstance();
//       const response = await client.get(getURL(i));

//       const parsed = extractOnPlayerStats(response.data);
//       results[i] = parsed;

//       console.log(`Fetched data for ${i}`);
//     } catch (error) {
//       console.error(`Failed for {i}`, error);
//     }
//   }

//   const filePath = path.join(process.cwd(), outputFileName);

//   await fs.writeFile(filePath, JSON.stringify(results, null, 2), "utf-8");

//   console.log(`Data written to ${filePath}`);
// }

// async function extractPlayerProfile(url: any): Promise<PlayerProfile> {
//   // const { data: html } = await axios.get(url);

//   const client = getAxiosInstance();
//   const { data: html } = await client.get(url);
//   const $ = cheerio.load(html);
//   //   console.log(html);

//   // Extract profile photo
//   const profilePhoto = $(".membr-details-img img").attr("src");

//   // Extract nationality
//   const nationality = $(".plyr-name-nationality span").text().trim();
//   let dob, iplDebut, specialization, matches;
//   // Extract data from grid items
//   $(".grid-items").each((i, el) => {
//     const label = $(el).find("span").text().trim();
//     const value = $(el).find("p").text().trim();

//     if (label === "Date of Birth") {
//       dob = value;
//     } else if (label === "IPL Debut") {
//       iplDebut = value;
//     } else if (label === "Specialization") {
//       specialization = value;
//     } else if (label === "Matches") {
//       matches = value;
//     }
//   });

//   return {
//     dob,
//     nationality,
//     profilePhoto,
//     iplDebut,
//     specialization,
//     matches,
//   };
// }
// function toSlug(playerName: string): string {
//   return playerName
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9\s-]/g, "")
//     .replace(/\s+/g, "-");
// }

// async function appendToJsonFile(filePath: string, dataToAppend: any) {
//   let json = [];

//   try {
//     const file = await fs.readFile(filePath, "utf-8");
//     json = JSON.parse(file);

//     if (!Array.isArray(json)) {
//       throw new Error("JSON root must be an array");
//     }
//   } catch (err) {
//     // if (err.code !== "ENOENT") throw err;
//   }

//   json.push(dataToAppend);

//   await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf-8");
// }
// async function fetchPlayerStatsRange(
//   start: number,
//   end: number,
//   outputFileName: string
// ) {
//   const results: Record<string, PlayerStatsResponse> = {};
//   const s = Date.now();
//   for (let i = start; i <= end; i++) {
//     try {
//       const client = getAxiosInstance();
//       const response = await client.get(getURL(i));
//       const parsed = extractOnPlayerStats(response.data);
//       if (parsed["Batting"][0].Matches > 10) {
//         const {
//           dob,
//           nationality,
//           profilePhoto,
//           iplDebut,
//           specialization,
//           matches,
//         } = await extractPlayerProfile(
//           getProfileURL(toSlug(parsed["Batting"][0].PlayerName), i)
//         );
//         const d = normalizePlayerStats(parsed);
//         results[i] = {
//           dob,
//           nationality,
//           profilePhoto,
//           iplDebut,
//           specialization,
//           matches,
//           ...d,
//         };
//       }

//       //   console.log(`Fetched data for ${i}`);
//     } catch (error) {
//       //   console.error(`Failed for {i}`, error);
//     }
//   }

//   const e = Date.now();
//   console.log("time ", e - s);
//   console.log("records ", Object.keys(results).length);

//   const filePath = path.join(process.cwd(), outputFileName);

//   // await fs.writeFile(filePath, JSON.stringify(results, null, 2), "utf-8");
//   await appendToJsonFile(filePath, results);
//   console.log(`Data written to ${filePath}`);
// }
// // fetchPlayerDetailedStatsRange(start, end, "output.json");
// fetchPlayerStatsRange(1, 10, "small.json");
// // fetchPlayerStatsRange(101, 104, "small3.json");
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import { HttpsProxyAgent } from "https-proxy-agent";
import pLimit from "p-limit";
import path from "path";

type PlayerProfile = {
  dob: string | undefined;
  nationality: string | undefined;
  profilePhoto: string | undefined;
  iplDebut: string | undefined;
  specialization: string | undefined;
  matches: string | undefined;
};

// Replace with real credentials or leave empty [] to test without proxies
const proxies: any[] = ["http://USERNAME:PASSWORD@IP1:PORT"];

function getAxiosInstance() {
  const config: any = {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/json",
    },
  };

  if (proxies.length > 0 && !proxies[0].includes("USERNAME")) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent(proxy);
    config.httpAgent = agent;
    config.httpsAgent = agent;
  }

  return axios.create(config);
}

function getURL(id: number) {
  return `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/player/${id}-playerstats.js`;
}

function getProfileURL(userName: string, id: number) {
  return `https://www.iplt20.com/players/${userName}/${id}`;
}

function toSlug(playerName: string): string {
  return playerName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractOnPlayerStats(raw: string): any {
  try {
    const start = raw.indexOf("(");
    const end = raw.lastIndexOf(")");
    if (start === -1 || end === -1) throw new Error("Format mismatch");
    return JSON.parse(raw.slice(start + 1, end));
  } catch (e) {
    return null;
  }
}

function normalizePlayerStats(raw: any): any {
  const battingAllTime =
    raw.Batting.find((b: any) => b.Year === "AllTime") || {};
  const bowlingAllTime =
    raw.Bowling.find((b: any) => b.Year === "AllTime") || {};

  const teams = [
    ...new Set(
      raw.Batting.filter(
        (b: any) => b.Year !== "AllTime" && b.TeamName?.trim()
      ).map((b: any) => b.TeamName.trim())
    ),
  ];

  return {
    PlayerId: battingAllTime.PlayerId || "0",
    PlayerName: battingAllTime.PlayerName || "Unknown",
    teams,
    Batting: {
      Innings: Number(battingAllTime.Innings) || 0,
      Runs: Number(battingAllTime.Runs) || 0,
      Balls: Number(battingAllTime.Balls) || 0,
      HighestScore: battingAllTime.HighestScore || "0",
      Fifties: Number(battingAllTime.Fifties) || 0,
      Hundreds: Number(battingAllTime.Hundreds) || 0,
      Sixes: Number(battingAllTime.Sixes) || 0,
      Fours: Number(battingAllTime.Fours) || 0,
      StrikeRate: Number(battingAllTime.StrikeRate) || 0,
      BattingAvg: Number(battingAllTime.BattingAvg) || 0,
      NotOuts: Number(battingAllTime.NotOuts) || 0,
      Catches: Number(battingAllTime.Catches) || 0,
      Stumpings: Number(battingAllTime.Stumpings) || 0,
    },
    Bowling: {
      Innings: Number(bowlingAllTime.Innings) || 0,
      Overs: bowlingAllTime.Overs || "0.0",
      Runs: Number(bowlingAllTime.Runs) || 0,
      Wickets: Number(bowlingAllTime.Wickets) || 0,
    },
  };
}

async function extractPlayerProfile(url: string): Promise<PlayerProfile> {
  const client = getAxiosInstance();
  const { data: html } = await client.get(url);
  const $ = cheerio.load(html);

  const profilePhoto = $(".membr-details-img img").attr("src");
  const nationality = $(".plyr-name-nationality span").first().text().trim();

  let dob, iplDebut, specialization, matches;

  $(".grid-items").each((_, el) => {
    const label = $(el).find("span").text().trim();
    const value = $(el).find("p").text().trim();
    if (label === "Date of Birth") dob = value;
    else if (label === "IPL Debut") iplDebut = value;
    else if (label === "Specialization") specialization = value;
    else if (label === "Matches") matches = value;
  });

  return { dob, nationality, profilePhoto, iplDebut, specialization, matches };
}

async function appendToJsonFile(
  filePath: string,
  dataToAppend: Record<string, any>
) {
  if (Object.keys(dataToAppend).length === 0) return;

  let json: Record<string, any> = {};
  try {
    const file = await fs.readFile(filePath, "utf-8");
    json = JSON.parse(file);
    if (Array.isArray(json)) json = {};
  } catch (err) {}

  Object.assign(json, dataToAppend);
  await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf-8");
}

async function fetchPlayerStatsRange(
  start: number,
  end: number,
  fileName: string,
  concurrency: number = 5
) {
  const limit = pLimit(concurrency);
  const currentBatchResults: Record<string, any> = {};
  const startTime = Date.now();

  const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const tasks = ids.map((id) =>
    limit(async () => {
      try {
        const client = getAxiosInstance();
        const response = await client.get(getURL(id));
        const parsed = extractOnPlayerStats(response.data);

        if (!parsed) return;

        const allTimeBatting = parsed.Batting?.find(
          (b: any) => b.Year === "AllTime"
        );

        if (allTimeBatting && Number(allTimeBatting.Matches) > 50) {
          const profile = await extractPlayerProfile(
            getProfileURL(toSlug(allTimeBatting.PlayerName), id)
          );
          const stats = normalizePlayerStats(parsed);
          if (
            profile.iplDebut !== null ||
            profile.iplDebut !== undefined ||
            profile.iplDebut !== "-"
          ) {
            currentBatchResults[id] = { ...profile, ...stats };
          }
          // console.log(`✅ Success: ${allTimeBatting.PlayerName} (ID: ${id})`);
        } else {
          // console.log(`⏩ Skipped ID ${id}: Matches <= 10 or no data`);
        }
      } catch (e: any) {
        // console.error(`❌ Error at ID ${id}: ${e.message}`);
      }
    })
  );

  await Promise.all(tasks);
  await appendToJsonFile(
    path.join(process.cwd(), fileName),
    currentBatchResults
  );
  console.log(
    `\nDone! Time: ${(Date.now() - startTime) / 1000}s | Total Records Saved: ${
      Object.keys(currentBatchResults).length
    }`
  );
}

fetchPlayerStatsRange(20001, 30000, "small.json", 5);
