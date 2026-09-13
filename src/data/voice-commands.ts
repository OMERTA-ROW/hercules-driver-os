/** Reference copy for what a driver can say. Not data — this is the phrasebook. */
export const voiceCommands = [
  { phrase: "Hercules, what's my clock?", desc: "Reads drive, on-duty, and cycle time aloud" },
  { phrase: "Find me a load out of Oklahoma City", desc: "Searches the board and reads the top three" },
  { phrase: "What's my profit per mile right now?", desc: "Live margin on the current run" },
  { phrase: "Any DOT ahead of me?", desc: "Reads driver alerts within 100 miles" },
  { phrase: "Read my fault codes", desc: "ECM faults in plain language" },
  { phrase: "Reroute me around that scale", desc: "Finds another path for your unit and reads it aloud" },
  { phrase: "What's my next turn?", desc: "Reads the next turn, distance, and lane guidance" },
  { phrase: "Is this road legal for my truck?", desc: "Checks height, weight, length, width, and hazmat" },
  { phrase: "What hazards are ahead?", desc: "Reads low bridges, grades, ramps, scales, and rough crossings" },
  { phrase: "Where's the next runaway ramp?", desc: "Distance to the next escape ramp on the descent" },
  { phrase: "Find me a shower and parking in 100 miles", desc: "Surfaces bookable stops ahead and reads the fee back first" },
  { phrase: "Where can I park tonight?", desc: "Safe parking near your projected stop" },
  { phrase: "I'm broke down", desc: "Reads your location and ranks help nearby" },
  { phrase: "Reset my day", desc: "Recalculates hours, route, rest, food, and finds new loads" },
  { phrase: "Upload my BOL for load 4471", desc: "Opens the camera with the type and load already filled in" },
  { phrase: "Send my POD to factoring", desc: "Reads it back and waits for your approval before sending" },
];
