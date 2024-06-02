const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Team = require('../models/Team');


//validation for team entry 

const validateTeamEntry = (players) => {
    const roleCount = {
        'WICKETKEEPER': 0,
        'BATTER': 0,
        'ALL-ROUNDER': 0,
        'BOWLER': 0,
    };

    players.forEach(player => {
        const { Role } = player;
        const role = Role.toUpperCase();

        roleCount[role]++;
        
        if (roleCount[role] > 11) {
            throw new Error(`Limit exceeded for role: ${role}`);
        }
    });

    const roles = Object.keys(roleCount);
    for (const role of roles) {
        if (roleCount[role] === 0) {
            throw new Error(`At least one player is required for role: ${role}`);
        }
    }

    // Check total number of players
    const totalPlayers = players.length;
    if (totalPlayers !== 11) {
        throw new Error(`Exactly 11 players are required, got only ${totalPlayers}`);
    }

    return true;
};


//Adding Team
router.post('/add-team', async(req, res) => {
    try {
        const { teamName, players, captain, viceCaptain } = req.body;

        validateTeamEntry(players);
        const team = new Team({ teamName, players, captain, viceCaptain });
        await team.save();
    
        res.status(201).send(team);
      } catch (err) {
        res.status(400).send(err.message);
      }
})

// Function to calculate points for each player based on result

const calculatePointsForMatch = (players, matchResult) => {
    matchResult.forEach(ball => {
      const { batter, bowler, isWicketDelivery, kind, fielders_involved, batsman_run } = ball;
  
      const batterPlayer = players.find(player => player.Player === batter);
      const bowlerPlayer = players.find(player => player.Player === bowler);
  
      if (batterPlayer) {
        if (isWicketDelivery) {
          if (kind === 'caught') {
            // Add points for catch
            const fielder = fielders_involved.split(',');
            if (fielder.length === 1 && fielder[0] === batter) {
              batterPlayer.points += 8;
            }
          }
          // Reduce points for out
          batterPlayer.points -= 2;
        } else {
          // Add points for runs scored
          batterPlayer.points += batsman_run;
          if (batsman_run === 4) {
            batterPlayer.points += 1; 
          } else if (batsman_run === 6) {
            batterPlayer.points += 2;
          }
          // Handle additional batting bonuses
          if (batsman_run >= 30) {
            batterPlayer.points += 4; 
          }
          if (batsman_run >= 50) {
            batterPlayer.points += 8;           }
          if (batsman_run >= 100) {
            batterPlayer.points += 16;
          }
        }
      }

      if (bowlerPlayer && isWicketDelivery) {
        // Add points for wickets
        bowlerPlayer.points += 25; 
        if (kind === 'LBW' || kind === 'Bowled') {
          bowlerPlayer.points += 8;
        }
        // Handle additional bowling bonuses
        const wickets = bowlerPlayer.points / 25;
        if (wickets >= 3 && wickets < 4) {
          bowlerPlayer.points += 4; 
        } else if (wickets >= 4 && wickets < 5) {
          bowlerPlayer.points += 8; 
        } else if (wickets >= 5) {
          bowlerPlayer.points += 16;
        }
      }
    });
  
    return players;
}


  router.post('/process-result', async (req, res) => {
    try {
        //Read match data from the json file
        const matchFilePath = path.join(__dirname, '..', 'data', 'match.json');
        const matchData = JSON.parse(fs.readFileSync(matchFilePath, 'utf8'));

        const teams = await Team.find();

        teams.forEach(async team => {
            const players = calculatePointsForMatch(team.players, matchData);
            players.forEach(player => {
                if (player.Player === team.captain) {
                    player.points *= 2; 
                } else if (player.Player === team.viceCaptain) {
                    player.points *= 1.5; 
                }
            });

            // Update team points
            team.points = players.reduce((totalPoints, player) => totalPoints + player.points, 0);
            await team.save();
        });

        res.send('Match result processed successfully.');
    } catch (err) {
        res.status(400).send(err);
    }
});
  
// View Teams Results
router.get('/team-result', async (req, res) => {
    try {

      const teams = await Team.find();
  
      teams.sort((a, b) => b.points - a.points);
  
      const topScore = teams[0].points;
      const winningTeams = teams.filter(team => team.points === topScore);
  
      res.send(winningTeams);
    } catch (err) {
      res.status(400).send(err);
    }
  });
  
  module.exports = router;