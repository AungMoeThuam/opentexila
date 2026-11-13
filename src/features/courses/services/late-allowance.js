// The longest late allowance an admin may set: how many minutes after the
// start a check-in still counts as Present (#67). Without a limit, a student
// who arrives almost at the end of a class is still marked Present.
//
// One place for the number, so the attendance settings and the session form
// follow the same rule. The backend must check the same limit; a limit only in
// the form can be skipped by a direct API call.
export const MAX_LATE_MINUTES = 30;
