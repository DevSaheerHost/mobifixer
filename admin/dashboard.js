/**
 * What the admin dashboard shows, as arithmetic.
 *
 * Kept apart from the page and free of Firebase so it can be run in a test
 * rather than looked at in a browser: everything here is the sort of thing
 * that is wrong by one, or wrong only for the shop that has never connected,
 * and neither shows up in a screenshot.
 */
import { summarise, sinceText, STALE_AFTER_MS } from '../presence.js';

export { summarise, sinceText, STALE_AFTER_MS };

/**
 * Fold one shop's raw nodes into a dashboard row.
 *
 * Takes what the page actually fetches - the presence map, the owner object,
 * a job count - rather than a whole shop, so the page never has to download
 * 1200 jobs to draw a line of text.
 */
export const shopRow = ({ shop, presence, owner, email, uid, jobs, members }, now = Date.now()) => {
  const p = summarise(presence, now);
  const ownerObj = owner && typeof owner === 'object' ? owner : null;

  return {
    shop,
    // Three record shapes exist in this database: owner as an object, a
    // top-level uid from the removed Google sign-in, and one shop carrying
    // both. The dashboard must not care which.
    ownerName: (ownerObj && ownerObj.name) || (typeof owner === 'string' ? owner : '') || '',
    ownerEmail: (ownerObj && ownerObj.email) || email || '',
    hasIdentity: Boolean((ownerObj && ownerObj.uid) || uid || (members && Object.keys(members).length)),
    jobs: Number(jobs) || 0,
    members: members ? Object.keys(members).length : 0,
    ...p,
    lastSeenText: sinceText(p.lastSeen, now),
  };
};

export const STATUS_ORDER = { online: 0, offline: 1, inactive: 2, never: 3 };

/** Online first, then most recently seen. A dashboard is read from the top. */
export const sortRows = (rows) => [...rows].sort((a, b) => {
  const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (s !== 0) return s;
  if (a.lastSeen !== b.lastSeen) return (b.lastSeen || 0) - (a.lastSeen || 0);
  return a.shop.localeCompare(b.shop);
});

export const FILTERS = ['all', 'online', 'offline', 'inactive', 'never'];

export const filterRows = (rows, filter = 'all', search = '') => {
  const q = String(search || '').trim().toLowerCase();
  return rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!q) return true;
    return r.shop.toLowerCase().includes(q)
        || r.ownerName.toLowerCase().includes(q)
        || r.ownerEmail.toLowerCase().includes(q);
  });
};

/**
 * The numbers along the top.
 *
 * Devices, not people: two staff sharing one phone are one device, and one
 * person with a phone and a laptop is two. The labels say "devices" for that
 * reason rather than pretending to count users.
 */
export const totals = (rows) => rows.reduce((t, r) => ({
  shops: t.shops + 1,
  online: t.online + (r.isOnline ? 1 : 0),
  inactive: t.inactive + (r.status === 'inactive' ? 1 : 0),
  never: t.never + (r.status === 'never' ? 1 : 0),
  apkDevices: t.apkDevices + r.onlineApk,
  webDevices: t.webDevices + r.onlineWeb,
  jobs: t.jobs + r.jobs,
}), { shops: 0, online: 0, inactive: 0, never: 0, apkDevices: 0, webDevices: 0, jobs: 0 });

/** The devices behind one row, newest first, for the expanded view. */
export const deviceList = (presence = {}, now = Date.now()) =>
  Object.entries(presence || {})
    .map(([id, d]) => ({
      id,
      platform: d.platform === 'apk' ? 'apk' : 'web',
      author: d.author || 'Unknown',
      online: d.online === true,
      lastSeen: Number(d.lastSeen) || 0,
      lastSeenText: sinceText(Number(d.lastSeen) || 0, now),
    }))
    .sort((a, b) => (b.online - a.online) || (b.lastSeen - a.lastSeen));
