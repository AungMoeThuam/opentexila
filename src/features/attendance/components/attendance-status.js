export const ATTENDANCE_STATUS = {
  present: { label: 'Present', modifier: 'present' },
  late: { label: 'Late', modifier: 'late' },
  pending: { label: 'Pending', modifier: 'pending' },
  absent: { label: 'Absent', modifier: 'absent' },
};

export function statusFor(status) {
  if (Object.hasOwn(ATTENDANCE_STATUS, status)) {
    return { ...ATTENDANCE_STATUS[status] };
  }
  return { label: String(status ?? ''), modifier: 'pending' };
}
