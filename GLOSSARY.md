# Glossary

**Lecturer**:
A person who teaches a class. The backend role is `lecturer`; the interface and URLs say "Lecturer".

**Class**:
A course taught in one section during one term, by one lecturer, in one room.

**Class roster**:
The students enrolled in a class. Lecturers can view it but not change it.
_Avoid_: student list, enrolment list

**Class session**:
One scheduled meeting of a class.

**Attendance roster**:
The per-student attendance records for one class session.
_Avoid_: roster (unqualified)

**Availability**:
Where a class session stands relative to now: upcoming, in progress, ended or cancelled. The backend supplies it; it is not stored on the class session.
_Avoid_: status (reserved for attendance status)
