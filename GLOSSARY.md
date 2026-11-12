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

**Finalised class session**:
A class session that has ended and that its lecturer has finalised, so every enrolled student on its attendance roster is Present, Late or Absent and none remain Pending. Nothing finalises automatically. Only finalised class sessions count towards attendance rates; ended sessions still waiting to be finalised are listed separately.

**Attendance rate**:
The share of a student's finalised class sessions that they attended, counting Late as attended: (Present + Late) / (Present + Late + Absent). The same formula is used for one student, one class, or all of a lecturer's classes.

**At-risk student**:
A student whose attendance rate in a class is below the at-risk threshold over the chosen date range. Risk is judged per class, so a student below the threshold in two classes is at risk in both.
_Avoid_: failing student

**At-risk threshold**:
The attendance rate below which a student is at risk. The default is 75%, which is also the lowest allowed value; a lecturer can raise it up to 100% for their own view.
