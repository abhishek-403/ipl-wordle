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
const proxies: any[] = [];

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

  // console.log(raw)
  const lastTeam = raw['Batting'][1]?.TeamName || "Unknown";

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
    lastTeam: lastTeam,
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

fetchPlayerStatsRange(1, 30000, "test.json", 5);
