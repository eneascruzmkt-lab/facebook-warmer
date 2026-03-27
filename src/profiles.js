const fs = require('fs');
const path = require('path');

const PROFILES_PATH = path.join(__dirname, '..', 'profiles.json');

function loadProfiles() {
  return JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf-8'));
}

function saveProfiles(data) {
  fs.writeFileSync(PROFILES_PATH, JSON.stringify(data, null, 2));
}

function getProfile(alias) {
  const profiles = loadProfiles();
  if (!profiles[alias]) throw new Error(`Perfil "${alias}" não encontrado em profiles.json`);
  return profiles[alias];
}

function updateProfile(alias, updates) {
  const profiles = loadProfiles();
  profiles[alias] = { ...profiles[alias], ...updates };
  saveProfiles(profiles);
}

module.exports = { loadProfiles, saveProfiles, getProfile, updateProfile };
