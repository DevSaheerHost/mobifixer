/**
 * What an admin's controls mean inside the shop's own app.
 *
 * The decisions, with no Firebase and no DOM, so each can be run rather than
 * reasoned about. main.js supplies the data and does the signing out.
 *
 * None of this is a security boundary. Suspension is enforced by the database
 * rules, which refuse a suspended shop's writes whatever this file says; what
 * happens here is only so the shop is told why instead of watching every save
 * fail. A forced sign-out is the same: the rules do not implement it, so a
 * device that ignored it would keep working until its token expired. It
 * clears the session on a device that is behaving, which is what it is for -
 * getting a shop off a phone it should no longer be on, not defending against
 * a modified client.
 */

/** When this browsing session began. Set once at start-up. */
export const sessionStartedAt = () => Date.now();

/**
 * Should this session be signed out?
 *
 * Compared against when the session STARTED, not "now": otherwise a cut-off
 * in the past would sign out every future sign-in as well, and the shop could
 * never get back in.
 */
export const shouldSignOut = ({ signOutAfter, sessionStart }) => {
  const cut = Number(signOutAfter);
  if (!cut || !Number.isFinite(cut)) return false;
  return Number(sessionStart) <= cut;
};

/** Is the shop locked, and what should it be told? */
export const lockState = ({ suspended, adminMessage } = {}) => ({
  locked: suspended === true,
  title: suspended === true ? 'This shop is locked' : '',
  body: suspended === true
    ? ((adminMessage && adminMessage.body)
       || 'Contact MobiFixer to unlock it. Your jobs and customers are safe.')
    : '',
});

/**
 * Is there a message the shop has not seen?
 *
 * Keyed on `at` rather than a flag, so a second message with the same title
 * is still shown, and re-reading the same one is not.
 */
export const unseenMessage = (adminMessage) => {
  if (!adminMessage || !adminMessage.at) return null;
  const at = Number(adminMessage.at) || 0;
  const seen = Number(adminMessage.seenAt) || 0;
  if (seen >= at) return null;
  return {
    at,
    title: String(adminMessage.title || 'A message from MobiFixer').slice(0, 80),
    body: String(adminMessage.body || '').slice(0, 500),
  };
};
