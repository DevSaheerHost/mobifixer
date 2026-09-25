// The message the shop sends a customer about their repair.
//
// This file has been in the repo unused: main.js imported generateWhatsAppLink
// and never called it, and the message it built ended with "You can track the
// repair status here: ${trackingLink}" pointing at a page that does not exist.
// The tracking line is gone and the message now depends on where the job
// actually is.

import { waNumber } from './jobMeta.js';

const formatDeviceName = (deviceName) => {
  if (!deviceName) return 'your device';

  if (typeof deviceName === 'string') return deviceName;

  if (Array.isArray(deviceName)) {
    const names = deviceName
      .map(d => (typeof d === 'string' ? d
              : d && typeof d === 'object' ? `${d.brand ?? ''} ${d.model ?? ''}`.trim()
              : ''))
      .filter(Boolean);
    if (!names.length) return 'your device';
    // One device reads as a sentence; several read as a list.
    return names.length === 1 ? names[0] : '\n' + names.map((n, i) => `${i + 1}. ${n}`).join('\n');
  }

  if (typeof deviceName === 'object') {
    return `${deviceName.brand ?? ''} ${deviceName.model ?? ''}`.trim() || 'your device';
  }
  return 'your device';
};

const money = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

// What there is to say depends on the status. A collected or returned job has
// nothing outstanding, so it gets no message at all and the button is hidden.
export const whatsAppMessage = ({ status, customerName, deviceName, jobId, shopName, balance }) => {
  const who = String(customerName || '').trim();
  const hello = who && who !== '-' ? `Hello ${who},` : 'Hello,';
  const device = formatDeviceName(deviceName);
  const from = shopName ? `– ${shopName}` : '';
  const ref = `Job ID: #${jobId}`;

  if (status === 'done') {
    const owed = Number(balance) || 0;
    return [
      hello, '',
      `Your ${device} is repaired and ready to collect.`,
      ref,
      owed > 0 ? `Balance to pay on collection: ${money(owed)}` : 'Nothing left to pay.',
      '', from,
    ].filter(l => l !== null).join('\n').trim();
  }

  if (status === 'spare') {
    return [
      hello, '',
      `We have your ${device} and are waiting on a spare part for it.`,
      ref,
      'We will message you as soon as it is ready.',
      '', from,
    ].join('\n').trim();
  }

  // pending and progress: confirm it is with the shop and give them a reference.
  return [
    hello, '',
    `We have received your ${device} for repair.`,
    ref,
    'We will message you as soon as it is ready.',
    '', from,
  ].join('\n').trim();
};

// A wa.me link, or null when there is nothing to say or no number to say it to.
export const generateWhatsAppLink = ({ phone, status, ...rest }) => {
  if (status === 'collected' || status === 'return') return null;
  const to = waNumber(phone);
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(whatsAppMessage({ status, ...rest }))}`;
};
