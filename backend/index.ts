import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";

type PlayerProfile = {
  dob: string | undefined;
  nationality: string | undefined;
  profilePhoto: string | undefined;
  iplDebut: string | undefined;
  specialization: string | undefined;
  matches: string | undefined;
};
const URL =
  "https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/player/16-playerstats.js";

function getURL(id: number) {
  return `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/player/${id}-playerstats.js`;
}
function getProfileURL(userName: string, id: number) {
  return `https://www.iplt20.com/players/${userName}/${id}`;
}

type PlayerStatsResponse = {
  Batting: Record<string, any>[];
  Bowling: Record<string, any>[];
};

function normalizePlayerStats(raw: any): any {
  const battingAllTime = raw.Batting.find((b: any) => b.Year === "AllTime");
  const bowlingAllTime = raw.Bowling.find((b: any) => b.Year === "AllTime");

  const teams = [
    ...new Set(
      raw.Batting.filter(
        (b: any) =>
          b.Year !== "AllTime" &&
          typeof b.TeamName === "string" &&
          b.TeamName.trim() !== ""
      ).map((b: any) => b.TeamName.trim())
    ),
  ];
  return {
    PlayerId: battingAllTime.PlayerId,
    PlayerName: battingAllTime.PlayerName,
    teams,
    Batting: {
      Innings: Number(battingAllTime.Innings),
      Runs: Number(battingAllTime.Runs),
      Balls: Number(battingAllTime.Balls),
      HighestScore: battingAllTime.HighestScore,
      Fifties: Number(battingAllTime.Fifties),
      Hundreds: Number(battingAllTime.Hundreds),
      Sixes: Number(battingAllTime.Sixes),
      Fours: Number(battingAllTime.Fours),
      StrikeRate: Number(battingAllTime.StrikeRate),
      BattingAvg: Number(battingAllTime.BattingAvg),
      NotOuts: Number(battingAllTime.NotOuts),
      Catches: Number(battingAllTime.Catches),
      Stumpings: Number(battingAllTime.Stumpings),
    },
    Bowling: {
      Innings: Number(bowlingAllTime.Innings),
      Overs: bowlingAllTime.Overs,
      Runs: Number(bowlingAllTime.Runs),
      Wickets: Number(bowlingAllTime.Wickets),
    },
  };
}
function extractOnPlayerStats(raw: string): any {
  const start = raw.indexOf("(");
  const end = raw.lastIndexOf(")");

  if (start === -1 || end === -1) {
    throw new Error("Invalid onPlayerStats response");
  }

  const jsonString = raw.slice(start + 1, end);
  return JSON.parse(jsonString);
}

async function fetchPlayerDetailedStatsRange(
  start: number,
  end: number,
  outputFileName: string
) {
  const results: Record<string, PlayerStatsResponse> = {};

  for (let i = start; i <= end; i++) {
    try {
      const response = await axios.get(getURL(i));

      const parsed = extractOnPlayerStats(response.data);
      results[i] = parsed;

      console.log(`Fetched data for ${i}`);
    } catch (error) {
      console.error(`Failed for {i}`, error);
    }
  }

  const filePath = path.join(process.cwd(), outputFileName);

  await fs.writeFile(filePath, JSON.stringify(results, null, 2), "utf-8");

  console.log(`Data written to ${filePath}`);
}

async function extractPlayerProfile(url: any): Promise<PlayerProfile> {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);
  //   console.log(html);

  // Extract profile photo
  const profilePhoto = $(".membr-details-img img").attr("src");

  // Extract nationality
  const nationality = $(".plyr-name-nationality span").text().trim();
  let dob, iplDebut, specialization, matches;
  // Extract data from grid items
  $(".grid-items").each((i, el) => {
    const label = $(el).find("span").text().trim();
    const value = $(el).find("p").text().trim();

    if (label === "Date of Birth") {
      dob = value;
    } else if (label === "IPL Debut") {
      iplDebut = value;
    } else if (label === "Specialization") {
      specialization = value;
    } else if (label === "Matches") {
      matches = value;
    }
  });

  return {
    dob,
    nationality,
    profilePhoto,
    iplDebut,
    specialization,
    matches,
  };
}
function toSlug(playerName: string): string {
  return playerName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

async function appendToJsonFile(filePath: string, dataToAppend: any) {
  let json = [];

  try {
    const file = await fs.readFile(filePath, "utf-8");
    json = JSON.parse(file);

    if (!Array.isArray(json)) {
      throw new Error("JSON root must be an array");
    }
  } catch (err) {
    // if (err.code !== "ENOENT") throw err;
  }

  json.push(dataToAppend);

  await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf-8");
}
async function fetchPlayerStatsRange(
  start: number,
  end: number,
  outputFileName: string
) {
  const results: Record<string, PlayerStatsResponse> = {};
  const s = Date.now();
  for (let i = start; i <= end; i++) {
    try {
      const response = await axios.get(getURL(i));
      const parsed = extractOnPlayerStats(response.data);
      if (parsed["Batting"][0].Matches > 10) {
        const {
          dob,
          nationality,
          profilePhoto,
          iplDebut,
          specialization,
          matches,
        } = await extractPlayerProfile(
          getProfileURL(toSlug(parsed["Batting"][0].PlayerName), i)
        );
        const d = normalizePlayerStats(parsed);
        results[i] = {
          dob,
          nationality,
          profilePhoto,
          iplDebut,
          specialization,
          matches,
          ...d,
        };
      }

      //   console.log(`Fetched data for ${i}`);
    } catch (error) {
      //   console.error(`Failed for {i}`, error);
    }
  }

  const e = Date.now();
  console.log("time ", e - s);
  console.log("records ", Object.keys(results).length);

  const filePath = path.join(process.cwd(), outputFileName);

  // await fs.writeFile(filePath, JSON.stringify(results, null, 2), "utf-8");
  await appendToJsonFile(filePath, results);
  console.log(`Data written to ${filePath}`);
}
// fetchPlayerDetailedStatsRange(start, end, "output.json");
// fetchPlayerStatsRange(1, 100, "small2.json");
fetchPlayerStatsRange(101, 104, "small3.json");
