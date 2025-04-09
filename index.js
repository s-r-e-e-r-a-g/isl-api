const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cron = require("node-cron");

cron.schedule('* * * * *', async () => {
  try {
    await axios.get('https://isl-api.onrender.com/');
    console.log('Pinged');
  } catch (err) {
    console.error('Self-ping failed:', err.message);
  }
});

const app = express();
const PORT = 3000;
const URL = "https://www.indiansuperleague.com/schedule-fixtures";

app.get("/", (req, res) => {
  res.json({
    "Finished match results": "/isl/finished",
    "Live Match score": "/isl/live",
    "Upcoming Matches": "/isl/upcoming",
    "message": "Goto /isl/scores to access the above 3 all at once"
  });
});

app.get("/isl/scores", async (req, res) => {
  try {
    const { data } = await axios.get(URL);

    const $ = cheerio.load(data);
    const matches = {
      finished: [],
      live: [],
      upcoming: []
    };

    $(".card-item-wrapper").each((index, element) => {
      const date = $(element).closest(".card-list-item").find(".card-meta-title").text().trim();
      const venue = $(element).find(".meta.venue").text().trim();
      const matchLink = "https://www.indiansuperleague.com" + $(element).find(".btn-matchcenter").attr("href");
      const status = $(element).find(".team-time-status .text").text().trim();

      const teamA = {
        name: $(element).find(".team.team-a .name.full").text().trim(),
        shortName: $(element).find(".team.team-a .name.short").text().trim(),
        logo: "https://www.indiansuperleague.com" + $(element).find(".team.team-a img").attr("data-src"), // Use data-src for lazy-loaded images
        score: $(element).find(".team.team-a .score").text().trim() || "N/A"
      };

      const teamB = {
        name: $(element).find(".team.team-b .name.full").text().trim(),
        shortName: $(element).find(".team.team-b .name.short").text().trim(),
        logo: "https://www.indiansuperleague.com" + $(element).find(".team.team-b img").attr("data-src"), // Use data-src for lazy-loaded images
        score: $(element).find(".team.team-b .score").text().trim() || "N/A"
      };

      const matchData = { date, venue, matchLink, teamA, teamB };

      if (status === "FT") {
        matches.finished.push(matchData);
      } else if (status.includes("'")) { // Check if the status contains a minute marker (e.g., "4'")
        matchData.time = status; // Add the live match time to the match data
        matches.live.push(matchData);
      } else {
        matches.upcoming.push(matchData);
      }
    });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ISL match data", details: error.message });
  }
});

app.get("/isl/finished", async (req, res) => {
  try {
    const { data } = await axios.get(`http://localhost:${PORT}/isl/scores`);
    res.json(data.finished);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch finished matches" });
  }
});

app.get("/isl/live", async (req, res) => {
  try {
    const { data } = await axios.get(`http://localhost:${PORT}/isl/scores`);
    res.json(data.live);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live matches" });
  }
});

app.get("/isl/upcoming", async (req, res) => {
  try {
    const { data } = await axios.get(`http://localhost:${PORT}/isl/scores`);
    res.json(data.upcoming);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch upcoming matches" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
