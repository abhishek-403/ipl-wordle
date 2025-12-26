import {
  ArrowDown,
  ArrowUp,
  Eye,
  Flag,
  RefreshCw,
  Search,
  Trophy,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

interface BattingStats {
  Innings: number;
  Runs: number;
  Balls: number;
  HighestScore: string;
  Fifties: number;
  Hundreds: number;
  Sixes: number;
  Fours: number;
  StrikeRate: number;
  BattingAvg: number;
  NotOuts: number;
  Catches: number;
  Stumpings: number;
}

interface BowlingStats {
  Innings: number;
  Overs: string;
  Runs: number;
  Wickets: number;
}

interface RawPlayerData {
  dob: string;
  nationality: string;
  profilePhoto: string;
  iplDebut: string;
  specialization: string;
  matches: string;
  PlayerId: string;
  PlayerName: string;
  teams: string[];
  Batting: BattingStats;
  Bowling: BowlingStats;
}

interface ProcessedPlayer extends RawPlayerData {
  id: string;
  age: number;
  currentTeam: string;
}

interface FieldConfig {
  key: keyof ProcessedPlayer | "Batting" | "Bowling";
  subKey?: string;
  label: string;
  type: "exact" | "numeric" | "special";
  tolerance?: number;
  display: (
    player: ProcessedPlayer,
    target?: ProcessedPlayer
  ) => React.ReactNode;
}

const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const StatCell = ({
  value,
  targetValue,
  type,
}: {
  value: any;
  targetValue: any;
  type: string;
}) => {
  if (type !== "numeric" || value === targetValue) return <span>{value}</span>;
  const v = parseFloat(String(value).replace("*", ""));
  const t = parseFloat(String(targetValue).replace("*", ""));
  if (isNaN(v) || isNaN(t)) return <span>{value}</span>;

  return (
    <div className="flex flex-col items-center justify-center">
      <span className="leading-tight text-xl mb-1">{value}</span>
      {t > v ? (
        <ArrowUp size={14} className="text-white/80 animate-pulse mt-0.5" />
      ) : (
        <ArrowDown size={14} className="text-white/80 animate-pulse mt-0.5" />
      )}
    </div>
  );
};

const FIELD_CONFIG: FieldConfig[] = [
  {
    key: "profilePhoto",
    label: "Player",
    type: "special",
    display: (p) => (
      <div className="flex flex-col items-center gap-1">
        <img
          src={p.profilePhoto}
          alt={p.PlayerName}
          className="w-14 h-14 rounded-full border-2 border-gray-600 bg-gray-800 object-cover shadow-inner"
        />
        <span className="text-sm font-bold text-center leading-tight line-clamp-1 w-full px-1">
          {p.PlayerName}
        </span>
      </div>
    ),
  },
  {
    key: "currentTeam",
    label: "Team",
    type: "exact",
    display: (p) => (
      <span className="text-sm font-bold leading-tight">{p.currentTeam}</span>
    ),
  },
  {
    key: "specialization",
    label: "Role",
    type: "exact",
    display: (p) => (
      <span className="text-sm uppercase font-bold leading-tight whitespace-pre-wrap">
        {p.specialization}
      </span>
    ),
  },
  {
    key: "matches",
    label: "Matches",
    type: "numeric",
    tolerance: 20,
    display: (p, t) => (
      <StatCell value={p.matches} targetValue={t?.matches} type="numeric" />
    ),
  },
  {
    key: "age",
    subKey: "Age",
    label: "Age",
    type: "numeric",
    tolerance: 5,
    display: (p, t) => (
      <StatCell
        value={p.age}
        targetValue={t?.age}
        type="numeric"
      />
    ),
  },
  {
    key: "Bowling",
    subKey: "Wickets",
    label: "Wkt",
    type: "numeric",
    tolerance: 20,
    display: (p, t) => (
      <StatCell
        value={p.Bowling.Wickets}
        targetValue={t?.Bowling.Wickets}
        type="numeric"
      />
    ),
  },
  {
    key: "Batting",
    subKey: "HighestScore",
    label: "HS",
    type: "numeric",
    tolerance: 10,
    display: (p, t) => (
      <StatCell
        value={p.Batting.HighestScore}
        targetValue={t?.Batting.HighestScore}
        type="numeric"
      />
    ),
  },
  {
    key: "Batting",
    subKey: "BattingAvg",
    label: "Avg",
    type: "numeric",
    tolerance: 5,
    display: (p, t) => (
      <StatCell
        value={p.Batting.BattingAvg.toFixed(1)}
        targetValue={t?.Batting.BattingAvg.toFixed(1)}
        type="numeric"
      />
    ),
  },
  {
    key: "Batting",
    subKey: "Sixes",
    label: "6s",
    type: "numeric",
    tolerance: 20,
    display: (p, t) => (
      <StatCell
        value={p.Batting.Sixes}
        targetValue={t?.Batting.Sixes}
        type="numeric"
      />
    ),
  },
  {
    key: "Batting",
    subKey: "Fours",
    label: "4s",
    type: "numeric",
    tolerance: 50,
    display: (p, t) => (
      <StatCell
        value={p.Batting.Fours}
        targetValue={t?.Batting.Fours}
        type="numeric"
      />
    ),
  },
];

const MAX_GUESSES = 8;

const CricketWordle = () => {
  const [players, setPlayers] = useState<ProcessedPlayer[]>([]);
  const [targetPlayer, setTargetPlayer] = useState<ProcessedPlayer | null>(
    null
  );
  const [guesses, setGuesses] = useState<
    Array<{ player: ProcessedPlayer; comparison: any[] }>
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [usedIds, setUsedIds] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/small.json");
      const data: Record<string, RawPlayerData> = await response.json();
      const processed = Object.entries(data).map(([id, p]) => ({
        ...p,
        id,
        age: calculateAge(p.dob),
        currentTeam: p.teams[p.teams.length - 1] || "N/A",
      }));
      setPlayers(processed);
      if (processed.length > 0) startNewGame(processed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startNewGame = (list?: ProcessedPlayer[]) => {
    const activeList = list || players;
    const target = activeList[Math.floor(Math.random() * activeList.length)];

    setTargetPlayer(target);
    setGuesses([]);
    setUsedIds(new Set());
    setGameOver(false);
    setWon(false);
    setShowModal(false);
    setSearchTerm("");
  };

  const compare = (
    guess: ProcessedPlayer,
    target: ProcessedPlayer,
    config: FieldConfig
  ) => {
    let gVal: any, tVal: any;
    if (config.subKey) {
      gVal = (guess[config.key as keyof ProcessedPlayer] as any)[config.subKey];
      tVal = (target[config.key as keyof ProcessedPlayer] as any)[
        config.subKey
      ];
    } else {
      gVal = guess[config.key as keyof ProcessedPlayer];
      tVal = target[config.key as keyof ProcessedPlayer];
    }

    if (config.type === "exact") return gVal === tVal ? "exact" : "none";
    if (config.type === "numeric") {
      const gNum = parseFloat(String(gVal).replace("*", ""));
      const tNum = parseFloat(String(tVal).replace("*", ""));
      if (gNum === tNum) return "exact";
      return Math.abs(gNum - tNum) <= (config.tolerance || 0)
        ? "close"
        : "none";
    }
    return gVal === tVal ? "exact" : "none";
  };

  const makeGuess = (player: ProcessedPlayer) => {
    if (gameOver || !targetPlayer) return;
    const comparison = FIELD_CONFIG.map((config) => ({
      status: compare(player, targetPlayer, config),
    }));
    const newGuesses = [...guesses, { player, comparison }];
    setGuesses(newGuesses);
    setUsedIds(new Set([...usedIds, player.id]));
    setSearchTerm("");
    setShowDropdown(false);

    if (player.id === targetPlayer.id) {
      setWon(true);
      setGameOver(true);
      setShowModal(true);
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameOver(true);
      setShowModal(true);
    }
  };

  const getCellColor = (status: string) => {
    if (status === "exact") return "bg-green-600 border-green-500 text-white";
    if (status === "close") return "bg-yellow-600 border-yellow-500 text-white";
    return "bg-gray-800 border-gray-700 text-gray-300";
  };

  const filteredPlayers = useMemo(() => {
    return players
      .filter(
        (p) =>
          !usedIds.has(p.id) &&
          p.PlayerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 8);
  }, [searchTerm, usedIds, players]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-black italic text-3xl animate-pulse">
        IPL DATA LOADING...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-4 pb-20">
      <div className=" mx-auto">
        <header className="flex flex-col items-center mb-10">
          {/* <h1 className="text-6xl font-black tracking-tighter italic mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-sm">
            IPL WORDLE
          </h1> */}
          <div className="flex gap-6 items-center">
            <div className="bg-gray-900 px-4 py-1 rounded-full border border-gray-800 text-sm font-bold">
              ATTEMPT <span className="text-yellow-500">{guesses.length}</span>{" "}
              / {MAX_GUESSES}
            </div>
            {gameOver ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-blue-600 px-4 py-1 rounded-full text-xs font-bold hover:bg-blue-500 transition-all"
                >
                  <Eye size={14} /> RESULTS
                </button>
                <button
                  onClick={() => startNewGame()}
                  className="flex items-center gap-2 bg-green-600 px-4 py-1 rounded-full text-xs font-bold hover:bg-green-500 transition-all"
                >
                  <RefreshCw size={14} /> NEW GAME
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setGameOver(true);
                  setShowModal(true);
                }}
                className="text-red-500 hover:text-red-400 text-xs font-bold flex items-center gap-1 transition-colors uppercase tracking-widest"
              >
                <Flag size={14} /> Give Up
              </button>
            )}
          </div>
        </header>

        {!gameOver && (
          <div className="relative mb-12 max-w-xl mx-auto">
            <div className="relative group">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-500 transition-colors"
                size={24}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search Player..."
                className="w-full bg-gray-900/50 backdrop-blur-sm border-2 border-gray-800 rounded-3xl pl-14 pr-6 py-4 focus:outline-none focus:border-yellow-500 transition-all text-lg shadow-2xl"
              />
            </div>
            {showDropdown && searchTerm && (
              <div className="absolute z-20 w-full mt-2 bg-gray-900 border border-gray-700 rounded-2xl  shadow-2xl max-h-[60vh] overflow-auto">
                {filteredPlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => makeGuess(p)}
                    className="w-full flex items-center gap-5 px-6 py-4 hover:bg-yellow-500/10 transition-colors text-left border-b border-gray-800 last:border-0 group"
                  >
                    <img
                      src={p.profilePhoto}
                      className="w-12 h-12 rounded-full bg-gray-800 object-cover border border-gray-700 group-hover:border-yellow-500"
                    />
                    <div>
                      <div className="font-black text-lg group-hover:text-yellow-500 transition-colors">
                        {p.PlayerName}
                      </div>
                      {/* <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">{p.currentTeam} • {p.specialization}</div> */}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl border border-gray-800 bg-gray-900/20 p-4">
          <div className="min-w-250">
            <div className="grid grid-cols-10 gap-3 mb-6 px-2">
              {FIELD_CONFIG.map((f) => (
                <div
                  key={f.label}
                  className="text-xs uppercase tracking-[0.2em] font-black text-gray-600 text-center"
                >
                  {f.label}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {guesses
                .slice()
                .reverse()
                .map((guess, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-10 gap-3 animate-in slide-in-from-left-4 duration-500"
                  >
                    {guess.comparison.map((comp, j) => (
                      <div
                        key={j}
                        className={`${getCellColor(
                          comp.status
                        )} border-b-4 h-24 flex items-center justify-center rounded-2xl text-center p-2 shadow-xl transition-all hover:scale-[1.02] font-black text-sm`}
                      >
                        {FIELD_CONFIG[j].display(guess.player, targetPlayer!)}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {showModal && targetPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="relative bg-gray-900 border-2 border-gray-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
              >
                <X size={28} />
              </button>
              <div className="relative text-center">
                <div className="mb-6 flex justify-center">
                  {won ? (
                    <Trophy className="w-24 h-24 text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]" />
                  ) : (
                    <X className="w-20 h-20 text-red-500 border-4 border-red-500 rounded-full p-2" />
                  )}
                </div>
                <h2 className="text-5xl font-black italic tracking-tighter mb-2 uppercase">
                  {won ? "Found Him!" : "Missed Him"}
                </h2>
                <div className="bg-black/40 rounded-[2rem] p-8 border border-gray-800 mb-8 mt-6">
                  <div className="relative inline-block mb-6">
                    <img
                      src={targetPlayer.profilePhoto}
                      className="w-40 h-40 rounded-full border-4 border-yellow-500/50 bg-gray-800 object-cover mx-auto"
                    />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[11px] font-black px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg uppercase">
                      {targetPlayer.currentTeam}
                    </div>
                  </div>
                  <h3 className="text-3xl font-black uppercase">
                    {targetPlayer.PlayerName}
                  </h3>
                  <div className="flex justify-center gap-4 mt-3 text-sm font-bold text-gray-400 uppercase tracking-widest">
                    <span>{targetPlayer.age} YEARS</span>
                    <span>•</span>
                    <span>{targetPlayer.specialization}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-800 text-white font-black py-4 rounded-2xl hover:bg-gray-700 transition-all uppercase text-xs flex items-center justify-center gap-2 tracking-widest"
                  >
                    <Eye size={18} /> View Guesses
                  </button>
                  <button
                    onClick={() => startNewGame()}
                    className="flex-[1.5] bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black py-4 rounded-2xl hover:opacity-90 transition-all transform active:scale-95 uppercase text-xs flex items-center justify-center gap-2 tracking-widest"
                  >
                    <RefreshCw size={18} /> New Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CricketWordle;
