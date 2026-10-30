export const AVAILABILITY_STATUS = {
  upcoming: { label: 'Upcoming', modifier: 'upcoming' },
  in_progress: { label: 'In progress', modifier: 'live' },
  ended: { label: 'Ended', modifier: 'closed' },
  cancelled: { label: 'Cancelled', modifier: 'closed' },
};

export function statusFor(availability) {
  if (Object.hasOwn(AVAILABILITY_STATUS, availability)) {
    return { ...AVAILABILITY_STATUS[availability] };
  }
  return { label: String(availability ?? ''), modifier: 'closed' };
}
