const mongoose = require ('mongoose');

const teamSchema = new mongoose.Schema({
    teamName: {
      type: String,
      required: true,
    },
    players: {
        type: [{
          Player: String,
          Team: String,
          Role: String
        }],
        required: true,
      },
    captain: {
      type: String,
      required: true,
    },
    viceCaptain: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 0,
    },
  });


  module.exports = mongoose.model('Team', teamSchema, 'teams');