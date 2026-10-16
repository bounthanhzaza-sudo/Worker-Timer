# EAMS Enterprise Application

A fully functional, self-contained **Employee Attendance Management System (EAMS)** frontend application built to meet all 12 core enterprise requirements.

## Features Included
1. **Dashboard**: Real-time stats (Active staff, present today, late arrivals, on leave, pending requests, and today's attendance table).
2. **Check-In / Check-Out Terminal**: Interactive punch simulation comparing check-in times against shift start times + grace periods to calculate `'Present'` or `'Late'`, and computing work hours & overtime hours (`otHours`).
3. **Employee Management**: CRUD operations, department tracking, role assignment, branch & shift mapping, and active/inactive status toggling.
4. **Branch Management**: Company office locations and address management.
5. **Shift Management**: Shift definitions with start times, end times, and grace periods.
6. **Leave Management**: Leave requests (Annual, Sick, Casual) with approval/rejection workflows.
7. **Overtime Management**: Overtime logging, approvals, and tracking.
8. **Attendance History & Audit Logs**: View attendance history and perform manual corrections with mandatory adjustment reasons and audit trail logging (`auditTrail`).
9. **Reports Generation**: Monthly summary reports aggregating days present, late counts, work hours, and approved OT hours.

## How to Run
1. Open the `eams-app` folder.
2. Double-click `index.html` to open it instantly in any modern web browser.
