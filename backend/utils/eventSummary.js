function buildEventSummary(guests = []) {
  const totalRegistered = Array.isArray(guests) ? guests.length : 0;
  const totalAttended = guests.filter((guest) => Number(guest.attended) === 1).length;
  const noShows = Math.max(totalRegistered - totalAttended, 0);
  const walkIns = guests.filter((guest) => String(guest.registration_source || '').toLowerCase() === 'manual').length;
  const attendanceRate = totalRegistered > 0 ? (totalAttended / totalRegistered) * 100 : 0;

  const hourCounts = {};
  guests.forEach((guest) => {
    if (!guest.check_in_time) return;
    const date = new Date(guest.check_in_time);
    if (Number.isNaN(date.getTime())) return;

    const hourStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      0,
      0,
      0
    );

    const key = hourStart.getTime();
    hourCounts[key] = (hourCounts[key] || 0) + 1;
  });

  let peakCheckInTime = 'N/A';
  const peakEntries = Object.entries(hourCounts);
  if (peakEntries.length > 0) {
    const [peakKey, peakValue] = peakEntries.reduce((best, current) => {
      return current[1] > best[1] ? current : best;
    }, peakEntries[0]);

    const start = new Date(Number(peakKey));
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const formatHour = (value) => value.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    peakCheckInTime = `${formatHour(start)} - ${formatHour(end)}`;
  }

  return {
    total_registered: totalRegistered,
    total_attended: totalAttended,
    attendance_rate: Number(attendanceRate.toFixed(1)),
    no_shows: noShows,
    walk_ins: walkIns,
    peak_check_in_time: peakCheckInTime
  };
}

module.exports = {
  buildEventSummary
};
