const formatDeviceName = (deviceName) => {
  if (!deviceName) return 'N/A';

  // string
  if (typeof deviceName === 'string') {
    return deviceName;
  }

  // array
  if (Array.isArray(deviceName)) {
    return deviceName
      .map((d, i) => {
        if (typeof d === 'string') return `${i + 1}. ${d}`;
        if (typeof d === 'object') {
          return `${i + 1}. ${d.brand ?? ''} ${d.model ?? ''}`.trim();
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');
  }

  // single object
  if (typeof deviceName === 'object') {
    return `${deviceName.brand ?? ''} ${deviceName.model ?? ''}`.trim();
  }

  return 'Unknown device';
};

export const generateWhatsAppLink = ({
  phone,
  customerName,
  deviceName,
  jobId,
  trackingLink
}) => {

  const devices = formatDeviceName(deviceName);

  const message = `
Hello ${customerName},

Your mobile repair has been registered at Mobifixer.

Device(s):
${devices}

Job ID : #${jobId}

You can track the repair status here:
${trackingLink}

For any queries, feel free to contact us.

– Mobifixer
  `.trim();

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
};