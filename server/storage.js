import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(path.join(DATA_DIR, 'uploads'))) fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
}

function readJson(file, fallback = {}) {
  ensureDataDir();
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
  return fallback;
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function getAllProjects() {
  const data = readJson(PROJECTS_FILE, { projects: [] });
  return data.projects || [];
}

export function getProject(projectId) {
  return getAllProjects().find(p => p.id === projectId) || null;
}

export function saveProject(project) {
  const data = readJson(PROJECTS_FILE, { projects: [] });
  const idx = data.projects.findIndex(p => p.id === project.id);
  if (idx >= 0) data.projects[idx] = project;
  else data.projects.push(project);
  writeJson(PROJECTS_FILE, data);
  return project;
}

export function deleteProject(projectId) {
  const data = readJson(PROJECTS_FILE, { projects: [] });
  data.projects = data.projects.filter(p => p.id !== projectId);
  writeJson(PROJECTS_FILE, data);
}

export function createDefaultProject({ name, deliverableType, ownerId, ownerName }) {
  const project = {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    deliverableType,
    ownerId,
    ownerName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sources: [],
    findingCards: [],
    annotations: [],
    researchSessions: [],
    deliverableContent: { sections: [] },
    folders: [
      { id: 'default', name: 'General', links: [], color: '#6366f1', subfolders: [], queries: [] },
    ],
    messages: [],
    comments: {},
    docItems: [],
    document: { title: name, sections: [], lastUpdated: Date.now() },
    participants: [],
    inviteCodes: [],
    tier: 'free',
  };
  saveProject(project);
  return project;
}

export function getOrCreateLiveSession(projectId) {
  let project = getProject(projectId);
  if (!project) return null;
  project.updatedAt = Date.now();
  saveProject(project);
  return project;
}

export function persistSessionState(projectId, updates) {
  const project = getProject(projectId);
  if (!project) return null;
  Object.assign(project, updates, { updatedAt: Date.now() });
  saveProject(project);
  return project;
}

export function getUser(userId) {
  const data = readJson(USERS_FILE, { users: [] });
  return data.users.find(u => u.id === userId) || null;
}

export function saveUser(user) {
  const data = readJson(USERS_FILE, { users: [] });
  const idx = data.users.findIndex(u => u.id === user.id);
  if (idx >= 0) data.users[idx] = user;
  else data.users.push(user);
  writeJson(USERS_FILE, data);
  return user;
}

export function getUploadsDir() {
  ensureDataDir();
  return path.join(DATA_DIR, 'uploads');
}

export { DATA_DIR };
